# Build Progress

**Founder:** Jalawan Aman Khan  
**Last updated:** 2026-06-24  
**Current phase:** M1 — Auth & Infrastructure Setup (closing out)

---

## Overall Status

```
[■■■■■■■■■] M1 ~95% — full auth + backend live; only T05 tweak + 2 manual checks left
```

| Milestone | Status | Gate Passed | Notes |
|---|---|---|---|
| Founder Docs | ✅ Complete | — | All 10 docs written |
| Repo & Monorepo | ✅ Complete | — | pnpm workspaces, Turborepo, branches |
| M1 — Auth & Setup | 🔄 Closing | ⏳ near | Backend live, webhook + users/me + dashboard working; quality gates green |
| M2 — Profiles | ⬜ Not started | ❌ | Triggers PT-001 (onboarding redirect) |
| M3–M9 | ⬜ Not started | ❌ | |

---

## What Is Done

### Repo & Monorepo (`skill_swap_app/`)
- pnpm workspaces + Turborepo; shared types package; web + api scaffolded
- Branch strategy: `main ← staging ← dev ← feat/*`. **`dev` is the deploy/integration branch.**

### M1 — Auth & Infrastructure
- **Clerk** — email/password + Google OAuth; `ClerkProvider`, middleware auth guard (redirects unauth → sign-in) ✅
- **Neon DB** — `users`, `credit_transactions` tables live; `logs` table added ✅
- **Clerk webhook** (`POST /webhooks/clerk`) — Svix-verified, **idempotent**, creates user + **20 credit** signup bonus; proven end-to-end (Google OAuth signup) ✅
- **`GET /api/users/me`** — 401 unauth / profile authed; Clerk middleware on routes ✅
- **Dashboard** — renders live DB data (name, credits) via server-side authed fetch ✅
- **Logging system** — DB-backed (`logs` table) + console, 7-day retention, `pnpm logs` reader ✅
- **Deployments** — API on **Railway**, web on **Vercel**, both auto-deploy `dev` (Vercel: prod branch `dev`, only-prod builds) ✅
- **Quality** — `tsc` clean both apps; **ESLint** configured + passing (api: v9 flat; web: v8 + next config); **`.env.example`** audited/fixed ✅
- **CI** — GitHub Actions runs lint + typecheck on every push/PR (first run green) ✅

### GATE M1 status
- **A (functional):** T02 ✅ · T03 ✅ · T04 ✅ · T06 ✅ · T07 ✅ · T01 ⏳ (email/pw — same webhook path as OAuth, explicit test pending) · T05 ⏳ (sign-out → `/sign-in` tweak pending)
- **B (quality):** Q01 ✅ · Q02 ✅ · Q03 ✅
- **C (manual):** C01 ✅ (mobile — functional, Clerk components responsive) · C02 ✅ (desktop) · C03 ⏳ (console-errors glance pending)

---

## What Is Next (to close M1)

1. **T05** — change sign-out redirect from `/` to `/sign-in` (1-line, pending founder's OK)
2. **T01** — one explicit email/password signup to confirm (path already proven via OAuth)
3. **C03** — quick browser-console glance after sign-in
4. Then: M1 gate fully green → start **M2 — Profiles & Onboarding** (triggers PT-001)

---

## Blockers

- None. (Earlier webhook-testing blocker resolved: deployed to Railway, registered Clerk webhook, fixed secret + `db.batch`.)

---

## Key Decisions Made So Far

→ See `decisions/DECISIONS.md` for full log. Recent: API deploy moved Render → Railway; webhook lives at `/webhooks/clerk` (not doc's `/api/auth/sync`); signup bonus 20 credits (schema doc 04).
