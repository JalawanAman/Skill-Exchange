import { redirect } from 'next/navigation'
import { serverApiFetch, ApiError } from '@/lib/api-server'
import OnboardingForm from './OnboardingForm'

type MeResponse = { user: { isOnboarded: boolean } }
type SkillsResponse = { skills: { id: string; name: string; category: string }[] }

export default async function OnboardingPage() {
  // NOTE: redirect() throws internally, so it must be called OUTSIDE the try/catch.
  let alreadyOnboarded = false
  let unauthenticated = false

  try {
    const me = await serverApiFetch<MeResponse>('/api/users/me')
    alreadyOnboarded = me.user.isOnboarded
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) unauthenticated = true
    // 404 (no DB row yet) → let them onboard
  }

  if (unauthenticated) redirect('/sign-in')
  if (alreadyOnboarded) redirect('/dashboard')

  const { skills } = await serverApiFetch<SkillsResponse>('/api/skills')

  return <OnboardingForm skills={skills} />
}
