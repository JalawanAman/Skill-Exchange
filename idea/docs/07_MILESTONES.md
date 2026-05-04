# 07 — Milestones and Gates

> Each milestone has a GATE. The gate must be fully passed before the next milestone begins.  
> Gate failures are hard stops — see `00_RULES_AND_GATES.md` for the protocol.  
> Requirements referenced by ID from `06_REQUIREMENTS.md`.

---

## Timeline Overview

```
Week 1–2:  M1 — Project Setup & Auth
Week 3:    M2 — Profiles & Onboarding
Week 4–5:  M3 — Skills, Matching & Browse
Week 6:    M4 — Connections
Week 7–8:  M5 — Real-Time Chat
Week 9:    M6 — Session Booking
Week 10:   M7 — Credits & Session Completion
Week 11:   M8 — Reviews & Notifications
Week 12:   M9 — Polish, Tests & Launch
```

---

## M1 — Project Setup and Authentication
**Duration:** Weeks 1–2  
**Goal:** Monorepo running locally. Users can sign up, sign in, and be verified.

### Tasks
- [ ] Initialize monorepo with pnpm + Turborepo
- [ ] Create `apps/web` (Next.js 14) and `apps/api` (Node.js + Express)
- [ ] Create `packages/shared` for shared TypeScript types
- [ ] Configure TypeScript, ESLint, Prettier across all packages
- [ ] Set up Neon DB — create project, get `DATABASE_URL`
- [ ] Set up Clerk — configure email/password + Google OAuth
- [ ] Implement Clerk webhook endpoint (`POST /api/auth/sync`)
  - Receives `user.created` event
  - Creates user record in PostgreSQL
  - Awards 20 starter credits (transaction record)
- [ ] Write and run initial DB migration (users table, credit_transactions table)
- [ ] Implement `GET /api/users/me` — returns the authenticated user
- [ ] Protect all API routes with Clerk middleware
- [ ] Frontend: implement sign-up page (`/sign-up`)
- [ ] Frontend: implement sign-in page (`/sign-in`)
- [ ] Frontend: implement auth guard (redirect unauthenticated to `/sign-in`)
- [ ] Frontend: implement sign-out button
- [ ] Set up GitHub repository and push initial commit
- [ ] Set up GitHub Actions CI (lint + typecheck on every PR)
- [ ] Configure `.env.example` with all required variables

### GATE M1 ✋

Before proceeding to M2, ALL of the following must pass:

**Category A — Functional Tests**
- [ ] **M1-T01:** A new user can sign up with email/password → user record exists in DB with 20 credits
- [ ] **M1-T02:** A new user can sign up with Google OAuth → user record exists in DB with 20 credits
- [ ] **M1-T03:** A signed-in user can call `GET /api/users/me` and receive their profile
- [ ] **M1-T04:** An unauthenticated request to `GET /api/users/me` returns 401
- [ ] **M1-T05:** Signing out clears the session and redirects to `/sign-in`
- [ ] **M1-T06:** After sign-in, user is redirected to `/dashboard` (or `/onboarding` if new)
- [ ] **M1-T07:** The Clerk webhook correctly creates a user in our DB (test with Clerk dashboard event replay)

**Category B — Quality Checks**
- [ ] **M1-Q01:** `tsc --noEmit` exits 0 for both `apps/web` and `apps/api`
- [ ] **M1-Q02:** ESLint exits 0 for both apps
- [ ] **M1-Q03:** `.env.example` documents every required environment variable

**Category C — Manual Verification**
- [ ] **M1-C01:** Sign-up flow works on mobile (375px) — no overflow, no broken layout
- [ ] **M1-C02:** Sign-up flow works on desktop (1280px)
- [ ] **M1-C03:** No console errors in the browser after sign-in

**Requirements covered:** FR-AUTH-01 through FR-AUTH-08, NFR-SEC-01, NFR-COST-01

---

## M2 — Profiles and Onboarding
**Duration:** Week 3  
**Goal:** Users can complete onboarding and have a fully functional public profile.

### Tasks
- [ ] Write and run migration: `skill_offers`, `skill_wants`, `availability`, `skills` tables
- [ ] Seed `skills` table with initial 50 skills
- [ ] Build onboarding flow (`/onboarding`)
  - Step 1: Display name, timezone, location, languages
  - Step 2: Add at least 1 skill offer (with proficiency)
  - Step 3: Add at least 1 skill want
  - Step 4: Set availability (at least one weekly slot)
  - Step 5: Upload profile photo (Cloudinary unsigned upload)
- [ ] Implement `PATCH /api/users/me` — update profile fields
- [ ] Implement `POST /api/skills/offers` + `DELETE /api/skills/offers/:id`
- [ ] Implement `POST /api/skills/wants` + `DELETE /api/skills/wants/:id`
- [ ] Implement `PUT /api/availability` + `GET /api/availability/:userId`
- [ ] Implement `GET /api/skills` (with category filter)
- [ ] Build public profile page (`/profile/:id`)
- [ ] Build edit profile page (`/profile/edit`)
- [ ] Cloudinary integration — signed upload preset for profile photos
- [ ] Show credit balance in navbar

### GATE M2 ✋

**Category A — Functional Tests**
- [ ] **M2-T01:** New user is redirected to `/onboarding` after first sign-in
- [ ] **M2-T02:** Onboarding cannot be completed without at least 1 skill offer and 1 skill want (form validation blocks)
- [ ] **M2-T03:** Completing onboarding redirects to `/dashboard`
- [ ] **M2-T04:** After onboarding, `GET /api/users/me` returns the user with skills and availability populated
- [ ] **M2-T05:** Profile photo upload stores a Cloudinary URL on the user record
- [ ] **M2-T06:** `/profile/:id` shows correct data for a known user ID
- [ ] **M2-T07:** A user can add and remove a skill offer — changes persist on page refresh
- [ ] **M2-T08:** Availability slots saved via `PUT /api/availability` appear correctly in `GET /api/availability/:userId`

**Category B — Quality Checks**
- [ ] **M2-Q01:** `tsc --noEmit` exits 0
- [ ] **M2-Q02:** ESLint exits 0
- [ ] **M2-Q03:** Zod validation rejects requests with missing required fields (unit test)

**Category C — Manual Verification**
- [ ] **M2-C01:** Profile page renders on mobile (375px) — all sections visible, no overflow
- [ ] **M2-C02:** Onboarding flow is completable in under 5 minutes
- [ ] **M2-C03:** Uploading a profile photo shows a preview before saving
- [ ] **M2-C04:** Empty bio shows a placeholder, not blank space

**Requirements covered:** FR-PROF-01 through FR-PROF-10, FR-AUTH-05, FR-AUTH-06, NFR-UX-09

---

## M3 — Skills, Matching, and Browse
**Duration:** Weeks 4–5  
**Goal:** The matching algorithm runs. Users can see their top matches and search for others.

### Tasks
- [ ] Write and run migration: `matches` table, `blocks` table
- [ ] Implement matching algorithm service (`matching.service.ts`)
  - Query candidates who offer what I want (or vice versa)
  - Compute compatibility score (5 factors — see Architecture doc)
  - Store results in `matches` table
- [ ] Trigger matching algorithm on: profile save, skills update, availability update
- [ ] Implement `GET /api/matches` — paginated match feed
- [ ] Implement `POST /api/matches/:id/dismiss`
- [ ] Implement `POST /api/matches/refresh`
- [ ] Implement `GET /api/users/search` with filters (skill, category, language)
- [ ] Build dashboard page (`/dashboard`) — shows match feed with compatibility scores
- [ ] Build MatchCard component — shows: avatar, name, skills to swap, score, connect button
- [ ] Build browse page (`/browse`) — search + filter UI
- [ ] Add AI skill tag suggestion on onboarding (Gemini API — see M3 AI task)
- [ ] Implement `POST /api/blocks` and `DELETE /api/blocks/:id`
- [ ] Blocked users must be excluded from matches and search

### GATE M3 ✋

**Category A — Functional Tests**
- [ ] **M3-T01:** After completing onboarding, at least 1 match appears in the dashboard (requires at least 2 test users with complementary skills in the DB)
- [ ] **M3-T02:** `GET /api/matches` returns matches sorted by `compatibilityScore` descending
- [ ] **M3-T03:** Two users with a perfect mutual skill swap have a score > 70
- [ ] **M3-T04:** Two users with no skill overlap have a score of 0 and do NOT appear in each other's matches
- [ ] **M3-T05:** Dismissed match does not reappear after page refresh
- [ ] **M3-T06:** `GET /api/users/search?q=python` returns only users who offer Python
- [ ] **M3-T07:** A blocked user does not appear in matches or search results
- [ ] **M3-T08:** Unit test for `computeCompatibilityScore()` covers all 5 scoring factors

**Category B — Quality Checks**
- [ ] **M3-Q01:** `tsc --noEmit` exits 0
- [ ] **M3-Q02:** ESLint exits 0
- [ ] **M3-Q03:** Matching service has unit tests with >80% coverage

**Category C — Manual Verification**
- [ ] **M3-C01:** Dashboard match cards are visually clear — skills swapped are easy to understand
- [ ] **M3-C02:** Browse page search results update as user types (debounced)
- [ ] **M3-C03:** Empty match feed shows a helpful message (e.g. "Add more skills to find matches")

**Requirements covered:** FR-MATCH-01 through FR-MATCH-09

---

## M4 — Connections
**Duration:** Week 6  
**Goal:** Users can send, accept, and decline connection requests. Accepting creates a conversation.

### Tasks
- [ ] Write and run migration: `connection_requests`, `conversations` tables
- [ ] Implement `POST /api/connections/request`
  - Enforce free user limit (5 per 7 days — tracked via DB count)
  - Validate: no existing request, no block, not already connected
- [ ] Implement `GET /api/connections/requests` — incoming requests list
- [ ] Implement `POST /api/connections/requests/:id/accept`
  - Creates conversation record
  - Updates match status to 'connected'
- [ ] Implement `POST /api/connections/requests/:id/decline`
- [ ] Build connections/requests page in frontend
- [ ] Connect button on MatchCard and ProfileCard triggers the request flow
- [ ] Show connection request count in navbar badge
- [ ] Basic in-app notification for new connection request (DB-stored, polled for now — real-time in M5)

### GATE M4 ✋

**Category A — Functional Tests**
- [ ] **M4-T01:** User A sends a request to User B → request appears in User B's incoming list
- [ ] **M4-T02:** User B accepts → a conversation is created, both users are "connected"
- [ ] **M4-T03:** User B declines → request is removed, no conversation created
- [ ] **M4-T04:** A free user who has sent 5 requests in 7 days receives a 422 `CONNECTION_LIMIT` error on the 6th attempt
- [ ] **M4-T05:** Sending a duplicate connection request returns 409 `DUPLICATE_REQUEST`
- [ ] **M4-T06:** A user blocked by User B cannot send a request to User B (403)
- [ ] **M4-T07:** After acceptance, the conversation appears in both users' conversation lists (`GET /api/conversations`)

**Category B — Quality Checks**
- [ ] **M4-Q01:** `tsc --noEmit` exits 0
- [ ] **M4-Q02:** ESLint exits 0

**Category C — Manual Verification**
- [ ] **M4-C01:** Connect button on a profile clearly indicates pending state after sending
- [ ] **M4-C02:** Mobile layout of connection requests page is clean and usable

**Requirements covered:** FR-CONN-01 through FR-CONN-07

---

## M5 — Real-Time Chat
**Duration:** Weeks 7–8  
**Goal:** Two connected users can exchange messages in real time with presence and read receipts.

### Tasks
- [ ] Write and run migration: `messages` table
- [ ] Set up Socket.io server on the Express app (`socket.ts`)
- [ ] Implement JWT authentication for socket connections
- [ ] Implement socket events:
  - `conversation:join` / `conversation:leave` (room management)
  - `message:send` → persist to DB → emit `message:new` to room
  - `typing:start` / `typing:stop` → emit `typing:indicator`
  - `message:read` → update DB → emit `message:read`
  - `user:heartbeat` → update `last_seen_at` in Redis (Upstash)
- [ ] Implement online presence via Upstash Redis
  - Heartbeat every 30s from client
  - User is "online" if heartbeat received in last 60s
  - `presence:update` emitted to all conversations of that user
- [ ] Implement REST endpoints:
  - `GET /api/conversations` — conversation list with unread counts
  - `GET /api/conversations/:id/messages` — paginated history
  - `PATCH /api/conversations/:id/read`
- [ ] Build conversation list UI (`/messages`)
- [ ] Build chat window UI (`/messages/:conversationId`)
  - ChatWindow component with scroll-to-bottom on new message
  - MessageBubble with timestamp and read receipt ticks
  - MessageInput with typing state
  - OnlineIndicator (green dot)
  - TypingIndicator (animated dots)
- [ ] Implement auto-reconnect on socket disconnect
- [ ] Implement image upload in chat (Cloudinary)
- [ ] Implement block/report from chat UI

### GATE M5 ✋

**Category A — Functional Tests**
- [ ] **M5-T01:** User A sends a message → appears in User B's chat window within 1 second (manual timing test with two open browser windows)
- [ ] **M5-T02:** No page refresh is required for the message to appear (verified by observation)
- [ ] **M5-T03:** When User B reads the message, User A's message shows a double tick within 1 second
- [ ] **M5-T04:** Typing indicator appears in User B's window when User A is typing, and disappears within 3 seconds of stopping
- [ ] **M5-T05:** Online dot shows green when other user is connected via socket
- [ ] **M5-T06:** Previous messages load correctly from DB when opening a conversation (history test with 100 seeded messages)
- [ ] **M5-T07:** Scrolling up loads older messages (pagination works)
- [ ] **M5-T08:** Socket reconnects automatically within 5 seconds of simulated disconnect (kill socket, reconnect, send message)
- [ ] **M5-T09:** An unauthenticated socket connection is rejected
- [ ] **M5-T10:** Messages are stored in DB — verified by direct DB query after send

**Category B — Quality Checks**
- [ ] **M5-Q01:** `tsc --noEmit` exits 0
- [ ] **M5-Q02:** ESLint exits 0
- [ ] **M5-Q03:** Socket event handlers have integration tests (send message → verify DB + emit)

**Category C — Manual Verification**
- [ ] **M5-C01:** Chat UI renders cleanly on mobile (375px) — input visible above keyboard
- [ ] **M5-C02:** Conversation list shows last message preview and unread count correctly
- [ ] **M5-C03:** Chat window scrolls to bottom on new message when already near bottom
- [ ] **M5-C04:** No duplicate messages appear under rapid sending

**Requirements covered:** FR-CHAT-01 through FR-CHAT-12

---

## M6 — Session Booking
**Duration:** Week 9  
**Goal:** Users can book a session from within the chat. Credits are held in escrow.

### Tasks
- [ ] Write and run migration: `sessions` table, `credit_transactions` (ensure exists)
- [ ] Implement `POST /api/sessions` — creates session and locks credits in escrow
  - Validate learner has sufficient credits
  - Create `escrow_lock` credit transaction (negative amount, balance reduces)
  - Send notification to other user
  - Emit `session:update` via WebSocket
- [ ] Implement `GET /api/sessions` with status/role filters
- [ ] Implement `GET /api/sessions/:id`
- [ ] Implement `POST /api/sessions/:id/accept` — teacher accepts
- [ ] Implement `POST /api/sessions/:id/cancel` — with credit refund logic
- [ ] Build session booking modal inside chat (`BookingModal`)
  - Date/time picker
  - Duration selector (30/60/90/120 min)
  - Format selector (video/in-person/async)
  - Meeting link field
  - Credit cost preview
- [ ] Build session management page (`/sessions`)
  - Upcoming, past, pending tabs
  - Session detail card
- [ ] Schedule 30-min reminder (use a simple DB-based cron via GitHub Actions or Render cron)
- [ ] Emit `session:update` events via socket when session status changes

### GATE M6 ✋

**Category A — Functional Tests**
- [ ] **M6-T01:** Learner (20 credits) books a 60-min session → balance shows 10 (10 in escrow)
- [ ] **M6-T02:** Learner with 0 available credits cannot book a session → 422 `INSUFFICIENT_CREDITS`
- [ ] **M6-T03:** Session appears in teacher's `/sessions` with status `pending`
- [ ] **M6-T04:** Teacher accepts → status changes to `confirmed`, both users notified
- [ ] **M6-T05:** Learner cancels a confirmed session → credits return, balance restored, status = `cancelled`
- [ ] **M6-T06:** Credit transaction records exist for: escrow_lock on booking, escrow_release on cancel
- [ ] **M6-T07:** `POST /api/sessions` is idempotent when retried (no duplicate sessions created)
- [ ] **M6-T08:** Session cannot be booked for a past time (422 validation error)

**Category B — Quality Checks**
- [ ] **M6-Q01:** `tsc --noEmit` exits 0
- [ ] **M6-Q02:** ESLint exits 0
- [ ] **M6-Q03:** Credit escrow logic has unit tests for all state transitions

**Category C — Manual Verification**
- [ ] **M6-C01:** Booking modal is usable on mobile (375px)
- [ ] **M6-C02:** Credit cost is clearly shown before confirming booking
- [ ] **M6-C03:** Session card in conversation shows booking details clearly

**Requirements covered:** FR-SESS-01 through FR-SESS-14, FR-CRED-01 through FR-CRED-07

---

## M7 — Session Completion and Credit Transfer
**Duration:** Week 10  
**Goal:** Both users confirm completion. Credits transfer atomically. The full loop works.

### Tasks
- [ ] Implement `POST /api/sessions/:id/confirm-complete`
  - Set `teacher_confirmed` or `learner_confirmed` to true
  - When both are true:
    - Atomic DB transaction: update session status, create credit transactions, update both user balances
    - Emit `credits:update` to both users via WebSocket
    - Emit `notification:new` to both
    - Trigger review prompts
- [ ] Implement `POST /api/sessions/:id/dispute`
- [ ] Build "Confirm Session Complete" button in sessions UI
  - Shows disabled state if other party hasn't confirmed yet
  - Shows "waiting for other person" state
- [ ] Emit socket events for all session state changes
- [ ] Test the complete loop end-to-end with two real users (or two test accounts)

### GATE M7 ✋

**Category A — Functional Tests**
- [ ] **M7-T01:** Teacher confirms → `teacher_confirmed = true`, learner has NOT been credited yet
- [ ] **M7-T02:** Learner confirms (after teacher) → credits transfer: teacher +10, learner -10, status = `completed`
- [ ] **M7-T03:** Credit transfer is atomic — no state where one user has been updated but not the other (DB transaction test)
- [ ] **M7-T04:** Confirming twice (idempotency) does not double-transfer credits
- [ ] **M7-T05:** After completion, both users' balances update in the UI in real time (socket `credits:update` received)
- [ ] **M7-T06:** Full loop end-to-end test: User A (Python) ↔ User B (Guitar) sign up → match → connect → book → confirm → credits transferred → both can see updated balance
- [ ] **M7-T07:** Credit balance never drops below 0 — enforced by server validation in all paths

**Category B — Quality Checks**
- [ ] **M7-Q01:** `tsc --noEmit` exits 0
- [ ] **M7-Q02:** ESLint exits 0
- [ ] **M7-Q03:** Atomic credit transfer has a failing test that demonstrates the non-atomic version fails, and a passing test for the atomic version

**Category C — Manual Verification**
- [ ] **M7-C01:** Confirmation UI is clear — both users see whose turn it is to confirm
- [ ] **M7-C02:** Credit balance update is visible in the navbar without page refresh

**Requirements covered:** FR-SESS-08 through FR-SESS-14, FR-CRED-01 through FR-CRED-07

---

## M8 — Reviews and Notifications
**Duration:** Week 11  
**Goal:** Post-session review flow works. Notifications are real-time and comprehensive.

### Tasks
- [ ] Write and run migration: `reviews`, `notifications` tables
- [ ] Implement `POST /api/reviews` — with validation (completed session, one per person)
- [ ] Implement `GET /api/reviews/user/:userId`
- [ ] Build review prompt modal — triggered after session completion confirmation
- [ ] Display reviews on public profile page (sorted by date)
- [ ] Display average rating on profile and match cards
- [ ] Implement full notifications system:
  - DB storage for all notification types
  - Real-time delivery via WebSocket (`notification:new`)
  - Navbar unread badge
  - Notifications page (`/notifications`)
  - Mark as read (single + all)
- [ ] Implement email notifications via Resend:
  - Welcome email on sign-up
  - Session reminder (30 min before — trigger via cron)
- [ ] Wire up all events to create notifications:
  - New match detected
  - Connection request received/accepted
  - New message (if user is offline)
  - Session request/confirmed/completed/reminder
  - Credits earned/spent
  - New review received

### GATE M8 ✋

**Category A — Functional Tests**
- [ ] **M8-T01:** After session completion, both users see a review prompt
- [ ] **M8-T02:** Submitting a review stores it in DB and it appears on the reviewee's public profile
- [ ] **M8-T03:** A user cannot submit two reviews for the same session (409 on second attempt)
- [ ] **M8-T04:** Average rating on profile updates after a new review is submitted
- [ ] **M8-T05:** New connection request → notification appears in real time in other user's navbar badge
- [ ] **M8-T06:** Marking all notifications as read clears the badge
- [ ] **M8-T07:** Email is sent to new user within 60 seconds of sign-up (verify in Resend dashboard)

**Category B — Quality Checks**
- [ ] **M8-Q01:** `tsc --noEmit` exits 0
- [ ] **M8-Q02:** ESLint exits 0

**Category C — Manual Verification**
- [ ] **M8-C01:** Review form is usable on mobile
- [ ] **M8-C02:** Notifications page shows all notification types with correct icons and text
- [ ] **M8-C03:** Profile with 0 reviews shows empty state, not blank

**Requirements covered:** FR-REV-01 through FR-REV-07, FR-NOTIF-01 through FR-NOTIF-06

---

## M9 — Polish, Testing, and Launch
**Duration:** Week 12  
**Goal:** The platform is production-ready, deployed live, tested on real devices, all gates passed.

### Tasks
- [ ] Full end-to-end Playwright test suite (critical user flows)
- [ ] Mobile QA pass — test every screen at 375px on a real device or accurate emulator
- [ ] Performance audit: Lighthouse scores ≥ 80 on all pages
- [ ] Fix all Lighthouse issues flagged under Performance and Accessibility
- [ ] Set up production environment variables on Vercel and Render
- [ ] Configure custom domain (optional but nice)
- [ ] Set up UptimeRobot to ping backend every 5 min (prevents Render spin-down)
- [ ] Set up Neon DB alerts for storage usage
- [ ] Create a demo account with realistic data (2 connected users, seeded sessions + reviews)
- [ ] Write a clear onboarding tooltip or guide for first-time users
- [ ] Final code review — remove all `console.log`, dead code, TODOs not meant for production
- [ ] Tag `v1.0.0` release in Git
- [ ] Deploy to production (Vercel + Render)
- [ ] Share the live URL

### GATE M9 — LAUNCH GATE ✋

**Category A — Functional Tests (Playwright E2E)**
- [ ] **M9-T01:** Full sign-up to first match flow (Playwright test, headless)
- [ ] **M9-T02:** Send and receive a real-time message between two test users
- [ ] **M9-T03:** Book a session → accept → confirm completion → credits transferred
- [ ] **M9-T04:** Leave a review → appears on profile
- [ ] **M9-T05:** Sign out → cannot access `/dashboard` → redirect to `/sign-in`

**Category B — Quality Checks**
- [ ] **M9-Q01:** `tsc --noEmit` exits 0
- [ ] **M9-Q02:** ESLint exits 0
- [ ] **M9-Q03:** All Vitest unit/integration tests passing (`vitest run`)
- [ ] **M9-Q04:** All Playwright e2e tests passing

**Category C — Manual Verification**
- [ ] **M9-C01:** Lighthouse Performance score ≥ 80 on `/dashboard` (mobile preset)
- [ ] **M9-C02:** Lighthouse Accessibility score ≥ 80 on all pages
- [ ] **M9-C03:** Platform tested on real mobile device — all critical flows work
- [ ] **M9-C04:** No console errors on any page in production
- [ ] **M9-C05:** Demo account created — works end-to-end
- [ ] **M9-C06:** UptimeRobot ping configured and alerting if backend goes down
- [ ] **M9-C07:** All environment variables set in production hosting dashboards

**All requirements from FR-AUTH through FR-NOTIF and NFR-PERF through NFR-COST must be satisfied.**

---

## Backlog (Post-MVP)

Features deferred from MVP. Do not build during the 12-week plan.

| Feature | Notes |
|---|---|
| Premium subscription billing (Stripe) | Integrate after launch |
| Credit purchases with real money | Needs Stripe |
| Built-in video calling | WebRTC / Daily.co free tier |
| Verified skill badge assessments | Needs admin panel |
| Admin dashboard | Post-launch |
| Native mobile app | React Native, post-launch |
| Group sessions | Architecture change needed |
| Skill courses / async content | Separate product surface |
| Email digest notifications | Scheduled job, low priority |
| Monthly credit reset for free users | Schema supports it, not triggered |

---

*Milestones last reviewed: 2026-05-02*
