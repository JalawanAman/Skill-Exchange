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

  return (
    <>
      <Navbar user={navUser} />
      {children}
    </>
  )
}
