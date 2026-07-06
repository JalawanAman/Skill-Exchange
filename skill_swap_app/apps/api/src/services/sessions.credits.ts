/**
 * M6 pure session/credit logic — no DB, fully unit-testable (gate M6-Q03).
 *
 * Credits: 10 per hour → duration_minutes / 6. Escrow is modelled as a balance
 * reduction on booking and a matching refund on cancel (see sessions.service).
 */

export const VALID_DURATIONS = [30, 60, 90, 120] as const
export type Duration = (typeof VALID_DURATIONS)[number]

export const VALID_FORMATS = ['video', 'in-person', 'async'] as const
export type SessionFormat = (typeof VALID_FORMATS)[number]

export type SessionStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

/** Credits for a session: 10 per hour (duration_minutes / 6). */
export function computeCredits(durationMinutes: number): number {
  return Math.round(durationMinutes / 6)
}

export type BookingInput = {
  scheduledAt: Date
  durationMinutes: number
  format: string
}

export type ValidationResult = { ok: true } | { ok: false; code: string; message: string }

/** Validate a booking request against static rules (not credits/DB). */
export function validateBooking(input: BookingInput, now: Date): ValidationResult {
  if (!VALID_DURATIONS.includes(input.durationMinutes as Duration)) {
    return { ok: false, code: 'INVALID_DURATION', message: 'Duration must be 30, 60, 90, or 120 minutes.' }
  }
  if (!VALID_FORMATS.includes(input.format as SessionFormat)) {
    return { ok: false, code: 'INVALID_FORMAT', message: 'Format must be video, in-person, or async.' }
  }
  if (!(input.scheduledAt instanceof Date) || Number.isNaN(input.scheduledAt.valueOf())) {
    return { ok: false, code: 'INVALID_TIME', message: 'Invalid date/time.' }
  }
  if (input.scheduledAt.valueOf() <= now.valueOf()) {
    return { ok: false, code: 'PAST_TIME', message: 'Session must be scheduled in the future.' }
  }
  return { ok: true }
}

/** Does the learner have enough spendable credits to book? */
export function hasSufficientCredits(balance: number, cost: number): boolean {
  return balance >= cost
}

// Allowed status transitions. Cancellation refunds credits; completion is M7.
const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'completed'],
  in_progress: ['completed', 'disputed'],
  completed: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
}

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/** A session can be cancelled (with refund) only before it happens. */
export function canCancel(status: SessionStatus): boolean {
  return status === 'pending' || status === 'confirmed'
}
