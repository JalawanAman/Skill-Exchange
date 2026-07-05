'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import type { Socket } from 'socket.io-client'
import { createChatSocket } from '@/lib/chat-socket'
import { loadOlderMessages, markConversationRead } from '../actions'

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: 'text' | 'image' | 'file' | 'system'
  fileUrl: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  // client-only:
  pending?: boolean
  failed?: boolean
}

type OtherUser = { id: string; displayName: string | null; avatarUrl: string | null }

export default function ChatWindow({
  conversationId,
  meId,
  other,
  initialMessages,
  initialOnline,
  initialHasMore,
  initialNextBefore,
}: {
  conversationId: string
  meId: string
  other: OtherUser
  initialMessages: ChatMessage[]
  initialOnline: boolean
  initialHasMore: boolean
  initialNextBefore: string | null
}) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [online, setOnline] = useState(initialOnline)
  const [otherTyping, setOtherTyping] = useState(false)
  const [connected, setConnected] = useState(false)
  const [draft, setDraft] = useState('')
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const nextBeforeRef = useRef<string | null>(initialNextBefore)
  const socketRef = useRef<Socket | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Is the scroll container near the bottom? (decide whether to auto-scroll)
  const nearBottom = () => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // ── Socket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = createChatSocket(getToken)
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('conversation:join', conversationId)
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('message:new', (m: ChatMessage) => {
      // Own messages are reconciled via the send ack; only take the other party's here.
      if (m.senderId === meId) return
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
      void markConversationRead(conversationId) // I'm looking at it → mark read + emit receipt
    })

    socket.on('typing:indicator', (p: { userId: string; typing: boolean }) => {
      if (p.userId === other.id) setOtherTyping(p.typing)
    })

    socket.on('message:read', (p: { readerId: string }) => {
      if (p.readerId === other.id) {
        setMessages((prev) => prev.map((x) => (x.senderId === meId ? { ...x, isRead: true } : x)))
      }
    })

    socket.on('presence:update', (p: { userId: string; online: boolean }) => {
      if (p.userId === other.id) setOnline(p.online)
    })

    // Opening the thread clears my unread + tells the sender I've read.
    void markConversationRead(conversationId)

    return () => {
      socket.emit('conversation:leave', conversationId)
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId, meId, other.id, getToken])

  // Auto-scroll to bottom on new messages when already near the bottom.
  const lastId = messages[messages.length - 1]?.id
  useEffect(() => {
    if (nearBottom()) scrollToBottom()
  }, [lastId, otherTyping, scrollToBottom])

  // Initial jump to bottom on mount.
  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  // ── Load older on scroll to top ───────────────────────────────────────────
  async function onScroll() {
    const el = scrollRef.current
    if (!el || loadingOlder || !hasMore) return
    if (el.scrollTop > 40) return
    setLoadingOlder(true)
    const prevHeight = el.scrollHeight
    try {
      const cursor = nextBeforeRef.current
      if (!cursor) {
        setHasMore(false)
        return
      }
      const res = await loadOlderMessages(conversationId, cursor)
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id))
        const older = res.messages.filter((m) => !known.has(m.id))
        return [...older, ...prev]
      })
      setHasMore(res.hasMore)
      nextBeforeRef.current = res.nextBefore
      // Preserve the reading position after prepending.
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight
      })
    } finally {
      setLoadingOlder(false)
    }
  }

  // ── Sending ───────────────────────────────────────────────────────────────
  function emitTyping(start: boolean) {
    socketRef.current?.emit(start ? 'typing:start' : 'typing:stop', conversationId)
  }

  function onDraftChange(v: string) {
    setDraft(v)
    emitTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => emitTyping(false), 2000)
  }

  function send() {
    const text = draft.trim()
    if (!text || !socketRef.current) return
    const tempId = `temp_${Date.now()}_${Math.round(Math.random() * 1e6)}`
    const optimistic: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: meId,
      content: text,
      messageType: 'text',
      fileUrl: null,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')
    emitTyping(false)

    socketRef.current.emit(
      'message:send',
      { conversationId, content: text, tempId },
      (res: { ok: boolean; message?: ChatMessage }) => {
        setMessages((prev) => {
          if (res?.ok && res.message) {
            const real = res.message
            const withoutDup = prev.filter((x) => x.id !== real.id)
            return withoutDup.map((x) => (x.id === tempId ? real : x))
          }
          return prev.map((x) => (x.id === tempId ? { ...x, pending: false, failed: true } : x))
        })
      },
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Link href="/messages" className="text-gray-400 hover:text-gray-700">←</Link>
        {other.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={other.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-500">
            {(other.displayName ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <Link href={`/profile/${other.id}`} className="font-semibold text-gray-900 hover:underline">
            {other.displayName ?? 'Unnamed'}
          </Link>
          <p className="text-xs text-gray-400">
            <span className={`mr-1 inline-block h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            {online ? 'Online' : 'Offline'}
            {!connected && ' · reconnecting…'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {hasMore && (
          <p className="text-center text-xs text-gray-400">{loadingOlder ? 'Loading…' : 'Scroll up for older messages'}</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} mine={m.senderId === meId} />
        ))}
        {otherTyping && (
          <div className="flex items-center gap-1 pl-1 text-gray-400">
            <span className="typing-dot h-2 w-2 animate-bounce rounded-full bg-gray-300" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0.3s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder="Type a message…"
            className="max-h-32 flex-1 resize-none rounded-2xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
          mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 shadow-sm'
        } ${m.failed ? 'opacity-60 ring-1 ring-red-300' : ''}`}
      >
        <p className="whitespace-pre-wrap break-words">{m.content}</p>
        <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
          <span>{time}</span>
          {mine && !m.pending && !m.failed && <span>{m.isRead ? '✓✓' : '✓'}</span>}
          {mine && m.pending && <span>·</span>}
          {mine && m.failed && <span className="text-red-200">failed</span>}
        </div>
      </div>
    </div>
  )
}
