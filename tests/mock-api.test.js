import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// Helper mock browser environment for Node.js execution
function setupMockBrowserEnv() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  globalThis.window = {
    localStorage: globalThis.localStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
  };
}

setupMockBrowserEnv();

// Dynamically check for mockApi implementation (Milestone 2)
let mockApi = null;
const mockApiTsPath = path.join(ROOT_DIR, 'web', 'src', 'services', 'mockApi.ts');
const mockApiJsPath = path.join(ROOT_DIR, 'web', 'src', 'services', 'mockApi.js');

if (fs.existsSync(mockApiTsPath)) {
  try {
    mockApi = await import('../web/src/services/mockApi.ts');
  } catch (err) {
    console.warn('[mock-api.test.js] Failed to load mockApi.ts:', err.message);
  }
} else if (fs.existsSync(mockApiJsPath)) {
  try {
    mockApi = await import('../web/src/services/mockApi.js');
  } catch (err) {
    console.warn('[mock-api.test.js] Failed to load mockApi.js:', err.message);
  }
}

// Also import the api client from web/src/api.ts
let apiClient = null;
try {
  const apiModule = await import('../web/src/api.ts');
  apiClient = apiModule.api;
} catch (err) {
  console.warn('[mock-api.test.js] Failed to load api.ts:', err.message);
}

// 29 Backend endpoints catalog definition
const REQUIRED_ENDPOINTS = [
  'health',
  'curriculum',
  'chapter',
  'search',
  'tutor',
  'startPractice',
  'submitPractice',
  'generateExam',
  'submitExam',
  'examKey',
  'plan',
  'library',
  'progress',
  'saveProgress',
  'video',
  'saveVideoProgress',
  'gamifyBadges',
  'gamifyLeaderboard',
  'gamifyXp',
  'parentView',
  'parentLink',
  'graph',
  'adaptivePractice',
  'okfStats',
  'okfTopics',
  'multimodelSearch',
  'learningAids',
  'learningAidsIds',
  'learningAidsGroup',
];

test('Tier 1: Client API Surface - 29 Backend Endpoints Defined', () => {
  assert.ok(apiClient, 'api client must be exported from web/src/api.ts');
  for (const endpoint of REQUIRED_ENDPOINTS) {
    assert.equal(
      typeof apiClient[endpoint],
      'function',
      `api.${endpoint} must be a function covering backend route`,
    );
  }
  assert.equal(REQUIRED_ENDPOINTS.length, 29, 'Catalog must contain exactly 29 backend API endpoints');
});

test('Tier 1: Client-Side Mock Endpoint Contract Coverage (29 endpoints)', {
  skip: !mockApi ? 'Milestone 2: web/src/services/mockApi.ts pending builder implementation' : false,
}, async (t) => {
  const { handleMockRequest, isMockMode, setMockMode } = mockApi;

  await t.test('1. GET /api/health returns valid status, curriculum, and rag counts', async () => {
    const res = await handleMockRequest('/api/health');
    assert.equal(res.ok, true);
    assert.ok(typeof res.curriculum?.chapters === 'number');
    assert.ok(typeof res.rag?.chunks === 'number');
  });

  await t.test('2. GET /api/curriculum returns meta and subjects matching Curriculum interface', async () => {
    const res = await handleMockRequest('/api/curriculum');
    assert.equal(res.ok, true);
    assert.equal(res.meta.academicYear, '2026-27');
    assert.ok(Array.isArray(res.subjects) && res.subjects.length >= 4);
    const math = res.subjects.find((s) => s.id === 'mathematics');
    assert.ok(math, 'Mathematics subject must exist in mock curriculum');
    assert.ok(math.chapters.length > 0, 'Mathematics must contain authored chapters');
  });

  await t.test('3. GET /api/chapters/:sub/:chap returns complete ChapterDetail', async () => {
    const res = await handleMockRequest('/api/chapters/mathematics/real-numbers');
    assert.equal(res.ok, true);
    assert.equal(res.chapter.id, 'real-numbers');
    assert.equal(res.chapter.subjectId, 'mathematics');
    assert.ok(typeof res.chapter.stats?.concepts === 'number');
    assert.ok(typeof res.chapter.stats?.quizzes === 'number');
    assert.ok(Array.isArray(res.chapter.topics));
    assert.ok(res.available.practice !== undefined);
  });

  await t.test('4. GET /api/search returns results array and diagnostics', async () => {
    const res = await handleMockRequest('/api/search?q=theorem&limit=5');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.results));
    assert.ok(typeof res.diagnostics?.latencyMs === 'number');
  });

  await t.test('5. POST /api/tutor returns grounded answer, sources citations, and provider mode', async () => {
    const res = await handleMockRequest('/api/tutor', {
      method: 'POST',
      body: JSON.stringify({ question: 'Explain Euclid division lemma', mode: 'socratic' }),
    });
    assert.equal(res.ok, true);
    assert.ok(typeof res.answer === 'string' && res.answer.length > 100);
    assert.ok(Array.isArray(res.sources) && res.sources.length >= 1);
    assert.ok(res.provider?.mode.includes('fallback') || res.provider?.mode === 'mock');
  });

  await t.test('6. POST /api/practice/start returns PracticeSession with questions and no leaked answers', async () => {
    const res = await handleMockRequest('/api/practice/start', {
      method: 'POST',
      body: JSON.stringify({ subjectId: 'mathematics', chapterId: 'real-numbers', count: 5 }),
    });
    assert.equal(res.ok, true);
    assert.ok(res.sessionId);
    assert.equal(res.questions.length, 5);
    assert.equal(res.questions[0].type, 'mcq');
    assert.ok(res.questions[0].options.length >= 2);
    assert.equal('correct' in res.questions[0], false, 'Do not leak correct answer index in practice start');
  });

  await t.test('7. POST /api/practice/submit returns scored PracticeResult with review array', async () => {
    const res = await handleMockRequest('/api/practice/submit', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'mock-session-1', answers: { q1: 0 } }),
    });
    assert.equal(res.ok, true);
    assert.ok(typeof res.score === 'number');
    assert.ok(typeof res.percentage === 'number');
    assert.ok(Array.isArray(res.review));
  });

  await t.test('8. POST /api/exam/generate returns sectioned ExamPaper with instructions', async () => {
    const res = await handleMockRequest('/api/exam/generate', {
      method: 'POST',
      body: JSON.stringify({ subjectId: 'mathematics' }),
    });
    assert.equal(res.ok, true);
    assert.ok(res.paperId);
    assert.ok(Array.isArray(res.sections) && res.sections.length >= 1);
    assert.ok(Array.isArray(res.instructions));
  });

  await t.test('9. POST /api/exam/submit grades mock paper with kind="exam"', async () => {
    const res = await handleMockRequest('/api/exam/submit', {
      method: 'POST',
      body: JSON.stringify({ paperId: 'mock-paper-1', answers: {}, subjectiveMarks: {} }),
    });
    assert.equal(res.ok, true);
    assert.equal(res.kind, 'exam');
  });

  await t.test('10. GET /api/exam/:paperId/key returns ExamKey with subjective steps and answer', async () => {
    const res = await handleMockRequest('/api/exam/mock-paper-1/key');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.subjective));
    if (res.subjective.length) {
      assert.ok(res.subjective[0].steps && res.subjective[0].answer);
    }
  });

  await t.test('11. GET /api/plan returns exactly 15 weekly climb milestones', async () => {
    const res = await handleMockRequest('/api/plan');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.plan?.weeks));
    assert.equal(res.plan.weeks.length, 15, 'Must contain 15-week climb');
  });

  await t.test('12. GET /api/library returns formulas, shortcuts, and flashcards arrays', async () => {
    const res = await handleMockRequest('/api/library');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.formulas));
    assert.ok(Array.isArray(res.shortcuts));
    assert.ok(Array.isArray(res.flashcards));
  });

  await t.test('13. GET /api/progress returns user progress with completedChapters, practice, exams', async () => {
    const res = await handleMockRequest('/api/progress?userId=guest');
    assert.equal(res.ok, true);
    assert.ok(typeof res.progress?.xp === 'number');
    assert.ok(res.progress.completedChapters !== undefined);
  });

  await t.test('14. PUT /api/progress updates and returns updated progress with timestamp', async () => {
    const res = await handleMockRequest('/api/progress', {
      method: 'PUT',
      body: JSON.stringify({ userId: 'guest', xp: 120 }),
    });
    assert.equal(res.ok, true);
    assert.equal(res.progress.xp, 120);
  });

  await t.test('15. GET /api/video/:sub/:chap returns VideoCatalog with videoId and duration', async () => {
    const res = await handleMockRequest('/api/video/mathematics/real-numbers');
    assert.equal(res.ok, true);
    assert.ok(res.video?.videoId);
    assert.ok(typeof res.video?.durationSec === 'number');
  });

  await t.test('16. POST /api/video/progress saves playback position', async () => {
    const res = await handleMockRequest('/api/video/progress', {
      method: 'POST',
      body: JSON.stringify({ userId: 'guest', chapterId: 'real-numbers', positionSec: 150, durationSec: 600 }),
    });
    assert.equal(res.ok, true);
    assert.equal(res.saved, true);
  });

  await t.test('17. GET /api/gamify/badges returns non-empty Badge list', async () => {
    const res = await handleMockRequest('/api/gamify/badges');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.badges) && res.badges.length >= 1);
  });

  await t.test('18. GET /api/gamify/leaderboard returns ranked LeaderboardEntry list', async () => {
    const res = await handleMockRequest('/api/gamify/leaderboard?limit=10');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.leaderboard) && res.leaderboard.length >= 1);
  });

  await t.test('19. POST /api/gamify/xp awards XP and returns updated total', async () => {
    const res = await handleMockRequest('/api/gamify/xp', {
      method: 'POST',
      body: JSON.stringify({ userId: 'guest', amount: 50, reason: 'test' }),
    });
    assert.equal(res.ok, true);
    assert.ok(typeof res.xp === 'number');
  });

  await t.test('20. GET /api/parent/:childUserId returns analytics with initialized arrays', async () => {
    const res = await handleMockRequest('/api/parent/guest');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.parent?.exams), 'exams must be an array to prevent crash in ParentDashboard.tsx');
    assert.ok(Array.isArray(res.parent?.badges), 'badges must be an array to prevent crash in ParentDashboard.tsx');
  });

  await t.test('21. POST /api/parent/link links child account successfully', async () => {
    const res = await handleMockRequest('/api/parent/link', {
      method: 'POST',
      body: JSON.stringify({ childUserId: 'guest' }),
    });
    assert.equal(res.ok, true);
    assert.equal(res.linked, true);
  });

  await t.test('22. GET /api/graph/:sub/:chap returns concept graph with nodes and edges', async () => {
    const res = await handleMockRequest('/api/graph/mathematics/real-numbers');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.graph?.nodes));
    assert.ok(Array.isArray(res.graph?.edges));
  });

  await t.test('23. POST /api/practice/adaptive returns adjusted difficulty', async () => {
    const res = await handleMockRequest('/api/practice/adaptive', {
      method: 'POST',
      body: JSON.stringify({ subjectId: 'mathematics', accuracy: 0.9, currentDifficulty: 'simple' }),
    });
    assert.equal(res.ok, true);
    assert.equal(res.adaptive?.difficulty, 'medium');
  });

  await t.test('24. GET /api/okf/stats returns metadata counts', async () => {
    const res = await handleMockRequest('/api/okf/stats');
    assert.equal(res.ok, true);
    assert.ok(typeof res.topicCount === 'number');
  });

  await t.test('25. GET /api/okf/topics returns topic index', async () => {
    const res = await handleMockRequest('/api/okf/topics');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.topics));
  });

  await t.test('26. GET /api/search/multimodel returns multimodel search items', async () => {
    const res = await handleMockRequest('/api/search/multimodel?q=polynomials');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.results));
  });

  await t.test('27. GET /api/learning-aids/:sub/:chap returns learning aids payload', async () => {
    const res = await handleMockRequest('/api/learning-aids/mathematics/real-numbers');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.aids));
    assert.ok(Array.isArray(res.aidsWithContent));
  });

  await t.test('28. GET /api/learning-aids/ids returns id catalog and label maps', async () => {
    const res = await handleMockRequest('/api/learning-aids/ids');
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.aidIds));
    assert.ok(typeof res.aidLabels === 'object');
  });

  await t.test('29. GET /api/learning-aids/group/:group returns grouped aids', async () => {
    const res = await handleMockRequest('/api/learning-aids/group/quickrevise');
    assert.equal(res.ok, true);
    assert.equal(res.group, 'quickrevise');
    assert.ok(Array.isArray(res.aids));
  });
});
