import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { and, desc, eq, ilike, inArray, notInArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { users, skillOffers, skillWants, skills } from '../db/schema'
import { logger } from '../lib/logger'
import { refreshMatchesInBackground, getBlockedUserIds } from '../services/matching.service'

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

// ─── GET /api/users/search — browse people (by skill/category/text) ───────────
// NOTE: registered BEFORE /:id so "/search" isn't captured by ":id".
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined
    const skillId = typeof req.query.skillId === 'string' ? req.query.skillId : undefined
    const category = typeof req.query.category === 'string' ? req.query.category : undefined
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    // Never show self or anyone in a block relationship (either direction).
    const exclude = await getBlockedUserIds(userId)
    exclude.add(userId)

    // Narrow to users who offer a given skill / category, if asked.
    let candidateIds: string[] | null = null
    if (skillId) {
      const rows = await db
        .selectDistinct({ userId: skillOffers.userId })
        .from(skillOffers)
        .where(eq(skillOffers.skillId, skillId))
      candidateIds = rows.map((r) => r.userId)
    } else if (category) {
      const rows = await db
        .selectDistinct({ userId: skillOffers.userId })
        .from(skillOffers)
        .innerJoin(skills, eq(skillOffers.skillId, skills.id))
        .where(eq(skills.category, category))
      candidateIds = rows.map((r) => r.userId)
    }

    // Free-text search matches a display name OR an offered skill's name.
    if (q) {
      const like = `%${q}%`
      const [byName, bySkill] = await Promise.all([
        db.select({ id: users.id }).from(users).where(ilike(users.displayName, like)),
        db
          .selectDistinct({ userId: skillOffers.userId })
          .from(skillOffers)
          .innerJoin(skills, eq(skillOffers.skillId, skills.id))
          .where(ilike(skills.name, like)),
      ])
      const qIds = new Set([...byName.map((r) => r.id), ...bySkill.map((r) => r.userId)])
      candidateIds = candidateIds ? candidateIds.filter((id) => qIds.has(id)) : [...qIds]
    }

    // Resolve the page of users.
    type Row = {
      id: string
      displayName: string | null
      avatarUrl: string | null
      bio: string | null
      location: string | null
      languages: string[]
    }
    const cols = {
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      location: users.location,
      languages: users.languages,
    }

    let pageUsers: Row[]
    if (candidateIds !== null) {
      const filtered = candidateIds.filter((id) => !exclude.has(id))
      const pageIds = filtered.slice(offset, offset + limit)
      pageUsers = pageIds.length
        ? await db.select(cols).from(users).where(and(inArray(users.id, pageIds), eq(users.isOnboarded, true)))
        : []
    } else {
      const conds = [eq(users.isOnboarded, true)]
      if (exclude.size > 0) conds.push(notInArray(users.id, [...exclude]))
      pageUsers = await db
        .select(cols)
        .from(users)
        .where(and(...conds))
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset)
    }

    // Attach each user's offered skills (what they can teach) for the cards.
    const ids = pageUsers.map((u) => u.id)
    const offerRows = ids.length
      ? await db
          .select({
            userId: skillOffers.userId,
            skillId: skillOffers.skillId,
            skillName: skills.name,
            category: skills.category,
            proficiency: skillOffers.proficiency,
          })
          .from(skillOffers)
          .innerJoin(skills, eq(skillOffers.skillId, skills.id))
          .where(inArray(skillOffers.userId, ids))
      : []
    const offersByUser = new Map<string, typeof offerRows>()
    for (const o of offerRows) {
      const list = offersByUser.get(o.userId) ?? []
      list.push(o)
      offersByUser.set(o.userId, list)
    }

    const result = pageUsers.map((u) => ({ ...u, skillOffers: offersByUser.get(u.id) ?? [] }))
    return res.json({ users: result, limit, offset })
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
