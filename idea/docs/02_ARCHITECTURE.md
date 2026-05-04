# 02 — System Architecture

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │              Next.js 14 (App Router)                    │      │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │      │
│   │  │  Pages   │ │Components│ │  Hooks   │ │  State   │  │      │
│   │  │/dashboard│ │ChatBox   │ │useSocket │ │Zustand   │  │      │
│   │  │/profile  │ │MatchCard │ │useAuth   │ │store     │  │      │
│   │  │/messages │ │BookingUI │ │useCredits│ │          │  │      │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │      │
│   └─────────────────────────────────────────────────────────┘      │
│              │ HTTP/REST              │ WebSocket                   │
└──────────────┼────────────────────────┼─────────────────────────────┘
               │                        │
               ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │            Node.js + Express (REST API)                 │      │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │      │
│   │  │  /auth   │ │  /users  │ │/sessions │ │ /skills  │  │      │
│   │  │  routes  │ │  routes  │ │  routes  │ │  routes  │  │      │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │      │
│   │                                                         │      │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │      │
│   │  │/messages │ │/matches  │ │ /credits │               │      │
│   │  │  routes  │ │  routes  │ │  routes  │               │      │
│   │  └──────────┘ └──────────┘ └──────────┘               │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │              Socket.io Server (Real-Time)               │      │
│   │  Events: message:send, message:receive, user:online,    │      │
│   │          user:offline, typing:start, typing:stop,       │      │
│   │          session:request, session:confirm               │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │              Middleware Stack                           │      │
│   │  Auth Check → Rate Limit → Input Validate → Route      │      │
│   └─────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                  │
│                                                                     │
│   ┌──────────────────────┐    ┌──────────────────────────┐        │
│   │   PostgreSQL (Neon)  │    │   Cloudinary             │        │
│   │                      │    │   (Images / Files)       │        │
│   │  users               │    │   - profile photos       │        │
│   │  skills              │    │   - chat attachments     │        │
│   │  skill_offers        │    └──────────────────────────┘        │
│   │  skill_wants         │                                         │
│   │  matches             │    ┌──────────────────────────┐        │
│   │  messages            │    │   Redis (Upstash free)   │        │
│   │  conversations       │    │   - online presence      │        │
│   │  sessions            │    │   - rate limiting        │        │
│   │  reviews             │    │   - socket room mapping  │        │
│   │  credits             │    └──────────────────────────┘        │
│   │  notifications       │                                         │
│   └──────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                              │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │   Clerk    │  │  Resend    │  │  Google    │  │  HuggingFace│ │
│  │  (Auth)    │  │  (Email)   │  │  Gemini    │  │  (AI)      │  │
│  │  free tier │  │  free tier │  │  API free  │  │  free tier │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       HOSTING LAYER                                 │
│                                                                     │
│  ┌──────────────────────┐    ┌──────────────────────────┐        │
│  │   Vercel             │    │   Render                 │        │
│  │   (Next.js frontend) │    │   (Node.js API)          │        │
│  │   free tier          │    │   free tier              │        │
│  └──────────────────────┘    └──────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture (Frontend)

```
skill_swap_app/apps/web/
├── app/                          ← Next.js App Router
│   ├── (auth)/                   ← Auth route group (no navbar)
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (main)/                   ← Main app route group (with navbar)
│   │   ├── dashboard/page.tsx    ← Match feed + credit balance
│   │   ├── profile/
│   │   │   ├── [id]/page.tsx     ← Public profile view
│   │   │   └── edit/page.tsx     ← Edit own profile
│   │   ├── browse/page.tsx       ← Search + filter skills
│   │   ├── messages/
│   │   │   ├── page.tsx          ← Conversation list
│   │   │   └── [conversationId]/page.tsx ← Chat window
│   │   ├── sessions/
│   │   │   ├── page.tsx          ← Session management panel
│   │   │   └── [sessionId]/page.tsx
│   │   └── notifications/page.tsx
│   ├── api/                      ← Next.js API routes (thin proxy only)
│   │   └── webhooks/clerk/route.ts ← Clerk webhook handler
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                       ← shadcn/ui base components
│   ├── auth/
│   │   └── AuthGuard.tsx
│   ├── profile/
│   │   ├── ProfileCard.tsx
│   │   ├── SkillTagList.tsx
│   │   └── AvatarUpload.tsx
│   ├── matching/
│   │   ├── MatchFeed.tsx
│   │   ├── MatchCard.tsx
│   │   └── CompatibilityScore.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── OnlineIndicator.tsx
│   │   ├── ReadReceipt.tsx
│   │   └── TypingIndicator.tsx
│   ├── session/
│   │   ├── BookingModal.tsx
│   │   ├── SessionCard.tsx
│   │   ├── CreditEscrow.tsx
│   │   └── ConfirmSession.tsx
│   ├── credits/
│   │   ├── CreditBalance.tsx
│   │   └── CreditHistory.tsx
│   ├── reviews/
│   │   ├── ReviewForm.tsx
│   │   └── ReviewList.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── MobileNav.tsx
│
├── hooks/
│   ├── useSocket.ts              ← Socket.io connection management
│   ├── useOnlineUsers.ts         ← Track online presence
│   ├── useMessages.ts            ← Message state + optimistic updates
│   ├── useCredits.ts             ← Credit balance + transactions
│   └── useMatches.ts             ← Match feed data
│
├── lib/
│   ├── api-client.ts             ← Axios instance with auth headers
│   ├── socket-client.ts          ← Socket.io client singleton
│   └── utils.ts
│
└── store/
    └── index.ts                  ← Zustand global state
```

---

## API Architecture (Backend)

```
skill_swap_app/apps/api/
├── src/
│   ├── index.ts                  ← App entry + server boot
│   ├── app.ts                    ← Express app setup + middleware
│   ├── socket.ts                 ← Socket.io server setup
│   │
│   ├── routes/
│   │   ├── auth.routes.ts        ← /api/auth/*
│   │   ├── users.routes.ts       ← /api/users/*
│   │   ├── skills.routes.ts      ← /api/skills/*
│   │   ├── matches.routes.ts     ← /api/matches/*
│   │   ├── conversations.routes.ts ← /api/conversations/*
│   │   ├── messages.routes.ts    ← /api/messages/*
│   │   ├── sessions.routes.ts    ← /api/sessions/*
│   │   ├── credits.routes.ts     ← /api/credits/*
│   │   ├── reviews.routes.ts     ← /api/reviews/*
│   │   └── notifications.routes.ts
│   │
│   ├── controllers/              ← Request/response handlers
│   ├── services/                 ← Business logic (pure functions)
│   │   ├── matching.service.ts   ← Compatibility score algorithm
│   │   ├── credit.service.ts     ← Credit escrow + transfer
│   │   ├── notification.service.ts
│   │   └── ai.service.ts         ← AI feature integrations
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts    ← Clerk JWT verification
│   │   ├── rateLimit.middleware.ts
│   │   └── validate.middleware.ts ← Zod schema validation
│   │
│   ├── db/
│   │   ├── index.ts              ← Drizzle ORM client
│   │   ├── schema.ts             ← All table definitions
│   │   └── migrations/           ← SQL migration files
│   │
│   └── utils/
│       ├── errors.ts             ← Custom error classes
│       └── logger.ts
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Data Flow — Core Exchange Loop

```
 USER A (Teacher)                    PLATFORM                    USER B (Learner)
      │                                  │                              │
      │──── 1. Create profile ──────────►│                              │
      │                                  │◄─── 2. Create profile ───────│
      │                                  │                              │
      │◄─── 3. Match surfaced ───────────│──── 3. Match surfaced ──────►│
      │                                  │                              │
      │──── 4. Send chat message ───────►│                              │
      │                                  │──── 4. Deliver message ─────►│
      │◄─── 5. Reply received ───────────│◄─── 5. Send reply ───────────│
      │                                  │                              │
      │──── 6. Book session ────────────►│                              │
      │                                  │──── 6. Session request ─────►│
      │                                  │◄─── 7. Accept session ───────│
      │                                  │                              │
      │     [Credits held in escrow]     │                              │
      │                                  │                              │
      │          [ Session happens ]     │                              │
      │                                  │                              │
      │──── 8. Confirm complete ────────►│                              │
      │                                  │◄─── 8. Confirm complete ─────│
      │                                  │                              │
      │     [Credits transferred]        │                              │
      │◄─── +10 credits ─────────────────│──── -10 credits ────────────►│
      │                                  │                              │
      │──── 9. Leave review ────────────►│                              │
      │                                  │◄─── 9. Leave review ─────────│
```

---

## Real-Time Architecture (Socket.io)

```
┌─────────────┐          ┌──────────────────────┐         ┌─────────────┐
│  User A     │          │   Socket.io Server   │         │  User B     │
│  Browser    │          │   (Node.js)          │         │  Browser    │
└──────┬──────┘          └──────────┬───────────┘         └──────┬──────┘
       │                            │                             │
       │── connect ────────────────►│◄─────────── connect ───────│
       │                            │                             │
       │   Both join room:          │                             │
       │── join:conversation_id ───►│◄──── join:conversation_id ─│
       │                            │                             │
       │── message:send ───────────►│                             │
       │   { conversationId,        │──── message:receive ───────►│
       │     content, timestamp }   │   { id, senderId, content } │
       │                            │                             │
       │── typing:start ───────────►│──── typing:indicator ──────►│
       │── typing:stop ────────────►│──── typing:stop ───────────►│
       │                            │                             │
       │   [Message stored in DB]   │                             │
       │                            │                             │
       │   Online presence:         │                             │
       │── user:heartbeat ─────────►│                             │
       │                            │──── presence:update ───────►│
       │                            │   { userId, status:online } │
```

---

## Matching Algorithm — Flow

```
INPUT: userId wanting matches

STEP 1 — Fetch user's wants and offers from DB
  wants  = [skill_id_1, skill_id_2, ...]
  offers = [skill_id_3, skill_id_4, ...]

STEP 2 — Query candidates
  SELECT users WHERE
    they offer at least one skill in MY wants
    AND they have not been blocked by me
    AND they are not already matched with me

STEP 3 — Score each candidate (0–100)

  mutual_match_score (40 pts max)
    +40 if they want something I offer AND I want something they offer
    +20 if only one direction matches

  availability_score (20 pts max)
    overlap_hours = intersect(my_availability, their_availability)
    score = min(20, overlap_hours * 2)

  language_score (20 pts max)
    +20 if we share a language
    +0  if no shared language

  experience_score (10 pts max)
    +10 if experience levels are compatible (beginner ↔ intermediate/expert)
    +5  if same level

  reputation_score (10 pts max)
    based on their average rating and session count

STEP 4 — Sort by total score descending

STEP 5 — Return top 20 matches

OUTPUT: [{ userId, compatibilityScore, matchedSkills, sharedLanguages }]
```

---

## Credit System — State Machine

```
                    ┌─────────────┐
                    │   BALANCE   │
                    │  (integer)  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌───────────┐    ┌───────────────┐   ┌────────────┐
  │  EARNED   │    │   IN ESCROW   │   │   SPENT    │
  │ +10/hour  │    │ (locked until │   │ -10/hour   │
  │ of teach  │    │  confirmed)   │   │ of learn   │
  └───────────┘    └───────────────┘   └────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
             ┌──────────┐  ┌──────────┐
             │CONFIRMED │  │DISPUTED/ │
             │→ transfer│  │CANCELLED │
             │ credits  │  │→ refund  │
             └──────────┘  └──────────┘

Rules enforced server-side only:
- Credits cannot go below 0
- Escrow is atomic (both lock or neither)
- Transfer only fires when BOTH parties confirm
- Refund fires if session is cancelled before both confirm
```

---

## Security Architecture

```
Request Flow with Security Layers:

Browser → [HTTPS] → Vercel CDN → Next.js → [HTTPS] → Render → Express

Express Middleware Stack (in order):
1. helmet()           — Security headers
2. cors()             — Origin whitelist (frontend URL only)
3. express-rate-limit — 100 req/15min per IP
4. clerkMiddleware()  — JWT verification
5. validateRequest()  — Zod schema validation
6. route handler
7. errorHandler()     — Sanitized error responses

Authorization checks:
- Every route checks: is user authenticated?
- Every user-scoped route checks: does this resource belong to this user?
- Credit operations: always server-computed, never client-trusted
- Chat messages: sender ID always taken from JWT, never from body
```

---

*Architecture last reviewed: 2026-05-02*
