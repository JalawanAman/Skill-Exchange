# Build Progress

**Founder:** Jalawan Aman Khan  
**Last updated:** 2026-07-05  
**Current phase:** M3 — Skills, Matching & Browse ✅ built & deployed (smoke-verified) · M4 next

> **Testing note:** We're building **feature-first** — functionality now, deep
> testing + UI polish later. "Done" below means **built, deployed, and
> smoke-verified** (happy path + data persistence checked), **not** thoroughly
> QA'd or edge-tested. Treat gate ticks as "implemented & working in a basic run."

---

## Overall Status

```
[■■■■■■■■■■] M1 done (gate green) · M2 built & deployed · M3 built & deployed · M4 next
```

| Milestone | Status | Notes |
|---|---|---|
| M1 — Auth & Setup | ✅ Done (gate green) | Full auth + backend live |
| M2 — Profiles & Onboarding | ✅ Built & deployed | Functional; deep QA/polish deferred |
| Architecture hardening | ✅ Done | Text-ID convention documented; neon-serverless transactions |
| M3 — Skills, Matching & Browse | ✅ Built & deployed | Matching engine live; AI skill-tags deferred |
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

## Next
1. **M4 — next milestone** (see `idea/docs/` roadmap) — begin after M3 sign-off.

## Blockers
- None.

## Decisions
→ See `decisions/DECISIONS.md`. Recent: Render→Railway; webhook at `/webhooks/clerk`; 20-credit bonus; text-ID convention; neon-serverless driver; **M3 directional matches** (one row per viewer, diverges from doc 04's symmetric model — enables simple feed + independent dismiss).
