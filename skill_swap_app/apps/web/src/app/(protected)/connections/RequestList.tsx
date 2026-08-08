'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { acceptRequest, declineRequest } from './actions'

export type ConnectionRequest = {
  id: string
  message: string | null
  createdAt: string
  user: {
    id: string
    displayName: string | null
    avatarUrl: string | null
    location: string | null
  }
}

export default function RequestList({ initial }: { initial: ConnectionRequest[] }) {
  const router = useRouter()
  const [handled, setHandled] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  const visible = initial.filter((r) => !handled.has(r.id))

  async function act(id: string, kind: 'accept' | 'decline') {
    setBusy(id)
    setHandled((s) => new Set(s).add(id)) // optimistic
    try {
      if (kind === 'accept') await acceptRequest(id)
      else await declineRequest(id)
      router.refresh()
    } catch {
      // Revert on failure so the user can retry.
      setHandled((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
    } finally {
      setBusy(null)
    }
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 text-center">
        <p className="font-medium text-gray-900">No pending requests</p>
        <p className="mt-1 text-sm text-gray-500">
          When someone asks to connect, it shows up here. Find people to connect with on{' '}
          <Link href="/browse" className="text-blue-600">Browse</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {visible.map((r) => (
        <div key={r.id} className="flex items-start gap-4 rounded-xl border bg-white p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.user.avatarUrl ? (
            <img src={r.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500">
              {(r.user.displayName ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${r.user.id}`} className="font-semibold text-gray-900 hover:underline">
              {r.user.displayName ?? 'Unnamed'}
            </Link>
            {r.user.location && <p className="text-xs text-gray-400">{r.user.location}</p>}
            {r.message && <p className="mt-1 text-sm text-gray-600">“{r.message}”</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => act(r.id, 'accept')}
              disabled={busy === r.id}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => act(r.id, 'decline')}
              disabled={busy === r.id}
              className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
