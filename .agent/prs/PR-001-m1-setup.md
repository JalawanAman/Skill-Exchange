# PR-001 — M1: Auth & Infrastructure Setup

**Branch:** `feat/m1-setup` → `dev` (then promoted up the chain `dev` → `staging` → `main`)  
**Merge plan:** Merge this PR into `dev` first. Promote `dev` → `staging` → `main` afterward, as gates pass.  
**Date:** 2026-05-16  
**Milestone:** M1 — Auth & Infrastructure  
**Status:** Ready to merge

---

## Summary

This PR completes the full M1 milestone — monorepo scaffolding, Clerk auth, Neon DB, Drizzle schema, first migration, webhook endpoint, and deployment of both API (Railway) and web (Vercel).

---

## What's Included

### Monorepo Setup
- pnpm workspaces + Turborepo configured
- `apps/api/`, `apps/web/`, `packages/shared/` scaffolded
- All dependencies installed
- Shared TypeScript types package

### Authentication (Clerk)
- Clerk wired into Next.js — `ClerkProvider`, middleware, sign-in/sign-up pages, protected dashboard
- Clerk wired into Express — `clerkMiddleware()` with explicit key passing
- Webhook endpoint `POST /webhooks/clerk` — verifies Svix signature, handles `user.created`, `user.updated`, `user.deleted`

### Database (Neon + Drizzle)
- Neon PostgreSQL project created (Singapore region)
- Drizzle schema: `users` + `credit_transactions` tables with enums
- First migration pushed via `drizzle-kit push:pg` — tables live on Neon
- ID generator utility (`src/lib/ids.ts`)

### API (Express)
- `trust proxy` set for Railway compatibility
- Health check moved before Clerk middleware
- Rate limiter configured
- Webhook route mounted before JSON body parser (raw body required for Svix)
- Custom error classes

### Frontend (Next.js)
- Homepage with Sign In / Get Started buttons
- Tailwind CSS configured
- `api-client.ts` with Axios + Clerk token interceptor
- DOM lib added to tsconfig

### Deployment
- API deployed to **Railway** — `https://skill-exchange-production-4d9e.up.railway.app`
- `railway.json` + `nixpacks.toml` for build config
- Web deployed to **Vercel** — `https://skill-swap-ochre-beta.vercel.app`

---

## Commits

```
f028c1b fix(web): add dom lib to tsconfig, fix middleware return type
6b58474 fix(api): pass Clerk keys explicitly, move health check before auth middleware
319d90c fix(api): trust proxy for Railway, fixes rate-limit X-Forwarded-For error
3f26316 fix(deploy): use corepack to activate pnpm instead of npm global install
924d593 fix(deploy): export pnpm PATH after global install
579e10f fix(deploy): move all build steps to build phase, clear install phase
7ac5364 fix(deploy): chain pnpm install in single shell command
95179e0 fix(deploy): drop frozen-lockfile flag for Railway pnpm install
04d2bcf fix(deploy): override npm_install phase to force pnpm in nixpacks
625e357 feat(deploy): add Railway and Nixpacks config for API deployment
fd8f414 feat(m1): wire Clerk auth, Neon DB, Drizzle schema, and first migration
c6bab8f feat(m1): install dependencies and scaffold monorepo workspaces
```

---

## Gates (M1)

- [x] API `/health` returns 200
- [x] Clerk connection verified
- [x] Neon DB connection verified
- [x] Tables migrated to Neon
- [x] API deployed and live on Railway
- [ ] Webhook tested end-to-end (pending — needs Clerk webhook registered with Railway URL)
- [ ] Frontend deployed and accessible on Vercel (pending env vars)
- [ ] Sign-up flow creates user row in DB

---

## Known Issues / Follow-up

- Clerk webhook not yet registered in Clerk dashboard (needs Vercel URL first for FRONTEND_URL, then register webhook)
- `FRONTEND_URL` in Railway needs updating to Vercel production URL after deploy
