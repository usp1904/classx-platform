import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCommit } from '../server/lib/runtime-info.js';

test('runtime commit prefers Render SHA over the Docker default', () => {
  assert.equal(resolveCommit({ RENDER_GIT_COMMIT: 'render-sha', GIT_SHA: 'dev' }), 'render-sha');
  assert.equal(resolveCommit({ GIT_SHA: 'docker-sha' }), 'docker-sha');
  assert.equal(resolveCommit({}), 'dev');
});
