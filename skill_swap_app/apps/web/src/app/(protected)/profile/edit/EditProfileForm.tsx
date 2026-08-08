'use client'

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateProfile, addOffer, removeOffer, addWant, removeWant, updateAvatar } from './actions'

type Offer = { id: string; skillName: string; proficiency: string }
type Want = { id: string; skillName: string; levelTarget: string }
type Skill = { id: string; name: string; category: string }
type Me = {
  avatarUrl: string | null
  displayName: string | null
  location: string | null
  timezone: string | null
  languages: string[]
  bio: string | null
  skillOffers: Offer[]
  skillWants: Want[]
}

export default function EditProfileForm({ me, skills }: { me: Me; skills: Skill[] }) {
  const router = useRouter()

  const [displayName, setDisplayName] = useState(me.displayName ?? '')
  const [location, setLocation] = useState(me.location ?? '')
  const [timezone, setTimezone] = useState(me.timezone ?? 'UTC')
  const [languages, setLanguages] = useState((me.languages ?? []).join(', '))
  const [bio, setBio] = useState(me.bio ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  const cloudinaryReady = Boolean(cloudName && cloudName !== 'your_cloud_name' && uploadPreset)

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!cloudinaryReady) {
      setMsg('Photo upload needs Cloudinary configured (env vars).')
      return
    }
    setUploading(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', uploadPreset as string)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.secure_url) throw new Error('no url')
      await updateAvatar(data.secure_url as string)
      setMsg('Photo updated.')
      router.refresh()
    } catch {
      setMsg('Photo upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  const [newOfferSkill, setNewOfferSkill] = useState('')
  const [newOfferProf, setNewOfferProf] = useState('intermediate')
  const [newWantSkill, setNewWantSkill] = useState('')
  const [newWantLevel, setNewWantLevel] = useState('beginner')

  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const s of skills) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return [...map.entries()]
  }, [skills])

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setMsg(null)
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        location: location.trim() || undefined,
        timezone: timezone.trim() || undefined,
        languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
        bio: bio.trim() || undefined,
      })
      setMsg('Profile saved.')
      router.refresh()
    } catch {
      setMsg('Save failed — please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
      router.refresh()
    } catch {
      setMsg('That action failed — maybe a duplicate skill?')
    } finally {
      setBusy(false)
    }
  }

  const SkillSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">Select a skill…</option>
      {grouped.map(([category, list]) => (
        <optgroup key={category} label={category}>
          {list.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Edit profile</h1>
          <Link href="/dashboard" className="text-sm text-blue-600">← Dashboard</Link>
        </div>

        {msg && <p className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700">{msg}</p>}

        {/* Photo */}
        <div className="flex items-center gap-4 rounded-xl border bg-white p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-400">?</div>
          )}
          <div>
            <label className="cursor-pointer text-sm font-medium text-blue-600">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" onChange={handlePhoto} disabled={uploading || !cloudinaryReady} className="hidden" />
            </label>
            {!cloudinaryReady && <p className="text-xs text-gray-400">Set Cloudinary env vars to enable.</p>}
          </div>
        </div>

        {/* Profile fields */}
        <form onSubmit={saveProfile} className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">About you</h2>
          <label className="block"><span className="mb-1 block text-sm text-gray-600">Display name</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="mb-1 block text-sm text-gray-600">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" /></label>
            <label className="block"><span className="mb-1 block text-sm text-gray-600">Timezone</span>
              <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input" /></label>
          </div>
          <label className="block"><span className="mb-1 block text-sm text-gray-600">Languages (comma-separated)</span>
            <input value={languages} onChange={(e) => setLanguages(e.target.value)} className="input" /></label>
          <label className="block"><span className="mb-1 block text-sm text-gray-600">Bio</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} className="input" /></label>
          <button type="submit" disabled={savingProfile} className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50">
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        {/* Offers */}
        <div className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">Skills you teach</h2>
          <div className="divide-y">
            {me.skillOffers.length === 0 && <p className="text-sm text-gray-400">None yet.</p>}
            {me.skillOffers.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2">
                <span className="text-gray-900">{o.skillName} <span className="text-xs capitalize text-gray-400">· {o.proficiency}</span></span>
                <button disabled={busy} onClick={() => run(() => removeOffer(o.id))} className="text-sm text-red-600 disabled:opacity-50">Remove</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <SkillSelect value={newOfferSkill} onChange={setNewOfferSkill} />
            <select value={newOfferProf} onChange={(e) => setNewOfferProf(e.target.value)} className="input w-40">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
            <button
              disabled={busy || !newOfferSkill}
              onClick={() => run(async () => { await addOffer({ skillId: newOfferSkill, proficiency: newOfferProf }); setNewOfferSkill('') })}
              className="rounded-lg bg-gray-900 px-4 text-white disabled:opacity-50"
            >Add</button>
          </div>
        </div>

        {/* Wants */}
        <div className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold text-gray-900">Skills you want to learn</h2>
          <div className="divide-y">
            {me.skillWants.length === 0 && <p className="text-sm text-gray-400">None yet.</p>}
            {me.skillWants.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2">
                <span className="text-gray-900">{w.skillName} <span className="text-xs capitalize text-gray-400">· {w.levelTarget}</span></span>
                <button disabled={busy} onClick={() => run(() => removeWant(w.id))} className="text-sm text-red-600 disabled:opacity-50">Remove</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <SkillSelect value={newWantSkill} onChange={setNewWantSkill} />
            <select value={newWantLevel} onChange={(e) => setNewWantLevel(e.target.value)} className="input w-40">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button
              disabled={busy || !newWantSkill}
              onClick={() => run(async () => { await addWant({ skillId: newWantSkill, levelTarget: newWantLevel }); setNewWantSkill('') })}
              className="rounded-lg bg-gray-900 px-4 text-white disabled:opacity-50"
            >Add</button>
          </div>
        </div>
      </div>
    </main>
  )
}
