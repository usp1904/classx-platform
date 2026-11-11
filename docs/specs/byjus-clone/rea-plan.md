# REA Reverse-Engineering Plan — BYJU'S → ClassX clone

Target: top edtech web platform (BYJU'S) feature inventory for ClassX clone.
Method: REA (reverse-engineer-anything skill, C:\Users\Admin\src\rea).

## Prerequisites (not yet met)
- REA MCP server registered / `rea doctor` green, or `npx -y rea-agents@latest` CLI
- Live BYJU'S web target open in browser/Electron, OR downloaded BYJU'S app package (ASAR/APK/ZIP)
- Network access to capture traffic / load bundles

## Route selection (per reverse-engineer-anything/SKILL.md)

| Target form | REA tool | Purpose |
|---|---|---|
| Live BYJU'S web page already open | `list_browser_targets` → `capture_browser_scenario` | Record SPA interactions, discover API origins |
| Passive traffic capture (HAR/SAZ) | `inspect_web_network_capture` | Inventory API endpoints, request/response shapes |
| Extracted JS / Electron / ASAR tree | `analyze_javascript_application` | Module graph, feature tracing, version comparison |
| Downloaded APK/IPA/ZIP | `open_binary` → `inspect_artifact` | Member inventory, code extraction |

## Feature inventory to capture from BYJU'S

1. **Video lessons** — player controls, resume/bookmark, chapter gating, embed source
2. **Adaptive practice** — difficulty transitions, question pool, session summary shape
3. **Gamification** — XP/badge/leaderboard UI, progress bars, streak display
4. **Parent dashboard** — read-only progress panels, weekly digest layout
5. **Doubt tutor** — question input, citation display, fallback disclosure
6. **Offline/PWA** — service worker registration, cache strategy, install prompt
7. **Navigation** — bento home, chapter rail, deep links (/courses/math/real-numbers)

## Evidence outputs
- Evidence IDs per feature, with observations/inferences/unknowns distinguished
- `export_evidence_bundle` → saved at C:\Users\Admin\src\classx-platform\docs\specs\byjus-clone\rea-bundle.json
- `inspect_analysis_view` for deep dives on retained evidence

## Integration with classx-platform
- Map each BYJU'S feature to a SPEC-16..SPEC-21 requirement
- Flag gaps where ClassX lacks parity (video, adaptive, gamification, parent, doubt, offline)
- Feed gaps into /eg-new-feature implementation backlog

## Blocker note
No REA server registration, no BYJU'S artifacts, no network capture available in this offline session. Plan is executable once prerequisites are in place. Do not fabricate BYJU'S internals.
