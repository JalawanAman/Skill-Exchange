/**
 * M4 connections — DB helpers shared by the connections routes.
 *
 * A conversation is unique per unordered pair, so we canonicalize the two user
 * ids (smaller first) before reading or writing `conversations`. Accepting a
 * request is one transaction: flip the request, open the conversation, and mark
 * both directional match rows as 'connected'.
 */
import { and, eq, gte, or } from 'drizzle-orm'
import { db } from '../db'
import { connectionRequests, conversations, matches } from '../db/schema'
import { generateId } from '../lib/ids'

/** Free-tier ceiling: how many requests a user may send inside the rolling window. */
export const FREE_REQUEST_LIMIT = 5
export const FREE_WINDOW_DAYS = 7

/** Order two user ids deterministically so a pair maps to exactly one conversation row. */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/** The conversation for a pair, if one exists. */
export async function findConversation(a: string, b: string) {
  const [pa, pb] = canonicalPair(a, b)
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.participantA, pa), eq(conversations.participantB, pb)))
    .limit(1)
  return row ?? null
}

/** Number of requests the user has sent within the rolling free-tier window. */
export async function countRecentRequests(fromUserId: string): Promise<number> {
  const since = new Date(Date.now() - FREE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({ id: connectionRequests.id })
    .from(connectionRequests)
    .where(and(eq(connectionRequests.fromUserId, fromUserId), gte(connectionRequests.createdAt, since)))
  return rows.length
}

/**
 * Accept a pending request in one transaction: mark it accepted, open (or reuse)
 * the pair's conversation, and flip both directional match rows to 'connected'.
 * Returns the conversation id.
 */
export async function acceptConnectionRequest(
  requestId: string,
  fromUserId: string,
  toUserId: string,
): Promise<string> {
  const [pa, pb] = canonicalPair(fromUserId, toUserId)

  return db.transaction(async (tx) => {
    await tx
      .update(connectionRequests)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(connectionRequests.id, requestId))

    // Open the conversation, or reuse it if one already exists for the pair.
    await tx
      .insert(conversations)
      .values({ id: generateId('cnv'), participantA: pa, participantB: pb })
      .onConflictDoNothing()
    const [conv] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.participantA, pa), eq(conversations.participantB, pb)))
      .limit(1)

    // Surface the connection on either side's match card (if one was surfaced).
    await tx
      .update(matches)
      .set({ status: 'connected', updatedAt: new Date() })
      .where(
        or(
          and(eq(matches.userId, fromUserId), eq(matches.matchedUserId, toUserId)),
          and(eq(matches.userId, toUserId), eq(matches.matchedUserId, fromUserId)),
        ),
      )

    return conv.id
  })
}
