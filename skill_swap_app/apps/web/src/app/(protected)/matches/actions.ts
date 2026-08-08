'use server'

import { serverApiFetch } from '@/lib/api-server'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** Hide a match — it won't be surfaced again on future refreshes. */
export async function dismissMatch(id: string): Promise<void> {
  await serverApiFetch(`/api/matches/${id}/dismiss`, { method: 'POST' })
}

/** Recompute the caller's matches now. Returns how many active matches were stored. */
export async function refreshMatches(): Promise<number> {
  const r = await serverApiFetch<{ count: number }>('/api/matches/refresh', { method: 'POST' })
  return r.count
}

/** Block a user — removes them from matches + browse in both directions. */
export async function blockUser(userId: string): Promise<void> {
  await serverApiFetch('/api/blocks', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ userId }),
  })
}
