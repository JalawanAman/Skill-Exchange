import type { ReactNode } from 'react'
import Link from 'next/link'
import { serverApiFetch, ApiError } from '@/lib/api-server'

type SkillOffer = {
  id: string
  skillName: string
  category: string
  proficiency: string
  yearsExperience: number | null
  description: string | null
}
type SkillWant = { id: string; skillName: string; category: string; levelTarget: string; notes: string | null }
type ProfileResponse = {
  user: {
    id: string
    username: string | null
    displayName: string | null
    avatarUrl: string | null
    bio: string | null
    location: string | null
    timezone: string | null
    languages: string[]
    createdAt: string
    skillOffers: SkillOffer[]
    skillWants: SkillWant[]
  }
}

export default async function ProfilePage({ params }: { params: { id: string } }) {
  let user: ProfileResponse['user'] | null = null
  let status = 0

  try {
    const data = await serverApiFetch<ProfileResponse>(`/api/users/${params.id}`)
    user = data.user
  } catch (err) {
    status = err instanceof ApiError ? err.status : -1
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6">
          <p className="font-medium text-gray-900">
            {status === 404 ? 'Profile not found' : 'Could not load this profile'}
          </p>
          <Link href="/dashboard" className="mt-2 inline-block text-sm text-blue-600">← Back to dashboard</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 rounded-xl border bg-white p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold text-gray-500">
              {(user.displayName ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.displayName ?? 'Unnamed'}</h1>
            <p className="text-sm text-gray-500">
              {[user.location, user.timezone].filter(Boolean).join(' · ') || 'No location set'}
            </p>
            {user.languages.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">Speaks: {user.languages.join(', ')}</p>
            )}
          </div>
        </div>

        {user.bio && <p className="rounded-xl border bg-white p-6 text-gray-700">{user.bio}</p>}

        {/* Teaches */}
        <SkillBlock title="Can teach" empty="No skills offered yet.">
          {user.skillOffers.map((o) => (
            <Row key={o.id} name={o.skillName} category={o.category} tag={o.proficiency} note={o.description} />
          ))}
        </SkillBlock>

        {/* Wants */}
        <SkillBlock title="Wants to learn" empty="No learning goals yet.">
          {user.skillWants.map((w) => (
            <Row key={w.id} name={w.skillName} category={w.category} tag={w.levelTarget} note={w.notes} />
          ))}
        </SkillBlock>

        <Link href="/dashboard" className="inline-block text-sm text-blue-600">← Back to dashboard</Link>
      </div>
    </main>
  )
}

function SkillBlock({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  const hasItems = items.some(Boolean)
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-3 font-semibold text-gray-900">{title}</h2>
      {hasItems ? <div className="divide-y">{children}</div> : <p className="text-sm text-gray-400">{empty}</p>}
    </div>
  )
}

function Row({ name, category, tag, note }: { name: string; category: string; tag: string; note: string | null }) {
  return (
    <div className="flex items-start justify-between py-3">
      <div>
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-400">{category}</p>
        {note && <p className="mt-1 text-sm text-gray-600">{note}</p>}
      </div>
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize text-gray-600">{tag}</span>
    </div>
  )
}
