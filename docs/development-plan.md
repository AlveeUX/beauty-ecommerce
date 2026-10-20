# Phase-by-Phase E-Commerce Development Plan

| Item | Value |
|---|---|
| Version | 0.1 (draft, awaiting approval) |
| Last updated | 2026-10-19 |
| Derived from | `PRD.md` v0.1 (requirement IDs, Figma inventory in PRD §6.1), `e2e-testing-strategy.md` |
| Current status | P0 to P6 `PASSED`, plus P4b (product page layouts, D-038) `PASSED` 2026-10-20. P10 (content pages) `PASSED` for the storefront 2026-10-20 (D-040..D-043: policy, store location, About, Contact, FAQs, 404, blog, newsletter). P7+ not started and needs approval. |
| Restrictions | Local only, except the user's own GitHub repo (D-046: commit locally, push on request). No Vercel/deployment, no Git history rewrites, no real payment/shipping/email providers. |

Technology items below are **proposed** (PRD §11.1) and become binding only after approval in P0.

---

## 1. How to read this plan

- **Status values:** `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `FAILED`, `PASSED` (same vocabulary as the testing strategy). A phase is `PASSED` only when its exit gate evidence is recorded (§5).
- Phases follow **dependency and risk**, not the order of frames in Figma.
- Figma node IDs are real (PRD §6.1). Frames are listed by ID; "Details family" = the 11 product-details frames, "Listing family" = the 10 shop/list frames.
- Test IDs (`E2E-…`) are defined in `e2e-testing-strategy.md` §5.

### 1.1 Dependency overview

```
P0 Approval
 └─> P1 Foundation
      ├─> P2 Tokens/Components/Shell ─────────────┐
      └─> P3 Data model + Catalog API ────────────┤
                                                  ├─> P4 Catalog, Search, PDP ─> P5 Cart/Wishlist/Compare ─> P6 Auth, Checkout, Orders, Tracking
                                                  ├─> P10 Content pages (parallel after P2+P3)
                                                  └─> P7 Admin foundation (needs P3 + admin UX approval)
                                                         └─> P8 Admin catalog/inventory/orders (needs P6 for orders)
                                                               └─> P9 Admin content/promotions/settings + storefront integration
 P4–P10 ─> P11 Responsive & Accessibility ─> P12 Regression & Local release readiness
```

**Can run in parallel:** P2 ∥ P3 (after P1); P10 ∥ P4/P5 (after P2+P3); admin UX design ∥ P4–P6.
**Must be sequential:** P1 → (P2, P3) → P4 → P5 → P6; P6 → P8 (orders); P7 → P8 → P9; all → P11 → P12.

---

## 2. Phases

### P0 — Discovery and requirements approval
| Field | Content |
|---|---|
| Objective | Approve the PRD, stack, scope boundaries and layout policy. |
| Scope | Documentation only. |
| Screens / Figma | Inventory of all 60 frames (PRD §6.1). |
| Prerequisites | None. |
| Deliverables | `PRD.md`, `context.md`, `development-plan.md`, `e2e-testing-strategy.md`; decision log of OQ-01…OQ-26 answers. |
| Tasks | P0-T01 Client/owner review of PRD · P0-T02 Decide OQ-03 (stack), OQ-06 (layouts), OQ-04/05 (shipping/payment) · P0-T03 Decide admin design approach (OQ-24) and responsive approach (OQ-07) · P0-T04 Update `context.md` with approvals. |
| Requirements | All (approval). |
| Risks | Decisions delayed → blocks P1/P2. |
| E2E / visual | N/A (no code). |
| Completion criteria | User explicitly approves docs and next phase; all P0-blocking OQs answered or defaults accepted in writing. |
| Exit gate | Written approval recorded in `context.md` §16. |
| Status | `PASSED` (provisional): approval by instruction (decision-log D-001); unanswered OQs use defaults (D-004). |

### P1 — Project foundation and local environment
| Field | Content |
|---|---|
| Objective | Reproducible local app skeleton with tooling, no features. |
| Scope | Repo scaffold (after approval), TypeScript, lint/format, folder structure, env handling, DB connection, test runners installed, `README`. |
| Screens | None. |
| Prerequisites | P0 approved. |
| Dependencies | Node v24.18.0 / npm 11.16.0 (verified present). |
| Deliverables | Running dev server with placeholder route; `npm run dev/test/e2e` scripts; `.env.example`; `.gitignore`; seed command stub; Playwright config. |
| Tasks | P1-T01 scaffold · P1-T02 lint/format/tsconfig strictness · P1-T03 DB + ORM + migration tooling · P1-T04 test tooling (Vitest, Playwright, axe) · P1-T05 folder conventions documented in `context.md` · P1-T06 sanity E2E (home placeholder loads). |
| Requirements | SEC-005, NFR local DX. |
| Data/API | Empty DB, health endpoint. |
| Risks | Stack churn; Windows path/shell issues. |
| E2E / visual | E2E smoke only (`E2E-SMOKE-01`). |
| Completion criteria | Clean clone → install → dev server → smoke test passes. |
| Exit gate | Smoke test report recorded; no secrets committed; no Git remote/push performed. |
| Status | `PASSED` 2026-10-19. Evidence: `decision-log.md` §4. Deviations: DB path/seed are stubs; empty folders created for P2+; CLAUDE.md added (D-016). |

### P2 — Design tokens, assets and shared components (storefront shell)
| Field | Content |
|---|---|
| Objective | Single source of design tokens, exported assets, and the shared UI kit + header/footer. |
| Scope | Token audit across frames; asset export; primitives, composites, header (incl. mega menu), footer, hero/breadcrumb, benefit strip, announcement bar. |
| Figma | Tokens: sample all groups starting `3:22750` (already sampled), `3:2290`, `3:4833`, `3:12708`, `3:22268`. Shell: `3:1452`, `3:1749`, `3:2009`. Assets: `3:42576`. Product card pattern: `3:41609`. |
| Prerequisites | P1. |
| Deliverables | `tokens.css` (colors, type, spacing, radii, shadows); font loading (Instrument Sans, Prata — license check); icon set; component catalog page (dev-only); Header/Footer. |
| Tasks | P2-T01 token audit & extraction table · P2-T02 asset export & optimization (no temp Figma URLs) · P2-T03 primitives (Button, Input, Select, Checkbox, Badge, Rating, Price) · P2-T04 ProductCard (badges, hover actions, price/compare-at) · P2-T05 Header + announcement bar · P2-T06 Mega menu/dropdown · P2-T07 Footer + newsletter form UI · P2-T08 Benefit strip, breadcrumb hero · P2-T09 Drawer/Modal/Accordion/Carousel primitives. |
| Requirements | STO-001…005, NWS-001 (UI), PRD §10. |
| Shared components | All shared components are created here. |
| Responsive | Define breakpoints; implement 1920 → 1024 for shell; mobile shell proposals reviewed in P11 but header collapse must not be blocked. |
| E2E / visual | `E2E-STO-01…03`; screenshot comparison of Header/Footer vs `3:22268` regions and `3:1452`. |
| Risks | Token drift; font licensing; contrast issues (PRD R10). |
| Completion criteria | Component catalog matches Figma at 1920 px within agreed tolerance; a11y checks pass for shell. |
| Exit gate | Visual-verification report + axe report stored; tokens table reviewed. |
| Status | `PASSED` 2026-10-19 (with documented gaps). Evidence: decision-log D-018/D-019/D-022/D-030, `e2e-testing-strategy.md` section 12. |
| Delivered | Tokens (`src/styles/tokens.css`), self-hosted fonts, Icon set, Button/Price/Rating/ProductCard (default, light, cta), Header (+Home variant), AnnouncementBar, Footer (+Home variant), BenefitStrip, PageHero, NewsletterForm, SearchOverlay, details-based accordions, native-dialog lightbox, scrolling track (carousel). |
| Mega menu | Built 2026-10-19 (decision-log D-034). |
| Gaps |  no generic Drawer/Modal primitive (cart drawer arrives in P5); only ~12 frames sampled for tokens; footer leaf imagery omitted; mobile header navigation (P11). A dev-only component catalog exists at `/dev/components`. |

### P3 — Data model, seed data and catalog backend
| Field | Content |
|---|---|
| Objective | Persisted catalog model and read APIs the storefront needs. |
| Scope | Entities: Product, Variant, Category, InventoryRecord, Media, Review (read), Content stubs; migrations; seed; catalog/search/filter queries. |
| Figma | Data derived from `3:42651` (taxonomy), `3:41609` (products), `3:4833` (filters), `3:12708` (PDP fields). |
| Prerequisites | P1; OQ-11/12/15 answered or defaults accepted. |
| Deliverables | Schema + migrations; deterministic seed (~40 products, categories per OQ-15); catalog service (list/filter/sort/paginate/facets); product detail service; shared validation schemas. |
| Tasks | P3-T01 schema & migrations · P3-T02 seed script (idempotent, resettable) · P3-T03 catalog list service with filters (category, price, size, color, rating, availability) · P3-T04 sort & pagination · P3-T05 product detail + related service · P3-T06 search service (name/category/tag/ingredient) · P3-T07 API route handlers + validation + error shape. |
| Requirements | CAT-001…005, CAT-009, PRD-001/002/007, SRC-001, BR-01/02/03/10, SEC-003. |
| Risks | Variant model churn (OQ-11); SQLite-vs-Postgres drift. |
| E2E / visual | API/integration tests (`API-CAT-*`); no UI yet. |
| Completion criteria | Seeded DB returns correct filtered/sorted/paginated results; invalid params → 400; drafts hidden. |
| Exit gate | Integration test report; seed reproducible (reset → identical counts). |
| Status | `PASSED` 2026-10-19. Evidence: 55 Vitest tests (integration + API), `seedCatalog` is idempotent (tested), decision-log D-020/D-021/D-024. |
| Delivered | Schema + migrations 0000-0003 (categories, products, images, variants, inventory, colors, tags, collections, reviews, banners), seed (36 products, 14 categories, home content), catalog service (list/filter/sort/paginate, facets, detail, related, search, category cards, collections, products by slug), review submission, API routes (`/api/catalog/products`, `/api/catalog/products/[slug]`, `/api/catalog/products/[slug]/reviews`, `/api/catalog/categories`, `/api/search`), shared error shape. |
| Deviations | Reviews (PRD-006) submission API was pulled forward from P6/P9 (moderation UI still P9). |

### P4 — Catalog listing, search and product details (storefront)
| Field | Content |
|---|---|
| Objective | Shoppers can browse, filter, search and view products. |
| Scope | Listing (approved layout only), filter sidebar/chips/sort/pagination, search overlay + results, PDP with variants, out-of-stock, reviews display. |
| Figma | `3:4833` (+ approved variant from `3:5980`, `3:11424`), `3:16254`, `3:12708`, `3:16432`; optional later: `3:34650`, `3:36996`, gallery/zoom frames. Home section `3:2290` product carousels deferred to P4b below. |
| Prerequisites | P2, P3. |
| Deliverables | `/shop`, `/category/[slug]`, `/categories`, `/product/[slug]`, `/search`; Home (`3:2290`) after listing components exist. |
| Tasks | P4-T01 `/shop` page with filters, chips, sort, pagination, URL-state · P4-T02 category pages + `3:28043` · P4-T03 search overlay + results · P4-T04 PDP header (gallery, variants, qty, buy-now stub) · P4-T05 PDP content blocks (accordion, ingredient cards) · P4-T06 reviews display + form UI (submission wired in P6/P9) · P4-T07 out-of-stock & 404 · P4-T08 **Home page** (hero, categories, carousels, banners static→admin later) · P4-T09 empty/loading/error states. |
| Requirements | HOM-001…006, CAT-001…006/008, SRC-001/002, PRD-001…008. |
| Data/API | P3 services. Home banners initially seeded (admin-managed in P9). |
| Responsive | Per PRD §12.2 proposals; confirm at 1024/768/390. |
| E2E / visual | `E2E-HOM-*`, `E2E-CAT-*`, `E2E-SRC-*`, `E2E-PRD-*`; screenshots vs `3:2290`, `3:4833`, `3:12708`, `3:16432`. |
| Risks | Layout-variant scope creep; fidelity on long pages (Home 10025 px). |
| Completion criteria | All listed E2E pass; visual report per frame; no critical a11y violations. |
| Exit gate | Module reports for HOM/CAT/SRC/PRD with status `PASSED`. |
| Status | `PASSED` 2026-10-19 (with documented gaps). Evidence: 42 Playwright tests (E2E-HOM-01..04, E2E-CAT-01..08, E2E-SRC-01..05, E2E-PRD-01..11, E2E-A11Y-01/02, E2E-STO-01..03, E2E-SMOKE-01), axe 0 critical/serious, side-by-side Figma comparison for Shop, PDP, Home, Search, Categories (strategy section 12). |
| Routes live | `/` (Home), `/shop`, `/category/[slug]` (redirect), `/categories`, `/product/[slug]`, `/search`, 404. |
| Gaps (deferred to later phases/decisions) | Cart/wishlist/compare/buy-now actions and header counts (P5); quick view, size guide, share modal; list view and alternate layouts (OQ-06); PDP color/subscribe/countdown/zoom variants; reviewer photos; responsive polish below 1100px and mobile nav (P11); blog (P10). See decision-log D-029. |

### P5 — Cart, wishlist and compare
| Field | Content |
|---|---|
| Objective | Persistent cart with server validation; wishlist; compare. |
| Scope | Cart service/API, drawer, cart page, empty states, wishlist page/state, compare (if scoped). |
| Figma | `3:15101`, `3:14744`, `3:20299`, `3:29452`, `3:20784`, `3:21193`, `3:15517` (clarify), `3:21520`, `3:21946`, `3:15903`. |
| Prerequisites | P4 (product components), P3. |
| Deliverables | Cart persistence (guest cookie/token), cart APIs, drawer + page, coupon *UI* (rules in P9), wishlist, compare. |
| Tasks | P5-T01 cart domain service (add/update/remove/validate stock, money in cents) · P5-T02 cart API · P5-T03 cart drawer (empty/filled) · P5-T04 cart page + free-shipping bar (threshold from settings stub) · P5-T05 wishlist (guest local + sync hook for P6) · P5-T06 compare page + popup (if approved) · P5-T07 header counts. |
| Requirements | CRT-001…005, WSH-001…003, CMP-001, BR-03/04/10. |
| Risks | Stock race conditions; guest→account merge (OQ-20). |
| E2E / visual | `E2E-CRT-*`, `E2E-WSH-*`, `E2E-CMP-*`; screenshots vs `3:20299`, `3:29452`, `3:20784`, `3:21193`, `3:21520`. |
| Completion criteria | Cart survives reload; over-stock quantity rejected; totals correct; counts consistent. |
| Exit gate | Module reports `PASSED`. |
| Outcome | **PASSED 2026-10-19** (decision-log D-036). Typecheck, lint, format clean; 65 Vitest (10 cart service tests); 64 Playwright incl. E2E-CRT-01..07, E2E-WSH-01..02, E2E-CMP-01..03, A11Y-03 (drawer focus trap) and cart/wishlist/compare axe checks. Gaps: coupons (P9), account merge and wishlist sync (P6), checkout CTA 404 until P6, share buttons inert, responsive polish (P11). |
| Status | `NOT_STARTED` |

### P4b — Product page layouts (added on user request, 2026-10-20)
| Field | Content |
|---|---|
| Objective | Build the 10 product-page layouts of the Figma "Product details" group (PRD-009..012). |
| Figma | `3:34650`, `3:35806`, `3:36996`, `3:29779`, `3:30941`, `3:33384`, `3:32103`, `3:17692`, `3:18997` (+ default `3:12708`, out of stock `3:16432`). |
| Outcome | **PASSED 2026-10-20** (decision-log D-038). Vitest 111, Playwright 101 (E2E-LAY-01..12). Gaps: subscription not purchasable, colour not stored on cart/order, price does not revert after a sale, admin control for the layout (P8), responsive (P11). |

### P6 — Authentication, checkout, orders and tracking
| Field | Content |
|---|---|
| Objective | Real end-to-end purchase using local mock payment and offline methods. |
| Scope | Customer auth, checkout form, order placement transaction, payment records, confirmation (needs design), tracking, basic account pages (needs design). |
| Figma | `3:22750`, `3:23089`, `3:23424`, `3:22268`, `3:23740`. **Missing designs:** confirmation, tracking result, account area. |
| Prerequisites | P5; decisions OQ-04, OQ-05, OQ-09, OQ-21; proposals for missing screens approved. |
| Deliverables | Auth endpoints + pages; checkout; order state machine; payment gateway interface + mock; email outbox; tracking. |
| Tasks | P6-T01 auth service (hashing, sessions, throttling) · P6-T02 login/register/forgot/reset pages · P6-T03 checkout form + validation · P6-T04 shipping & totals calculation per settings · P6-T05 order placement transaction + idempotency · P6-T06 payment gateway interface + mock + COD/bank · P6-T07 confirmation page (proposed design) · P6-T08 tracking form + result (proposed design) · P6-T09 account: profile/addresses/orders (proposed design) · P6-T10 wishlist/cart merge on login. |
| Requirements | USR-001…005, CHK-001…009, TRK-001/002, ORD-001/002, BR-03…08/12, SEC-001…004. |
| Risks | Double orders, partial failure, enumeration attacks on tracking/reset. |
| E2E / visual | `E2E-USR-*`, `E2E-CHK-*`, `E2E-TRK-*`; screenshots vs `3:22750`, `3:23089`, `3:23424`, `3:22268`, `3:23740`. |
| Completion criteria | Guest and registered purchase succeeds; stock decremented; failed payment leaves consistent state; tracking requires id+email. |
| Exit gate | Reports `PASSED`; transaction-integrity test evidence stored. |
| Outcome | **PASSED 2026-10-20** (decision-log D-037). Vitest 106 (41 new incl. rollback, idempotency, stock, state machine), Playwright 89 (E2E-USR-01..07, CHK-01..09, TRK-01..04, A11Y-04). Gaps: coupons (P9), admin order actions (P8), proposed designs for confirmation/tracking result/account, responsive (P11), no email verification. |
| Status | `NOT_STARTED` |

### P7 — Administration dashboard foundation
| Field | Content |
|---|---|
| Objective | Secure admin shell with RBAC and audit trail. |
| Scope | Admin auth, session, layout, nav, permission middleware, audit log, shared admin components (table, form, dialog, toast). |
| Figma | **None exist.** Requires approved admin UX direction (PRD §8.1). |
| Prerequisites | P3, P2; admin design approved (OQ-24). |
| Deliverables | `/admin` shell; roles/permissions; AuditLog service; admin component kit; dashboard home (ADM-002 basic). |
| Tasks | P7-T01 admin UX wireframes (for approval) · P7-T02 admin auth + separate session · P7-T03 RBAC model + server-side guards · P7-T04 admin layout + responsive nav · P7-T05 table/form/dialog/toast components · P7-T06 audit log · P7-T07 dashboard home. |
| Requirements | ADM-001…006, AUR-001, SEC-002/007. |
| Risks | Invented UX not matching client expectation (PRD R1). |
| E2E / visual | `E2E-ADM-*` incl. permission-denial matrix; visual checks vs approved wireframes (no Figma reference). |
| Completion criteria | Customers/unauthenticated users blocked; each role sees only permitted nav/actions; audit entries recorded. |
| Exit gate | Permission matrix test report `PASSED`. |
| Status | `NOT_STARTED` |

### P8 — Admin catalog, inventory and orders
| Field | Content |
|---|---|
| Objective | Client can run products, stock and orders from the dashboard, and storefront reflects changes. |
| Scope | Products/variants/categories/media CRUD, inventory adjust + history, orders list/detail/status/shipments. |
| Prerequisites | P7, P6 (orders exist). |
| Deliverables | ACT, AIN, AOR modules; storefront reads updated data. |
| Tasks | P8-T01 media library · P8-T02 category CRUD · P8-T03 product CRUD + content blocks · P8-T04 variants/SKUs · P8-T05 inventory adjust/history · P8-T06 orders list/filter · P8-T07 order detail + status transitions + stock restore on cancel · P8-T08 shipments/tracking info → TRK-002 · P8-T09 admin→storefront consistency tests. |
| Requirements | ACT-001…004, AIN-001/002, AOR-001…004, BR-05/06/09/10, SEC-006. |
| Risks | Stale caches; concurrent edits; deleting referenced products. |
| E2E / visual | `E2E-ACT-*`, `E2E-AIN-*`, `E2E-AOR-*` + cross-app journeys `E2E-X-01…06` (admin edits visible on storefront). |
| Completion criteria | Price/stock/publish change appears on storefront without code change; illegal transitions rejected; soft delete verified. |
| Exit gate | Cross-app journey reports `PASSED`. |
| Status | `NOT_STARTED` |

### P9 — Admin content, promotions, settings, customers; storefront integration
| Field | Content |
|---|---|
| Objective | Remaining dashboard modules and wiring to storefront content. |
| Scope | Banners/collections, blog, static pages, FAQs, store locations, coupons, sale windows, settings (shipping, payments, threshold), customers, contact messages, subscribers, basic reports. |
| Prerequisites | P7, P8 (data), P6 (checkout uses settings/coupons). |
| Tasks | P9-T01 banners/collections → Home · P9-T02 blog CRUD/scheduling · P9-T03 pages/FAQ/benefit/marquee/footer links · P9-T04 coupons + checkout enforcement · P9-T05 store settings, shipping zones, payment toggles · P9-T06 customers & subscribers · P9-T07 contact messages · P9-T08 sale/countdown (if approved) · P9-T09 reports (COULD). |
| Requirements | ACN-001…003, APM-001…003, AST-001/002, ACS-001/002, ARP-001, HOM-006, NWS-001. |
| E2E / visual | `E2E-ACN-*`, `E2E-APM-*`, `E2E-AST-*`, `E2E-ACS-*`, cross-app journeys. |
| Completion criteria | Content/promotion/setting changes propagate to storefront; coupon rules enforced server-side. |
| Exit gate | Reports `PASSED`. |
| Status | `NOT_STARTED` |

### P10 — Storefront content and informational pages
| Field | Content |
|---|---|
| Objective | Blog, About, Contact, FAQs, Store locator, Policy, Newsletter. |
| Figma | Approved blog layout among `3:25805`, `3:28943`, `3:24811`, `3:25320`, `3:26239`; `3:26684`, `3:28603`, `3:27227`, `3:27601`, `3:28374` (clarify), `3:24455`, `3:24059`, `3:2009`. |
| Prerequisites | P2, P3 (content tables); admin management arrives in P9 (initial seeded). |
| Parallelism | Can run alongside P4–P6. |
| Tasks | P10-T01 blog list/details · P10-T02 About · P10-T03 Contact (form + storage) · P10-T04 FAQs · P10-T05 Store locator · P10-T06 Policy pages · P10-T07 Newsletter popup/footer submit. |
| Requirements | CNT-001…006, NWS-001. |
| E2E / visual | `E2E-CNT-*`; screenshots vs listed frames. |
| Completion criteria | Pages render published content only; forms validate and store. |
| Exit gate | Reports `PASSED`. |
| Status | `PASSED` 2026-10-20 for the storefront side (D-040 policy, D-041 store location/About/Contact/FAQs/404, D-042 blog, D-043 newsletter). Admin management of this content is P8/P9. Open: copy assumptions listed in the decision log; responsive below 1100 px is P11. |

### P11 — Responsive refinement and accessibility
| Field | Content |
|---|---|
| Objective | Make every MVP route work at tablet/mobile and meet a11y target. |
| Scope | Apply approved breakpoints; header collapse; filter drawer; cart cards; checkout single-column; admin responsive nav/tables; keyboard and screen-reader pass. |
| Prerequisites | P4–P10 functionally complete; breakpoints approved (OQ-07). |
| Tasks | P11-T01 breakpoint audit per route · P11-T02 header/mega-menu mobile · P11-T03 listing/PDP/cart/checkout mobile · P11-T04 admin responsive · P11-T05 keyboard/focus/ARIA fixes · P11-T06 contrast fixes (with approval) · P11-T07 reduced-motion. |
| Requirements | PRD §10, §12 NFR. |
| E2E / visual | Responsive suite at 1920/1440/1024/768/390; axe on all MVP routes. Visual references for non-desktop widths are **proposed** (no Figma). |
| Completion criteria | No horizontal overflow; critical journeys pass at all viewports; zero critical/serious axe issues. |
| Exit gate | Responsive + a11y reports `PASSED`. |
| Status | `NOT_STARTED` |

### P12 — Integrated regression and local release readiness
| Field | Content |
|---|---|
| Objective | Prove the whole system works together locally and is documented. |
| Tasks | P12-T01 full regression run · P12-T02 performance check against NFR targets · P12-T03 security checklist (SEC-001…007) · P12-T04 reset/seed/recovery drill · P12-T05 README + operations notes · P12-T06 open-defect triage and sign-off · P12-T07 update `context.md`, `PRD.md` statuses. |
| Prerequisites | P1–P11 `PASSED`. |
| Completion criteria | All critical journeys pass in clean environment; no unresolved critical/high defects without written approval. |
| Exit gate | Release-readiness report signed off by user. **Deployment remains out of scope until separately approved.** |
| Status | `NOT_STARTED` |

---

## 3. Task-level implementation contracts

No task may be coded until its contract exists in the task file (`tasks/<phase>/<TASK-ID>.md` or an equivalent section here) and is approved by the user.

### 3.1 Contract template

```
Task ID:            P4-T01
Objective:          one sentence
Exact scope:        included / excluded (explicit list)
Figma node IDs:     e.g. 3:4833 (reference), 3:11424 (filter drawer)
Requirement IDs:    e.g. CAT-001, CAT-002, CAT-003
Files/modules:      expected paths to create/change
Prerequisites:      task/phase IDs, decisions (OQ-xx)
Acceptance criteria: Given/When/Then, testable
Responsive:         viewports and behaviors (Figma-defined vs proposed)
Functional tests:   unit/integration cases
E2E scenarios:      E2E-… IDs (positive, negative, boundary, permission)
Visual verification: frame node, route, viewport, state, comparison method
Regression risks:   modules that may be affected + tests to re-run
Evidence required:  report IDs / screenshots to attach
Status:             NOT_STARTED | IN_PROGRESS | BLOCKED | FAILED | PASSED
```

### 3.2 Rules
1. Before coding: re-read the PRD requirements, then fetch the frame's screenshot and design context via Figma MCP (do not reuse stale memory; temporary Figma asset URLs are never committed).
2. Reuse shared components/tokens; no hardcoded colors/fonts that exist as tokens.
3. Write or extend tests with the task; the task is not done until the E2E lifecycle in `e2e-testing-strategy.md` §3 is complete.
4. Record any deviation from Figma and any decision change; update `context.md`.
5. One module/task at a time unless the plan marks tasks as parallel.

---

## 4. Parallelizable vs sequential summary

| Parallel candidates | Condition |
|---|---|
| P2 and P3 | After P1 |
| P10 with P4/P5/P6 | After P2+P3 |
| Admin UX wireframes (P7-T01) with P4–P6 | Design work only |
| Tasks within P2 (primitives vs shell) | Different files; tokens first |
| Tasks within P8 (media/category vs inventory) | Media/category before product CRUD |

| Sequential chain | Reason |
|---|---|
| P3 → P4 | UI needs real data contracts |
| P5 → P6 | Checkout consumes cart |
| P6 → P8 (orders) | Admin orders need order model + placement |
| P7 → P8 → P9 | Admin shell/RBAC first |
| P11 → P12 | Regression after final responsive/a11y changes |

---

## 5. Phase completion policy

A phase is **not** complete because code is written. It is `PASSED` only when:

1. All tasks meet their acceptance criteria.
2. Relevant unit/integration/API tests pass.
3. Browser E2E tests for the phase's modules pass against the actual local app.
4. Visual verification against the listed Figma nodes is done where a Figma reference exists (or against approved wireframes where it does not), with differences documented.
5. Responsive behavior checked at the viewports defined for that phase.
6. No unresolved critical/high defects without explicit user approval.
7. Regression tests for dependent modules re-run.
8. Evidence (report IDs, screenshots, results) recorded in the module report and the phase status updated here.
9. `context.md` (status, decisions) updated.

A test that was not run is never recorded as passed.

---

## 6. Requirement-to-phase coverage

| Phase | Requirement groups |
|---|---|
| P2 | STO-001…005 |
| P3 | CAT data, PRD data, SRC data, BR-01/02/03/10 |
| P4 | HOM, CAT, SRC, PRD |
| P5 | CRT, WSH, CMP |
| P6 | USR, CHK, TRK, ORD |
| P7 | ADM, AUR, SEC-002/007 |
| P8 | ACT, AIN, AOR |
| P9 | ACN, APM, AST, ACS, ARP |
| P10 | CNT, NWS |
| P11 | Responsive/a11y NFR |
| P12 | All, SEC, NFR |

## 7. Decision/approval log (to maintain)

| Decision | Status | Date | Doc impact |
|---|---|---|---|
| Documentation set approved | Approved by instruction | 2026-10-19 | all (D-001) |
| Tech stack (PRD §11.1) | Adopted as default | 2026-10-19 | PRD, context (D-005) |
| P5 approved | Cart, wishlist, compare | 2026-10-19 | plan (D-033) |
| P6 approved | Auth, checkout, orders, tracking | 2026-10-20 | plan (D-037) |
| Next approval needed | P7 (admin foundation) | - | plan |
| One layout per route policy (OQ-06) | Pending | — | PRD, plan |
| Admin UX approach (OQ-24) | Pending | — | PRD, plan P7 |
| Breakpoints (OQ-07) | Pending | — | PRD, e2e |
