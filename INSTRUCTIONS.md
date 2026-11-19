# ClassX Platform — Operator Instructions

Start here after any breakage, deploy failure, or "which copy is correct?" question.
This file is the recovery checklist. `docs/SYNC.md` explains the contract.

## 1. One-time context

- Project: `C:\Users\Admin\src\classx-platform` (own Git repo, remote `origin`).
- Home directory `C:\Users\Admin` is **not** a project repo. Its old `src/classx-platform`
  gitlink was removed because it was a nested repo with no `.gitmodules`. Do not re-add it.
- Canonical branch: `main`. `Siri_ClassX-Platform` is an identical mirror.
- Canonical runtime: Node 26 in Docker, Express on `:8787`, SPA in `server/public`.
- Sessions/practice state: in-memory (`MemoryStore`, `global.__practiceSessions`). No Redis/Postgres running.

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

Expected: 4 subjects, 67 chapters, 2569 questions, 19/19 tests, build ~665 kB JS.
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
- Never commit `.env`, `.env.production`, keys, or tunnel logs.
- Never `git push --force` to `main` or `Siri_ClassX-Platform`.
- One drift class per commit; run section 2 again before pushing.
