# 08 — Testing Strategy

> Tests are not optional. They are the gate keys.  
> Every gate in `07_MILESTONES.md` references tests from this document.

---

## Test Pyramid

```
                    ┌───────────┐
                    │    E2E    │  ← Playwright (5–10 critical flows)
                    │ (slowest) │
                   ┌┴───────────┴┐
                   │ Integration │  ← Vitest + supertest (API routes + socket)
                   │  (medium)   │
                  ┌┴─────────────┴┐
                  │     Unit      │  ← Vitest (services, utils, algorithms)
                  │   (fastest)   │
                  └───────────────┘
```

**Target coverage by milestone M9:**
- Unit tests: > 80% coverage on `services/` folder
- Integration tests: All API routes tested
- E2E tests: All 5 critical user flows covered

---

## Tools

| Test Type | Tool | Location |
|---|---|---|
| Unit + Integration | Vitest | `apps/api/tests/unit/`, `apps/api/tests/integration/` |
| Frontend component | Vitest + React Testing Library | `apps/web/tests/` |
| End-to-End | Playwright | `tests/e2e/` (monorepo root) |
| API manual testing | REST Client (VSCode extension) | `apps/api/tests/http/*.http` |

---

## Unit Tests

### What to unit test

Anything that is **pure logic with no external dependencies**. Test the service layer directly.

### `matching.service.test.ts`

```typescript
describe('computeCompatibilityScore', () => {
  it('returns 40 for a perfect mutual skill match')
  it('returns 20 for a one-directional skill match')
  it('returns 0 for users with no skill overlap')
  it('adds up to 20 for full availability overlap')
  it('adds 20 for shared language, 0 for no shared language')
  it('adds experience compatibility bonus correctly')
  it('adds reputation score based on rating and session count')
  it('returns max 100 even if all factors are maxed')
  it('never returns negative score')
  it('excludes dismissed matches from results')
  it('excludes blocked users from results')
})
```

### `credit.service.test.ts`

```typescript
describe('computeCreditsForSession', () => {
  it('returns 10 for 60 min session')
  it('returns 5 for 30 min session')
  it('returns 15 for 90 min session')
  it('returns 20 for 120 min session')
})

describe('lockCreditsInEscrow', () => {
  it('deducts credits from user balance and creates escrow_lock transaction')
  it('throws INSUFFICIENT_CREDITS if balance would go below 0')
  it('is atomic — no partial state if DB fails mid-operation')
})

describe('transferCreditsOnCompletion', () => {
  it('adds credits to teacher and deducts from learner atomically')
  it('creates earned_teaching and spent_learning transaction records')
  it('does nothing if called twice (idempotent)')
  it('releases escrow before transferring')
})

describe('releaseEscrow', () => {
  it('returns escrowed credits to learner on cancellation')
  it('creates escrow_release transaction record')
})
```

### `notification.service.test.ts`

```typescript
describe('createNotification', () => {
  it('creates a DB record for each notification type')
  it('returns the created notification with correct fields')
})
```

### Input validation tests (`validate.test.ts`)

```typescript
describe('Zod schemas', () => {
  describe('createSessionSchema', () => {
    it('rejects past scheduledAt dates')
    it('rejects invalid duration values (not 30/60/90/120)')
    it('rejects invalid format values')
    it('requires teacherId and learnerId as valid UUIDs')
  })
  
  describe('createReviewSchema', () => {
    it('rejects rating outside 1–5 range')
    it('rejects comment longer than 500 chars')
    it('requires sessionId')
  })
  
  describe('updateProfileSchema', () => {
    it('rejects bio longer than 300 chars')
    it('accepts empty/partial updates')
  })
})
```

---

## Integration Tests

### What to integration test

API routes tested end-to-end with a **real test database** (Neon dev branch).  
Uses `supertest` to make HTTP requests directly to the Express app.

### Setup

```typescript
// tests/integration/setup.ts
import { db } from '../../src/db'

beforeEach(async () => {
  // Seed minimal test data for each test
  await db.transaction(async (tx) => {
    // create test users, skills, etc.
  })
})

afterEach(async () => {
  // Clean test data (delete in FK-safe order)
})
```

### `auth.integration.test.ts`

```typescript
it('POST /api/auth/sync creates user with 20 credits on valid Clerk webhook')
it('POST /api/auth/sync rejects invalid webhook signatures')
it('GET /api/users/me returns 401 without valid JWT')
it('GET /api/users/me returns user data with valid JWT')
```

### `matches.integration.test.ts`

```typescript
it('GET /api/matches returns matches sorted by score')
it('GET /api/matches excludes dismissed matches')
it('GET /api/matches excludes blocked users')
it('POST /api/matches/:id/dismiss marks match as dismissed')
it('POST /api/matches/refresh returns count of new matches')
```

### `connections.integration.test.ts`

```typescript
it('POST /api/connections/request creates a pending request')
it('POST /api/connections/request returns 422 at free limit (5th+1 request)')
it('POST /api/connections/request returns 409 for duplicate request')
it('POST /api/connections/requests/:id/accept creates a conversation')
it('POST /api/connections/requests/:id/decline removes the request')
```

### `sessions.integration.test.ts`

```typescript
it('POST /api/sessions creates session and locks credits in escrow')
it('POST /api/sessions returns 422 if learner lacks credits')
it('POST /api/sessions/:id/accept changes status to confirmed')
it('POST /api/sessions/:id/confirm-complete: one confirm sets flag, not complete')
it('POST /api/sessions/:id/confirm-complete: both confirmed → completed + credits transferred')
it('POST /api/sessions/:id/confirm-complete is idempotent')
it('POST /api/sessions/:id/cancel refunds credits to learner')
```

### `reviews.integration.test.ts`

```typescript
it('POST /api/reviews creates review on completed session')
it('POST /api/reviews returns 422 on non-completed session')
it('POST /api/reviews returns 409 on duplicate review')
it('GET /api/reviews/user/:id returns public reviews')
```

### Socket.io Integration Tests

```typescript
// Using socket.io-client in tests
it('socket rejects connection without valid JWT')
it('message:send persists to DB and emits message:new to room')
it('typing:start emits typing:indicator to other participants')
it('message:read updates is_read in DB and emits message:read event')
it('user:heartbeat updates Redis presence key')
```

---

## End-to-End Tests (Playwright)

### Test Accounts

Create two persistent test accounts for E2E:
- `testuser_a@skillswap.test` — offers Python, wants Guitar
- `testuser_b@skillswap.test` — offers Guitar, wants Python

### E2E Test Files

#### `e2e/01_auth.spec.ts`
```typescript
test('sign up with email creates account and reaches onboarding')
test('sign in with existing account reaches dashboard')
test('sign out redirects to sign-in page')
test('unauthenticated user is redirected from /dashboard to /sign-in')
```

#### `e2e/02_onboarding.spec.ts`
```typescript
test('new user completes onboarding and reaches dashboard')
test('onboarding cannot be submitted without skill offer')
test('onboarding cannot be submitted without skill want')
test('profile photo upload works and shows preview')
```

#### `e2e/03_matching.spec.ts`
```typescript
test('dashboard shows match cards for users with complementary skills')
test('dismissing a match removes it from feed')
test('browse search returns relevant results')
```

#### `e2e/04_chat.spec.ts`
```typescript
test('connected users can send and receive messages in real time', async ({ browser }) => {
  // Open two browser contexts (two users simultaneously)
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  // User A sends message → appears in User B's window within 2s
})
test('typing indicator appears and disappears correctly')
test('message history loads on conversation open')
```

#### `e2e/05_session_flow.spec.ts`
```typescript
test('full session loop: book → accept → confirm → credits transferred', async ({ browser }) => {
  // Full flow with two browser contexts
  // 1. User A books session with User B
  // 2. User B accepts
  // 3. Both confirm completion
  // 4. Verify credits updated in UI
})
test('session cancellation refunds credits')
test('review submitted after completion appears on profile')
```

### Running Tests

```bash
# Unit + Integration
pnpm test                     # run all Vitest tests
pnpm test:watch               # watch mode
pnpm test:coverage            # coverage report

# E2E
pnpm playwright test          # run all Playwright tests
pnpm playwright test --ui     # visual mode (great for debugging)
pnpm playwright test --headed # see the browser
```

---

## CI Test Configuration (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm typecheck    # tsc --noEmit
      - run: pnpm lint         # eslint

  test:
    runs-on: ubuntu-latest
    needs: quality
    env:
      DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}   # Neon test branch
      CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm test:run     # Vitest

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm playwright test
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
```

---

## Test Data Seeding

A `seed.ts` script populates the DB with realistic test data for manual testing and E2E.

```bash
pnpm seed         # run seed script against dev DB
pnpm seed:reset   # wipe and reseed
```

Seed includes:
- 10 users with varied skills, availability, and completed sessions
- Conversation threads with 20+ messages each
- Completed sessions with reviews
- Pending connection requests
- Mix of credit balances

---

## What NOT to Test

- Third-party services (Clerk, Cloudinary, Socket.io) — trust their own tests
- CSS styling — verify visually, not programmatically
- Exact UI copy/text — brittle, test behavior instead
- Internal implementation details — test behavior from the outside

---

*Testing strategy last reviewed: 2026-05-02*
