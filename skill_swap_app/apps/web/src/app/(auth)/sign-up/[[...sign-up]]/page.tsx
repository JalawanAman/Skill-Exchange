import { SignUp } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SignUpPage() {
  // Already signed in? Don't show a blank auth page — go to the dashboard.
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp fallbackRedirectUrl="/onboarding" />
    </main>
  )
}
