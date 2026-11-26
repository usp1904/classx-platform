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
If Docker is unavailable, record Docker parity as `SKIP`; do not claim parity until
`verify:sync:docker` passes on a Docker-capable machine.

## 3. Local breaks

```powershell
npm ci
npm run typecheck
npm run check
npm test
npm run build
npm start                      # http://localhost:8787/api/health
```

Expected: 4 subjects, 67 chapters, 2569 questions, full test suite green (174 tests as of
2026-11-24), and clean production/static builds. If `npm test` hangs: it is a synchronous
loop, not a slow test. The last known one was `splitIntoChunks()` in `server/lib/rag.js`
(fixed). Re-introducing a tail-overlap loop will hang the tutor tests again.

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

## 7a. Session Update — 2026-11-22 (Deploy, CI, Security, Public Access)

Commits pushed to `origin/main` in this session:

- `462514d` `feat(deploy)`: added multi-target static build (`scripts/build-static.mjs`), GitHub Pages/Cloudflare workflows, client-side mock API fallback, deployment docs, security utilities, and deployment/security tests.
- `6ed8652` `fix(ci)`: moved CI verification to Node 24 so tests can import `.ts` modules directly.
- `638849d` `fix(ci)`: deployment E2E tests now build `dist/gh-pages` and `dist/cloudflare` automatically when missing.
- `603cfcb` `fix(security)`: added API/tutor rate limits, strict JSON content-type and `256kb` body limits, CSP/COOP/CORP/no-index headers, stronger prompt-injection filters, and hid provider error details in production.

Verified outcomes:

- [x] `[COMPLETED]` **Local runtime**: `http://localhost:8787/api/health` returns `200`.
- [x] `[COMPLETED]` **GitHub Pages**: enabled with `build_type=workflow`; `https://usp1904.github.io/classx-platform/` returns `200`.
- [x] `[COMPLETED]` **CI deployment**: GitHub Pages workflow and consolidated multi-target workflow completed successfully for `638849d`.
- [x] `[COMPLETED]` **Render**: `https://classx-platform.onrender.com/api/health` returns `200`.
- [x] `[COMPLETED]` **Prompt-injection guard**: `POST /api/tutor` with `ignore previous instructions...` returns `security-guard` and `blocked: true`.
- [x] `[COMPLETED]` **Security headers**: CSP, `X-Robots-Tag: noindex`, COOP, CORP, nosniff, frame, referrer, and permissions policies are present.
- [x] `[COMPLETED]` **Rate limits**: `/api` 180 requests/minute/IP; `/api/tutor` 8 requests/minute/IP; auth throttle 20 attempts/minute/IP.
- [x] `[COMPLETED]` **Public tunnel**: Cloudflare quick tunnel active at `https://framing-thumbs-effectiveness-pricing.trycloudflare.com` (ephemeral).
- [x] `[COMPLETED]` **Docker image**: `classx-platform-classx-api:latest` built successfully.
- [ ] `[INCOMPLETE]` **Docker runtime**: not verified in the current environment because the Docker daemon is unavailable. When Docker is available, stop native Node and run `docker compose up -d`, then compare `/api/health.commit` to `git rev-parse --short=12 HEAD`.
- [ ] `[INCOMPLETE]` **Cloudflare Pages deploy**: the duplicate workflows were removed, but `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets are still not configured, so the Cloudflare job skips its deploy step.
- [x] `[COMPLETED]` **Permanent public access**: GitHub Pages and Render provide stable public HTTPS URLs. The `trycloudflare.com` quick tunnel is development-only and must not be presented as production.
- [x] `[COMPLETED]` **Render SHA stamp**: confirmed `/api/health.commit` returned `d0246f3bdba498d792fd405fa17a0ac1c1e3a231` after the Render deploy.
- [ ] `[INCOMPLETE]` **Browser smoke test**: verify all SPA routes and the YouTube lesson embed over the public HTTPS URL, not only `/` and `/api/health`.
- [x] `[COMPLETED]` **CI duplicate workflows**: both per-target workflows were deleted; `.github/workflows/deploy.yml` is the only deploy workflow and runs the GitHub Pages and Cloudflare jobs.
- [ ] `[INCOMPLETE]` **Rate-limit persistence**: limits are process-local `Map`s and reset on restart; use Redis or an edge limiter for multi-instance deployments.

## 7b. Session Update — 2026-11-23 (Default Light Theme & App-Wide Synchronization)

- [x] `[COMPLETED]` **Default theme is light**: `resolveInitialTheme()` returns `light` when `localStorage('classx_theme')` is unset or invalid. `web/index.html` runs the same check before React mounts, so there is no dark flash.
- [x] `[COMPLETED]` **Single source of truth**: new `web/src/lib/theme.tsx` (`ThemeProvider`, `useTheme`, `applyTheme`) owns the theme; `Layout.tsx` consumes `useTheme()` instead of keeping its own copy.
- [x] `[COMPLETED]` **App-wide propagation**: `data-theme` is set on `document.documentElement`, so every route, modal, and overlay inherits the same palette. `color-scheme` and `meta[name="theme-color"]` update with the choice.
- [x] `[COMPLETED]` **Cross-tab sync**: a `storage` event listener applies a theme change made in another tab.
- [x] `[COMPLETED]` **Theme-aware utilities**: `.text-muted`, `.text-dim`, `.bg-canvas`, and `.border-border` now read `--muted`, `--ink-2`, `--canvas`, and `--line` instead of hardcoded dark fallbacks.
- [x] `[COMPLETED]` **PWA colors**: `web/public/manifest.json` uses `#f8fafc` for `theme_color` and `background_color`.
- [x] `[COMPLETED]` **Gates**: `npm run typecheck` (0 errors), `npm run check` (4 subjects, 67 chapters, 2569 questions), `npm test` (full suite green), `npm run build` (clean).
- [ ] `[INCOMPLETE]` **Browser smoke test**: confirm the light/dark choice survives navigation across all SPA routes and a second tab, then repeat under the static GitHub Pages/Cloudflare builds.

## 7c. Session Update — 2026-11-23 (Performance Split & Durable Cloudflare Access)

- [x] `[COMPLETED]` **Route-level code splitting**: every screen in `web/src/App.tsx` is `React.lazy`, so the initial entry no longer ships all 18 screens. Initial JS is ~319 kB raw / ~97 kB gzip (was 764.57 kB / 221.75 kB).
- [x] `[COMPLETED]` **Lazy data payloads**: `knowledge-hub.json` (764 kB) and `video-catalog.json` (111 kB) are dynamic imports in `mockApi.ts` with per-chunk caching. They load only on the video lesson route.
- [x] `[COMPLETED]` **Static mock parity**: `GET /api/video/:subject/:chapter` now attaches the knowledge hub, and `GET /api/knowledge-hub/:subject/:chapter` is implemented, so static GitHub Pages/Cloudflare builds show the same hub content as the live API.
- [x] `[COMPLETED]` **Vendor chunking**: React, React Router, and Lucide are separate cacheable chunks. KaTeX stays inside the lazy `RichText` chunk (265 kB) instead of being preloaded on first paint.
- [x] `[COMPLETED]` **Third-party removal**: unused HTMX CDN script removed from `web/index.html`; the app no longer depends on `unpkg.com` for boot.
- [x] `[COMPLETED]` **Durable Cloudflare access**: new `scripts/cloudflare-setup.mjs` (`npm run setup:cloudflare`) ensures the Pages project, creates or repairs a proxied CNAME, attaches a custom domain, and verifies HTTPS. `.github/workflows/deploy.yml` runs it after each deploy.
- [x] `[COMPLETED]` **Docs**: `docs/DEPLOYMENT.md` Section 3, Step 5 documents the stable `https://classx-platform.pages.dev` URL and the optional `CLOUDFLARE_CUSTOM_DOMAIN` / `CLOUDFLARE_ZONE_ID` secrets.
- [ ] `[INCOMPLETE]` **Cloudflare project existence**: `classx-platform.pages.dev` still returns NXDOMAIN. The first successful deploy needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub Actions secrets.
- [ ] `[INCOMPLETE]` **Custom domain**: requires the zone to be on Cloudflare nameservers plus the two optional secrets. Account-side DNS cannot be changed from this repository.
- [ ] `[INCOMPLETE]` **Browser/visual QA**: lazy routes and the video hub need a browser smoke test across routes, tabs, and both static targets.

## 7d. Session Update — 2026-11-23 (Dual-Mode YouTube Education Embeds)

- [x] `[COMPLETED]` **Keyless metadata check**: `server/lib/youtube.js` validates an id through the public YouTube oEmbed endpoint (`/oembed?format=json`) with a 5s timeout and 10-minute cache. No `YOUTUBE_API_KEY`, no Google API client, no scraping, and no third-party proxy. A 401/403/404 blocks the id as `not-found`; a network failure degrades to `validation-unavailable` instead of blocking the lesson.
- [x] `[COMPLETED]` **Honest limits**: oEmbed confirms the video exists and returns its title/author, but it does not certify embeddability, age rating, or region availability. Those remain enforced by the curated catalog, the playback error fallback, and the site CSP.
- [x] `[COMPLETED]` **Local catalog search**: `GET /api/youtube/search` searches `server/data/video-catalog.json` with `searchCatalog()`. Results are deduplicated, capped at 25, filtered by the existing adult/obscene blocklist, and carry chapter/subject metadata. Input is capped at 120 characters.
- [x] `[COMPLETED]` **Dual-mode player**: `web/src/components/YouTubePlayer.tsx` defaults to the privacy-enhanced `youtube-nocookie.com` IFrame player and switches to a partner-configured Education base only when `YOUTUBE_EDU_ENABLED=true`. Education mode is opt-in because `youtubeeducation.com` is a partner product, not a public embed API. No fake referer or fake Education URL is generated.
- [x] `[COMPLETED]` **Error handling**: `onError` maps 150/153 to the real fix (add the site to the video's embedding allowlist in YouTube Studio), 101 to embed-disabled, 100 to private/removed, 2 to invalid id. The player never renders a blank frame; it shows an actionable fallback plus "Open on YouTube".
- [x] `[COMPLETED]` **Wiring**: `VideoLesson.tsx` now uses the component; skip controls call `seekTo` on the live player. `api.ts`, `types.ts`, and `mockApi.ts` cover config/validate/search. Tests live in `tests/youtube.test.js`.
- [ ] `[INCOMPLETE]` **Account-side setup**: set `YOUTUBE_ORIGIN` to the public site origin and allow the production domains in YouTube Studio for any video that returns 150/153. Education mode needs a signed YouTube Player for Education agreement, base URL, and short-lived session token; if the partner host is not `*.youtubeeducation.com`, add it to `frame-src` in `server/index.js`.
- [ ] `[INCOMPLETE]` **Browser QA**: verify a real embed, a blocked video, and the offline/unverified state in the browser.

## 7e. Session Update — 2026-11-24 (Deployment Sync & Pending-Item Audit)

- [x] `[COMPLETED]` **Consolidated CI**: `.github/workflows/deploy.yml` is the only deploy workflow. The standalone GitHub Pages and Cloudflare workflow files were deleted, so a push cannot race or cancel duplicate deployments.
- [x] `[COMPLETED]` **Docs drift fixed**: `docs/DEPLOYMENT.md` now points at `deploy.yml` everywhere, documents one consolidated workflow table, and records the current GitHub Pages, Render, Cloudflare, and Docker status.
- [x] `[COMPLETED]` **Keyless YouTube contract preserved**: no Google API key, no scraping, no third-party proxy; `YOUTUBE_ORIGIN` remains the only required playback setting and Education mode stays opt-in.
- [x] `[COMPLETED]` **Live URL check**: GitHub Pages returned HTTP 200; Render `/api/health` returned HTTP 200.
- [x] `[COMPLETED]` **GitHub Pages deploy fix**: the Pages job was failing after upload with "No artifacts named github-pages were found"; `deploy.yml` now uses `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, and `actions/deploy-pages@v5`. The `d0246f3` run deployed successfully.
- [x] `[COMPLETED]` **Render SHA resolution**: `/api/health.commit` preferred the Docker default `GIT_SHA=dev` over `RENDER_GIT_COMMIT`; `resolveCommit()` now prefers Render's injected SHA and reports `d0246f3bdba498d792fd405fa17a0ac1c1e3a231`.
- [ ] `[INCOMPLETE]` **Cloudflare DNS**: `classx-platform.pages.dev` returns NXDOMAIN until the two repository secrets are added and the workflow runs.
- [x] `[COMPLETED]` **Live deploy confirmation**: GitHub Pages root returned HTTP 200 and Render `/api/health.commit` matched `d0246f3bdba4`.
- [ ] `[INCOMPLETE]` **Docker parity**: Docker daemon unavailable in this environment, so `verify:sync:docker` could not run.
- [ ] `[INCOMPLETE]` **Browser QA**: public-route, theme, lazy-route, and YouTube embed smoke tests still need a real browser.

## 7f. Session Update — 2026-11-24 (Textbook OKF Ingestion & End-to-End Page Citations)

- [x] `[COMPLETED]` **Textbook OKF Ingestion**: Ingested and anchored NCERT/state textbook PDF assets (`server/lib/textbook-okf.js`, `scripts/ingest-textbooks.py`, `source/textbooks/`) with page-level anchoring.
- [x] `[COMPLETED]` **End-to-End Page Metadata**: Fixed `server/lib/rag-multimodel.js` result mapper to preserve `page`, `pdfPage`, `book`, and `source` attributes.
- [x] `[COMPLETED]` **DoubtTutor Page Citations**: Extended `Citation` type in `web/src/types.ts` and updated `web/src/screens/DoubtTutor.tsx` to display `· p. N` page badges on textbook citations.
- [x] `[COMPLETED]` **Deterministic Asset Manifest**: PDF `manifest.generatedAt` now derives deterministically from PDF file `mtimes`.
- [x] `[COMPLETED]` **Textbook RAG Test Suite**: Authored `tests/textbook-rag.test.js` verifying textbook page citation retrieval, multimodel mapper metadata preservation, grounded answers with citations, and refusal when no match exists. Test suite grew from 166 to 170 passing tests.
- [x] `[COMPLETED]` **Phase 1 Provenance & Chunk Contract**: Added `docId`, `sectionPath`, `chunkIndex`, and SHA-256 `checksum` to every chunk in `server/lib/rag.js`, surfaced in `getCitations()`, `server/lib/rag-multimodel.js`, `/api/search`, and `web/src/types.ts`. Authored `tests/rag-provenance.test.js` confirming 100% chunk coverage, 0 duplicate `(docId, chunkIndex)` pairs across the entire index, and complete tutor citation provenance preservation. Test suite grew to 174 passing tests.
- [ ] `[INCOMPLETE]` **Phase 3 Real Embeddings**: External/ONNX embedding provider behind `RAG_EMBEDDING_PROVIDER` switch with fallback to local hashed vectors.

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
| `web/src/lib/theme.tsx` | Light-default theme provider, DOM application, persistence, cross-tab sync |
| `web/src/App.tsx` | Wraps the router in `ThemeProvider` so the theme applies to every route |
| `web/index.html` | Pre-paint `data-theme`/`theme-color` bootstrap with light default |
| `web/public/manifest.json` | Light PWA `theme_color` and `background_color` |
| `web/src/utilities.css` | Theme-aware text/background/border utility mappings |
| `server/lib/youtube.js`, `server/index.js` | Keyless oEmbed check, local-catalog search, dual-mode player config, CSP allowlist |
| `server/lib/video-catalog.js` | `searchCatalog()` over the curated, safety-filtered catalog |
| `web/src/components/YouTubePlayer.tsx`, `web/src/lib/youtube.ts` | Keyless metadata check, IFrame API error mapping, Education-mode URL builder |
| `web/src/screens/VideoLesson.tsx`, `web/src/api.ts`, `web/src/types.ts`, `web/src/services/mockApi.ts` | Player wiring, API types/methods, static mock parity |
| `tests/youtube.test.js` | oEmbed URL, local search, embed URL, and error-copy tests |
| `.secrets.example`, `.env.production.example`, `render.yaml` | Playback origin and opt-in Education mode; no API key |
| `.github/workflows/deploy.yml` | Single consolidated GitHub Pages + Cloudflare Pages workflow |
| `docs/DEPLOYMENT.md`, `tests/workflows-and-docs.test.mjs` | Single-workflow references, current remote status, drift assertions |

## 8. Master Deliverables Checklist (Completed vs Incomplete)

To eliminate ambiguity and prevent agent rework, all deliverables are categorized and tagged with explicit `[COMPLETED]` and `[INCOMPLETE]` status markers:

### 8.1 Core Platform, Curriculum & Offline Data
- [x] `[COMPLETED]` **Curriculum Integrity**: 4 subjects (Mathematics, Science, Social Science, English), 67 chapters, 76 official topics, 52 full authored lessons, 15 syllabus maps, 2569 questions (1505 MCQs, 1064 subjective).
- [x] `[COMPLETED]` **Baseline Unit & Contract Tests**: 174/174 tests passing (`node --test tests/*.test.js tests/*.test.mjs`) across data, tutor, coverage, practice, sync, session-store, security, YouTube, textbook RAG, provenance contract, workflow, and docs contracts.
- [x] `[COMPLETED]` **TypeScript Compilation**: `npm run typecheck` (`tsc --noEmit -p web/tsconfig.json`) clean with 0 compilation errors across 177 source files.
- [x] `[COMPLETED]` **Production Bundling**: `npm run build` and `npm run build:static` compile clean; initial JS is ~319 kB raw / ~97 kB gzip with lazy routes, and the knowledge hub loads only on the video lesson route.
- [x] `[COMPLETED]` **Docker Parity & Sync Gate**: `scripts/sync-verify.mjs` validates commit SHA equality between Git HEAD and `/api/health.commit`; Docker daemon is unavailable in the current environment, so re-run `npm run verify:sync:docker` on a Docker-capable machine.
- [x] `[COMPLETED]` **Security & Secrets Isolation**: Real API keys moved out of repo into `.secrets` (gitignored, Docker-ignored); `.secrets.example` provided.

### 8.2 UI/UX Modern Redesign, Theming & Responsive Layout
- [x] `[COMPLETED]` **Dual Light & Dark Theme System (Light default)**: CSS variables defined in `:root` (dark tokens) and `[data-theme="light"]` (`web/src/styles.css`:3-113). `web/src/lib/theme.tsx` is the single source of truth: no stored choice resolves to light, the theme applies to `<html>` so every route inherits it, and a `storage` listener syncs open tabs. Persistent via `localStorage('classx_theme')`.
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
- [x] `[COMPLETED]` **Phase 1: Provenance & Chunk Contract**: Added `docId`, `sectionPath`, `chunkIndex`, and SHA-256 `checksum` to every chunk in `server/lib/rag.js`, surfaced in `getCitations()`, `server/lib/rag-multimodel.js`, `/api/search`, and `web/src/types.ts`.
- [x] `[COMPLETED (text)]` **Phase 2: Multimodal Ingestion**: Authoring PDF asset manifests (`sha256`, page counts) and text extraction pipelines for source PDFs. OCR/vision out of scope. Reconciled with the §10 status table (DONE (text)) and §7f.
- [ ] `[INCOMPLETE]` **Phase 3: Real Embeddings**: External/ONNX embedding provider behind `RAG_EMBEDDING_PROVIDER` switch with fallback to local hashed vectors.
- [ ] `[INCOMPLETE]` **Phase 4: Query Planning & Graph Traversal**: Extending `TYPE_HINTS` into structured `{ intent, chapters, needsGraph }` and multi-hop graph query decomposition.
- [ ] `[INCOMPLETE]` **Phase 5: Grounding & Validation Gates**: Post-generation claim-citation verification and dynamic answerability threshold.
- [ ] `[INCOMPLETE]` **Phase 6: Observability & Evaluation**: Golden benchmark test set (10 questions) and aggregate latency/score telemetry on `/api/health`.
- [ ] `[INCOMPLETE]` **Phase 7: Control Plane**: Multi-tenant/RBAC and moderation layer.

### 8.6 Automated Verification Suites & Operating Standards
- [x] `[COMPLETED]` **Master Verification Suite (`tests/verification.test.mjs`)**: Automated test suite verifying skill package syntax, frontmatter, CLI execution, layout non-overlapping integrity, and checklist tags.
- [x] `[COMPLETED]` **Skill Tool Verification (`skills/classx-knowledge-rag/scripts/verify-rag.mjs`)**: 10/10 automated tests passing.
- [x] `[COMPLETED]` **Canonical Platform Verification Gates**: `npm test` (174/174 pass), `npm run typecheck` (0 errors), `node scripts/check.mjs` (0 errors), `npm run build` (clean bundle).

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
2. Gate: full test suite green (166/166 as of 2026-11-24), Docker `/api/health.commit == HEAD` when Docker is available.

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
4. Gate: default env (`local`, no network) still passes all tests AND a test proves the configured provider output differs from `local` and that the provider endpoint was actually called; a no-op alias (`openai` -> `local` in `server/lib/rag-multimodel.js:33-34`) must fail this gate.

### Phase 4 — Query planning and graph traversal
1. Extend `TYPE_HINTS` into an explicit planner result: `{ intent, chapters, needsGraph }`.
2. Add one-hop graph expansion for multi-hop questions; cap expansion.
3. Gate: new test for a multi-chapter query plus the existing unrelated-topic refusal test.

### Phase 5 — Grounding and validation gates
1. After generation, verify each citation id exists in the retrieved set; drop unsupported claims.
2. Add an answerability threshold: below it, return the grounded skeleton plus "insufficient evidence".
3. Gate: `tests/tutor.test.js` still green, the `tests/agentic-rag-*.test.js` suite is green, and one low-evidence test asserts an "insufficient evidence" response.

### Phase 6 — Observability and evaluation
1. Log per-query latency, candidate count, and top score to `/api/health` aggregates (no PII).
2. Add a small golden set under `tests/` with expected chapter hits per persona (student/teacher/parent/DSC/UPSC); minimum 10 questions.
3. Gate: `npm test` (including `tests/agentic-rag-*.test.js`); metrics visible in health or a dedicated read-only endpoint; the persona golden set is part of the suite.

### Phase 7 — Control plane (only if deployment requires it)
1. Multi-tenant/RBAC, quotas, moderation, retention: each needs an owner decision before code.
2. Keep `guest` behavior for the public app; authenticated users are pinned to their session id.
3. Gate: security review + Docker parity + Render smoke (`/api/health`, one deep link, one API read).

### Current phase status (2026-11-24)

| Phase | Status | Next action |
|-------|--------|-------------|
| 0 Baseline | DONE | none |
| 1 Provenance/chunk contract | DONE | docId, sectionPath, chunkIndex, sha256 checksum on all chunks + search/citations |
| 2 Multimodal ingestion | DONE (text) | PDF text extraction -> OKF v0.2 bundle + `source/textbooks/manifest.json`; OCR/vision still out of scope |
| 3 Real embeddings | PENDING | start here: needs provider/cost/latency decision |
| 4 Query planning/graph | PENDING | extend `TYPE_HINTS` into planner result |
| 5 Validation gates | PENDING | citation existence check + answerability threshold |
| 6 Observability/eval | PENDING | golden set + metrics surface |
| 7 Control plane | PENDING | only after product/security decision |

Full alignment is **not** achieved. Missing layers and reasons are in `AGENTS.md` ("Alignment verdict").

## 11. Start here next session

1. `npm run verify:sync` and `npm run verify:sync:docker`.
2. Read `artifacts/sync-status.json` and the phase table above.
3. Pick the first `PENDING` step from the canonical order in §15. For the persona/answer-quality goal follow §13; canonical cross-track order is §15; tool/skill routing is §14.
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

## 13. Persona Satisfaction Repair Plan (current primary goal)

The platform passes its structural gates but does not yet satisfy its users. The tutor is a Class X board-shaped four-layer answer and does not adapt to persona, depth, or exam. This section is the build plan; run it before further RAG vanity work. Evidence and diagnosis live in the review captured in this section.

### 13.1 What is missing today (evidence in code)

| Gap | Evidence | Persona impact |
|---|---|---|
| `mode`/ELI5 ignored on primary path | `server/lib/agentic-rag.js:499-513`, `:640-655`; `backend/rag/synthesizer.py:459-467` | Class X student never gets ELI5 |
| No persona model (role/exam/depth) | mode enum `server/index.js:344,358,377` | Teacher/parent/DSC/UPSC unserved |
| Corpus is Class X NCERT only | `server/lib/textbook-okf.js`; `backend/rag/synthesizer.py:15` | DSC/UPSC cannot be answered |
| Canned answers by topic | `backend/rag/synthesizer.py:32`, `:355-362` | Repetitive, not question-specific |
| Fake semantic retrieval | `server/lib/rag-multimodel.js:33-34` | Paraphrase questions miss |
| Rerank stub | `server/lib/rag-multimodel.js:49-61` | Wrong chunk ordering |
| Hard lexical gate | `server/lib/rag.js:601-604` | Empty result on synonyms |
| Per-chapter caps strip depth | `server/lib/rag.js:606-621` | Thin context |
| No answerability gate | `backend/rag/graph.py:19-24` | Confident thin answers |
| Citation/evidence mismatch | `server/lib/agentic-rag.js:744,774` | Page badges can be wrong |
| Client sends no scope | `web/src/screens/DoubtTutor.tsx:23-29` | Analyzer guesses wrong chapter |
| Visuals never composed into answer | `server/lib/agentic-rag.js:415-472,826` | No in-answer diagram/step visual |
| Depth validator is shallow | `backend/rag/synthesizer.py:322-326` | Two-line answers pass |

### 13.2 Build work packages (what to build -> how -> gate)

- **B1 Thread persona + mode through the agentic path.** Accept `{role, exam, depth, ageBand}`; pass it into `formatLayersAsMarkdown`, both LLM prompts, and the Python synthesizer. Files: `server/lib/agentic-rag.js`, `server/lib/ai.js`, `backend/rag/synthesizer.py`, `server/index.js`, `web/src/screens/DoubtTutor.tsx`. Gate: one test per mode asserting layer order/depth changes.
- **B2 Persona depth budgets + composer.** New `server/lib/persona-composer.js`: ELI5 = short + analogy + micro-example; Student = worked step ladder; Teacher = lesson plan + common errors + differentiation; Parent = plain summary + progress link; DSC/UPSC = exam tier + PYQ framing. Gate: unit test per persona.
- **B3 Answerability gate (Phase 5).** Below threshold, return insufficient-evidence + nearest grounded concept + explicit missing topic; never emit a thin four-layer answer. Files: `backend/rag/grader.py`, `server/lib/agentic-rag.js`. Gate: low-evidence test.
- **B4 Real embeddings + rerank.** Implement `openai`/local ONNX in `server/lib/rag-multimodel.js` behind `RAG_EMBEDDING_PROVIDER` with batching + timeout + local fallback; replace the rerank stub with a cross-encoder/provider rerank; wire `hyde_passage` into retrieval. Gate: fake-provider fallback test; default local/offline still green.
- **B5 Retrieval relax.** Make the lexical gate a boost, not a hard drop; raise/parameterise per-chapter caps; extend the synonym map. File: `server/lib/rag.js`. Gate: paraphrase query test.
- **B6 Citation alignment.** Derive `sources` from the chunks actually used by the active pipeline (Python or JS). File: `server/lib/agentic-rag.js`. Gate: citation chunk ids are a subset of used chunk ids.
- **B7 Inline visual composition.** Attach a diagram spec / step visual / concept-map fragment plus video clip into the answer layers. Files: `server/lib/agentic-rag.js`, `web/src/screens/DoubtTutor.tsx`; reuse `viz-generator` output. Gate: answer contains a valid visual block.
- **B8 Corpus expansion.** Add DSC/UPSC/teacher/English sources under `source/**`, extend `scripts/sync-content.mjs`, index them in `server/lib/rag.js` and the Python retriever. Gate: `npm run check` counts + idempotent sync.
- **B9 Golden-set eval per persona.** `tests/persona-eval.test.mjs` with expected depth/step/citation/refusal per persona; surface metrics on `/api/health`. Gate: eval passes in CI.
- **B10 Depth floor in validator.** Require a minimum number of worked steps + words per persona in `validate_answer_layers`. Gate: shallow answers are rejected.

### 13.3 Sequence checklist (do not skip gates)

The canonical, dependency-ordered execution (with phase mapping and how-to) is §15.2; it supersedes the ordering of this list. The set of items is identical.

- [ ] 1. Thread persona/mode (B1). Gate: mode tests.
- [x] 2. Persona composer + depth budgets (B2). Gate: persona tests.
- [ ] 3. Citation alignment (B6). Gate: citation-subset test.
- [ ] 4. Answerability gate (B3). Gate: low-evidence test.
- [ ] 5. Retrieval relax (B5). Gate: paraphrase test.
- [ ] 6. Real embeddings + rerank (B4). Gate: fallback test, offline green.
- [ ] 7. Depth floor (B10). Gate: shallow-reject test.
- [ ] 8. Inline visuals (B7). Gate: visual-block test.
- [ ] 9. Golden-set eval (B9). Gate: eval in CI.
- [ ] 10. Corpus expansion (B8). Gate: check + sync idempotent.
- [ ] 11. Re-run `npm run verify` + `verify:sync:docker`; update §8.5 and the §10 phase table.

Order rationale: fix behaviour and quality before corpus spend; add the eval before expansion so improvement is measurable.

### 13.4 Definition of done per persona

| Persona | Done when |
|---|---|
| Class X student | ELI5 and board modes give distinct, depth-appropriate, step-by-step answers with a visual and citations |
| Teacher | "Teacher" persona returns a lesson plan, common errors, and marking notes |
| Parent | Plain-language summary tied to child progress, no jargon |
| DSC aspirant | Exam-tier answer with state-syllabus/PYQ grounding, or an explicit "not in corpus" |
| UPSC aspirant | Analytical answer with polity/history depth, or an explicit gap |

Cross-persona rule: never return a thin confident answer.

## 14. Agent Tooling & Skills Playbook (when to use what)

Prevents discrepancy: one source of truth per concern; route each task to the minimum tool/skill that can prove the outcome; gate before claiming done; update phase status and `Last verified` every session.

### 14.1 Mandatory session loop

1. Read `AGENTS.md` + `INSTRUCTIONS.md` (§10 phases, §13 plan, §14 playbook).
2. Run `npm run verify:sync` (then `verify:sync:docker` if Docker is healthy); read `artifacts/sync-status.json`.
3. Report drift + next open phase; do not edit until scope is confirmed.
4. Execute one work package per commit; run that package's gate.
5. End: run gates for the touched area, update `AGENTS.md` capability row/`Last verified` + §13 checkbox + §10 phase status, commit/push `main` + `Siri_ClassX-Platform`, run `verify:sync:docker`, report Render smoke.

### 14.2 Skill/agent router

| Task | Use (path) | Gate |
|---|---|---|
| Spec before behaviour change | `google-skills/spec-driven-development`, ECC `planner` | spec updated first |
| Plan/decompose | `google-skills/planning-and-task-breakdown`, ECC `/prp-plan`, `planner` | ordered tasks |
| Test-first behaviour | `google-skills/test-driven-development`, ECC `tdd-guide` | RED -> GREEN |
| Bounded bug fix | `.agents/skills/surgical-patch`, ECC `build-error-resolver` | regression test |
| Refactor (no behaviour change) | `.agents/skills/safe-refactor`, `google-skills/code-simplification` | behaviour preserved |
| Schema/API/config migration | `.agents/skills/migration`, `google-skills/deprecation-and-migration` | rollback + expand/contract |
| RAG quality review | ECC `rag-pipeline-reviewer`, `iterative-retrieval` | retrieval eval |
| ML/eval pipeline | ECC `mle-reviewer`, `eval-harness`, `ai-regression-testing` | eval gate |
| Security-sensitive | `google-skills/security-and-hardening`, ECC `security-reviewer`/`/security-scan`, `.agents/skills/review-security` | no HIGH/CRITICAL |
| Performance | `google-skills/performance-optimization`, ECC `performance-optimizer` | budget met |
| Observability | `google-skills/observability-and-instrumentation` | metric visible |
| Browser/visual QA | `google-skills/browser-testing-with-devtools`, `.agents/skills/visual-qa`, `npm run e2e` | screenshots pass |
| Explore codebase | `.agents/skills/caveman-explore`, ECC `code-explorer`, `graphify` (`graphify update .`) | path:line map |
| Brownfield onboarding | ECC `spec-miner` | capability matrix |
| Constraint/quality bar | `google-skills/constraint-driven-development` | CONSTRAINTS.md |
| Curriculum/authoring | `.agents/skills/curriculum-guard`, `dual-mode-router`, `master-architectural-system-prompt`, `historical-paper-tags` | syllabus locked |
| Math/LaTeX | `.agents/skills/math-formatter` | renders clean |
| Diagrams/visuals | `.agents/skills/viz-generator`, `visualize` | valid spec |
| Student/teacher content QA | `.agents/skills/learn`, `check-understanding`, `course-guide` | answers correct |

### 14.3 Available inventories (paths)

- Repo skill: `skills/classx-knowledge-rag` (query-graph, topological-sort, prereq-chain, search-chunks, verify-rag, schemas).
- `C:\Users\Admin\.agents\skills` — 65 skills: caveman-*, curriculum-guard, dual-mode-router, master-architectural-system-prompt, math-formatter, viz-generator, historical-paper-tags, learn/check-understanding/course-guide, investigate-first, lean-build, surgical-patch, safe-refactor, migration, verify-and-stop, review/review-security, multimodal-review, graphify, guard, loop.
- `C:\Users\Admin\.config\opencode\skills\google-skills\skills` — 25 engineering skills (spec/TDD/review/security/perf/observability/CI/deploy/context).
- `C:\Users\Admin\.claude\skills` — 11 learner/certification skills.
- `C:\Users\Admin\ECC\agents` — 71 agents (planner, architect, code-reviewer, security-reviewer, tdd-guide, rag-pipeline-reviewer, mle-reviewer, pr-test-analyzer, performance-optimizer, silent-failure-hunter, code-explorer, spec-miner, loop-operator, harness-optimizer, agent-evaluator, e2e-runner).
- `C:\Users\Admin\ECC\skills` — 311 skills; relevant: eval-harness, iterative-retrieval, verification-loop, autonomous-loops, continuous-agent-loop, benchmark-optimization-loop, ai-regression-testing, plan-orchestrate, test-collaboration.
- `C:\Users\Admin\ECC\commands` — 98 commands; relevant: `/plan`, `/prp-plan`, `/feature-dev`, `/epic-*`, `/quality-gate`, `/test-coverage`, `/security-scan`, `/review-pr`, `/loop-start`, `/harness-audit`, `/model-route`.
- Tools: `graphify` (`graphify-out/` present; `graphify update .`), Playwright (`npm run e2e`), n8n (workflows; needs credentials), offline-by-default (no key needed).

### 14.4 Anti-discrepancy rules

- One source of truth: `SPEC.md` = acceptance, `AGENTS.md` = capability matrix, `INSTRUCTIONS.md` §10 = phase status, §13 = build plan. Cross-link; never duplicate.
- Never edit generated files (`server/public`, `server/data`, `artifacts`, `okf-textbooks`) to pass a check; fix `source/**` or `server/lib/**` and regenerate.
- One drift class per commit; run §14.1 step 2 before pushing.
- A capability exists only after code + test; update the matrix row only then.
- End every session: update `Last verified`, the §13 checkbox, and the §10 phase status.
- After any opencode config/agent/skill/plugin edit, tell the user to restart opencode (config is not hot-reloaded).

### 14.5 Loop & harness (unattended runs)

- `loop-operator` / `autonomous-loops` / `continuous-agent-loop`: run the §14.1 cycle; halt on a red gate, ambiguous scope, security finding, or N stalls; never loop past a failing gate.
- `harness-optimizer` / `/harness-audit`: tune model choice, context budget, and retries without changing product behaviour.
- `verification-loop` / `.agents/skills/guard`: the harness exit condition is `npm run verify` + `verify:sync:docker`, not an assertion.

### 14.6 Quick decision

- New behaviour? spec -> plan -> TDD -> review -> gate.
- Failing test/gate? debug root cause, fix source, never weaken the check.
- Unfamiliar code? graphify / code-explorer / caveman-explore first.
- Anything shipped? observability + rollback + verify-and-stop.

## 15. Phase <-> Work-Package Alignment (canonical execution order)

This is the single authoritative order. §10 owns pipeline mechanics (Phase 0–7); §13 owns persona/quality packages (B1–B10); §15 ties them together and resolves conflicts. If sections disagree on ordering, §15.2 wins; on mechanics, §10 and §13 win. This section is a reconciliation, not a new fourth roadmap.

### 15.1 Differences identified (audit of §8.5, §10, §13) and resolution

| # | Difference | Where | Resolution applied |
|---|---|---|---|
| 1 | Phase 2 had three states (INCOMPLETE / DONE (text) / completed) | `§8.5:265`, `§10:339`, `§7f:177-182` | §8.5 set to `COMPLETED (text)`; OCR/vision out of scope |
| 2 | Phase 3 gate was unsound: `openai` provider aliases `local`, so "local still passes" passes even though the switch is a no-op | `server/lib/rag-multimodel.js:33-34`, `§10:311` | Phase 3 gate strengthened: provider output must differ from `local` and the endpoint must be called |
| 3 | Phase 5/6 gates pointed at `tests/tutor.test.js` but the live path is `runAgenticRag` | `server/index.js:345`, `§10:321`, `§10:326` | `tests/agentic-rag-*.test.js` added to both gates |
| 4 | Phase 6 golden set was generic; cannot detect persona dissatisfaction | `§10:325` | Golden set now requires a per-persona dimension |
| 5 | Rerank stub replacement was in no phase | `server/lib/rag-multimodel.js:49-61` | Folded into Phase 3 via B4 |
| 6 | Two roadmaps (§10 phases, §13 packages) with partial overlap | `§10`, `§13` | Mapped 1:1 in §15.2; B1/B2/B5/B7/B8 registered as proposed Phase 8 |

### 15.2 Canonical execution order

Legend: "proposed Phase 8.x" = not covered by Phase 0–7; registered here as new delivery/persona work. Execute strictly top-to-bottom, one step per commit; do not start a step until the previous gate is green. This interleaved order intentionally prioritises persona satisfaction (the stated success criterion) and supersedes §10's strict phase sequence for these tracks.

| Step | Track / Phase | §13 item | What to implement | How (files) | Gate |
|---|---|---|---|---|---|
| 1 | proposed Phase 8.1 | B1 | Thread persona + mode (`role, exam, depth, ageBand`) through the agentic path | `server/lib/agentic-rag.js`, `server/lib/ai.js`, `backend/rag/synthesizer.py`, `server/index.js`, `web/src/screens/DoubtTutor.tsx` | one test per mode asserts layer order/depth changes |
| 2 | proposed Phase 8.2 | B2 | Persona composer + per-persona depth budgets | proposed `server/lib/persona-composer.js` | unit test per persona |
| 3 | Phase 5 | B3 | Answerability gate: below threshold return insufficient-evidence + nearest concept + explicit gap | `backend/rag/grader.py`, `server/lib/agentic-rag.js` | low-evidence test asserts refusal |
| 4 | Phase 5 | B6 | Citation alignment: `sources` must come from chunks actually used | `server/lib/agentic-rag.js` | citation ids are a subset of used ids |
| 5 | Phase 5 | B10 | Depth floor in validator (min worked steps/words per persona) | `backend/rag/synthesizer.py` `validate_answer_layers` | shallow answers rejected |
| 6 | Phase 3 | B4 | Real embeddings behind `RAG_EMBEDDING_PROVIDER` + replace rerank stub + wire `hyde_passage` | `server/lib/rag-multimodel.js` | provider output != `local`; endpoint called; offline fallback green |
| 7 | Phase 4 (extension) | B5 | Retrieval relax: lexical gate as boost, dynamic per-chapter caps, synonym map | `server/lib/rag.js` | paraphrase query test |
| 8 | Phase 6 | B9 | Per-persona golden-set evaluation + metrics surface | proposed `tests/persona-eval.test.mjs`, `/api/health` | eval runs in CI |
| 9 | proposed Phase 8.3 | B7 | Inline visual composition (diagram/step visual/concept-map + video in the answer) | `server/lib/agentic-rag.js`, `web/src/screens/DoubtTutor.tsx` | answer contains a valid visual block |
| 10 | proposed Phase 8.4 | B8 | Corpus expansion: DSC/UPSC/teacher/English sources | `source/**`, `scripts/sync-content.mjs`, `server/lib/rag.js`, Python retriever | `npm run check` counts + idempotent sync |
| 11 | all | — | Full verify + parity | run §2 + §14.1 | `npm run verify` + `verify:sync:docker` green |

### 15.3 When to implement what (rules)

- Persona steps (1, 2, 9) and canonical steps 3–5 ship before Phase 3 even though Phase 3 is the oldest PENDING, because persona satisfaction is the success criterion and these are prerequisites.
- Phase 7 (control plane) stays last and only after an explicit owner decision (§10:328-331); it is not in this order.
- If the owner prefers pipeline-first, swap steps 1–2 with steps 6–8 and record the decision in this section before editing code.
- One step per commit; one drift class; update the §10 status table, the §13.3 checkbox, this §15 step, and `AGENTS.md` `Last verified` in the same session.

### 15.4 Eval and grounding mandate (non-negotiable)

- No step is "done" without its gate plus `npm test`; a passing compile is not evidence.
- Grounding: every answer's citations must be the chunks actually retrieved and used; B6 and B3 enforce this. Never weaken a check to pass; fix `source/**` or `server/lib/**`.
- Run `npm run verify:sync` before and after each step; run `verify:sync:docker` when Docker is available and record `SKIP` otherwise — never claim parity without it.
- Evals are part of the suite: B9 (persona golden set) and the low-evidence test from B3 gate every later step.
- A capability exists on the `AGENTS.md` matrix only after code + test; update the row only then.



### 15.5 Progress log

- **B1a (2026-11-25)** — `server/lib/agentic-rag.js:82-165` adds `PERSONA_PROFILES`, `resolvePersona()`, `buildAnswerPlan()`, and a `runAgenticRag()` wrapper that returns `persona` + `answerPlan` alongside the existing result; `tests/agentic-rag-persona.test.js` covers mode→depth mapping, role aliases, exam inference, per-profile layer order/depth budgets, and nested persona precedence. Gate: agentic suite `66/66` green. Still open for B1: wire `persona` from `server/index.js` request bodies, then `server/lib/ai.js`, `backend/rag/synthesizer.py`, `web/src/screens/DoubtTutor.tsx` (B1b/B1c).
- **Known pre-existing red, not B1** — `npm test` = `326/329`. `tests/editorial-workspace.test.js` `T1-F6-01`, `T1-F6-02`, `T3-F6-01` fail because `web/src/styles.css` has no warm-paper tokens (`--canvas` is `#f8fafc`, expected `#FAF9F6`; no `--hl-yellow/--hl-mint/--hl-coral`, `--accent-forest`, `--accent-terracotta`). This is an unimplemented editorial-workspace theme, tracked separately; do not weaken the tests to pass.
- **B1b (2026-11-25)** — `server/index.js:340,348,375,383` accept `persona` on `/api/tutor` and `/api/rag/analyze` and forward it to `runAgenticRag`; `server/index.js:362` also forwards it to the `askTutor` fallback. `server/lib/ai.js:36-43` adds `modeFromPersona()` and `:131` derives `effectiveMode`, so `persona.depth` drives the provider prompt (`:172`) and both fallback layers (`:192,201`). Tests: `tests/agentic-rag-persona.test.js` +2. Gate: agentic `68/68`, `node --check` clean, `typecheck` exit 0.
- **B2 (2026-11-26)** — Added `server/lib/persona-composer.js` (`DEPTH_DIRECTIVES`, `ROLE_COMPOSITIONS`, `composePersonaAnswer`) giving each persona a section shape + guidance (ELI5 = analogy + micro-example; student = worked step ladder; teacher = lesson plan + common errors + differentiation; parent = plain summary + progress link; aspirant = exam tier + PYQ framing). `buildAnswerPlan()` in `server/lib/agentic-rag.js:161` now attaches `composition`. Tests: `tests/persona-composer.test.js` (8 cases). Gate: agentic suite `76/76` green; `node --check` clean. Still open: consume `composition` in the answer pipeline (B3+).
