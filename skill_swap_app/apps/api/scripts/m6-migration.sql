-- M6 — Session Booking schema migration
-- Adds session_status + session_format enums, escrow credit-tx types, and the
-- sessions table. Idempotent. Run once: psql "$DATABASE_URL" -f scripts/m6-migration.sql

-- Extend the credit-transaction type enum with escrow movements.
ALTER TYPE credit_tx_type ADD VALUE IF NOT EXISTS 'escrow_lock';
ALTER TYPE credit_tx_type ADD VALUE IF NOT EXISTS 'escrow_release';

-- Session lifecycle + format enums.
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('pending','confirmed','in_progress','completed','cancelled','disputed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE session_format AS ENUM ('video','in-person','async');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- sessions (booked skill swaps; credits held in escrow)
CREATE TABLE IF NOT EXISTS sessions (
  id                text PRIMARY KEY NOT NULL,
  teacher_id        text NOT NULL REFERENCES users(id),
  learner_id        text NOT NULL REFERENCES users(id),
  skill_id          text NOT NULL REFERENCES skills(id),
  conversation_id   text REFERENCES conversations(id),
  scheduled_at      timestamp NOT NULL,
  duration_minutes  integer NOT NULL CHECK (duration_minutes IN (30, 60, 90, 120)),
  format            session_format NOT NULL,
  meeting_link      text,
  credits_amount    integer NOT NULL,
  status            session_status NOT NULL DEFAULT 'pending',
  teacher_confirmed boolean NOT NULL DEFAULT false,
  learner_confirmed boolean NOT NULL DEFAULT false,
  cancelled_by      text REFERENCES users(id),
  cancel_reason     text,
  created_at        timestamp NOT NULL DEFAULT now(),
  updated_at        timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_sessions_booking UNIQUE (learner_id, teacher_id, skill_id, scheduled_at)
);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON sessions (teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_learner ON sessions (learner_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON sessions (scheduled_at);
