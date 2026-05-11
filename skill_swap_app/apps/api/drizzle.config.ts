import type { Config } from 'drizzle-kit'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = readFileSync(resolve('.env'), 'utf-8')
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: { connectionString: dbUrl! },
} satisfies Config
