# Pending Tasks — Deferred Work Tracker

This file tracks work that was **intentionally deferred** to a later milestone, each with a
**strict trigger condition**. The agent MUST check this file at the start of any milestone named
in a trigger, and proactively remind the founder when a trigger condition is met.

> Rule: nothing here is "forgotten." If a trigger condition is hit, the agent raises it **before**
> doing other milestone work — not when convenient.

---

## PT-001 — Build `/onboarding` page and restore the after-sign-up redirect

| | |
|---|---|
| **Status** | ⏸ Deferred — waiting on trigger |
| **Created** | 2026-06-21 |
| **Deferred during** | M1 (Auth & Infrastructure) |
| **Trigger** | Start of **M2 — Profiles & Onboarding**, specifically the task *"Build onboarding flow (`/onboarding`)"* |
| **Owner** | Jalawan (founder) + agent |

### Background
After sign-up, Clerk redirects users to whatever `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` points to.
That was set to `/onboarding`, but **no `/onboarding` route exists yet** (it's M2 work), so the
deployed site returned a **404** at `https://skill-exchange-amber.vercel.app/onboarding`.

### Temporary fix already applied (2026-06-21)
To unblock the live sign-up flow, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` was repointed to `/dashboard`:
- ✅ `skill_swap_app/apps/web/.env.local` — updated to `/dashboard`
- ✅ Vercel project env var — updated to `/dashboard` by founder (then redeployed)

New users currently land on `/dashboard` after sign-up, same as returning users.

### What to do when the trigger fires (M2)
1. **Build the onboarding page** at `apps/web/src/app/(protected)/onboarding/page.tsx`
   (full 5-step flow per `idea/docs/07_MILESTONES.md` → M2: display name/timezone/location/languages,
   ≥1 skill offer, ≥1 skill want, availability, Cloudinary profile photo).
2. **Repoint the redirect back to `/onboarding`** in BOTH places:
   - `skill_swap_app/apps/web/.env.local`
   - Vercel project env vars (Production + Preview)
3. **Redeploy** — `NEXT_PUBLIC_*` is baked at build time, so the change is inert until a rebuild.
4. Add the "new user → `/onboarding`, returning user → `/dashboard`" branching logic so only
   *new* users hit onboarding (satisfies gate test **M2-T01** / **M2-T03**).

### Done when
- `/onboarding` resolves (no 404), gate tests **M2-T01** and **M2-T03** pass, and the env var
  in both `.env.local` and Vercel reads `/onboarding` again.

---

<!-- Add new deferred tasks below as PT-002, PT-003, … Keep the strict-trigger format. -->
