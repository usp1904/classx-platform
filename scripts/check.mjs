import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { curriculum, questions, sources, getStats } from '../server/lib/data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (message) => errors.push(message);

const expected = { subjects: 4, chapters: 67, minimumQuestions: 600 };
const stats = getStats();

if (stats.subjects !== expected.subjects) fail(`subjects: expected ${expected.subjects}, got ${stats.subjects}`);
if (stats.chapters !== expected.chapters) fail(`chapters: expected ${expected.chapters}, got ${stats.chapters}`);
if (stats.questions < expected.minimumQuestions) fail(`questions: expected >= ${expected.minimumQuestions}, got ${stats.questions}`);

const chapterKeys = new Set();
for (const subject of curriculum.subjects) {
  for (const chapter of subject.chapters) {
    const key = `${subject.id}:${chapter.id}`;
    if (chapterKeys.has(key)) fail(`duplicate chapter key ${key}`);
    chapterKeys.add(key);
  }
}

const questionIds = new Set();
const difficultySet = new Set(['simple', 'medium', 'complex']);
for (const question of questions) {
  if (questionIds.has(question.id)) fail(`duplicate question id ${question.id}`);
  questionIds.add(question.id);
  if (!chapterKeys.has(`${question.subjectId}:${question.chapterId}`)) fail(`question ${question.id} points to unknown chapter`);
  if (!difficultySet.has(question.difficulty)) fail(`question ${question.id} has invalid difficulty`);
  if (!Number.isFinite(question.marks) || question.marks <= 0) fail(`question ${question.id} has invalid marks`);
  if (question.type === 'mcq') {
    if (!Array.isArray(question.options) || question.options.length < 2) fail(`mcq ${question.id} needs options`);
    if (![0, 1, 2, 3].includes(question.correct)) fail(`mcq ${question.id} has invalid correct index`);
  } else if (question.type === 'subjective') {
    if (!Array.isArray(question.steps) || !question.steps.length) fail(`subjective ${question.id} needs steps`);
    if (!question.answer) fail(`subjective ${question.id} needs answer`);
  } else {
    fail(`question ${question.id} has unknown type ${question.type}`);
  }
}

for (const subject of curriculum.subjects) {
  const lessonDir = path.join(root, 'server', 'data', 'lessons', subject.id);
  for (const chapter of subject.chapters.filter((item) => item.hasContent)) {
    const file = path.join(lessonDir, `${chapter.id}.json`);
    if (!fs.existsSync(file)) {
      fail(`missing lesson file for ${subject.id}:${chapter.id}`);
      continue;
    }
    const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!lesson.id) fail(`lesson ${subject.id}:${chapter.id} has no id`);
    if (chapter.stats && !chapter.isPartial) {
      const concepts = lesson.concepts?.length ?? 0;
      if (chapter.stats.concepts !== concepts && concepts) fail(`concept count mismatch for ${chapter.id}: curriculum ${chapter.stats.concepts}, lesson ${concepts}`);
    }
  }
}

if (!sources.length) fail('sources.json is empty');
if (!Array.isArray(sources)) fail('sources.json should be an array');

if (errors.length) {
  console.error(`check failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`check ok: ${stats.subjects} subjects, ${stats.chapters} chapters, ${stats.questions} questions (${stats.mcqs} MCQs), ${sources.length} sources`);
