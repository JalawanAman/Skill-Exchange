import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { users, skillOffers, skillWants, skills } from '../db/schema'
import { logger } from '../lib/logger'
import { refreshMatchesInBackground } from '../services/matching.service'

const router: IRouter = Router()

/** A user's skill offers + wants, joined with the skill catalog (name/category). */
async function getUserSkills(userId: string) {
  const offers = await db
    .select({
      id: skillOffers.id,
      skillId: skillOffers.skillId,
      skillName: skills.name,
      category: skills.category,
      proficiency: skillOffers.proficiency,
      yearsExperience: skillOffers.yearsExperience,
      description: skillOffers.description,
    })
    .from(skillOffers)
    .innerJoin(skills, eq(skillOffers.skillId, skills.id))
    .where(eq(skillOffers.userId, userId))

  const wants = await db
    .select({
      id: skillWants.id,
      skillId: skillWants.skillId,
      skillName: skills.name,
      category: skills.category,
      levelTarget: skillWants.levelTarget,
      notes: skillWants.notes,
    })
    .from(skillWants)
    .innerJoin(skills, eq(skillWants.skillId, skills.id))
    .where(eq(skillWants.userId, userId))

  return { skillOffers: offers, skillWants: wants }
}

// ─── GET /api/users/me — caller's full profile (incl. skills) ─────────────────
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

    const userSkills = await getUserSkills(userId)
    return res.json({ user: { ...user, ...userSkills } })
  } catch (err) {
    return next(err)
  }
})

// ─── PATCH /api/users/me — update profile fields (also completes onboarding) ──
const patchSchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
    bio: z.string().max(300).optional(),
    location: z.string().max(100).optional(),
    timezone: z.string().max(50).optional(),
    languages: z.array(z.string().min(1).max(20)).max(20).optional(),
    avatarUrl: z.string().url().max(500).optional(),
    isOnboarded: z.boolean().optional(),
  })
  .strict()

router.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })

    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }
    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ error: 'No fields to update', code: 'EMPTY_UPDATE' })
    }

    const [user] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' })

    void logger.info('profile updated', { source: 'api:users', requestId, context: { userId, fields: Object.keys(parsed.data) } })
    // Languages feed the match score — recompute when they change.
    if (parsed.data.languages !== undefined) refreshMatchesInBackground(userId, requestId)
    return res.json({ user })
  } catch (err) {
    return next(err)
  }
})

// ─── GET /api/users/:id — public profile (no email / credits) ─────────────────
// NOTE: must be registered AFTER /me so "/me" isn't captured by ":id".
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        location: users.location,
        timezone: users.timezone,
        languages: users.languages,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1)

    if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' })

    const userSkills = await getUserSkills(user.id)
    return res.json({ user: { ...user, ...userSkills } })
  } catch (err) {
    return next(err)
  }
})

export { router as userRoutes }
