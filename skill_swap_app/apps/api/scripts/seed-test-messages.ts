import 'dotenv/config'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '../src/db'
import { users, conversations, messages } from '../src/db/schema'
import { generateId } from '../src/lib/ids'

/**
 * Seed a short chat thread between you and "Test Partner" so the chat UI has
 * history to render (proves GET /conversations/:id/messages + read state).
 *
 *   pnpm seed:test-messages            # auto-detects your onboarded user
 *   pnpm seed:test-messages <userId>   # or target a specific user
 *
 * Ensures a conversation exists between the pair (creating one if you haven't
 * accepted the connection yet), then resets and inserts a scripted thread.
 * Partner messages are left UNREAD so you can test read receipts + unread counts.
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
    console.error('No target user found. Pass a user id: pnpm seed:test-messages <userId>')
    process.exit(1)
  }

  // Ensure the Test Partner exists (minimal row is enough for the FK).
  const [partner] = await db.select({ id: users.id }).from(users).where(eq(users.id, PARTNER_ID)).limit(1)
  if (!partner) {
    await db.insert(users).values({
      id: PARTNER_ID,
      email: PARTNER_EMAIL,
      displayName: 'Test Partner',
      languages: ['en'],
      location: 'Test City',
      isOnboarded: true,
      creditBalance: 20,
    })
  }

  // Ensure a conversation exists for the (canonicalized) pair.
  const [pa, pb] = founder.id < PARTNER_ID ? [founder.id, PARTNER_ID] : [PARTNER_ID, founder.id]
  let [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.participantA, pa), eq(conversations.participantB, pb)))
    .limit(1)
  if (!conv) {
    ;[conv] = await db
      .insert(conversations)
      .values({ id: generateId('cnv'), participantA: pa, participantB: pb })
      .returning({ id: conversations.id })
  }

  // Reset the thread for idempotency.
  await db.delete(messages).where(eq(messages.conversationId, conv.id))

  // Scripted thread: partner opens, you reply, back and forth. Timestamps ascend.
  const thread: { from: string; text: string }[] = [
    { from: PARTNER_ID, text: 'Hey! Saw we match on Python ↔ Piano. Keen to swap?' },
    { from: founder.id, text: 'Yeah! I can teach Python evenings. You free this week?' },
    { from: PARTNER_ID, text: 'Perfect. I could do Thursday for a first piano session.' },
    { from: founder.id, text: 'Thursday works. 30 min to start?' },
    { from: PARTNER_ID, text: 'Sounds great — talk then! 🎹' },
  ]

  const base = Date.now() - thread.length * 60_000
  const rows = thread.map((m, i) => ({
    id: generateId('msg'),
    conversationId: conv.id,
    senderId: m.from,
    content: m.text,
    // Partner's messages stay unread so read receipts + unread badges are testable.
    isRead: m.from === founder.id,
    createdAt: new Date(base + i * 60_000),
  }))
  await db.insert(messages).values(rows)

  const last = rows[rows.length - 1]
  await db.update(conversations).set({ lastMessageAt: last.createdAt }).where(eq(conversations.id, conv.id))

  console.log(`\nSeeded ${rows.length} messages into conversation ${conv.id} (you ↔ Test Partner).`)
  console.log(`Unread from partner: ${rows.filter((r) => !r.isRead).length}.`)
  console.log('Open /messages → the conversation → you should see the thread.\n')
  process.exit(0)
}

main().catch((err) => {
  console.error('seed-test-messages failed:', err)
  process.exit(1)
})
