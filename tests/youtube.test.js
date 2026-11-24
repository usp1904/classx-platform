import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOEmbedUrl,
  getPlayerConfig,
  isValidVideoId,
  sanitizeEmbedBase,
  sanitizeOrigin,
  searchVideos,
  validateVideo,
} from '../server/lib/youtube.js';
import { searchCatalog } from '../server/lib/video-catalog.js';
import {
  buildEmbedUrl,
  buildThumbnailUrl,
  buildWatchUrl,
  describeEmbedError,
  describeValidationFailure,
  normalizeOrigin,
} from '../web/src/lib/youtube.ts';

const VIDEO_ID = 'dQw4w9WgXcQ';

test('youtube: video id validation accepts 11-character ids only', () => {
  assert.equal(isValidVideoId(VIDEO_ID), true);
  assert.equal(isValidVideoId('short'), false);
  assert.equal(isValidVideoId('dQw4w9WgXcQ?autoplay=1'), false);
  assert.equal(isValidVideoId(''), false);
});

test('youtube: oEmbed URL uses public metadata endpoint without an API key', () => {
  const url = new URL(buildOEmbedUrl(VIDEO_ID));
  assert.equal(url.hostname, 'www.youtube.com');
  assert.equal(url.pathname, '/oembed');
  assert.equal(url.searchParams.get('url'), `https://www.youtube.com/watch?v=${VIDEO_ID}`);
  assert.equal(url.searchParams.get('format'), 'json');
  assert.equal(url.searchParams.has('key'), false);
  assert.equal(url.searchParams.has('part'), false);
});

test('youtube: invalid ids are rejected before any network call', async () => {
  const result = await validateVideo('bad');
  assert.equal(result.ok, false);
  assert.equal(result.validated, false);
  assert.equal(result.reason, 'invalid-id');
  assert.throws(() => buildOEmbedUrl('nope'), /Invalid YouTube video id/);
});

test('youtube: local catalog search is keyless, bounded, and safety-filtered', () => {
  const result = searchVideos('real numbers', { maxResults: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.source, 'local-catalog');
  assert.ok(result.items.length > 0);
  assert.ok(result.items.length <= 3);
  for (const item of result.items) {
    assert.equal(isValidVideoId(item.videoId), true);
    assert.equal(typeof item.title, 'string');
    assert.ok(item.chapterId);
  }
});

test('youtube: catalog search deduplicates videos and clamps limits', () => {
  const wide = searchCatalog('class 10 maths', 100);
  const ids = wide.map((item) => item.videoId);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(wide.length <= 25);
});

test('youtube: search rejects empty and oversized queries', () => {
  assert.equal(searchVideos('').reason, 'invalid-query');
  assert.equal(searchVideos('real numbers').ok, true);
  assert.equal(searchVideos('x'.repeat(121)).reason, 'invalid-query');
});

test('youtube: player config has no Google API dependency', () => {
  const config = getPlayerConfig();
  assert.equal(config.ok, true);
  assert.equal(config.educationEnabled, false);
  assert.equal(config.educationBase, null);
  assert.equal('apiKey' in config, false);
});

test('youtube: standard embed uses privacy-enhanced host and required params', () => {
  const src = buildEmbedUrl({ videoId: VIDEO_ID, origin: 'https://classx.example', start: 42 });
  const url = new URL(src);
  assert.equal(url.hostname, 'www.youtube-nocookie.com');
  assert.equal(url.pathname, `/embed/${VIDEO_ID}`);
  assert.equal(url.searchParams.get('rel'), '0');
  assert.equal(url.searchParams.get('modestbranding'), '1');
  assert.equal(url.searchParams.get('playsinline'), '1');
  assert.equal(url.searchParams.get('origin'), 'https://classx.example');
  assert.equal(url.searchParams.get('start'), '42');
});

test('youtube: education embed uses partner base and session token', () => {
  const src = buildEmbedUrl({
    videoId: VIDEO_ID,
    mode: 'education',
    origin: 'https://classx.example',
    educationBase: 'https://youtubeeducation.com/embed/',
    educationToken: 'short-lived-token',
    start: 10,
  });
  const url = new URL(src);
  assert.equal(url.hostname, 'youtubeeducation.com');
  assert.equal(url.pathname, `/embed/${VIDEO_ID}`);
  assert.equal(url.searchParams.get('session_token'), 'short-lived-token');
  assert.equal(url.searchParams.get('origin'), 'https://classx.example');
  assert.equal(url.searchParams.get('start'), '10');
});

test('youtube: invalid ids are rejected by URL builders', () => {
  assert.throws(() => buildEmbedUrl({ videoId: 'nope' }), /Invalid YouTube video id/);
  assert.throws(() => buildWatchUrl('nope'), /Invalid YouTube video id/);
  assert.throws(() => buildThumbnailUrl('nope'), /Invalid YouTube video id/);
  assert.equal(buildWatchUrl(VIDEO_ID), `https://www.youtube.com/watch?v=${VIDEO_ID}`);
  assert.equal(buildThumbnailUrl(VIDEO_ID), `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
});

test('youtube: origin and base sanitizers reject unsafe values', () => {
  assert.equal(normalizeOrigin('javascript:alert(1)'), null);
  assert.equal(normalizeOrigin('https://classx.example/path'), 'https://classx.example');
  assert.equal(sanitizeOrigin('http://localhost:8787'), 'http://localhost:8787');
  assert.equal(sanitizeEmbedBase('http://youtubeeducation.com'), null);
  assert.equal(sanitizeEmbedBase('https://youtubeeducation.com/embed/'), 'https://youtubeeducation.com/embed');
});

test('youtube: error copy explains domain allowlist for 150 and 153', () => {
  assert.match(describeEmbedError(150), /allowlist/);
  assert.match(describeEmbedError(153), /allowlist/);
  assert.match(describeEmbedError(101), /embed/);
  assert.equal(describeEmbedError(999), 'YouTube could not play this lesson here.');
});

test('youtube: validation failure copy stays actionable', () => {
  assert.match(
    describeValidationFailure({ ok: false, videoId: VIDEO_ID, validated: true, reason: 'not-found' }),
    /removed or is unavailable/,
  );
  assert.match(
    describeValidationFailure({ ok: false, videoId: VIDEO_ID, validated: true, reason: 'not-embeddable' }),
    /embedding/,
  );
});
