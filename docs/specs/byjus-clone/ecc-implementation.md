# ECC Implementation Approach — BYJU's clone on ClassX

ECC (C:\Users\Admin\src\ECC): 71 agents, 311 skills. Referenced skills below for top-class feature implementation.

## Feature → ECC skill mapping

| ClassX feature (SPEC) | ECC skill(s) | Role |
|---|---|---|
| Video-lesson tile (SPEC-16) | `video-editing`, `manim-video`, `tasteforge-video`, `frontend-patterns`, `react-patterns` | Video player UI, captions, resume/bookmark |
| Adaptive practice (SPEC-17) | `recsys-pipeline-architect`, `content-engine`, `tdd-workflow` | Difficulty transitions, question pool, TDD |
| Gamification (SPEC-18) | `dashboard-builder`, `frontend-patterns`, `react-patterns` | XP, badges, leaderboard UI |
| Parent dashboard (SPEC-19) | `dashboard-builder`, `frontend-patterns`, `api-design` | Read-only progress view, weekly digest endpoint |
| Doubt tutor bubble (SPEC-20) | `iterative-retrieval`, `content-engine` | Grounded-fallback citations, tutor UI |
| Offline/PWA (SPEC-21) | `vite-patterns`, `frontend-patterns`, `e2e-testing` | Service worker, IndexedDB, PWA install |
| Spec-driven validation | `docs-governance`, `verification-loop`, `e2e-testing` | SPEC-16..21 acceptance, Playwright e2e |

## ClassX stack fit
- Node 26, Express 4, React 18, Vite 6, TypeScript 5, KaTeX, lucide-react (per AGENTS.md)
- ECC `vite-patterns`, `react-patterns`, `typescript-patterns` align with this stack
- `e2e-testing` aligns with classx-platform Playwright (`npm run e2e`)

## Implementation order (per jev decision log)
1. Video-lesson tile → `frontend-patterns` + `react-patterns` + `video-editing`
2. Adaptive practice → `recsys-pipeline-architect` + `tdd-workflow`
3. Gamification → `dashboard-builder` + `frontend-patterns`
4. Doubt tutor bubble → `iterative-retrieval` + `content-engine`
5. Parent dashboard → `dashboard-builder` + `api-design`
6. Offline/PWA → `vite-patterns` + `e2e-testing`

## Verification gate
Run `npm run verify` (typecheck, check, coverage, test, e2e) after each feature. ECC `verification-loop` + `e2e-testing` reinforce classx-platform's existing gate.

## Blocker
ECC skills are reference templates; actual implementation uses classx-platform source (`web/src/`, `server/`). No ECC code is copied verbatim—skills guide approach only.
