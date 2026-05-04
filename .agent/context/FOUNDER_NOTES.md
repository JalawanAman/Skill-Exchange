# Founder Notes

Key things Jalawan has said that shape how decisions are made.  
These are not requirements — they are the founder's voice and intent.  
The agent reads this to stay aligned with how Jalawan thinks.

---

## On Approach

- "we cant ignore the flaws yet we cant sit and cry bcuz there are flaws so lets be aware of the facts and move forward" — ship with known flaws, document them, fix what matters
- Zero cost is a hard constraint for MVP — free tiers only, no exceptions without discussion
- Speed matters — efficient approaches preferred over perfect ones at this stage

## On Architecture

- Prefers monorepo — one repo, everything together
- Wants the `idea/` folder to be the brain — agent and devs always reference it
- The outer `Skill-Exchange/` dir is founder + agent territory. `skill_swap_app/` is where devs work
- Cloudflare Workers were considered for backend — ruled out because Socket.io needs persistent connections

## On the Agent Directory

- The `.agent/` dir is the agent's personal memory and workspace
- Jalawan will drop files in `inbox/` when he wants the agent to read something
- Progress must be tracked honestly in `progress/PROGRESS.md`
- The agent dir can grow — keep it organised as it does

## On Testing

- `scratch/` dirs are for throwaway scripts — no pressure to clean them, but they never hit git
- Real tests live inside the app dirs and are gate-required
- After each milestone gate tests must ALL pass before moving forward — no partial passes

## On AI

- Free AI is welcome and encouraged
- Gemini Flash, HuggingFace, OpenRouter free models are all approved
- AI must never block the core experience — always fallback

## On the Founder

- **Name:** Jalawan Aman Khan
- **Role:** Founder + Developer
- Building this as a portfolio project and a real product
- Hands-on with the code — not just directing, actually building

---

*Updated: 2026-05-05*
