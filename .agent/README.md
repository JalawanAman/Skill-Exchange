# .agent — Agent Directory

This directory is the **personal memory and workspace of the AI agent** collaborating on SkillSwap.

It is not product code. It is not founder docs.  
It is the agent's own layer — progress tracking, context, decisions, and communication with the founder.

---

## Project Identity

| | |
|---|---|
| **Project** | SkillSwap — Peer-to-Peer Skill Exchange Platform |
| **Founder** | Jalawan Aman Khan |
| **Developer** | Jalawan Aman Khan |
| **Agent Role** | Technical co-builder, architect, reviewer, documentation keeper |
| **Started** | 2026-05-02 |
| **Status** | Pre-development — Founder Docs complete, scaffolding next |

---

## Directory Structure

```
.agent/
├── README.md              ← you are here — orientation and identity
├── progress/              ← milestone tracking, what's done, what's next
│   └── PROGRESS.md        ← single source of current build status
├── context/               ← background knowledge the agent keeps about the project
│   └── FOUNDER_NOTES.md   ← key things Jalawan has said that shape decisions
├── inbox/                 ← founder drops files/notes here for the agent to pick up
│   └── README.md
├── decisions/             ← log of every architectural or product decision made
│   └── DECISIONS.md
├── pending/               ← deferred tasks with strict trigger conditions (agent must remind)
│   └── PENDING_TASKS.md
├── prs/                   ← one description doc per pull request (PR-001, PR-002, …)
│   ├── PR-001-m1-setup.md
│   └── PR-002-dev-to-main.md
└── generated/             ← agent-generated docs, drafts, plans not yet in founder docs
    └── README.md
```

---

## How to Use This Directory

### As the founder (Jalawan):
- Drop files in `inbox/` when you want the agent to read something — a screenshot, a note, a reference, a new requirement
- Check `progress/PROGRESS.md` to see where the build is
- Check `decisions/DECISIONS.md` to see why something was built the way it was

### As the agent:
- Update `progress/PROGRESS.md` after every milestone or significant task
- Log every non-obvious decision in `decisions/DECISIONS.md` with the reason
- Save a description doc for every pull request in `prs/` (e.g. `PR-001-m1-setup.md`)
- Record any intentionally **deferred** work in `pending/PENDING_TASKS.md` with a strict trigger condition, and proactively remind the founder when a trigger fires
- Read `inbox/` and `pending/PENDING_TASKS.md` at the start of every session
- Store useful context that should persist across sessions in `context/`
- Put generated drafts or exploration docs in `generated/` — not in founder docs until approved

---

## Agent Principles

1. This directory grows with the project — keep it organised as it grows
2. Nothing in `.agent/` overrides the Founder Docs in `idea/docs/` — those are law
3. The agent reads `inbox/` before starting any session work
4. Progress is updated honestly — no inflating what's done
5. Decisions are logged with the reason, not just the outcome

---

*Agent directory initialised: 2026-05-02*  
*Founder: Jalawan Aman Khan*
