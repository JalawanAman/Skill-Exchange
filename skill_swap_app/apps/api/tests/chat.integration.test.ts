import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * Integration test for the chat persistence layer the socket handlers rely on:
 * send → store, history read-back, and read-receipt marking (M5-T06/T10 + Q03).
 *
 * Hits the real DATABASE_URL, so it's skipped in CI (which runs DB-free). Locally
 * `pnpm test` loads apps/api/.env, creates two throwaway users + a conversation,
 * exercises the queries, and cleans everything up afterwards.
 */

const HAS_DB = !!process.env.DATABASE_URL

// Dynamic imports: importing ../src/db throws without DATABASE_URL, so only load
// it inside the guarded suite (never in CI).
type Db = Awaited<typeof import('../src/db')>['db']
type Schema = typeof import('../src/db/schema')

describe.skipIf(!HAS_DB)('chat persistence (integration)', () => {
  let db: Db
  let s: Schema
  let genId: (p: string) => string
  let dz: typeof import('drizzle-orm')

  const A = 'user_test_chat_a'
  const B = 'user_test_chat_b'
  let convId: string

  beforeAll(async () => {
    ;({ db } = await import('../src/db'))
    s = await import('../src/db/schema')
    ;({ generateId: genId } = await import('../src/lib/ids'))
    dz = await import('drizzle-orm')

    await db
      .insert(s.users)
      .values([
        { id: A, email: 'chat.a@test.local', displayName: 'Chat A', isOnboarded: true },
        { id: B, email: 'chat.b@test.local', displayName: 'Chat B', isOnboarded: true },
      ])
      .onConflictDoNothing()

    const [pa, pb] = A < B ? [A, B] : [B, A]
    convId = genId('cnv')
    await db.insert(s.conversations).values({ id: convId, participantA: pa, participantB: pb })
  })

  afterAll(async () => {
    if (!db) return
    // Deleting the conversation cascades its messages; then remove the users.
    await db.delete(s.conversations).where(dz.eq(s.conversations.id, convId))
    await db.delete(s.users).where(dz.inArray(s.users.id, [A, B]))
  })

  it('persists a sent message and reads it back in history', async () => {
    const [msg] = await db
      .insert(s.messages)
      .values({ id: genId('msg'), conversationId: convId, senderId: A, content: 'hello from A' })
      .returning()

    expect(msg.content).toBe('hello from A')
    expect(msg.isRead).toBe(false)

    const history = await db
      .select()
      .from(s.messages)
      .where(dz.eq(s.messages.conversationId, convId))
      .orderBy(dz.desc(s.messages.createdAt))
    expect(history.map((m) => m.id)).toContain(msg.id)
  })

  it('marks the other party’s messages read and clears the unread count', async () => {
    // A → B, then B reads: every message not sent by B flips to read.
    await db
      .insert(s.messages)
      .values({ id: genId('msg'), conversationId: convId, senderId: A, content: 'unread until B reads' })

    await db
      .update(s.messages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        dz.and(dz.eq(s.messages.conversationId, convId), dz.ne(s.messages.senderId, B), dz.eq(s.messages.isRead, false)),
      )

    const [{ c }] = await db
      .select({ c: dz.count() })
      .from(s.messages)
      .where(
        dz.and(dz.eq(s.messages.conversationId, convId), dz.ne(s.messages.senderId, B), dz.eq(s.messages.isRead, false)),
      )
    expect(Number(c)).toBe(0)
  })
})
