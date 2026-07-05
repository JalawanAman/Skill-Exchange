'use server'

import { serverApiFetch, ApiError } from '@/lib/api-server'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type SendResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

/**
 * Send a connection request. Never throws — returns a tagged result so the
 * button can show "sent", "pending", "already connected", or "limit reached".
 */
export async function sendConnectionRequest(userId: string, message?: string): Promise<SendResult> {
  try {
    await serverApiFetch('/api/connections/request', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId, message }),
    })
    return { ok: true }
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, code: err.code ?? 'ERROR', message: err.message }
    }
    return { ok: false, code: 'ERROR', message: 'Something went wrong. Please try again.' }
  }
}

/** Accept an incoming request — opens a conversation. */
export async function acceptRequest(id: string): Promise<void> {
  await serverApiFetch(`/api/connections/requests/${id}/accept`, { method: 'POST' })
}

/** Decline an incoming request. */
export async function declineRequest(id: string): Promise<void> {
  await serverApiFetch(`/api/connections/requests/${id}/decline`, { method: 'POST' })
}
