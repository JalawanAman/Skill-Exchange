import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  boolean,
  jsonb,
  index,
  time,
  unique,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])

export const logLevelEnum = pgEnum('log_level', ['debug', 'info', 'warn', 'error'])

export const creditTxTypeEnum = pgEnum('credit_tx_type', [
  'signup_bonus',
  'session_earn',
  'session_spend',
  'refund',
  'admin_adjustment',
])

// M2: skill proficiency (offers) and target level (wants)
export const proficiencyEnum = pgEnum('proficiency', ['beginner', 'intermediate', 'expert'])
export const wantLevelEnum = pgEnum('want_level', ['beginner', 'intermediate', 'advanced'])

// ─── M1: users ───────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),                          // Clerk user ID (clerk_...)
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  location: text('location'),                           // M2: city / country (optional)
  languages: text('languages').array().notNull().default([]), // M2: e.g. ['en','ur']
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

// ─── Observability: logs (rolling 7-day retention, see lib/logger.ts) ─────────

export const logs = pgTable(
  'logs',
  {
    id: text('id').primaryKey(),                          // log_...
    level: logLevelEnum('level').notNull(),
    source: text('source'),                               // e.g. 'webhook:clerk', 'http', 'api:users'
    message: text('message').notNull(),
    context: jsonb('context'),                            // arbitrary structured detail (errors, payloads, ids)
    requestId: text('request_id'),                        // correlates all logs within one request
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index('logs_created_at_idx').on(t.createdAt),  // fast recent-reads + retention purge
    levelIdx: index('logs_level_idx').on(t.level),
  })
)

// ─── M2: skills catalog ───────────────────────────────────────────────────────

// Master skill catalog (platform-seeded, not user-created).
export const skills = pgTable(
  'skills',
  {
    id: text('id').primaryKey(),                          // skill_...
    name: text('name').notNull().unique(),                // e.g. "Python", "Guitar"
    category: text('category').notNull(),                 // e.g. "Tech", "Music", "Language"
    slug: text('slug').notNull().unique(),                // e.g. "python"
    iconName: text('icon_name'),                          // icon identifier for UI
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    categoryIdx: index('idx_skills_category').on(t.category),
    slugIdx: index('idx_skills_slug').on(t.slug),
  })
)

// ─── M2: skill_offers (skills a user can teach) ───────────────────────────────

export const skillOffers = pgTable(
  'skill_offers',
  {
    id: text('id').primaryKey(),                          // sko_...
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull().references(() => skills.id),
    proficiency: proficiencyEnum('proficiency').notNull(),
    yearsExperience: integer('years_experience'),
    description: text('description'),                     // optional: how/what they teach
    isVerified: boolean('is_verified').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_skill_offers_user_id').on(t.userId),
    skillIdx: index('idx_skill_offers_skill_id').on(t.skillId),
    userSkillUnique: unique('uq_skill_offers_user_skill').on(t.userId, t.skillId),
  })
)

// ─── M2: skill_wants (skills a user wants to learn) ───────────────────────────

export const skillWants = pgTable(
  'skill_wants',
  {
    id: text('id').primaryKey(),                          // skw_...
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull().references(() => skills.id),
    levelTarget: wantLevelEnum('level_target').notNull(),
    notes: text('notes'),                                // optional: what specifically to learn
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_skill_wants_user_id').on(t.userId),
    skillIdx: index('idx_skill_wants_skill_id').on(t.skillId),
    userSkillUnique: unique('uq_skill_wants_user_skill').on(t.userId, t.skillId),
  })
)

// ─── M2: availability (weekly repeating slots) ────────────────────────────────

export const availability = pgTable(
  'availability',
  {
    id: text('id').primaryKey(),                          // avl_...
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),          // 0=Sun .. 6=Sat (validated in app)
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    timezone: text('timezone').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_availability_user_id').on(t.userId),
    slotUnique: unique('uq_availability_slot').on(t.userId, t.dayOfWeek, t.startTime),
  })
)

// ─── Types ───────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type CreditTransaction = typeof creditTransactions.$inferSelect
export type NewCreditTransaction = typeof creditTransactions.$inferInsert
export type Log = typeof logs.$inferSelect
export type NewLog = typeof logs.$inferInsert
export type Skill = typeof skills.$inferSelect
export type NewSkill = typeof skills.$inferInsert
export type SkillOffer = typeof skillOffers.$inferSelect
export type NewSkillOffer = typeof skillOffers.$inferInsert
export type SkillWant = typeof skillWants.$inferSelect
export type NewSkillWant = typeof skillWants.$inferInsert
export type Availability = typeof availability.$inferSelect
export type NewAvailability = typeof availability.$inferInsert
