import { describe, it, expect } from 'vitest'
import {
  computeCredits,
  validateBooking,
  hasSufficientCredits,
  canTransition,
  canCancel,
} from '../src/services/sessions.credits'

// A fixed "now" so time-based checks are deterministic.
const NOW = new Date('2026-07-06T12:00:00.000Z')
const future = (min: number) => new Date(NOW.valueOf() + min * 60_000)
const past = (min: number) => new Date(NOW.valueOf() - min * 60_000)

describe('computeCredits', () => {
  it('is 10 per hour (duration / 6)', () => {
    expect(computeCredits(30)).toBe(5)
    expect(computeCredits(60)).toBe(10)
    expect(computeCredits(90)).toBe(15)
    expect(computeCredits(120)).toBe(20)
  })
})

describe('validateBooking', () => {
  const good = { scheduledAt: future(60), durationMinutes: 60, format: 'video' }

  it('accepts a valid future booking', () => {
    expect(validateBooking(good, NOW)).toEqual({ ok: true })
  })

  it('rejects an invalid duration', () => {
    const r = validateBooking({ ...good, durationMinutes: 45 }, NOW)
    expect(r).toMatchObject({ ok: false, code: 'INVALID_DURATION' })
  })

  it('rejects an invalid format', () => {
    const r = validateBooking({ ...good, format: 'telepathy' }, NOW)
    expect(r).toMatchObject({ ok: false, code: 'INVALID_FORMAT' })
  })

  it('rejects a past time (M6-T08)', () => {
    const r = validateBooking({ ...good, scheduledAt: past(30) }, NOW)
    expect(r).toMatchObject({ ok: false, code: 'PAST_TIME' })
  })

  it('rejects the exact current time (not strictly future)', () => {
    const r = validateBooking({ ...good, scheduledAt: new Date(NOW) }, NOW)
    expect(r).toMatchObject({ ok: false, code: 'PAST_TIME' })
  })

  it('rejects an invalid date', () => {
    const r = validateBooking({ ...good, scheduledAt: new Date('nope') }, NOW)
    expect(r).toMatchObject({ ok: false, code: 'INVALID_TIME' })
  })
})

describe('hasSufficientCredits', () => {
  it('allows when balance covers cost, incl. exact', () => {
    expect(hasSufficientCredits(20, 10)).toBe(true)
    expect(hasSufficientCredits(10, 10)).toBe(true)
  })
  it('blocks when balance is short (M6-T02)', () => {
    expect(hasSufficientCredits(5, 10)).toBe(false)
    expect(hasSufficientCredits(0, 10)).toBe(false)
  })
})

describe('canTransition', () => {
  it('allows the booking lifecycle transitions', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true) // teacher accepts
    expect(canTransition('pending', 'cancelled')).toBe(true)
    expect(canTransition('confirmed', 'cancelled')).toBe(true)
    expect(canTransition('confirmed', 'completed')).toBe(true)
  })
  it('blocks illegal transitions', () => {
    expect(canTransition('completed', 'confirmed')).toBe(false)
    expect(canTransition('cancelled', 'confirmed')).toBe(false)
    expect(canTransition('pending', 'completed')).toBe(false)
  })
})

describe('canCancel', () => {
  it('only before the session happens', () => {
    expect(canCancel('pending')).toBe(true)
    expect(canCancel('confirmed')).toBe(true)
    expect(canCancel('completed')).toBe(false)
    expect(canCancel('cancelled')).toBe(false)
    expect(canCancel('in_progress')).toBe(false)
  })
})
