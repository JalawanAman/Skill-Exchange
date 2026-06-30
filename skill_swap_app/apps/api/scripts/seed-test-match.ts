import 'dotenv/config'
import { eq, ne } from 'drizzle-orm'
import { db } from '../src/db'
import { users, skillOffers, skillWants, availability, matches } from '../src/db/schema'
import { generateId } from '../src/lib/ids'
import { refreshMatchesForUser } from '../src/services/matching.service'

/**
 * Seed a "Test Partner" that mirrors a real user's skills, so the matching engine
 * has someone to match against (you need ≥2 complementary users to see anything).
 *
 *   pnpm seed:test-match            # auto-detects your onboarded user
 *   pnpm seed:test-match <userId>   # or target a specific user
 *
 * Idempotent: re-running wipes and recreates the partner. The partner OFFERS what
 * you want and WANTS what you offer, shares your languages, and mirrors your
 * availability — so you should see a high-scoring match after it runs.
 */

const PARTNER_ID = 'user_test_partner_001'
const PARTNER_EMAIL = 'test.partner@skillswap.local'

async function main(): Promise<void> {
  const argId = process.argv[2]

  let founder
  if (argId) {
    ;[founder] = await db.select().from(users).where(eq(users.id, argId)).limit(1)
  } else {
    const rows = await db.select().from(users).where(ne(users.id, PARTNER_ID))
    founder = rows.find((u) => u.isOnboarded) ?? rows[0]
  }

  if (!founder) {
    console.error('No target user found. Pass a user id: pnpm seed:test-match <userId>')
    process.exit(1)
  }

  const [fOffers, fWants, fAvail] = await Promise.all([
    db.select().from(skillOffers).where(eq(skillOffers.userId, founder.id)),
    db.select().from(skillWants).where(eq(skillWants.userId, founder.id)),
    db.select().from(availability).where(eq(availability.userId, founder.id)),
  ])

  if (fOffers.length === 0 && fWants.length === 0) {
    console.error(`User ${founder.id} has no skills yet — complete onboarding (add an offer + want) first.`)
    process.exit(1)
  }

  // Wipe any previous partner (cascade removes its skills/availability/matches).
  await db.delete(users).where(eq(users.id, PARTNER_ID))

  await db.insert(users).values({
    id: PARTNER_ID,
    email: PARTNER_EMAIL,
    displayName: 'Test Partner',
    bio: 'Seeded test user for verifying the matching engine.',
    languages: founder.languages?.length ? founder.languages : ['en'],
    timezone: founder.timezone ?? 'UTC',
    location: founder.location ?? 'Test City',
    isOnboarded: true,
    creditBalance: 20,
  })

  // Partner OFFERS what the founder WANTS (so they can teach the founder).
  if (fWants.length > 0) {
    await db.insert(skillOffers).values(
      fWants.map((w) => ({
        id: generateId('sko'),
        userId: PARTNER_ID,
        skillId: w.skillId,
        proficiency: 'expert' as const,
      })),
    )
  }
  // Partner WANTS what the founder OFFERS (so the founder can teach them).
  if (fOffers.length > 0) {
    await db.insert(skillWants).values(
      fOffers.map((o) => ({
        id: generateId('skw'),
        userId: PARTNER_ID,
        skillId: o.skillId,
        levelTarget: 'beginner' as const,
      })),
    )
  }
  // Mirror availability so the schedules overlap.
  if (fAvail.length > 0) {
    await db.insert(availability).values(
      fAvail.map((a) => ({
        id: generateId('avl'),
        userId: PARTNER_ID,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        timezone: a.timezone,
      })),
    )
  }

  const stored = await refreshMatchesForUser(founder.id)
  const myMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.userId, founder.id))

  console.log(`\nSeeded Test Partner (${PARTNER_ID}) mirroring user ${founder.id}.`)
  console.log(`Refreshed matches for that user → ${stored} active match(es) stored.\n`)
  for (const m of myMatches) {
    console.log(`  → ${m.matchedUserId}  score=${m.compatibilityScore}/100  ${JSON.stringify(m.scoreBreakdown)}`)
  }
  console.log('\nOpen the dashboard to see it in the "Your matches" feed.')
  process.exit(0)
}

main().catch((err) => {
  console.error('seed-test-match failed:', err)
  process.exit(1)
})
