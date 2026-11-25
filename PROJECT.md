# Project: ClassX Academic Agentic Platform (CBSE Class 10 & Competitive Bridge)

## Architecture
- **Backend RAG Pipeline (`backend/rag/` & `server/`)**:
  - Python 3.12 LangGraph Agent (`StateGraph`) implementing academic RAG under OKF v0.2 metadata.
  - Nodes: `query_analyzer`, `retrieval_grader`, `pedagogical_generator`, `video_grounder`.
  - Express.js API server (`server/index.js`) interfacing with the RAG pipeline via `/api/tutor` and `/api/rag/analyze`.
  - Deterministic offline fallbacks for zero-API-key execution resilience.
- **Frontend Editorial Study Workspace (`web/src/`)**:
  - React 18 + Vite 6 tactile study workspace inspired by physical workbooks.
  - Warm paper color tokens (`#FAF9F6`, `#F3F1EC`, `#18181B`, `#E4E2DD`, `#1B4332` / `#D95D39`, semantic highlighters `#FEF08A`, `#DCFCE7`, `#FEE2E2`).
  - Zero AI visual clichés (no purple/indigo gradients, neon dark-mode glows, glassmorphism, floating blobs, or decorative sparkles).
  - Split-pane study layout: sticky syllabus nav | NCERT reference context | 4-layer pedagogical answer tabs.
  - Monospace transparent pipeline status indicators (`<PipelineStatus />`).
  - Distraction-locked `<ConceptVideoPlayer />` (YouTube nocookie, 60px header mask, ENDED state study card, observation cue caption).
- **Academic Originality Guardrails (R3)**:
  - Zero mentions of commercial edtech platforms, coaching institutes, or third-party creator names.
  - Automated scanner regression test (`tests/originality-guardrail.test.js`).
- **Dual-Track E2E Testing**:
  - Opaque-box 4-tier requirement-driven test suite (`tests/` & `eval/`) publishing `TEST_READY.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Query Analyzer & Router (`query_analyzer`) | Classifies queries into `BOARD_EXAM` or `COMPETITIVE_BRIDGE`, outputs strict JSON (`intent_mode`, `okf_filters`, `bm25_keywords`, conditional `hyde_passage`). | M2 | R1 |
| 2 | Conditional HyDE Generation | Generates 3-sentence NCERT passage for conceptual queries; outputs empty string `""` for direct exercise lookups, activities, or numerical calculations. | M2 | R1 |
| 3 | Retrieval Grader & Source Balancer (`retrieval_grader`) | Audits chunks for `NCERT_TEXTBOOK` factual sufficiency; verifies `CBSE_SQP` for board intent and `NCERT_EXEMPLAR` for competitive intent; emits `PASS` or triggers `REWRITE_QUERY`. | M2 | R1 |
| 4 | 4-Layer Pedagogical Synthesizer (`pedagogical_generator`) | Synthesizes grounded answer: 1. Core Intuition (everyday analogies), 2. CBSE Board Answer (marking scheme, bold keywords, mark distribution, SI units), 3. Competitive Exam Bridge (JEE/NEET/UPSC/DSC), 4. Examiner's Trap. | M2 | R1 |
| 5 | Verified Visual Video Grounding | Attaches verified `visual_aid_video` metadata matching OKF v0.2 topic tags; cleanly omits video blocks when unverified (zero-hallucination). | M2 | R1 |
| 6 | Warm Paper Design Tokens & Purge of AI Clichés | Introduces paper color tokens (`#FAF9F6`, `#F3F1EC`, `#18181B`, `#E4E2DD`, `#1B4332`/`#D95D39`, `#FEF08A`, `#DCFCE7`, `#FEE2E2`); purges neon dark glows, purple gradients, glassmorphism, sparkles. | M3 | R2 |
| 7 | Split-Pane Study Workspace Layout | Replaces chat bubbles with sticky syllabus nav on the left, split-pane displaying NCERT reference context alongside 4-layer answer tabs. | M3 | R2 |
| 8 | Monospace Pipeline Status Indicator | Transparent monospace status indicator displaying step-by-step pipeline execution transitions. | M3 | R2 |
| 9 | Distraction-Locked Video Player (`<ConceptVideoPlayer />`) | Embeds via `youtube-nocookie.com` with required parameters, 60px header mask, custom study card on ENDED (0), observation cue caption. | M3 | R2 |
| 10 | Academic Originality Sanitization & Scanner | Cleanses all commercial brand names across specs, docs, prompts, datasets; adds deterministic regression gate `tests/originality-guardrail.test.js`. | M1 | R3 |
| 11 | Evaluation Datasets for Class 10 Queries | Synthesized benchmark queries for `BOARD_EXAM` and `COMPETITIVE_BRIDGE` across STEM & Humanities in `eval/dataset-class10-queries.json`. | E2E | R1/AC |
| 12 | Opaque-Box 4-Tier Test Suite | Automated test runner verifying routing, grading, formatting, video grounding, and UI compliance published via `TEST_READY.md`. | E2E | AC |
| 13 | Final Integration & Adversarial Hardening | Pass 100% of E2E tests across Tiers 1-4, followed by Tier 5 adversarial stress testing. | M4 | Final |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Academic Originality & Brand Safety Guardrail | Sanitize commercial brand references from codebase/docs/prompts/catalog; implement `tests/originality-guardrail.test.js`. | none | DONE |
| M2 | Backend Agentic RAG Pipeline (LangGraph & OKF v0.2) | Implement `backend/rag/` nodes (`analyzer`, `grader`, `synthesizer`, `video`, `graph`), Pydantic models, verified video catalog, Express integration. | M1 | IN_PROGRESS (Conv: 23695dee-0f77-40eb-b6f4-873e20acd298) |
| M3 | Frontend Editorial Study Workspace (React/Vite) | Warm paper CSS tokens, split-pane study workspace, layered answer tabs, monospace `<PipelineStatus />`, `<ConceptVideoPlayer />`. | M1 | IN_PROGRESS (Conv: c4a20cea-32bf-4d18-aded-26e104f9a933) |
| E2E | E2E Testing Track | Independent opaque-box test infra, eval dataset, Tiers 1-4 test suites, publishes `TEST_READY.md`. | none | IN_PROGRESS (Conv: 0ccdc8ca-e477-4011-a3d7-c50638192856) |
| M4 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Phase 1: Pass 100% of E2E tests (Tiers 1-4). Phase 2: Tier 5 adversarial coverage hardening with Challenger. | M2, M3, E2E | PLANNED |

## Interface Contracts

### Backend RAG API (`/api/tutor` & `/api/rag/analyze`)
- **Request**:
  ```json
  {
    "question": "string",
    "subjectId": "string (optional)",
    "chapterId": "string (optional)",
    "intentMode": "BOARD_EXAM" | "COMPETITIVE_BRIDGE" (optional)
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "intentMode": "BOARD_EXAM" | "COMPETITIVE_BRIDGE",
    "analysis": {
      "intent_mode": "string",
      "okf_filters": {
        "subject": "string",
        "chapter_id": "string",
        "topic_tag": "string",
        "content_block_type": "string",
        "source_type": "string"
      },
      "bm25_keywords": ["string"],
      "hyde_passage": "string"
    },
    "graderVerdict": "PASS" | "REWRITE_QUERY",
    "answerLayers": {
      "coreIntuition": "string (everyday analogy)",
      "boardAnswer": "string (bold keywords, mark distribution [X Mark], SI units)",
      "competitiveBridge": "string (JEE/NEET/UPSC/DSC link)",
      "examinersTrap": "string (frequent pitfall)"
    },
    "visualAidVideo": {
      "video_id": "string",
      "start_sec": 0,
      "end_sec": 60,
      "concept_title": "string",
      "observation_cue": "string"
    } | null,
    "pipelineStages": [
      { "node": "query_analyzer", "status": "completed", "output": "..." },
      { "node": "retrieval_grader", "status": "completed", "output": "PASS" },
      { "node": "pedagogical_generator", "status": "completed", "output": "..." }
    ]
  }
  ```

### Frontend Component Contracts
- `<ConceptVideoPlayer video={VisualAidVideo} />`:
  - Embed URL: `https://www.youtube-nocookie.com/embed/${video.video_id}?rel=0&modestbranding=1&iv_load_policy=3&controls=1&start=${video.start_sec}&end=${video.end_sec}&enablejsapi=1`
  - 60px Top Header Mask: displays `{video.concept_title}` and `{video.start_sec}s–{video.end_sec}s`.
  - State `0` (ENDED): mounts study card with "Replay Concept Clip" and "Test Yourself (2 Board Questions)".
  - Caption: displays `{video.observation_cue}` below player frame.
- `<PipelineStatus stages={PipelineStage[]} />`:
  - Monospace font (`font-mono`), warm paper border (`#E4E2DD`), step-by-step badge transitions.

## Code Layout
- `backend/rag/` (or `classx-platform/backend/rag/`):
  - `schema.py`: Pydantic models for QueryAnalysis, OKFFilters, VisualAidVideo, AgentState.
  - `analyzer.py`: Query analyzer node with conditional HyDE generation.
  - `grader.py`: Retrieval grader and source balancer node.
  - `synthesizer.py`: 4-layer pedagogical synthesizer.
  - `video.py`: Zero-hallucination verified visual video grounder.
  - `graph.py`: LangGraph StateGraph pipeline.
  - `visual_aid_videos.json`: Pre-indexed verified video metadata by OKF topic tags.
- `server/`:
  - `index.js`: Express server routing `/api/tutor` to the agentic pipeline.
  - `lib/rag.js` & `lib/agentic-rag.js`: Node.js interface to agentic pipeline.
- `web/src/`:
  - `styles.css`: Warm paper color tokens and typography.
  - `components/ConceptVideoPlayer.tsx`: Distraction-locked video player.
  - `components/PipelineStatus.tsx`: Monospace transparent status indicator.
  - `components/StudyWorkspace.tsx`: Split-pane study layout with 4-layer tabs.
  - `types.ts`: TypeScript interfaces for LayeredAnswer, VisualAidVideo, PipelineStage.
  - `services/mockApi.ts`: Mock response matching the 4-layer contract.
- `eval/`:
  - `dataset-class10-queries.json`: Synthesized Class 10 query benchmark dataset.
- `tests/`:
  - `originality-guardrail.test.js`: Regression scanner for brand safety.
  - `agentic-rag-router.test.js`: Router & conditional HyDE tests.
  - `agentic-rag-grader.test.js`: Retrieval grader tests.
  - `agentic-rag-synthesizer.test.js`: 4-layer answer tests.
  - `video-grounding.test.js`: Video grounding tests.
  - `concept-video-player.test.js`: `<ConceptVideoPlayer />` tests.
  - `editorial-workspace.test.js`: Editorial design tokens & layout tests.
  - `test_agentic_rag.py`: Python pytest suite for LangGraph pipeline.
