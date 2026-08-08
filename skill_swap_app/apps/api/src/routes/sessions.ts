import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { sessions, users, skills, skillOffers } from '../db/schema'
import { logger } from '../lib/logger'
import { validateBooking } from '../services/sessions.credits'
import { bookSession, acceptSession, cancelSession, SessionError } from '../services/sessions.service'
import { findConversation } from '../services/connections.service'
import { getBlockedUserIds } from '../services/matching.service'
import { emitToUser } from '../socket'

const router: IRouter = Router()

function requireUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    return null
  }
  return userId
}

const userCols = { id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl }

/** Attach skill name + teacher/learner user objects to a set of session rows. */
async function decorate(rows: (typeof sessions.$inferSelect)[]) {
  if (rows.length === 0) return []
  const userIds = [...new Set(rows.flatMap((r) => [r.teacherId, r.learnerId]))]
  const skillIds = [...new Set(rows.map((r) => r.skillId))]
  const [people, skillRows] = await Promise.all([
    db.select(userCols).from(users).where(inArray(users.id, userIds)),
    db.select({ id: skills.id, name: skills.name }).from(skills).where(inArray(skills.id, skillIds)),
  ])
  const byUser = new Map(people.map((u) => [u.id, u]))
  const bySkill = new Map(skillRows.map((s) => [s.id, s.name]))
  return rows.map((r) => ({
    ...r,
    skillName: bySkill.get(r.skillId) ?? null,
    teacher: byUser.get(r.teacherId) ?? null,
    learner: byUser.get(r.learnerId) ?? null,
  }))
}

// ─── POST /api/sessions — book a session (learner pays escrow) ────────────────
const bookSchema = z.object({
  teacherId: z.string().min(1),
  skillId: z.string().min(1),
  conversationId: z.string().optional(),
  scheduledAt: z.string().min(1),
  durationMinutes: z.number().int(),
  format: z.enum(['video', 'in-person', 'async']),
  meetingLink: z.string().url().optional(),
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const learnerId = requireUserId(req, res)
    if (!learnerId) return

    const parsed = bookSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }
    const { teacherId, skillId, format, durationMinutes, meetingLink } = parsed.data
    if (teacherId === learnerId) {
      return res.status(400).json({ error: 'You cannot book a session with yourself', code: 'SELF_BOOKING' })
    }

    const scheduledAt = new Date(parsed.data.scheduledAt)
    const check = validateBooking({ scheduledAt, durationMinutes, format }, new Date())
    if (!check.ok) {
      return res.status(422).json({ error: check.message, code: check.code })
    }

    // Must be connected (booking happens from within a conversation).
    const conversation = await findConversation(learnerId, teacherId)
    if (!conversation) {
      return res.status(403).json({ error: 'You must be connected to book a session', code: 'NOT_CONNECTED' })
    }

    // Can't book a blocked user.
    const blocked = await getBlockedUserIds(learnerId)
    if (blocked.has(teacherId)) {
      return res.status(403).json({ error: 'You cannot book this user', code: 'BLOCKED' })
    }

    // The teacher must actually offer this skill.
    const [offer] = await db
      .select({ id: skillOffers.id })
      .from(skillOffers)
      .where(and(eq(skillOffers.userId, teacherId), eq(skillOffers.skillId, skillId)))
      .limit(1)
    if (!offer) {
      return res.status(400).json({ error: 'That user does not teach this skill', code: 'SKILL_NOT_OFFERED' })
    }

    const session = await bookSession({
      learnerId,
      teacherId,
      skillId,
      conversationId: parsed.data.conversationId ?? conversation.id,
      scheduledAt,
      durationMinutes,
      format,
      meetingLink,
    })

    void logger.info('session booked', { source: 'api:sessions', requestId, context: { learnerId, teacherId, sessionId: session.id, cost: session.creditsAmount } })
    emitToUser(teacherId, 'session:update', { sessionId: session.id, status: session.status })
    return res.status(201).json({ session })
  } catch (err) {
    if (err instanceof SessionError) {
      return res.status(err.httpStatus).json({ error: err.message, code: err.code })
    }
    return next(err)
  }
})

// ─── GET /api/sessions?status=&role= — caller's sessions ──────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const role = req.query.role === 'teacher' || req.query.role === 'learner' ? req.query.role : null
    const status = typeof req.query.status === 'string' ? req.query.status : null

    const mine =
      role === 'teacher'
        ? eq(sessions.teacherId, userId)
        : role === 'learner'
          ? eq(sessions.learnerId, userId)
          : or(eq(sessions.teacherId, userId), eq(sessions.learnerId, userId))

    const where = status ? and(mine, eq(sessions.status, status as typeof sessions.$inferSelect.status)) : mine
    const rows = await db.select().from(sessions).where(where).orderBy(desc(sessions.scheduledAt))
    return res.json({ sessions: await decorate(rows) })
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/sessions/:id — one session (participants only) ──────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const [s] = await db.select().from(sessions).where(eq(sessions.id, req.params.id)).limit(1)
    if (!s || (s.teacherId !== userId && s.learnerId !== userId)) {
      return res.status(404).json({ error: 'Session not found', code: 'NOT_FOUND' })
    }
    const [decorated] = await decorate([s])
    return res.json({ session: decorated })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/sessions/:id/accept — teacher confirms ─────────────────────────
router.post('/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const session = await acceptSession(req.params.id, userId)
    void logger.info('session accepted', { source: 'api:sessions', requestId, context: { userId, sessionId: session.id } })
    emitToUser(session.learnerId, 'session:update', { sessionId: session.id, status: session.status })
    return res.json({ session })
  } catch (err) {
    if (err instanceof SessionError) {
      return res.status(err.httpStatus).json({ error: err.message, code: err.code })
    }
    return next(err)
  }
})

// ─── POST /api/sessions/:id/cancel — either party cancels (refund) ────────────
const cancelSchema = z.object({ reason: z.string().max(500).optional() })

router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const parsed = cancelSchema.safeParse(req.body ?? {})
    const reason = parsed.success ? parsed.data.reason : undefined

    const session = await cancelSession(req.params.id, userId, reason)
    void logger.info('session cancelled', { source: 'api:sessions', requestId, context: { userId, sessionId: session.id } })
    // Notify the other participant.
    const otherId = session.teacherId === userId ? session.learnerId : session.teacherId
    emitToUser(otherId, 'session:update', { sessionId: session.id, status: session.status })
    return res.json({ session })
  } catch (err) {
    if (err instanceof SessionError) {
      return res.status(err.httpStatus).json({ error: err.message, code: err.code })
    }
    return next(err)
  }
})

export { router as sessionRoutes }
