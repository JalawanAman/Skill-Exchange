'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './actions'

type Skill = { id: string; name: string; category: string }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function OnboardingForm({ skills }: { skills: Skill[] }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [languages, setLanguages] = useState('')
  const [bio, setBio] = useState('')
  // Teach / Learn
  const [offerSkillId, setOfferSkillId] = useState('')
  const [proficiency, setProficiency] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate')
  const [wantSkillId, setWantSkillId] = useState('')
  const [levelTarget, setLevelTarget] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  // Availability
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  // Detect timezone client-side (avoids SSR hydration mismatch).
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  }, [])

  // Group skills by category for the dropdowns.
  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const s of skills) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return [...map.entries()]
  }, [skills])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!displayName.trim()) return setError('Please enter your display name.')
    if (!offerSkillId) return setError('Pick at least one skill you can teach.')
    if (!wantSkillId) return setError('Pick at least one skill you want to learn.')
    if (endTime <= startTime) return setError('Availability end time must be after the start time.')

    setSubmitting(true)
    try {
      await completeOnboarding({
        profile: {
          displayName: displayName.trim(),
          location: location.trim() || undefined,
          timezone,
          languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
          bio: bio.trim() || undefined,
        },
        offer: { skillId: offerSkillId, proficiency },
        want: { skillId: wantSkillId, levelTarget },
        availability: [{ dayOfWeek, startTime, endTime, timezone }],
      })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong saving your profile. Please try again.')
      setSubmitting(false)
    }
  }

  const SkillSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border px-3 py-2 text-gray-900"
    >
      <option value="">Select a skill…</option>
      {grouped.map(([category, list]) => (
        <optgroup key={category} label={category}>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Set up your profile</h1>
          <p className="mt-1 text-gray-500">A few quick details to get you matched and trading skills.</p>
        </div>

        {/* Profile */}
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">About you</h2>
          <Field label="Display name *">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" placeholder="Jalawan Aman Khan" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} className="input" placeholder="Karachi, PK" /></Field>
            <Field label="Timezone"><input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input" /></Field>
          </div>
          <Field label="Languages (comma-separated)"><input value={languages} onChange={(e) => setLanguages(e.target.value)} className="input" placeholder="en, ur" /></Field>
          <Field label="Short bio"><textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} className="input" placeholder="Python dev who wants to learn guitar" /></Field>
        </section>

        {/* Teach */}
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">A skill you can teach *</h2>
          <SkillSelect value={offerSkillId} onChange={setOfferSkillId} />
          <Field label="Your proficiency">
            <select value={proficiency} onChange={(e) => setProficiency(e.target.value as typeof proficiency)} className="input">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </Field>
        </section>

        {/* Learn */}
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">A skill you want to learn *</h2>
          <SkillSelect value={wantSkillId} onChange={setWantSkillId} />
          <Field label="Target level">
            <select value={levelTarget} onChange={(e) => setLevelTarget(e.target.value as typeof levelTarget)} className="input">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
        </section>

        {/* Availability */}
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">When are you available?</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Day">
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="input">
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="From"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" /></Field>
            <Field label="To"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" /></Field>
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Finish & go to dashboard'}
        </button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      {children}
    </label>
  )
}
