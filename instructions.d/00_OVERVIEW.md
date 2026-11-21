# ClassX Platform — Subsystem Operational Instructions

## 1. Purpose & Architecture

This directory (`instructions.d/`) provides modular, specialized operational documentation for the ClassX Platform (CBSE Class X 2026-27). As the platform has expanded to incorporate dual theming (Glassmorphism + Neumorphism), a sticky One-Tap Quick Navigation Bar, a resilient 30-aid Learning Aids engine, dynamic Concept Graph derivation, gamification fallbacks, and comprehensive route redirects, this directory decomposes the monolithic runbook (`INSTRUCTIONS.md`) into modular, maintainable domain runbooks.

Each module in this directory provides:
1. Current operational status and verified capabilities.
2. Step-by-step developer and operator usage instructions.
3. Known architectural boundaries, performance constraints, and defensive fallbacks.
4. Concrete validation results linked directly to the root validation checklist.

> [!NOTE]
> All specifications and tests reflect Git commit `b7a11e2d2849c8c8005773ab8c308941993abc3e` (`b7a11e2`), verified across TypeScript compilation, Node test runner suites, content integrity scripts, and active HTTP endpoints on port 8787.

---

## 2. Heading & Formatting Standards

In alignment with the Engineering Coordination Center (ECC) documentation governance rules (`C:\Users\Admin\src\ECC`), all files under `instructions.d/` strictly adhere to the following conventions:

1. **Monotonic Heading Hierarchy**:
   - Level 1 (`#`) is reserved exclusively for the document title (one per file).
   - Level 2 (`##`) designates primary operational sections (e.g., Status, Usage, Boundaries, Validation).
   - Level 3 (`###`) designates granular features, procedures, or edge cases.
   - Heading levels are never skipped (e.g., `#` is never followed directly by `###`).
2. **Mandatory Code Block Syntax Highlighting**:
   - Every fenced code block specifies an explicit syntax identifier (e.g., `powershell`, `javascript`, `typescript`, `css`, `json`, `markdown`).
3. **Semantic Callout Styling**:
   - In accordance with Obsidian documentation standards (`C:\Users\Admin\src\obsidian-skills`), callout blocks (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`) are utilized for operational highlights, boundaries, and best practices.
4. **Bi-Directional Traceability**:
   - Every file maintains direct hyperlinks to `../VALIDATION_CHECKLIST.md` and related source files.

---

## 3. Modular Subsystems Index

The following table indexes all modular subsystem runbooks in this directory:

| Module File | Subsystem Focus | Operational Status | Key Source Files |
|---|---|---|---|
| [01_THEME_AND_NAVIGATION.md](01_THEME_AND_NAVIGATION.md) | Glassmorphism & Neumorphism Dual Theme, Theme Switcher, and Sticky One-Tap Quick Access Navigation Bar | **PRODUCTION READY** | `web/src/styles.css`<br>`web/src/components/Layout.tsx` |
| [02_LEARNING_AIDS.md](02_LEARNING_AIDS.md) | Resilient 30 Learning Aids Engine, STEM/Non-STEM Synthesis, and Frontend Error Boundary Card | **PRODUCTION READY** | `server/lib/learning-aids.js`<br>`web/src/screens/LearningAids.tsx` |
| [03_CONCEPT_GRAPHS.md](03_CONCEPT_GRAPHS.md) | RAG Concept Graph Synthesis, Fallback Tree Derivation, and Interactive 2D SVG Graph Visualizer | **PRODUCTION READY** | `server/lib/rag.js`<br>`web/src/screens/ConceptMapVisualizer.tsx` |
| [04_GAMIFICATION.md](04_GAMIFICATION.md) | XP Accrual, Level Thresholds, Badge System, and Offline-Resilient Cohort Leaderboard | **PRODUCTION READY** | `web/src/screens/Gamification.tsx`<br>`server/index.js` |
| [05_ROUTING_AND_FALLBACKS.md](05_ROUTING_AND_FALLBACKS.md) | Canonical SPA Route Map, 9 Route Redirects, Deep Linking, and Wildcard 404 Error Boundary | **PRODUCTION READY** | `web/src/App.tsx` |

---

## 4. Master Validation Checklist Reference

Every subsystem documented in this directory has been systematically validated for functional correctness, type safety, and runtime stability. 

For the complete, itemized verification matrix with exact command lines, outputs, and observed results, consult:
- **[ClassX Production Readiness Validation Checklist](../VALIDATION_CHECKLIST.md)**

For overall platform health and disaster recovery runbooks, refer to:
- **[INSTRUCTIONS.md](../INSTRUCTIONS.md)**
- **[AGENTS.md](../AGENTS.md)**
