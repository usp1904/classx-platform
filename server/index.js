import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { curriculum, subjects, getChapter, getLesson, getPlan, getStats, getSubject, sources, getQuestions } from './lib/data.js';
import { getConceptGraph, getIndex, ragStats } from './lib/rag.js';
import { getMultimodelRag } from './lib/rag-multimodel.js';
import { okfIndex } from './lib/okf-metadata.js';
import { getLearningAids, getAllAidIds, getAidLabel, getAidGroups, getAidGroup } from './lib/learning-aids.js';
import { askTutor } from './lib/ai.js';
import { startPractice, startExam, submitSession, getExamKey } from './lib/practice.js';
import { getProgress, updateProgress, awardXp, getBadges, getLeaderboard, getParentView, linkParent } from './lib/progress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8787);
const startedAt = Date.now();
const searchCache = new Map();

app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'ClassX Platform API',
    version: '1.0.0',
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    curriculum: getStats(),
    rag: ragStats(),
    aiProvider: Boolean(process.env.OPENAI_API_KEY || process.env.openAI_API_KEY || process.env.OPENROUTER_API_KEY),
  });
});

app.get('/api/curriculum', (req, res) => {
  res.json({ ok: true, meta: curriculum.meta, subjects });
});

app.get('/api/subjects/:subjectId', (req, res) => {
  const subject = getSubject(req.params.subjectId);
  if (!subject) return res.status(404).json({ ok: false, error: 'Subject not found' });
  res.json({ ok: true, subject });
});

app.get('/api/chapters/:subjectId/:chapterId', (req, res) => {
  const { subjectId, chapterId } = req.params;
  const chapter = getChapter(subjectId, chapterId);
  if (!chapter) return res.status(404).json({ ok: false, error: 'Chapter not found' });
  const lesson = getLesson(subjectId, chapterId);
  const graph = getConceptGraph(subjectId, chapterId);
  const related = getIndex().similar(chapterId, 4).map((r) => ({
    subjectId: r.subjectId,
    chapterId: r.chapterId,
    chapterName: r.chapterName,
    title: r.title,
    type: r.type,
  }));
  res.json({ ok: true, chapter, lesson, graph, related, available: { practice: (chapter.stats?.quizzes || 0) > 0, notes: Boolean(lesson), mock: (chapter.stats?.exercises || 0) > 0 } });
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ ok: true, query: '', results: [], diagnostics: null });
  const key = `${q}|${req.query.subjectId || ''}|${req.query.chapterId || ''}|${req.query.limit || ''}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < 60_000) return res.json(cached.payload);
  const { results, diagnostics } = getIndex().search(q, {
    subjectId: req.query.subjectId,
    chapterId: req.query.chapterId,
    limit: Number(req.query.limit) || 10,
  });
  const payload = {
    ok: true,
    query: q,
    results: results.map((r) => ({
      id: r.id,
      title: r.title,
      text: r.text.slice(0, 900),
      type: r.type,
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      chapterId: r.chapterId,
      chapterName: r.chapterName,
      anchor: r.anchor,
      score: Math.round(r.score * 10000) / 10000,
    })),
    diagnostics,
  };
  searchCache.set(key, { at: Date.now(), payload });
  if (searchCache.size > 300) searchCache.delete(searchCache.keys().next().value);
  res.json(payload);
});

app.post('/api/tutor', async (req, res) => {
  const { question, mode, subjectId, chapterId, history } = req.body || {};
  if (!question || typeof question !== 'string') return res.status(400).json({ ok: false, error: 'question is required' });
  if (question.length > 2000) return res.status(413).json({ ok: false, error: 'question too long' });
  try {
    const result = await askTutor({ question: question.trim(), mode: ['socratic', 'board', 'competitive', 'eli5'].includes(mode) ? mode : 'socratic', subjectId, chapterId, history: Array.isArray(history) ? history.slice(-6) : [] });
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Tutor failed', detail: error.message });
  }
});

app.post('/api/practice/start', (req, res) => {
  const { subjectId, chapterId, count, difficulty } = req.body || {};
  const result = startPractice({ subjectId: subjectId || 'mathematics', chapterId, count, difficulty });
  if (!result.ok) return res.status(422).json(result);
  res.json(result);
});

app.post('/api/practice/submit', (req, res) => {
  const { sessionId, answers } = req.body || {};
  if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId is required' });
  const result = submitSession({ sessionId, answers: answers || {} });
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.post('/api/exam/generate', (req, res) => {
  const { subjectId, chapterIds, counts } = req.body || {};
  const result = startExam({ subjectId: subjectId || 'mathematics', chapterIds, counts });
  if (!result.ok) return res.status(422).json(result);
  res.json(result);
});

app.get('/api/exam/:paperId/key', (req, res) => {
  const result = getExamKey(String(req.params.paperId || ''));
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.post('/api/exam/submit', (req, res) => {
  const { paperId, answers, subjectiveMarks } = req.body || {};
  if (!paperId) return res.status(400).json({ ok: false, error: 'paperId is required' });
  const result = submitSession({ sessionId: paperId, answers: answers || {}, subjectiveMarks: subjectiveMarks || {} });
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.get('/api/plan', (req, res) => {
  res.json({ ok: true, plan: getPlan() });
});

app.get('/api/progress', (req, res) => {
  res.json({ ok: true, progress: getProgress(String(req.query.userId || 'guest')) });
});

app.put('/api/progress', (req, res) => {
  const { userId, ...patch } = req.body || {};
  res.json({ ok: true, progress: updateProgress(String(userId || 'guest'), patch) });
});

app.get('/api/sources', (req, res) => {
  res.json({ ok: true, sources });
});

/* ---- SPEC-16 Video lessons (BYJU's clone) ---- */
const VIDEO_CATALOG = {
  mathematics: {
    'real-numbers': { id: 'math-real-numbers', provider: 'youtube', videoId: 'placeholder-real-numbers', title: 'Real Numbers', durationSec: 630, chapterId: 'real-numbers' },
    'polynomials': { id: 'math-polynomials', provider: 'youtube', videoId: 'placeholder-polynomials', title: 'Polynomials', durationSec: 720, chapterId: 'polynomials' },
    'pair-of-linear-equations': { id: 'math-pair-of-linear-equations', provider: 'youtube', videoId: 'placeholder-linear-equations', title: 'Pair of Linear Equations', durationSec: 840, chapterId: 'pair-of-linear-equations' },
    'quadratic-equations': { id: 'math-quadratic-equations', provider: 'youtube', videoId: 'placeholder-quadratic-equations', title: 'Quadratic Equations', durationSec: 780, chapterId: 'quadratic-equations' },
    'arithmetic-progressions': { id: 'math-arithmetic-progressions', provider: 'youtube', videoId: 'placeholder-ap', title: 'Arithmetic Progressions', durationSec: 690, chapterId: 'arithmetic-progressions' },
    'triangles': { id: 'math-triangles', provider: 'youtube', videoId: 'placeholder-triangles', title: 'Triangles', durationSec: 870, chapterId: 'triangles' },
    'coordinate-geometry': { id: 'math-coordinate-geometry', provider: 'youtube', videoId: 'placeholder-coordinate-geometry', title: 'Coordinate Geometry', durationSec: 660, chapterId: 'coordinate-geometry' },
    'introduction-to-trigonometry': { id: 'math-intro-trigonometry', provider: 'youtube', videoId: 'placeholder-trigonometry', title: 'Introduction to Trigonometry', durationSec: 750, chapterId: 'introduction-to-trigonometry' },
    'applications-of-trigonometry': { id: 'math-applications-trigonometry', provider: 'youtube', videoId: 'placeholder-apps-trig', title: 'Applications of Trigonometry', durationSec: 720, chapterId: 'applications-of-trigonometry' },
    'circles': { id: 'math-circles', provider: 'youtube', videoId: 'placeholder-circles', title: 'Circles', durationSec: 630, chapterId: 'circles' },
    'areas-related-to-circles': { id: 'math-areas-circles', provider: 'youtube', videoId: 'placeholder-areas-circles', title: 'Areas Related to Circles', durationSec: 600, chapterId: 'areas-related-to-circles' },
    'surface-areas-and-volumes': { id: 'math-surface-areas-volumes', provider: 'youtube', videoId: 'placeholder-surface-areas', title: 'Surface Areas and Volumes', durationSec: 810, chapterId: 'surface-areas-and-volumes' },
    'statistics': { id: 'math-statistics', provider: 'youtube', videoId: 'placeholder-statistics', title: 'Statistics', durationSec: 690, chapterId: 'statistics' },
    'probability': { id: 'math-probability', provider: 'youtube', videoId: 'placeholder-probability', title: 'Probability', durationSec: 660, chapterId: 'probability' },
  },
  science: {
    'chemical-reactions-and-equations': { id: 'sci-chemical-reactions', provider: 'youtube', videoId: 'placeholder-chem', title: 'Chemical Reactions and Equations', durationSec: 720, chapterId: 'chemical-reactions-and-equations' },
    'life-processes': { id: 'sci-life-processes', provider: 'youtube', videoId: 'placeholder-bio', title: 'Life Processes', durationSec: 840, chapterId: 'life-processes' },
    'control-and-coordination': { id: 'sci-control-coordination', provider: 'youtube', videoId: 'placeholder-control', title: 'Control and Coordination', durationSec: 780, chapterId: 'control-and-coordination' },
    'how-do-organisms-reproduce': { id: 'sci-reproduction', provider: 'youtube', videoId: 'placeholder-repro', title: 'How do Organisms Reproduce', durationSec: 750, chapterId: 'how-do-organisms-reproduce' },
  },
};

app.get('/api/video/:subjectId/:chapterId', (req, res) => {
  const { subjectId, chapterId } = req.params;
  const catalog = VIDEO_CATALOG[subjectId];
  const video = catalog ? catalog[chapterId] : null;
  if (!video) return res.status(404).json({ ok: false, error: 'No video lesson for this chapter yet' });
  res.json({ ok: true, video, chapterId, subjectId, gating: { requiredMastery: 80 } });
});

app.post('/api/video/progress', (req, res) => {
  const { userId, chapterId, positionSec, durationSec, bookmarked } = req.body || {};
  if (!userId || !chapterId) return res.status(400).json({ ok: false, error: 'userId and chapterId required' });
  updateProgress(userId, { videoProgress: { ...(getProgress(userId).videoProgress || {}), [chapterId]: { positionSec, durationSec, bookmarked: Boolean(bookmarked), updatedAt: new Date().toISOString() } } });
  res.json({ ok: true, saved: true });
});

/* ---- SPEC-18 Gamification (BYJU's clone) ---- */
app.get('/api/gamify/badges', (req, res) => res.json({ ok: true, badges: getBadges() }));
app.get('/api/gamify/leaderboard', (req, res) => res.json({ ok: true, leaderboard: getLeaderboard(Number(req.query.limit) || 20) }));
app.post('/api/gamify/xp', (req, res) => {
  const { userId = 'guest', amount, reason } = req.body || {};
  if (!amount) return res.status(400).json({ ok: false, error: 'amount required' });
  const result = awardXp(userId, Number(amount), reason || 'activity');
  res.json({ ok: true, ...result });
});

/* ---- SPEC-19 Parent dashboard (BYJU's clone) ---- */
app.get('/api/parent/:childUserId', (req, res) => res.json({ ok: true, parent: getParentView(req.params.childUserId) }));
app.post('/api/parent/link', (req, res) => res.json({ ok: true, ...linkParent(req.body.childUserId) }));

/* ---- SPEC-17 Adaptive practice (BYJU's clone) - difficulty hint ---- */
app.post('/api/practice/adaptive', (req, res) => {
  const { subjectId = 'mathematics', chapterId, count = 10, currentDifficulty = 'simple', accuracy } = req.body || {};
  let difficulty = currentDifficulty;
  if (accuracy !== undefined) {
    if (accuracy >= 0.8 && currentDifficulty === 'simple') difficulty = 'medium';
    else if (accuracy >= 0.8 && currentDifficulty === 'medium') difficulty = 'complex';
    else if (accuracy < 0.5 && currentDifficulty === 'medium') difficulty = 'simple';
    else if (accuracy < 0.5 && currentDifficulty === 'complex') difficulty = 'medium';
  }
  const result = startPractice({ subjectId, chapterId, count, difficulty });
  if (!result.ok) return res.status(422).json(result);
  res.json({ ok: true, ...result, adaptive: { difficulty, accuracy } });
});

/* ---- OKF metadata alignment ---- */
app.get('/api/okf/stats', (req, res) => {
  const mm = getMultimodelRag();
  res.json({ ok: true, ...mm.stats() });
});
app.get('/api/okf/topics', (req, res) => {
  const { tags } = req.query;
  const tagList = tags ? String(tags).split(',').filter(Boolean) : [];
  const topics = tagList.length ? okfIndex.topicsForTags(tagList) : [...okfIndex.topics.values()];
  res.json({ ok: true, okfVersion: 'OKF-v1', topics });
});

/* ---- Multimodel RAG search ---- */
app.get('/api/search/multimodel', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ ok: true, query: '', results: [], diagnostics: null });
  const mm = getMultimodelRag();
  const out = mm.search(q, {
    subjectId: req.query.subjectId,
    chapterId: req.query.chapterId,
    limit: Number(req.query.limit) || 10,
    difficulty: req.query.difficulty || undefined,
    tags: req.query.tags ? String(req.query.tags).split(',') : undefined,
    board: req.query.board || 'CBSE',
    class: req.query.class || 'X',
    academicYear: req.query.academicYear || '2026-27',
  });
  res.json(out);
});

/* ---- SPEC-23 Learning Aids ---- */
app.get('/api/learning-aids/:subjectId/:chapterId', (req, res) => {
  const { subjectId, chapterId } = req.params;
  const aids = getLearningAids(subjectId, chapterId);
  res.json({ ok: true, ...aids });
});
app.get('/api/learning-aids/ids', (req, res) => {
  res.json({ ok: true, aidIds: getAllAidIds(), aidLabels: AID_LABELS, aidGroups: getAidGroups() });
});
app.get('/api/learning-aids/group/:group', (req, res) => {
  const { group } = req.params;
  const aids = getAllAidIds().filter((id) => getAidGroup(id) === group);
  res.json({ ok: true, group, aids });
});

app.get('/api/graph/:subjectId/:chapterId', (req, res) => {
  const chapter = getChapter(req.params.subjectId, req.params.chapterId);
  if (!chapter) return res.status(404).json({ ok: false, error: 'Chapter not found' });
  res.json({ ok: true, graph: getConceptGraph(req.params.subjectId, req.params.chapterId) });
});

app.get('/api/library', (req, res) => {
  const formulas = [];
  const shortcuts = [];
  const flashcards = [];
  for (const subject of subjects) {
    for (const chapter of subject.chapters) {
      const lesson = getLesson(subject.id, chapter.id);
      if (!lesson) continue;
      for (const theorem of lesson.theorems || []) {
        if (!theorem.statement) continue;
        formulas.push({ id: `${subject.id}:${chapter.id}:${theorem.name}`, subjectId: subject.id, subjectName: subject.name, chapterId: chapter.id, chapterName: chapter.name, name: theorem.name, statement: theorem.statement, example: theorem.examples?.[0]?.problem || '' });
      }
      for (const shortcut of lesson.vedic_math_shortcuts || []) {
        shortcuts.push({ id: `${subject.id}:${chapter.id}:shortcut:${shortcuts.length}`, subjectId: subject.id, chapterId: chapter.id, chapterName: chapter.name, ...shortcut });
      }
      for (const [difficulty, list] of Object.entries(lesson.quizzes || {})) {
        if (!Array.isArray(list)) continue;
        list.slice(0, 4).forEach((q) => flashcards.push({ id: q.id || `${chapter.id}-${flashcards.length}`, subjectId: subject.id, chapterId: chapter.id, chapterName: chapter.name, difficulty, front: q.question, back: q.explanation?.correct || '', options: q.options, correct: q.correct }));
      }
    }
  }
  res.json({ ok: true, formulas, shortcuts, flashcards });
});

const PUBLIC = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC)) {
  app.use(express.static(PUBLIC, { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0, etag: true }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(PUBLIC, 'index.html'));
  });
}

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'API route not found' }));

app.use((err, req, res, next) => {
  console.error('[api]', err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ClassX Platform API on http://localhost:${PORT}`);
  console.log(`curriculum: ${getStats().chapters} chapters · ${getStats().questions} questions · ${ragStats().chunks} RAG chunks`);
});
