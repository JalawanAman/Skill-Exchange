# 09 — AI Integrations

> All AI services used are on free tiers. Zero cost.  
> AI features must degrade gracefully — if the AI API is down or rate-limited, the core platform must still work.

---

## Principle

AI is used to make the platform **smarter, not dependent**.  
Every AI feature has a **fallback** so the feature still works without AI.

---

## Services Used

| Service | Model | Free Tier | Used For |
|---|---|---|---|
| Google Gemini API | gemini-1.5-flash | 15 req/min, 1M tokens/day | Skill tag suggestions, match explanations |
| HuggingFace Inference | sentence-transformers | 1,000 req/day | Skill semantic similarity |
| OpenRouter | free models (Llama, Mistral) | Varies | Content moderation fallback |

---

## Feature 1 — Skill Tag Suggestions (Gemini Flash)

### What it does
During onboarding and profile editing, a user types a skill name in free text.  
The AI suggests the best matching tags from the platform's skill catalog.

**Example:**  
User types: "I know how to build websites with React"  
AI returns: `["React", "JavaScript", "Web Design", "Frontend Development"]`

### Why it matters
Users don't always know the exact canonical skill names. Without this, they might type "JS" instead of "JavaScript" and miss matches. AI bridges free text → structured tags.

### Implementation

**Endpoint:** `POST /api/skills/suggest`  
**Auth:** Required  

**Request:**
```json
{ "userInput": "I know how to make music on Ableton" }
```

**Response:**
```json
{
  "data": {
    "suggestions": ["Music Production", "Audio Editing", "Ableton"],
    "source": "ai"
  }
}
```

**Fallback response (if AI fails):**
```json
{
  "data": {
    "suggestions": [],
    "source": "fallback"
  }
}
```
→ Frontend shows a simple text search of the skills catalog instead.

**Backend implementation (`ai.service.ts`):**
```typescript
async function suggestSkillTags(userInput: string, allSkills: string[]): Promise<string[]> {
  const prompt = `
You are a skill categorization assistant for a skill-exchange platform.
Given this user description: "${userInput}"
And this list of available skill tags: ${allSkills.join(', ')}

Return a JSON array of the most relevant skill tags from the list above.
Return ONLY the JSON array, no explanation. Max 5 tags.
Example: ["Python", "Data Analysis", "SQL"]
`
  const response = await gemini.generateContent(prompt)
  const text = response.response.text()
  return JSON.parse(text) // validated against allSkills to prevent hallucinations
}
```

**Gemini setup:**
```bash
# Free: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...
```

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
```

**Rate limit protection:**  
Cache AI responses in Upstash Redis (key: `skill_suggest:${hash(userInput)}`).  
TTL: 1 hour. This dramatically reduces API calls for common inputs.

---

## Feature 2 — Match Explanation (Gemini Flash)

### What it does
On each match card on the dashboard, a one-sentence explanation of WHY this person is a good match.

**Example:**
> "Ali can teach you Python and is looking for someone to teach him Guitar — a perfect swap for your current goals."

This makes the match feel human and understandable, not algorithmic.

### Implementation

**Endpoint:** `GET /api/matches/:id/explanation`  
**Auth:** Required  

**Response:**
```json
{
  "data": {
    "explanation": "Ali offers Python (intermediate), which is exactly what you want to learn, and is seeking Guitar lessons — which is your top skill.",
    "source": "ai"
  }
}
```

**Fallback:** A template-based string generated without AI:  
`"{name} offers {their_skill} and wants {your_skill}."`

**Backend prompt:**
```typescript
const prompt = `
Write one friendly sentence (max 20 words) explaining why these two people are a great skill swap match.
User A wants to learn: ${wantedSkill}
User B can teach: ${offeredSkill}
User B wants to learn: ${theirWant}
User A can teach: ${myOffer}
Be warm and specific. No fluff.
`
```

**When to call:**  
Lazy-load on hover/expand of match card. Do not pre-generate for all matches.  
Cache result in Redis (key: `match_explain:${matchId}:${userId}`, TTL: 6h).

---

## Feature 3 — Skill Semantic Similarity (HuggingFace)

### What it does
Improves matching quality by understanding skill synonyms and related skills.

**Problem:** User A lists "Machine Learning", User B lists "ML and Deep Learning".  
Without semantics, these don't match. With embeddings, they score as very similar.

**HuggingFace model:** `sentence-transformers/all-MiniLM-L6-v2`  
- Free inference API
- Returns 384-dimensional embedding vectors
- Cosine similarity > 0.75 = semantically similar skills

### Implementation

**When it runs:**  
When a user adds a new skill offer/want, compute its embedding vector.  
Store the vector alongside the skill record (or in a separate `skill_embeddings` table).  
During matching, boost score when offer/want vectors have high cosine similarity but don't share the exact skill ID.

**API call:**
```typescript
async function getSkillEmbedding(skillText: string): Promise<number[]> {
  const response = await fetch(
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
      body: JSON.stringify({ inputs: skillText })
    }
  )
  const data = await response.json()
  return data[0] // 384-dim vector
}
```

**Fallback:** If HuggingFace is unavailable, matching falls back to exact skill ID matching only (still works, just less smart).

**Note:** Pre-compute embeddings for all 50 seed skills at startup. Only call the API for user-entered custom descriptions (rare — skills are chosen from catalog).

---

## Feature 4 — Content Moderation (OpenRouter + free model)

### What it does
Automatically flag chat messages or review text that contain:
- Hate speech or slurs
- Explicit sexual content
- Solicitation (asking to move outside the platform to pay)

**Not a real-time blocker** for MVP — flags the content for review, does not prevent sending.  
This protects the platform from abuse without requiring a human moderator full-time.

### Implementation

**Trigger:** On `message:send` WebSocket event, run moderation asynchronously (do not delay message delivery).

**Model:** `meta-llama/llama-3-8b-instruct:free` via OpenRouter (free tier)

```typescript
async function moderateContent(text: string): Promise<{
  flagged: boolean
  reason?: string
}> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3-8b-instruct:free',
      messages: [{
        role: 'user',
        content: `Does this text contain hate speech, explicit content, or solicitation to pay outside a platform? Answer only YES or NO and one-word reason.\n\nText: "${text}"`
      }]
    })
  })
  const data = await response.json()
  const answer = data.choices[0].message.content.trim().toUpperCase()
  return { flagged: answer.startsWith('YES'), reason: answer.split(' ')[1] }
}
```

**Action on flagged content:**
1. Message is delivered normally (do not block)
2. Create a `reports` DB record with `reason: 'auto_moderation'`
3. If 3+ auto-moderation flags in 24 hours for same user → notify admin (email)

**Fallback:** If OpenRouter is down, skip moderation. Log a warning. Never block message delivery due to AI unavailability.

---

## Feature 5 — Smart Onboarding Bio Suggestions (Gemini Flash)

### What it does
When a user is filling out their bio during onboarding, a "Help me write this" button generates a bio suggestion based on their skills.

**Example:**  
Skills: Python (expert, 5 years), Guitar (beginner)  
Wants: UX Design, Spanish  

**Generated bio:**
> "Python developer with 5 years of experience, currently learning guitar. Looking to swap coding skills for UX design or Spanish lessons."

### Implementation

**Endpoint:** `POST /api/users/suggest-bio`  
**Auth:** Required

```typescript
const prompt = `
Write a short (2 sentences, max 280 characters) friendly profile bio for a skill-exchange platform.
User skills they can teach: ${offers.map(o => `${o.skill} (${o.proficiency})`).join(', ')}
Skills they want to learn: ${wants.map(w => w.skill).join(', ')}
Tone: casual, friendly, first person. No hashtags.
`
```

**Fallback:** Button is hidden if AI call fails. User writes bio manually.

---

## AI Cost Summary

| Feature | Service | Calls/Day (estimate) | Cost |
|---|---|---|---|
| Skill suggestions | Gemini Flash (cached) | ~50 unique inputs | $0 |
| Match explanations | Gemini Flash (cached) | ~20 views | $0 |
| Semantic similarity | HuggingFace (pre-computed) | ~10 new skills | $0 |
| Content moderation | OpenRouter free | ~200 messages | $0 |
| Bio suggestions | Gemini Flash | ~10 onboardings | $0 |
| **Total** | | | **$0** |

All within free tier limits with aggressive caching.

---

## AI Failure Handling

```typescript
// Every AI call is wrapped in this pattern:
async function withAIFallback<T>(
  aiCall: () => Promise<T>,
  fallback: T,
  featureName: string
): Promise<T> {
  try {
    return await aiCall()
  } catch (error) {
    logger.warn(`AI feature ${featureName} failed, using fallback`, { error })
    return fallback
  }
}

// Usage:
const suggestions = await withAIFallback(
  () => suggestSkillTags(userInput, allSkills),
  [],    // fallback: empty array → UI shows text search
  'skill_suggestions'
)
```

---

*AI integrations last reviewed: 2026-05-02*
