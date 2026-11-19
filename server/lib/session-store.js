let redisClient = null;
let redisReady = false;

// In-memory fallback so auth/progress keep working when Redis is not provisioned.
// Entries carry their own expiry; ttlSeconds = 0 means "never expire".
const memory = new Map();

function memorySet(id, data, ttlSeconds) {
  const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
  memory.set(id, { data, expiresAt });
}

function memoryGet(id) {
  const entry = memory.get(id);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memory.delete(id);
    return null;
  }
  return entry.data;
}

function memoryDel(id) {
  return memory.delete(id);
}

function memoryPrune() {
  const now = Date.now();
  let removed = 0;
  for (const [id, entry] of memory) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      memory.delete(id);
      removed += 1;
    }
  }
  return removed;
}

export async function initRedis({ url = 'redis://127.0.0.1:6379' } = {}) {
  if (redisClient) return redisClient;
  // Loaded lazily: the redis package costs ~10s of module init on Windows,
  // and Redis is optional (memory fallback), so it must not block boot.
  const { createClient } = await import('redis');
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

export function sessionStoreKind() {
  return redisReady ? 'redis' : 'memory';
}

/**
 * Session store with TTL. Uses Redis when available, otherwise an in-process
 * Map so account registration/login and progress survive without Redis.
 */
const SESSION_PREFIX = 'classx:sess:';
const DEFAULT_TTL_SECONDS = 3 * 60 * 60; // 3 hours

function key(id) {
  return `${SESSION_PREFIX}${id}`;
}

export async function sessionSet(id, data, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!isRedisReady()) {
    memorySet(id, data, ttlSeconds);
    return true;
  }
  if (ttlSeconds > 0) {
    await redisClient.setEx(key(id), ttlSeconds, JSON.stringify(data));
  } else {
    await redisClient.set(key(id), JSON.stringify(data));
  }
  return true;
}

export async function sessionGet(id) {
  if (!isRedisReady()) return memoryGet(id);
  const raw = await redisClient.get(key(id));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function sessionDel(id) {
  if (!isRedisReady()) return memoryDel(id);
  await redisClient.del(key(id));
  return true;
}

export async function sessionExists(id) {
  if (!isRedisReady()) return memoryGet(id) !== null;
  const exists = await redisClient.exists(key(id));
  return exists === 1;
}

export async function sessionList(kind) {
  if (!isRedisReady()) {
    const out = [];
    for (const id of memory.keys()) {
      const data = memoryGet(id);
      if (data && (!kind || data.kind === kind)) out.push({ id, ...data });
    }
    return out;
  }
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
  if (!isRedisReady()) return memoryPrune();
  // Redis TTL handles expiry automatically; this is a no-op kept for API compat.
  return 0;
}

export async function redisFlush() {
  if (!isRedisReady()) {
    const size = memory.size;
    memory.clear();
    return size > 0;
  }
  await redisClient.flushDb();
  return true;
}
