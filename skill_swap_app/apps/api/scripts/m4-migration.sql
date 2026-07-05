-- M4 — Connections schema migration
-- Adds 'connected' to match_status, the connection_status enum, and the
-- connection_requests + conversations tables.
-- Idempotent. Run once: psql "$DATABASE_URL" -f scripts/m4-migration.sql

-- Extend the M3 match_status enum with 'connected' (set when a pair connects).
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'connected';

-- Enum for a connection request's lifecycle.
DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM ('pending','accepted','declined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- connection_requests (from_user asks to connect with to_user)
CREATE TABLE IF NOT EXISTS connection_requests (
  id            text PRIMARY KEY NOT NULL,
  from_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message       text,
  status        connection_status NOT NULL DEFAULT 'pending',
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_conn_req_pair UNIQUE (from_user_id, to_user_id)
);
CREATE INDEX IF NOT EXISTS idx_conn_req_to_user ON connection_requests (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_conn_req_from_user ON connection_requests (from_user_id, created_at);

-- conversations (one per connected pair; participant_a < participant_b, canonicalized in app)
CREATE TABLE IF NOT EXISTS conversations (
  id              text PRIMARY KEY NOT NULL,
  participant_a   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_b   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at timestamp,
  created_at      timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_conversations_pair UNIQUE (participant_a, participant_b)
);
CREATE INDEX IF NOT EXISTS idx_conv_participant_a ON conversations (participant_a, last_message_at);
CREATE INDEX IF NOT EXISTS idx_conv_participant_b ON conversations (participant_b, last_message_at);
