# 03 — Tech Stack

> Every technology listed here has a free tier sufficient for MVP.  
> Cost escalation points are documented. Zero surprises.

---

## Decision Principle

Choose tools that are:
1. **Free** — $0/month at MVP scale
2. **Proven** — used in production at real companies
3. **Well-documented** — strong community, good error messages
4. **Fast to ship** — minimal setup ceremony

---

## Full Stack Overview

| Layer | Technology | Why | Free Tier Limit |
|---|---|---|---|
| Frontend Framework | Next.js 14 (App Router) | SSR + SSG + API routes, Vercel-native | Unlimited on Vercel |
| UI Components | shadcn/ui + Tailwind CSS | Copy-paste components, no runtime bloat | Free, open source |
| State Management | Zustand | Lightweight, no boilerplate | Free, open source |
| Backend Framework | Node.js + Express | Fast setup, massive ecosystem | Free, self-hosted |
| ORM | Drizzle ORM | Type-safe, lightweight, fast migrations | Free, open source |
| Database | PostgreSQL (Neon) | Reliable relational DB, branching for dev | 0.5 GB storage free |
| Real-time | Socket.io | Industry standard for WebSocket abstraction | Free, open source |
| Auth | Clerk | Pre-built UI + webhooks + Google OAuth | 10,000 MAU free |
| Image Storage | Cloudinary | Generous free tier, transform on-the-fly | 25 GB storage + 25 GB bandwidth |
| Email | Resend | Developer-friendly, 3,000 emails/month free | 3,000/month |
| Cache / Presence | Upstash Redis | Serverless Redis, HTTP-based | 10,000 commands/day |
| Frontend Hosting | Vercel | Built for Next.js, preview deployments | Generous free tier |
| Backend Hosting | Render | Free web service (spins down when idle) | 750 hrs/month free |
| CI/CD | GitHub Actions | Free for public repos, 2000 min/month private | 2,000 min/month |
| Validation | Zod | Runtime + compile-time validation | Free, open source |
| HTTP Client | Axios | Industry standard, interceptor support | Free, open source |
| Testing (unit) | Vitest | Fast, Vite-native, Jest-compatible API | Free, open source |
| Testing (e2e) | Playwright | Cross-browser, free, powerful | Free, open source |
| Linting | ESLint + Prettier | Standard toolchain | Free, open source |
| TypeScript | TypeScript 5 | End-to-end type safety | Free, open source |

---

## Detailed Service Configs

### Neon (PostgreSQL)
- **Free tier:** 1 project, 1 main branch + unlimited dev branches, 0.5 GB storage
- **Connection:** Pooled via `@neondatabase/serverless` for serverless, direct for Node.js
- **Dev workflow:** Create a branch per feature, never dev on main DB branch
- **Escalation trigger:** >0.5 GB data → upgrade to $19/month (Pro)
- **Setup:** `neon.tech` → create project → copy `DATABASE_URL`

### Clerk (Auth)
- **Free tier:** 10,000 Monthly Active Users
- **Features used:** Email/password sign-up, Google OAuth, JWT sessions, webhooks
- **Webhook:** On `user.created` → create user record in our DB
- **Integration:** `@clerk/nextjs` on frontend, `@clerk/express` on backend
- **Escalation trigger:** >10,000 MAU → $25/month (Pro)

### Cloudinary (Images)
- **Free tier:** 25 GB storage, 25 GB monthly bandwidth, 25 credits/month for transformations
- **Usage:** Profile photos (auto-resize to 400×400), chat file uploads (images only for MVP)
- **Integration:** Direct upload from frontend using signed upload preset
- **Escalation trigger:** >25 GB storage → upgrade to $89/month (Plus)

### Resend (Email)
- **Free tier:** 3,000 emails/month, 1 domain
- **Usage:** Welcome email on sign-up, session reminders, notification digests
- **Integration:** REST API, no SDK required for basic use
- **Escalation trigger:** >3,000/month → $20/month (Pro)
- **Alternative:** Brevo (formerly Sendinblue) — 300 emails/day free

### Upstash Redis
- **Free tier:** 1 database, 10,000 commands/day, 256 MB max data
- **Usage:** Online presence tracking, rate-limit counters, socket room membership
- **Integration:** `@upstash/redis` HTTP client (works serverless + Node.js)
- **Escalation trigger:** >10,000 commands/day → $0.2 per 100K commands (Pay-as-you-go)

### Render (Backend Hosting)
- **Free tier:** 750 hrs/month per account (enough for 1 service 24/7), 512 MB RAM
- **Limitation:** Free services spin down after 15 min of inactivity, ~30s cold start
- **Solution for MVP:** Acceptable for demos. Use a free cron ping to keep alive if needed (UptimeRobot free tier)
- **Escalation trigger:** Need always-on → $7/month (Starter)
- **Alternative:** Railway ($5 free credit/month), Fly.io (3 free VMs)

### Vercel (Frontend Hosting)
- **Free tier:** Unlimited deployments, 100 GB bandwidth/month, 6,000 build minutes/month
- **Features used:** Preview deployments per PR, custom domain, edge functions
- **Escalation trigger:** >100 GB bandwidth → $20/month (Pro)

---

## AI Services (Free Tiers)

| Service | What We Use It For | Free Tier |
|---|---|---|
| Google Gemini API (Flash 1.5) | Skill tag suggestions, match explanation | 15 req/min, 1M tokens/day |
| HuggingFace Inference API | Skill similarity (semantic matching boost) | 1,000 req/day |
| OpenRouter (free models) | Content moderation fallback | Free models available |

Full AI integration details in `09_AI_INTEGRATIONS.md`.

---

## Development Tools

| Tool | Purpose | Install |
|---|---|---|
| pnpm | Package manager (faster than npm) | `npm install -g pnpm` |
| Turborepo | Monorepo build orchestration | `pnpm add -D turbo` |
| tsx | Run TypeScript directly (dev) | `pnpm add -D tsx` |
| nodemon | Auto-restart API server | Replaced by `tsx --watch` |
| dotenv-cli | Load .env files in scripts | `pnpm add -D dotenv-cli` |
| drizzle-kit | DB migrations CLI | `pnpm add -D drizzle-kit` |
| concurrently | Run frontend + backend together | `pnpm add -D concurrently` |

---

## Version Pins (as of project start)

```json
{
  "next": "14.2.x",
  "react": "18.3.x",
  "typescript": "5.4.x",
  "express": "4.19.x",
  "socket.io": "4.7.x",
  "drizzle-orm": "0.30.x",
  "zod": "3.22.x",
  "@clerk/nextjs": "5.x",
  "@clerk/express": "1.x",
  "zustand": "4.5.x",
  "tailwindcss": "3.4.x",
  "vitest": "1.5.x",
  "@playwright/test": "1.43.x"
}
```

Pin these versions. Do not auto-upgrade during the build phase. Upgrade only with intention.

---

## Environment Variables

Every service requires secrets. These must never be committed to git.

### Frontend (`apps/web/.env.local`)
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# API
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Cloudinary (public - safe to expose)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=skillswap_unsigned
```

### Backend (`apps/api/.env`)
```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@host/skillswap

# Clerk
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Resend
RESEND_API_KEY=re_...

# AI
GEMINI_API_KEY=AIza...
HUGGINGFACE_API_KEY=hf_...

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## Free Tier Monthly Cost Estimate

| Service | Free | Used For | Monthly Cost |
|---|---|---|---|
| Neon DB | ✓ | All data | $0 |
| Clerk | ✓ (<10k MAU) | Auth | $0 |
| Cloudinary | ✓ (<25GB) | Images | $0 |
| Resend | ✓ (<3k/mo) | Email | $0 |
| Upstash | ✓ (<10k cmd/day) | Cache | $0 |
| Vercel | ✓ (<100GB BW) | Frontend | $0 |
| Render | ✓ (<750h) | Backend | $0 |
| GitHub Actions | ✓ (<2k min) | CI/CD | $0 |
| **TOTAL MVP** | | | **$0/month** |

---

*Tech stack last reviewed: 2026-05-02*
