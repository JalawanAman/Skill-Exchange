import type { ReactNode } from 'react'
import { serverApiFetch } from '@/lib/api-server'
import Navbar from '@/components/Navbar'

type MeResponse = { user: { id: string; creditBalance: number } }

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  let navUser: { id: string; credits: number } | null = null
  try {
    const { user } = await serverApiFetch<MeResponse>('/api/users/me')
    navUser = { id: user.id, credits: user.creditBalance }
  } catch {
    // No DB row yet (brand-new signup mid-webhook) — render the bar without user info.
  }

  // Pending connection-request count for the navbar badge — best-effort.
  let pendingRequests = 0
  if (navUser) {
    try {
      const { count } = await serverApiFetch<{ count: number }>('/api/connections/requests')
      pendingRequests = count
    } catch {
      pendingRequests = 0
    }
  }

  return (
    <>
      <Navbar user={navUser} pendingRequests={pendingRequests} />
      {children}
    </>
  )
}
