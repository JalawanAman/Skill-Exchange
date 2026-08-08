import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'

// neon-serverless talks to Neon over WebSockets; Node needs a WebSocket impl.
// (Edge / Node 22+ have a global WebSocket; `ws` covers the Node version on Railway.)
neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Connection Pool over WebSocket. Chosen over the neon-http driver because it
// supports interactive transactions (db.transaction) — required for atomic
// credit operations / escrow in M6+ — and fits Railway's persistent server.
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })

export type DB = typeof db
