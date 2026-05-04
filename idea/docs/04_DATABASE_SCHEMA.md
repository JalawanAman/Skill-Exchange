# 04 — Database Schema

> PostgreSQL on Neon DB.  
> ORM: Drizzle ORM.  
> All schema changes require a migration file. Never alter columns manually.

---

## Schema Overview

```
users
  ├── skill_offers (user offers these skills)
  ├── skill_wants  (user wants to learn these)
  ├── matches      (matched pairs)
  ├── conversations (one per matched pair)
  │     └── messages
  ├── sessions     (booked exchanges)
  │     └── credit_escrows
  ├── reviews      (given + received)
  ├── credit_transactions
  └── notifications
```

---

## Tables

### `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id        VARCHAR(255) UNIQUE NOT NULL,   -- Clerk user ID
  username        VARCHAR(50)  UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  avatar_url      TEXT,                            -- Cloudinary URL
  bio             TEXT,                            -- max 300 chars (enforced in app)
  location        VARCHAR(100),                    -- city / country (optional)
  timezone        VARCHAR(50),                     -- e.g. "Asia/Karachi"
  languages       TEXT[]       DEFAULT '{}',       -- e.g. ["en", "ur"]
  credit_balance  INTEGER      NOT NULL DEFAULT 20, -- starts at 20
  is_premium      BOOLEAN      NOT NULL DEFAULT false,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_username ON users(username);
```

---

### `skills`
```sql
-- Master skill catalog (seeded by platform, not user-created)
CREATE TABLE skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) UNIQUE NOT NULL,   -- e.g. "Python", "Guitar"
  category    VARCHAR(50)  NOT NULL,          -- e.g. "Tech", "Music", "Language"
  slug        VARCHAR(100) UNIQUE NOT NULL,   -- e.g. "python", "guitar"
  icon_name   VARCHAR(50),                    -- icon identifier for UI
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_slug ON skills(slug);
```

---

### `skill_offers`
```sql
-- Skills a user can teach
CREATE TABLE skill_offers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id         UUID NOT NULL REFERENCES skills(id),
  proficiency      VARCHAR(20) NOT NULL CHECK (proficiency IN ('beginner','intermediate','expert')),
  years_experience INTEGER,
  description      TEXT,                  -- optional: how they teach, their style
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_skill_offers_user_id ON skill_offers(user_id);
CREATE INDEX idx_skill_offers_skill_id ON skill_offers(skill_id);
```

---

### `skill_wants`
```sql
-- Skills a user wants to learn
CREATE TABLE skill_wants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id     UUID NOT NULL REFERENCES skills(id),
  level_target VARCHAR(20) NOT NULL CHECK (level_target IN ('beginner','intermediate','advanced')),
  notes        TEXT,                      -- what specifically they want to learn
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_skill_wants_user_id ON skill_wants(user_id);
CREATE INDEX idx_skill_wants_skill_id ON skill_wants(skill_id);
```

---

### `availability`
```sql
-- User availability schedule (weekly repeating slots)
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time  TIME NOT NULL,   -- e.g. 09:00
  end_time    TIME NOT NULL,   -- e.g. 17:00
  timezone    VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, start_time)
);

CREATE INDEX idx_availability_user_id ON availability(user_id);
```

---

### `matches`
```sql
-- Surfaced match pairs (result of matching algorithm)
CREATE TABLE matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score INTEGER NOT NULL,              -- 0–100
  matched_skills      JSONB NOT NULL DEFAULT '[]',  -- [{offered_by_a, wanted_by_b}, ...]
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','connected','dismissed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_matches_score  ON matches(compatibility_score DESC);
```

---

### `connection_requests`
```sql
CREATE TABLE connection_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      TEXT,                          -- optional intro message
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX idx_conn_req_to_user ON connection_requests(to_user_id, status);
```

---

### `conversations`
```sql
-- One conversation per pair of connected users
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(participant_a, participant_b)
);

CREATE INDEX idx_conv_participant_a ON conversations(participant_a, last_message_at DESC);
CREATE INDEX idx_conv_participant_b ON conversations(participant_b, last_message_at DESC);
```

---

### `messages`
```sql
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users(id),
  content          TEXT NOT NULL,
  message_type     VARCHAR(20) NOT NULL DEFAULT 'text'
                     CHECK (message_type IN ('text','image','file','system')),
  file_url         TEXT,                            -- Cloudinary URL if file
  is_read          BOOLEAN NOT NULL DEFAULT false,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conv_id ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender  ON messages(sender_id);
```

---

### `sessions`
```sql
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID NOT NULL REFERENCES users(id),
  learner_id        UUID NOT NULL REFERENCES users(id),
  skill_id          UUID NOT NULL REFERENCES skills(id),
  conversation_id   UUID REFERENCES conversations(id),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER NOT NULL CHECK (duration_minutes IN (30, 60, 90, 120)),
  format            VARCHAR(20) NOT NULL CHECK (format IN ('video','in-person','async')),
  meeting_link      TEXT,                    -- Zoom/Meet link (optional)
  credits_amount    INTEGER NOT NULL,        -- computed: duration_minutes/6 (10 per hour)
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending',           -- awaiting learner accept
                        'confirmed',         -- both accepted, credits in escrow
                        'in_progress',       -- session is happening now (time-based)
                        'completed',         -- both confirmed complete
                        'cancelled',         -- cancelled before session
                        'disputed'           -- one party raised a dispute
                      )),
  teacher_confirmed BOOLEAN NOT NULL DEFAULT false,
  learner_confirmed BOOLEAN NOT NULL DEFAULT false,
  cancelled_by      UUID REFERENCES users(id),
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_teacher  ON sessions(teacher_id, status);
CREATE INDEX idx_sessions_learner  ON sessions(learner_id, status);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
```

---

### `credit_transactions`
```sql
CREATE TABLE credit_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  session_id   UUID REFERENCES sessions(id),
  type         VARCHAR(30) NOT NULL CHECK (type IN (
                 'earned_teaching',    -- session completed as teacher
                 'spent_learning',     -- session completed as learner
                 'escrow_lock',        -- credits locked for upcoming session
                 'escrow_release',     -- credits returned (session cancelled)
                 'starter_bonus',      -- 20 credits on signup
                 'admin_adjustment'    -- manual correction
               )),
  amount       INTEGER NOT NULL,       -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,      -- snapshot of balance after transaction
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credit_tx_session ON credit_transactions(session_id);
```

---

### `reviews`
```sql
CREATE TABLE reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id),
  reviewer_id  UUID NOT NULL REFERENCES users(id),
  reviewee_id  UUID NOT NULL REFERENCES users(id),
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,                    -- max 500 chars (enforced in app)
  role         VARCHAR(10) NOT NULL CHECK (role IN ('teacher','learner')),
  is_public    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, reviewer_id)       -- one review per person per session
);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id, created_at DESC);
CREATE INDEX idx_reviews_session  ON reviews(session_id);
```

---

### `notifications`
```sql
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL CHECK (type IN (
                 'new_match',
                 'connection_request',
                 'connection_accepted',
                 'new_message',
                 'session_request',
                 'session_confirmed',
                 'session_reminder',
                 'session_completed',
                 'new_review',
                 'credit_earned',
                 'credit_spent'
               )),
  title        VARCHAR(200) NOT NULL,
  body         TEXT,
  data         JSONB DEFAULT '{}',      -- extra payload (e.g. { sessionId, senderId })
  is_read      BOOLEAN NOT NULL DEFAULT false,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read, created_at DESC);
```

---

### `blocks`
```sql
CREATE TABLE blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id    UUID NOT NULL REFERENCES users(id),
  blocked_id    UUID NOT NULL REFERENCES users(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
```

---

### `reports`
```sql
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES users(id),
  reported_id   UUID NOT NULL REFERENCES users(id),
  session_id    UUID REFERENCES sessions(id),
  reason        VARCHAR(50) NOT NULL CHECK (reason IN (
                  'no_show','inappropriate_behavior','misrepresentation','spam','other'
                )),
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','reviewed','resolved','dismissed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_reported ON reports(reported_id, status);
```

---

## Computed Fields (Application Layer, Not DB)

These are computed in the API, not stored:

| Field | Computed From | Where |
|---|---|---|
| `user.average_rating` | AVG of reviews where `reviewee_id = user.id` | Query on demand |
| `user.session_count` | COUNT of completed sessions | Query on demand |
| `user.response_rate` | accepted / total connection requests received | Query on demand |
| `session.credits_amount` | `duration_minutes / 60 * 10` | Computed before insert |

---

## Seed Data

On first deploy, seed:
1. `skills` table with ~50 initial skills across categories
2. One admin test user

### Initial Skills Seed (sample)
```
Tech: Python, JavaScript, TypeScript, React, Node.js, SQL, Data Analysis,
      Machine Learning, UI/UX Design, Figma, Web Design, Git, Docker,
      AWS Basics, Cybersecurity Basics, Flutter, Swift, Kotlin

Languages: English, Spanish, French, Arabic, Urdu, Portuguese, German,
           Japanese, Mandarin, Hindi

Creative: Graphic Design, Video Editing, Photography, Illustration,
          Music Production, Guitar, Piano, Singing, Writing, Copywriting

Business: SEO, Digital Marketing, Content Strategy, Public Speaking,
          Project Management, Excel/Sheets, Accounting Basics

Fitness: Yoga, Nutrition, Fitness Coaching
```

---

## Migration Workflow

```bash
# Create a new migration after schema change
pnpm drizzle-kit generate:pg

# Apply migrations to dev DB
pnpm drizzle-kit push:pg

# Apply migrations to production (careful!)
DATABASE_URL=<prod_url> pnpm drizzle-kit push:pg
```

---

*Schema last reviewed: 2026-05-02*
