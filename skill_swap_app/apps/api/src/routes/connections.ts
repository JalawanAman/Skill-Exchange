import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { connectionRequests, users } from '../db/schema'
import { generateId } from '../lib/ids'
import { logger } from '../lib/logger'
import { getBlockedUserIds } from '../services/matching.service'
import {
  FREE_REQUEST_LIMIT,
  acceptConnectionRequest,
  countRecentRequests,
  findConversation,
} from '../services/connections.service'

const router: IRouter = Router()

function requireUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    return null
  }
  return userId
}

// Public columns of the "other" user, attached to request rows for display.
const otherUser = {
  id: users.id,
  displayName: users.displayName,
  avatarUrl: users.avatarUrl,
  location: users.location,
  timezone: users.timezone,
}

// ─── POST /api/connections/request — ask to connect ───────────────────────────
const requestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().max(500).optional(),
})

router.post('/request', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const fromUserId = requireUserId(req, res)
    if (!fromUserId) return

    const parsed = requestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }
    const toUserId = parsed.data.userId
    if (toUserId === fromUserId) {
      return res.status(400).json({ error: 'You cannot connect with yourself', code: 'SELF_CONNECT' })
    }

    // Target must exist.
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, toUserId)).limit(1)
    if (!target) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' })
    }

    // Either-direction block bars the request.
    const blocked = await getBlockedUserIds(fromUserId)
    if (blocked.has(toUserId)) {
      return res.status(403).json({ error: 'You cannot connect with this user', code: 'BLOCKED' })
    }

    // Already connected → nothing to do.
    if (await findConversation(fromUserId, toUserId)) {
      return res.status(409).json({ error: 'You are already connected', code: 'ALREADY_CONNECTED' })
    }

    // Existing request in either direction.
    const existing = await db
      .select({ id: connectionRequests.id, from: connectionRequests.fromUserId, status: connectionRequests.status })
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.fromUserId, fromUserId),
          eq(connectionRequests.toUserId, toUserId),
        ),
      )
      .limit(1)
    const mine = existing[0]
    if (mine?.status === 'pending') {
      return res.status(409).json({ error: 'You already have a pending request to this user', code: 'DUPLICATE_REQUEST' })
    }
    if (mine?.status === 'accepted') {
      return res.status(409).json({ error: 'You are already connected', code: 'ALREADY_CONNECTED' })
    }

    // They may have already asked you — point the user at their incoming list.
    const [incoming] = await db
      .select({ id: connectionRequests.id })
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.fromUserId, toUserId),
          eq(connectionRequests.toUserId, fromUserId),
          eq(connectionRequests.status, 'pending'),
        ),
      )
      .limit(1)
    if (incoming) {
      return res.status(409).json({ error: 'This user has already sent you a request — check your requests', code: 'INCOMING_EXISTS' })
    }

    // Free-tier rolling-window limit.
    if ((await countRecentRequests(fromUserId)) >= FREE_REQUEST_LIMIT) {
      return res.status(422).json({
        error: `Free accounts can send ${FREE_REQUEST_LIMIT} requests per week`,
        code: 'CONNECTION_LIMIT',
      })
    }

    // Re-send a previously declined request, or create a fresh one.
    const now = new Date()
    let request
    if (mine?.status === 'declined') {
      ;[request] = await db
        .update(connectionRequests)
        .set({ status: 'pending', message: parsed.data.message ?? null, createdAt: now, updatedAt: now })
        .where(eq(connectionRequests.id, mine.id))
        .returning()
    } else {
      ;[request] = await db
        .insert(connectionRequests)
        .values({
          id: generateId('conn'),
          fromUserId,
          toUserId,
          message: parsed.data.message ?? null,
        })
        .returning()
    }

    void logger.info('connection request sent', { source: 'api:connections', requestId, context: { fromUserId, toUserId } })
    return res.status(201).json({ request })
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/connections/requests?direction=incoming|outgoing ────────────────
router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const outgoing = req.query.direction === 'outgoing'
    const joinCol = outgoing ? connectionRequests.toUserId : connectionRequests.fromUserId
    const ownCol = outgoing ? connectionRequests.fromUserId : connectionRequests.toUserId

    const rows = await db
      .select({
        id: connectionRequests.id,
        message: connectionRequests.message,
        status: connectionRequests.status,
        createdAt: connectionRequests.createdAt,
        user: otherUser,
      })
      .from(connectionRequests)
      .innerJoin(users, eq(joinCol, users.id))
      .where(and(eq(ownCol, userId), eq(connectionRequests.status, 'pending')))
      .orderBy(desc(connectionRequests.createdAt))

    return res.json({ requests: rows, count: rows.length })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/connections/requests/:id/accept ────────────────────────────────
router.post('/requests/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    // Only the recipient of a still-pending request may accept it.
    const [reqRow] = await db
      .select({ id: connectionRequests.id, fromUserId: connectionRequests.fromUserId })
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.id, req.params.id),
          eq(connectionRequests.toUserId, userId),
          eq(connectionRequests.status, 'pending'),
        ),
      )
      .limit(1)
    if (!reqRow) {
      return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' })
    }

    const conversationId = await acceptConnectionRequest(reqRow.id, reqRow.fromUserId, userId)

    void logger.info('connection request accepted', { source: 'api:connections', requestId, context: { userId, from: reqRow.fromUserId, conversationId } })
    return res.json({ accepted: true, conversationId })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/connections/requests/:id/decline ───────────────────────────────
router.post('/requests/:id/decline', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const [updated] = await db
      .update(connectionRequests)
      .set({ status: 'declined', updatedAt: new Date() })
      .where(
        and(
          eq(connectionRequests.id, req.params.id),
          eq(connectionRequests.toUserId, userId),
          eq(connectionRequests.status, 'pending'),
        ),
      )
      .returning({ id: connectionRequests.id })
    if (!updated) {
      return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' })
    }

    void logger.info('connection request declined', { source: 'api:connections', requestId, context: { userId, requestRowId: req.params.id } })
    return res.json({ declined: true })
  } catch (err) {
    return next(err)
  }
})

export { router as connectionRoutes }
