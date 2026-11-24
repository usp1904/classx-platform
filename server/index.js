import dotenv from 'dotenv';
dotenv.config({ path: ['.env', '.secrets'] });

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import { curriculum, subjects, getChapter, getLesson, getPlan, getStats, getSubject, sources, getQuestions } from './lib/data.js';
import { getConceptGraph, getIndex, ragStats } from './lib/rag.js';
import { getMultimodelRag } from './lib/rag-multimodel.js';
import { okfIndex } from './lib/okf-metadata.js';
import { getLearningAids, getAllAidIds, getAidLabel, getAidGroups, getAidGroup, AID_LABELS } from './lib/learning-aids.js';
import { askTutor } from './lib/ai.js';
import { startPractice, startExam, submitSession, getExamKey } from './lib/practice.js';
import { getProgressAsync as getProgress, updateProgressAsync as updateProgress, awardXpAsync as awardXp, getBadges, getLeaderboard, getParentView, linkParent } from './lib/progress.js';
import { sessionSet, sessionGet, sessionStoreKind } from './lib/session-store.js';
import { getVideoEntry, catalogStats } from './lib/video-catalog.js';
import { buildKnowledgeHub } from './lib/knowledge-hub.js';
import { getPlayerConfig, searchVideos, validateVideo } from './lib/youtube.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8787);
const startedAt = Date.now();
const searchCache = new Map();

// Express 4 does not forward rejected promises from async handlers. Wrap every
// route so a thrown error reaches the JSON error middleware instead of killing
// the process. Middleware with (req, res, next) is left untouched.
for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
  const register = app[method].bind(app);
  app[method] = (routePath, ...handlers) => register(routePath, ...handlers.map((handler) => {
    if (typeof handler !== 'function' || handler.length >= 3) return handler;
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
  }));
}


// ============================================================================
// SERVICES COMMENTED OUT — NOT AVAILABLE ON RENDER FREE TIER
// Uncomment when Redis/Qdrant services are provisioned on Render
// ============================================================================

// ---- Redis client (commented out — Redis not available on Render free) ----
/*
let redisClient = null;
let redisReady = false;
try {
  redisClient = createRedisClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
  redisClient.on('error', (err) => { redisReady = false; console.error('[redis] error:', err.message); });
  redisClient.on('connect', () => { redisReady = true; });
  redisClient.connect().then(() => { redisReady = true; }).catch(() => { redisReady = false; });
} catch (err) {
  console.warn('[redis] not available:', err.message);
}
*/

// ---- Qdrant client (commented out — Qdrant not available on Render free) ----
/*
let qdrant = null;
export function getQdrant() { return qdrant; }
try {
  qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://127.0.0.1:6333' });
  qdrant.getCollections().then(() => { console.log('[qdrant] connected'); }).catch(() => { qdrant = null; console.warn('[qdrant] not available, falling back to local RAG'); });
} catch (err) {
  console.warn('[qdrant] not available:', err.message);
}
*/

// Session store: MemoryStore only (Redis commented out)
let RedisStoreInstance;
try {
  const MemoryStore = session.MemoryStore;
  RedisStoreInstance = new MemoryStore();
  console.warn('[session] using MemoryStore — sessions not persistent across restarts');
} catch (err) {
  console.error('[session] MemoryStore init failed:', err.message);
}
// End of commented-out services block
// ============================================================================

// Cross-origin is opt-in. The bundled SPA is same-origin, so the safe default
// is "no cross-origin" instead of reflecting any origin with credentials.
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '').trim();
const corsOrigin = !CORS_ORIGIN || CORS_ORIGIN === 'false'
  ? false
  : CORS_ORIGIN === 'true'
    ? true
    : CORS_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://i.ytimg.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://youtubeeducation.com https://*.youtubeeducation.com; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
  );
  if (process.env.COOKIE_SECURE === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '256kb' }));
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ ok: false, error: 'Content-Type must be application/json' });
  }
  return next();
});

// Process-local rate limiting. The app runs as a single fork, so a Map is
// sufficient; clear it if it grows unexpectedly large.
function makeRateLimiter({ windowMs, max, message, skip }) {
  const attempts = new Map();
  return function rateLimiter(req, res, next) {
    if (skip && skip(req)) return next();
    const ip = req.ip || 'unknown';
    const now = Date.now();
    if (attempts.size > 10000) attempts.clear();
    const entry = attempts.get(ip);
    if (!entry || entry.resetAt <= now) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ ok: false, error: message });
    }
    return next();
  };
}

const apiRateLimit = makeRateLimiter({
  windowMs: 60 * 1000,
  max: 180,
  message: 'Too many requests. Try again shortly.',
  skip: (req) => req.path === '/health',
});
const tutorRateLimit = makeRateLimiter({
  windowMs: 60 * 1000,
  max: 8,
  message: 'Tutor rate limit reached. Try again in a minute.',
});
app.use('/api', apiRateLimit);

// In-memory auth throttle. Resets after a minute; process-local is enough
// because the app runs as a single fork (see ecosystem.config.js).
const authAttempts = new Map();
const AUTH_WINDOW_MS = 60 * 1000;
const AUTH_MAX_ATTEMPTS = 20;
function authRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  if (authAttempts.size > 5000) authAttempts.clear();
  const entry = authAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    authAttempts.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return next();
  }
  entry.count += 1;
  if (entry.count > AUTH_MAX_ATTEMPTS) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    return res.status(429).json({ ok: false, error: 'Too many attempts. Try again shortly.' });
  }
  return next();
}


// Cookie security is explicit: HTTPS deployments set COOKIE_SECURE=true.
// Local Docker (http://localhost) keeps cookies working even with NODE_ENV=production.
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

// ---- Session middleware ----
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.warn('[session] SESSION_SECRET unset — using an insecure development default. Set it in production.');
}
app.use(session({
  store: RedisStoreInstance,
  secret: SESSION_SECRET || 'classx-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SECURE ? 'lax' : false,
    maxAge: 3 * 60 * 60 * 1000, // 3 hours
  },
  name: 'classx_sid',
}));

app.use(compression());

// ---- Auth routes ----
app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) return res.status(400).json({ ok: false, error: 'userId and password required' });
  if (userId.length < 3 || userId.length > 32) return res.status(400).json({ ok: false, error: 'userId must be 3-32 chars' });
  if (password.length < 6) return res.status(400).json({ ok: false, error: 'password must be 6+ chars' });

  const existing = await sessionGet(`user:${userId}`);
  if (existing) return res.status(409).json({ ok: false, error: 'userId already exists' });

  const { hashSync } = (await import('bcryptjs')).default;
  const hash = hashSync(password, 10);
  await sessionSet(`user:${userId}`, { userId, passwordHash: hash, createdAt: Date.now() }, 0); // no TTL for user accounts
  req.session.userId = userId;
  req.session.save(() => res.json({ ok: true, userId }));
});

app.post('/api/auth/login', authRateLimit, async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) return res.status(400).json({ ok: false, error: 'userId and password required' });

  const user = await sessionGet(`user:${userId}`);
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

  const { compareSync } = (await import('bcryptjs')).default;
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

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'ClassX Platform API',
    version: process.env.APP_VERSION || '1.0.0',
    commit: process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || 'dev',
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    curriculum: getStats(),
    rag: ragStats(),
    sessionStore: sessionStoreKind(),
    videos: catalogStats(),
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

app.post('/api/tutor', tutorRateLimit, async (req, res) => {
  const { question, mode, subjectId, chapterId, history } = req.body || {};
  if (!question || typeof question !== 'string') return res.status(400).json({ ok: false, error: 'question is required' });
  if (question.length > 2000) return res.status(413).json({ ok: false, error: 'question too long' });
  try {
    const result = await askTutor({ question: question.trim(), mode: ['socratic', 'board', 'competitive', 'eli5'].includes(mode) ? mode : 'socratic', subjectId, chapterId, history: Array.isArray(history) ? history.slice(-6) : [] });
    res.json(result);
  } catch (error) {
    const payload = { ok: false, error: 'Tutor failed' };
    if (process.env.NODE_ENV !== 'production') payload.detail = error.message;
    res.status(500).json(payload);
  }
});

// The product is guest-first (the SPA defaults to userId "guest"). Authenticated
// sessions may only touch their own progress; anonymous callers are limited to
// the shared guest bucket instead of arbitrary user ids.
function resolveUserId(req, requested) {
  if (req.session?.userId) return req.session.userId;
  if (!requested || requested === 'guest') return 'guest';
  return null;
}

app.post('/api/practice/start', (req, res) => {
  const { subjectId, chapterId, count, difficulty } = req.body || {};
  const result = startPractice({ subjectId: subjectId || 'mathematics', chapterId, count, difficulty });
  if (!result.ok) return res.status(422).json(result);
  res.json(result);
});

app.post('/api/practice/submit', async (req, res) => {
  const { sessionId, answers } = req.body || {};
  if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId is required' });
  const result = await submitSession({ sessionId, answers: answers || {} });
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.post('/api/exam/generate', (req, res) => {
  const { subjectId, chapterIds, counts } = req.body || {};
  const result = startExam({ subjectId: subjectId || 'mathematics', chapterIds, counts });
  if (!result.ok) return res.status(422).json(result);
  res.json(result);
});

app.get('/api/exam/:paperId/key', async (req, res) => {
  const result = await getExamKey(String(req.params.paperId || ''));
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.post('/api/exam/submit', async (req, res) => {
  const { paperId, answers, subjectiveMarks } = req.body || {};
  if (!paperId) return res.status(400).json({ ok: false, error: 'paperId is required' });
  const result = await submitSession({ sessionId: paperId, answers: answers || {}, subjectiveMarks: subjectiveMarks || {} });
  if (!result.ok) return res.status(410).json(result);
  res.json(result);
});

app.get('/api/plan', (req, res) => {
  res.json({ ok: true, plan: getPlan() });
});

app.get('/api/progress', async (req, res) => {
  const userId = resolveUserId(req, String(req.query.userId || ''));
  if (!userId) return res.status(403).json({ ok: false, error: 'Not allowed' });
  const progress = await getProgress(userId);
  res.json({ ok: true, progress });
});

app.put('/api/progress', async (req, res) => {
  const { userId: requestedUserId, ...patch } = req.body || {};
  const userId = resolveUserId(req, requestedUserId);
  if (!userId) return res.status(403).json({ ok: false, error: 'Not allowed' });
  const progress = await updateProgress(userId, patch);
  res.json({ ok: true, progress });
});

app.get('/api/sources', (req, res) => {
  res.json({ ok: true, sources });
});

/* ---- SPEC-16 Video lessons + Student Knowledge Hub for India ---- */

function publicVideo(pick, chapterId, chapter) {
  return {
    id: pick.id,
    provider: 'youtube',
    videoId: pick.id,
    title: pick.title || pick.validatedTitle || chapter.name,
    durationSec: Number(pick.durationSec) || 0,
    chapterId,
    channel: pick.channel || pick.validatedAuthor || 'Educational publisher',
    safe: true,
    verified: true,
    verifiedAt: pick.validatedAt || null,
    rating: null,
    summary: chapter.summary || '',
    validityScore: 1,
    url: pick.url || `https://www.youtube.com/watch?v=${pick.id}`,
  };
}

function buildVideoPayload(subjectId, chapterId) {
  const chapter = getChapter(subjectId, chapterId);
  if (!chapter) return null;
  const entry = getVideoEntry(subjectId, chapterId);
  const videos = (entry?.picks || []).map((pick) => publicVideo(pick, chapterId, chapter));
  return {
    chapter,
    entry,
    videos,
    video: videos[0] || null,
    validation: entry?.validation || null,
    hub: buildKnowledgeHub(subjectId, chapterId),
  };
}

app.get('/api/video/:subjectId/:chapterId', (req, res) => {
  const { subjectId, chapterId } = req.params;
  const payload = buildVideoPayload(subjectId, chapterId);
  if (!payload) return res.status(404).json({ ok: false, error: 'Chapter not found' });
  if (!payload.video) {
    return res.status(503).json({
      ok: false,
      error: 'No validated educational video is available for this chapter yet.',
      chapterId,
      subjectId,
      hub: payload.hub,
    });
  }
  res.json({
    ok: true,
    video: payload.video,
    videos: payload.videos,
    chapterId,
    subjectId,
    validation: payload.validation,
    gating: { requiredMastery: 80 },
    hub: payload.hub,
  });
});

app.get('/api/knowledge-hub/:subjectId/:chapterId', (req, res) => {
  const { subjectId, chapterId } = req.params;
  const payload = buildVideoPayload(subjectId, chapterId);
  if (!payload) return res.status(404).json({ ok: false, error: 'Chapter not found' });
  res.json({
    ok: true,
    hub: payload.hub,
    videos: payload.videos,
    video: payload.video,
    validation: payload.validation,
  });
});

app.get('/api/youtube/player-config', (req, res) => {
  res.json(getPlayerConfig());
});

app.get('/api/youtube/validate/:videoId', async (req, res) => {
  const result = await validateVideo(req.params.videoId);
  if (result.reason === 'invalid-id') {
    return res.status(400).json({ ...result, error: 'Invalid YouTube video id' });
  }
  res.json(result);
});

app.get('/api/youtube/search', async (req, res) => {
  const result = await searchVideos(req.query.q, { maxResults: req.query.limit });
  if (result.reason === 'invalid-query') {
    return res.status(400).json({ ...result, error: 'Query must be 2-120 characters' });
  }
  res.json(result);
});

app.post('/api/video/progress', async (req, res) => {
  const { userId: requestedUserId, chapterId, positionSec, durationSec, bookmarked } = req.body || {};
  const userId = resolveUserId(req, requestedUserId);
  if (!userId || !chapterId) return res.status(400).json({ ok: false, error: 'userId and chapterId required' });
  const current = await getProgress(userId);
  await updateProgress(userId, { videoProgress: { ...(current.videoProgress || {}), [chapterId]: { positionSec, durationSec, bookmarked: Boolean(bookmarked), updatedAt: new Date().toISOString() } } });
  res.json({ ok: true, saved: true });
});

/* ---- SPEC-18 Gamification (BYJU's clone) ---- */
app.get('/api/gamify/badges', (req, res) => res.json({ ok: true, badges: getBadges() }));
app.get('/api/gamify/leaderboard', async (req, res) => res.json({ ok: true, leaderboard: await getLeaderboard(Number(req.query.limit) || 20) }));
app.post('/api/gamify/xp', async (req, res) => {
  const { userId: requestedUserId = 'guest', amount, reason } = req.body || {};
  const userId = resolveUserId(req, requestedUserId);
  if (!userId) return res.status(403).json({ ok: false, error: 'Not allowed' });
  if (!amount) return res.status(400).json({ ok: false, error: 'amount required' });
  const result = await awardXp(userId, Number(amount), reason || 'activity');
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
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ClassX Platform API on http://0.0.0.0:${PORT}`);
  console.log(`curriculum: ${getStats().chapters} chapters · ${getStats().questions} questions · ${ragStats().chunks} RAG chunks`);
});
