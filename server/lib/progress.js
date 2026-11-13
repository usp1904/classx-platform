import { sessionSet, sessionGet, isRedisReady } from './session-store.js';

const DEFAULTS = {
  userId: 'guest',
  xp: 0,
  streak: 1,
  lastActive: null,
  completedChapters: {},
  chapterMinutes: {},
  practice: { attempts: 0, correct: 0, answered: 0 },
  exams: [],
  recent: [],
  planChecks: {},
  bookmarks: [],
  badges: [],
  updatedAt: null,
};

const BADGES = [
  { id: 'first-lesson', name: 'First Lesson', xp: 50, condition: (p) => Object.keys(p.completedChapters || {}).length >= 1 },
  { id: 'streak-7', name: '7-Day Streak', xp: 200, condition: (p) => p.streak >= 7 },
  { id: 'perfect-mock', name: 'Perfect Mock', xp: 300, condition: (p) => (p.exams || []).some((e) => e.score === 100) },
  { id: 'fifty-questions', name: '50 Questions', xp: 150, condition: (p) => (p.practice && p.practice.answered || 0) >= 50 },
  { id: 'scholar', name: 'Scholar', xp: 500, condition: (p) => p.xp >= 1000 },
];

function progressKey(userId) {
  return `classx:progress:${userId}`;
}

async function readProgress(userId) {
  if (isRedisReady()) {
    const raw = await sessionGet(progressKey(userId));
    if (raw) return raw;
  }
  return null;
}

async function writeProgress(userId, data) {
  if (isRedisReady()) {
    await sessionSet(progressKey(userId), data, 0); // persistent, no TTL
    return;
  }
  // file-based fallback (single-instance dev)
  const fs = await import('node:fs');
  const path = await import('node:path');
  const FILE = path.resolve(process.cwd(), 'server', 'data', 'progress.json');
  let store = { users: {} };
  try { store = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* ignore */ }
  store.users ||= {};
  store.users[userId] = data;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, FILE);
}

export async function getProgressAsync(userId = 'guest') {
  const stored = await readProgress(userId);
  return { ...DEFAULTS, ...stored, userId };
}

export async function updateProgressAsync(userId = 'guest', patch = {}) {
  const current = await getProgressAsync(userId);
  const allowed = ['xp', 'streak', 'completedChapters', 'chapterMinutes', 'practice', 'exams', 'recent', 'planChecks', 'bookmarks', 'badges'];
  const next = { ...current };
  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    if (key === 'xp' || key === 'streak') next[key] = Math.max(0, Number(patch[key]) || 0);
    else if (['completedChapters', 'chapterMinutes', 'practice', 'planChecks'].includes(key) && typeof patch[key] === 'object') next[key] = { ...current[key], ...patch[key] };
    else if (Array.isArray(patch[key])) next[key] = patch[key].slice(0, 40);
  }
  const now = new Date().toISOString();
  next.lastActive = now;
  next.updatedAt = now;
  await writeProgress(userId, next);
  return next;
}

export async function awardXpAsync(userId = 'guest', amount, reason) {
  const current = await getProgressAsync(userId);
  const nextXp = current.xp + amount;
  const updated = await updateProgressAsync(userId, { xp: nextXp });
  const earned = await awardBadgesAsync(userId, updated);
  return { xp: updated.xp, badges: earned, reason };
}

async function awardBadgesAsync(userId, progress) {
  const current = await getProgressAsync(userId);
  const already = new Set(current.badges || []);
  const earned = [];
  for (const badge of BADGES) {
    if (already.has(badge.id)) continue;
    if (badge.condition(progress)) {
      already.add(badge.id);
      earned.push({ id: badge.id, name: badge.name, xp: badge.xp });
    }
  }
  if (earned.length) {
    const bonusXp = earned.reduce((sum, b) => sum + b.xp, 0);
    await updateProgressAsync(userId, { xp: progress.xp + bonusXp, badges: [...already] });
  }
  return earned;
}

export function getBadges() {
  return BADGES;
}

export async function getLeaderboard(limit = 20) {
  if (!isRedisReady()) return [];
  // Production: maintain a Redis sorted set for leaderboard. Simplified here.
  return [];
}

export function getParentView(childUserId) {
  return {
    childUserId,
    xp: 0,
    streak: 1,
    completedChapters: 0,
    practice: { attempts: 0, correct: 0, answered: 0 },
    exams: [],
    badges: [],
    recent: [],
    lastActive: null,
  };
}

export function linkParent(childUserId) {
  return { linked: true, childUserId, linkedAt: new Date().toISOString() };
}
