import test from 'node:test';
import assert from 'node:assert/strict';
import { startPractice, startExam, submitSession, getExamKey } from '../server/lib/practice.js';

test('practice session returns the requested number of questions', () => {
  const session = startPractice({ subjectId: 'mathematics', chapterId: 'real-numbers', count: 5 });
  assert.equal(session.ok, true);
  assert.equal(session.questions.length, 5);
  assert.equal(session.questions[0].type, 'mcq');
  assert.equal('correct' in session.questions[0], false);
});

test('empty practice submission scores zero without leaking answers', () => {
  const session = startPractice({ subjectId: 'mathematics', chapterId: 'real-numbers', count: 3 });
  const result = submitSession({ sessionId: session.sessionId, answers: {} });
  assert.equal(result.ok, true);
  assert.equal(result.score, 0);
  assert.equal(result.attempted, 0);
  assert.equal(result.accuracy, 0);
  assert.equal(result.review.length, 3);
  assert.ok(result.review.every((item) => typeof item.correctIndex === 'number'));
});

test('mock exam key only exposes written questions', () => {
  const paper = startExam({ subjectId: 'mathematics', chapterIds: ['real-numbers'], counts: { mcq: 3, short: 1, long: 1 } });
  assert.equal(paper.ok, true);
  const key = getExamKey(paper.paperId);
  assert.equal(key.ok, true);
  assert.ok(key.subjective.length >= 1);
  assert.ok(key.subjective.every((item) => item.steps && item.answer));
  const result = submitSession({ sessionId: paper.paperId, answers: {}, subjectiveMarks: {} });
  assert.equal(result.kind, 'exam');
  assert.ok(result.total > 0);
});

test('expired sessions fail closed', () => {
  const result = submitSession({ sessionId: 'missing-paper', answers: {} });
  assert.equal(result.ok, false);
  assert.match(result.error, /expired/i);
});
