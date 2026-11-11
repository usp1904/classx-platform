# Concepts Brief — BYJU'S-style clone on ClassX Platform

Source of truth: classx-platform/SPEC.md (CBSE Class X, 4 subjects, 67 chapters, 15 Math + 4 Science full, tutor fallback).

## Problem
ClassX is a study platform (lessons, practice, mocks, planner, progress, grounded tutor). It lacks the top-edtech engagement layer: video lessons, live classes, gamification, adaptive paths, parent dashboard, doubt solving, offline access. Goal: clone BYJU'S core value props while staying within ClassX honesty contract (no invented content, syllabus-mapped, grounded tutor).

## Divergent lens ideas

Technical:
- Video player with progress resume, chapter-locked gating, KaTeX captions
- Adaptive practice: difficulty rises/falls on accuracy (simple|medium|complex)
- Offline: service worker caches chapter assets + questions; sync on reconnect
- Parent dashboard: read-only progress view, weekly report email

Business:
- Freemium: syllabus maps free; full lessons + mocks behind unlock
- Batch cohorts: live class schedule per subject/chapter
- Referral & streak economy (XP, badges, leaderboards)

UX:
- Bento home dashboard: "Resume lesson", "Practice today", "Mock this week"
- Chapter rail with video + notes + practice tiles
- Doubt bubble: ask tutor, returns grounded-fallback with citations

Contrarian/market:
- BYJU'S heavy video + sales funnel; ClassX should be honest-content-first, no hard sell
- Avoid fake "AI tutor"; keep grounded-fallback disclosure
- Don't over-build live classes without concurrency infra

## Convergence (top picks)
1. Video-lesson tile per authored chapter (resume, bookmarks, gating)
2. Adaptive practice (simple→medium→complex on accuracy)
3. Gamification layer (XP, streak, badges, leaderboard)
4. Parent dashboard (read-only progress)
5. Doubt tutor bubble (grounded citations)
6. Offline cache (SW + IndexedDB)

## Open questions
- Video source: YouTube embed vs self-hosted MP4 (bandwidth/cost)
- Adaptive algorithm: simple moving accuracy vs spaced repetition
- Parent dashboard auth: guest link vs login
- Offline scope: chapters only or practice too

## Handoff
Run /eg-prd on "BYJU'S clone feature set for ClassX" to convert to PRD.
