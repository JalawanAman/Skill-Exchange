import { Server, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { verifyToken } from '@clerk/express'
import { and, eq, ne } from 'drizzle-orm'
import { db } from './db'
import { conversations, messages } from './db/schema'
import { generateId } from './lib/ids'
import { logger } from './lib/logger'
import { corsOrigin } from './lib/cors'

// Module-level handle so REST routes can emit (e.g. a message sent via HTTP).
let io: Server | null = null
export function getIO(): Server | null {
  return io
}

// In-memory presence: userId → number of live sockets. Correct for a single API
// instance (Railway free tier). Swap for Upstash Redis when scaling horizontally.
const online = new Map<string, number>()
export function isOnline(userId: string): boolean {
  return (online.get(userId) ?? 0) > 0
}

const convRoom = (conversationId: string) => `conv:${conversationId}`
const MAX_CONTENT = 5000

/** Is the user one of the two participants of the conversation? */
async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ a: conversations.participantA, b: conversations.participantB })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1)
  return !!row && (row.a === userId || row.b === userId)
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  })

  // Handshake auth — verify the Clerk session JWT; reject if missing/invalid.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined
      if (!token) return next(new Error('Unauthorized'))
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY ?? '' })
      if (!payload.sub) return next(new Error('Unauthorized'))
      socket.data.userId = payload.sub
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => onConnection(socket))
  return io
}

function onConnection(socket: Socket): void {
  const userId = socket.data.userId as string

  // Presence: mark online, and let others know if this is the first live socket.
  const prev = online.get(userId) ?? 0
  online.set(userId, prev + 1)
  if (prev === 0) broadcastPresence(userId, true)

  // ── Room management ──────────────────────────────────────────────────────
  socket.on('conversation:join', async (conversationId: unknown, ack?: (r: unknown) => void) => {
    if (typeof conversationId !== 'string') return ack?.({ ok: false })
    if (await isParticipant(conversationId, userId)) {
      socket.join(convRoom(conversationId))
      ack?.({ ok: true })
    } else {
      ack?.({ ok: false })
    }
  })

  socket.on('conversation:leave', (conversationId: unknown) => {
    if (typeof conversationId === 'string') socket.leave(convRoom(conversationId))
  })

  // ── Send a message → persist → emit to the room ──────────────────────────
  socket.on(
    'message:send',
    async (payload: unknown, ack?: (r: unknown) => void) => {
      const p = (payload ?? {}) as { conversationId?: unknown; content?: unknown; tempId?: unknown }
      const conversationId = p.conversationId
      const content = typeof p.content === 'string' ? p.content.trim() : ''
      if (typeof conversationId !== 'string' || !content) {
        return ack?.({ ok: false, error: 'INVALID' })
      }
      if (!(await isParticipant(conversationId, userId))) {
        return ack?.({ ok: false, error: 'FORBIDDEN' })
      }
      try {
        const [msg] = await db
          .insert(messages)
          .values({
            id: generateId('msg'),
            conversationId,
            senderId: userId,
            content: content.slice(0, MAX_CONTENT),
          })
          .returning()
        await db.update(conversations).set({ lastMessageAt: msg.createdAt }).where(eq(conversations.id, conversationId))

        // Everyone in the room (incl. other tabs of the sender) gets the canonical row.
        io?.to(convRoom(conversationId)).emit('message:new', msg)
        ack?.({ ok: true, message: msg, tempId: p.tempId })
      } catch (err) {
        void logger.exception('socket message:send failed', err, { source: 'socket', context: { userId, conversationId } })
        ack?.({ ok: false, error: 'SERVER' })
      }
    },
  )

  // ── Typing indicators (not persisted) ────────────────────────────────────
  socket.on('typing:start', (conversationId: unknown) => {
    if (typeof conversationId === 'string')
      socket.to(convRoom(conversationId)).emit('typing:indicator', { conversationId, userId, typing: true })
  })
  socket.on('typing:stop', (conversationId: unknown) => {
    if (typeof conversationId === 'string')
      socket.to(convRoom(conversationId)).emit('typing:indicator', { conversationId, userId, typing: false })
  })

  // ── Read receipts: mark the OTHER party's messages read ──────────────────
  socket.on('message:read', async (conversationId: unknown) => {
    if (typeof conversationId !== 'string') return
    if (!(await isParticipant(conversationId, userId))) return
    await db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId), eq(messages.isRead, false)),
      )
    socket.to(convRoom(conversationId)).emit('message:read', { conversationId, readerId: userId })
  })

  socket.on('disconnect', () => {
    const n = (online.get(userId) ?? 1) - 1
    if (n <= 0) {
      online.delete(userId)
      broadcastPresence(userId, false)
    } else {
      online.set(userId, n)
    }
  })
}

// Small-scale presence: broadcast to everyone; clients filter for the user they
// care about. At scale, target only the user's conversation partners' rooms.
function broadcastPresence(userId: string, isOnlineNow: boolean): void {
  io?.emit('presence:update', { userId, online: isOnlineNow })
}
