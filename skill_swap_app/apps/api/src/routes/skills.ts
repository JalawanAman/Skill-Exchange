import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { and, eq, ilike } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { skills, skillOffers, skillWants } from '../db/schema'
import { generateId } from '../lib/ids'
import { logger } from '../lib/logger'
import { refreshMatchesInBackground } from '../services/matching.service'

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

// ─── GET /api/skills?category=&q= — public skill catalog ──────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined
    const q = typeof req.query.q === 'string' ? req.query.q : undefined

    const conditions = [eq(skills.isActive, true)]
    if (category) conditions.push(eq(skills.category, category))
    if (q) conditions.push(ilike(skills.name, `%${q}%`))

    const rows = await db.select().from(skills).where(and(...conditions)).orderBy(skills.name)
    return res.json({ skills: rows })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/skills/offers — add a skill the user can teach ─────────────────
const offerSchema = z.object({
  skillId: z.string().min(1),
  proficiency: z.enum(['beginner', 'intermediate', 'expert']),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  description: z.string().max(1000).optional(),
})

router.post('/offers', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const parsed = offerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }

    const [offer] = await db
      .insert(skillOffers)
      .values({
        id: generateId('sko'),
        userId,
        skillId: parsed.data.skillId,
        proficiency: parsed.data.proficiency,
        yearsExperience: parsed.data.yearsExperience ?? null,
        description: parsed.data.description ?? null,
      })
      .onConflictDoNothing()
      .returning()

    if (!offer) {
      return res.status(409).json({ error: 'You already offer this skill', code: 'DUPLICATE' })
    }

    void logger.info('skill offer added', { source: 'api:skills', requestId, context: { userId, skillId: parsed.data.skillId } })
    refreshMatchesInBackground(userId, requestId)
    return res.status(201).json({ offer })
  } catch (err) {
    return next(err)
  }
})

// ─── DELETE /api/skills/offers/:id — remove own offer ─────────────────────────
router.delete('/offers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const deleted = await db
      .delete(skillOffers)
      .where(and(eq(skillOffers.id, req.params.id), eq(skillOffers.userId, userId)))
      .returning()

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Offer not found', code: 'NOT_FOUND' })
    }
    refreshMatchesInBackground(userId)
    return res.json({ deleted: true })
  } catch (err) {
    return next(err)
  }
})

// ─── POST /api/skills/wants — add a skill the user wants to learn ──────────────
const wantSchema = z.object({
  skillId: z.string().min(1),
  levelTarget: z.enum(['beginner', 'intermediate', 'advanced']),
  notes: z.string().max(1000).optional(),
})

router.post('/wants', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const parsed = wantSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }

    const [want] = await db
      .insert(skillWants)
      .values({
        id: generateId('skw'),
        userId,
        skillId: parsed.data.skillId,
        levelTarget: parsed.data.levelTarget,
        notes: parsed.data.notes ?? null,
      })
      .onConflictDoNothing()
      .returning()

    if (!want) {
      return res.status(409).json({ error: 'You already want this skill', code: 'DUPLICATE' })
    }

    void logger.info('skill want added', { source: 'api:skills', requestId, context: { userId, skillId: parsed.data.skillId } })
    refreshMatchesInBackground(userId, requestId)
    return res.status(201).json({ want })
  } catch (err) {
    return next(err)
  }
})

// ─── DELETE /api/skills/wants/:id — remove own want ───────────────────────────
router.delete('/wants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) return

    const deleted = await db
      .delete(skillWants)
      .where(and(eq(skillWants.id, req.params.id), eq(skillWants.userId, userId)))
      .returning()

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Want not found', code: 'NOT_FOUND' })
    }
    refreshMatchesInBackground(userId)
    return res.json({ deleted: true })
  } catch (err) {
    return next(err)
  }
})

export { router as skillRoutes }
