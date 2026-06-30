'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { dismissMatch, refreshMatches, blockUser } from './actions'

export type MatchedSkill = {
  skillId: string
  skillName: string
  direction: 'i_teach_them' | 'they_teach_me'
}
export type Match = {
  id: string
  matchedUserId: string
  compatibilityScore: number
  matchedSkills: MatchedSkill[]
  sharedLanguages: string[]
  user: {
    id: string
    displayName: string | null
    avatarUrl: string | null
    location: string | null
  }
}

export default function MatchList({ initial }: { initial: Match[] }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const visible = initial.filter((m) => !dismissed.has(m.id))

  async function onDismiss(id: string) {
    setBusy(id)
    setDismissed((s) => new Set(s).add(id)) // optimistic
    try {
      await dismissMatch(id)
    } catch {
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function onBlock(match: Match) {
    if (!confirm(`Block ${match.user.displayName ?? 'this user'}? They'll disappear from your matches and browse.`)) return
    setBusy(match.id)
    setDismissed((s) => new Set(s).add(match.id))
    try {
      await blockUser(match.matchedUserId)
    } catch {
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    try {
      await refreshMatches()
      setDismissed(new Set())
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Your matches {visible.length > 0 && <span className="text-gray-400">({visible.length})</span>}
        </h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center">
          <p className="font-medium text-gray-900">No matches yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Matches appear when someone offers a skill you want to learn (and vice-versa). Add more skills, or{' '}
            <Link href="/browse" className="text-blue-600">browse people</Link> directly.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((m) => (
            <MatchCard key={m.id} match={m} busy={busy === m.id} onDismiss={() => onDismiss(m.id)} onBlock={() => onBlock(m)} />
          ))}
        </div>
      )}
    </section>
  )
}

function MatchCard({
  match,
  busy,
  onDismiss,
  onBlock,
}: {
  match: Match
  busy: boolean
  onDismiss: () => void
  onBlock: () => void
}) {
  const teach = match.matchedSkills.filter((s) => s.direction === 'i_teach_them')
  const learn = match.matchedSkills.filter((s) => s.direction === 'they_teach_me')
  const score = match.compatibilityScore
  const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-gray-500'

  return (
    <div className="flex flex-col rounded-xl border bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {match.user.avatarUrl ? (
            <img src={match.user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500">
              {(match.user.displayName ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{match.user.displayName ?? 'Unnamed'}</p>
            {match.user.location && <p className="text-xs text-gray-400">{match.user.location}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">match</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {learn.length > 0 && (
          <SkillLine label="They teach you" tone="emerald" skills={learn.map((s) => s.skillName)} />
        )}
        {teach.length > 0 && (
          <SkillLine label="You teach them" tone="blue" skills={teach.map((s) => s.skillName)} />
        )}
        {match.sharedLanguages.length > 0 && (
          <p className="text-xs text-gray-500">Shared language: {match.sharedLanguages.join(', ')}</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t pt-3 text-sm">
        <Link href={`/profile/${match.user.id}`} className="font-medium text-blue-600 hover:underline">
          View profile
        </Link>
        <button onClick={onDismiss} disabled={busy} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">
          Dismiss
        </button>
        <button onClick={onBlock} disabled={busy} className="ml-auto text-red-500 hover:text-red-700 disabled:opacity-50">
          Block
        </button>
      </div>
    </div>
  )
}

function SkillLine({ label, tone, skills }: { label: string; tone: 'emerald' | 'blue'; skills: string[] }) {
  const chip = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
  return (
    <div>
      <span className="text-xs text-gray-500">{label}: </span>
      {skills.map((s) => (
        <span key={s} className={`mr-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${chip}`}>
          {s}
        </span>
      ))}
    </div>
  )
}
