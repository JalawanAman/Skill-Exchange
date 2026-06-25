import { Router, Request, Response, NextFunction, IRouter } from 'express'
import { getAuth } from '@clerk/express'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { availability } from '../db/schema'
import { generateId } from '../lib/ids'

const router: IRouter = Router()

// ─── GET /api/availability/:userId — a user's weekly slots ────────────────────
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db
      .select()
      .from(availability)
      .where(eq(availability.userId, req.params.userId))
      .orderBy(asc(availability.dayOfWeek), asc(availability.startTime))
    return res.json({ availability: rows })
  } catch (err) {
    return next(err)
  }
})

// ─── PUT /api/availability — replace the caller's full weekly schedule ────────
const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'HH:MM'),
  timezone: z.string().min(1),
})
const putSchema = z.object({ slots: z.array(slotSchema).max(50) })

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' })

    const parsed = putSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION', details: parsed.error.flatten() })
    }

    const slots = parsed.data.slots
    const rowsToInsert = slots.map((s) => ({ id: generateId('avl'), userId, ...s }))

    // Replace the whole schedule. neon-http has no interactive tx; db.batch is atomic.
    if (rowsToInsert.length > 0) {
      await db.batch([
        db.delete(availability).where(eq(availability.userId, userId)),
        db.insert(availability).values(rowsToInsert),
      ])
    } else {
      await db.delete(availability).where(eq(availability.userId, userId))
    }

    const rows = await db
      .select()
      .from(availability)
      .where(eq(availability.userId, userId))
      .orderBy(asc(availability.dayOfWeek), asc(availability.startTime))
    return res.json({ availability: rows })
  } catch (err) {
    return next(err)
  }
})

export { router as availabilityRoutes }
