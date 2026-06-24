import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { logger } from '../lib/logger'

const router: IRouter = Router()

/**
 * GET /api/users/me — the currently authenticated user's profile.
 *
 *  - 401 if the request is not authenticated (no valid Clerk session).
 *  - 404 if authenticated but no matching DB row (should not happen once the
 *    Clerk webhook has run; surfaced explicitly so it's obvious if it does).
 *  - 200 with the user record otherwise.
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined

  try {
    const { userId } = getAuth(req)

    if (!userId) {
      void logger.warn('GET /api/users/me — unauthenticated', { source: 'api:users', requestId })
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      void logger.warn('GET /api/users/me — authenticated but no DB row', {
        source: 'api:users',
        requestId,
        context: { clerkUserId: userId },
      })
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' })
    }

    void logger.info('GET /api/users/me — ok', {
      source: 'api:users',
      requestId,
      context: { clerkUserId: userId },
    })
    return res.json({ user })
  } catch (err) {
    // Hand off to the global error handler (which logs full detail).
    return next(err)
  }
})

export { router as userRoutes }
