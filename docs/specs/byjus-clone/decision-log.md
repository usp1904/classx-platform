# jev-ultrafast Decision Log — BYJU'S clone scope (ClassX)

Method: one-goal decision loop (page → indexed elements → operation + target → execution). Live run not possible offline (no TYPESAFE_API_KEY / TEXT_MODEL_API_KEY / Browser Harness / Chrome). Decisions recorded here as if executed by the agent.

## Scope decisions

| Decision | Choice | Reason |
|---|---|---|
| Video source | YouTube embed | Zero self-host bandwidth; fast to ship |
| Adaptive algorithm | simple moving accuracy | Simpler than spaced repetition; tunable later |
| Gamification leaderboard | Class scope, opt-in | Avoids school-wide infra; privacy-safe |
| Parent auth | Guest read-only link | No login system yet; fastest |
| Offline cache | Chapters + practice questions (not video) | Video too large for IndexedDB; text/questions cache well |
| PWA install prompt | Yes | Low cost, high perceived value |

## Feature implementation order (by jev priority)
1. Video-lesson tile (SPEC-16) — highest engagement value, easiest
2. Adaptive practice (SPEC-17) — reuses existing practice engine
3. Gamification (SPEC-18) — XP/badge/leaderboard on existing progress
4. Doubt tutor bubble (SPEC-20) — reuses grounded-fallback tutor
5. Parent dashboard (SPEC-19) — read-only progress view
6. Offline/PWA (SPEC-21) — service worker + IndexedDB, last

## Blocker
Live jev run needs `.env` with TYPESAFE_API_KEY + TEXT_MODEL_API_KEY, `uv sync`, Chrome with remote debugging. Not available in this offline session. Decisions stand until validated by a live jev run.
