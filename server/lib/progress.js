import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, '..', 'data', 'progress.json');
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

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { users: {} };
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, FILE);
}

export function getProgress(userId = 'guest') {
  const store = readStore();
  return { ...DEFAULTS, ...(store.users?.[userId] || {}), userId };
}

export function updateProgress(userId = 'guest', patch = {}) {
  const store = readStore();
  store.users ||= {};
  const current = { ...DEFAULTS, ...(store.users[userId] || {}), userId };
  const allowed = ['xp', 'streak', 'completedChapters', 'chapterMinutes', 'practice', 'exams', 'recent', 'planChecks', 'bookmarks', 'badges'];
  const next = { ...current };
  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    if (key === 'xp' || key === 'streak') next[key] = Math.max(0, Number(patch[key]) || 0);
    else if (['completedChapters', 'chapterMinutes', 'practice', 'planChecks'].includes(key) && typeof patch[key] === 'object') next[key] = { ...current[key], ...patch[key] };
    else if (Array.isArray(patch[key])) next[key] = patch[key].slice(0, 40);
  }
  next.lastActive = new Date().toISOString();
  next.updatedAt = next.lastActive;
  store.users[userId] = next;
  writeStore(store);
  return next;
}

// Gamification: award XP and recompute badges.
export function awardXp(userId = 'guest', amount, reason) {
  const current = getProgress(userId);
  const nextXp = current.xp + amount;
  const updated = updateProgress(userId, { xp: nextXp });
  const earned = awardBadges(userId, updated);
  return { xp: updated.xp, badges: earned, reason };
}

function awardBadges(userId, progress) {
  const store = readStore();
  const current = { ...DEFAULTS, ...(store.users[userId] || {}), userId };
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
    updateProgress(userId, { xp: progress.xp + bonusXp, badges: [...already] });
  }
  return earned;
}

export function getBadges() {
  return BADGES;
}

export function getLeaderboard(limit = 20) {
  const store = readStore();
  const users = Object.values(store.users || {}).map((u) => ({
    userId: u.userId,
    xp: u.xp || 0,
    streak: u.streak || 1,
    completedChapters: Object.keys(u.completedChapters || {}).length,
    badges: (u.badges || []).length,
    lastActive: u.lastActive,
  }));
  users.sort((a, b) => b.xp - a.xp);
  return users.slice(0, limit);
}

// Parent dashboard: read-only progress view for a linked child.
export function getParentView(childUserId) {
  const progress = getProgress(childUserId);
  return {
    childUserId,
    xp: progress.xp,
    streak: progress.streak,
    completedChapters: Object.keys(progress.completedChapters || {}).length,
    practice: progress.practice,
    exams: (progress.exams || []).slice(-10),
    badges: progress.badges || [],
    recent: progress.recent || [],
    lastActive: progress.lastActive,
  };
}

export function linkParent(childUserId) {
  return { linked: true, childUserId, linkedAt: new Date().toISOString() };
}
