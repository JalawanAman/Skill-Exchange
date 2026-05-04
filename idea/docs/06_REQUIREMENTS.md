# 06 — Requirements

> This document defines what the platform MUST do (functional) and how it MUST behave (non-functional).  
> Every requirement has an ID. Gate tests in `07_MILESTONES.md` reference these IDs.  
> If a requirement changes, update it here first.

---

## Functional Requirements

### FR-AUTH — Authentication

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | A user can sign up with email + password | Must Have |
| FR-AUTH-02 | A user can sign up / sign in with Google OAuth | Must Have |
| FR-AUTH-03 | A signed-in session persists across page refreshes | Must Have |
| FR-AUTH-04 | A user can sign out from any page | Must Have |
| FR-AUTH-05 | On first sign-in, user is redirected to onboarding flow | Must Have |
| FR-AUTH-06 | Onboarding collects: display name, timezone, at least 1 skill offer, at least 1 skill want | Must Have |
| FR-AUTH-07 | A user record is created in our DB within 5 seconds of Clerk user creation (via webhook) | Must Have |
| FR-AUTH-08 | Unauthenticated users cannot access any route except `/`, `/sign-in`, `/sign-up` | Must Have |

---

### FR-PROFILE — User Profiles

| ID | Requirement | Priority |
|---|---|---|
| FR-PROF-01 | Every user has a public profile page at `/profile/:id` | Must Have |
| FR-PROF-02 | Profile displays: avatar, name, bio, skill offers, skill wants, languages, location, rating, session count, reviews | Must Have |
| FR-PROF-03 | A user can upload a profile photo (Cloudinary, auto-resized to 400×400) | Must Have |
| FR-PROF-04 | A user can edit their bio (max 300 characters) | Must Have |
| FR-PROF-05 | A user can add/remove skill offers with proficiency level | Must Have |
| FR-PROF-06 | A user can add/remove skill wants | Must Have |
| FR-PROF-07 | A user can set their weekly availability schedule | Must Have |
| FR-PROF-08 | Profile shows average rating computed from all reviews | Must Have |
| FR-PROF-09 | Profile shows total number of completed sessions | Must Have |
| FR-PROF-10 | A user can add the languages they speak | Must Have |

---

### FR-MATCH — Matching

| ID | Requirement | Priority |
|---|---|---|
| FR-MATCH-01 | The matching algorithm runs when a user updates their skills or availability | Must Have |
| FR-MATCH-02 | Matches are sorted by compatibility score (highest first) | Must Have |
| FR-MATCH-03 | A match is surfaced only if each user offers at least one skill the other wants | Must Have |
| FR-MATCH-04 | Compatibility score (0–100) is computed from: mutual skill match, availability overlap, shared language, experience compatibility, reputation | Must Have |
| FR-MATCH-05 | A user can dismiss a match (it will not appear again) | Must Have |
| FR-MATCH-06 | A user can browse all users manually via search | Must Have |
| FR-MATCH-07 | Search supports filtering by: skill, category, language | Must Have |
| FR-MATCH-08 | Blocked users do not appear in matches or search results | Must Have |
| FR-MATCH-09 | Users already connected do not appear as new matches | Must Have |

---

### FR-CONNECT — Connections

| ID | Requirement | Priority |
|---|---|---|
| FR-CONN-01 | A user can send a connection request with an optional message | Must Have |
| FR-CONN-02 | Free users can send max 5 connection requests per 7 days | Must Have |
| FR-CONN-03 | Premium users have unlimited connection requests | Must Have |
| FR-CONN-04 | A user receives a notification when they get a connection request | Must Have |
| FR-CONN-05 | A user can accept or decline a connection request | Must Have |
| FR-CONN-06 | Accepting a connection request creates a conversation automatically | Must Have |
| FR-CONN-07 | A declined request can be sent again after 30 days | Must Have |

---

### FR-CHAT — Real-Time Messaging

| ID | Requirement | Priority |
|---|---|---|
| FR-CHAT-01 | Messages appear on the recipient's screen within 500ms (on good connection) | Must Have |
| FR-CHAT-02 | No page refresh required to send or receive messages | Must Have |
| FR-CHAT-03 | A green dot indicates when the other user is currently online | Must Have |
| FR-CHAT-04 | Single tick = message delivered to server; double tick = message read by recipient | Must Have |
| FR-CHAT-05 | A typing indicator shows when the other user is composing a message | Must Have |
| FR-CHAT-06 | Full message history is loaded and accessible when returning to a conversation | Must Have |
| FR-CHAT-07 | Message history is paginated (50 messages per page, load more on scroll up) | Must Have |
| FR-CHAT-08 | A user can send image files in chat (max 5MB, Cloudinary) | Should Have |
| FR-CHAT-09 | A user can block another user from within the chat window | Must Have |
| FR-CHAT-10 | A user can report another user from within the chat window | Must Have |
| FR-CHAT-11 | A session booking card can be created and sent inside the chat | Must Have |
| FR-CHAT-12 | Conversation list shows unread message count per conversation | Must Have |

---

### FR-SESSION — Session Booking and Management

| ID | Requirement | Priority |
|---|---|---|
| FR-SESS-01 | A user can propose a session specifying: skill, date/time, duration (30/60/90/120 min), format (video/in-person/async), optional meeting link | Must Have |
| FR-SESS-02 | Sessions can only be booked between connected users | Must Have |
| FR-SESS-03 | The learner's credits for the session are locked in escrow when the session is proposed | Must Have |
| FR-SESS-04 | A user cannot propose a session if they lack enough credits | Must Have |
| FR-SESS-05 | The recipient receives a notification and chat card about the session request | Must Have |
| FR-SESS-06 | The recipient can accept or decline the session request | Must Have |
| FR-SESS-07 | Both users receive a reminder notification 30 minutes before the session | Must Have |
| FR-SESS-08 | After the session, both users must confirm it is complete via a button | Must Have |
| FR-SESS-09 | Credits transfer automatically when BOTH users confirm completion | Must Have |
| FR-SESS-10 | Teacher receives +10 credits per hour of teaching (proportional to duration) | Must Have |
| FR-SESS-11 | Learner spends -10 credits per hour of learning | Must Have |
| FR-SESS-12 | A session can be cancelled before it starts — credits return to learner | Must Have |
| FR-SESS-13 | A user can view all their upcoming, past, and pending sessions | Must Have |
| FR-SESS-14 | A dispute can be raised on a completed session | Must Have |

---

### FR-CREDIT — Credit System

| ID | Requirement | Priority |
|---|---|---|
| FR-CRED-01 | New users start with exactly 20 credits | Must Have |
| FR-CRED-02 | Credit balance is always computed and stored server-side | Must Have |
| FR-CRED-03 | Client NEVER sends a credit amount in any request — always server-computed | Must Have |
| FR-CRED-04 | Every credit change creates a transaction record | Must Have |
| FR-CRED-05 | Credits can never go below 0 | Must Have |
| FR-CRED-06 | Users can see their full credit transaction history | Must Have |
| FR-CRED-07 | Escrowed credits are shown separately from available balance | Must Have |
| FR-CRED-08 | Free users lose unused credits on a monthly reset (post-MVP feature, but schema must support it) | Could Have |

---

### FR-REVIEW — Reviews and Trust

| ID | Requirement | Priority |
|---|---|---|
| FR-REV-01 | After a session is completed, both parties are prompted to leave a review | Must Have |
| FR-REV-02 | A review includes a 1–5 star rating and optional written comment (max 500 chars) | Must Have |
| FR-REV-03 | Each user can only review once per session | Must Have |
| FR-REV-04 | Reviews are public on the profile | Must Have |
| FR-REV-05 | The average rating displayed is computed from all received reviews | Must Have |
| FR-REV-06 | A user can see all reviews they have given and received | Must Have |
| FR-REV-07 | Reviewer identity is public (not anonymous) | Must Have |

---

### FR-NOTIF — Notifications

| ID | Requirement | Priority |
|---|---|---|
| FR-NOTIF-01 | Notifications appear in-app in real time via WebSocket | Must Have |
| FR-NOTIF-02 | Unread notification count is shown in the navbar | Must Have |
| FR-NOTIF-03 | A user can mark all notifications as read | Must Have |
| FR-NOTIF-04 | Notification types: new match, connection request, connection accepted, new message, session request, session confirmed, session reminder (30min), session completed, new review, credit earned/spent | Must Have |
| FR-NOTIF-05 | Email notifications for: welcome, session reminders (Resend) | Should Have |
| FR-NOTIF-06 | A user can turn off specific notification types in settings | Should Have |

---

## Non-Functional Requirements

### NFR-PERF — Performance

| ID | Requirement |
|---|---|
| NFR-PERF-01 | Page load (LCP) < 2.5s on desktop, < 4s on mobile (3G) |
| NFR-PERF-02 | API response time < 300ms for all GET endpoints (p95) |
| NFR-PERF-03 | WebSocket message delivery < 500ms under normal conditions |
| NFR-PERF-04 | Chat history load (50 messages) < 500ms |
| NFR-PERF-05 | Matching algorithm completes in < 1s for up to 10,000 users |

---

### NFR-SEC — Security

| ID | Requirement |
|---|---|
| NFR-SEC-01 | All API routes require authentication (except public profiles and skills list) |
| NFR-SEC-02 | All API routes validate that the requesting user owns or has permission to the resource |
| NFR-SEC-03 | Credit operations are computed server-side — client never sends credit amounts |
| NFR-SEC-04 | Session confirmation requires both parties independently — no single-sided confirm |
| NFR-SEC-05 | All user input is sanitized — no XSS possible in stored content |
| NFR-SEC-06 | Rate limiting: 100 requests / 15 minutes per IP globally |
| NFR-SEC-07 | Socket connections authenticated via JWT — unauthenticated sockets are rejected |
| NFR-SEC-08 | CORS configured to whitelist frontend URL only |
| NFR-SEC-09 | Secrets never in git — `.env` files always in `.gitignore` |
| NFR-SEC-10 | SQL injection impossible (Drizzle ORM parameterizes all queries) |

---

### NFR-UX — User Experience

| ID | Requirement |
|---|---|
| NFR-UX-01 | Platform is fully usable on mobile (375px viewport minimum) |
| NFR-UX-02 | Platform is fully usable on desktop (1280px viewport) |
| NFR-UX-03 | No horizontal scroll on any page at any breakpoint |
| NFR-UX-04 | All interactive elements have hover/focus states |
| NFR-UX-05 | All forms show inline validation errors |
| NFR-UX-06 | Loading states shown for all async operations |
| NFR-UX-07 | Empty states shown for all list views (no silent blank pages) |
| NFR-UX-08 | Error states shown when API calls fail (toast notifications) |
| NFR-UX-09 | Onboarding is completable in under 5 minutes |
| NFR-UX-10 | A new user finds a match within 2 steps of finishing onboarding |

---

### NFR-REL — Reliability

| ID | Requirement |
|---|---|
| NFR-REL-01 | Credit transactions are atomic — no partial state |
| NFR-REL-02 | Session confirmation is idempotent — double-confirming has no effect |
| NFR-REL-03 | WebSocket reconnects automatically within 3 seconds of disconnection |
| NFR-REL-04 | If the backend is down, the frontend shows a clear error — no silent failure |
| NFR-REL-05 | Database migrations are run before the new backend version handles traffic |

---

### NFR-COST — Cost

| ID | Requirement |
|---|---|
| NFR-COST-01 | Total infrastructure cost at MVP is $0/month |
| NFR-COST-02 | Any service with a free tier limit must have a documented escalation threshold |
| NFR-COST-03 | Free tier usage is monitored and alerts are set where the service supports it |

---

*Requirements last reviewed: 2026-05-02*
