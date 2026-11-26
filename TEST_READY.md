# TEST_READY: ClassX Academic Agentic Platform (CBSE Class 10 & Competitive Bridge)

## 1. Test Suite Overview
This document certifies the Iteration 3 opaque-box, 4-tier automated E2E test suite for the ClassX Academic Agentic Platform against `ORIGINAL_REQUEST.md`, `PROJECT.md § Feature Inventory`, and `TEST_INFRA.md`.

The suite verifies the LangGraph OKF v0.2 agentic RAG backend (`query_analyzer`, `retrieval_grader`, `pedagogical_generator`, `video_grounder`), the tactile editorial study workspace (warm paper palette, split-pane study sheet, monospace pipeline status indicator, distraction-locked `<ConceptVideoPlayer />`), the 26-query Class 10 evaluation benchmark dataset, and the zero-tolerance academic originality and brand safety guardrail.

*Scope Note*: The 180-test count below covers the **8 tracked opaque-box E2E suite files** defined in `TEST_INFRA.md` (excluding `tests/agentic-rag-persona.test.js` and legacy non-E2E unit tests such as `tests/youtube.test.js`, `tests/security.test.js`, `tests/mock-api.test.js`, etc.).

---

## 2. Test Execution Commands

### Primary Invocations

```powershell
# 1. Full Academic JavaScript E2E Suite (Node.js Native Test Runner — 160 tests across 7 files)
node --test tests/originality-guardrail.test.js tests/agentic-rag-router.test.js tests/agentic-rag-grader.test.js tests/agentic-rag-synthesizer.test.js tests/video-grounding.test.js tests/concept-video-player.test.js tests/editorial-workspace.test.js

# 2. Strict Production Mode (JS — verifies live server/lib/agentic-rag.js & web/src/lib/*.ts + .tsx components)
$env:STRICT_PRODUCTION='true'; node --test tests/agentic-rag-router.test.js tests/agentic-rag-grader.test.js tests/agentic-rag-synthesizer.test.js tests/video-grounding.test.js tests/concept-video-player.test.js tests/editorial-workspace.test.js; Remove-Item Env:\STRICT_PRODUCTION

# 3. Python LangGraph Agentic RAG Pipeline Suite (Pytest — 20 tests)
python -m pytest tests/test_agentic_rag.py -v

# 4. Academic Originality & Brand Scanner Self-Scan (includes .py, .txt, .yml/.yaml & backend/)
node --input-type=module -e "import * as m from './tests/originality-guardrail.test.js'; import fs from 'node:fs'; const selfV = m.scanContent(fs.readFileSync('./tests/originality-guardrail.test.js', 'utf8'), 'tests/originality-guardrail.test.js'); const testV = m.scanDirectory('./tests'); const backendV = fs.existsSync('./backend') ? m.scanDirectory('./backend') : []; const evalV = m.scanDirectory('./eval'); console.log('Self:', selfV.length, 'tests/:', testV.length, 'backend/:', backendV.length, 'eval/:', evalV.length); if (selfV.length + testV.length + backendV.length + evalV.length > 0) process.exit(1);"
```

---

## 3. 4-Tier Test Architecture & Coverage Summary

| Tier | Purpose & Methodology | Minimum Threshold | Authored Count | Live M2/M3 Status | Target M4 Status |
|---|---|:---:|:---:|:---:|:---:|
| **Tier 1** | **Feature Coverage**: Isolated happy-path functional behavior across all 10 core features | ≥ 50 tests (≥ 5 / feature) | **61** (56 JS + 5 Py) | **60/61 pass** (`T1-F9-08` gates `conceptPlayer.ts` `container`) | **61/61** |
| **Tier 2** | **Boundary & Corner Cases**: Negative bounds, zero-durations, null-safety, WCAG contrast, cliché & obfuscation edge cases | ≥ 50 tests (≥ 5 / feature) | **66** (58 JS + 8 Py) | **65/66 pass** (`T2-F9-01` gates `conceptPlayer.ts` `45s–46s` mask) | **66/66** |
| **Tier 3** | **Cross-Feature Combinations**: Pairwise component interactions, retry recovery, 26-item eval matrix, tab switches | ≥ 15 tests | **23** (21 JS + 2 Py) | **23/23 pass** | **23/23** |
| **Tier 4** | **Real-World Application Scenarios**: Multi-step student journeys (Science, Math, Civics, Whole-Platform Audit) | ≥ 8 scenarios | **24** (19 JS + 5 Py) | **23/24 pass** (`test_e2e_cbse_board_high_scorer_pipeline_journey` gates `backend/rag/` Activity 1.1 retrieval) | **24/24** |
| **Integration** | **Production Module & Component Gates**: Live `server/lib/agentic-rag.js`, `web/src/lib/*.ts`, and `.tsx` component existence (`STRICT_PRODUCTION=true`) | N/A | **6** (6 JS) | **6/6 pass** (default & `STRICT_PRODUCTION=true`) | **6/6** |
| **TOTAL** | **Grand Total Tracked E2E Automated Tests** | **≥ 123 tests** | **180 tests** | **177 Pass / 3 Gate M2-M3 Fixes** | **180 Pass** |

*Active Implementation Gates Detected Against Live M2/M3 Code*:
1. **`tests/concept-video-player.test.js` (`T1-F9-08`)**: `web/src/lib/conceptPlayer.ts` `renderConceptVideoPlayerModel()` omits the `container` (`aspect-video` / `aspectRatio: '16 / 9'`) model property.
2. **`tests/concept-video-player.test.js` (`T2-F9-01`)**: `web/src/lib/conceptPlayer.ts:154` uses `const end = rawEnd >= start ? rawEnd : start;` instead of `rawEnd > start ? rawEnd : start + 1`, causing `headerMask.timeRangeText` to render `'45s–45s'` while `iframe.src` has `end=46`.
3. **`tests/test_agentic_rag.py` (`test_e2e_cbse_board_high_scorer_pipeline_journey`)**: Live `backend/rag/` LangGraph execution on `eval-sci-chem-001` (Activity 1.1 quicklime + water) retrieved Section 1.2 magnesium ribbon chunks instead of calcium oxide (`CaO`) / `Ca(OH)2`.

---

## 4. Feature Inventory Coverage Matrix (Features 1–10)

| # | Feature | Req | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Primary Test Files | Live Status |
|---|---|:---:|:---:|:---:|:---:|:---:|---|:---:|
| 1 | Query Analyzer & Router (`query_analyzer`) | R1 | 6 | 5 | ✓ | ✓ | `tests/agentic-rag-router.test.js`, `tests/test_agentic_rag.py` | **PASS** |
| 2 | Conditional HyDE Generation | R1 | 5 | 6 | ✓ | ✓ | `tests/agentic-rag-router.test.js`, `tests/test_agentic_rag.py` | **PASS** |
| 3 | Retrieval Grader & Source Balancer (`retrieval_grader`) | R1 | 5 | 5 | ✓ | ✓ | `tests/agentic-rag-grader.test.js`, `tests/test_agentic_rag.py` | **PASS** |
| 4 | 4-Layer Pedagogical Synthesizer (`pedagogical_generator`) | R1 | 5 | 5 | ✓ | ✓ | `tests/agentic-rag-synthesizer.test.js`, `tests/test_agentic_rag.py` | **GATES M2** (Py T4) |
| 5 | Verified Visual Video Grounding (`visual_aid_video`) | R1 | 5 | 5 | ✓ | ✓ | `tests/video-grounding.test.js`, `tests/test_agentic_rag.py` | **PASS** |
| 6 | Warm Paper Design Tokens & Cliché Purge | R2 | 5 | 6 | ✓ | ✓ | `tests/editorial-workspace.test.js` | **PASS** |
| 7 | Split-Pane Study Workspace Layout | R2 | 5 | 6 | ✓ | ✓ | `tests/editorial-workspace.test.js` | **PASS** |
| 8 | Monospace Pipeline Status Indicator (`<PipelineStatus />`) | R2 | 6 | 6 | ✓ | ✓ | `tests/editorial-workspace.test.js` | **PASS** |
| 9 | Distraction-Locked Video Player (`<ConceptVideoPlayer />`) | R2 | 8 | 8 | ✓ | ✓ | `tests/concept-video-player.test.js` | **GATES M3** (`T1-F9-08`, `T2-F9-01`) |
| 10 | Academic Originality & Brand Safety Guardrail | R3 | 6 | 6 | ✓ | ✓ | `tests/originality-guardrail.test.js` | **PASS** |

*Note*: Feature columns in Section 4 summarize JS/feature-mapped T1/T2 counts (`6+5+5+5+5+5+5+6+8+6 = 56` JS T1; `5+6+5+5+5+6+6+6+8+6 = 58` JS T2). The 20 Python tests in `tests/test_agentic_rag.py` (`5 T1 + 8 T2 + 2 T3 + 5 T4`) exercise Features 1–5 end-to-end and are accounted for in Sections 3 and 6 (`61 T1 + 66 T2 + 23 T3 + 24 T4 + 6 Integration = 180`).

---

## 5. Evaluation Benchmark Dataset Metrics

- **Location**: `eval/dataset-class10-queries.json`
- **Total Gold-Standard Benchmark Items**: 26
- **Disciplinary Breakdown**:
  - *Science (STEM)*: 11 items (Chemistry: 4, Physics: 4, Biology: 3)
  - *Mathematics (STEM)*: 3 items
  - *Social Science (Humanities)*: 12 items (History: 3, Civics: 3, Geography: 3, Economics: 3)
- **Intent Mode Distribution**: Exactly 13 `BOARD_EXAM` (50%) and 13 `COMPETITIVE_BRIDGE` (50%).
- **HyDE Generation Policy Compliance**:
  - `hyde_expected: true` (Conceptual Explanations, Cause-Effect Chains): 20 items.
  - `hyde_expected: false` (Direct Exercises, Numerical Calculations, NCERT Activities): 6 items.
- **Academic Originality Scanner Audit**: 0 commercial platform or coaching brand references across all 26 query benchmark entries.

---

## 6. Granular Test Suite Breakdown by File

| File | Total | T1 | T2 | T3 | T4 | Int | Live Result | Primary Focus |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `tests/agentic-rag-router.test.js` | 30 | 11 | 11 | 3 | 4 | 1 | 30/30 pass | Intent classification, OKF filters, conditional HyDE, 26-item accuracy |
| `tests/agentic-rag-grader.test.js` | 14 | 5 | 5 | 2 | 1 | 1 | 14/14 pass | Textbook sufficiency, SQP/Exemplar presence, query rewrite trigger |
| `tests/agentic-rag-synthesizer.test.js` | 16 | 5 | 5 | 2 | 3 | 1 | 16/16 pass | 4 pedagogical layers, passage grounding, marks brackets, bold terms |
| `tests/video-grounding.test.js` | 16 | 5 | 5 | 3 | 2 | 1 | 16/16 pass | Zero-hallucination catalog match, default catalog, null video omission |
| `tests/concept-video-player.test.js` | 22 | 8 | 8 | 3 | 2 | 1 | 20/22 pass | youtube-nocookie embed, origin, 16:9 container, 60px mask, ENDED card |
| `tests/editorial-workspace.test.js` | 44 | 16 | 18 | 5 | 4 | 1 | 44/44 pass | Warm paper tokens, CSS clichés, utilities.css rules, split-pane, pipeline badges |
| `tests/originality-guardrail.test.js` | 18 | 6 | 6 | 3 | 3 | 0 | 18/18 pass | R3 Base64 scanner (incl. `.py/.txt/.yml`), NUL-byte filtering, repo crawl |
| `tests/test_agentic_rag.py` | 20 | 5 | 8 | 2 | 5 | 0 | 19/20 pass | LangGraph StateGraph, Pydantic OKF schema, 5 live E2E journeys |
| **Grand Total (8 E2E Files)** | **180** | **61** | **66** | **23** | **24** | **6** | **177/180 pass** | Complete opaque-box E2E platform coverage |
