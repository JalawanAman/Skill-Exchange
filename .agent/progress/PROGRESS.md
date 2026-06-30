# Build Progress

**Founder:** Jalawan Aman Khan  
**Last updated:** 2026-06-28  
**Current phase:** M2 — Profiles & Onboarding ✅ built & deployed (light verification only) · M3 next

> **Testing note:** We're building **feature-first** — functionality now, deep
> testing + UI polish later. "Done" below means **built, deployed, and
> smoke-verified** (happy path + data persistence checked), **not** thoroughly
> QA'd or edge-tested. Treat gate ticks as "implemented & working in a basic run."

---

## Overall Status

```
[■■■■■■■■■■] M1 done (gate green) · M2 built & deployed · architecture hardened · M3 next
```

| Milestone | Status | Notes |
|---|---|---|
| M1 — Auth & Setup | ✅ Done (gate green) | Full auth + backend live |
| M2 — Profiles & Onboarding | ✅ Built & deployed | Functional; deep QA/polish deferred |
| Architecture hardening | ✅ Done | Text-ID convention documented; neon-serverless transactions |
| M3 — Skills, Matching & Browse | ⬜ Next | |
| M4–M9 | ⬜ | |

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

## Next
1. **M3 — Skills, Matching & Browse** — matching engine (complementary skills) + browse/search.

## Blockers
- None.

## Decisions
→ See `decisions/DECISIONS.md`. Recent: Render→Railway; webhook at `/webhooks/clerk`; 20-credit bonus; text-ID convention; neon-serverless driver.
