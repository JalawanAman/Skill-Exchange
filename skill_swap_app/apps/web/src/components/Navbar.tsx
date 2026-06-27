import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

type NavUser = { id: string; credits: number } | null

export default function Navbar({ user }: { user: NavUser }) {
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
