import { searchCatalog } from './video-catalog.js';

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function isValidVideoId(value) {
  return typeof value === 'string' && VIDEO_ID_PATTERN.test(value);
}

export function sanitizeOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function sanitizeEmbedBase(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function buildOEmbedUrl(videoId) {
  if (!isValidVideoId(videoId)) throw new Error('Invalid YouTube video id');
  const params = new URLSearchParams({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    format: 'json',
  });
  return `https://www.youtube.com/oembed?${params.toString()}`;
}

async function fetchOEmbed(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export async function validateVideo(videoId) {
  if (!isValidVideoId(videoId)) {
    return { ok: false, validated: false, videoId: String(videoId || ''), reason: 'invalid-id' };
  }

  const cacheKey = `validate:${videoId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const result = await fetchOEmbed(buildOEmbedUrl(videoId));
  if (!result.ok) {
    const value = [401, 403, 404].includes(result.status)
      ? { ok: false, validated: true, videoId, reason: 'not-found' }
      : {
          ok: true,
          validated: false,
          videoId,
          reason: result.error === 'timeout' ? 'validation-timeout' : 'validation-unavailable',
        };
    cacheSet(cacheKey, value);
    return value;
  }

  const value = {
    ok: true,
    validated: true,
    videoId,
    reason: null,
    verifiedBy: 'youtube-oembed',
    title: typeof result.payload?.title === 'string' ? result.payload.title : '',
    author: typeof result.payload?.author_name === 'string' ? result.payload.author_name : '',
    thumbnailUrl: typeof result.payload?.thumbnail_url === 'string' ? result.payload.thumbnail_url : null,
  };
  cacheSet(cacheKey, value);
  return value;
}

function normalizeQuery(query) {
  return typeof query === 'string' ? query.trim().replace(/\s+/g, ' ') : '';
}

export function searchVideos(query, options = {}) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2 || normalized.length > 120) {
    return { ok: false, items: [], reason: 'invalid-query' };
  }

  const maxResults = Math.min(25, Math.max(1, Number(options.maxResults) || 12));
  const items = searchCatalog(normalized, maxResults);
  return {
    ok: true,
    items,
    source: 'local-catalog',
    reason: items.length ? null : 'no-results',
  };
}

export function getPlayerConfig() {
  const base = sanitizeEmbedBase(process.env.YOUTUBE_EDU_EMBED_BASE);
  const token = typeof process.env.YOUTUBE_EDU_SESSION_TOKEN === 'string'
    ? process.env.YOUTUBE_EDU_SESSION_TOKEN.trim()
    : '';
  const educationEnabled = String(process.env.YOUTUBE_EDU_ENABLED || '').toLowerCase() === 'true' && Boolean(base);

  return {
    ok: true,
    educationEnabled,
    educationBase: educationEnabled ? base : null,
    educationToken: educationEnabled && token ? token : null,
    origin: sanitizeOrigin(process.env.YOUTUBE_ORIGIN),
  };
}
