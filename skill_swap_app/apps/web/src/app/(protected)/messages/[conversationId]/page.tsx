import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { serverApiFetch } from '@/lib/api-server'
import ChatWindow, { type ChatMessage } from './ChatWindow'

type ConvSummary = {
  id: string
  user: { id: string; displayName: string | null; avatarUrl: string | null } | null
  online: boolean
}

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  const { userId: meId } = await auth()
  const id = params.conversationId

  // Find this conversation in my list (also enforces membership + gives the header info).
  let summary: ConvSummary | null = null
  try {
    const { conversations } = await serverApiFetch<{ conversations: ConvSummary[] }>('/api/conversations')
    summary = conversations.find((c) => c.id === id) ?? null
  } catch {
    summary = null
  }

  if (!meId || !summary || !summary.user) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6">
          <p className="font-medium text-gray-900">Conversation not found</p>
          <Link href="/messages" className="mt-2 inline-block text-sm text-blue-600">← Back to messages</Link>
        </div>
      </main>
    )
  }

  // Initial history page.
  let initial: { messages: ChatMessage[]; hasMore: boolean; nextBefore: string | null } = {
    messages: [],
    hasMore: false,
    nextBefore: null,
  }
  try {
    initial = await serverApiFetch(`/api/conversations/${id}/messages?limit=30`)
  } catch {
    // leave empty
  }

  return (
    <ChatWindow
      conversationId={id}
      meId={meId}
      other={summary.user}
      initialMessages={initial.messages}
      initialOnline={summary.online}
      initialHasMore={initial.hasMore}
      initialNextBefore={initial.nextBefore}
    />
  )
}
