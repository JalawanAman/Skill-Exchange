'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { searchUsers, type BrowseUser } from './actions'
import { blockUser } from '../matches/actions'

export default function BrowseClient({ categories }: { categories: string[] }) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [users, setUsers] = useState<BrowseUser[]>([])
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState<Set<string>>(new Set())

  // Debounced search: re-run 300ms after the query/category stops changing.
  useEffect(() => {
    let active = true
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const result = await searchUsers({ q: q.trim() || undefined, category: category || undefined })
        if (active) setUsers(result)
      } catch {
        if (active) setUsers([])
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [q, category])

  async function onBlock(u: BrowseUser) {
    if (!confirm(`Block ${u.displayName ?? 'this user'}?`)) return
    setBlocked((s) => new Set(s).add(u.id))
    try {
      await blockUser(u.id)
    } catch {
      setBlocked((s) => {
        const next = new Set(s)
        next.delete(u.id)
        return next
      })
    }
  }

  const visible = users.filter((u) => !blocked.has(u.id))

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Browse people</h1>
          <Link href="/dashboard" className="text-sm text-blue-600">← Dashboard</Link>
        </div>

        {/* Search controls */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or skill…"
            className="input flex-1"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input sm:w-48">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <p className="text-sm text-gray-400">Searching…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border bg-white p-6 text-center text-sm text-gray-500">No people found. Try a different search.</p>
        ) : (
          <div className="space-y-3">
            {visible.map((u) => (
              <div key={u.id} className="flex items-start gap-4 rounded-xl border bg-white p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500">
                    {(u.displayName ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{u.displayName ?? 'Unnamed'}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <Link href={`/profile/${u.id}`} className="font-medium text-blue-600 hover:underline">View</Link>
                      <button onClick={() => onBlock(u)} className="text-red-500 hover:text-red-700">Block</button>
                    </div>
                  </div>
                  {u.location && <p className="text-xs text-gray-400">{u.location}</p>}
                  {u.skillOffers.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Teaches: </span>
                      {u.skillOffers.slice(0, 6).map((s) => (
                        <span key={s.skillId} className="mr-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {s.skillName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
