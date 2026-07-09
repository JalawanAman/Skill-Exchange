-- M7 — Session Completion & Credit Transfer schema migration
-- Adds the teacher-payout credit-tx type. Idempotent.
-- Run once: psql "$DATABASE_URL" -f scripts/m7-migration.sql
--
-- Money model (do not double-charge): the learner was already debited at booking
-- via M6 'escrow_lock' (−credits). Completion only CREDITS the teacher with a
-- 'session_earning' tx (+credits). Net book→complete: learner −N, teacher +N.
ALTER TYPE credit_tx_type ADD VALUE IF NOT EXISTS 'session_earning';
