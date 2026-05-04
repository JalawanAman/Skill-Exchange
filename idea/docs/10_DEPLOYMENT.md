# 10 — Deployment Plan

> Zero cost. Zero surprises.  
> Everything needed to take SkillSwap from local dev to live on the internet.

---

## Infrastructure Map

```
GitHub Repository
       │
       ├── Push to main branch
       │
       ├── GitHub Actions CI runs
       │   ├── TypeCheck
       │   ├── Lint
       │   └── Vitest Tests
       │
       ├── Vercel (Frontend)
       │   ├── Auto-deploys on every push to main
       │   ├── Preview URL for every PR
       │   └── Production URL: skillswap.vercel.app (or custom domain)
       │
       └── Render (Backend)
           ├── Auto-deploys on every push to main
           └── Production URL: skillswap-api.onrender.com
```

---

## Phase 1 — Local Development Setup

### Step 1: Prerequisites

```bash
# Install required tools
node --version    # must be 20.x or higher
pnpm --version    # install: npm install -g pnpm
git --version
```

### Step 2: Clone and Install

```bash
git clone https://github.com/yourusername/skillswap.git
cd skillswap/skill_swap_app
pnpm install
```

### Step 3: Create Environment Files

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Fill in all values — see `03_TECH_STACK.md` for where to get each key.

### Step 4: Set Up External Services (one-time)

#### Neon DB
1. Go to `neon.tech` → Create free account
2. Create project: `skillswap`
3. Create branch: `dev` (keep `main` for production)
4. Copy connection string → paste as `DATABASE_URL` in `apps/api/.env`

#### Clerk
1. Go to `clerk.com` → Create free account
2. Create application: `SkillSwap`
3. Enable: Email/password + Google OAuth
4. Copy publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
5. Copy secret key → `CLERK_SECRET_KEY` (API) + `apps/web/.env.local`
6. Configure webhook (after backend is deployed — see Phase 3 Step 2)

#### Cloudinary
1. Go to `cloudinary.com` → Create free account
2. Copy Cloud Name → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
3. Copy API Key + Secret → backend env
4. Create unsigned upload preset named `skillswap_unsigned`
   - Settings → Upload → Upload Presets → Add preset
   - Mode: Unsigned
   - Folder: `skillswap`
   - Max file size: 5MB
   - Allowed formats: jpg, png, webp, gif

#### Upstash Redis
1. Go to `upstash.com` → Create free account
2. Create database: `skillswap-cache`
3. Copy REST URL and Token → backend env

#### Resend
1. Go to `resend.com` → Create free account
2. Add your domain or use Resend's test domain
3. Copy API key → `RESEND_API_KEY`

#### Google Gemini
1. Go to `aistudio.google.com` → Get API key (free)
2. Copy → `GEMINI_API_KEY`

#### HuggingFace
1. Go to `huggingface.co` → Create free account
2. Settings → Access Tokens → New token (read)
3. Copy → `HUGGINGFACE_API_KEY`

### Step 5: Run Database Migrations

```bash
cd apps/api
pnpm drizzle-kit push:pg    # applies schema to Neon dev branch
pnpm seed                   # seeds skills table + test users
```

### Step 6: Start Development Servers

```bash
# From monorepo root — starts both frontend and backend
pnpm dev

# Frontend runs on: http://localhost:3000
# Backend runs on:  http://localhost:4000
```

---

## Phase 2 — Staging Deployment

Staging happens automatically on every push to `main` via GitHub Actions + Vercel/Render.

### Vercel (Frontend) Setup

1. Go to `vercel.com` → Import GitHub repository
2. Set root directory: `skill_swap_app/apps/web`
3. Framework preset: Next.js
4. Add all environment variables from `apps/web/.env.local`
   - Note: Set `NEXT_PUBLIC_API_URL` to your Render backend URL
5. Deploy

**Every PR** gets a unique preview URL automatically — perfect for review.

### Render (Backend) Setup

1. Go to `render.com` → New Web Service
2. Connect GitHub repository
3. Settings:
   - Root directory: `skill_swap_app/apps/api`
   - Build command: `pnpm install && pnpm build`
   - Start command: `pnpm start`
   - Environment: Node
4. Add all environment variables from `apps/api/.env`
   - Set `FRONTEND_URL` to your Vercel URL
   - Set `NODE_ENV` to `production`
5. Deploy

**Note on Render free tier spin-down:**  
Free services sleep after 15 min of inactivity. First request takes ~30s.  
Fix: Set up UptimeRobot to ping `https://skillswap-api.onrender.com/health` every 5 min.

### Health Check Endpoint

Add to Express app:
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
```

---

## Phase 3 — Clerk Webhook Configuration

After backend is deployed to Render:

1. Clerk Dashboard → Webhooks → Add Endpoint
2. URL: `https://skillswap-api.onrender.com/api/auth/sync`
3. Events: `user.created`
4. Copy Signing Secret → `CLERK_WEBHOOK_SECRET` in Render environment variables

---

## Phase 4 — Production Database

1. In Neon, create a **production branch** from `main`
2. Run migrations against production:
   ```bash
   DATABASE_URL=<production_url> pnpm drizzle-kit push:pg
   DATABASE_URL=<production_url> pnpm seed:production  # seeds only skills, no test users
   ```
3. Update `DATABASE_URL` in Render environment to production Neon URL

---

## Phase 5 — Custom Domain (Optional)

### On Vercel:
1. Vercel Dashboard → Project → Domains
2. Add domain: `skillswap.app` (or whatever you own)
3. Follow DNS instructions (add CNAME record to your domain registrar)
4. SSL is automatic

### On Render:
1. Render Dashboard → Service → Custom Domains
2. Add: `api.skillswap.app`
3. Update `FRONTEND_URL` in Render to `https://skillswap.app`
4. Update Clerk webhook URL to `https://api.skillswap.app/api/auth/sync`
5. Update frontend `NEXT_PUBLIC_API_URL` to `https://api.skillswap.app`

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Type Check + Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint

  unit-tests:
    name: Unit + Integration Tests
    runs-on: ubuntu-latest
    needs: quality
    env:
      DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
      UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
      UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run --reporter=verbose
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    if: github.ref == 'refs/heads/main'
    env:
      BASE_URL: ${{ secrets.STAGING_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Required GitHub Secrets

Set these in GitHub → Repository → Settings → Secrets:

| Secret | Value |
|---|---|
| `TEST_DATABASE_URL` | Neon dev branch connection string |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `STAGING_URL` | Vercel staging URL (for E2E) |

---

## Monitoring and Alerts

### UptimeRobot (Free)
1. Go to `uptimerobot.com` → Free account
2. Add monitor: HTTP, URL: `https://skillswap-api.onrender.com/health`
3. Check interval: 5 minutes
4. Alert contact: your email
5. This also keeps Render from spinning down

### Neon Storage Alert
1. Neon Dashboard → Project Settings
2. Set email alert at 80% of 500MB free tier

### Vercel Analytics (Free)
1. Vercel Dashboard → Analytics → Enable
2. Tracks page views, web vitals, error rates — free on Hobby plan

---

## Deployment Checklist (Final Launch)

Run through this before sharing the live URL publicly:

- [ ] All M9 gate tests pass
- [ ] Production environment variables set in Vercel and Render
- [ ] Clerk webhook pointing to production backend URL
- [ ] Database migrations applied to production Neon branch
- [ ] Production DB seeded with skills table
- [ ] Demo accounts created and tested (full loop works)
- [ ] UptimeRobot monitor active
- [ ] Custom domain (if using) DNS propagated and SSL working
- [ ] `NODE_ENV=production` set on Render
- [ ] No `.env` files or secrets in git (verify with `git log --all -S "SECRET"`)
- [ ] Lighthouse scores ≥ 80 on production URL
- [ ] No console errors on production domain
- [ ] Test sign-up with a fresh email on production (not test account)
- [ ] Share the URL

---

## Rollback Plan

If something breaks after deployment:

1. **Render:** Dashboard → Deploys → click previous deploy → "Redeploy"
2. **Vercel:** Dashboard → Deployments → click previous deploy → "Promote to Production"
3. **Database:** Neon supports branching — create a branch from before the bad migration and run rollback SQL if needed

---

## Cost Monitoring

Review monthly (set a calendar reminder):

| Service | Free Limit | Check |
|---|---|---|
| Neon | 0.5 GB storage | Neon Dashboard → Usage |
| Clerk | 10,000 MAU | Clerk Dashboard → Analytics |
| Cloudinary | 25 GB storage + bandwidth | Cloudinary Console → Usage |
| Resend | 3,000 emails/month | Resend Dashboard → Usage |
| Upstash | 10,000 commands/day | Upstash Console → Usage |
| Vercel | 100 GB bandwidth/month | Vercel Dashboard → Usage |
| Render | 750 hrs/month | Render Dashboard → Usage |

If any limit is near 80%: investigate before it hits 100% and triggers charges or service suspension.

---

*Deployment plan last reviewed: 2026-05-02*
