import { pgTable, text, integer, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])

export const creditTxTypeEnum = pgEnum('credit_tx_type', [
  'signup_bonus',
  'session_earn',
  'session_spend',
  'refund',
  'admin_adjustment',
])

// ─── M1: users ───────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),                          // Clerk user ID (clerk_...)
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  timezone: text('timezone').default('UTC'),
  role: userRoleEnum('role').default('user').notNull(),
  creditBalance: integer('credit_balance').default(20).notNull(), // 20 signup bonus (schema doc 04)
  isOnboarded: boolean('is_onboarded').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── M1: credit_transactions ─────────────────────────────────────────────────

export const creditTransactions = pgTable('credit_transactions', {
  id: text('id').primaryKey(),                          // nanoid generated
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: creditTxTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),                  // positive = earn, negative = spend
  balanceAfter: integer('balance_after').notNull(),
  description: text('description'),
  relatedSessionId: text('related_session_id'),         // nullable, filled in M6
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Types ───────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type CreditTransaction = typeof creditTransactions.$inferSelect
export type NewCreditTransaction = typeof creditTransactions.$inferInsert
