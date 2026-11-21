# ClassX Platform — Operator Instructions

Start here after any breakage, deploy failure, or "which copy is correct?" question.
This file is the recovery checklist. `docs/SYNC.md` explains the contract.

## 1. One-time context

- Project: `C:\Users\Admin\src\classx-platform` (own Git repo, remote `origin`).
- Home directory `C:\Users\Admin` is **not** a project repo. Its old `src/classx-platform`
  gitlink was removed because it was a nested repo with no `.gitmodules`. Do not re-add it.
- Canonical branch: `main`. `Siri_ClassX-Platform` is an identical mirror.
- Canonical runtime: Node 26 in Docker, Express on `:8787`, SPA in `server/public`.
- Sessions/practice state: in-memory TTL store (Redis optional via `initRedis()`). No Redis/Postgres running.


## 2. Health check — run first

```powershell
cd C:\Users\Admin\src\classx-platform
npm run verify:sync            # tree + Git + contract (seconds)
npm run verify:sync:docker     # + docker build, run, /api/health commit match
```

Report: `artifacts/sync-status.json`. Any `fail` line includes the exact fix action.

## 3. Local breaks

```powershell
npm ci
npm run typecheck
npm run check
npm test
npm run build
npm start                      # http://localhost:8787/api/health
```

Expected: 4 subjects, 67 chapters, 2569 questions, 22/22 tests, build ~665 kB JS.
If `npm test` hangs: it is a synchronous loop, not a slow test. The last known one was
`splitIntoChunks()` in `server/lib/rag.js` (fixed). Re-introducing a tail-overlap loop
will hang the tutor tests again.

## 4. Git drift

```powershell
git status --short
git fetch origin
git rev-list --left-right --count origin/main...HEAD   # expect: 0 0
```

- Ahead > 0: commit and push (only after section 2 passes).
- Behind > 0: `git pull --ff-only origin main`, then re-run section 2.
- Tracked secret appears: stop, rotate the key, then move the file to `*.example`.

## 5. Docker drift

```powershell
docker info                    # daemon must be running
docker compose build --build-arg GIT_SHA=$(git rev-parse --short=12 HEAD)
docker compose up -d
curl http://localhost:8787/api/health
```

`/api/health` must return the same `commit` as `git rev-parse --short=12 HEAD`.
Local uses `COOKIE_SECURE=false` (plain HTTP); Render/VPS use `true` (HTTPS).

## 6. Production deploy (Render)

1. `render.yaml` must say `branch: main`.
2. Push `main`; Render auto-deploys.
3. Watch for these historical failure modes:
   - OOM during build -> `NODE_OPTIONS=--max-old-space-size=512` (already set).
   - 502 on boot -> healthcheck must reach `/api/health`; RAG index is lazy now, so boot is fast.
   - Login broken -> `COOKIE_SECURE` must be `true` only behind HTTPS.
   - Tutor slow on first question -> first `search()` builds the RAG index once (~8s); later calls are fast.
4. Verify: `GET https://<service>/api/health` -> `{ ok: true, commit: "<sha>" }`.

## 7. Reconciled Audit of Changes (2026-11-19 to HEAD c594959 & Beyond)

| Commit SHA | Date | Type | Description & Deliverables Touched |
|---|---|---|---|
| `HEAD` | 2026-11-21 | `feat(skills)` | Production Agent Skill package `skills/classx-knowledge-rag` (`SKILL.md`, `query-graph.mjs`, `topological-sort.mjs` with Kahn's algorithm & cycle detection, `prereq-chain.mjs`, `search-chunks.mjs`, `verify-rag.mjs`, `resources/schemas.json`), native CSS utilities (`web/src/utilities.css`), sticky header variable coordination, and layout overlap fixes. |
| `c594959` | 2026-11-21 | `feat(ui)` | Ultra-glossy glassmorphism and modern neumorphic mirror redesign across `styles.css`, `dashboard.css`, `courses-chapter.css`, `practice-mock.css`, `tutor-planner.css`, `progress-library.css`, and `Gamification.tsx`. |
| `b7a11e2` | 2026-11-21 | `feat(ui)` | Dual light/dark theme system (`styles.css`), Theme Switcher (`Layout.tsx`), One-Tap Sticky Quick Access Navigation Bar (`Layout.tsx`), Resilient 30 Learning Aids synthesis (`server/lib/learning-aids.js`), Gamification fallbacks (`Gamification.tsx`), 9 Route Redirects + 404 Wildcard boundary (`App.tsx`), Modular `instructions.d/` runbooks (00-05), and `VALIDATION_CHECKLIST.md` (28/28 items verified). |
| `a733622` | 2026-11-21 | `docs(agents)` | Logged UI/UX redesign and Docker parity verification in `AGENTS.md`. |
| `53bff60` | 2026-11-21 | `feat(ui)` | Platform-wide glassmorphic polish and dual-audience track selector (School 10-18y vs DSC/UPSC) in `TrackSelector.tsx`, `Layout.tsx`, and `store.tsx`. |
| `7464271` | 2026-11-20 | `feat(ui)` | Fixed broken screens: Learning Aids accordion & solved examples (`LearningAids.tsx`), Gamification XP award icon collision & leaderboard (`Gamification.tsx`), Concept Maps SVG color isolation & node inspector (`ConceptMapVisualizer.tsx`), Video Lessons chapter switcher & theater embed (`VideoLesson.tsx`). |
| `ed2b214` | 2026-11-19 | `docs` | Recorded GraphRAG 8-layer alignment gaps and session start/end protocols in `AGENTS.md`. |
| `4cdc456` | 2026-11-19 | `fix` | Curriculum check and sync topic mapping. |
| `989d249` | 2026-11-19 | `fix` | Restored guest-first practice/exam/progress flow, resolved 64px mobile overflow on `.chapter-quick-actions`, stabilized E2E tests. |
| `e11f3b1` | 2026-11-19 | `fix` | Security hardening: moved secrets to `.secrets`, removed vulnerable Qdrant client, fixed `bcryptjs` CommonJS import, memory fallback for sessions. |
| `abf5e56` | 2026-11-19 | `fix` | Test suite stability and coverage gates. |
| `e96842b` | 2026-11-19 | `feat` | Offline fallback for practice session storage. |
| `37a38a3` | 2026-11-19 | `feat` | Repeatable sync-verify automation. |
| `d3b2171` | 2026-11-19 | `fix` | Curriculum topic integrity. |
| `f287ef1` | 2026-11-19 | `fix` | Aligned local, Git, and Docker runtime contracts, added `scripts/sync-verify.mjs` and `npm run verify:sync:docker`. |

### Summary of Changed Files in the Sync Passes

| File | Why |
|------|-----|
| `skills/classx-knowledge-rag/**` | Production Agent Skill package: SKILL.md, query-graph, topological-sort, prereq-chain, search-chunks, verify-rag, schemas |
| `web/src/utilities.css` | Native CSS utility classes for grid, flex, spacing, aspect-ratio across 10 modern screens |
| `web/src/styles.css` | Dual theme CSS variables, coordinated sticky header variables (`--header-total-height`), glassmorphic tokens |
| `web/src/responsive.css` | Responsive breakpoints, 781px-1080px mid-viewport adjustments, mobile padding synchronization |
| `web/src/components/Layout.tsx` | Sticky Quick Access Navigation Bar, Theme Switcher, Track Selector |
| `web/src/components/VisualBlock.tsx` | Fixed SVG syntax string interpolation error `x2={60 + base}` |
| `web/src/components/ConceptMap.tsx` | Theme-aware node fill and dynamic label boundary calculations |
| `server/lib/rag.js` | Fixed infinite loops, lazy index, faster token/vector build, graph fallback hierarchy |
| `server/lib/session-store.js` | Lazy `redis` import (10-27s boot cost removed) |
| `server/index.js` | Async practice/exam/video routes, cookie flag, health `commit`, removed duplicate middleware and unused client imports |
| `tests/practice.test.js` | Await async session functions |
| `tests/verification.test.mjs` | Automated verification suite for skill, layout integrity, and checklist tags |
| `Dockerfile` | `GIT_SHA` stamp, dev-dependency prune |
| `docker-compose.yml` | Removed unused Postgres/Redis, explicit cookie flag, SHA build arg |
| `render.yaml` | Branch `main`, `COOKIE_SECURE`, generated session secret |
| `nginx.production.conf` | `/sw.js` path corrected |
| `.gitignore`, `.env.production.example` | Stop tracking production env template as secret |
| `scripts/sync-verify.mjs` | Repeatable local/Git/Docker parity gate |
| `docs/SYNC.md`, this file | Contract + recovery runbook |

## 8. Master Deliverables Checklist (Completed vs Incomplete)

To eliminate ambiguity and prevent agent rework, all deliverables are categorized and tagged with explicit `[COMPLETED]` and `[INCOMPLETE]` status markers:

### 8.1 Core Platform, Curriculum & Offline Data
- [x] `[COMPLETED]` **Curriculum Integrity**: 4 subjects (Mathematics, Science, Social Science, English), 67 chapters, 76 official topics, 52 full authored lessons, 15 syllabus maps, 2569 questions (1505 MCQs, 1064 subjective).
- [x] `[COMPLETED]` **Baseline Unit & Contract Tests**: 22/22 unit tests passing (`node --test tests/*.test.js`) across data, tutor, coverage, practice, sync, and session-store.
- [x] `[COMPLETED]` **TypeScript Compilation**: `npm run typecheck` (`tsc --noEmit -p web/tsconfig.json`) clean with 0 compilation errors across 177 source files.
- [x] `[COMPLETED]` **Production Bundling**: `npm run build` (`vite build`) compiles clean to `server/public` (~679 kB JS, KaTeX fonts, CSS bundles).
- [x] `[COMPLETED]` **Docker Parity & Sync Gate**: `scripts/sync-verify.mjs` validates commit SHA equality between Git HEAD and `/api/health.commit`.
- [x] `[COMPLETED]` **Security & Secrets Isolation**: Real API keys moved out of repo into `.secrets` (gitignored, Docker-ignored); `.secrets.example` provided.

### 8.2 UI/UX Modern Redesign, Theming & Responsive Layout
- [x] `[COMPLETED]` **Dual Light & Dark Theme System**: CSS variables defined in `:root` and `[data-theme="light"]` (`web/src/styles.css`:3-96) with persistent local storage (`localStorage('classx_theme')`).
- [x] `[COMPLETED]` **Theme Switcher Component**: Interactive toggle button in topbar header (`web/src/components/Layout.tsx`:215-222) with Sun/Moon Lucide icons.
- [x] `[COMPLETED]` **Sticky One-Tap Quick Access Navigation Bar**: Persistent navigation chip bar (`web/src/components/Layout.tsx`:229-278) with horizontal touch scroll for 11 core and supplemental routes.
- [x] `[COMPLETED]` **Dual-Audience Track Selector**: Toggle between "School (10-18y)" and "Competitive / DSC / UPSC" tracks (`web/src/components/TrackSelector.tsx`).
- [x] `[COMPLETED]` **Ultra-Glossy Glassmorphic Styling**: Backdrop blur tokens (`--glass-blur: blur(24px)`), translucent cards (`.glass-card`), and Neumorphic mirror utility styles (`.neu-card`).
- [x] `[COMPLETED]` **Native CSS Utilities (`web/src/utilities.css`)**: Zero-dependency CSS utilities for grid, flex, spacing, aspect-ratio across 10 modern screens (`AdaptivePractice`, `ConceptMapVisualizer`, `DoubtTutor`, `VideoLesson`, `Gamification`, `LearningAids`, `ParentDashboard`, `OKFMetadataBrowser`, `OfflineStatus`, `RAGSearchViewer`).
- [x] `[COMPLETED]` **Sticky Header-Rail Height Coordination**: Coordinated CSS variables (`--topbar-height`, `--quickbar-height`, `--header-total-height`) setting rails (`.chapter-rail`, `.practice-rail`, `.mock-rail`, `.tutor-context`, `.planner-rail`, `.progress-rail`) to `top: calc(var(--header-total-height) + 16px)`, eliminating 33px rail underlap.
- [x] `[COMPLETED]` **Mid-Viewport (781px-1080px) & Mobile Responsive Polish**: Fixed width adjustments for `.continue-card`, `.topbar` search trigger, and `.chapter-tabs-row` to prevent text crushing and horizontal overflow.
- [x] `[COMPLETED]` **SVG & Component Layout Bug Fixes**: Fixed `VisualBlock.tsx:97` (`x2={60 + base}`), node label overflow in `ConceptMap.tsx`, and dark mode node contrast.

### 8.3 Subsystems, Fallbacks & Learning Aids
- [x] `[COMPLETED]` **Resilient 30 Learning Aids Engine**: Catalog of 30 aids across 7 pedagogical groups (`server/lib/learning-aids.js`), polymorphic renderer (`LearningAids.tsx`), and STEM vs Non-STEM chapter support.
- [x] `[COMPLETED]` **Concept Graph Synthesis & SVG Visualizer**: Graph extraction in `server/lib/rag.js`, inline hex styling in `ConceptMapVisualizer.tsx`, quadratic Bezier edges, and interactive node inspector.
- [x] `[COMPLETED]` **Gamification & Leaderboard Resilience**: `FALLBACK_BADGES` and `FALLBACK_LEADERBOARD` pre-initialization in `Gamification.tsx`, level progress ring math, and null-safe user ID guards.
- [x] `[COMPLETED]` **Canonical Route Redirects & 404 Boundary**: 9 route aliases (`/mock-exams`, `/doubt`, `/study-plans`, etc.) mapped to active routes, plus wildcard `<NotFound />` fallback in `web/src/App.tsx`.
- [x] `[COMPLETED]` **Modular Subsystem Runbooks**: Decomposition of instructions into `instructions.d/00_OVERVIEW.md` through `05_ROUTING_AND_FALLBACKS.md`.
- [x] `[COMPLETED]` **Production Validation Matrix**: Comprehensive checklist with 28 verified criteria in `VALIDATION_CHECKLIST.md`.

### 8.4 Production Agent Skill Package (`classx-knowledge-rag`)
- [x] `[COMPLETED]` **Skill Specification & Frontmatter**: `skills/classx-knowledge-rag/SKILL.md` with valid YAML frontmatter (`name: classx-knowledge-rag`, description starting with "Use when..."), operational workflows, and schema contracts.
- [x] `[COMPLETED]` **Graph Query CLI (`scripts/query-graph.mjs`)**: CLI to extract concept nodes, directed edges, root/leaf concepts, groups, and neighbors with dual-mode (offline disk import + HTTP fallback).
- [x] `[COMPLETED]` **Kahn's DAG Topological Sorting (`scripts/topological-sort.mjs`)**: Kahn's algorithm DAG topological sort for concept maps, cycle detection, and dynamic linear learning path generation.
- [x] `[COMPLETED]` **Prerequisite & Unlock Chaining (`scripts/prereq-chain.mjs`)**: Backward recursive prerequisite resolution and forward unlock tree traversal.
- [x] `[COMPLETED]` **Grounded RAG Chunk Retrieval (`scripts/search-chunks.mjs`)**: Hybrid BM25 + 512-dim hashed-vector + graph boost search across 4,377 curriculum chunks.
- [x] `[COMPLETED]` **Skill Verification Test Suite (`scripts/verify-rag.mjs`)**: 10/10 automated programmatic verification suite for skill tools, graph queries, and RAG retrieval.
- [x] `[COMPLETED]` **JSON Schema Reference (`resources/schemas.json`)**: Formal schemas for graph outputs, topological paths, prerequisite chains, and RAG chunks.

### 8.5 Agentic Graph Knowledge RAG Engine Roadmap (INSTRUCTIONS.md § 10)
- [x] `[COMPLETED]` **Phase 0 Baseline**: In-memory BM25 postings, 512-dim hashed vectors, hybrid RRF fusion, and concept co-occurrence graph.
- [ ] `[INCOMPLETE]` **Phase 1: Provenance & Chunk Contract**: Adding `docId`, `sectionPath`, `chunkIndex`, `checksum` to every chunk in `server/lib/rag.js` and `/api/search` responses.
- [ ] `[INCOMPLETE]` **Phase 2: Multimodal Ingestion**: Authoring PDF asset manifests (`sha256`, page counts) and text extraction pipelines for source PDFs.
- [ ] `[INCOMPLETE]` **Phase 3: Real Embeddings**: External/ONNX embedding provider behind `RAG_EMBEDDING_PROVIDER` switch with fallback to local hashed vectors.
- [ ] `[INCOMPLETE]` **Phase 4: Query Planning & Graph Traversal**: Extending `TYPE_HINTS` into structured `{ intent, chapters, needsGraph }` and multi-hop graph query decomposition.
- [ ] `[INCOMPLETE]` **Phase 5: Grounding & Validation Gates**: Post-generation claim-citation verification and dynamic answerability threshold.
- [ ] `[INCOMPLETE]` **Phase 6: Observability & Evaluation**: Golden benchmark test set (10 questions) and aggregate latency/score telemetry on `/api/health`.
- [ ] `[INCOMPLETE]` **Phase 7: Control Plane**: Multi-tenant/RBAC and moderation layer.

### 8.6 Automated Verification Suites & Operating Standards
- [x] `[COMPLETED]` **Master Verification Suite (`tests/verification.test.mjs`)**: Automated test suite verifying skill package syntax, frontmatter, CLI execution, layout non-overlapping integrity, and checklist tags.
- [x] `[COMPLETED]` **Skill Tool Verification (`skills/classx-knowledge-rag/scripts/verify-rag.mjs`)**: 10/10 automated tests passing.
- [x] `[COMPLETED]` **Canonical Platform Verification Gates**: `npm test` (22/22 pass), `npm run typecheck` (0 errors), `node scripts/check.mjs` (0 errors), `npm run build` (clean bundle).

## 9. Hard rules

- Never edit `server/public/**`, `server/data/**`, or `artifacts/**` to make a check pass.
  Fix source (`web/**`, `source/**`, `server/lib/**`) and regenerate.
- Never commit `.env`, `.env.production`, `.secrets`, keys, or tunnel logs. Local secrets belong in `.secrets` (gitignored, Docker-ignored); the server loads `.env` then `.secrets`.
- Never `git push --force` to `main` or `Siri_ClassX-Platform`.
- One drift class per commit; run section 2 again before pushing.

## 10. RAG pipeline upgrade runbook

Target: production multimodal agentic GraphRAG diagram. Current code covers a local subset.
`AGENTS.md` owns the capability matrix and agent rules; this section owns the execution order.
Work one phase per commit. Do not start a phase until the previous gate passes.

### Phase 0 — Baseline (done)
1. `npm test`, `npm run check`, `npm run verify:sync:docker`.
2. Gate: 22/22 tests, Docker `/api/health.commit == HEAD`.

### Phase 1 — Provenance and chunk contract
1. Add `docId`, `sectionPath`, `chunkIndex`, `checksum` to every chunk in `server/lib/rag.js`.
2. Surface them in `getCitations()` and `/api/search` result objects (keep `page: null` until OCR).
3. Add a unit test asserting every chunk has provenance and no duplicate `docId + chunkIndex`.
4. Gate: `npm test`; tutor citations still pass.

### Phase 2 — Multimodal ingestion (text first)
1. Keep `source/**` authoritative; add an asset manifest for PDFs (`sha256`, page count).
2. Add text extraction for PDFs already listed in `server/data/sources.json`; no new runtime dependency unless opt-in.
3. Store extracted page text under generated data, never commit it.
4. Gate: `npm run check` + idempotent `npm run sync` (second run changes nothing).

### Phase 3 — Real embeddings behind the existing provider switch
1. Implement `openai` (or local ONNX) in `server/lib/rag-multimodel.js` only when `RAG_EMBEDDING_PROVIDER` is set and a key exists.
2. Add batching + timeout + fallback to `local`; never block boot.
3. Add an offline test that fakes the provider and asserts the fallback path.
4. Gate: default env (`local`, no network) still passes all tests.

### Phase 4 — Query planning and graph traversal
1. Extend `TYPE_HINTS` into an explicit planner result: `{ intent, chapters, needsGraph }`.
2. Add one-hop graph expansion for multi-hop questions; cap expansion.
3. Gate: new test for a multi-chapter query plus the existing unrelated-topic refusal test.

### Phase 5 — Grounding and validation gates
1. After generation, verify each citation id exists in the retrieved set; drop unsupported claims.
2. Add an answerability threshold: below it, return the grounded skeleton plus "insufficient evidence".
3. Gate: `tests/tutor.test.js` still green; add one low-evidence test.

### Phase 6 — Observability and evaluation
1. Log per-query latency, candidate count, and top score to `/api/health` aggregates (no PII).
2. Add a small golden set (10 questions) under `tests/` with expected chapter hits.
3. Gate: `npm test`; metrics visible in health or a dedicated read-only endpoint.

### Phase 7 — Control plane (only if deployment requires it)
1. Multi-tenant/RBAC, quotas, moderation, retention: each needs an owner decision before code.
2. Keep `guest` behavior for the public app; authenticated users are pinned to their session id.
3. Gate: security review + Docker parity + Render smoke (`/api/health`, one deep link, one API read).

### Current phase status (2026-11-21)

| Phase | Status | Next action |
|-------|--------|-------------|
| 0 Baseline | DONE | none |
| 1 Provenance/chunk contract | PENDING | start here: add `docId`, `sectionPath`, `chunkIndex`, `checksum` |
| 2 Multimodal ingestion | PENDING | needs asset manifest + PDF text extraction decision |
| 3 Real embeddings | PENDING | needs provider/cost/latency decision |
| 4 Query planning/graph | PENDING | extend `TYPE_HINTS` into planner result |
| 5 Validation gates | PENDING | citation existence check + answerability threshold |
| 6 Observability/eval | PENDING | golden set + metrics surface |
| 7 Control plane | PENDING | only after product/security decision |

Full alignment is **not** achieved. Missing layers and reasons are in `AGENTS.md` ("Alignment verdict").

## 11. Start here next session

1. `npm run verify:sync` and `npm run verify:sync:docker`.
2. Read `artifacts/sync-status.json` and the phase table above.
3. Pick the first `PENDING` phase; confirm scope with the user before editing.
4. Use the start/end prompts in `AGENTS.md` ("Session protocol") to keep every session repeatable.

## 12. Modular Subsystem Instructions (instructions.d)

Detailed operational runbooks and implementation specifications for platform subsystems are maintained in modular `.d` guides:

- **[instructions.d/00_OVERVIEW.md](instructions.d/00_OVERVIEW.md)**: Architectural overview, formatting rules, and subsystem index.
- **[instructions.d/01_THEME_AND_NAVIGATION.md](instructions.d/01_THEME_AND_NAVIGATION.md)**: Dual theme (Glass/Neumorphism), CSS variables, theme switcher, and one-tap quick access bar.
- **[instructions.d/02_LEARNING_AIDS.md](instructions.d/02_LEARNING_AIDS.md)**: Resilient 30 learning aids engine, STEM/non-STEM handling, and error fallback card.
- **[instructions.d/03_CONCEPT_GRAPHS.md](instructions.d/03_CONCEPT_GRAPHS.md)**: RAG concept graph derivation, fallback trees, and interactive 2D SVG visualizer.
- **[instructions.d/04_GAMIFICATION.md](instructions.d/04_GAMIFICATION.md)**: XP accrual, level progress ring, badges catalog, and offline leaderboard resilience.
- **[instructions.d/05_ROUTING_AND_FALLBACKS.md](instructions.d/05_ROUTING_AND_FALLBACKS.md)**: Client routing table, canonical route redirects, and wildcard 404 boundaries.
- **[VALIDATION_CHECKLIST.md](VALIDATION_CHECKLIST.md)**: Comprehensive production readiness checklist with itemized verification evidence.



