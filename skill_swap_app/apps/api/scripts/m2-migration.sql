-- M2 — Profiles & Onboarding schema migration
-- Adds users.location/languages + skills, skill_offers, skill_wants, availability.
-- Idempotent where Postgres allows. Run once: psql "$DATABASE_URL" -f scripts/m2-migration.sql

-- Enums
DO $$ BEGIN
  CREATE TYPE proficiency AS ENUM ('beginner','intermediate','expert');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE want_level AS ENUM ('beginner','intermediate','advanced');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- users: new M2 profile columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}';

-- skills (platform-seeded catalog)
CREATE TABLE IF NOT EXISTS skills (
  id          text PRIMARY KEY NOT NULL,
  name        text NOT NULL UNIQUE,
  category    text NOT NULL,
  slug        text NOT NULL UNIQUE,
  icon_name   text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills (category);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills (slug);

-- skill_offers (skills a user can teach)
CREATE TABLE IF NOT EXISTS skill_offers (
  id               text PRIMARY KEY NOT NULL,
  user_id          text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id         text NOT NULL REFERENCES skills(id),
  proficiency      proficiency NOT NULL,
  years_experience integer,
  description      text,
  is_verified      boolean NOT NULL DEFAULT false,
  created_at       timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_skill_offers_user_skill UNIQUE (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_skill_offers_user_id ON skill_offers (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_offers_skill_id ON skill_offers (skill_id);

-- skill_wants (skills a user wants to learn)
CREATE TABLE IF NOT EXISTS skill_wants (
  id           text PRIMARY KEY NOT NULL,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id     text NOT NULL REFERENCES skills(id),
  level_target want_level NOT NULL,
  notes        text,
  created_at   timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_skill_wants_user_skill UNIQUE (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_skill_wants_user_id ON skill_wants (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_wants_skill_id ON skill_wants (skill_id);

-- availability (weekly repeating slots)
CREATE TABLE IF NOT EXISTS availability (
  id          text PRIMARY KEY NOT NULL,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  timezone    text NOT NULL,
  created_at  timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_availability_slot UNIQUE (user_id, day_of_week, start_time)
);
CREATE INDEX IF NOT EXISTS idx_availability_user_id ON availability (user_id);
