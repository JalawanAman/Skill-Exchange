import { UserButton } from '@clerk/nextjs'
import { serverApiFetch, ApiError } from '@/lib/api-server'

type MeResponse = {
  user: {
    id: string
    email: string
    displayName: string | null
    avatarUrl: string | null
    creditBalance: number
    isOnboarded: boolean
    role: string
    createdAt: string
  }
}

export default async function DashboardPage() {
  let user: MeResponse['user'] | null = null
  let errorStatus: number | null = null

  try {
    const data = await serverApiFetch<MeResponse>('/api/users/me')
    user = data.user
  } catch (err) {
    errorStatus = err instanceof ApiError ? err.status : -1
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>

        {user ? (
          <div className="space-y-6">
            {/* Welcome + credit balance */}
            <div className="bg-white rounded-xl border p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Welcome back</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {user.displayName || user.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Credits</p>
                <p className="text-3xl font-bold text-emerald-600">{user.creditBalance}</p>
              </div>
            </div>

            {/* Profile details — straight from the API + database */}
            <div className="bg-white rounded-xl border divide-y">
              <Row label="Email" value={user.email} />
              <Row label="Display name" value={user.displayName ?? '—'} />
              <Row label="Onboarded" value={user.isOnboarded ? 'Yes' : 'Not yet'} />
              <Row label="Role" value={user.role} />
              <Row label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
              <Row label="User ID" value={user.id} mono />
            </div>

            <p className="text-xs text-gray-400">
              Live data from the API and database — not just the Clerk session.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-6">
            <p className="font-medium text-gray-900">Could not load your profile</p>
            <p className="mt-1 text-sm text-gray-500">
              {errorStatus === 401
                ? 'You appear to be signed out. Try signing in again.'
                : errorStatus === 404
                  ? 'Your account exists in Clerk but not yet in our database. The signup webhook may still be processing — refresh in a moment.'
                  : 'The API could not be reached. Please try again shortly.'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
