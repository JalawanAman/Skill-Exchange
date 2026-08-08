import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { and, count, desc, eq, inArray, lt, ne, or } from 'drizzle-orm'
import { db } from '../db'
import { conversations, messages, users } from '../db/schema'
import { getIO, isOnline } from '../socket'

const router: IRouter = Router()

function requireUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    return null
  }
  return userId
}

/** Load a conversation and confirm the caller is a participant. */
async function loadIfMember(conversationId: string, userId: string) {
  const [row] = await db
    .select({ id: conversations.id, a: conversations.participantA, b: conversations.participantB })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1)
  if (!row || (row.a !== userId && row.b !== userId)) return null
  return row
}

// ─── GET /api/conversations — list with last-message preview + unread count ───
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const rows = await db
      .select({
        id: conversations.id,
        participantA: conversations.participantA,
        participantB: conversations.participantB,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(or(eq(conversations.participantA, userId), eq(conversations.participantB, userId)))

    if (rows.length === 0) return res.json({ conversations: [] })

    const convIds = rows.map((r) => r.id)
    const otherIds = [...new Set(rows.map((r) => (r.participantA === userId ? r.participantB : r.participantA)))]

    const [others, unreadRows, lastMsgs] = await Promise.all([
      db
        .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl, location: users.location })
        .from(users)
        .where(inArray(users.id, otherIds)),
      // Unread = messages sent by the other party that I haven't read.
      db
        .select({ conversationId: messages.conversationId, c: count() })
        .from(messages)
        .where(and(inArray(messages.conversationId, convIds), ne(messages.senderId, userId), eq(messages.isRead, false)))
        .groupBy(messages.conversationId),
      // Latest message per conversation (one small query each — fine at MVP scale).
      Promise.all(
        convIds.map(async (cid) => {
          const [m] = await db
            .select({ content: messages.content, messageType: messages.messageType, senderId: messages.senderId, createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.conversationId, cid))
            .orderBy(desc(messages.createdAt))
            .limit(1)
          return [cid, m ?? null] as const
        }),
      ),
    ])

    const userById = new Map(others.map((u) => [u.id, u]))
    const unreadById = new Map(unreadRows.map((u) => [u.conversationId, Number(u.c)]))
    const lastById = new Map(lastMsgs)

    const list = rows
      .map((r) => {
        const otherId = r.participantA === userId ? r.participantB : r.participantA
        const last = lastById.get(r.id)
        return {
          id: r.id,
          user: userById.get(otherId) ?? null,
          online: isOnline(otherId),
          unread: unreadById.get(r.id) ?? 0,
          lastMessage: last ? { content: last.content, type: last.messageType, fromMe: last.senderId === userId, at: last.createdAt } : null,
          lastActivityAt: last?.createdAt ?? r.lastMessageAt ?? r.createdAt,
        }
      })
      .sort((a, b) => new Date(b.lastActivityAt).valueOf() - new Date(a.lastActivityAt).valueOf())

    return res.json({ conversations: list })
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/conversations/:id/messages — paginated history (newest cursor) ──
router.get('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const conv = await loadIfMember(req.params.id, userId)
    if (!conv) return res.status(404).json({ error: 'Conversation not found', code: 'NOT_FOUND' })

    const limit = Math.min(Number(req.query.limit) || 30, 100)
    const before = typeof req.query.before === 'string' ? new Date(req.query.before) : null
    const validBefore = before && !Number.isNaN(before.valueOf()) ? before : null

    const where = validBefore
      ? and(eq(messages.conversationId, conv.id), lt(messages.createdAt, validBefore))
      : eq(messages.conversationId, conv.id)

    // Fetch newest-first for the cursor, then return oldest-first for rendering.
    const page = await db.select().from(messages).where(where).orderBy(desc(messages.createdAt)).limit(limit)
    const ordered = [...page].reverse()

    return res.json({
      messages: ordered,
      hasMore: page.length === limit,
      nextBefore: page.length ? page[page.length - 1].createdAt : null,
    })
  } catch (err) {
    return next(err)
  }
})

// ─── PATCH /api/conversations/:id/read — mark the other party's msgs read ─────
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const conv = await loadIfMember(req.params.id, userId)
    if (!conv) return res.status(404).json({ error: 'Conversation not found', code: 'NOT_FOUND' })

    await db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(messages.conversationId, conv.id), ne(messages.senderId, userId), eq(messages.isRead, false)))

    // Let the other participant's open chat update its read ticks in real time.
    getIO()?.to(`conv:${conv.id}`).emit('message:read', { conversationId: conv.id, readerId: userId })

    return res.json({ read: true })
  } catch (err) {
    return next(err)
  }
})

export { router as conversationRoutes }
