import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

type NavUser = { id: string; credits: number } | null

export default function Navbar({ user, pendingRequests = 0 }: { user: NavUser; pendingRequests?: number }) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">
          SkillSwap
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                {user.credits} credits
              </span>
              <Link href="/browse" className="text-sm text-gray-600 hover:text-gray-900">
                Browse
              </Link>
              <Link href="/messages" className="text-sm text-gray-600 hover:text-gray-900">
                Messages
              </Link>
              <Link href="/connections" className="relative text-sm text-gray-600 hover:text-gray-900">
                Requests
                {pendingRequests > 0 && (
                  <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {pendingRequests > 9 ? '9+' : pendingRequests}
                  </span>
                )}
              </Link>
              <Link href={`/profile/${user.id}`} className="text-sm text-gray-600 hover:text-gray-900">
                My profile
              </Link>
              <Link href="/profile/edit" className="text-sm text-gray-600 hover:text-gray-900">
                Edit
              </Link>
            </>
          )}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  )
}
