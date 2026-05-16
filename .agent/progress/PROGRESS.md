# Build Progress

**Founder:** Jalawan Aman Khan  
**Last updated:** 2026-05-12  
**Current phase:** M1 — Auth & Infrastructure Setup (in progress)

---

## Overall Status

```
[■■■□□□□□□] M1 ~60% done — Clerk + Neon wired, webhook + deploy pending
```

| Milestone | Status | Gate Passed | Notes |
|---|---|---|---|
| Founder Docs | ✅ Complete | — | All 10 docs written |
| Repo & Monorepo | ✅ Complete | — | pnpm workspaces, Turborepo, branches |
| M1 — Auth & Setup | 🔄 In progress | ❌ | Clerk + Neon done, webhook pending deploy |
| M2 — Profiles | ⬜ Not started | ❌ | |
| M3 — Matching | ⬜ Not started | ❌ | |
| M4 — Connections | ⬜ Not started | ❌ | |
| M5 — Live Chat | ⬜ Not started | ❌ | |
| M6 — Bookings | ⬜ Not started | ❌ | |
| M7 — Credits | ⬜ Not started | ❌ | |
| M8 — Reviews & Notifications | ⬜ Not started | ❌ | |
| M9 — Polish & Launch | ⬜ Not started | ❌ | |

---

## What Is Done

### Founder Docs (`idea/docs/`)
- All 10 docs written (README, rules, plan, architecture, stack, schema, API spec, requirements, milestones, testing, AI, deployment)

### Repo & Monorepo (`skill_swap_app/`)
- pnpm workspaces + Turborepo configured
- Branch strategy: main → staging → dev → feat/m1-setup (active)
- All deps installed (`pnpm install` complete)
- Shared types package (`@skillswap/shared`) scaffolded
- `apps/api/` and `apps/web/` fully scaffolded with configs

### M1 — Auth & Infrastructure
- **Clerk** — account created, keys in `.env` files, connection verified ✅
- **Clerk → Next.js** — `ClerkProvider` in layout, middleware protecting routes, sign-in/sign-up pages, dashboard page ✅
- **Neon DB** — project created (Singapore), `DATABASE_URL` in `.env`, connection verified ✅
- **Drizzle schema** — `users` + `credit_transactions` tables written ✅
- **First migration** — `drizzle-kit push:pg` ran successfully, tables live on Neon ✅
- **Tailwind** — config + PostCSS set up, globals.css created ✅

---

## What Is Next (M1 remaining)

1. Write Clerk webhook endpoint (`POST /webhooks/clerk`) — code only, no test yet
2. Wire Express properly — ensure dotenv loads, routes mounted, health check works
3. Deploy API to **Render** — get permanent public URL
4. Register Clerk webhook in dashboard with Render URL → test live
5. Deploy web to **Vercel**
6. Run M1 gate tests

---

## Blockers

- Clerk webhook cannot be tested locally (no static public URL without paid ngrok)
- Decision: write webhook code now, test after Render deploy

---

## Key Decisions Made So Far

→ See `decisions/DECISIONS.md` for full log
