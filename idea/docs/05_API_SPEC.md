# 05 — API Specification

> All endpoints are prefixed with `/api`  
> All requests requiring auth must include the Clerk JWT as `Authorization: Bearer <token>`  
> All responses are JSON  
> All errors return `{ error: string, code: string }`

---

## Base Response Format

```typescript
// Success
{ data: T, message?: string }

// Error
{ error: string, code: string, details?: Record<string, string> }
```

---

## Auth Routes `/api/auth`

### POST `/api/auth/sync`
Syncs the Clerk user to our database. Called automatically via Clerk webhook on user creation.

**Headers:** `svix-id`, `svix-timestamp`, `svix-signature` (Clerk webhook verification)

**Body (Clerk webhook payload):**
```json
{
  "type": "user.created",
  "data": {
    "id": "user_clerk_id",
    "email_addresses": [{ "email_address": "user@example.com" }],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://..."
  }
}
```

**Response 200:**
```json
{ "data": { "userId": "uuid", "created": true } }
```

---

## User Routes `/api/users`

### GET `/api/users/me`
Get the current authenticated user's full profile.

**Auth:** Required

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "avatarUrl": "https://res.cloudinary.com/...",
    "bio": "Python dev, want to learn guitar",
    "location": "Karachi, PK",
    "timezone": "Asia/Karachi",
    "languages": ["en", "ur"],
    "creditBalance": 20,
    "isPremium": false,
    "skillOffers": [...],
    "skillWants": [...],
    "averageRating": 4.8,
    "sessionCount": 12,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### PATCH `/api/users/me`
Update current user's profile.

**Auth:** Required

**Body:**
```json
{
  "fullName": "string (optional)",
  "bio": "string max 300 chars (optional)",
  "location": "string (optional)",
  "timezone": "string (optional)",
  "languages": ["en", "ur"]
}
```

**Response 200:** Updated user object

### GET `/api/users/:id`
Get a public profile by user ID.

**Auth:** Required

**Response 200:** Public profile (no email, no creditBalance)

### GET `/api/users/search`
Search users by skill, name, or location.

**Auth:** Required

**Query params:**
- `q` — search query (skill name or username)
- `category` — skill category filter
- `language` — language filter
- `page` — page number (default: 1)
- `limit` — results per page (default: 20, max: 50)

**Response 200:**
```json
{
  "data": {
    "users": [...],
    "total": 150,
    "page": 1,
    "totalPages": 8
  }
}
```

---

## Skills Routes `/api/skills`

### GET `/api/skills`
List all available skills. Can filter by category.

**Auth:** Not required

**Query params:** `category`, `q` (search by name)

**Response 200:**
```json
{
  "data": {
    "skills": [
      { "id": "uuid", "name": "Python", "category": "Tech", "slug": "python" }
    ]
  }
}
```

### POST `/api/skills/offers`
Add a skill the user can teach.

**Auth:** Required

**Body:**
```json
{
  "skillId": "uuid",
  "proficiency": "intermediate",
  "yearsExperience": 3,
  "description": "I teach Python for data science with real projects"
}
```

**Response 201:** Created skill offer

### DELETE `/api/skills/offers/:id`
Remove a skill offer.

**Auth:** Required (must own the offer)

### POST `/api/skills/wants`
Add a skill the user wants to learn.

**Auth:** Required

**Body:**
```json
{
  "skillId": "uuid",
  "levelTarget": "intermediate",
  "notes": "I want to learn for web projects"
}
```

**Response 201:** Created skill want

### DELETE `/api/skills/wants/:id`
Remove a skill want.

**Auth:** Required (must own the want)

---

## Matching Routes `/api/matches`

### GET `/api/matches`
Get the current user's top matches (sorted by compatibility score).

**Auth:** Required

**Query params:**
- `page` (default: 1)
- `limit` (default: 20)

**Response 200:**
```json
{
  "data": {
    "matches": [
      {
        "id": "uuid",
        "user": { "id": "uuid", "username": "...", "avatarUrl": "..." },
        "compatibilityScore": 87,
        "matchedSkills": [
          { "offeredByMatch": "Python", "wantedByMe": "Python" },
          { "offeredByMe": "Guitar", "wantedByMatch": "Guitar" }
        ],
        "status": "pending"
      }
    ],
    "total": 45
  }
}
```

### POST `/api/matches/:matchId/dismiss`
Dismiss a match (won't appear again).

**Auth:** Required

### POST `/api/matches/refresh`
Trigger the matching algorithm to refresh the user's match feed.

**Auth:** Required

**Response 200:** `{ "data": { "newMatchesFound": 5 } }`

---

## Connection Routes `/api/connections`

### POST `/api/connections/request`
Send a connection request to another user.

**Auth:** Required

**Body:**
```json
{
  "toUserId": "uuid",
  "message": "Hey! I can teach you React, would love to learn guitar from you."
}
```

**Business rules:**
- Free users: max 5 outgoing requests per 7 days
- Premium users: unlimited
- Cannot request someone who has blocked you
- Cannot request duplicate

**Response 201:** `{ "data": { "requestId": "uuid" } }`

### GET `/api/connections/requests`
List incoming connection requests.

**Auth:** Required

**Response 200:** Array of pending connection requests

### POST `/api/connections/requests/:id/accept`
Accept a connection request. Creates a conversation automatically.

**Auth:** Required (must be the recipient)

**Response 200:** `{ "data": { "conversationId": "uuid" } }`

### POST `/api/connections/requests/:id/decline`
Decline a connection request.

**Auth:** Required (must be the recipient)

---

## Conversation Routes `/api/conversations`

### GET `/api/conversations`
List all the current user's conversations (sorted by last message time).

**Auth:** Required

**Response 200:**
```json
{
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "otherUser": { "id": "uuid", "username": "...", "avatarUrl": "...", "isOnline": true },
        "lastMessage": { "content": "...", "sentAt": "...", "isRead": true },
        "unreadCount": 2
      }
    ]
  }
}
```

### GET `/api/conversations/:id/messages`
Get message history for a conversation (paginated, newest first).

**Auth:** Required (must be a participant)

**Query params:** `before` (message UUID for cursor-based pagination), `limit` (default: 50)

**Response 200:**
```json
{
  "data": {
    "messages": [
      {
        "id": "uuid",
        "senderId": "uuid",
        "content": "Hey, want to book a session?",
        "messageType": "text",
        "isRead": true,
        "readAt": "...",
        "createdAt": "..."
      }
    ],
    "hasMore": true,
    "nextCursor": "message_uuid"
  }
}
```

### POST `/api/conversations/:id/messages`
Send a message (REST fallback — primary path is via Socket.io).

**Auth:** Required (must be a participant)

**Body:** `{ "content": "string", "messageType": "text" }`

### PATCH `/api/conversations/:id/read`
Mark all unread messages in a conversation as read.

**Auth:** Required

---

## Session Routes `/api/sessions`

### POST `/api/sessions`
Book a session request.

**Auth:** Required

**Body:**
```json
{
  "teacherId": "uuid",
  "learnerId": "uuid",
  "skillId": "uuid",
  "scheduledAt": "2026-06-01T10:00:00Z",
  "durationMinutes": 60,
  "format": "video",
  "meetingLink": "https://meet.google.com/...",
  "conversationId": "uuid"
}
```

**Business rules:**
- `learnerId` must have enough credits for the session
- `scheduledAt` must be in the future
- Both users must be connected (have a conversation)
- Credits locked in escrow immediately on creation

**Response 201:** Created session object

### GET `/api/sessions`
List current user's sessions.

**Auth:** Required

**Query params:** `status` (pending/confirmed/completed/cancelled), `role` (teacher/learner)

### GET `/api/sessions/:id`
Get session details.

**Auth:** Required (must be teacher or learner)

### POST `/api/sessions/:id/accept`
Learner accepts a session request.

**Auth:** Required (must be the learner)

**Response 200:** Updated session with status `confirmed`

### POST `/api/sessions/:id/confirm-complete`
Mark session as complete from your side.

**Auth:** Required (must be teacher or learner)

**Business rules:**
- Sets `teacher_confirmed` or `learner_confirmed` to true
- When BOTH are true: status → `completed`, credits transfer, notifications sent

**Response 200:** Updated session

### POST `/api/sessions/:id/cancel`
Cancel a session.

**Auth:** Required (must be teacher or learner)

**Body:** `{ "reason": "string" }`

**Business rules:**
- Credits returned to learner if cancelled before session time
- Status → `cancelled`

### POST `/api/sessions/:id/dispute`
Raise a dispute on a session.

**Auth:** Required

**Body:** `{ "reason": "string" }`

---

## Credits Routes `/api/credits`

### GET `/api/credits/balance`
Get current user's credit balance and recent transactions.

**Auth:** Required

**Response 200:**
```json
{
  "data": {
    "balance": 35,
    "escrowed": 10,
    "available": 25,
    "transactions": [
      {
        "id": "uuid",
        "type": "earned_teaching",
        "amount": 10,
        "balanceAfter": 35,
        "note": "Session with @alice — Python",
        "createdAt": "..."
      }
    ]
  }
}
```

### GET `/api/credits/history`
Full paginated credit history.

**Auth:** Required

**Query params:** `page`, `limit`

---

## Reviews Routes `/api/reviews`

### POST `/api/reviews`
Submit a review after a completed session.

**Auth:** Required

**Body:**
```json
{
  "sessionId": "uuid",
  "rating": 5,
  "comment": "Excellent teacher, very patient and clear explanations."
}
```

**Business rules:**
- Session must have status `completed`
- User can only review once per session
- Reviewer must be teacher or learner of the session
- Reviewee is the other party (server determines, not client)

**Response 201:** Created review

### GET `/api/reviews/user/:userId`
Get public reviews for a user.

**Auth:** Not required

**Query params:** `page`, `limit`

---

## Notifications Routes `/api/notifications`

### GET `/api/notifications`
Get current user's notifications.

**Auth:** Required

**Query params:** `unreadOnly` (boolean), `page`, `limit`

### PATCH `/api/notifications/read-all`
Mark all notifications as read.

**Auth:** Required

### PATCH `/api/notifications/:id/read`
Mark a single notification as read.

**Auth:** Required

---

## Availability Routes `/api/availability`

### GET `/api/availability/:userId`
Get a user's availability schedule.

**Auth:** Required

### PUT `/api/availability`
Set the current user's availability (replaces all existing slots).

**Auth:** Required

**Body:**
```json
{
  "slots": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "timezone": "Asia/Karachi" },
    { "dayOfWeek": 3, "startTime": "18:00", "endTime": "21:00", "timezone": "Asia/Karachi" }
  ]
}
```

---

## WebSocket Events (Socket.io)

### Connection

Client connects with Clerk JWT in auth handshake:
```javascript
const socket = io(SOCKET_URL, {
  auth: { token: clerkToken }
})
```

Server verifies token and associates socket with `userId`.

---

### Events: Client → Server

| Event | Payload | Description |
|---|---|---|
| `conversation:join` | `{ conversationId }` | Join a conversation room |
| `conversation:leave` | `{ conversationId }` | Leave a conversation room |
| `message:send` | `{ conversationId, content, messageType }` | Send a message |
| `typing:start` | `{ conversationId }` | Notify other user you're typing |
| `typing:stop` | `{ conversationId }` | Notify other user you stopped typing |
| `message:read` | `{ messageId, conversationId }` | Mark a message as read |
| `user:heartbeat` | `{}` | Keep presence alive (every 30s) |

---

### Events: Server → Client

| Event | Payload | Description |
|---|---|---|
| `message:new` | `{ id, conversationId, senderId, content, createdAt }` | New message in a room |
| `message:read` | `{ messageId, readAt }` | Message was read by recipient |
| `typing:indicator` | `{ conversationId, userId, isTyping }` | Typing state of other user |
| `presence:update` | `{ userId, status, lastSeenAt }` | Online/offline status change |
| `notification:new` | `{ id, type, title, body, data }` | Real-time notification |
| `session:update` | `{ sessionId, status }` | Session status changed |
| `credits:update` | `{ newBalance }` | Credit balance changed |
| `error` | `{ message, code }` | Socket-level error |

---

## Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid token |
| `FORBIDDEN` | 403 | Token valid but access denied |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed Zod validation |
| `INSUFFICIENT_CREDITS` | 422 | Not enough credits for operation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `CONNECTION_LIMIT` | 422 | Free user request limit reached |
| `DUPLICATE_REQUEST` | 409 | Already exists (connection request, review, etc.) |
| `SESSION_NOT_COMPLETABLE` | 422 | Session not in valid state for confirmation |
| `INTERNAL_ERROR` | 500 | Server error (never expose internals) |

---

*API spec last reviewed: 2026-05-02*
