import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { curriculum, subjects, questions } from '../server/lib/data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('every official topic is attached to exactly one chapter', () => {
  const chapters = subjects.flatMap((subject) => subject.chapters.map((chapter) => `${subject.id}:${chapter.id}`));
  assert.equal(chapters.length, 67);
  assert.equal(new Set(chapters).size, 67);
  const unitTopics = subjects.flatMap((subject) => subject.units.flatMap((unit) => unit.topics.map((topic) => `${subject.id}:${topic.id}`)));
  const chapterTopics = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => `${subject.id}:${topic.id}`)));
  assert.equal(unitTopics.length, 76);
  assert.deepEqual([...chapterTopics].sort(), [...unitTopics].sort());
  assert.equal(new Set(chapterTopics).size, 76);
  for (const subject of subjects) {
    for (const chapter of subject.chapters) assert.ok(chapter.topics.length >= 1, `${subject.id}:${chapter.id} has no official topic`);
  }
});

test('coverage labels match authored depth', () => {
  const flat = subjects.flatMap((subject) => subject.chapters);
  const full = flat.filter((chapter) => chapter.hasContent && !chapter.isPartial);
  const starter = flat.filter((chapter) => chapter.isPartial);
  const maps = flat.filter((chapter) => !chapter.hasContent);
  assert.equal(full.length, 52);
  assert.equal(starter.length, 0);
  assert.equal(maps.length, 15);
  assert.deepEqual(full.filter((chapter) => chapter.stats.quizzes === 0), []);
});

test('every full lesson passes the depth gate', () => {
  for (const subject of subjects) {
    for (const chapter of subject.chapters.filter((item) => item.hasContent && !item.isPartial)) {
      const file = path.join(root, 'server', 'data', 'lessons', subject.id, `${chapter.id}.json`);
      assert.ok(fs.existsSync(file), `missing ${file}`);
      const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
      const exercises = Object.values(lesson.exercises || {}).reduce((sum, group) => sum + (group.problems?.length || 0), 0);
      const quizzes = Object.values(lesson.quizzes || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
      const visuals = (lesson.visualizations?.length || 0) + (lesson.concept_maps?.nodes?.length ? 1 : 0) + (lesson.mind_maps?.branches?.length ? 1 : 0);
      assert.ok((lesson.concepts?.length || 0) >= 3, `${chapter.id} concepts`);
      assert.ok((lesson.worked_examples?.length || 0) + exercises >= 3, `${chapter.id} examples`);
      assert.ok(quizzes >= 5, `${chapter.id} quizzes`);
      assert.ok((lesson.common_misconceptions?.length || 0) >= 1, `${chapter.id} misconceptions`);
      assert.ok(visuals >= 1, `${chapter.id} visuals`);
    }
  }
});

test('starter packs never claim full question banks', () => {
  for (const subject of subjects) {
    for (const chapter of subject.chapters.filter((item) => item.isPartial)) {
      const bank = questions.filter((question) => question.subjectId === subject.id && question.chapterId === chapter.id);
      assert.ok(bank.every((question) => question.type === 'subjective'), `${chapter.id} should not expose MCQs`);
      assert.equal(chapter.stats.quizzes, 0);
    }
  }
});

test('planner weeks and sources are internally consistent', () => {
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'server', 'data', 'plan.json'), 'utf8'));
  assert.equal(plan.weeks.length, 15);
  assert.equal(plan.meta.scope.includes('Mathematics'), true);
  const sources = JSON.parse(fs.readFileSync(path.join(root, 'server', 'data', 'sources.json'), 'utf8'));
  assert.equal(sources.length, 4);
  for (const source of sources) assert.ok(fs.existsSync(path.join(root, 'source', 'pdfs', source.pdf)), source.pdf);
  assert.equal(curriculum.meta.board, 'CBSE');
});
