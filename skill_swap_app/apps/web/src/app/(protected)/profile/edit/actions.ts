'use server'

import { serverApiFetch } from '@/lib/api-server'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function updateProfile(profile: {
  displayName?: string
  location?: string
  timezone?: string
  languages?: string[]
  bio?: string
}): Promise<void> {
  await serverApiFetch('/api/users/me', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(profile) })
}

export async function addOffer(input: { skillId: string; proficiency: string }): Promise<void> {
  await serverApiFetch('/api/skills/offers', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) })
}

export async function removeOffer(id: string): Promise<void> {
  await serverApiFetch(`/api/skills/offers/${id}`, { method: 'DELETE' })
}

export async function addWant(input: { skillId: string; levelTarget: string }): Promise<void> {
  await serverApiFetch('/api/skills/wants', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) })
}

export async function removeWant(id: string): Promise<void> {
  await serverApiFetch(`/api/skills/wants/${id}`, { method: 'DELETE' })
}

export async function updateAvatar(avatarUrl: string): Promise<void> {
  await serverApiFetch('/api/users/me', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ avatarUrl }) })
}
