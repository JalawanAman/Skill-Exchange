'use server'

import { serverApiFetch } from '@/lib/api-server'

export type BrowseSkill = { skillId: string; skillName: string; category: string; proficiency: string }
export type BrowseUser = {
  id: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  location: string | null
  languages: string[]
  skillOffers: BrowseSkill[]
}

/** Search people by free text and/or skill category (server-side, token attached). */
export async function searchUsers(params: { q?: string; category?: string; offset?: number }): Promise<BrowseUser[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.category) sp.set('category', params.category)
  if (params.offset) sp.set('offset', String(params.offset))
  const data = await serverApiFetch<{ users: BrowseUser[] }>(`/api/users/search?${sp.toString()}`)
  return data.users
}
