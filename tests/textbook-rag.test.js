import test from 'node:test';
import assert from 'node:assert/strict';
import { textbookStats, textbookChunks } from '../server/lib/textbook-okf.js';
import { getIndex } from '../server/lib/rag.js';
import { getMultimodelRag } from '../server/lib/rag-multimodel.js';

const hasBundle = () => textbookStats().chunks > 0;

test('OKF textbook bundle exposes page-anchored chunks', (t) => {
  if (!hasBundle()) return t.skip('OKF textbook bundle not generated locally');
  const stats = textbookStats();
  assert.ok(stats.chapters >= 49, `expected 49 chapters, got ${stats.chapters}`);
  const chunk = textbookChunks().find((c) => c.type === 'textbook' && Number.isInteger(c.page));
  assert.ok(chunk, 'expected a page-anchored textbook chunk');
  assert.ok(chunk.subjectId && chunk.chapterId && chunk.page > 0);
});

test('retrieval surfaces textbook page citations', (t) => {
  if (!hasBundle()) return t.skip('OKF textbook bundle not generated locally');
  const { results } = getIndex().search('laws of reflection angle of incidence', {
    subjectId: 'science',
    limit: 10,
  });
  const textbook = results.find((r) => r.type === 'textbook');
  assert.ok(textbook, 'expected a textbook chunk in results');
  assert.ok(Number.isInteger(textbook.page) && textbook.page > 0, 'expected a book page number');
});

test('tutor multimodel path keeps textbook page metadata', (t) => {
  if (!hasBundle()) return t.skip('OKF textbook bundle not generated locally');
  const { results } = getMultimodelRag().search('laws of reflection angle of incidence', {
    subjectId: 'science',
    chapterId: 'light-reflection-and-refraction',
    limit: 7,
  });
  const textbook = results.find((r) => r.type === 'textbook');
  assert.ok(textbook, 'expected a textbook chunk in tutor retrieval');
  assert.ok(Number.isInteger(textbook.page) && textbook.page > 0, 'expected a book page number');
});
