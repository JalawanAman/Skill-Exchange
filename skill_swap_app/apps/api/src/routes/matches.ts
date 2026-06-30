import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { matches, users } from '../db/schema'
import { refreshMatchesForUser } from '../services/matching.service'
import { logger } from '../lib/logger'

const router: IRouter = Router()

/** Returns the authenticated user id, or writes a 401 and returns null. */
function requireUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    return null
  }
  return userId
}

// ─── GET /api/matches — caller's active matches, best first ───────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const rows = await db
      .select({
        id: matches.id,
        matchedUserId: matches.matchedUserId,
        compatibilityScore: matches.compatibilityScore,
        scoreBreakdown: matches.scoreBreakdown,
        matchedSkills: matches.matchedSkills,
        sharedLanguages: matches.sharedLanguages,
        createdAt: matches.createdAt,
        user: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          location: users.location,
          timezone: users.timezone,
          languages: users.languages,
        },
      })
      .from(matches)
      .innerJoin(users, eq(matches.matchedUserId, users.id))
      .where(and(eq(matches.userId, userId), eq(matches.status, 'active')))
      .orderBy(desc(matches.compatibilityScore))
      .limit(limit)
      .offset(offset)

    return res.json({ matches: rows, limit, offset })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/matches/refresh — recompute the caller's matches now ───────────
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const stored = await refreshMatchesForUser(userId, requestId)
    return res.json({ refreshed: true, count: stored })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/matches/:id/dismiss — hide a match (won't resurface) ───────────
router.post('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const [updated] = await db
      .update(matches)
      .set({ status: 'dismissed', updatedAt: new Date() })
      .where(and(eq(matches.id, req.params.id), eq(matches.userId, userId)))
      .returning({ id: matches.id })

    if (!updated) {
      return res.status(404).json({ error: 'Match not found', code: 'NOT_FOUND' })
    }

    void logger.info('match dismissed', { source: 'api:matches', requestId, context: { userId, matchId: req.params.id } })
    return res.json({ dismissed: true })
  } catch (err) {
    return next(err)
  }
})

export { router as matchRoutes }
