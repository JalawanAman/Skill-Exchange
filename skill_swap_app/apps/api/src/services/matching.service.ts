/**
 * M3 matching engine — DB orchestration around the pure scorer.
 *
 * Loads a user's match profile + candidate profiles, scores every candidate with
 * computeCompatibilityScore(), and persists the top results into `matches`
 * (preserving any the user has already dismissed).
 */
import { and, eq, inArray, or } from 'drizzle-orm'
import { db } from '../db'
import {
  users,
  skills,
  skillOffers,
  skillWants,
  availability,
  matches,
  blocks,
} from '../db/schema'
import { generateId } from '../lib/ids'
import { logger } from '../lib/logger'
import {
  computeCompatibilityScore,
  type MatchProfile,
  type MatchedSkill,
} from './matching.score'

const MAX_MATCHES = 20

/** Load full match profiles for a set of user ids, in a fixed number of queries. */
async function loadProfiles(userIds: string[]): Promise<Map<string, MatchProfile>> {
  const profiles = new Map<string, MatchProfile>()
  if (userIds.length === 0) return profiles

  const [userRows, offerRows, wantRows, availRows] = await Promise.all([
    db.select({ id: users.id, languages: users.languages }).from(users).where(inArray(users.id, userIds)),
    db
      .select({
        userId: skillOffers.userId,
        skillId: skillOffers.skillId,
        skillName: skills.name,
        proficiency: skillOffers.proficiency,
      })
      .from(skillOffers)
      .innerJoin(skills, eq(skillOffers.skillId, skills.id))
      .where(inArray(skillOffers.userId, userIds)),
    db
      .select({
        userId: skillWants.userId,
        skillId: skillWants.skillId,
        skillName: skills.name,
        levelTarget: skillWants.levelTarget,
      })
      .from(skillWants)
      .innerJoin(skills, eq(skillWants.skillId, skills.id))
      .where(inArray(skillWants.userId, userIds)),
    db
      .select({
        userId: availability.userId,
        dayOfWeek: availability.dayOfWeek,
        startTime: availability.startTime,
        endTime: availability.endTime,
      })
      .from(availability)
      .where(inArray(availability.userId, userIds)),
  ])

  for (const u of userRows) {
    profiles.set(u.id, { userId: u.id, languages: u.languages ?? [], offers: [], wants: [], availability: [] })
  }
  for (const o of offerRows) {
    profiles.get(o.userId)?.offers.push({ skillId: o.skillId, skillName: o.skillName, proficiency: o.proficiency })
  }
  for (const w of wantRows) {
    profiles.get(w.userId)?.wants.push({ skillId: w.skillId, skillName: w.skillName, levelTarget: w.levelTarget })
  }
  for (const a of availRows) {
    profiles
      .get(a.userId)
      ?.availability.push({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime })
  }
  return profiles
}

/** User ids the given user has blocked or been blocked by (excluded from matching). */
async function blockedUserIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
    .from(blocks)
    .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)))
  const set = new Set<string>()
  for (const r of rows) set.add(r.blockerId === userId ? r.blockedId : r.blockerId)
  return set
}

/**
 * Recompute and store matches for one user. Returns the number of active matches
 * written. Idempotent: clears the user's previous *active* matches and rewrites
 * them, but never resurfaces a match the user has dismissed.
 */
export async function refreshMatchesForUser(userId: string, requestId?: string): Promise<number> {
  const meProfile = (await loadProfiles([userId])).get(userId)

  // No skills on either side → nothing to match. Clear any stale active matches.
  if (!meProfile || (meProfile.offers.length === 0 && meProfile.wants.length === 0)) {
    await db.delete(matches).where(and(eq(matches.userId, userId), eq(matches.status, 'active')))
    return 0
  }

  const myOfferSkillIds = meProfile.offers.map((o) => o.skillId)
  const myWantSkillIds = meProfile.wants.map((w) => w.skillId)

  // Candidates = people who want what I offer, or offer what I want.
  const [wantSide, offerSide] = await Promise.all([
    myOfferSkillIds.length
      ? db.selectDistinct({ userId: skillWants.userId }).from(skillWants).where(inArray(skillWants.skillId, myOfferSkillIds))
      : Promise.resolve([] as { userId: string }[]),
    myWantSkillIds.length
      ? db.selectDistinct({ userId: skillOffers.userId }).from(skillOffers).where(inArray(skillOffers.skillId, myWantSkillIds))
      : Promise.resolve([] as { userId: string }[]),
  ])

  const blocked = await blockedUserIds(userId)
  const candidateIds = new Set<string>()
  for (const r of [...wantSide, ...offerSide]) {
    if (r.userId !== userId && !blocked.has(r.userId)) candidateIds.add(r.userId)
  }

  if (candidateIds.size === 0) {
    await db.delete(matches).where(and(eq(matches.userId, userId), eq(matches.status, 'active')))
    return 0
  }

  const candidateProfiles = await loadProfiles([...candidateIds])

  const scored = [...candidateProfiles.values()]
    .map((them) => ({ them, result: computeCompatibilityScore(meProfile, them) }))
    .filter((s) => s.result.score > 0)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, MAX_MATCHES)

  // Persist: keep dismissed pairs, replace the active set.
  const dismissed = await db
    .select({ matchedUserId: matches.matchedUserId })
    .from(matches)
    .where(and(eq(matches.userId, userId), eq(matches.status, 'dismissed')))
  const dismissedSet = new Set(dismissed.map((d) => d.matchedUserId))

  const rows = scored
    .filter((s) => !dismissedSet.has(s.them.userId))
    .map((s) => ({
      id: generateId('mat'),
      userId,
      matchedUserId: s.them.userId,
      compatibilityScore: s.result.score,
      scoreBreakdown: s.result.breakdown,
      matchedSkills: s.result.matchedSkills as MatchedSkill[],
      sharedLanguages: s.result.sharedLanguages,
      status: 'active' as const,
    }))

  await db.transaction(async (tx) => {
    await tx.delete(matches).where(and(eq(matches.userId, userId), eq(matches.status, 'active')))
    if (rows.length > 0) {
      // Dismissed pairs would collide on the unique (user, matched) key → leave them be.
      await tx.insert(matches).values(rows).onConflictDoNothing()
    }
  })

  void logger.info('matches refreshed', {
    source: 'matching',
    requestId,
    context: { userId, candidates: candidateIds.size, stored: rows.length },
  })
  return rows.length
}

/**
 * Fire-and-forget refresh — used by mutation routes (skills/availability/profile)
 * so recomputing matches never blocks or fails the user's request. Errors are
 * logged, not thrown.
 */
export function refreshMatchesInBackground(userId: string, requestId?: string): void {
  void refreshMatchesForUser(userId, requestId).catch((err) => {
    void logger.exception('background match refresh failed', err, {
      source: 'matching',
      requestId,
      context: { userId },
    })
  })
}
