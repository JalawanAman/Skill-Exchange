import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { blocks, matches } from '../db/schema'
import { generateId } from '../lib/ids'
import { logger } from '../lib/logger'
import { refreshMatchesInBackground } from '../services/matching.service'

const router: IRouter = Router()

function requireUserId(req: Request, res: Response): string | null {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })
    return null
  }
  return userId
}

// ─── POST /api/blocks — block a user ──────────────────────────────────────────
const blockSchema = z.object({ userId: z.string().min(1) })

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const blockerId = requireUserId(req, res)
    if (!blockerId) return

    const parsed = blockSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }
    const blockedId = parsed.data.userId
    if (blockedId === blockerId) {
      return res.status(400).json({ error: 'You cannot block yourself', code: 'SELF_BLOCK' })
    }

    await db
      .insert(blocks)
      .values({ id: generateId('blk'), blockerId, blockedId })
      .onConflictDoNothing()

    // Drop any surfaced match between the two so it disappears immediately.
    await db.transaction(async (tx) => {
      await tx.delete(matches).where(and(eq(matches.userId, blockerId), eq(matches.matchedUserId, blockedId)))
      await tx.delete(matches).where(and(eq(matches.userId, blockedId), eq(matches.matchedUserId, blockerId)))
    })

    void logger.info('user blocked', { source: 'api:blocks', requestId, context: { blockerId, blockedId } })
    // Refresh the blocked user's feed too — they should stop seeing the blocker.
    refreshMatchesInBackground(blockedId, requestId)
    return res.status(201).json({ blocked: true })
  } catch (err) {
    return next(err)
  }
})

// ─── DELETE /api/blocks/:userId — unblock ─────────────────────────────────────
router.delete('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const blockerId = requireUserId(req, res)
    if (!blockerId) return

    const deleted = await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, req.params.userId)))
      .returning({ id: blocks.id })

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Block not found', code: 'NOT_FOUND' })
    }

    void logger.info('user unblocked', { source: 'api:blocks', requestId, context: { blockerId, blockedId: req.params.userId } })
    // Both may match again now — recompute both feeds.
    refreshMatchesInBackground(blockerId, requestId)
    refreshMatchesInBackground(req.params.userId, requestId)
    return res.json({ unblocked: true })
  } catch (err) {
    return next(err)
  }
})

export { router as blockRoutes }
