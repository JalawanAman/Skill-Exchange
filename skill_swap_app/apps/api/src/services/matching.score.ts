/**
 * Pure compatibility scoring for the M3 matching engine.
 *
 * No DB, no I/O — given two users' match profiles it returns a 0–100 score with
 * a per-factor breakdown. Kept dependency-free so it can be unit-tested in
 * isolation (importing the DB layer would require a live DATABASE_URL).
 *
 * Score = mutual(40) + availability(20) + language(20) + experience(10) + reputation(10)
 */

export type Proficiency = 'beginner' | 'intermediate' | 'expert'
export type WantLevel = 'beginner' | 'intermediate' | 'advanced'

export interface OfferRef {
  skillId: string
  skillName: string
  proficiency: Proficiency
}
export interface WantRef {
  skillId: string
  skillName: string
  levelTarget: WantLevel
}
export interface AvailabilitySlot {
  dayOfWeek: number // 0=Sun .. 6=Sat
  startTime: string // 'HH:MM' or 'HH:MM:SS'
  endTime: string
}

export interface MatchProfile {
  userId: string
  offers: OfferRef[]
  wants: WantRef[]
  languages: string[]
  availability: AvailabilitySlot[]
  /** Optional reputation inputs — populated once reviews/sessions exist (M6/M8). */
  reputation?: { avgRating: number | null; sessionCount: number }
}

export type MatchDirection = 'i_teach_them' | 'they_teach_me'

export interface MatchedSkill {
  skillId: string
  skillName: string
  direction: MatchDirection
}

export interface ScoreBreakdown {
  mutual: number
  availability: number
  language: number
  experience: number
  reputation: number
}

export interface CompatibilityResult {
  score: number
  breakdown: ScoreBreakdown
  matchedSkills: MatchedSkill[]
  sharedLanguages: string[]
}

// Factor caps — the weights from the architecture spec.
export const WEIGHTS = {
  mutual: 40,
  availability: 20,
  language: 20,
  experience: 10,
  reputation: 10,
} as const

const PROFICIENCY_RANK: Record<Proficiency, number> = { beginner: 1, intermediate: 2, expert: 3 }
const WANT_RANK: Record<WantLevel, number> = { beginner: 1, intermediate: 2, advanced: 3 }

/** 'HH:MM[:SS]' → minutes since midnight. Returns NaN for malformed input. */
function toMinutes(t: string): number {
  const [h, m] = t.split(':')
  const hours = Number(h)
  const mins = Number(m)
  if (Number.isNaN(hours) || Number.isNaN(mins)) return NaN
  return hours * 60 + mins
}

/**
 * Skills `a` can teach `b`: a's offers ∩ b's wants (by skillId).
 * Each result pairs the teacher's proficiency with the learner's target level.
 */
function teachingPairs(teacher: MatchProfile, learner: MatchProfile) {
  const wantById = new Map(learner.wants.map((w) => [w.skillId, w]))
  const pairs: { offer: OfferRef; want: WantRef }[] = []
  for (const offer of teacher.offers) {
    const want = wantById.get(offer.skillId)
    if (want) pairs.push({ offer, want })
  }
  return pairs
}

/**
 * Mutual-swap score (max 40). Both directions = a perfect swap (40);
 * one direction = a half-match (20); neither = 0 (not a real candidate).
 * Also returns the concrete skills that drive the match, for display.
 */
export function scoreMutual(me: MatchProfile, them: MatchProfile) {
  const iTeachThem = teachingPairs(me, them)
  const theyTeachMe = teachingPairs(them, me)

  const matchedSkills: MatchedSkill[] = [
    ...iTeachThem.map((p) => ({
      skillId: p.offer.skillId,
      skillName: p.offer.skillName,
      direction: 'i_teach_them' as const,
    })),
    ...theyTeachMe.map((p) => ({
      skillId: p.offer.skillId,
      skillName: p.offer.skillName,
      direction: 'they_teach_me' as const,
    })),
  ]

  const both = iTeachThem.length > 0 && theyTeachMe.length > 0
  const one = iTeachThem.length > 0 || theyTeachMe.length > 0
  const score = both ? WEIGHTS.mutual : one ? WEIGHTS.mutual / 2 : 0

  return { score, matchedSkills, iTeachThem, theyTeachMe }
}

/** Total overlapping hours across the week between two weekly schedules. */
export function overlapHours(a: AvailabilitySlot[], b: AvailabilitySlot[]): number {
  let minutes = 0
  for (const sa of a) {
    for (const sb of b) {
      if (sa.dayOfWeek !== sb.dayOfWeek) continue
      const start = Math.max(toMinutes(sa.startTime), toMinutes(sb.startTime))
      const end = Math.min(toMinutes(sa.endTime), toMinutes(sb.endTime))
      if (Number.isNaN(start) || Number.isNaN(end)) continue
      if (end > start) minutes += end - start
    }
  }
  return minutes / 60
}

/**
 * Availability score (max 20): 2 points per overlapping hour, capped.
 * NOTE: compares raw clock times and ignores per-slot timezone for now — a known
 * simplification to refine when we do proper TZ normalisation.
 */
export function scoreAvailability(me: MatchProfile, them: MatchProfile): number {
  const hours = overlapHours(me.availability, them.availability)
  return Math.min(WEIGHTS.availability, Math.round(hours * 2))
}

/** Language score (max 20): full points if they share at least one language. */
export function scoreLanguage(me: MatchProfile, them: MatchProfile): { score: number; shared: string[] } {
  const mine = new Set(me.languages.map((l) => l.toLowerCase()))
  const shared = them.languages.filter((l) => mine.has(l.toLowerCase()))
  return { score: shared.length > 0 ? WEIGHTS.language : 0, shared }
}

/**
 * Experience-fit score (max 10) over the matched teaching pairs:
 * teacher above the learner's target = 10 (headroom), exactly at target = 5,
 * below target = 0. Takes the best pair across both directions.
 */
export function scoreExperience(
  iTeachThem: { offer: OfferRef; want: WantRef }[],
  theyTeachMe: { offer: OfferRef; want: WantRef }[]
): number {
  const pairs = [...iTeachThem, ...theyTeachMe]
  let best = 0
  for (const { offer, want } of pairs) {
    const teacher = PROFICIENCY_RANK[offer.proficiency]
    const target = WANT_RANK[want.levelTarget]
    const points = teacher > target ? WEIGHTS.experience : teacher === target ? WEIGHTS.experience / 2 : 0
    if (points > best) best = points
  }
  return best
}

/**
 * Reputation score (max 10): blends the other user's average rating (0–5 → 0–7)
 * with how many sessions they've completed (0–3). Returns 0 until reviews/sessions
 * exist (M6/M8), so it's inert for now without special-casing callers.
 */
export function scoreReputation(them: MatchProfile): number {
  const rep = them.reputation
  if (!rep || rep.avgRating == null) return 0
  const ratingPart = (rep.avgRating / 5) * 7
  const sessionPart = Math.min(3, rep.sessionCount)
  return Math.min(WEIGHTS.reputation, Math.round(ratingPart + sessionPart))
}

/**
 * Full compatibility score for an ordered pair (me → them), 0–100.
 * Returns the breakdown, the skills that drive the match, and shared languages.
 */
export function computeCompatibilityScore(me: MatchProfile, them: MatchProfile): CompatibilityResult {
  const mutual = scoreMutual(me, them)
  const language = scoreLanguage(me, them)
  const breakdown: ScoreBreakdown = {
    mutual: mutual.score,
    availability: scoreAvailability(me, them),
    language: language.score,
    experience: scoreExperience(mutual.iTeachThem, mutual.theyTeachMe),
    reputation: scoreReputation(them),
  }
  const score =
    breakdown.mutual +
    breakdown.availability +
    breakdown.language +
    breakdown.experience +
    breakdown.reputation

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    breakdown,
    matchedSkills: mutual.matchedSkills,
    sharedLanguages: language.shared,
  }
}
