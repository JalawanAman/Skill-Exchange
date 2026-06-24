import 'dotenv/config'
import { desc, eq } from 'drizzle-orm'
import { db } from '../src/db'
import { logs } from '../src/db/schema'

/**
 * Read recent application logs from the database.
 *
 *   pnpm logs              → last 50 logs (oldest → newest, tail-style)
 *   pnpm logs 100          → last 100
 *   pnpm logs error        → last 50 errors only
 *   pnpm logs warn 200     → last 200 warnings
 *
 * (Or just query directly: SELECT * FROM logs ORDER BY created_at DESC LIMIT 50;)
 */

const LEVELS = ['debug', 'info', 'warn', 'error'] as const
type Level = (typeof LEVELS)[number]

function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value)
}

async function main(): Promise<void> {
  let level: Level | undefined
  let limit = 50

  for (const arg of process.argv.slice(2)) {
    if (isLevel(arg)) level = arg
    else if (/^\d+$/.test(arg)) limit = Number(arg)
  }

  const rows = await db
    .select()
    .from(logs)
    .where(level ? eq(logs.level, level) : undefined)
    .orderBy(desc(logs.createdAt))
    .limit(limit)

  // Reverse so newest prints at the bottom (like `tail`).
  for (const row of rows.reverse()) {
    const ts = row.createdAt.toISOString().replace('T', ' ').replace('Z', '')
    const src = row.source ? ` (${row.source})` : ''
    const rid = row.requestId ? ` {${row.requestId.slice(0, 8)}}` : ''
    const ctx = row.context ? `\n    ${JSON.stringify(row.context)}` : ''
    console.log(`${ts}  ${row.level.toUpperCase().padEnd(5)}${src}${rid}  ${row.message}${ctx}`)
  }

  console.log(`\n— ${rows.length} log(s)${level ? ` at level "${level}"` : ''} —`)
  process.exit(0)
}

main().catch((err) => {
  console.error('failed to read logs:', err)
  process.exit(1)
})
