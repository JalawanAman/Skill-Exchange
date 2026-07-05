-- M5 — Real-Time Chat schema migration
-- Adds the message_type enum + messages table.
-- Idempotent. Run once: psql "$DATABASE_URL" -f scripts/m5-migration.sql

-- Enum for a message's kind.
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text','image','file','system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- messages (chat history; real-time delivery via socket.io)
CREATE TABLE IF NOT EXISTS messages (
  id               text PRIMARY KEY NOT NULL,
  conversation_id  text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        text NOT NULL REFERENCES users(id),
  content          text NOT NULL,
  message_type     message_type NOT NULL DEFAULT 'text',
  file_url         text,
  is_read          boolean NOT NULL DEFAULT false,
  read_at          timestamp,
  created_at       timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
