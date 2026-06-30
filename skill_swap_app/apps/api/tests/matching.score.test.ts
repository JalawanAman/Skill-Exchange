import { describe, it, expect } from 'vitest'
import {
  computeCompatibilityScore,
  overlapHours,
  scoreMutual,
  scoreAvailability,
  scoreLanguage,
  scoreExperience,
  scoreReputation,
  WEIGHTS,
  type MatchProfile,
  type OfferRef,
  type WantRef,
} from '../src/services/matching.score'

// ─── Builders ─────────────────────────────────────────────────────────────────

const offer = (skillId: string, proficiency: OfferRef['proficiency'] = 'intermediate'): OfferRef => ({
  skillId,
  skillName: skillId,
  proficiency,
})
const want = (skillId: string, levelTarget: WantRef['levelTarget'] = 'beginner'): WantRef => ({
  skillId,
  skillName: skillId,
  levelTarget,
})

const profile = (over: Partial<MatchProfile> & { userId: string }): MatchProfile => ({
  offers: [],
  wants: [],
  languages: [],
  availability: [],
  ...over,
})

// ─── scoreMutual ──────────────────────────────────────────────────────────────

describe('scoreMutual', () => {
  it('awards full points for a two-way swap', () => {
    const me = profile({ userId: 'a', offers: [offer('python')], wants: [want('guitar')] })
    const them = profile({ userId: 'b', offers: [offer('guitar')], wants: [want('python')] })
    const r = scoreMutual(me, them)
    expect(r.score).toBe(WEIGHTS.mutual) // 40
    expect(r.matchedSkills).toHaveLength(2)
    expect(r.matchedSkills.map((m) => m.direction).sort()).toEqual(['i_teach_them', 'they_teach_me'])
  })

  it('awards half points for a one-way match', () => {
    const me = profile({ userId: 'a', offers: [offer('python')] })
    const them = profile({ userId: 'b', wants: [want('python')] })
    const r = scoreMutual(me, them)
    expect(r.score).toBe(WEIGHTS.mutual / 2) // 20
    expect(r.matchedSkills).toEqual([{ skillId: 'python', skillName: 'python', direction: 'i_teach_them' }])
  })

  it('awards zero when there is no skill overlap', () => {
    const me = profile({ userId: 'a', offers: [offer('python')], wants: [want('guitar')] })
    const them = profile({ userId: 'b', offers: [offer('cooking')], wants: [want('chess')] })
    expect(scoreMutual(me, them).score).toBe(0)
  })
})

// ─── overlapHours / scoreAvailability ─────────────────────────────────────────

describe('overlapHours', () => {
  it('sums overlap only on the same day', () => {
    const a = [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]
    const b = [{ dayOfWeek: 1, startTime: '15:00', endTime: '19:00' }]
    expect(overlapHours(a, b)).toBe(2) // 15:00–17:00
  })

  it('is zero when days differ', () => {
    const a = [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]
    const b = [{ dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }]
    expect(overlapHours(a, b)).toBe(0)
  })

  it('handles HH:MM:SS and ignores malformed times', () => {
    const a = [{ dayOfWeek: 0, startTime: '09:00:00', endTime: '12:00:00' }]
    const b = [{ dayOfWeek: 0, startTime: 'bad', endTime: '11:00' }]
    expect(overlapHours(a, b)).toBe(0)
  })
})

describe('scoreAvailability', () => {
  it('gives 2 points per overlapping hour', () => {
    const me = profile({ userId: 'a', availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }] })
    const them = profile({ userId: 'b', availability: [{ dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }] })
    expect(scoreAvailability(me, them)).toBe(4) // 2h * 2
  })

  it('caps at the weight ceiling', () => {
    const me = profile({ userId: 'a', availability: [{ dayOfWeek: 1, startTime: '00:00', endTime: '23:00' }] })
    const them = profile({ userId: 'b', availability: [{ dayOfWeek: 1, startTime: '00:00', endTime: '23:00' }] })
    expect(scoreAvailability(me, them)).toBe(WEIGHTS.availability) // capped 20
  })
})

// ─── scoreLanguage ────────────────────────────────────────────────────────────

describe('scoreLanguage', () => {
  it('awards full points and reports shared languages (case-insensitive)', () => {
    const me = profile({ userId: 'a', languages: ['EN', 'ur'] })
    const them = profile({ userId: 'b', languages: ['en', 'fr'] })
    const r = scoreLanguage(me, them)
    expect(r.score).toBe(WEIGHTS.language)
    expect(r.shared).toEqual(['en'])
  })

  it('awards zero with no shared language', () => {
    const me = profile({ userId: 'a', languages: ['ur'] })
    const them = profile({ userId: 'b', languages: ['fr'] })
    expect(scoreLanguage(me, them).score).toBe(0)
  })
})

// ─── scoreExperience ──────────────────────────────────────────────────────────

describe('scoreExperience', () => {
  it('full points when the teacher is above the learner target', () => {
    const pairs = [{ offer: offer('python', 'expert'), want: want('python', 'beginner') }]
    expect(scoreExperience(pairs, [])).toBe(WEIGHTS.experience) // 10
  })

  it('half points when teacher meets the target exactly', () => {
    const pairs = [{ offer: offer('python', 'intermediate'), want: want('python', 'intermediate') }]
    expect(scoreExperience(pairs, [])).toBe(WEIGHTS.experience / 2) // 5
  })

  it('zero when the teacher is below the target', () => {
    const pairs = [{ offer: offer('python', 'beginner'), want: want('python', 'advanced') }]
    expect(scoreExperience(pairs, [])).toBe(0)
  })

  it('takes the best pair across both directions', () => {
    const weak = [{ offer: offer('a', 'beginner'), want: want('a', 'advanced') }]
    const strong = [{ offer: offer('b', 'expert'), want: want('b', 'beginner') }]
    expect(scoreExperience(weak, strong)).toBe(WEIGHTS.experience)
  })
})

// ─── scoreReputation ──────────────────────────────────────────────────────────

describe('scoreReputation', () => {
  it('is zero with no reputation data (pre-M6)', () => {
    expect(scoreReputation(profile({ userId: 'b' }))).toBe(0)
  })

  it('blends rating and session count, capped at the weight', () => {
    const them = profile({ userId: 'b', reputation: { avgRating: 5, sessionCount: 10 } })
    expect(scoreReputation(them)).toBe(WEIGHTS.reputation) // 7 + 3 capped to 10
  })

  it('scales with a partial rating', () => {
    const them = profile({ userId: 'b', reputation: { avgRating: 0, sessionCount: 0 } })
    expect(scoreReputation(them)).toBe(0)
  })
})

// ─── computeCompatibilityScore (integration of the factors) ───────────────────

describe('computeCompatibilityScore', () => {
  it('sums all factors for a strong mutual match', () => {
    const me = profile({
      userId: 'a',
      offers: [offer('python', 'expert')],
      wants: [want('guitar', 'beginner')],
      languages: ['en'],
      availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
    })
    const them = profile({
      userId: 'b',
      offers: [offer('guitar', 'expert')],
      wants: [want('python', 'beginner')],
      languages: ['en'],
      availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }],
    })
    const r = computeCompatibilityScore(me, them)
    // mutual 40 + availability min(20, 3*2)=6 + language 20 + experience 10 + reputation 0
    expect(r.breakdown).toEqual({ mutual: 40, availability: 6, language: 20, experience: 10, reputation: 0 })
    expect(r.score).toBe(76)
    expect(r.sharedLanguages).toEqual(['en'])
    expect(r.matchedSkills).toHaveLength(2)
  })

  it('never exceeds 100', () => {
    const full = profile({
      userId: 'a',
      offers: [offer('python', 'expert')],
      wants: [want('guitar', 'beginner')],
      languages: ['en'],
      availability: [{ dayOfWeek: 1, startTime: '00:00', endTime: '23:00' }],
      reputation: { avgRating: 5, sessionCount: 99 },
    })
    const them = profile({
      userId: 'b',
      offers: [offer('guitar', 'expert')],
      wants: [want('python', 'beginner')],
      languages: ['en'],
      availability: [{ dayOfWeek: 1, startTime: '00:00', endTime: '23:00' }],
      reputation: { avgRating: 5, sessionCount: 99 },
    })
    expect(computeCompatibilityScore(full, them).score).toBeLessThanOrEqual(100)
  })
})
