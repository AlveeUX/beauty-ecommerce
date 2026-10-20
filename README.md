# Beauty Ecommerce (local development)

Storefront + administration dashboard built from the Figma design (see `docs/context.md`).
**Local-only phase:** nothing here is deployed, pushed, or connected to external services.

## Requirements

- Node.js >= 22 (developed on v24.18.0) and npm

## Setup

```bash
npm install
npx playwright install chromium   # once, for E2E tests
cp .env.example .env              # optional; defaults work without it
npm run db:migrate                # creates ./data/dev.db
npm run db:seed                   # demo catalog + Home content (36 products)
npm run dev                       # http://localhost:3000  (health: /api/health)
```

## Scripts

| Command                                       | Purpose                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`             | Next.js                                                                      |
| `npm run typecheck` / `lint` / `format:check` | Static checks                                                                |
| `npm test`                                    | Vitest unit + integration tests                                              |
| `npm run e2e`                                 | Playwright: resets and seeds `./data/test.db`, builds, serves on :3100, runs `tests/e2e` (`E2E_REUSE=1` reuses a running server) |
| `npm run test:reset`                          | Recreate the **test** database (refuses non-test paths)                      |
| `npm run db:generate`                         | Generate a migration after editing `src/db/schema.ts`                        |
| `npm run db:migrate` / `db:seed`              | Apply migrations / seed the dev DB                                           |

## What you can open locally (`npm run dev`, http://localhost:3000)

| Page | URL |
| ---- | --- |
| Home | `/` |
| Shop (filters, sort, pagination) | `/shop` |
| Categories | `/categories` |
| Product details | `/product/the-renewal-serum` (also try `/product/glass-glow-primer`, which is out of stock) |
| Search | header search icon, or `/search?q=serum` |
| Component catalog (dev only) | `/dev/components` |

Cart, wishlist, compare, checkout, accounts and the admin dashboard are not built yet (see `docs/development-plan.md`).

## Layout

```
src/app        routes (storefront; admin later under /admin) and API route handlers
src/db         schema, connection, migrations runner
src/server     domain services (business rules) - added from P3
src/components shared UI components - added from P2
src/lib        small shared utilities
src/styles     design tokens - added from P2
drizzle/       generated SQL migrations (commit these)
scripts/       db-migrate, db-seed, test-reset
tests/         unit, integration, api, e2e, visual, reports
```

## Project documents (in `docs/`)

`docs/PRD.md` (what) - `docs/development-plan.md` (when/how) - `docs/e2e-testing-strategy.md` (verification) - `docs/context.md` (current state) - `docs/decision-log.md` (why).
