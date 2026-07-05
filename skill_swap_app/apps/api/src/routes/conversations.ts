import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { eq, inArray, or } from 'drizzle-orm'
import { db } from '../db'
import { conversations, users } from '../db/schema'

const router: IRouter = Router()

function requireUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    return null
  }
  return userId
}

// ─── GET /api/conversations — the caller's conversations (most recent first) ───
// Messages arrive in M5; for now this proves a connection opened a conversation.
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

    // Load the "other" participant for each conversation in one query.
    const otherIds = [...new Set(rows.map((r) => (r.participantA === userId ? r.participantB : r.participantA)))]
    const others = otherIds.length
      ? await db
          .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl, location: users.location })
          .from(users)
          .where(inArray(users.id, otherIds))
      : []
    const byId = new Map(others.map((u) => [u.id, u]))

    const list = rows
      .map((r) => ({
        id: r.id,
        lastMessageAt: r.lastMessageAt,
        createdAt: r.createdAt,
        user: byId.get(r.participantA === userId ? r.participantB : r.participantA) ?? null,
      }))
      // Most recently active first; brand-new conversations (no messages) fall back to createdAt.
      .sort((a, b) => {
        const at = (a.lastMessageAt ?? a.createdAt).valueOf()
        const bt = (b.lastMessageAt ?? b.createdAt).valueOf()
        return bt - at
      })

    return res.json({ conversations: list })
  } catch (err) {
    return next(err)
  }
})

export { router as conversationRoutes }
