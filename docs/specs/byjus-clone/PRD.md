# PRD — BYJU'S Clone Feature Set for ClassX Platform

Source of truth: classx-platform/SPEC.md + docs/specs/byjus-clone/concepts-brief.md

## Executive summary
Add BYJU's top-edtech engagement layer to ClassX: video lessons, adaptive practice, gamification, parent dashboard, doubt tutor, offline access. Keep ClassX honesty contract: syllabus-mapped, no invented content, grounded tutor fallback, SPEC-03 depth labels preserved.

## Users
- Student (CBSE Class X): learns, practices, tests, tracks progress
- Parent: read-only child progress, weekly report
- (future) Tutor: doubt answers

## Scope (in)
1. Video-lesson tile on authored chapters (embed + resume + bookmarks)
2. Adaptive practice: simple|medium|complex, accuracy-driven difficulty
3. Gamification: XP, streak, badges, leaderboard (class/school scope TBD)
4. Parent dashboard: read-only progress, weekly digest
5. Doubt tutor bubble: grounded-fallback with citations
6. Offline cache: service worker + IndexedDB for chapter assets & questions
7. Chapter gating: unlock next chapter on current mastery threshold

## Scope (out)
- Live classes (no concurrency infra)
- Paid funnel / checkout (no payment provider)
- Native mobile apps (web PWA only)
- Self-hosted video (YouTube embed initially)

## Requirements

### R1 Video lessons
- Each authored chapter gets a video tile (YouTube embed or placeholder)
- Resume position persisted per student/chapter
- Bookmark timestamp + note
- Gating: chapter N+1 unlocks when chapter N mastery >= threshold

### R2 Adaptive practice
- Start at `simple`; correct streak → `medium`, incorrect → `simple`
- Question pool drawn from chapter MCQs/subjective
- Session summary: accuracy, time, weak topics

### R3 Gamification
- XP for lesson complete, practice, mock, streak day
- Badges: first lesson, 7-day streak, perfect mock, 50 questions
- Leaderboard: top XP this week (class scope, opt-in)

### R4 Parent dashboard
- Read-only: child's XP, streak, completed chapters, mock history
- Weekly digest email (placeholder; no SMTP yet)

### R5 Doubt tutor bubble
- Ask question → grounded-fallback with chapter citations
- Disclose fallback mode; no fabricated answers
- Links open correct subject/chapter/anchor

### R6 Offline
- Service worker caches chapter assets, questions, plan
- IndexedDB stores progress; sync on reconnect
- PWA install prompt

## Metrics
- Lesson completion rate
- Practice accuracy by difficulty
- 7-day retention (DAU/WAU)
- Offline session count

## Risks
- Video bandwidth/cost → start with embeds
- Adaptive algorithm tuning → A/B simple moving accuracy first
- Offline sync conflicts → last-write-wins + merge log

## Open questions (deferred)
- Video hosting provider
- Parent auth model
- Leaderboard scope (class vs school)

## Next
Handoff to /eg-new-feature for implementation per feature. Update SPEC.md with new acceptance IDs (SPEC-16..SPEC-21).
