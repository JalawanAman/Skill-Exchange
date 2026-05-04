# SkillSwap — Founder Docs / Project Brain

This folder is the **single source of truth** for the SkillSwap platform.  
These are the **Founder Docs** — the original vision, decisions, and architecture as defined by the product owner.  
Every agent, every developer, every decision traces back to these documents.  
If it is not written here, it does not exist.

> These documents represent the founder's intent. No implementation decision overrides what is written here without an explicit update to the relevant doc and the founder's agreement.

---

## How to Use This Brain

1. Read `00_RULES_AND_GATES.md` first. Always. Non-negotiable.
2. Use `01_MASTER_PLAN.md` for orientation.
3. Use `02_ARCHITECTURE.md` when building or reviewing any component.
4. Use `04_DATABASE_SCHEMA.md` before touching any data model.
5. Use `05_API_SPEC.md` before writing any endpoint or client call.
6. Use `07_MILESTONES.md` to know what to build next and what gate to pass.
7. Use `08_TESTING_STRATEGY.md` to know what tests must pass before proceeding.

---

## Document Index

| File | Purpose |
|------|---------|
| `00_RULES_AND_GATES.md` | The law. Read before anything else. |
| `01_MASTER_PLAN.md` | Project overview, vision, phased summary |
| `02_ARCHITECTURE.md` | Full system architecture + ASCII diagrams |
| `03_TECH_STACK.md` | Every tool, free tier limits, why chosen |
| `04_DATABASE_SCHEMA.md` | PostgreSQL schema — all tables, indexes, relations |
| `05_API_SPEC.md` | All REST endpoints + WebSocket events |
| `06_REQUIREMENTS.md` | Functional + non-functional requirements |
| `07_MILESTONES.md` | 12-week build plan with per-task gate tests |
| `08_TESTING_STRATEGY.md` | Test strategy per phase — unit, integration, e2e |
| `09_AI_INTEGRATIONS.md` | Free AI APIs, what they do, how to use |
| `10_DEPLOYMENT.md` | Step-by-step deployment on zero-cost infrastructure |

---

## The One Rule

> **A gate is a hard stop. If the gate test fails, development does not continue.  
> No exceptions. No workarounds. Fix it or make a documented decision to change the requirement.**

---

*SkillSwap — Peer-to-Peer Skill Exchange Platform | Founder Docs | 2026*
