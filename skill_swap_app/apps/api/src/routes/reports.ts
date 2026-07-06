import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { logger } from '../lib/logger'

const router: IRouter = Router()

function requireUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    return null
  }
  return userId
}

// ─── POST /api/reports — flag a user (recorded to the logs table for review) ──
// MVP moderation: no dedicated table yet — the report is persisted as a warn-level
// log the founder can review. A full moderation queue can come in a later milestone.
const reportSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(1000).optional(),
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const reporterId = requireUserId(req, res)
    if (!reporterId) return

    const parsed = reportSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }
    const { userId: reportedId, reason } = parsed.data
    if (reportedId === reporterId) {
      return res.status(400).json({ error: 'You cannot report yourself', code: 'SELF_REPORT' })
    }

    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, reportedId)).limit(1)
    if (!target) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' })
    }

    void logger.warn('user reported', {
      source: 'api:reports',
      requestId,
      context: { reporterId, reportedId, reason: reason ?? null },
    })
    return res.status(201).json({ reported: true })
  } catch (err) {
    return next(err)
  }
})

export { router as reportRoutes }
