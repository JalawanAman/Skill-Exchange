import { redirect } from 'next/navigation'
import { serverApiFetch, ApiError } from '@/lib/api-server'
import EditProfileForm from './EditProfileForm'

type Offer = { id: string; skillName: string; proficiency: string }
type Want = { id: string; skillName: string; levelTarget: string }
type MeResponse = {
  user: {
    displayName: string | null
    location: string | null
    timezone: string | null
    languages: string[]
    bio: string | null
    skillOffers: Offer[]
    skillWants: Want[]
  }
}
type SkillsResponse = { skills: { id: string; name: string; category: string }[] }

export default async function EditProfilePage() {
  let me: MeResponse['user'] | null = null
  let unauthenticated = false

  try {
    me = (await serverApiFetch<MeResponse>('/api/users/me')).user
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) unauthenticated = true
  }

  if (unauthenticated) redirect('/sign-in')
  if (!me) {
    return <main className="min-h-screen bg-gray-50 p-8 text-gray-700">Could not load your profile.</main>
  }

  const { skills } = await serverApiFetch<SkillsResponse>('/api/skills')

  return <EditProfileForm me={me} skills={skills} />
}
