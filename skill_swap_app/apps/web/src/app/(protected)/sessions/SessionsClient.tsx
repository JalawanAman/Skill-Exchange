'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { acceptSessionAction, cancelSessionAction } from './actions'

type Party = { id: string; displayName: string | null; avatarUrl: string | null } | null

export type SessionRow = {
  id: string
  teacherId: string
  learnerId: string
  skillName: string | null
  scheduledAt: string
  durationMinutes: number
  format: 'video' | 'in-person' | 'async'
  meetingLink: string | null
  creditsAmount: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  teacher: Party
  learner: Party
}

type Tab = 'pending' | 'upcoming' | 'past'
const TABS: { key: Tab; label: string; match: (s: SessionRow) => boolean }[] = [
  { key: 'pending', label: 'Pending', match: (s) => s.status === 'pending' },
  { key: 'upcoming', label: 'Upcoming', match: (s) => s.status === 'confirmed' || s.status === 'in_progress' },
  { key: 'past', label: 'Past', match: (s) => s.status === 'completed' || s.status === 'cancelled' || s.status === 'disputed' },
]

export default function SessionsClient({ initial, meId }: { initial: SessionRow[]; meId: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [busy, setBusy] = useState<string | null>(null)

  const visible = initial.filter(TABS.find((t) => t.key === tab)!.match)

  async function onAccept(id: string) {
    setBusy(id)
    try {
      await acceptSessionAction(id)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function onCancel(id: string) {
    if (!confirm('Cancel this session? Any held credits are refunded.')) return
    setBusy(id)
    try {
      await cancelSessionAction(id)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border bg-white p-1">
        {TABS.map((t) => {
          const count = initial.filter(t.match).length
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label} {count > 0 && <span className={tab === t.key ? 'text-blue-100' : 'text-gray-400'}>({count})</span>}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-sm text-gray-500">
          No {tab} sessions.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <SessionCard key={s.id} s={s} meId={meId} busy={busy === s.id} onAccept={() => onAccept(s.id)} onCancel={() => onCancel(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

const STATUS_STYLE: Record<SessionRow['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
  disputed: 'bg-red-50 text-red-700',
}

function SessionCard({
  s,
  meId,
  busy,
  onAccept,
  onCancel,
}: {
  s: SessionRow
  meId: string
  busy: boolean
  onAccept: () => void
  onCancel: () => void
}) {
  const iAmTeacher = s.teacherId === meId
  const other = iAmTeacher ? s.learner : s.teacher
  const roleLabel = iAmTeacher ? 'You teach' : 'You learn'
  const when = new Date(s.scheduledAt)
  const canCancel = s.status === 'pending' || s.status === 'confirmed'

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{s.skillName ?? 'Skill'}</p>
          <p className="text-sm text-gray-500">
            {roleLabel} · with{' '}
            <Link href={`/profile/${other?.id ?? ''}`} className="text-blue-600 hover:underline">
              {other?.displayName ?? 'Unknown'}
            </Link>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[s.status]}`}>
          {s.status.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-y-1 text-sm text-gray-600 sm:grid-cols-4">
        <Meta label="When" value={when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} />
        <Meta label="Duration" value={`${s.durationMinutes} min`} />
        <Meta label="Format" value={s.format} />
        <Meta label="Credits" value={`${s.creditsAmount}`} />
      </div>

      {s.meetingLink && s.status === 'confirmed' && (
        <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Join link →
        </a>
      )}

      {(s.status === 'pending' || s.status === 'confirmed') && (
        <div className="mt-4 flex items-center gap-3 border-t pt-3 text-sm">
          {s.status === 'pending' && iAmTeacher && (
            <button
              onClick={onAccept}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Accept
            </button>
          )}
          {s.status === 'pending' && !iAmTeacher && (
            <span className="text-gray-400">Awaiting teacher’s acceptance…</span>
          )}
          {canCancel && (
            <button
              onClick={onCancel}
              disabled={busy}
              className="ml-auto text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              {s.status === 'pending' && iAmTeacher ? 'Decline' : 'Cancel'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="capitalize">{value}</p>
    </div>
  )
}
