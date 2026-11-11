import test from 'node:test';
import assert from 'node:assert/strict';
import { matchLesson, normalizeDifficulty } from '../scripts/sync-content.mjs';

const lessons = [
  { slug: 'geography', data: { id: 'geography', chapter: 'Resources and Development' } },
  { slug: 'development', data: { id: 'development', chapter: 'Development' } },
  { slug: 'history', data: { id: 'history', chapter: 'Nationalism in India' } },
];

test('exact normalized chapter match beats substring containment', () => {
  assert.equal(matchLesson(lessons, 'Development')?.slug, 'development');
  assert.equal(matchLesson(lessons, 'Resources and Development')?.slug, 'geography');
  assert.equal(matchLesson(lessons, 'resources & development')?.slug, 'geography');
});

test('syllabus punctuation and case still match exactly', () => {
  assert.equal(matchLesson(lessons, 'nationalism in india')?.slug, 'history');
  assert.equal(matchLesson(lessons, 'Nationalism in India')?.slug, 'history');
});

test('unrelated topic does not match', () => {
  assert.equal(matchLesson(lessons, 'Electricity'), null);
  assert.equal(matchLesson([lessons[0]], 'Development'), null);
});

test('difficulty normalizes to simple, medium, complex', () => {
  assert.equal(normalizeDifficulty('easy'), 'simple');
  assert.equal(normalizeDifficulty('EASY'), 'simple');
  assert.equal(normalizeDifficulty('hard'), 'complex');
  assert.equal(normalizeDifficulty('Medium'), 'medium');
  assert.equal(normalizeDifficulty(undefined), 'medium');
  assert.equal(normalizeDifficulty('unknown'), 'medium');
});
