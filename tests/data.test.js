import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculum, questions, getStats, getChapter, getLesson } from '../server/lib/data.js';

test('curriculum keeps the full Class X map', () => {
  const stats = getStats();
  assert.equal(stats.subjects, 4);
  assert.equal(stats.chapters, 67);
  assert.ok(stats.questions >= 600);
  assert.equal(stats.academicYear, '2026-27');
});

test('authored chapters resolve their lesson files', () => {
  const chapter = getChapter('mathematics', 'real-numbers');
  assert.ok(chapter);
  assert.equal(chapter.subjectId, 'mathematics');
  const lesson = getLesson('mathematics', 'real-numbers');
  assert.ok(lesson);
  assert.ok(lesson.concepts.length >= 4);
  assert.ok(lesson.theorems.length >= 1);
});

test('question ids are unique and classrooms exist', () => {
  const ids = new Set();
  const chapters = new Set(
    curriculum.subjects.flatMap((subject) => subject.chapters.map((chapter) => `${subject.id}:${chapter.id}`)),
  );
  for (const question of questions) {
    assert.ok(!ids.has(question.id), `duplicate ${question.id}`);
    ids.add(question.id);
    assert.ok(chapters.has(`${question.subjectId}:${question.chapterId}`), `orphan ${question.id}`);
  }
});

test('every MCQ reveals a valid answer index and options', () => {
  for (const question of questions.filter((item) => item.type === 'mcq')) {
    assert.ok(question.options.length >= 2, question.id);
    assert.ok(question.correct >= 0 && question.correct < question.options.length, question.id);
  }
});
