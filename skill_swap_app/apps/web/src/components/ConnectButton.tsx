'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sendConnectionRequest } from '@/app/(protected)/connections/actions'

type State = 'idle' | 'sending' | 'sent' | 'pending' | 'connected' | 'incoming' | 'limit' | 'error'

// How each API result code maps to a resting button state.
const CODE_STATE: Record<string, State> = {
  DUPLICATE_REQUEST: 'pending',
  ALREADY_CONNECTED: 'connected',
  INCOMING_EXISTS: 'incoming',
  CONNECTION_LIMIT: 'limit',
}

export default function ConnectButton({
  userId,
  initialState = 'idle',
  className = '',
}: {
  userId: string
  initialState?: 'idle' | 'pending' | 'connected'
  className?: string
}) {
  const [state, setState] = useState<State>(initialState)

  async function onConnect() {
    setState('sending')
    const res = await sendConnectionRequest(userId)
    if (res.ok) {
      setState('sent')
    } else {
      setState(CODE_STATE[res.code] ?? 'error')
    }
  }

  const base = `inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition ${className}`

  if (state === 'connected') {
    return <span className={`${base} bg-emerald-50 text-emerald-700`}>Connected</span>
  }
  if (state === 'sent' || state === 'pending') {
    return <span className={`${base} bg-gray-100 text-gray-500`}>Request pending</span>
  }
  if (state === 'incoming') {
    return (
      <Link href="/connections" className={`${base} bg-blue-50 text-blue-700 hover:bg-blue-100`}>
        Respond to request
      </Link>
    )
  }
  if (state === 'limit') {
    return <span className={`${base} bg-amber-50 text-amber-700`} title="Free accounts can send 5 requests per week">Weekly limit reached</span>
  }

  return (
    <button
      onClick={onConnect}
      disabled={state === 'sending'}
      className={`${base} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`}
    >
      {state === 'sending' ? 'Sending…' : state === 'error' ? 'Retry' : 'Connect'}
    </button>
  )
}
