import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { getIndex, getCitations } from '../server/lib/rag.js';
import { askTutor } from '../server/lib/ai.js';

test('every RAG chunk has complete provenance metadata', () => {
  const index = getIndex();
  index.ensureBuilt();
  assert.ok(index.chunks.length > 0, 'index must contain chunks');

  for (const chunk of index.chunks) {
    assert.ok(typeof chunk.docId === 'string' && chunk.docId.length > 0, `chunk ${chunk.id} missing valid docId`);
    assert.ok(Array.isArray(chunk.sectionPath) && chunk.sectionPath.length > 0, `chunk ${chunk.id} missing valid sectionPath`);
    assert.ok(Number.isInteger(chunk.chunkIndex) && chunk.chunkIndex >= 0, `chunk ${chunk.id} missing valid chunkIndex`);
    assert.ok(typeof chunk.checksum === 'string' && /^[a-f0-9]{64}$/.test(chunk.checksum), `chunk ${chunk.id} missing valid sha256 checksum`);

    const expectedChecksum = crypto.createHash('sha256').update(chunk.text || '').digest('hex');
    assert.equal(chunk.checksum, expectedChecksum, `checksum mismatch for chunk ${chunk.id}`);
  }
});

test('no duplicate docId + chunkIndex exists across entire RAG index', () => {
  const index = getIndex();
  index.ensureBuilt();

  const seen = new Set();
  const duplicates = [];

  for (const chunk of index.chunks) {
    const key = `${chunk.docId}#${chunk.chunkIndex}`;
    if (seen.has(key)) {
      duplicates.push({ key, id: chunk.id });
    }
    seen.add(key);
  }

  assert.equal(duplicates.length, 0, `found duplicate docId + chunkIndex pairs: ${JSON.stringify(duplicates.slice(0, 5))}`);
});

test('search results and citations surface full provenance fields', () => {
  const index = getIndex();
  const { results } = index.search('quadratic equation discriminant roots', {
    subjectId: 'mathematics',
    limit: 5,
  });

  assert.ok(results.length > 0, 'expected search results');
  for (const r of results) {
    assert.ok(r.docId, 'search result missing docId');
    assert.ok(Array.isArray(r.sectionPath) && r.sectionPath.length > 0, 'search result missing sectionPath');
    assert.ok(Number.isInteger(r.chunkIndex) && r.chunkIndex >= 0, 'search result missing chunkIndex');
    assert.ok(typeof r.checksum === 'string' && r.checksum.length === 64, 'search result missing checksum');
  }

  const citations = getCitations(results);
  assert.equal(citations.length, results.length);
  for (const c of citations) {
    assert.ok(c.docId, 'citation missing docId');
    assert.ok(Array.isArray(c.sectionPath) && c.sectionPath.length > 0, 'citation missing sectionPath');
    assert.ok(Number.isInteger(c.chunkIndex) && c.chunkIndex >= 0, 'citation missing chunkIndex');
    assert.ok(typeof c.checksum === 'string' && c.checksum.length === 64, 'citation missing checksum');
  }
});

test('grounded tutor sources preserve provenance metadata', async () => {
  const answer = await askTutor({
    question: 'How do you find the roots of a quadratic equation?',
    mode: 'board',
    subjectId: 'mathematics',
    chapterId: 'quadratic-equations',
  });

  assert.equal(answer.ok, true);
  assert.ok(answer.sources.length >= 1, 'expected tutor sources');
  for (const src of answer.sources) {
    assert.ok(src.docId, 'tutor source missing docId');
    assert.ok(Array.isArray(src.sectionPath) && src.sectionPath.length > 0, 'tutor source missing sectionPath');
    assert.ok(Number.isInteger(src.chunkIndex) && src.chunkIndex >= 0, 'tutor source missing chunkIndex');
    assert.ok(typeof src.checksum === 'string' && src.checksum.length === 64, 'tutor source missing checksum');
  }
});
