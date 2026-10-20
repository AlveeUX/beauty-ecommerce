# CLAUDE.md

Read first, in this order: `docs/context.md` (current state), `docs/decision-log.md` (why things are the way they are), then the document that owns your task (`docs/PRD.md`, `docs/development-plan.md`, `docs/e2e-testing-strategy.md`).

## Rules

- **Local only.** No `git init`, GitHub push, Vercel/deploy, production config, real payment/shipping/email providers, or remote DB without explicit user approval.
- **One phase/task at a time** per `docs/development-plan.md`. Do not start the next phase without user approval. Define the task contract (plan section 3) before coding.
- **Figma is the visual source of truth** (file key `sXBQCd1Az2To21ejk56Yjc`). Fetch the specific frame via Figma MCP before building it; never fetch the whole page; never commit temporary Figma asset URLs. Use design tokens, not hardcoded values.
- **No module is done until** its E2E lifecycle passes (`docs/e2e-testing-strategy.md` section 3). Never report an unrun test as passed.
- **Keep `docs/figma-page-checklist.md` current:** when a Figma frame is built and tested, change its ❌ to ✅ (and the totals) in the same step.
- **Log decisions.** Append to `docs/decision-log.md` when you choose a tool, default, or approach (never rewrite history). Update `docs/context.md` when status or decisions change.
- Money is integer cents. Authorize on the server for every admin route. No secrets in the repo.

## Commands

`npm run dev` - `npm run typecheck` - `npm run lint` - `npm test` - `npm run e2e` (see README).
