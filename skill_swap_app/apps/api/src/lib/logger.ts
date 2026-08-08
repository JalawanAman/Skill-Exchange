import { lt } from 'drizzle-orm'
import { db } from '../db'
import { logs } from '../db/schema'
import { generateId } from './ids'

/**
 * Application logger.
 *
 * Every call writes to TWO places:
 *   1. The console  → visible in Railway's live log viewer (at-a-glance).
 *   2. The `logs` table in Neon → durable + queryable. Read with `pnpm logs`,
 *      or any `SELECT * FROM logs ORDER BY created_at DESC`.
 *
 * Retention: a rolling 7-day window. Old rows are swept out as new logs arrive
 * (the sweep is throttled so we are not issuing a DELETE on literally every
 * write — the practical result is the table never holds anything older than a
 * week). Logging never throws: a failed DB write is reported to the console and
 * swallowed so it can never break a request.
 *
 * Usage:
 *   logger.info('user created', { source: 'webhook:clerk', requestId, context: { userId } })
 *   logger.exception('failed to insert user', err, { source: 'webhook:clerk', requestId })
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogOptions {
  /** where the log came from, e.g. 'webhook:clerk', 'http', 'api:users' */
  source?: string
  /** correlates all logs within a single request (set by requestLogger) */
  requestId?: string
  /** any structured detail — ids, payloads, counts, error objects, etc. */
  context?: Record<string, unknown>
}

const RETENTION_DAYS = 7
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000
const PURGE_THROTTLE_MS = 5 * 60 * 1000 // sweep at most once every 5 minutes
let lastPurge = 0

/** Turn an unknown thrown value into something safe + complete to store as JSON. */
function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  try {
    return { value: JSON.parse(JSON.stringify(err)) }
  } catch {
    return { value: String(err) }
  }
}

/** Delete everything older than the retention window (throttled, never throws). */
async function purgeOld(): Promise<void> {
  const now = Date.now()
  if (now - lastPurge < PURGE_THROTTLE_MS) return
  lastPurge = now
  try {
    await db.delete(logs).where(lt(logs.createdAt, new Date(now - RETENTION_MS)))
  } catch (err) {
    console.error('[logger] retention purge failed:', err)
  }
}

async function write(level: LogLevel, message: string, opts: LogOptions = {}): Promise<void> {
  // 1) Console → Railway log viewer
  const tag = `[${level.toUpperCase()}]${opts.source ? ` (${opts.source})` : ''}`
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  consoleFn(`${tag} ${message}`, opts.context ?? '')

  // 2) Database → durable + queryable
  try {
    await db.insert(logs).values({
      id: generateId('log'),
      level,
      source: opts.source ?? null,
      message,
      context: opts.context ?? null,
      requestId: opts.requestId ?? null,
    })
  } catch (err) {
    // Logging must never break the app.
    console.error('[logger] failed to persist log:', err)
  }

  // 3) Rolling 7-day retention (fire-and-forget, throttled)
  void purgeOld()
}

export const logger = {
  debug: (message: string, opts?: LogOptions) => write('debug', message, opts),
  info: (message: string, opts?: LogOptions) => write('info', message, opts),
  warn: (message: string, opts?: LogOptions) => write('warn', message, opts),
  error: (message: string, opts?: LogOptions) => write('error', message, opts),
  /** Log an error level entry with a thrown value's full detail (name/message/stack). */
  exception: (message: string, err: unknown, opts?: LogOptions) =>
    write('error', message, {
      ...opts,
      context: { ...(opts?.context ?? {}), error: serializeError(err) },
    }),
}
