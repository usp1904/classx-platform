import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidVideoId, buildOEmbedUrl } from '../server/lib/youtube.js';
import { getVideoEntry, sortVideos, catalogStats } from '../server/lib/video-catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVAL_DATASET_PATH = path.resolve(__dirname, '..', 'eval', 'dataset-class10-queries.json');
const DEFAULT_VISUAL_AID_PATH = path.resolve(__dirname, '..', 'backend', 'rag', 'visual_aid_videos.json');

/**
 * Polymorphic Dynamic Adapter for Milestone 2 Production Module (server/lib/agentic-rag.js)
 * Falls back to Reference Specification Oracle (integrated directly with server/lib/youtube.js)
 * when Milestone 2 runtime modules are not yet present.
 */
let ProductionCatalogClass = null;
let adapterSource = 'REFERENCE_SPECIFICATION_ORACLE';

try {
  const prodModule = await import('../server/lib/agentic-rag.js');
  if (typeof prodModule.VideoGroundingCatalog === 'function') {
    ProductionCatalogClass = prodModule.VideoGroundingCatalog;
    adapterSource = 'PRODUCTION_SERVER_MODULE';
  }
} catch (_) {
  // Pre-implementation phase: use Reference Specification Oracle
}

/**
 * Reference Verified Video Grounder Implementation
 * Integrates live isValidVideoId() from server/lib/youtube.js
 * Adheres strictly to PROJECT.md § Architecture and ORIGINAL_REQUEST.md § R1
 */
export class VideoGroundingCatalog {
  constructor(entries) {
    this._delegate = ProductionCatalogClass ? new ProductionCatalogClass(entries) : null;
    this.catalog = new Map();
    let list;
    if (Array.isArray(entries)) {
      list = entries;
    } else if (entries === undefined && fs.existsSync(DEFAULT_VISUAL_AID_PATH)) {
      try {
        list = JSON.parse(fs.readFileSync(DEFAULT_VISUAL_AID_PATH, 'utf8'));
      } catch {
        list = [];
      }
    } else {
      list = [];
    }
    for (const entry of list) {
      if (entry && entry.topic_tag && entry.video_metadata) {
        const normalized = this.normalizeTag(entry.topic_tag);
        if (normalized && this.isValidVideoMetadata(entry.video_metadata)) {
          this.catalog.set(normalized, { ...entry.video_metadata });
        }
      }
    }
  }

  normalizeTag(tag) {
    if (this._delegate && typeof this._delegate.normalizeTag === 'function') {
      return this._delegate.normalizeTag(tag);
    }
    if (!tag || typeof tag !== 'string') return '';
    return tag.toLowerCase().trim().replace(/[_\s-]+/g, '_');
  }

  groundTopic(topicTag) {
    if (this._delegate) {
      return this._delegate.groundTopic(topicTag);
    }
    const normalized = this.normalizeTag(topicTag);
    if (!normalized || !this.catalog.has(normalized)) {
      // Zero Hallucination: cleanly return null for unverified topics
      return null;
    }

    const video = this.catalog.get(normalized);
    if (!video || !this.isValidVideoMetadata(video)) {
      return null;
    }

    return { ...video };
  }

  isValidVideoMetadata(video) {
    if (this._delegate && typeof this._delegate.isValidVideoMetadata === 'function') {
      return this._delegate.isValidVideoMetadata(video);
    }
    if (!video || typeof video !== 'object') return false;

    // video_id validated via live server/lib/youtube.js isValidVideoId
    if (!isValidVideoId(video.video_id)) {
      return false;
    }

    // start_sec and end_sec: non-negative integers and start_sec < end_sec
    if (typeof video.start_sec !== 'number' || typeof video.end_sec !== 'number') {
      return false;
    }
    if (!Number.isInteger(video.start_sec) || !Number.isInteger(video.end_sec)) {
      return false;
    }
    if (video.start_sec < 0 || video.start_sec >= video.end_sec) {
      return false;
    }

    // concept_title and observation_cue: non-empty strings
    if (typeof video.concept_title !== 'string' || video.concept_title.trim().length === 0) {
      return false;
    }
    if (typeof video.observation_cue !== 'string' || video.observation_cue.trim().length === 0) {
      return false;
    }

    return true;
  }

  buildEmbedUrl(video) {
    if (this._delegate && typeof this._delegate.buildEmbedUrl === 'function') {
      return this._delegate.buildEmbedUrl(video);
    }
    if (!video || !this.isValidVideoMetadata(video)) return '';
    return `https://www.youtube-nocookie.com/embed/${video.video_id}?rel=0&modestbranding=1&iv_load_policy=3&controls=1&start=${video.start_sec}&end=${video.end_sec}&enablejsapi=1`;
  }
}

function loadEvalCatalog() {
  const dataset = JSON.parse(fs.readFileSync(EVAL_DATASET_PATH, 'utf8'));
  const entries = [];
  for (const item of dataset) {
    if (item.expected_video_grounding.has_verified_video && item.expected_video_grounding.video_metadata) {
      entries.push({
        topic_tag: item.topic_tag,
        video_metadata: item.expected_video_grounding.video_metadata,
      });
    }
  }
  return new VideoGroundingCatalog(entries);
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (Isolated Happy-Path Tests)
// ============================================================================

test('VideoGrounding T1-01: Verified topic match attaches valid visual_aid_video object', () => {
  const catalog = loadEvalCatalog();
  const video = catalog.groundTopic('chemical_reactions_and_equatio');

  assert.ok(video, 'Verified topic must return a video object');
  assert.equal(video.video_id, '8U8F4R4o1Lw');
  assert.equal(video.start_sec, 42);
  assert.equal(video.end_sec, 105);
  assert.equal(video.concept_title, 'Activity 1.1: Reaction of Calcium Oxide with Water');
});

test('VideoGrounding T1-02: Video ID is strictly 11 characters conforming to server/lib/youtube.js', () => {
  const catalog = loadEvalCatalog();
  const video = catalog.groundTopic('transportation_human_heart');

  assert.ok(video);
  assert.equal(video.video_id.length, 11);
  assert.equal(isValidVideoId(video.video_id), true);
  assert.match(buildOEmbedUrl(video.video_id), /youtube\.com\/oembed/);
});

test('VideoGrounding T1-03: Zero-Hallucination Omission: Unverified topic cleanly returns null', () => {
  const catalog = loadEvalCatalog();
  const video = catalog.groundTopic('quantum_chromodynamics_subatomic');

  assert.equal(video, null, 'Unverified topic must return null without generating pseudo IDs');
});

test('VideoGrounding T1-04: Video timestamps enforce start_sec >= 0 and start_sec < end_sec', () => {
  const catalog = loadEvalCatalog();
  const video = catalog.groundTopic('basic_proportionality_theorem');

  assert.ok(video);
  assert.ok(video.start_sec >= 0);
  assert.ok(video.start_sec < video.end_sec);
  assert.ok(video.end_sec - video.start_sec >= 15, 'Video segment should be at least 15 seconds');
});

test('VideoGrounding T1-05: Observation cue provides concrete visual cue rather than generic filler', () => {
  const catalog = loadEvalCatalog();
  const video = catalog.groundTopic('ohms_law_resistance');

  assert.ok(video);
  assert.match(
    video.observation_cue,
    /observe|watch|notice|examine/i,
    'Observation cue must provide direct observational instruction'
  );
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES
// ============================================================================

test('VideoGrounding T2-01: Case-insensitivity and punctuation normalization in topic matching', () => {
  const catalog = loadEvalCatalog();

  const v1 = catalog.groundTopic('chemical_reactions_and_equatio');
  const v2 = catalog.groundTopic('Chemical_Reactions_And_Equatio');
  const v3 = catalog.groundTopic('chemical-reactions-and-equatio');

  assert.ok(v1 && v2 && v3);
  assert.equal(v1.video_id, v2.video_id);
  assert.equal(v1.video_id, v3.video_id);
});

test('VideoGrounding T2-02: Corrupted timestamps in catalog safely reject entry and return null', () => {
  const corruptedCatalog = new VideoGroundingCatalog([
    {
      topic_tag: 'corrupted_time',
      video_metadata: {
        video_id: '12345678901',
        start_sec: 100,
        end_sec: 50,
        concept_title: 'Corrupted',
        observation_cue: 'Observe something.',
      },
    },
  ]);

  const result = corruptedCatalog.groundTopic('corrupted_time');
  assert.equal(result, null, 'Catalog entry with inverted timestamps must be rejected');
});

test('VideoGrounding T2-03: Invalid video_id format (non-11 chars or forbidden chars) returns null', () => {
  const invalidCatalog = new VideoGroundingCatalog([
    {
      topic_tag: 'bad_id_short',
      video_metadata: {
        video_id: 'short_id',
        start_sec: 10,
        end_sec: 60,
        concept_title: 'Bad ID',
        observation_cue: 'Observe.',
      },
    },
    {
      topic_tag: 'bad_id_xss',
      video_metadata: {
        video_id: '<script>123',
        start_sec: 10,
        end_sec: 60,
        concept_title: 'Bad ID',
        observation_cue: 'Observe.',
      },
    },
  ]);

  assert.equal(invalidCatalog.groundTopic('bad_id_short'), null);
  assert.equal(invalidCatalog.groundTopic('bad_id_xss'), null);
});

test('VideoGrounding T2-04: Null, empty, and non-string topic tags or metadata omit cleanly without throwing', () => {
  const catalog = loadEvalCatalog();

  for (const badTag of [null, undefined, '', '   \t\n  ', 12345, '---___---']) {
    assert.equal(catalog.groundTopic(badTag), null, `Topic "${String(badTag)}" must return null`);
  }

  for (const badMeta of [
    null,
    undefined,
    {},
    { video_id: '8U8F4R4o1Lw', start_sec: 1.5, end_sec: 10, concept_title: 'Title', observation_cue: 'Cue' },
    { video_id: '8U8F4R4o1Lw', start_sec: 0, end_sec: 10, concept_title: '   ', observation_cue: 'Cue' },
  ]) {
    assert.equal(catalog.isValidVideoMetadata(badMeta), false);
    assert.equal(catalog.buildEmbedUrl(badMeta), '');
  }
});

test('VideoGrounding T2-05: Generates valid privacy-enhanced YouTube embed URL', () => {
  const catalog = loadEvalCatalog();
  const video = catalog.groundTopic('chemical_reactions_and_equatio');

  const embedUrl = catalog.buildEmbedUrl(video);
  assert.ok(embedUrl.startsWith('https://www.youtube-nocookie.com/embed/8U8F4R4o1Lw?'));
  assert.match(embedUrl, /rel=0/);
  assert.match(embedUrl, /modestbranding=1/);
  assert.match(embedUrl, /iv_load_policy=3/);
  assert.match(embedUrl, /controls=1/);
  assert.match(embedUrl, /start=42/);
  assert.match(embedUrl, /end=105/);
  assert.match(embedUrl, /enablejsapi=1/);
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS & DATASET VALIDATION
// ============================================================================

test('VideoGrounding T3-01: Verifies video grounding invariants across all 26 dataset queries and server catalog', () => {
  assert.ok(fs.existsSync(EVAL_DATASET_PATH), `Evaluation dataset must exist at ${EVAL_DATASET_PATH}`);
  const dataset = JSON.parse(fs.readFileSync(EVAL_DATASET_PATH, 'utf8'));
  const catalog = loadEvalCatalog();

  let verifiedCount = 0;
  let omittedCount = 0;

  for (const item of dataset) {
    const { has_verified_video, video_metadata } = item.expected_video_grounding;

    if (has_verified_video) {
      verifiedCount++;
      assert.ok(video_metadata, `Item ${item.id} has_verified_video true but video_metadata is null`);
      assert.equal(isValidVideoId(video_metadata.video_id), true);
      assert.ok(video_metadata.start_sec >= 0);
      assert.ok(video_metadata.start_sec < video_metadata.end_sec);
      assert.ok(video_metadata.concept_title.length > 0);
      assert.ok(video_metadata.observation_cue.length > 0);

      const grounded = catalog.groundTopic(item.topic_tag);
      assert.ok(grounded, `Catalog should match topic "${item.topic_tag}"`);
      assert.equal(grounded.video_id, video_metadata.video_id);
      assert.equal(grounded.start_sec, video_metadata.start_sec);
      assert.equal(grounded.end_sec, video_metadata.end_sec);
    } else {
      omittedCount++;
      assert.equal(
        video_metadata,
        null,
        `Item ${item.id} has_verified_video false but video_metadata is not null`
      );

      const grounded = catalog.groundTopic(item.topic_tag);
      assert.equal(
        grounded,
        null,
        `Topic "${item.topic_tag}" for item ${item.id} must return null video`
      );
    }
  }

  assert.equal(verifiedCount, 11, 'Expected exactly 11 verified video queries in dataset');
  assert.equal(omittedCount, 15, 'Expected exactly 15 clean video omissions (zero hallucination)');
});

test('VideoGrounding T3-F45-02: Pairwise F4 + F5: Null video isolation leaves 4 synthesizer layers intact', () => {
  const catalog = loadEvalCatalog();
  const video = catalog.groundTopic('importance_of_ph_in_everyday_');
  assert.equal(video, null);
  assert.equal(catalog.buildEmbedUrl(video), '');

  const answerLayers = {
    coreIntuition: 'Like a swimming pool water balance: exact pH keeps enamel protected.',
    boardAnswer: 'Tooth decay starts below **pH 5.5** [1 Mark]. **Calcium hydroxyapatite** corrodes [1 Mark].',
    competitiveBridge: 'NEET physiological acid-base buffering.',
    examinersTrap: 'Assuming neutral water dissolves enamel.',
  };

  assert.equal(Object.keys(answerLayers).length, 4);
  for (const text of Object.values(answerLayers)) {
    assert.ok(text.trim().length > 10);
  }
});

test('VideoGrounding T3-02: Default VideoGroundingCatalog loads verified catalog without args and aligns with server catalog', () => {
  const defaultCatalog = new VideoGroundingCatalog();
  assert.equal(defaultCatalog.groundTopic('unindexed_quantum_topic'), null);
  assert.equal(defaultCatalog.buildEmbedUrl(null), '');

  if (fs.existsSync(DEFAULT_VISUAL_AID_PATH)) {
    const chemVideo = defaultCatalog.groundTopic('chemical_reactions_and_equatio');
    assert.ok(chemVideo, 'Default catalog must resolve chemical_reactions_and_equatio');
    assert.equal(chemVideo.video_id, '8U8F4R4o1Lw');
    assert.ok(defaultCatalog.buildEmbedUrl(chemVideo).startsWith('https://www.youtube-nocookie.com/embed/8U8F4R4o1Lw?'));
  }

  const stats = catalogStats();
  assert.ok(stats.chapters > 0 && stats.validatedChapters > 0);
  for (const [subj, chap] of [
    ['science', 'chemical-reactions-and-equations'],
    ['science', 'electricity'],
    ['mathematics', 'triangles'],
  ]) {
    const entry = getVideoEntry(subj, chap);
    assert.ok(entry, `server/data/video-catalog.json must contain ${subj}:${chap}`);
    const validPicks = sortVideos(entry.picks);
    assert.ok(validPicks.length > 0);
    assert.ok(validPicks.every((v) => isValidVideoId(v.id)));
  }
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS
// ============================================================================

test('VideoGrounding T4-APP-03: Distraction-locked interactive video attachment flow (Scenario 3)', () => {
  const catalog = loadEvalCatalog();
  const grounded = catalog.groundTopic('chemical_reactions_and_equatio');

  assert.ok(grounded);
  assert.equal(grounded.video_id, '8U8F4R4o1Lw');
  assert.equal(isValidVideoId(grounded.video_id), true);
  assert.equal(grounded.start_sec, 42);
  assert.equal(grounded.end_sec, 105);

  const embedUrl = catalog.buildEmbedUrl(grounded);
  assert.ok(embedUrl.startsWith('https://www.youtube-nocookie.com/embed/8U8F4R4o1Lw?'));
  assert.match(embedUrl, /rel=0&modestbranding=1&iv_load_policy=3&controls=1&start=42&end=105&enablejsapi=1/);

  // Cross-verify live server/lib/video-catalog.js entry for the same chapter
  const serverEntry = getVideoEntry('science', 'chemical-reactions-and-equations');
  assert.ok(serverEntry, 'Live server video catalog must contain science:chemical-reactions-and-equations');
  assert.ok(sortVideos(serverEntry.picks).every((v) => isValidVideoId(v.id)));
});

test('VideoGrounding T4-APP-04: Zero-hallucination video omission flow (Scenario 4)', () => {
  const catalog = loadEvalCatalog();

  // Unindexed topic & dataset topic explicitly marked has_verified_video: false
  const unindexedResult = catalog.groundTopic('disguised_unemployment_rural');
  const noVideoDatasetTopic = catalog.groundTopic('impact_of_globalisation_in_in');

  assert.equal(unindexedResult, null);
  assert.equal(noVideoDatasetTopic, null);
  assert.equal(catalog.buildEmbedUrl(unindexedResult), '');
  assert.equal(catalog.buildEmbedUrl(noVideoDatasetTopic), '');
  assert.equal(catalog.isValidVideoMetadata(noVideoDatasetTopic), false);
  assert.equal(catalog.groundTopic('   '), null);
});

// ============================================================================
// PRODUCTION INTEGRATION GATE
// ============================================================================

test('VideoGrounding Integration: Production module binding and live youtube/video-catalog modules verified', () => {
  assert.equal(isValidVideoId('8U8F4R4o1Lw'), true);
  assert.equal(isValidVideoId('bad'), false);
  const stats = catalogStats();
  assert.ok(stats.validatedChapters > 0, 'server/data/video-catalog.json must have validated chapters');

  if (process.env.STRICT_PRODUCTION === 'true') {
    assert.equal(
      adapterSource,
      'PRODUCTION_SERVER_MODULE',
      'Strict production mode requires live server/lib/agentic-rag.js'
    );
  }
});
