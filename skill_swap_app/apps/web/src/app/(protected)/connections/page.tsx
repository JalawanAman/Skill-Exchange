import Link from 'next/link'
import { serverApiFetch } from '@/lib/api-server'
import RequestList, { type ConnectionRequest } from './RequestList'

export default async function ConnectionsPage() {
  let requests: ConnectionRequest[] = []
  try {
    const data = await serverApiFetch<{ requests: ConnectionRequest[] }>('/api/connections/requests')
    requests = data.requests
  } catch {
    requests = []
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Connection requests {requests.length > 0 && <span className="text-gray-400">({requests.length})</span>}
          </h1>
          <Link href="/browse" className="text-sm text-blue-600 hover:underline">Find people →</Link>
        </div>

        <RequestList initial={requests} />
      </div>
    </main>
  )
}
