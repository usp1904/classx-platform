import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sessionSet,
  sessionGet,
  sessionDel,
  sessionExists,
  sessionList,
  sessionPrune,
  redisFlush,
  sessionStoreKind,
  isRedisReady,
} from '../server/lib/session-store.js';

test('session store falls back to memory when Redis is absent', async () => {
  assert.equal(isRedisReady(), false);
  assert.equal(sessionStoreKind(), 'memory');

  await sessionSet('user:alice', { userId: 'alice', kind: 'user' }, 0);
  assert.deepEqual(await sessionGet('user:alice'), { userId: 'alice', kind: 'user' });
  assert.equal(await sessionExists('user:alice'), true);

  await sessionSet('practice:1', { kind: 'practice', step: 2 }, 60);
  const practice = await sessionList('practice');
  assert.equal(practice.length, 1);
  assert.equal(practice[0].id, 'practice:1');

  assert.equal(await sessionDel('practice:1'), true);
  assert.equal(await sessionExists('practice:1'), false);
});

test('memory session entries expire and can be pruned', async () => {
  await sessionSet('short', { value: 1 }, 1);
  assert.deepEqual(await sessionGet('short'), { value: 1 });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(await sessionGet('short'), null);
  assert.equal(await sessionPrune(), 0);

  await sessionSet('expiring', { value: 2 }, 1);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(await sessionPrune(), 1);
});

test('redisFlush clears the memory fallback', async () => {
  await sessionSet('a', { value: 1 }, 0);
  await sessionSet('b', { value: 2 }, 0);
  assert.equal(await redisFlush(), true);
  assert.equal(await sessionGet('a'), null);
  assert.equal(await sessionGet('b'), null);
  assert.equal(await redisFlush(), false);
});
