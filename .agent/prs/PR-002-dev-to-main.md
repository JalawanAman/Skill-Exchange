# PR-002 — M1 Promotion: dev → main

**Branch:** `dev` → `main`  
**Merge plan:** Promote the M1 work from `dev` to `main` (production). Assumes PR-001 (`feat/m1-setup` → `dev`) is already merged.  
**Date:** 2026-06-20  
**Milestone:** M1 — Auth & Infrastructure  
**Status:** Pending — blocked on M1 gate completion

---

## Summary

Promotes the completed M1 milestone from `dev` up to `main` (production). Once merged, `main` carries the full monorepo, Clerk auth, Neon DB + Drizzle schema, the Clerk webhook, and the Railway/Vercel deploy config.

By project law, **`main` is always deployable** (`00_RULES_AND_GATES.md` Rule 9) and **production deploys only after all milestone gates pass** (§4). This PR should therefore merge only once the M1 gate is fully green.

---

## What's Included

The full M1 changeset (same body as PR-001):

- **Monorepo** — pnpm workspaces + Turborepo; `apps/api`, `apps/web`, `packages/shared`
- **Auth (Clerk)** — wired into Next.js (provider, middleware, sign-in/up, dashboard) and Express (`clerkMiddleware`); webhook `POST /webhooks/clerk` (Svix-verified `user.created/updated/deleted`)
- **Database (Neon + Drizzle)** — `users` + `credit_transactions` schema, first migration pushed
- **API (Express)** — `trust proxy`, health check before auth, rate limiter, error classes
- **Frontend (Next.js)** — homepage, sign-in/up, dashboard, Tailwind, `api-client.ts`
- **Deployment** — Railway (API) + Vercel (web) config

---

## Promotion Path

```
feat/m1-setup ──(PR-001)──▶ dev ──(PR-002, this PR)──▶ main
```

> Note: `staging` sits between `dev` and `main` in the branch chain per `00_RULES_AND_GATES.md` §4. This PR documents the **direct `dev` → `main`** promotion as requested. If you want the full chain instead, promote `dev` → `staging` → `main`.

---

## Gate (M1) — must pass before merging to main

| Check | Status |
|---|---|
| API `/health` returns 200 (live on Railway) | ✅ |
| Clerk connection verified | ✅ |
| Neon DB connection verified, tables migrated | ✅ |
| API deployed and live on Railway | ✅ |
| Frontend deployed and accessible on Vercel | ⚠️ currently 404 |
| `GET /api/users/me` implemented (M1-T03 / M1-T04) | ❌ routes still commented out |
| Webhook tested end-to-end (`user.created` → DB row) | ⚠️ unverified |
| Credit amount matches the contract | ⚠️ code grants 100, schema doc says 20 |

---

## Blockers before this can merge to main

1. **Vercel frontend 404** — fix Root Directory (`skill_swap_app/apps/web`) + Clerk/API env vars
2. **`GET /api/users/me` not implemented** — `/api/*` routes are commented out in `app.ts`
3. **Webhook end-to-end test** — confirm a real Clerk event creates a user row in Neon
4. **Credit drift decision** — reconcile `100` (code) vs `20` (`04_DATABASE_SCHEMA.md`) per the Gate Failure Protocol

---

*Once these are green, this promotion keeps `main` deployable and honors the gate rules.*
