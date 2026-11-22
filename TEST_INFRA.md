# E2E Test Infra: classx-platform Multi-Target Deployment & Security Hardening

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Derived directly from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`.
- **Methodology**: Systematic 4-tier design:
  - Category-Partition & Feature Coverage (Tier 1: ≥5 isolated checks per feature).
  - Boundary Value Analysis (Tier 2: edge and corner cases, malformed payloads, traversal attempts).
  - Pairwise Combinatorial Interactions (Tier 3: mock toggle + routing, offline service worker + mock API, sanitized prompt + tutor).
  - Real-World Workload Testing (Tier 4: full static preview end-to-end user journey across all main views without backend server).

## Feature Inventory & Test Mapping
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------------------|:------:|:------:|:------:|
| 1 | Multi-target Vite base path & bundle output | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | SPA routing fallback files (`404.html`, `.nojekyll`, `_redirects`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Automated GitHub Actions CI/CD workflows (Pages & Cloudflare) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Client-side mock data layer (29 API endpoints) | ORIGINAL_REQUEST §R3 | 29 | 6 | ✓ |
| 5 | Dual-mode dispatcher & offline/404 auto-fallback | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 6 | Prompt injection defense & delimiter escaping (`<student_question>`) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 7 | Input sanitization & slug validation (`validateSlug`) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 8 | KaTeX math rendering HTML escaping & DOM XSS prevention | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 9 | Path traversal protection in data loader | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 10 | Secret leak prevention & deployment credentials security | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Native Node.js test runner (`node:test` with `node:assert/strict`) for rapid, dependency-free execution in any CI/CD environment.
- **Invocation**:
  - Full E2E & Unit Suite: `node --test tests/e2e-deployment.test.mjs tests/mock-api.test.js tests/mock-resilience.test.js` or `npm test`
  - Static Preview User Journey: `node scripts/e2e-static.mjs` (or integrated via `tests/e2e-deployment.test.mjs`)
- **Directory Layout**:
  - `tests/e2e-deployment.test.mjs`: Consolidated E2E test runner covering Tiers 1–4.
  - `tests/mock-api.test.js`: Tier 1 comprehensive contract suite for all 29 mock endpoints.
  - `tests/mock-resilience.test.js`: Tier 2 boundary cases & Tier 3 network failure / 404 auto-fallback combinations.
  - `tests/security.test.mjs`: Tier 1 & Tier 2 prompt sanitization, jailbreak screening, slug validation, and path traversal defense tests.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Static Preview Journey: Home → Subject Selection → Chapter View | F1, F2, F4, F5 | High |
| 2 | Practice Session: Start → Answer MCQ → Submit → View Detailed Scorecard | F4, F5, F8 | High |
| 3 | Mock Exam Paper Generation → Objective MCQ Answer → Answer Key Reveal → Self-Marking | F4, F5, F8 | High |
| 4 | AI Tutor In-App Interaction: Question Submission → Delimiter Protection → Citation Rendering | F4, F6, F7 | High |
| 5 | Offline / Disconnected Session: Auto-Fallback Engages → PWA Service Worker Resilience | F2, F4, F5 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 tests per core feature area (74+ tests total across build, workflows, mock API, sanitization).
- **Tier 2 (Boundary & Corner Cases)**: ≥5 tests per feature area (30+ tests total covering trailing slashes, deep links, regex special chars, prompt injection payloads, path traversal attempts, malformed LaTeX).
- **Tier 3 (Cross-Feature Combinations)**: Pairwise coverage for mock mode toggle, network drop fallback, offline SW payload interception, sanitized prompt to tutor flow.
- **Tier 4 (Real-World Application Scenarios)**: 5 end-to-end user workflows tested against static preview artifact.
