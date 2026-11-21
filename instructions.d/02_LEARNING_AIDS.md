# Subsystem: Resilient Learning Aids Engine

## 1. Operational Status

- **Status**: **PRODUCTION READY**
- **Target Git SHA**: `b7a11e2`
- **Affected Files**:
  - `server/lib/learning-aids.js` (lines 4-55, 363-430, 811-824)
  - `web/src/screens/LearningAids.tsx` (lines 24-219, 236-279)
- **Verified Capabilities**:
  - Full catalog of 30 cognitive learning aids spanning 7 pedagogical categories.
  - 100% resilient content generation for both STEM (Mathematics, Science) and non-STEM (Social Science, English) chapters.
  - Zero-crash fallback synthesis for unauthored or misnamed chapters.
  - Graceful domain-specific rule: automatically omits STEM-only `formulasheet` in literature chapters while generating 29 rich verbal/thematic aids.
  - Frontend error boundary card with retry mechanism and safe fallback redirects.

---

## 2. Usage Instructions

### 2.1 The 30 Learning Aids Catalog

The learning aids engine implements 30 specialized cognitive representations structured into 7 distinct learning categories:

| Group Category | Aid ID | Display Title | Pedagogical Purpose |
|---|---|---|---|
| **Summary** | `tldr` | TL;DR Summary | 60-second executive summary of the entire chapter |
| | `keyideas` | Key Ideas | Fundamental core takeaways in bullet format |
| | `bigpicture` | The Big Picture | Broad contextual orientation and real-world relevance |
| | `chapteroverview` | Chapter Overview | High-level roadmap of sub-topics |
| | `whyitmatters` | Why It Matters | Everyday applications and competitive exam importance |
| **Revision** | `cheatsheet` | Quick Revision Cheatsheet | Last-minute exam revision card |
| | `recap` | 5-Minute Recap | Rapid revision of core propositions |
| | `examnotes` | High-Yield Exam Notes | Board-specific scoring tips and marking guidelines |
| **Visual** | `mindmap` | Conceptual Mind Map | Radial conceptual associations |
| | `conceptmap` | Concept Hierarchy Map | Directed dependency graph of prerequisites |
| | `flowchart` | Procedural Flowchart | Step-by-step decision tree for problem-solving |
| | `diagram` | Visual Diagrams & Figures | Labeled geometric or scientific figures |
| | `visualsummary` | Visual Summary Matrix | Comparative tabular and visual synthesis |
| **Math / Science** | `formulasheet` | Formula & Identity Sheet | Key mathematical formulas, constants, and SI units |
| | `solveliketeacher` | Solve Like a Teacher | 4-step pedagogical framework (Given, Formula, Substitute, Result) |
| | `shortcutmethods` | Shortcut Tricks & Speed Hacks | Rapid calculation hacks for competitive exams (NTSE/JEE) |
| | `mistakeguide` | Common Traps & Pitfalls | Analysis of frequent student misconceptions and wrong turns |
| | `problempatterns` | Recurring Problem Archetypes | Classification of standard question archetypes |
| | `workedexamples` | Step-by-Step Worked Examples | Detailed canonical solutions with annotations |
| **Step-by-Step** | `causeeffect` | Cause & Effect Chains | Causal progression in scientific and historical phenomena |
| | `processbreakdown` | Process Breakdown | Granular breakdown of complex mechanisms |
| | `mechanism` | Mechanism Deep-Dive | Exact scientific reactions or logical proofs |
| **Pedagogical** | `scientificstory` | Historical Narrative & Discovery | Anecdotal narrative of how the theorem/concept was discovered |
| | `breakitdown` | ELI5 (Explain Like I'm 5) | Simplified, intuitive analogy for beginners |
| | `learnfromscratch` | First-Principles Derivation | Step-zero conceptual derivation without jargon |
| | `tutormode` | Socratic Tutor Dialogue | Guided Q&A dialogue unpacking hard concepts |
| | `storymethodwithmemoryhooks` | Mnemonic & Memory Hooks | Acronyms and vivid mnemonics for memorization |
| **Connections** | `conceptconnections` | Cross-Disciplinary Connections | Links between chapter topics and higher secondary syllabi |
| | `learningpath` | Sequential Mastery Path | Recommended step-by-step study order |
| | `quizme` | Quick Self-Check MCQs | Micro-quiz testing diagnostic comprehension |

---

### 2.2 API Endpoint & Query Structure

The server exposes learning aids via standard REST endpoints on port 8787:

#### Catalog Query
```bash
GET /api/learning-aids/ids
```
**Response**: Returns list of all 30 aid IDs, labels, and groups.

#### Chapter Aids Query
```bash
GET /api/learning-aids/:subjectId/:chapterId
```
**Example**:
```bash
GET /api/learning-aids/mathematics/real-numbers
```
**Response Contract**:
```json
{
  "ok": true,
  "subjectId": "mathematics",
  "chapterId": "real-numbers",
  "chapterTitle": "Real Numbers",
  "aids": [
    {
      "id": "tldr",
      "title": "TL;DR Summary",
      "category": "summary",
      "hasContent": true,
      "content": "..."
    }
  ],
  "summary": {
    "totalAids": 30,
    "availableAids": 30
  }
}
```

---

### 2.3 UI Accordion & Category Filter Interaction

The frontend screen (`web/src/screens/LearningAids.tsx`) allows interactive exploration of all 30 aids:

1. **Category Filter Tabs**: Category pills (Summary, Revision, Visual, Math/Science, Step-by-Step, Pedagogical, Connections) allow rapid slicing of aids.
2. **Polymorphic Renderer (`renderAidData`)**: Gracefully renders heterogeneous content formats:
   - Nested lists and structured arrays.
   - 4-step solved teacher framework (`step_1_given`, `step_2_formula`, `step_3_substitute`, `step_4_result`).
   - Science experiment steps and observations.
   - Diagnostic multiple-choice questions with answer reveals.
3. **Copy & Share Actions**: Each aid card provides one-click markdown clipboard export.

---

## 3. Known Boundaries & Error Handling

### 3.1 Non-STEM vs. STEM Chapter Handling

Prior versions assumed all chapters had formulas and mathematical steps. In commit `b7a11e2`, `server/lib/learning-aids.js` was refactored:

1. **Non-STEM Chapters (Social Science)**:
   - For chapters like `resources-and-development` or `rise-of-nationalism-in-europe`, the engine generates timeline dates, cause-effect revolutions, and conceptual notes.
   - Endpoint test `/api/learning-aids/social-science/resources-and-development` verified: **30 aids total, 30 with content**.
2. **Literature Chapters (English)**:
   - Literature chapters (e.g. `a-letter-to-god`) do not possess mathematical formulas.
   - The engine gracefully sets `formulasheet.hasContent = false` while fully generating all other 29 aids.
   - Endpoint test `/api/learning-aids/english/a-letter-to-god` verified: **30 aids total, 29 with content** (intentional domain behavior).

### 3.2 Fallback Synthesis for Missing Syllabus Assets

When an unknown or unauthored chapter is requested:
1. `buildLearningAids(subjectId, chapterId)` checks `getChapter(subjectId, chapterId)`.
2. If missing, it performs substring matching across available chapters in the subject.
3. If still unmatched, it synthesizes a structured fallback chapter model containing clean chapter titles, default pedagogical concepts, 4-step solved teacher exercises, and diagnostic MCQs.
4. **Result**: The endpoint never crashes with an unhandled exception or 500 error.

### 3.3 Frontend Error Handling and Retry Mechanism

If the network connection fails or the backend is unreachable:
1. `LearningAids.tsx` captures the error in `.catch()`, sets `setFetchError(true)`, and terminates the loading skeleton.
2. Displays an `AlertTriangle` warning card:
   - Title: *"Learning Aids Temporarily Unavailable"*.
   - Explanatory message indicating connection issues.
   - Primary action: **"Retry Loading"** button invoking `loadData()`.
   - Secondary action: **"Explore Real Numbers"** link safely returning the student to a verified canonical chapter.

---

## 4. Validation Results & Verification Reference

- **STEM Verification**: `/api/learning-aids/mathematics/real-numbers` -> 30/30 aids populated (HTTP 200).
- **Non-STEM Verification**: `/api/learning-aids/social-science/resources-and-development` -> 30/30 aids populated (HTTP 200).
- **Literature Verification**: `/api/learning-aids/english/a-letter-to-god` -> 29/30 aids populated (HTTP 200).
- **TypeScript & Build**: Clean compilation without any missing property errors in polymorphic aid renderers.
- **Validation Checklist Reference**:
  - See items **LA-01 through LA-07** in [ClassX Validation Checklist — Section 3.2](../VALIDATION_CHECKLIST.md#32-resilient-learning-aids-engine).
