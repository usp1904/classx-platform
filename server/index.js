import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient as createRedisClient } from 'redis';
import { curriculum, subjects, getChapter, getLesson, getPlan, getStats, getSubject, sources, getQuestions } from './lib/data.js';
import { getConceptGraph, getIndex, ragStats } from './lib/rag.js';
import { getMultimodelRag } from './lib/rag-multimodel.js';
import { okfIndex } from './lib/okf-metadata.js';
import { getLearningAids, getAllAidIds, getAidLabel, getAidGroups, getAidGroup, AID_LABELS } from './lib/learning-aids.js';
import { askTutor } from './lib/ai.js';
import { startPractice, startExam, submitSession, getExamKey } from './lib/practice.js';
import { getProgressAsync as getProgress, updateProgressAsync as updateProgress, awardXpAsync as awardXp, getBadges, getLeaderboard, getParentView, linkParent } from './lib/progress.js';
import { initRedis, isRedisReady, sessionSet, sessionGet, sessionDel, sessionExists } from './lib/session-store.js';
import { QdrantClient } from '@qdrant/js-client-rest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8787);
const startedAt = Date.now();
const searchCache = new Map();

// ---- Redis client (optional - non-blocking) ----
let redisClient = null;
let redisReady = false;
try {
  redisClient = createRedisClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
  redisClient.on('error', (err) => { redisReady = false; console.error('[redis] error:', err.message); });
  redisClient.on('connect', () => { redisReady = true; });
  // Non-blocking: start server immediately, Redis connects in background
  redisClient.connect().then(() => { redisReady = true; }).catch(() => { redisReady = false; });
} catch (err) {
  console.warn('[redis] not available:', err.message);
}

// ---- Qdrant client (optional - non-blocking) ----
let qdrant = null;
export function getQdrant() { return qdrant; }
try {
  qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://127.0.0.1:6333' });
  qdrant.getCollections().then(() => { console.log('[qdrant] connected'); }).catch(() => { qdrant = null; console.warn('[qdrant] not available, falling back to local RAG'); });
} catch (err) {
  console.warn('[qdrant] not available:', err.message);
}

// Session store: Redis if available, else in-memory fallback
let RedisStoreInstance;
try {
  RedisStoreInstance = new RedisStore({ client: redisClient, session });
} catch (err) {
  console.warn('[connect-redis] init failed:', err.message);
  RedisStoreInstance = new RedisStore({ client: redisClient });
}

app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// ---- Session middleware ----
app.use(session({
  store: RedisStoreInstance,
  secret: process.env.SESSION_SECRET || 'classx-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false,
    maxAge: 3 * 60 * 60 * 1000, // 3 hours
  },
  name: 'classx_sid',
}));

// ---- Auth routes ----
app.post('/api/auth/register', async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) return res.status(400).json({ ok: false, error: 'userId and password required' });
  if (userId.length < 3 || userId.length > 32) return res.status(400).json({ ok: false, error: 'userId must be 3-32 chars' });
  if (password.length < 6) return res.status(400).json({ ok: false, error: 'password must be 6+ chars' });

  const existing = await sessionGet(`user:${userId}`);
  if (existing) return res.status(409).json({ ok: false, error: 'userId already exists' });

  const { hashSync } = await import('bcryptjs');
  const hash = hashSync(password, 10);
  await sessionSet(`user:${userId}`, { userId, passwordHash: hash, createdAt: Date.now() }, 0); // no TTL for user accounts
  req.session.userId = userId;
  req.session.save(() => res.json({ ok: true, userId }));
});

app.post('/api/auth/login', async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) return res.status(400).json({ ok: false, error: 'userId and password required' });

  const user = await sessionGet(`user:${userId}`);
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

  const { compareSync } = await import('bcryptjs');
  if (!compareSync(password, user.passwordHash)) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

  req.session.userId = userId;
  req.session.save(() => res.json({ ok: true, userId }));
});

app.post('/api/auth/logout', (req, res) => {
  const userId = req.session.userId;
  req.session.destroy(() => {
    res.clearCookie('classx_sid');
    res.json({ ok: true, loggedOut: true, userId });
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ ok: true, userId: req.session.userId || null, authenticated: Boolean(req.session.userId) });
});

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ ok: false, error: 'Login required' });
  next();
}

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

app.post('/api/practice/start', requireAuth, (req, res) => {
  const { subjectId, chapterId, count, difficulty } = req.body || {};
  const result = startPractice({ subjectId: subjectId || 'mathematics', chapterId, count, difficulty });
  if (!result.ok) return res.status(422).json(result);
  res.json(result);
});

app.post('/api/practice/submit', requireAuth, (req, res) => {
  const { sessionId, answers } = req.body || {};
  if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId is required' });
  const result = submitSession({ sessionId, answers: answers || {} });
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.post('/api/exam/generate', requireAuth, (req, res) => {
  const { subjectId, chapterIds, counts } = req.body || {};
  const result = startExam({ subjectId: subjectId || 'mathematics', chapterIds, counts });
  if (!result.ok) return res.status(422).json(result);
  res.json(result);
});

app.get('/api/exam/:paperId/key', requireAuth, (req, res) => {
  const result = getExamKey(String(req.params.paperId || ''));
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.post('/api/exam/submit', requireAuth, (req, res) => {
  const { paperId, answers, subjectiveMarks } = req.body || {};
  if (!paperId) return res.status(400).json({ ok: false, error: 'paperId is required' });
  const result = submitSession({ sessionId: paperId, answers: answers || {}, subjectiveMarks: subjectiveMarks || {} });
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.get('/api/plan', (req, res) => {
  res.json({ ok: true, plan: getPlan() });
});

app.get('/api/progress', requireAuth, async (req, res) => {
  const progress = await getProgress(String(req.query.userId || req.session.userId));
  res.json({ ok: true, progress });
});

app.put('/api/progress', requireAuth, async (req, res) => {
  const { userId, ...patch } = req.body || {};
  const targetUserId = userId || req.session.userId;
  const progress = await updateProgress(targetUserId, patch);
  res.json({ ok: true, progress });
});

app.get('/api/sources', (req, res) => {
  res.json({ ok: true, sources });
});

/* ---- SPEC-16 Video lessons (BYJU's clone) ---- */

// YouTube content safety: ONLY block explicit adult/pornographic content.
// Educational content (biology, reproduction, adolescence, etc.) is ALLOWED.
// We do NOT block words like 'adolescent', 'teen', 'reproduction' as they are valid educational topics.
const BLOCKED_VIDEO_KEYWORDS = [
  'porn', 'xxx', 'hardcore porn', 'sex video', 'nude', 'erotic', 'strip tease',
  'bdsm', 'fetish', 'webcam girl', 'cam girl', 'onlyfans',
];

// Educational video catalog with ratings and summaries
// All videos are for educational purposes only - no monetary intent
const VIDEO_CATALOG = {
  mathematics: {
    'real-numbers': { id: 'math-real-numbers', provider: 'youtube', videoId: 'L6lAZ7gHQ7c', title: 'Real Numbers — Complete Class X Chapter', durationSec: 630, chapterId: 'real-numbers', channel: 'Khan Academy', safe: true, rating: 4.8, summary: 'Learn about rational and irrational numbers, Euclid\'s division lemma, and fundamental theorem of arithmetic.', validityScore: 0.95 },
    'polynomials': { id: 'math-polynomials', provider: 'youtube', videoId: '2K_NoblbXqY', title: 'Polynomials — Complete Class X Chapter', durationSec: 720, chapterId: 'polynomials', channel: 'Khan Academy', safe: true, rating: 4.7, summary: 'Understand polynomials, zeroes, coefficients, and division algorithm.', validityScore: 0.94 },
    'pair-of-linear-equations': { id: 'math-pair-of-linear-equations', provider: 'youtube', videoId: 'jF6sS4z6WzU', title: 'Pair of Linear Equations — Complete Class X Chapter', durationSec: 840, chapterId: 'pair-of-linear-equations', channel: 'Khan Academy', safe: true, rating: 4.6, summary: 'Learn to solve pair of linear equations in two variables graphically and algebraically.', validityScore: 0.93 },
    'quadratic-equations': { id: 'math-quadratic-equations', provider: 'youtube', videoId: 'W7zeD_UxODU', title: 'Quadratic Equations — Complete Class X Chapter', durationSec: 780, chapterId: 'quadratic-equations', channel: 'Khan Academy', safe: true, rating: 4.9, summary: 'Master quadratic equations, discriminant, and nature of roots.', validityScore: 0.96 },
    'arithmetic-progressions': { id: 'math-arithmetic-progressions', provider: 'youtube', videoId: 'B0XR9xX5VjA', title: 'Arithmetic Progressions — Complete Class X Chapter', durationSec: 690, chapterId: 'arithmetic-progressions', channel: 'Khan Academy', safe: true, rating: 4.7, summary: 'Learn AP, nth term, and sum of n terms with real-world applications.', validityScore: 0.94 },
    'triangles': { id: 'math-triangles', provider: 'youtube', videoId: 'Vt3Lz0qzVtE', title: 'Triangles — Complete Class X Chapter', durationSec: 870, chapterId: 'triangles', channel: 'Khan Academy', safe: true, rating: 4.8, summary: 'Similarity of triangles, Pythagoras theorem, and areas of similar triangles.', validityScore: 0.95 },
    'coordinate-geometry': { id: 'math-coordinate-geometry', provider: 'youtube', videoId: 'EBx6Q0f7o5M', title: 'Coordinate Geometry — Complete Class X Chapter', durationSec: 660, chapterId: 'coordinate-geometry', channel: 'Khan Academy', safe: true, rating: 4.6, summary: 'Distance formula, section formula, and area of triangle in coordinate geometry.', validityScore: 0.93 },
    'introduction-to-trigonometry': { id: 'math-intro-trigonometry', provider: 'youtube', videoId: 'LsWAP_4BxVM', title: 'Introduction to Trigonometry — Complete Class X Chapter', durationSec: 750, chapterId: 'introduction-to-trigonometry', channel: 'Khan Academy', safe: true, rating: 4.7, summary: 'Trigonometric ratios, identities, and applications in real life.', validityScore: 0.94 },
    'applications-of-trigonometry': { id: 'math-applications-trigonometry', provider: 'youtube', videoId: 'P2qyF9ZB_XM', title: 'Applications of Trigonometry — Complete Class X Chapter', durationSec: 720, chapterId: 'applications-of-trigonometry', channel: 'Khan Academy', safe: true, rating: 4.8, summary: 'Height and distance problems using trigonometry.', validityScore: 0.95 },
    'circles': { id: 'math-circles', provider: 'youtube', videoId: 'W4u_0g1x7vQ', title: 'Circles — Complete Class X Chapter', durationSec: 630, chapterId: 'circles', channel: 'Khan Academy', safe: true, rating: 4.7, summary: 'Tangent to a circle, number of tangents from a point on a circle.', validityScore: 0.94 },
    'areas-related-to-circles': { id: 'math-areas-circles', provider: 'youtube', videoId: 'M9m7D9f5LqE', title: 'Areas Related to Circles — Complete Class X Chapter', durationSec: 600, chapterId: 'areas-related-to-circles', channel: 'Khan Academy', safe: true, rating: 4.6, summary: 'Area of sectors, segments, and combinations of plane figures.', validityScore: 0.93 },
    'surface-areas-and-volumes': { id: 'math-surface-areas-volumes', provider: 'youtube', videoId: 'L0Rq_4k7aF8', title: 'Surface Areas and Volumes — Complete Class X Chapter', durationSec: 810, chapterId: 'surface-areas-and-volumes', channel: 'Khan Academy', safe: true, rating: 4.8, summary: 'Surface area and volume of combinations of solids — cube, cuboid, cylinder, cone, sphere.', validityScore: 0.95 },
    'statistics': { id: 'math-statistics', provider: 'youtube', videoId: 'CGbL6rN7b0U', title: 'Statistics — Complete Class X Chapter', durationSec: 690, chapterId: 'statistics', channel: 'Khan Academy', safe: true, rating: 4.7, summary: 'Mean, median, mode of grouped data and cumulative frequency graphs.', validityScore: 0.94 },
    'probability': { id: 'math-probability', provider: 'youtube', videoId: '0mJZg0xq1Yc', title: 'Probability — Complete Class X Chapter', durationSec: 660, chapterId: 'probability', channel: 'Khan Academy', safe: true, rating: 4.7, summary: 'Theoretical probability, equally likely outcomes, and complementary events.', validityScore: 0.94 },
  },
  science: {
    'chemical-reactions-and-equations': { id: 'sci-chemical-reactions', provider: 'youtube', videoId: 'L0lWm7UxLzM', title: 'Chemical Reactions and Equations — Complete Class X Chapter', durationSec: 720, chapterId: 'chemical-reactions-and-equations', channel: 'Khan Academy', safe: true, rating: 4.8, summary: 'Chemical reactions, types of reactions, and balancing chemical equations.', validityScore: 0.95 },
    'life-processes': { id: 'sci-life-processes', provider: 'youtube', videoId: 'uWgHf6h3nW4', title: 'Life Processes — Complete Class X Chapter', durationSec: 840, chapterId: 'life-processes', channel: 'Khan Academy', safe: true, rating: 4.9, summary: 'Nutrition, respiration, transportation, and excretion in plants and animals.', validityScore: 0.96 },
    'control-and-coordination': { id: 'sci-control-coordination', provider: 'youtube', videoId: 'IeO7eJQ1xk0', title: 'Control and Coordination — Complete Class X Chapter', durationSec: 780, chapterId: 'control-and-coordination', channel: 'Khan Academy', safe: true, rating: 4.8, summary: 'Nervous system, hormones, reflex actions, and plant movements.', validityScore: 0.95 },
    'how-do-organisms-reproduce': { id: 'sci-reproduction', provider: 'youtube', videoId: 'Fy5q6s6x4yM', title: 'How do Organisms Reproduce — Complete Class X Chapter', durationSec: 750, chapterId: 'how-do-organisms-reproduce', channel: 'Khan Academy', safe: true, rating: 4.8, summary: 'Asexual and sexual reproduction in plants and animals.', validityScore: 0.95 },
  },
};

// Content safety check: ONLY block truly adult/pornographic content.
// Educational content (biology, reproduction, adolescence, etc.) is ALLOWED.
function isVideoSafe(video) {
  const text = `${video.title} ${video.channel || ''}`.toLowerCase();
  return !BLOCKED_VIDEO_KEYWORDS.some((kw) => text.includes(kw));
}

app.get('/api/video/:subjectId/:chapterId', (req, res) => {
  const { subjectId, chapterId } = req.params;
  const catalog = VIDEO_CATALOG[subjectId];
  const video = catalog ? catalog[chapterId] : null;
  if (!video) return res.status(404).json({ ok: false, error: 'No video lesson for this chapter yet' });
  if (!isVideoSafe(video)) {
    return res.status(403).json({ ok: false, error: 'Video content blocked by safety filter' });
  }
  res.json({ ok: true, video, chapterId, subjectId, gating: { requiredMastery: 80 } });
});

app.post('/api/video/progress', requireAuth, (req, res) => {
  const { userId, chapterId, positionSec, durationSec, bookmarked } = req.body || {};
  if (!userId || !chapterId) return res.status(400).json({ ok: false, error: 'userId and chapterId required' });
  updateProgress(userId, { videoProgress: { ...(getProgress(userId).videoProgress || {}), [chapterId]: { positionSec, durationSec, bookmarked: Boolean(bookmarked), updatedAt: new Date().toISOString() } } });
  res.json({ ok: true, saved: true });
});

/* ---- SPEC-18 Gamification (BYJU's clone) ---- */
app.get('/api/gamify/badges', (req, res) => res.json({ ok: true, badges: getBadges() }));
app.get('/api/gamify/leaderboard', (req, res) => res.json({ ok: true, leaderboard: getLeaderboard(Number(req.query.limit) || 20) }));
app.post('/api/gamify/xp', requireAuth, async (req, res) => {
  const { userId = 'guest', amount, reason } = req.body || {};
  if (!amount) return res.status(400).json({ ok: false, error: 'amount required' });
  const result = await awardXp(userId, Number(amount), reason || 'activity');
  res.json({ ok: true, ...result });
});

/* ---- SPEC-19 Parent dashboard (BYJU's clone) ---- */
app.get('/api/parent/:childUserId', (req, res) => res.json({ ok: true, parent: getParentView(req.params.childUserId) }));
app.post('/api/parent/link', (req, res) => res.json({ ok: true, ...linkParent(req.body.childUserId) }));

/* ---- SPEC-17 Adaptive practice (BYJU's clone) - difficulty hint ---- */
app.post('/api/practice/adaptive', requireAuth, (req, res) => {
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
