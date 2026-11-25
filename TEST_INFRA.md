# E2E Test Infra: ClassX Academic Agentic Platform (CBSE Class 10 & Competitive Bridge)

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Derived directly from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory`.
- **Zero Internal Coupling**: Verification tests observable behavior, JSON schema outputs, API contracts, design token compliance, and distraction guards.
- **Methodology**: Systematic 4-tier design combining Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Real-World Workload Testing.
- **Progressive Testability**: Verification does not require external network calls or commercial APIs. Deterministic local oracles and mock fallbacks are used.

## Feature Inventory & Test Mapping
| # | Feature | Requirement Source | Tier 1 (Feature Coverage) | Tier 2 (Boundary & Corner) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|--------------------|:-------------------------:|:--------------------------:|:-----------------:|:-------------------:|
| 1 | Query Analyzer & Router (`query_analyzer`) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 2 | Conditional HyDE Generation | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 3 | Retrieval Grader & Source Balancer (`retrieval_grader`) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 4 | 4-Layer Pedagogical Synthesizer (`pedagogical_generator`) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 5 | Verified Visual Video Grounding (`visual_aid_video`) | ORIGINAL_REQUEST §R1 | ≥5 | ≥5 | ✓ | ✓ |
| 6 | Warm Paper Design Tokens & Cliché Purge | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ | ✓ |
| 7 | Split-Pane Study Workspace Layout | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ | ✓ |
| 8 | Monospace Pipeline Status Indicator (`<PipelineStatus />`) | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ | ✓ |
| 9 | Distraction-Locked Video Player (`<ConceptVideoPlayer />`) | ORIGINAL_REQUEST §R2 | ≥5 | ≥5 | ✓ | ✓ |
| 10 | Academic Originality Sanitization & Brand Scanner | ORIGINAL_REQUEST §R3 | ≥5 | ≥5 | ✓ | ✓ |

## Test Architecture
- **JavaScript/TypeScript Test Runner**: Native Node.js test runner (`node:test` with `node:assert/strict`) for rapid, dependency-free execution under Node 26 ESM.
  - Full Academic Suite: `node --test tests/originality-guardrail.test.js tests/agentic-rag-router.test.js tests/agentic-rag-grader.test.js tests/agentic-rag-synthesizer.test.js tests/video-grounding.test.js tests/concept-video-player.test.js tests/editorial-workspace.test.js`
- **Python LangGraph Test Runner**: Pytest (`pytest 9.1.1` under Python 3.12).
  - Invocation: `python -m pytest tests/test_agentic_rag.py -v`
- **Evaluation Dataset**:
  - Location: `eval/dataset-class10-queries.json`
  - Format: JSON array of benchmark queries across STEM and Humanities for both `BOARD_EXAM` and `COMPETITIVE_BRIDGE` intents.
- **Directory Layout**:
  ```
  classx-platform/
  ├── eval/
  │   └── dataset-class10-queries.json       # Synthesized benchmark queries (STEM & Humanities)
  ├── tests/
  │   ├── originality-guardrail.test.js      # Feature 10 (R3 Originality scanner)
  │   ├── agentic-rag-router.test.js         # Features 1 & 2 (Routing & conditional HyDE)
  │   ├── agentic-rag-grader.test.js         # Feature 3 (Retrieval grader & source balancer)
  │   ├── agentic-rag-synthesizer.test.js    # Feature 4 (4-layer pedagogical synthesizer)
  │   ├── video-grounding.test.js            # Feature 5 (Verified video grounding)
  │   ├── concept-video-player.test.js       # Feature 9 (Distraction-locked video player)
  │   ├── editorial-workspace.test.js        # Features 6, 7 & 8 (Warm paper, split-pane, pipeline status)
  │   └── test_agentic_rag.py                # Python LangGraph StateGraph E2E test suite
  ├── TEST_INFRA.md                          # Test infrastructure specification
  └── TEST_READY.md                          # Completion signal and test report
  ```

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity | Description |
|---|----------|--------------------|------------|-------------|
| 1 | CBSE Board High-Scorer Preparation Flow | F1, F2, F3, F4, F7, F8 | High | Student asks Class 10 Science question; verified pipeline transitions; Board answer formatted with bold keywords, marking scheme brackets, and SI units. |
| 2 | CBSE-to-JEE Foundation Bridge Flow | F1, F2, F3, F4, F7, F8 | High | Student asks conceptual electricity question; routes to COMPETITIVE_BRIDGE; exemplar chunks verified; JEE graphical extension produced. |
| 3 | Distraction-Locked Interactive Video Flow | F5, F8, F9 | Medium | Query matches OKF topic; verified video attached; player mounts with 60px header mask; on ENDED (0) mounts study card with 2 action buttons. |
| 4 | Zero-Hallucination Video Omission Flow | F5, F7, F9 | Low | Query on non-indexed topic; verified video is null; UI cleanly omits player without errors or placeholders. |
| 5 | Numerical / Activity Calculation Query Flow | F1, F2, F3, F4 | Medium | Student inputs numerical question; HyDE passage is strictly empty string `""`; textbook formulas and step-by-step calculation returned. |
| 6 | Social Science UPSC/DSC Analytical Flow | F1, F2, F3, F4, F7 | High | Student asks Class 10 Civics question; routes to Humanities COMPETITIVE_BRIDGE; connects to constitutional articles and governance cause-effect chains. |
| 7 | Query Rewrite Filter Relaxation Recovery Flow | F1, F3, F8 | High | Initial retrieval missing core textbook chunks; grader emits REWRITE_QUERY; pipeline relaxes filters and reruns until PASS. |
| 8 | Whole-Platform Academic Originality Audit | F10 | Medium | Automated scanner iterates all files; confirms zero commercial edtech or coaching brand references. |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 tests per feature × 10 features = ≥50 tests.
- **Tier 2 (Boundary & Corner Cases)**: ≥5 tests per feature × 10 features = ≥50 tests.
- **Tier 3 (Cross-Feature Combinations)**: ≥15 pairwise interaction tests.
- **Tier 4 (Real-World Application Scenarios)**: ≥8 multi-step application scenarios.
- **Total Minimum Expected Automated Tests**: ≥123 test cases across the suite.
