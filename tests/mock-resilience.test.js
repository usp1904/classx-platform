import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

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

// Check for mockApi implementation
let mockApi = null;
const mockApiTsPath = path.join(ROOT_DIR, 'web', 'src', 'services', 'mockApi.ts');
const mockApiJsPath = path.join(ROOT_DIR, 'web', 'src', 'services', 'mockApi.js');

if (fs.existsSync(mockApiTsPath)) {
  try {
    mockApi = await import('../web/src/services/mockApi.ts');
  } catch (err) {
    console.warn('[mock-resilience.test.js] Failed to load mockApi.ts:', err.message);
  }
} else if (fs.existsSync(mockApiJsPath)) {
  try {
    mockApi = await import('../web/src/services/mockApi.js');
  } catch (err) {
    console.warn('[mock-resilience.test.js] Failed to load mockApi.js:', err.message);
  }
}

// Check for api client in web/src/api.ts
let apiClientModule = null;
try {
  apiClientModule = await import('../web/src/api.ts');
} catch (err) {
  console.warn('[mock-resilience.test.js] Failed to load api.ts:', err.message);
}

test('Tier 2: Boundary & Corner Case Handling', {
  skip: !mockApi ? 'Milestone 2: web/src/services/mockApi.ts pending builder implementation' : false,
}, async (t) => {
  const { handleMockRequest } = mockApi;

  await t.test('T2.1: Non-existent chapter returns graceful payload without throwing', async () => {
    const res = await handleMockRequest('/api/chapters/mathematics/quantum-teleportation-xyz');
    assert.ok(res !== null && typeof res === 'object', 'Response must be structured object');
    if (res.ok) {
      assert.ok(typeof res.chapter?.stats?.concepts === 'number');
      assert.ok(Array.isArray(res.chapter?.topics));
    } else {
      assert.ok(typeof res.error === 'string', 'Error payload must contain error message string');
    }
  });

  await t.test('T2.2: Invalid subject ID returns graceful error response', async () => {
    const res = await handleMockRequest('/api/chapters/invalid-subject-999/real-numbers');
    assert.ok(res !== null && typeof res === 'object');
    if (!res.ok) {
      assert.ok(res.error, 'Expected error description for invalid subject');
    }
  });

  await t.test('T2.3: Malformed & regex special characters in search queries handled safely', async () => {
    // Empty search query
    const resEmpty = await handleMockRequest('/api/search?q=');
    assert.equal(resEmpty.ok, true);
    assert.deepEqual(resEmpty.results, []);

    // Whitespace only
    const resWhitespace = await handleMockRequest('/api/search?q=%20%20%20');
    assert.equal(resWhitespace.ok, true);
    assert.deepEqual(resWhitespace.results, []);

    // Regex metacharacters do not cause unhandled regex parser syntax error
    const regexPayload = encodeURIComponent('[.*+?^${}()|[]\\]');
    const resRegex = await handleMockRequest(`/api/search?q=${regexPayload}`);
    assert.equal(resRegex.ok, true);
    assert.ok(Array.isArray(resRegex.results));
  });

  await t.test('T2.4: Empty & malformed submission bodies handled safely', async () => {
    // Empty answers in practice submission
    const resPractice = await handleMockRequest('/api/practice/submit', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'mock-session-dummy', answers: {} }),
    });
    assert.equal(resPractice.ok, true);
    assert.equal(resPractice.score, 0);
    assert.equal(resPractice.attempted, 0);

    // Missing sessionId in practice submission
    const resMissingSession = await handleMockRequest('/api/practice/submit', {
      method: 'POST',
      body: JSON.stringify({ answers: {} }),
    });
    assert.ok(resMissingSession !== null);

    // Empty exam generation body defaults cleanly
    const resExam = await handleMockRequest('/api/exam/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(resExam.ok, true);
    assert.ok(resExam.paperId);

    // Blank tutor question returns polite guidance prompt rather than crashing
    const resTutor = await handleMockRequest('/api/tutor', {
      method: 'POST',
      body: JSON.stringify({ question: '', mode: 'socratic' }),
    });
    assert.ok(resTutor !== null);
  });

  await t.test('T2.5: Extreme / boundary query parameters clamped safely', async () => {
    const resLeaderboardZero = await handleMockRequest('/api/gamify/leaderboard?limit=0');
    assert.equal(resLeaderboardZero.ok, true);
    assert.ok(Array.isArray(resLeaderboardZero.leaderboard));

    const resUnknownTag = await handleMockRequest('/api/okf/topics?tags=nonexistent-tag-12345');
    assert.equal(resUnknownTag.ok, true);
    assert.ok(Array.isArray(resUnknownTag.topics));

    const resUnknownGroup = await handleMockRequest('/api/learning-aids/group/unknown-group-xyz');
    assert.equal(resUnknownGroup.ok, true);
    assert.ok(Array.isArray(resUnknownGroup.aids));
  });

  await t.test('T2.6: LocalStorage quota exceeded or disabled is handled gracefully', async () => {
    const originalSetItem = globalThis.localStorage.setItem;
    try {
      globalThis.localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };
      // Invoking saveProgress in mockApi should catch storage exceptions
      const res = await handleMockRequest('/api/progress', {
        method: 'PUT',
        body: JSON.stringify({ userId: 'guest', xp: 500 }),
      });
      assert.ok(res !== null, 'Must not crash when localStorage.setItem throws QuotaExceededError');
    } finally {
      globalThis.localStorage.setItem = originalSetItem;
    }
  });
});

test('Tier 3: Cross-Feature Combinations & State Transitions', {
  skip: !mockApi || !apiClientModule?.api?.health ? 'Milestone 2: mockApi & api.ts fallback pending builder implementation' : false,
}, async (t) => {
  const { isMockMode, setMockMode } = mockApi;
  const api = apiClientModule.api;

  await t.test('T3.1: Runtime mock toggle persists in localStorage', () => {
    setMockMode(true);
    assert.equal(isMockMode(), true);
    assert.equal(globalThis.localStorage.getItem('classx_mock_mode'), 'true');

    setMockMode(false);
    assert.equal(isMockMode(), false);
    assert.equal(globalThis.localStorage.getItem('classx_mock_mode'), 'false');
  });

  await t.test('T3.2: Simulated network failure engages auto-fallback', async () => {
    setMockMode(false);
    const originalFetch = globalThis.fetch;
    try {
      // Simulate network disconnection or DNS failure
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };

      const res = await api.curriculum();
      assert.equal(res.ok, true);
      assert.ok(Array.isArray(res.subjects) && res.subjects.length >= 4);
      assert.equal(isMockMode(), true, 'auto-fallback must be active after network failure');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('T3.3: HTTP 404 static hosting engages auto-fallback', async () => {
    setMockMode(false);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ ok: false, error: 'Route not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const res = await api.health();
      assert.equal(res.ok, true);
      assert.equal(isMockMode(), true, 'auto-fallback must be active after HTTP 404');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('T3.4: SPA HTML 200 catch-all engages auto-fallback', async () => {
    setMockMode(false);
    const originalFetch = globalThis.fetch;
    try {
      // Static server returning index.html for API route
      globalThis.fetch = async () => {
        return new Response('<!DOCTYPE html><html><body>ClassX SPA Shell</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      };

      const res = await api.plan();
      assert.equal(res.ok, true);
      assert.ok(Array.isArray(res.plan?.weeks));
      assert.equal(res.plan.weeks.length, 15);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('T3.5: Offline service worker payload { ok: false, error: "offline" } engages auto-fallback', async () => {
    setMockMode(false);
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ ok: false, error: 'offline' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const res = await api.curriculum();
      assert.equal(res.ok, true);
      assert.ok(Array.isArray(res.subjects) && res.subjects.length >= 4, 'Must return populated subjects array');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
