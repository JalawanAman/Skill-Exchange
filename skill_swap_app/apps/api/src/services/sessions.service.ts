/**
 * M6 session escrow — atomic book / accept / cancel against the DB.
 *
 * Escrow model: booking reduces the learner's balance and writes an `escrow_lock`
 * credit transaction; cancelling restores it with an `escrow_release`. Row locks
 * (`FOR UPDATE`) serialize concurrent bookings/cancels so credits can't double-spend
 * or double-refund. Completion/payout to the teacher is M7.
 */
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { sessions, users, creditTransactions, type Session } from '../db/schema'
import { generateId } from '../lib/ids'
import { computeCredits, hasSufficientCredits, canCancel, canTransition } from './sessions.credits'

/** Business error with an HTTP status — routes map these straight to a response. */
export class SessionError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message)
    this.name = 'SessionError'
  }
}

export type BookSessionInput = {
  learnerId: string
  teacherId: string
  skillId: string
  conversationId?: string | null
  scheduledAt: Date
  durationMinutes: number
  format: 'video' | 'in-person' | 'async'
  meetingLink?: string | null
}

/**
 * Book a session: hold `computeCredits(duration)` in escrow from the learner.
 * Idempotent — retrying the same (learner, teacher, skill, time) returns the
 * existing session without charging again.
 */
export async function bookSession(input: BookSessionInput): Promise<Session> {
  const cost = computeCredits(input.durationMinutes)

  return db.transaction(async (tx) => {
    // Idempotency: identical booking already exists → return it, no double-charge.
    const dupWhere = and(
      eq(sessions.learnerId, input.learnerId),
      eq(sessions.teacherId, input.teacherId),
      eq(sessions.skillId, input.skillId),
      eq(sessions.scheduledAt, input.scheduledAt),
    )
    const [existing] = await tx.select().from(sessions).where(dupWhere).limit(1)
    if (existing) return existing

    // Lock the learner row, then check spendable balance.
    const [learner] = await tx
      .select({ balance: users.creditBalance })
      .from(users)
      .where(eq(users.id, input.learnerId))
      .for('update')
    if (!learner) throw new SessionError('NOT_FOUND', 404, 'Learner not found.')
    if (!hasSufficientCredits(learner.balance, cost)) {
      throw new SessionError('INSUFFICIENT_CREDITS', 422, `You need ${cost} credits to book this session.`)
    }

    const sessionId = generateId('ses')
    const [session] = await tx
      .insert(sessions)
      .values({
        id: sessionId,
        teacherId: input.teacherId,
        learnerId: input.learnerId,
        skillId: input.skillId,
        conversationId: input.conversationId ?? null,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        format: input.format,
        meetingLink: input.meetingLink ?? null,
        creditsAmount: cost,
        status: 'pending',
      })
      .onConflictDoNothing()
      .returning()

    // Lost a race to an identical booking — return the winner, still no double-charge.
    if (!session) {
      const [raced] = await tx.select().from(sessions).where(dupWhere).limit(1)
      return raced
    }

    const newBalance = learner.balance - cost
    await tx.update(users).set({ creditBalance: newBalance, updatedAt: new Date() }).where(eq(users.id, input.learnerId))
    await tx.insert(creditTransactions).values({
      id: generateId('ctx'),
      userId: input.learnerId,
      type: 'escrow_lock',
      amount: -cost,
      balanceAfter: newBalance,
      description: `Escrow held for session ${sessionId}`,
      relatedSessionId: sessionId,
    })

    return session
  })
}

/** Teacher accepts a pending session → confirmed. */
export async function acceptSession(sessionId: string, teacherId: string): Promise<Session> {
  const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
  if (!s) throw new SessionError('NOT_FOUND', 404, 'Session not found.')
  if (s.teacherId !== teacherId) throw new SessionError('FORBIDDEN', 403, 'Only the teacher can accept this session.')
  if (!canTransition(s.status, 'confirmed')) {
    throw new SessionError('INVALID_STATE', 409, `A ${s.status} session cannot be accepted.`)
  }
  const [updated] = await db
    .update(sessions)
    .set({ status: 'confirmed', teacherConfirmed: true, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning()
  return updated
}

/** Either party cancels a not-yet-happened session → refund the learner's escrow. */
export async function cancelSession(sessionId: string, userId: string, reason?: string): Promise<Session> {
  return db.transaction(async (tx) => {
    const [s] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).for('update')
    if (!s) throw new SessionError('NOT_FOUND', 404, 'Session not found.')
    if (s.teacherId !== userId && s.learnerId !== userId) {
      throw new SessionError('FORBIDDEN', 403, 'You are not part of this session.')
    }
    if (!canCancel(s.status)) throw new SessionError('INVALID_STATE', 409, `A ${s.status} session cannot be cancelled.`)

    // Refund the learner's escrowed credits.
    const [learner] = await tx
      .select({ balance: users.creditBalance })
      .from(users)
      .where(eq(users.id, s.learnerId))
      .for('update')
    const newBalance = (learner?.balance ?? 0) + s.creditsAmount
    await tx.update(users).set({ creditBalance: newBalance, updatedAt: new Date() }).where(eq(users.id, s.learnerId))
    await tx.insert(creditTransactions).values({
      id: generateId('ctx'),
      userId: s.learnerId,
      type: 'escrow_release',
      amount: s.creditsAmount,
      balanceAfter: newBalance,
      description: `Escrow refunded for cancelled session ${s.id}`,
      relatedSessionId: s.id,
    })

    const [updated] = await tx
      .update(sessions)
      .set({ status: 'cancelled', cancelledBy: userId, cancelReason: reason ?? null, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId))
      .returning()
    return updated
  })
}
