import { serverApiFetch } from '@/lib/api-server'
import BrowseClient from './BrowseClient'

type Skill = { id: string; name: string; category: string }

export default async function BrowsePage() {
  // Category list for the filter — derived from the skill catalog.
  let categories: string[] = []
  try {
    const data = await serverApiFetch<{ skills: Skill[] }>('/api/skills')
    categories = [...new Set(data.skills.map((s) => s.category))].sort()
  } catch {
    categories = []
  }

  return <BrowseClient categories={categories} />
}
