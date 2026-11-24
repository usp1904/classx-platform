import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_FILE = path.resolve(__dirname, '..', 'data', 'video-catalog.json');

const SAFETY_BLOCK = [
  'porn', 'xxx', 'nude', 'erotic', 'sex video', 'bdsm', 'fetish',
  'onlyfans', 'adult content', 'webcam girl', 'strip tease',
];

let catalog = { generatedAt: null, validation: null, entries: [] };
try {
  catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
} catch {
  catalog = { generatedAt: null, validation: null, entries: [] };
}

const entries = new Map(
  (catalog.entries || []).map((entry) => [`${entry.subjectId}:${entry.chapterId}`, entry]),
);

function isSafe(video) {
  const text = `${video.title || ''} ${video.channel || ''} ${video.validatedTitle || ''} ${video.validatedAuthor || ''}`.toLowerCase();
  return !SAFETY_BLOCK.some((word) => text.includes(word));
}

function durationRank(video) {
  const seconds = Number(video.durationSec) || 0;
  if (seconds >= 600 && seconds <= 4200) return 0;
  if (seconds >= 420 && seconds < 600) return 1;
  if (seconds > 4200 && seconds <= 5400) return 2;
  if (seconds > 0) return 3 + Math.abs(seconds - 1800) / 100000;
  return 4;
}

export function sortVideos(videos = []) {
  return [...videos]
    .filter((video) => video && video.id && isSafe(video))
    .sort((a, b) => durationRank(a) - durationRank(b) || Number(b.score || 0) - Number(a.score || 0));
}

export function getVideoEntry(subjectId, chapterId) {
  const entry = entries.get(`${subjectId}:${chapterId}`);
  if (!entry) return null;
  const videos = sortVideos(entry.picks || []);
  if (!videos.length) return null;
  return {
    ...entry,
    picks: videos,
    primary: videos[0],
    validation: {
      provider: 'youtube',
      method: catalog.validation || 'YouTube oEmbed verification',
      generatedAt: catalog.generatedAt,
      verified: true,
      safetyFilter: 'adult/obscene keywords blocked before serving',
    },
  };
}

export function getPrimaryVideo(subjectId, chapterId) {
  return getVideoEntry(subjectId, chapterId)?.primary || null;
}

export function searchCatalog(query, limit = 12) {
  const normalized = String(query || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalized.length < 2) return [];
  const terms = normalized.split(' ').filter(Boolean).slice(0, 8);
  const maxResults = Math.min(25, Math.max(1, Number(limit) || 12));
  const seen = new Set();
  const results = [];

  for (const entry of entries.values()) {
    for (const video of sortVideos(entry.picks || [])) {
      if (seen.has(video.id)) continue;
      const haystack = [
        entry.subjectName,
        entry.subjectId,
        entry.chapterName,
        entry.chapterId,
        video.title,
        video.channel,
        video.validatedTitle,
        video.validatedAuthor,
      ].filter(Boolean).join(' ').toLowerCase();
      const matches = terms.filter((term) => haystack.includes(term)).length;
      if (!matches) continue;
      seen.add(video.id);
      results.push({
        videoId: video.id,
        title: video.title || video.validatedTitle || '',
        channel: video.channel || video.validatedAuthor || '',
        publishedAt: video.published || null,
        thumbnail: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
        duration: video.length || null,
        subjectId: entry.subjectId,
        chapterId: entry.chapterId,
        chapterName: entry.chapterName || '',
        subjectName: entry.subjectName || '',
        relevance: (haystack.includes(normalized) ? 2 : 0) + matches / terms.length,
        score: Number(video.score) || 0,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance || b.score - a.score)
    .slice(0, maxResults)
    .map(({ relevance, score, ...item }) => item);
}

export function catalogStats() {
  const all = [...entries.values()];
  return {
    chapters: all.length,
    validatedChapters: all.filter((entry) => sortVideos(entry.picks || []).length > 0).length,
    generatedAt: catalog.generatedAt,
    validation: catalog.validation,
  };
}
