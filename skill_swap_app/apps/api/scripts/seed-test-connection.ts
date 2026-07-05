import 'dotenv/config'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '../src/db'
import { users, connectionRequests } from '../src/db/schema'
import { generateId } from '../src/lib/ids'

/**
 * Seed an INCOMING connection request from "Test Partner" → your user, so you can
 * exercise the accept/decline flow solo (you can't log in as the seeded partner).
 *
 *   pnpm seed:test-connection            # auto-detects your onboarded user
 *   pnpm seed:test-connection <userId>   # or target a specific user
 *
 * Run `pnpm seed:test-match` first (creates the Test Partner). Idempotent: resets
 * any prior request between the pair back to a fresh 'pending'. After it runs,
 * open /connections and you should see a request to Accept (→ opens a conversation).
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
    console.error('No target user found. Pass a user id: pnpm seed:test-connection <userId>')
    process.exit(1)
  }

  // Make sure the Test Partner exists (a minimal row is enough to satisfy the FK).
  const [partner] = await db.select({ id: users.id }).from(users).where(eq(users.id, PARTNER_ID)).limit(1)
  if (!partner) {
    await db.insert(users).values({
      id: PARTNER_ID,
      email: PARTNER_EMAIL,
      displayName: 'Test Partner',
      bio: 'Seeded test user.',
      languages: ['en'],
      location: 'Test City',
      isOnboarded: true,
      creditBalance: 20,
    })
    console.log('(Test Partner did not exist — created a minimal one. Run pnpm seed:test-match for full skills.)')
  }

  // Reset any prior request between the pair, then insert a fresh pending one.
  await db
    .delete(connectionRequests)
    .where(and(eq(connectionRequests.fromUserId, PARTNER_ID), eq(connectionRequests.toUserId, founder.id)))

  const [request] = await db
    .insert(connectionRequests)
    .values({
      id: generateId('conn'),
      fromUserId: PARTNER_ID,
      toUserId: founder.id,
      message: 'Hi! I saw we have complementary skills — want to swap?',
    })
    .returning()

  console.log(`\nSeeded a pending request ${request.id}: Test Partner → ${founder.id}.`)
  console.log('Open /connections — you should see it with Accept / Decline.')
  console.log('Accepting creates a conversation (check GET /api/conversations).\n')
  process.exit(0)
}

main().catch((err) => {
  console.error('seed-test-connection failed:', err)
  process.exit(1)
})
