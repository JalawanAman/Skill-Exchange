# Decision Log

Every significant architectural, product, or structural decision is logged here.  
Format: decision made → why → alternatives considered.

---

## D-001 — Monorepo over separate repos
**Date:** 2026-05-02  
**Decision:** One git repo (`Skill-Exchange/`) containing both frontend and backend  
**Why:** Same TypeScript stack end to end, shared types between `apps/web` and `apps/api`, single CI pipeline, small team (Jalawan building alone with agent)  
**Alternatives considered:** Separate repos per app  
**Why rejected:** No benefit at this scale. More overhead, no shared types, docs would be disconnected  

---

## D-002 — Render over Cloudflare Workers for backend
**Date:** 2026-05-02  
**Decision:** Node.js backend hosted on Render free tier  
**Why:** Socket.io requires a persistent process. Cloudflare Workers are stateless — they kill the connection between requests. Real-time chat is the core feature and cannot be compromised  
**Alternatives considered:** Cloudflare Workers  
**Why rejected:** No persistent WebSocket support without Durable Objects, which adds significant complexity for an MVP  

---

## D-003 — Hybrid HTTP + WebSocket approach
**Date:** 2026-05-02  
**Decision:** REST API (Express) for actions, Socket.io for real-time events — both on same server/port  
**Why:** REST is better for request/response patterns (booking, profile update, search). WebSocket is better for push events (messages, presence, notifications). Using only WebSocket would mean reinventing HTTP badly  
**Alternatives considered:** WebSocket only, polling  
**Why rejected:** Polling is wasteful and laggy. WebSocket-only loses all HTTP tooling benefits  

---

## D-004 — Clerk for authentication
**Date:** 2026-05-02  
**Decision:** Clerk handles all auth (email/password + Google OAuth)  
**Why:** Pre-built UI, webhook support for syncing users to our DB, JWT session management, 10k MAU free — saves 1–2 weeks of building auth from scratch  
**Alternatives considered:** NextAuth (Auth.js), Supabase Auth, custom JWT  
**Why rejected:** NextAuth requires more setup and lacks the pre-built UI. Custom JWT is risky and time-consuming for MVP  

---

## D-005 — Drizzle ORM over Prisma
**Date:** 2026-05-02  
**Decision:** Drizzle ORM for database access  
**Why:** Lightest ORM in the ecosystem, generates clean SQL, excellent TypeScript inference, fast migrations via drizzle-kit  
**Alternatives considered:** Prisma, raw SQL  
**Why rejected:** Prisma has a heavier runtime and slower cold starts (important for free tier). Raw SQL loses type safety  

---

## D-006 — All AI features are optional enhancements
**Date:** 2026-05-02  
**Decision:** Every AI feature has a fallback — if the AI API is down, the core platform keeps working  
**Why:** Free AI APIs have rate limits and occasional downtime. The product cannot depend on them for core functionality  
**Pattern:** Every AI call wrapped in `withAIFallback(aiCall, fallback, featureName)`  

---

## D-007 — `Skill-Exchange/` as repo root, `skill_swap_app/` as codebase
**Date:** 2026-05-05  
**Decision:** Outer dir is agent + founder territory (docs, .agent/). Inner `skill_swap_app/` is the actual codebase  
**Why:** Clear separation between product thinking layer and implementation layer. Agents and devs know exactly where they operate  

---

## D-008 — `scratch/` inside `skill_swap_app/` for temp testing
**Date:** 2026-05-05  
**Decision:** `skill_swap_app/scratch/frontend/` and `skill_swap_app/scratch/backend/` for throwaway test scripts  
**Why:** Need a place to quickly verify DB connections, API keys, socket behavior without cluttering the real test suite  
**Rules:** Gitignored. Never permanent. Real tests live in `apps/api/tests/` and `apps/web/tests/`  

---

## D-009 — Per-app `.env` files, not a root `.env`
**Date:** 2026-05-05  
**Decision:** `apps/web/.env.local` for frontend, `apps/api/.env` for backend  
**Why:** Each app has different secrets. Frontend only needs public keys. Backend holds all sensitive keys. Mixing them at root risks exposing backend secrets to frontend builds  

---

## D-010 — Railway over Render for API hosting
**Date:** 2026-05-16  
**Decision:** Switched from Render to Railway for API deployment  
**Why:** Render now requires a credit card even for free tier web services — $0 infra rule broken  
**Alternatives considered:** Render (original plan), Fly.io  
**Why rejected:** Render needs card. Railway has a true no-card free tier  

---

## D-011 — Use corepack to activate pnpm on Railway (not npm install -g)
**Date:** 2026-05-16  
**Decision:** Use `corepack enable && corepack prepare pnpm@10.33.3 --activate` in Railway build command  
**Why:** Railway/Nixpacks build environment runs each command in its own shell layer. `npm install -g pnpm` installs pnpm but the global bin path (`$(npm prefix -g)/bin`) is not automatically added to PATH in subsequent commands — so `pnpm` is found but not executable (exit code 127). Corepack is built into Node 20, activates pnpm directly into the system PATH, and survives across shell steps.  
**Root cause of 8 failed builds:** Assumed global npm install would put pnpm on PATH — it does locally but not inside Docker build layers used by Nixpacks  
**Fix that worked:** `corepack enable && corepack prepare pnpm@10.33.3 --activate && cd skill_swap_app && pnpm install --no-frozen-lockfile && pnpm --filter @skillswap/api build`  

---

*Add new decisions as D-012, D-013, etc.*
