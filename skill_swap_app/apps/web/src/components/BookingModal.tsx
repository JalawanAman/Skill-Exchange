'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOfferedSkills, bookSessionAction, type OfferedSkill } from '@/app/(protected)/sessions/actions'

const DURATIONS = [30, 60, 90, 120] as const
const FORMATS = [
  { value: 'video', label: 'Video call' },
  { value: 'in-person', label: 'In person' },
  { value: 'async', label: 'Async' },
] as const

const creditsFor = (min: number) => Math.round(min / 6)

export default function BookingModal({
  teacherId,
  teacherName,
  conversationId,
  onClose,
}: {
  teacherId: string
  teacherName: string
  conversationId?: string
  onClose: () => void
}) {
  const router = useRouter()
  const [skillsList, setSkillsList] = useState<OfferedSkill[] | null>(null)
  const [skillId, setSkillId] = useState('')
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState<number>(60)
  const [format, setFormat] = useState<'video' | 'in-person' | 'async'>('video')
  const [meetingLink, setMeetingLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getOfferedSkills(teacherId).then((list) => {
      if (!active) return
      setSkillsList(list)
      if (list[0]) setSkillId(list[0].skillId)
    })
    return () => {
      active = false
    }
  }, [teacherId])

  async function submit() {
    setError(null)
    if (!skillId) return setError('Pick a skill.')
    if (!when) return setError('Pick a date and time.')
    const iso = new Date(when).toISOString()
    if (new Date(iso).valueOf() <= Date.now()) return setError('Choose a time in the future.')

    setSubmitting(true)
    const res = await bookSessionAction({
      teacherId,
      skillId,
      conversationId,
      scheduledAt: iso,
      durationMinutes: duration,
      format,
      meetingLink: meetingLink.trim() || undefined,
    })
    setSubmitting(false)
    if (res.ok) {
      router.push('/sessions')
    } else {
      setError(res.message)
    }
  }

  const cost = creditsFor(duration)
  const noSkills = skillsList !== null && skillsList.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Book a session with {teacherName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        {noSkills ? (
          <p className="text-sm text-gray-500">This person hasn’t listed any skills to teach yet.</p>
        ) : (
          <div className="space-y-4">
            <Field label="Skill">
              <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="input w-full">
                {(skillsList ?? []).map((s) => (
                  <option key={s.skillId} value={s.skillId}>{s.skillName}</option>
                ))}
              </select>
            </Field>

            <Field label="Date & time">
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="input w-full" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration">
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input w-full">
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </Field>
              <Field label="Format">
                <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="input w-full">
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            {format !== 'async' && (
              <Field label="Meeting link (optional)">
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/…"
                  className="input w-full"
                />
              </Field>
            )}

            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <span className="text-sm text-emerald-800">Cost (held in escrow)</span>
              <span className="font-semibold text-emerald-700">{cost} credits</span>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Booking…' : `Book & hold ${cost} credits`}
            </button>
            <p className="text-center text-xs text-gray-400">Credits are refunded if you cancel before the session.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}
