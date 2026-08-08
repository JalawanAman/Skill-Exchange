-- M3 — Skills, Matching & Browse schema migration
-- Adds the match_status enum + matches and blocks tables.
-- Idempotent where Postgres allows. Run once: psql "$DATABASE_URL" -f scripts/m3-migration.sql

-- Enums
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('active','dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- matches (result of the matching engine; directional — one row per viewer→candidate)
CREATE TABLE IF NOT EXISTS matches (
  id                  text PRIMARY KEY NOT NULL,
  user_id             text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score integer NOT NULL,
  score_breakdown     jsonb,
  matched_skills      jsonb NOT NULL DEFAULT '[]',
  shared_languages    text[] NOT NULL DEFAULT '{}',
  status              match_status NOT NULL DEFAULT 'active',
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_matches_pair UNIQUE (user_id, matched_user_id)
);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches (user_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches (compatibility_score);

-- blocks (excluded from matching + browse, both directions)
CREATE TABLE IF NOT EXISTS blocks (
  id          text PRIMARY KEY NOT NULL,
  blocker_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_blocks_pair UNIQUE (blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks (blocked_id);
