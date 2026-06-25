'use server'

import { serverApiFetch } from '@/lib/api-server'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type OnboardingPayload = {
  profile: {
    displayName: string
    location?: string
    timezone: string
    languages: string[]
    bio?: string
  }
  offer: { skillId: string; proficiency: 'beginner' | 'intermediate' | 'expert'; yearsExperience?: number }
  want: { skillId: string; levelTarget: 'beginner' | 'intermediate' | 'advanced' }
  availability: { dayOfWeek: number; startTime: string; endTime: string; timezone: string }[]
}

/**
 * Completes onboarding server-side (no CORS, token attached automatically):
 * profile → skill offer → skill want → availability → mark onboarded.
 */
export async function completeOnboarding(payload: OnboardingPayload): Promise<{ ok: true }> {
  await serverApiFetch('/api/users/me', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload.profile),
  })
  await serverApiFetch('/api/skills/offers', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload.offer),
  })
  await serverApiFetch('/api/skills/wants', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload.want),
  })
  await serverApiFetch('/api/availability', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ slots: payload.availability }),
  })
  await serverApiFetch('/api/users/me', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ isOnboarded: true }),
  })
  return { ok: true }
}
