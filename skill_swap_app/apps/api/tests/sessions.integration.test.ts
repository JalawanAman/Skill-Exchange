import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * Integration test for the credit escrow money path (M6-T01/T02/T05/T06/T07).
 * Exercises bookSession / acceptSession / cancelSession against the real DB and
 * asserts the learner's balance + credit_transactions move correctly.
 *
 * Hits DATABASE_URL, so it's skipped in CI (DB-free). Runs locally via `pnpm test`.
 */

const HAS_DB = !!process.env.DATABASE_URL

// Fixed far-future time so bookings are always valid and idempotency keys match.
const WHEN = new Date('2027-01-01T10:00:00.000Z')
const WHEN2 = new Date('2027-01-02T10:00:00.000Z')

describe.skipIf(!HAS_DB)('session escrow (integration)', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let db: any
  let s: any
  let dz: any
  let svc: typeof import('../src/services/sessions.service')
  let genId: (p: string) => string

  const T = 'user_test_ses_teacher'
  const L = 'user_test_ses_learner'
  const SKILL = 'skill_test_m6'
  let sessionId = ''

  beforeAll(async () => {
    ;({ db } = await import('../src/db'))
    s = await import('../src/db/schema')
    dz = await import('drizzle-orm')
    svc = await import('../src/services/sessions.service')
    ;({ generateId: genId } = await import('../src/lib/ids'))

    await db
      .insert(s.users)
      .values([
        { id: T, email: 't.ses@test.local', displayName: 'Teacher', isOnboarded: true, creditBalance: 20 },
        { id: L, email: 'l.ses@test.local', displayName: 'Learner', isOnboarded: true, creditBalance: 20 },
      ])
      .onConflictDoNothing()
    await db
      .insert(s.skills)
      .values({ id: SKILL, name: 'Test Skill M6', category: 'Test', slug: 'test-skill-m6' })
      .onConflictDoNothing()
    await db
      .insert(s.skillOffers)
      .values({ id: genId('sko'), userId: T, skillId: SKILL, proficiency: 'expert' })
      .onConflictDoNothing()
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(s.sessions).where(dz.or(dz.eq(s.sessions.learnerId, L), dz.eq(s.sessions.teacherId, T)))
    await db.delete(s.creditTransactions).where(dz.inArray(s.creditTransactions.userId, [T, L]))
    await db.delete(s.skillOffers).where(dz.eq(s.skillOffers.userId, T))
    await db.delete(s.users).where(dz.inArray(s.users.id, [T, L]))
    await db.delete(s.skills).where(dz.eq(s.skills.id, SKILL))
  })

  const balanceOf = async (id: string): Promise<number> => {
    const [row] = await db.select({ b: s.users.creditBalance }).from(s.users).where(dz.eq(s.users.id, id))
    return row.b
  }

  it('books a 60-min session → 10 credits escrowed (M6-T01/T06)', async () => {
    const session = await svc.bookSession({
      learnerId: L,
      teacherId: T,
      skillId: SKILL,
      scheduledAt: WHEN,
      durationMinutes: 60,
      format: 'video',
    })
    sessionId = session.id
    expect(session.creditsAmount).toBe(10)
    expect(session.status).toBe('pending')
    expect(await balanceOf(L)).toBe(10)

    const locks = await db
      .select()
      .from(s.creditTransactions)
      .where(dz.and(dz.eq(s.creditTransactions.userId, L), dz.eq(s.creditTransactions.type, 'escrow_lock')))
    expect(locks).toHaveLength(1)
    expect(locks[0].amount).toBe(-10)
  })

  it('is idempotent on retry — no duplicate, no double charge (M6-T07)', async () => {
    const again = await svc.bookSession({
      learnerId: L,
      teacherId: T,
      skillId: SKILL,
      scheduledAt: WHEN,
      durationMinutes: 60,
      format: 'video',
    })
    expect(again.id).toBe(sessionId)
    expect(await balanceOf(L)).toBe(10) // still 10, not 0
  })

  it('rejects a booking the learner cannot afford (M6-T02)', async () => {
    // Balance is 10; a 120-min session costs 20.
    await expect(
      svc.bookSession({
        learnerId: L,
        teacherId: T,
        skillId: SKILL,
        scheduledAt: WHEN2,
        durationMinutes: 120,
        format: 'video',
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' })
    expect(await balanceOf(L)).toBe(10) // unchanged
  })

  it('teacher accepts → confirmed (M6-T04)', async () => {
    const session = await svc.acceptSession(sessionId, T)
    expect(session.status).toBe('confirmed')
    expect(session.teacherConfirmed).toBe(true)
  })

  it('cancel refunds the escrow and restores balance (M6-T05/T06)', async () => {
    const session = await svc.cancelSession(sessionId, L, 'changed my mind')
    expect(session.status).toBe('cancelled')
    expect(session.cancelledBy).toBe(L)
    expect(await balanceOf(L)).toBe(20) // fully restored

    const releases = await db
      .select()
      .from(s.creditTransactions)
      .where(dz.and(dz.eq(s.creditTransactions.userId, L), dz.eq(s.creditTransactions.type, 'escrow_release')))
    expect(releases).toHaveLength(1)
    expect(releases[0].amount).toBe(10)
  })

  it('a cancelled session cannot be cancelled again', async () => {
    await expect(svc.cancelSession(sessionId, L)).rejects.toMatchObject({ code: 'INVALID_STATE' })
  })
})
