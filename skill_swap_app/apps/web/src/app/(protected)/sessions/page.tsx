import { auth } from '@clerk/nextjs/server'
import { serverApiFetch } from '@/lib/api-server'
import SessionsClient, { type SessionRow } from './SessionsClient'

export default async function SessionsPage() {
  const { userId: meId } = await auth()

  let sessions: SessionRow[] = []
  try {
    const data = await serverApiFetch<{ sessions: SessionRow[] }>('/api/sessions')
    sessions = data.sessions
  } catch {
    sessions = []
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>
        {meId ? (
          <SessionsClient initial={sessions} meId={meId} />
        ) : (
          <p className="text-sm text-gray-500">Sign in to see your sessions.</p>
        )}
      </div>
    </main>
  )
}
