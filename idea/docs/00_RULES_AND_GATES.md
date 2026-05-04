# 00 — Rules and Gates

> This document is the law of the project.  
> Every agent and every developer must read and agree to these rules before writing a single line of code.

---

## Section 1 — The Non-Negotiable Rules

### Rule 1 — Gate First, Code Second
Every milestone has a gate. A gate is a set of tests and checks that must ALL pass before the next milestone begins. No partial passes. No "it mostly works". If one gate item fails, the milestone is not complete.

### Rule 2 — No Scope Creep During a Phase
Each phase has a defined scope. You do not add features from a later phase into an earlier one. If you discover something is missing, you log it in the `BACKLOG` section of `07_MILESTONES.md` and continue with current scope.

### Rule 3 — Schema Is Sacred
The database schema in `04_DATABASE_SCHEMA.md` is the contract. You do not alter a table, rename a column, or change a data type without updating the schema document first and running the migration. Schema changes require a migration file — never edit production data directly.

### Rule 4 — API Contract Before Implementation
Before writing a new endpoint or WebSocket event, it must exist in `05_API_SPEC.md`. The spec is written first. The code follows the spec, not the other way around.

### Rule 5 — Zero Cost Constraint
Every service used must have a free tier that covers the development and early-launch phase. If a paid service is introduced, it must be documented in `03_TECH_STACK.md` with the monthly cost and the threshold at which it triggers. The default answer to "can we add X?" is "only if it is free".

### Rule 6 — Tests Are Not Optional
Every feature must have tests as defined in `08_TESTING_STRATEGY.md`. Shipping without tests is not faster — it is debt with interest. If a gate requires a passing test suite, the suite must pass before proceeding.

### Rule 7 — Documentation Is Code
If you build it and do not document it here, it does not officially exist. Any agent working on this project that encounters undocumented behavior must stop and document it before continuing.

### Rule 8 — Security by Default
- Never store plain-text passwords (handled by auth provider)
- Never expose internal IDs in URLs without authorization checks
- Never trust client-sent credit values — always compute credits server-side
- Never allow a user to confirm their own session without the other party
- Input validation on every API endpoint — if it accepts user input, it validates it

### Rule 9 — Failing Gates Block Deployment
Nothing in a failing state is deployed to production. Staging can be broken. Production cannot.

### Rule 10 — AI Agents Follow the Spec
If an AI agent is building this project, it reads the spec documents before generating code. It does not hallucinate schema, endpoints, or logic. It follows this brain exactly.

---

## Section 2 — Gate Structure

Each gate has three categories of checks:

### Category A — Functional Checks (must all pass)
Tests that verify the feature works as specified. Written as automated tests where possible.

### Category B — Quality Checks (must all pass)
- No TypeScript errors (`tsc --noEmit` exits 0)
- No ESLint errors (lint exits 0)
- No broken imports
- Environment variables documented in `.env.example`

### Category C — Manual Verification (must be checked by a human or agent)
- UI renders correctly on mobile (375px width)
- UI renders correctly on desktop (1280px width)
- No console errors in browser
- Feature matches the spec description

---

## Section 3 — Gate Failure Protocol

When a gate fails:

1. **Stop.** Do not write new code on top of broken code.
2. **Identify.** Which specific check failed? Write it down.
3. **Classify.** Is it a bug (fix it), a spec mismatch (update the spec and get agreement), or a scope issue (defer to backlog)?
4. **Fix or decide.** Either fix the code, or make a documented decision to update the requirement.
5. **Re-run the gate.** All checks must pass, not just the one that failed.
6. **Only then proceed.**

---

## Section 4 — Environment Rules

### Development
- Run locally with `.env.local`
- Use local or dev-tier cloud services (Neon dev branch, etc.)
- Hot reload must work

### Staging
- Deployed to Vercel preview + Render staging service
- Uses staging environment variables
- Accessible via a preview URL
- All gate tests must pass before promoting to production

### Production
- Deployed only after all milestone gates pass
- Uses production environment variables stored in Vercel + Render dashboards
- Never push secrets to git

---

## Section 5 — Commit Rules

- Commit messages follow: `type(scope): description`
  - Types: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`
  - Example: `feat(auth): add Google OAuth sign-in`
- One logical change per commit
- Never commit `.env` files
- Never commit `node_modules`
- `main` branch is always deployable
- Feature branches named: `feature/milestone-N-description`

---

## Section 6 — Who This Brain Is For

This documentation is written to be read by:
1. A human developer building the project
2. An AI coding agent (Claude, Cursor, etc.) assisting the build
3. A future maintainer who was not present during the build

Write for all three audiences at once. Be explicit. Assume nothing.

---

*Last updated: 2026-05-02*
