import { createClient } from 'redis';

let redisClient = null;
let redisReady = false;

export async function initRedis({ url = 'redis://127.0.0.1:6379' } = {}) {
  if (redisClient) return redisClient;
  redisClient = createClient({ url });
  redisClient.on('error', (err) => {
    console.error('[redis] client error:', err.message);
    redisReady = false;
  });
  redisClient.on('connect', () => { redisReady = true; });
  redisClient.on('reconnecting', () => { redisReady = false; });
  await redisClient.connect();
  redisReady = true;
  return redisClient;
}

export function getRedis() {
  return redisClient;
}

export function isRedisReady() {
  return redisReady;
}

/**
 * Redis-backed session store with TTL.
 * Replaces the in-memory Map in practice.js so sessions survive restarts
 * and scale across PM2 instances.
 */
const SESSION_PREFIX = 'classx:sess:';
const DEFAULT_TTL_SECONDS = 3 * 60 * 60; // 3 hours

async function key(id) {
  return `${SESSION_PREFIX}${id}`;
}

export async function sessionSet(id, data, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!isRedisReady()) return false;
  await redisClient.setEx(key(id), ttlSeconds, JSON.stringify(data));
  return true;
}

export async function sessionGet(id) {
  if (!isRedisReady()) return null;
  const raw = await redisClient.get(key(id));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function sessionDel(id) {
  if (!isRedisReady()) return false;
  await redisClient.del(key(id));
  return true;
}

export async function sessionExists(id) {
  if (!isRedisReady()) return false;
  const exists = await redisClient.exists(key(id));
  return exists === 1;
}

export async function sessionList(kind) {
  if (!isRedisReady()) return [];
  const keys = await redisClient.keys(`${SESSION_PREFIX}*`);
  const out = [];
  for (const k of keys) {
    const raw = await redisClient.get(k);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (!kind || data.kind === kind) out.push({ id: k.replace(SESSION_PREFIX, ''), ...data });
    } catch { continue; }
  }
  return out;
}

export async function sessionPrune() {
  // Redis TTL handles expiry automatically; this is a no-op kept for API compat.
  return 0;
}

export async function redisFlush() {
  if (!isRedisReady()) return false;
  await redisClient.flushDb();
  return true;
}
