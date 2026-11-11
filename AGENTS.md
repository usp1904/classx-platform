# ClassX Platform — Agent Notes

## Purpose
CBSE Class X (2026-27) study platform: 4 subjects, 67 chapters, 52 fully authored lessons (all Mathematics, Science, Social Science), 0 starter packs, 15 English syllabus maps, practice, mock exams with self-marked written answers, Mathematics planner, progress, revision library, grounded tutor.

Project root: `C:\Users\Admin\src\classx-platform`
Repo root is `C:\Users\Admin` (the project is untracked there; do not commit unrelated home-directory files).

## Stack
- Node 26, Express 4, React 18, Vite 6, TypeScript 5, KaTeX, lucide-react.
- API: `http://localhost:8787`. Dev UI: `http://localhost:5173` with `/api` proxy.
- Production build goes to `server/public` and is served by the API.
- Tutor provider env (optional): `OPENAI_API_KEY` or `OPENROUTER_API_KEY`, plus `OPENAI_BASE_URL`, `TUTOR_MODEL` / `OPENAI_MODEL`. Without a key the `grounded-fallback` / `curriculum-ranker` extractive tutor is used. Tutor modes: `socratic`, `board`, `competitive`, `eli5` (explain like I'm 5, works across Maths/Science/Social Science).
- E2E uses `playwright-core` 1.64.1 with installed Chrome/Edge and Playwright Firefox (`npx playwright-core install firefox`, or `npm run e2e:install`). System Firefox is not compatible with Playwright's patched engine.

## Commands
```powershell
npm run dev              # API + Vite, watch mode
npm run build            # vite build -> server/public
npm start                # production API + built SPA on :8787
npm run sync             # regenerate server/data from ./source
npm run check            # structural data validation
npm run typecheck        # tsc --noEmit
npm test                 # node:test suite
npm run coverage         # regenerate COVERAGE.md from data
npm run coverage:strict  # fail if any authored chapter lacks depth
npm run e2e              # build + Chrome/Edge/Firefox smoke matrix
npm run verify           # typecheck + check + coverage + tests + e2e
```
Launchers: double-click `Start-ClassX.cmd`, or run `Start-ClassX.cmd --all` to open every installed browser. The launcher starts the API, waits for health, opens the app, and logs to `%TEMP%\classx-platform.log`.

## Spec and test contract
- `SPEC.md` is the acceptance source of truth: SPEC-01 through SPEC-15 cover launch, curriculum, honest depth, maths depth, chapter reader, practice, mock exams, tutor grounding, planner, progress/library, search, responsive/a11y, cross-browser, data integrity, and the regression gate. SPEC-16 through SPEC-22 (docs/specs/byjus-clone/) add BYJU'S-style engagement: video lessons, adaptive practice, gamification, parent dashboard, doubt tutor bubble, offline/PWA, and ELI5 tutor mode.
- Every E2E assertion must map to a SPEC id. Update the spec before changing behaviour; never weaken a check to hide a failure.
- `scripts/e2e.mjs` starts its own fresh API on `:8799` (does not touch a running dev server), runs core flows in Chrome, Edge, and Firefox, then runs the full suite plus mobile overflow in Chrome. Screenshots go to `artifacts/e2e/`.
- `scripts/coverage.mjs` writes `COVERAGE.md` from generated data and validates every MCQ index, subjective steps/answer, chapter reference, official topic attachment, planner chapter reference, and source PDF. Structural failures exit 1.
- Tests now include coverage invariants and tutor grounding (`tests/coverage.test.js`, `tests/tutor.test.js`): 19 tests total.

## Data lineage
- `./source` is the imported content snapshot (syllabus JSON, authored lessons, plan, PDFs). It is reference data only.
- `npm run sync` rewrites `server/data/curriculum.json`, `questions.json`, `sources.json`, `plan.json`, and `server/data/lessons/**`.
- Do not hand-edit generated files if the fix belongs upstream. Edit `source/**`, then run `npm run sync`.
- Math lesson chapter ids equal the lesson file slug (`pair-of-linear-equations`, `applications-of-trigonometry`). Do not revert to slugified display names: it breaks lesson output and planner chapter links.
- Difficulty is normalized to `simple | medium | complex` (`easy` -> simple, `hard` -> complex). Question `answer` falls back to the final solution step when `final_answer` is absent.
- Full-lesson gate: at least 3 concepts, at least 3 combined worked examples/exercises, at least 5 MCQs, at least 1 misconception, and at least 1 visual/concept map/mind map. All 15 Mathematics, all 15 Science, and all 22 Social Science chapters pass. English 15 chapters are syllabus maps awaiting authoring.
- Current shape: 4 subjects, 67 chapters, 76 official topics, 52 full authored chapters, 0 starter chapters, 15 syllabus maps, 2569 questions (1505 MCQs, 1064 subjective), 1664 RAG chunks, 4 source PDFs.
- Every official topic is attached to exactly one chapter. Mathematics consolidates 24 syllabus topics into 15 chapters (for example Real Numbers owns 5); other subjects map one topic per chapter.
- `attachOfficialTopics()` in `sync-content.mjs` throws if any official topic is orphaned or unattached. Do not replace it with a name heuristic.
- `COVERAGE.md` is generated and must stay honest. Do not describe a syllabus map as a full lesson. Full free-form tutoring needs a provider key; without one the tutor orients from retrieved context only.
- The plan is Mathematics-only (15 weeks). It is not a four-subject timetable; do not present it as one.

## Backend map
- `server/index.js`: API routes, static SPA fallback.
- `server/lib/data.js`: curriculum, question, lesson, plan access.
- `server/lib/rag.js`: hybrid lexical/semantic retrieval (`/api/search`, tutor citations, graph). Includes one syllabus chunk for every mapped chapter.
- `server/lib/ai.js`: provider call + grounded fallback tutor.
- `server/lib/practice.js`: in-memory practice/exam sessions (3h TTL), scoring, `getExamKey`, exam submit.
- `server/lib/progress.js`: guest/user progress persistence.
- Exam flow: generate paper -> attempt -> `GET /api/exam/:paperId/key` reveals written steps -> student self-marks written -> `POST /api/exam/submit` combines MCQ auto-score and written self-marks.
- Sessions are in memory. Restarting the API invalidates active practice/exam sessions.

## Frontend map
- `web/src/App.tsx`: all routes + `BrowserRouter` + `AppDataProvider`. `main.tsx` renders `<App />` and owns global CSS import order.
- Screens: `Dashboard`, `Courses`, `Chapter`, `Practice`, `MockTests`, `Tutor`, `Planner`, `Progress`, `Library`.
- Components: `Layout`, `CommandPalette`, `PracticeRunner`, `RichText`, `VisualBlock`, `ConceptMap`, `ui`.
- API client/types: `web/src/api.ts`, `web/src/types.ts`.
- State: `web/src/lib/store.tsx` (curriculum, progress, plan, bookmarks, toasts).
- `RichText` renders Markdown-ish text and KaTeX. Keep `React.ElementType`, not `JSX.IntrinsicElements`.
- Tutor discloses `grounded-fallback`; badge checks that exact mode string.

## Styling
CSS is split because one large write failed:
- `styles.css` (tokens, shell, primitives, rich text)
- `dashboard.css`
- `courses-chapter.css`
- `tools.css` -> imports `practice-mock.css`, `tutor-planner.css`, `progress-library.css`
- `responsive.css`
- `main.tsx` import order must stay: `katex`, `App`, `styles.css`, `dashboard.css`, `courses-chapter.css`, `tools.css`, `responsive.css`. Do not move module CSS back into `styles.css`; doing so overrides mobile media queries.
- Keep breakpoints at 1240 / 1080 / 900 / 780 / 560. Do not re-inline everything into one file.
- Desktop must show exactly one search control. `.topbar .mobile-search-btn { display: none }` needs the topbar specificity because `.icon-btn` sets `display: grid` later.
- Mobile drawer is `.sidebar.open` with `.mobile-scrim`; `.mobile-close` is visible only on mobile.

## Fixed issues — do not revisit
- [x] Mobile horizontal overflow: module CSS import order + `.app-shell` + drawer selectors fixed. All 10 routes pass at 390x844.
- [x] Duplicate desktop search icon: `.topbar .mobile-search-btn` specificity fixed.
- [x] Planner title: now derives from `weeks.length` (15), not hardcoded 22.
- [x] Streak grammar: renders `1 day` vs `n days`.
- [x] `987/10500` terminating-decimal answer: corrected in source and generated data.
- [x] Tutor fallback badge checked `fallback`; corrected to `grounded-fallback`.
- [x] Science/Social starter packs were mislabelled Full lesson; depth gate now marks them `isPartial`.
- [x] Dashboard subject cards counted starter packs as authored; now use `hasContent && !isPartial` and show pending chapters.
- [x] Syllabus-only chapters had empty topic lists; all 76 official topics now attach to chapters and render in the map and chapter rail.
- [x] Retrieval returned hashed-vector collisions for unrelated questions; results now require at least one lexical query token.
- [x] Tutor fallback repeated the student question as the "answer"; it now returns a grounded board/socratic/competitive skeleton with a visual anchor and disclosure.
- [x] Tutor retrieval now indexes lesson visualizations as `visual` chunks.
- [x] Chapter rail rendered RD Sharma / RS Aggarwal topic objects as `[object Object]`; `topicNames()` now unwraps names. E2E checks every chapter tab for stringified objects.
- [x] Bundle size: ~622 kB JS / ~182 kB gzip accepted. Do not revisit unless it passes 750 kB or load time regresses.
- [x] TypeScript: `ConceptMap` memo deps, `VisualBlock` max calc, Button `on-dark` variant.

## Verification before calling work done
```powershell
npm run verify
```

Manual equivalent: `npm run typecheck`, `npm run check`, `npm run coverage`, `npm test`, `npm run e2e`.
Then smoke-test the API: `/api/health`, `/api/curriculum`, a chapter, `/api/exam/generate` + `/api/exam/:paperId/key`, `/api/practice/start` + submit, `/api/library`, `/api/plan`, `/api/tutor`.

## Gotchas
- PowerShell console may render `·`, `√`, `³`, em dashes as mojibake. Files are UTF-8; verify with Node char codes before "fixing" encoding.
- `npm run check` expects exactly 4 subjects and 67 chapters. Update those expectations only with a deliberate curriculum change.
- One known content defect was fixed: 987/10500 is terminating (47/500 = 0.094). Keep model answers consistent with steps.
- `server/public` is generated; rebuild after frontend changes.
- The graph API returns `{ ok, graph }` and the plan API returns `{ ok, plan }`.
- `npm run e2e` uses port 8799 and stops its own server. Do not point it at a live user server.
- Background server PIDs/scripts live in `C:\Users\Admin\AppData\Local\Temp\opencode` during agent sessions.
- `npm install` reports 3 vulnerabilities (1 low, 2 moderate). Check with `npm audit` before changing dependencies; do not force-fix blindly.

## Last verified
2026-11-10: `npm run verify` passes end to end after mass authoring Science (all 15 chapters) and Social Science (all 22 chapters), plus ELI5 tutor mode: TypeScript, `check`, `coverage` (0 warnings, 0 failures), 19 unit tests, production build (622 kB JS / 182 kB gzip), E2E (Chrome 56, Edge 34, Firefox 34). Shape: 4 subjects / 67 chapters / 76 topics / 52 full / 0 starter / 15 maps / 2569 questions.

## Tooling and offline capability
- `graphify` 0.9.49 CLI is installed; code graph lives in `graphify-out/` (441 nodes / 783 edges / 16 communities). Refresh with `graphify update .` — code-only extraction needs no key or network.
- Local skill/tool libraries: `C:\Users\Admin\ECC` (71 agents, 311 skills, 97 legacy commands, hooks, orchestration workflows), `C:\Users\Admin\.agents\skills` (64), `C:\Users\Admin\.config\opencode\skills\google-skills\skills` (25), `C:\Users\Admin\.claude\skills` (11).
- Best offline authoring aids: `.agents/skills/curriculum-guard`, `master-architectural-system-prompt`, `dual-mode-router`, `math-formatter`, `viz-generator`; ECC `article-writing`, `verification-loop`, `docs-governance`; Google `constraint-driven-development`, `test-driven-development`, `code-review-and-quality`.
- `playwright-core` 1.64.1 is project-local with Chrome, Edge, and cached Playwright Firefox. `npm run verify` is fully offline.
- `jev-ultrafast` needs `TYPESAFE_API_KEY` + `TEXT_MODEL_API_KEY` and has no `.venv`; not usable offline. `supermemory` CLI has no API key; not usable offline. Existing `n8n` workflows need OpenAI/vector-store credentials.
- Tutor env keys are present (`openAI_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_BASE_URL`) but provider calls fail with `fetch failed`; the tutor correctly serves `grounded-fallback`. Do not treat that as a code regression.

## Deployment (free, no credit card)

- `Dockerfile`: multi-stage Node 26 alpine build + runner, healthcheck on `:8787/api/health`
- `docker-compose.yml`: classx-api + redis + postgres + nginx (ports 80/443), `restart: always`
- `nginx.conf`: reverse proxy with health endpoint and timeout tuning
- `render.yaml`: Render web service config (region: singapore, free tier, healthCheckPath: /api/health)
- To deploy free: push to GitHub (`usp1904/classx-platform`), connect on Render.com, auto-deploys from `render.yaml` to `https://classx-platform.onrender.com`
- Server running locally: `http://localhost:8787` (health: `GET /api/health`)

## Progress log
- 2026-10-26: baseline verified (15 full Maths, 8 starters, 44 maps, 778 questions).
- 2026-10-28: authored Science `Chemical Reactions and Equations` as a full lesson; refreshed graph; full `npm run verify` green. Shape now 16 full / 7 starter / 44 maps / 831 questions.
- 2026-10-28: authored Science batch S1 — upgraded `Life Processes` (replaced legacy `biology.json` in place) and added `Control and Coordination` + `How do Organisms Reproduce`. `npm run verify` green; API smoke on `:8788` confirmed practice, 3-section exam, and grounded tutor citations from `Life Processes`. Shape now 19 full / 6 starter / 42 maps / 992 questions / 1664 chunks.
- 2026-11-10: mass authored all Science (15 chapters) and all Social Science (22 chapters). Shape now 52 full / 0 starter / 15 maps / 2569 questions / 1664 chunks. `npm run verify` green (typecheck, check, coverage, tests).
- 2026-11-10: added BYJU's clone engagement layer (SPEC-16..21): video lessons, adaptive practice, gamification, parent dashboard, doubt tutor, offline/PWA. Added ELI5 tutor mode (SPEC-22) across Maths, Science, Social Science. Dockerized with nginx+redis+postgres. Multimodel RAG + OKF metadata alignment. New frontend screens: VideoLesson, AdaptivePractice, DoubtTutor, Gamification, ParentDashboard, ConceptMapVisualizer, OKFMetadataBrowser, OfflineStatus, RAGSearchViewer. Refreshed graphify code graph (533 nodes / 909 edges / 27 communities). Deployment: Dockerfile, docker-compose.yml, nginx.conf, render.yaml for free Render deployment.

## Backlog — remaining authoring
- English: 15 chapters — enable `lessonDir: 'english'` in `sync-content.mjs` first; then Literature 3, Reading 2, Grammar 5, Writing 5.

## Preconditions before mass authoring
- `matchLesson()` now does exact normalized match first, then longest containment; `&` normalizes to `and`. Regression coverage lives in `tests/sync.test.js`.
- Legacy starter files win by alphabetical `readdirSync` order (`biology.json`, `physics.json`, `civics.json`, `economics.json`, `geography.json`, `history.json`). Replace the legacy file in place when upgrading, or migrate to chapter-id filenames.
- English lessons now load: `SUBJECTS` uses `lessonDir: 'english'`; author into `source/lessons/english/`.
- Non-Math `concept_maps`/`mind_maps` render under Revision and now also under Visuals; the Visuals tab count includes both map types.
- Use `simple|medium|complex` for MCQ and model-paper keys; MCQ/model keys are normalized at sync time (exercises were already normalized).
- Non-Math lessons must not invent `visualizations` types; `VisualBlock` renders only `number_line`, `right_triangle`, `right_triangle_labels`, `height_distance`, `coordinate_graph`, `similar_triangles`, `unit_circle`.
- Updating full/starter counts requires edits in `tests/coverage.test.js` (currently 52/0/15) and the shape lines here.
