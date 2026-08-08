# Build Progress

**Founder:** Jalawan Aman Khan  
**Last updated:** 2026-07-07  
**Current phase:** M6 — Session Booking ✅ built & deployed (credit escrow proven via integration tests; live booking verified) · M7 next

> **Testing note:** We're building **feature-first** — functionality now, deep
> testing + UI polish later. "Done" below means **built, deployed, and
> smoke-verified** (happy path + data persistence checked), **not** thoroughly
> QA'd or edge-tested. Treat gate ticks as "implemented & working in a basic run."

---

## Overall Status

```
[■■■■■■■■■■] M1 · M2 · M3 · M4 · M5 · M6 built & deployed (credit escrow live) · M7 next
```

| Milestone | Status | Notes |
|---|---|---|
| M1 — Auth & Setup | ✅ Done (gate green) | Full auth + backend live |
| M2 — Profiles & Onboarding | ✅ Built & deployed | Functional; deep QA/polish deferred |
| Architecture hardening | ✅ Done | Text-ID convention documented; neon-serverless transactions |
| M3 — Skills, Matching & Browse | ✅ Built & deployed | Matching engine live; AI skill-tags deferred |
| M4 — Connections | ✅ Built & deployed | Requests/accept/decline + conversations; chat UI is M5 |
| M5 — Real-Time Chat | ✅ Built & deployed | Live 2-way chat verified; image upload + block/report done |
| M6 — Session Booking | ✅ Built & deployed | Book from chat + credit escrow; 39 tests green, live-verified |
| M7–M9 | ⬜ | |

---

## M1 — Done (gate all green: A/B/C)
Auth (Clerk email/pw + Google OAuth), Svix webhook → user + 20 credits, `GET /api/users/me`,
live dashboard, DB logging, Railway+Vercel deploy on `dev`, tsc/ESLint/CI green.

---

## M2 — Built & deployed (smoke-verified)

**Backend** — schema (`skills`, `skill_offers`, `skill_wants`, `availability` + users `location`/`languages`),
48-skill seed, API: `GET /skills`, offers/wants add+remove, availability get/set, `PATCH /users/me`,
public `GET /users/:id`, enriched `GET /users/me`. Zod-validated, logged.

**Frontend** — `/onboarding` (server-action submit), profile pages (`/profile/:id`, `/profile/edit`),
shared navbar w/ credit balance, Cloudinary unsigned photo upload, new-user → onboarding routing (PT-001 done).

### GATE M2 — implemented (basic-run verified, not deep-tested)
- **A:** T01 ✅ T02 ✅ T03 ✅ (onboarding → DB: offer/want/availability persisted, verified) · T04 ✅ ·
  T05 🟡 (photo upload built; Cloudinary configured; not yet exercised) · T06 ✅ T07 ✅ T08 ✅ (data persists w/ joins)
- **B:** Q01 ✅ Q02 ✅ Q03 ✅ (tsc + ESLint + Zod validation)
- **C:** desktop functional ✅ · mobile/edge polish **deferred**

> Verified once end-to-end: onboarding created Python (expert) offer + Piano (intermediate) want +
> Mon 09:00–17:00 availability, `is_onboarded=true`. Not stress/edge tested.

---

## Architecture hardening — Done
- **Schema doc** now documents the real **text-ID convention** (users.id = Clerk id; prefixed text IDs/FKs) so M3+ tables are built correctly. `schema.ts` is source of truth.
- **DB driver** → **neon-serverless Pool** (WebSocket) with real `db.transaction` (was neon-http `db.batch`). Needed for atomic credit escrow in M6+. Verified live: Pool connects on Railway, transactions work.

---

## M3 — Built & deployed (smoke-verified)

**Matching engine** — 5-factor compatibility score (0–100): mutual swap 40 · availability overlap 20 ·
shared language 20 · experience 10 · reputation 10 (0 until M6/M8). Pure scorer isolated in
`matching.score.ts` (19 Vitest cases green); DB orchestration in `matching.service.ts`.

**Backend** — new `matches` (directional: "userId should see matchedUserId") + `blocks` tables (text-ID,
migration applied to Neon). API: `GET /matches`, `POST /matches/refresh`, `POST /matches/:id/dismiss`,
`POST/DELETE /blocks`, `GET /users/search` (skill/category/free-text, excludes self + blocked).
Auto-refresh triggers wired into skills/wants/availability/profile mutations (fire-and-forget).

**Frontend** — dashboard match feed (score badge, teach/learn chips, shared language, Dismiss/Block/Refresh,
optimistic UI) + `/browse` page (debounced search, category filter, block) + Browse nav link.

### GATE M3 — implemented (basic-run verified, not deep-tested)
- **Engine:** seeded a complementary partner against a real onboarded user → score **86/100**,
  breakdown `{mutual:40, availability:16, language:20, experience:10, reputation:0}` — matches by hand.
- **Live UI:** dashboard renders the 86 match card (Piano ↔ Python, shared `en`), Browse loads. ✅
- **Quality:** tsc + ESLint green (api & web); 19 scorer unit tests pass.
- **Deferred:** Gemini AI skill-tag suggestions; reputation factor (needs M6/M8 reviews/sessions).

> Verified once end-to-end on the deployed site (`dev`): match feed + browse render from live API/DB.
> Not stress/edge tested; multi-real-user matching not yet exercised beyond the seeded partner.

---

## M4 — Built & deployed (smoke-verified)

**Backend** — new `connection_requests` + `conversations` tables (text-ID; conversation pair
canonicalized in the service so it's unique regardless of who accepts). Added `'connected'` to
`match_status`. API: `POST /connections/request` (5-per-7-day free limit, block/duplicate/already-connected
guards, re-send after decline), `GET /connections/requests` (incoming|outgoing + count),
accept (opens/reuses a conversation + flips both match rows to `connected`), decline,
`GET /conversations`.

**Frontend** — reusable `ConnectButton` (idle/pending/connected/limit/incoming states) on match cards,
profiles, and browse · `/connections` inbox (accept/decline, optimistic) · navbar **Requests** badge with
live pending count. `ApiError` now carries the API error `code` so the button reflects the real state.

### GATE M4 — implemented (basic-run verified, not deep-tested)
- **Live UI:** navbar shows the pending-request badge; Connect on an already-incoming user shows
  "Respond to request" (INCOMING_EXISTS); Requests inbox renders the seeded request with Accept/Decline. ✅
- **Accept flow:** accepting creates a conversation + flips the match to `connected` (card leaves the
  `active` feed by design). Verified via the `seed:test-connection` script (partner → you).
- **Quality:** tsc + ESLint green (api & web); 19 scorer unit tests still pass.
- **Deferred:** chat UI + real-time delivery (M5); a user-facing conversations/connections list lands with M5.

> Verified once end-to-end on the deployed site (`dev`): request → inbox → accept path works from live API/DB.
> Not stress/edge tested; the free-tier limit + block guards are code-verified, not manually exercised.

---

## M5 — Real-Time Chat (built & deployed, real-time verified live)

**Backend** — new `messages` table (text-ID, per-message read flag). `socket.ts` rewritten: real
Clerk-JWT handshake auth, room join/leave (membership-checked), `message:send`→persist→broadcast
`message:new`, typing indicators, `message:read`, and in-memory presence (single-instance; Upstash is
the scale path). REST: `GET /conversations` (unread + last-message preview + online), `GET
/conversations/:id/messages` (cursor pagination), `PATCH /:id/read` (emits a receipt). Shared CORS policy
now allows localhost + `FRONTEND_URL` + any `*.vercel.app`.

**Frontend** — `/messages` list (preview, unread badge, online dot) + `/messages/:id` `ChatWindow`:
socket client with fresh-token auth on every (re)connect, optimistic send + ack reconcile, real-time
receive, typing dots, read ticks (✓/✓✓), presence dot, scroll-up history pagination, auto-scroll,
auto-reconnect. **Messages** nav link.

### GATE M5 — implemented (verified live with two real accounts)
- **Real-time:** a message sent in one browser appeared in a second account's window within ~1s, no
  refresh — confirmed live on the deployed site. ✅
- **History/read:** DB-backed integration test (`chat.integration.test.ts`) proves send→store, history
  read-back, and read-receipt marking against the real DB; skipped in CI (DB-free). Seeded 5-message
  thread renders + unread count correct.
- **Auth:** socket rejects connections without a valid Clerk token (handshake middleware).
- **Polish (done):** in-chat image upload (Cloudinary, `messageType='image'` + `fileUrl`), and block/report
  from the chat header — block reuses the existing action; report posts to `POST /api/reports` (recorded to
  the `logs` table for review, no dedicated moderation table yet).
- **Quality:** tsc + ESLint green (api & web); 21 tests pass (19 scorer + 2 integration).

> Live 2-way real-time verified end-to-end. Not yet stress-tested (rapid-send dedupe, reconnect storms,
> mobile keyboard layout are code-handled but not exhaustively exercised).

---

## M6 — Session Booking (built & deployed, escrow proven + live-verified)

**Model** — a session is booked from a connected chat. Cost = `round(duration/6)` credits
(10/hr). **Escrow = balance reduction:** booking writes an `escrow_lock` tx (negative) and drops the
learner's balance; cancel writes an `escrow_release` tx (positive) and restores it. All money moves run
inside a `db.transaction` with a `FOR UPDATE` lock on the learner row, so concurrent books can't
double-spend. Booking is **idempotent** via a unique `(learnerId,teacherId,skillId,scheduledAt)` +
early-return-existing + `onConflictDoNothing` race handling — a retry never double-charges.

**Backend** — new `sessions` table (text-ID `ses_`, teacher/learner/skill refs, conversationId,
scheduledAt, duration, format, creditsAmount, status, confirm flags, cancel fields). Extended
`credit_tx_type` with `escrow_lock`/`escrow_release`; new `session_status` +
`session_format` enums. Pure logic (`sessions.credits.ts`): credit math, booking validation
(duration/format/future-time), state-machine transitions — 12 unit tests. Atomic DB ops
(`sessions.service.ts`): `bookSession` / `acceptSession` / `cancelSession`, each raising a typed
`SessionError` → HTTP status. API: `POST /sessions` (book — validates connection, block, skill-offered,
self-book, credits), `GET /sessions?role=&status=`, `GET /:id`, `POST /:id/accept`, `POST /:id/cancel`;
teacher gets a `session:update` socket push on book.

**Frontend** — `BookingModal` from the chat header 📅 (skill picker from the teacher's offers,
datetime, duration/format, live credit-cost preview) · `/sessions` page with Pending / Upcoming / Past
tabs, `SessionCard` (accept / decline / cancel by role), balance reflects escrow · **Sessions** nav link.

### GATE M6 — implemented (escrow proven by tests, happy path live-verified)
- **Escrow (proven):** 6 DB integration tests (`sessions.integration.test.ts`) against the real DB —
  book locks 10 credits (20→10) + writes `escrow_lock`, retry is idempotent (no second charge),
  insufficient credits is rejected, teacher accept → `confirmed`, cancel refunds (10→20) + writes
  `escrow_release`, double-cancel rejected. ✅
- **Live:** booking a session from chat on the deployed site works end-to-end (modal → book → lands on
  `/sessions`, balance drops). ✅
- **Guards (code-verified):** can't book yourself, a non-connection, a blocked user, or a skill the
  teacher doesn't offer; past times rejected.
- **Quality:** tsc + ESLint green (api & web); **39 tests pass** (19 scorer + 2 chat + 12 credit-unit +
  6 escrow-integration).
- **Deferred:** 30-min-before reminder cron (needs GitHub Actions/scheduler); session completion →
  reputation feeds M8; in-person/async format UX is minimal.

> Escrow money-path is the one thing here that's genuinely test-proven (not just smoke-verified).
> Live booking happy-path confirmed; accept/cancel live flows are code + integration-test verified,
> not yet exhaustively clicked through on the deployed site.

---

## Next
1. **M7** — see `idea/docs/07_MILESTONES.md`.

## Blockers
- None.

## Decisions
→ See `decisions/DECISIONS.md`. Recent: Render→Railway; webhook at `/webhooks/clerk`; 20-credit bonus; text-ID convention; neon-serverless driver; **M3 directional matches** (one row per viewer, diverges from doc 04's symmetric model — enables simple feed + independent dismiss); **M4 canonicalized conversation pair** (participantA < participantB so a pair maps to one conversation regardless of who accepts); **M5 in-memory presence** (single Railway instance; Upstash Redis is the horizontal-scale path) + **CORS `*.vercel.app` pattern** (auth is bearer-token, not cookie, so it's safe); **M6 escrow = balance reduction** (booking debits the learner + writes an `escrow_lock` tx; cancel refunds + `escrow_release` — no separate held-funds column, kept atomic with a `FOR UPDATE` lock; idempotent via a unique booking key).
