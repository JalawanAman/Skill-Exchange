import Link from 'next/link'
import { serverApiFetch } from '@/lib/api-server'

type Conversation = {
  id: string
  user: { id: string; displayName: string | null; avatarUrl: string | null; location: string | null } | null
  online: boolean
  unread: number
  lastMessage: { content: string; type: string; fromMe: boolean; at: string } | null
  lastActivityAt: string
}

export default async function MessagesPage() {
  let conversations: Conversation[] = []
  try {
    const data = await serverApiFetch<{ conversations: Conversation[] }>('/api/conversations')
    conversations = data.conversations
  } catch {
    conversations = []
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>

        {conversations.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center">
            <p className="font-medium text-gray-900">No conversations yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Connect with someone from your{' '}
              <Link href="/dashboard" className="text-blue-600">matches</Link> or{' '}
              <Link href="/connections" className="text-blue-600">requests</Link> to start chatting.
            </p>
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-white">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <div className="relative">
                  {c.user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.user.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500">
                      {(c.user?.displayName ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {c.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-semibold text-gray-900">{c.user?.displayName ?? 'Unnamed'}</p>
                    <span className="ml-2 shrink-0 text-[11px] text-gray-400">
                      {new Date(c.lastActivityAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`truncate text-sm ${c.unread > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                      {c.lastMessage
                        ? `${c.lastMessage.fromMe ? 'You: ' : ''}${c.lastMessage.content}`
                        : 'No messages yet'}
                    </p>
                    {c.unread > 0 && (
                      <span className="ml-2 shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
