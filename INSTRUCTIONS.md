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

## 7. Files that changed in the 2026-11-19 sync pass

| File | Why |
|------|-----|
| `server/lib/rag.js` | Fixed infinite loops, lazy index, faster token/vector build |
| `server/lib/session-store.js` | Lazy `redis` import (10-27s boot cost removed) |
| `server/index.js` | Async practice/exam/video routes, cookie flag, health `commit`, removed duplicate middleware and unused client imports |
| `tests/practice.test.js` | Await async session functions |
| `Dockerfile` | `GIT_SHA` stamp, dev-dependency prune |
| `docker-compose.yml` | Removed unused Postgres/Redis, explicit cookie flag, SHA build arg |
| `render.yaml` | Branch `main`, `COOKIE_SECURE`, generated session secret |
| `nginx.production.conf` | `/sw.js` path corrected |
| `.gitignore`, `.env.production.example` | Stop tracking production env template as secret |
| `scripts/sync-verify.mjs` | Repeatable local/Git/Docker parity gate |
| `docs/SYNC.md`, this file | Contract + recovery runbook |

## 8. Hard rules

- Never edit `server/public/**`, `server/data/**`, or `artifacts/**` to make a check pass.
  Fix source (`web/**`, `source/**`, `server/lib/**`) and regenerate.
- Never commit `.env`, `.env.production`, `.secrets`, keys, or tunnel logs. Local secrets belong in `.secrets` (gitignored, Docker-ignored); the server loads `.env` then `.secrets`.
- Never `git push --force` to `main` or `Siri_ClassX-Platform`.
- One drift class per commit; run section 2 again before pushing.

## 9. RAG pipeline upgrade runbook

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

