'use server'

import { serverApiFetch, ApiError } from '@/lib/api-server'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type OfferedSkill = { skillId: string; skillName: string }

/** The skills a user teaches — used to populate the booking modal. */
export async function getOfferedSkills(userId: string): Promise<OfferedSkill[]> {
  try {
    const { user } = await serverApiFetch<{ user: { skillOffers: OfferedSkill[] } }>(`/api/users/${userId}`)
    return (user.skillOffers ?? []).map((o) => ({ skillId: o.skillId, skillName: o.skillName }))
  } catch {
    return []
  }
}

export type BookInput = {
  teacherId: string
  skillId: string
  conversationId?: string
  scheduledAt: string // ISO
  durationMinutes: number
  format: 'video' | 'in-person' | 'async'
  meetingLink?: string
}

export type BookResult = { ok: true; sessionId: string } | { ok: false; code: string; message: string }

/** Book a session — never throws; returns a tagged result so the modal can show errors. */
export async function bookSessionAction(input: BookInput): Promise<BookResult> {
  try {
    const { session } = await serverApiFetch<{ session: { id: string } }>('/api/sessions', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    })
    return { ok: true, sessionId: session.id }
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, code: err.code ?? 'ERROR', message: err.message }
    return { ok: false, code: 'ERROR', message: 'Something went wrong. Please try again.' }
  }
}

/** Teacher accepts a pending session. */
export async function acceptSessionAction(id: string): Promise<void> {
  await serverApiFetch(`/api/sessions/${id}/accept`, { method: 'POST' })
}

/** Either party cancels (refunds the learner). */
export async function cancelSessionAction(id: string, reason?: string): Promise<void> {
  await serverApiFetch(`/api/sessions/${id}/cancel`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ reason }),
  })
}
