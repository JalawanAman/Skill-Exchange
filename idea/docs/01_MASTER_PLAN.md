# 01 — Master Plan

## Vision Statement

SkillSwap is a peer-to-peer skill exchange marketplace where skills are the currency.  
You teach what you know. You learn what you want. No money. No gatekeeping. No subscriptions.  
A credit system keeps the economy honest.  
Trust is built through verified profiles, transparent reviews, and real-time connection.

---

## Problem Being Solved

| Pain Point | Who Feels It | Current Workaround (broken) |
|---|---|---|
| Cannot afford paid tutors | Students, freelancers, emerging market users | YouTube (passive, no feedback) |
| Has skills but no platform to share | Everyone good at something | Posting on Reddit, hoping |
| No way to find the right person | Both sides | Facebook groups, cold DMs |
| No trust with strangers online | Both sides | Nothing — people just don't |
| Skills are locked behind paywalls | Learners globally | Piracy, low-quality free content |

---

## The Core Loop (Must Never Be Broken)

```
User signs up
     ↓
User lists skills offered + skills wanted
     ↓
Algorithm surfaces mutual matches
     ↓
Users connect via real-time chat
     ↓
Session booked (credits in escrow)
     ↓
Session happens
     ↓
Both confirm → credits transfer → reviews left
     ↓
Reputation builds → better matches → more sessions
```

Every feature built must serve this loop. If a feature does not touch this loop, it is low priority.

---

## Platform Identity

- **Name:** SkillSwap
- **Tagline:** Trade skills. Not money.
- **Category:** EdTech / Marketplace / Social
- **Model:** Freemium with credit top-ups
- **Target v1 niche:** Tech skills (developers, designers, data)
- **Long-term target:** Global, all skill categories

---

## Product Phases Summary

| Phase | Weeks | What Gets Built | End State |
|---|---|---|---|
| 1 — Foundation | 1–3 | Auth, profiles, DB schema | Users can sign up and create profiles |
| 2 — Core Product | 4–6 | Skills, search, matching, credits | Users can find and request each other |
| 3 — Live Chat | 7–8 | Real-time messaging, presence | Users can talk in real time |
| 4 — Bookings & Credits | 9–10 | Session booking, escrow, confirmation | Full exchange loop works end-to-end |
| 5 — Polish & Launch | 11–12 | Reviews, notifications, mobile polish, deploy | Live on the internet, shareable |

---

## Success Criteria (MVP)

The MVP is complete when all of the following are true:

- [ ] A new user can sign up, build a profile, and list skills in under 5 minutes
- [ ] The matching algorithm surfaces at least one relevant match for a new user
- [ ] Two users can exchange real-time messages without page refresh
- [ ] A session can be booked, confirmed, and credits transferred automatically
- [ ] Both users can leave a review after session completion
- [ ] The platform runs live on the internet at zero monthly cost
- [ ] The platform is fully usable on a mobile device (375px viewport)
- [ ] All 5 milestone gates have been passed

---

## Out of Scope for MVP

The following are explicitly NOT in MVP. They go in the post-launch backlog.

- Native mobile apps (iOS / Android)
- Built-in video calling (links to Zoom/Meet instead)
- Premium subscription billing (Stripe integration deferred)
- Credit purchasing with real money (deferred)
- Admin dashboard
- Verified skill badge feature (assessment flow)
- Group sessions
- Skill courses / async content library
- Push notifications (browser only for MVP)
- Email transactional system (basic email only via free tier)

---

## Monetization Roadmap (Post-MVP)

| Revenue Stream | Timeline | Monthly Potential |
|---|---|---|
| Premium membership ($8/mo) | Post-launch month 2 | Scales with users |
| Credit top-ups ($1–2/credit) | Post-launch month 2 | Transaction-based |
| Verified skill badges ($12 one-time) | Post-launch month 3 | Per-user |
| Acquisition by edtech co. | 18–24 months | $120k–$300k exit |

---

## Competitive Position

| Platform | What they do | SkillSwap advantage |
|---|---|---|
| Udemy / Coursera | Paid video courses | Free, interactive, personalized |
| Preply / iTalki | Paid tutors | No money required |
| Reddit / Facebook groups | Informal skill sharing | Structured, trusted, accountable |
| Barterchain (dead) | Skill barter attempt | Modern design, live chat, matching |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cold start problem (no users = no matches) | High | High | Launch in a single tight community first (university, Discord) |
| Credit system abuse (fake sessions to farm credits) | Medium | High | Both parties must confirm; reviews required; escrow held |
| No-show / ghosting | Medium | Medium | Credit stays in escrow until confirmed; report system |
| Free tier limits exceeded | Low | Medium | Monitor usage; paid tiers kick in when revenue covers cost |
| Matching fails for niche skills | Medium | Medium | Manual browse as fallback always available |
| Real-time chat complexity | High | Medium | Socket.io is well-documented; dedicate full 2 weeks to it |

---

## Directory Structure

```
Skill-Exchange/                   ← git repo root (agent + founder territory)
├── idea/
│   └── docs/                     ← Founder Docs (the brain)
├── .gitignore                    ← repo root gitignore
└── skill_swap_app/               ← codebase (monorepo)
    ├── apps/
    │   ├── web/                  ← Next.js 14 frontend → Vercel
    │   │   ├── .env.local        ← frontend secrets (gitignored)
    │   │   └── .env.example      ← frontend env template (committed)
    │   └── api/                  ← Node.js + Express backend → Render
    │       ├── .env              ← backend secrets (gitignored)
    │       └── .env.example      ← backend env template (committed)
    ├── packages/
    │   └── shared/               ← Shared types (TypeScript interfaces)
    ├── scratch/                  ← temp test scripts (NOT committed to git)
    │   ├── frontend/             ← quick UI/Cloudinary/Clerk checks
    │   └── backend/              ← quick DB/socket/API key checks
    ├── .github/
    │   └── workflows/            ← GitHub Actions CI
    ├── package.json              ← workspace root (pnpm)
    └── turbo.json
```

> **Rule:** All product code goes inside `skill_swap_app/`. The `idea/` folder is founder/agent territory — devs do not touch it.

> **Rule:** The `tests/` folder at root is a **scratch pad only** — temporary scripts for checking connections, testing a query, verifying an API key works, etc. It is in `.gitignore` and never committed. Anything that needs to be permanent belongs inside `skill_swap_app/apps/api/tests/` or `skill_swap_app/apps/web/tests/` instead.

---

*This document is orientation. For implementation details, see the phase-specific documents.*
