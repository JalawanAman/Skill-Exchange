import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const { userId } = await auth()

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-gray-500 text-sm">Clerk User ID</p>
          <p className="font-mono text-gray-900 mt-1">{userId}</p>
        </div>
      </div>
    </main>
  )
}
