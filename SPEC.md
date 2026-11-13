# ClassX Platform — Acceptance Specification

This file is the source of truth for automated checks. Every E2E assertion and data gate maps to a spec ID below. Update the spec before changing behaviour; never weaken a check to make a failure disappear.

## Product boundary

- Audience: CBSE Class X students (2026-27), Indian boards, English medium.
- Promise: syllabus-mapped study, authored lessons where marked, grounded practice, board-style mock papers, honest coverage labels, citations for tutor answers.
- Non-negotiable: no invented lesson notes, no fake question answers, no claim that a syllabus map is a full lesson.
- AI tutor with no provider key returns a grounded extractive fallback. It must say so and must not pretend to be a free-form model.

## SPEC-01 Launch and health

- `npm start` serves the built SPA and API on `http://localhost:8787`.
- `GET /api/health` returns `ok: true`, 4 subjects, 67 chapters, and non-zero questions and RAG chunks.
- SPA deep links (`/courses/mathematics/real-numbers`) return the app shell, not a 404.
- One-click launcher opens the app in the default browser; `-AllBrowsers` opens Chrome, Edge, and Firefox when installed.

## SPEC-02 Curriculum completeness

- Exactly 4 subjects and 67 chapters.
- Every chapter belongs to an existing unit and has a non-empty name, summary, order, and stats.
- Chapter ids are unique within a subject; no orphan question or plan references.
- Every one of the 76 official topics is attached to exactly one chapter; no orphan or duplicate topic.
- Every subject exposes coverage counts: total, authored, syllabus-only, partial.

## SPEC-03 Honest content depth

- A chapter is labelled Full lesson only when it has authored concepts, at least one worked example or exercise, a practice bank, and revision material.
- Science, Social Science, and English chapters without authored packs are labelled Syllabus map or Starter notes.
- The UI must not describe a syllabus map as a full lesson.
- Coverage gaps are reported in `COVERAGE.md`, never hidden.

## SPEC-04 Mathematics depth gate

- All 15 Mathematics chapters are authored.
- Each Mathematics lesson contains: concepts, at least one theorem or worked example, exercises, MCQs with valid answer indexes, common misconceptions, and a concept map or visualization.
- Model answers agree with their solution steps.

## SPEC-05 Chapter reader

- Opening a chapter shows title, unit, marks, coverage badge, and Learn content.
- The tabs Learn, Theorems, Examples, Practice, Revision, and Visuals render without console errors.
- Math chapters expose at least one theorem, worked example, practice set, revision block, and visual/concept map where the lesson provides them.
- Syllabus-only chapters show the official summary/unit topics and a clear "not authored yet" notice.
- Authored chapters expose their official topic breakdown in the chapter rail.
- No chapter tab may render a raw object (`[object Object]`); object-shaped topics must be unwrapped to names.

## SPEC-06 Practice

- A student can choose subject, chapter, difficulty, and length, then start a set.
- Every practice question has 2-4 options and a valid correct index.
- Selecting an option marks it; submitting produces score, accuracy, review, explanations, and updates progress.
- Unanswered submissions require confirmation.
- No negative marking.

## SPEC-07 Mock exams

- A student can generate a blueprint (quick/standard/full) for selected authored chapters.
- Generation returns sections, instructions, duration, and marks.
- The written answer key is hidden until "Reveal & self-mark".
- After reveal, each written question shows model steps/answer and a bounded self-mark input.
- Submit combines auto-scored MCQs with self-marks and returns a review.
- A paper cannot be submitted with an invalid/expired id.

## SPEC-08 Tutor grounding

- Every answer includes the retrieval provider mode and citations.
- With no AI key, answers are labelled `grounded-fallback` and contain only retrieved curriculum material.
- Questions outside the retrieved syllabus return an explicit boundary message, not fabricated facts.
- A result must share at least one lexical query token; hashed-vector collisions alone never count as evidence.
- The fallback never presents the student's question as the answer; it gives a grounded skeleton and discloses the limit.
- Citation links open the correct subject/chapter/anchor.
- Out-of-syllabus claims in the UI are prohibited.

## SPEC-09 Planner

- The plan shows 15 Mathematics weeks with phase, target, resource, and time.
- The page title reflects the actual number of weeks.
- Marking a week persists locally and through the progress API.
- Chapter and practice links from a week open the correct destination.

## SPEC-10 Progress and library

- Progress shows XP, streak (grammatically correct for 1 day), accuracy, completed chapters, mock history, and recent activity.
- Library exposes formula sheet, shortcuts, and flashcards with subject filters and search.
- Empty states are actionable and do not crash.

## SPEC-11 Search and command palette

- `Ctrl+K` opens the palette; Escape closes it.
- Queries under 2 characters show quick navigation; longer queries show grounded results.
- Selecting a result opens the matching chapter and tab/anchor.
- Header search, mobile search, and palette are the only search entry points.

## SPEC-12 Responsive and accessible shell

- 1440x1000 and 390x844 viewports have zero horizontal overflow on all routes.
- Mobile drawer opens, navigates, and closes via scrim, close button, and route change.
- Primary controls have accessible names; inputs are labelled; images have alt text or are decorative.
- No duplicate visible controls (e.g. two search icons on desktop).
- Console errors, page errors, and failed same-origin responses are zero.

## SPEC-13 Cross-browser

- The smoke matrix passes in installed Chrome, Edge, and Playwright Firefox:
  home, courses, chapter tabs, practice start, tutor answer, mobile overflow.
- Browser-specific failures are blocking; "works in Chrome" is not enough.

## SPEC-14 Data integrity

- `npm run check` passes.
- All tests pass.
- Every MCQ answer index is in range.
- Every subjective question has steps and a final answer.
- Every source PDF exists and metadata matches disk.
- Every planner week points at an existing chapter; the plan has 15 Mathematics weeks.
- `COVERAGE.md` is regenerated from data, never hand-written.

## SPEC-15 Regression gate

Run before declaring work done:

```powershell
npm run typecheck
npm run check
npm run coverage
npm test
npm run build
npm run e2e
```

`npm run verify` runs all of the above except the standalone build, because `e2e` builds first.

## SPEC-16 Video lessons (BYJU'S clone)

- Authored chapter shows a video tile (embed or placeholder) with resume position
- Resume position persisted per student/chapter; bookmark timestamp + note supported
- Chapter gating: chapter N+1 unlocks when chapter N mastery >= threshold (default 80%)
- Video source: YouTube embed initially; no self-hosted MP4 without bandwidth review

## SPEC-17 Adaptive practice (BYJU'S clone)

- Practice starts at `simple`; correct streak → `medium`, incorrect → `simple`
- Question pool drawn from chapter MCQs/subjective; valid answer indexes
- Session summary: accuracy, time, weak topics; updates progress

## SPEC-18 Gamification (BYJU'S clone)

- XP for lesson complete, practice, mock, streak day
- Badges: first lesson, 7-day streak, perfect mock, 50 questions
- Leaderboard: top XP this week (class scope, opt-in)

## SPEC-19 Parent dashboard (BYJU'S clone)

- Read-only: child's XP, streak, completed chapters, mock history
- Weekly digest email placeholder (no SMTP yet)

## SPEC-20 Doubt tutor bubble (BYJU'S clone)

- Ask question → grounded-fallback with chapter citations
- Disclose fallback mode; no fabricated answers
- Citation links open correct subject/chapter/anchor

## SPEC-21 Offline / PWA (BYJU'S clone)

- Service worker caches chapter assets, questions, plan
- IndexedDB stores progress; sync on reconnect
- PWA install prompt

## SPEC-22 Explain Like I'm 5 (ELI5) — all subjects

- Tutor supports `eli5` mode alongside `socratic`, `board`, `competitive`
- ELI5 answers use tiny words, short sentences, real-life examples a 5-year-old knows (toys, food, games, family)
- Works across Maths, Science, and Social Science: fractions like sharing chocolate, photosynthesis like a plant kitchen, democracy like choosing a class monitor
- No jargon without an immediate simple explanation
- Ends with one check-for-understanding question in child-friendly language
- Grounded in curriculum citations; no fabricated facts

## SPEC-22 Explain Like I'm 5 (ELI5) — all subjects

- Tutor supports `eli5` mode alongside `socratic`, `board`, `competitive`
- ELI5 answers use tiny words, short sentences, real-life examples a 5-year-old knows (toys, food, games, family)
- Works across Maths, Science, and Social Science: fractions like sharing chocolate, photosynthesis like a plant kitchen, democracy like choosing a class monitor
- No jargon without an immediate simple explanation
- Ends with one check-for-understanding question in child-friendly language
- Grounded in curriculum citations; no fabricated facts

## SPEC-23 Learning Aids — 30 understanding features per chapter

- Every authored chapter exposes 30 learning aids: TLDR, KeyIdeas, BigPicture, ChapterOverview, WhyItMatters, CheatSheet, Recap, ExamNotes, MindMap, ConceptMap, FlowChart, Diagram, VisualSummary, FormulaSheet, SolveLikeATeacher, ShortcutMethods, MistakeGuide, ProblemPatterns, WorkedExamples, CauseEffect, ProcessBreakdown, Mechanism, ScientificStory, BreakItDown, LearnFromScratch, TutorMode, StoryMethodwithMemoryHooks, ConceptConnections, LearningPath, QuizMe
- Each aid is optional; chapters show only aids that have authored content
- Aids render in a unified Learning Aids viewer accessible from the chapter reader
- QuizMe generates practice questions from the chapter's question bank
- MindMap/ConceptMap/FlowChart/Diagram render as SVG visuals
- FormulaSheet extracts theorems, shortcuts, and key formulas
- ExamNotes and CheatSheet are concise revision summaries
- SolveLikeATeacher walks through a worked example step by step
- ShortcutMethods lists speed tricks and competitive shortcuts
- MistakeGuide lists common misconceptions and corrections
- TutorMode opens the grounded AI tutor for the chapter
- LearningPath shows the chapter's position in the subject curriculum

## SPEC-24 Deployment and port configuration

- API binds to `PORT` env var, default `8787` (`server/index.js:21`). Port `10000` is never a network port — it appears only as UID/GID in Agensh compose. Do not configure the app to listen on `10000`.
- Dockerfile runner stage sets `ENV PORT=8787` so HEALTHCHECK `http://localhost:$PORT/api/health` resolves without external injection.
- `render.yaml` declares `PORT=8787`, `NODE_OPTIONS=--max-old-space-size=256` (mandatory on Render free tier to prevent build OOM), `NODE_ENV=production`, `CORS_ORIGIN=true`, `OPENAI_BASE_URL`, `TUTOR_MODEL`, `RAG_EMBEDDING_PROVIDER=local`, `RAG_RERANK_PROVIDER=none`.
- `OPENROUTER_API_KEY` is `sync: false` in `render.yaml` — must be set in the Render dashboard Environment tab. Without it, tutor serves `grounded-fallback` (not a regression).
- `.env` must never contain real API keys; it is gitignored. Rotate any exposed key immediately.
- Git repo must have at least one commit on the deploy branch before Render can create the service.

## SPEC-25 Session and authentication

- Users can register with `userId` (3-32 chars) and password (6+ chars); passwords stored bcryptjs-hashed in Redis.
- Users can log in; session cookie `classx_sid` is httpOnly, same-site lax, 3-hour max age.
- `GET /api/auth/me` returns authenticated userId or null.
- `POST /api/auth/logout` destroys session and clears cookie.
- Protected routes require authentication: practice start/submit, exam generate/key/submit, progress read/write, gamify/xp, video progress.
- Sessions stored in Redis with TTL (3 hours for practice/exam, persistent for user accounts). Survive server restarts.
- Without Redis, falls back to in-memory Map (single instance only; sessions lost on restart).
- Progress data (XP, streak, badges, completed chapters) stored in Redis keyed by `classx:progress:<userId>`.
- Without Redis, falls back to file-based `server/data/progress.json`.
- Rate limiting on auth endpoints via Nginx `limit_req_zone`.

## Known accepted decisions

- The ~622 kB JS chunk is accepted. Gzip is ~182 kB, the app is local-first, and code splitting is not needed. Do not revisit unless the chunk grows past 750 kB or load time regresses.
- Sessions (practice/exam) are in memory. Restarting the API invalidates them by design.
- Full free-form tutoring requires an API key or a local compatible provider. Without one, the grounded fallback is the contract.
- Content coverage is complete for Mathematics (15 chapters) and Social Science (22 chapters). English (15 chapters) remains syllabus maps awaiting authoring. This is an authored-content gap, not a UI defect; the UI must stay honest.
