import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { curriculum, subjects, questions, sources, plan } from '../server/lib/data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');

const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);

const chapters = subjects.flatMap((subject) => subject.chapters.map((chapter) => ({ subject, chapter })));
if (subjects.length !== 4) fail(`expected 4 subjects, found ${subjects.length}`);
if (chapters.length !== 67) fail(`expected 67 chapters, found ${chapters.length}`);

const officialTopics = new Set();
for (const subject of subjects) {
  for (const unit of subject.units) {
    for (const topic of unit.topics) officialTopics.add(`${subject.id}:${topic.id}`);
  }
}
const attachedTopics = new Set();
const seen = new Set();
for (const { subject, chapter } of chapters) {
  const key = `${subject.id}:${chapter.id}`;
  if (seen.has(key)) fail(`duplicate chapter id ${key}`);
  seen.add(key);
  if (!subject.units.some((unit) => unit.id === chapter.unitId)) fail(`${key} has unknown unit ${chapter.unitId}`);
  if (!chapter.name || !chapter.summary) fail(`${key} is missing name or summary`);
  if (!chapter.stats || typeof chapter.stats.concepts !== 'number') fail(`${key} has no stats`);
  if (!Array.isArray(chapter.topics) || !chapter.topics.length) fail(`${key} has no official topic breakdown`);
  for (const topic of chapter.topics || []) {
    const topicKey = `${subject.id}:${topic.id}`;
    if (!officialTopics.has(topicKey)) fail(`${key} references unknown official topic ${topic.id}`);
    if (attachedTopics.has(topicKey)) fail(`official topic ${topicKey} is attached more than once`);
    attachedTopics.add(topicKey);
  }
}
if (officialTopics.size !== 76) fail(`expected 76 official topics, found ${officialTopics.size}`);
for (const topic of officialTopics) if (!attachedTopics.has(topic)) fail(`official topic ${topic} is not attached to a chapter`);

const questionIds = new Set();
for (const question of questions) {
  if (!question.id) fail('question without id');
  if (questionIds.has(question.id)) fail(`duplicate question id ${question.id}`);
  questionIds.add(question.id);
  if (!seen.has(`${question.subjectId}:${question.chapterId}`)) fail(`question ${question.id} points at missing chapter`);
  if (question.type === 'mcq') {
    if (!Array.isArray(question.options) || question.options.length < 2) fail(`MCQ ${question.id} has fewer than 2 options`);
    if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= (question.options?.length || 0)) fail(`MCQ ${question.id} has invalid answer index`);
  } else {
    if (!Array.isArray(question.steps) || !question.steps.length) fail(`subjective question ${question.id} has no steps`);
    if (!question.answer) fail(`subjective question ${question.id} has no final answer`);
  }
}

for (const source of sources) {
  const file = path.resolve(root, 'source', 'pdfs', source.pdf || source.file || '');
  if ((source.pdf || source.file) && !fs.existsSync(file)) fail(`source file missing: ${source.pdf || source.file}`);
}

if (plan.weeks.length !== 15) fail(`expected 15 planner weeks, found ${plan.weeks.length}`);
for (const week of plan.weeks) {
  if (!seen.has(`${week.subjectId}:${week.chapterId}`)) fail(`planner week ${week.week} points at missing chapter ${week.subjectId}:${week.chapterId}`);
}

function lessonDepth(subjectId, chapterId) {
  const file = path.join(root, 'server', 'data', 'lessons', subjectId, `${chapterId}.json`);
  if (!fs.existsSync(file)) return null;
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  const exerciseCount = Object.values(lesson.exercises || {}).reduce((sum, group) => sum + (group.problems?.length || 0), 0);
  const quizCount = Object.values(lesson.quizzes || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  const visualCount = (lesson.visualizations?.length || 0) + (lesson.concept_maps?.nodes?.length ? 1 : 0) + (lesson.mind_maps?.branches?.length ? 1 : 0);
  return {
    concepts: lesson.concepts?.length || 0,
    theorems: lesson.theorems?.length || 0,
    examples: lesson.worked_examples?.length || 0,
    exercises: exerciseCount,
    quizzes: quizCount,
    misconceptions: lesson.common_misconceptions?.length || 0,
    visuals: visualCount,
    hasLesson: true,
  };
}

const rows = [];
for (const { subject, chapter } of chapters) {
  const depth = lessonDepth(subject.id, chapter.id);
  const status = chapter.hasContent ? (chapter.isPartial ? 'Starter' : 'Full') : 'Map';
  const needs = {
    concepts: status !== 'Map',
    practice: status !== 'Map',
    examples: status !== 'Map',
    revision: status !== 'Map',
    visual: subject.id === 'mathematics',
  };
  const has = {
    concepts: (depth?.concepts || 0) > 0,
    practice: (depth?.quizzes || 0) > 0,
    examples: (depth?.examples || 0) > 0 || (depth?.exercises || 0) > 0 || (depth?.theorems || 0) > 0,
    revision: (depth?.misconceptions || 0) > 0 || (depth?.visuals || 0) > 0,
    visual: (depth?.visuals || 0) > 0,
  };
  const missing = Object.entries(needs).filter(([key, needed]) => needed && !has[key]).map(([key]) => key);
  if (status !== 'Map' && !depth) fail(`${subject.id}/${chapter.id} is labelled ${status} but has no lesson file`);
  if (status === 'Full' && subject.id === 'mathematics' && missing.length) warnings.push(`Maths chapter ${chapter.id} lacks: ${missing.join(', ')}`);
  rows.push({ subject, chapter, status, depth, missing });
}

const grouped = new Map();
for (const row of rows) {
  if (!grouped.has(row.subject.id)) grouped.set(row.subject.id, []);
  grouped.get(row.subject.id).push(row);
}

const lines = [];
lines.push('# ClassX Coverage Audit');
lines.push('');
lines.push(`Generated ${new Date().toISOString()} from \`server/data\`.`);
lines.push('');
lines.push('Legend: `[x]` authored and verified by structure, `[~]` starter notes, `[ ]` syllabus map only. A tick is structural coverage, not a claim of pedagogical completeness.');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push('| Subject | Authored | Starter | Map | Total | Questions | Visuals |');
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const subject of subjects) {
  const list = grouped.get(subject.id) || [];
  const full = list.filter((row) => row.status === 'Full').length;
  const starter = list.filter((row) => row.status === 'Starter').length;
  const map = list.filter((row) => row.status === 'Map').length;
  const qs = questions.filter((question) => question.subjectId === subject.id).length;
  const visuals = list.reduce((sum, row) => sum + (row.depth?.visuals || 0), 0);
  lines.push(`| ${subject.name} | ${full} | ${starter} | ${map} | ${list.length} | ${qs} | ${visuals} |`);
}
lines.push('');
lines.push(`Total: ${questions.length} questions, ${questions.filter((q) => q.type === 'mcq').length} MCQs, ${sources.length} source PDFs.`);
lines.push('');
lines.push('## Chapter checklist');
lines.push('');
for (const subject of subjects) {
  lines.push(`### ${subject.name}`);
  lines.push('');
  for (const row of grouped.get(subject.id) || []) {
    const mark = row.status === 'Full' ? '[x]' : row.status === 'Starter' ? '[~]' : '[ ]';
    const depth = row.depth
      ? `concepts ${row.depth.concepts}, examples ${row.depth.examples}, exercises ${row.depth.exercises}, MCQs ${row.depth.quizzes}, visuals ${row.depth.visuals}`
      : 'syllabus map only';
    lines.push(`- ${mark} **${row.chapter.name}** (${row.chapter.unitName}, ${row.chapter.marks ?? '—'} marks, ${row.chapter.topics.length} official topics) — ${depth}${row.missing.length ? `; gaps: ${row.missing.join(', ')}` : ''}`);
  }
  lines.push('');
}
if (warnings.length) {
  lines.push('## Depth warnings');
  lines.push('');
  for (const warning of warnings) lines.push(`- [ ] ${warning}`);
  lines.push('');
}
lines.push('## Remaining authoring batches');
lines.push('');
for (const subject of subjects) {
  const missing = (grouped.get(subject.id) || []).filter((row) => row.status !== 'Full');
  if (!missing.length) continue;
  lines.push(`- ${subject.name}: ${missing.map((row) => row.chapter.name).join(', ')}`);
}
lines.push('');
lines.push('The tutor can orient a student on any mapped syllabus chapter through retrieval. It cannot replace an authored lesson for depth, worked examples, or visuals. Do not mark a map as full without authoring the pack.');
lines.push('');

fs.writeFileSync(path.join(root, 'COVERAGE.md'), lines.join('\n'));
console.log(`coverage: ${subjects.length} subjects, ${chapters.length} chapters, ${questions.length} questions`);
console.log(`coverage: wrote COVERAGE.md; ${warnings.length} depth warning(s), ${failures.length} structural failure(s)`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
}
if (strict && warnings.length) {
  for (const warning of warnings) console.error(`STRICT ${warning}`);
  process.exitCode = 1;
}
