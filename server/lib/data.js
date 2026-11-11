import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const lessonCache = new Map();

const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));

export const curriculum = read('curriculum.json');
export const questions = read('questions.json');
export const plan = fs.existsSync(path.join(DATA_DIR, 'plan.json')) ? read('plan.json') : { weeks: [] };
export const sources = read('sources.json');

export const subjects = curriculum.subjects;
export const subjectById = new Map(subjects.map((s) => [s.id, s]));
export const chapterIndex = new Map();
for (const subject of subjects) {
  for (const chapter of subject.chapters) {
    chapterIndex.set(`${subject.id}:${chapter.id}`, { subject, chapter });
  }
}

export function getSubject(subjectId) {
  return subjectById.get(subjectId) || null;
}

export function getChapter(subjectId, chapterId) {
  const found = chapterIndex.get(`${subjectId}:${chapterId}`);
  return found ? { ...found.chapter, subjectName: found.subject.name, subjectId: found.subject.id } : null;
}

export function getLesson(subjectId, chapterId) {
  const key = `${subjectId}:${chapterId}`;
  if (lessonCache.has(key)) return lessonCache.get(key);
  const file = path.join(DATA_DIR, 'lessons', subjectId, `${chapterId}.json`);
  if (!fs.existsSync(file)) return null;
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  lessonCache.set(key, lesson);
  return lesson;
}

export function getQuestions({ subjectId, chapterId, type, difficulty, limit = 1000 } = {}) {
  let list = questions;
  if (subjectId) list = list.filter((q) => q.subjectId === subjectId);
  if (chapterId) list = list.filter((q) => q.chapterId === chapterId);
  if (type) list = list.filter((q) => q.type === type);
  if (difficulty) list = list.filter((q) => q.difficulty === difficulty);
  return list.slice(0, limit);
}

export function getPlan() {
  return plan;
}

export function getStats() {
  const allChapters = subjects.flatMap((s) => s.chapters);
  return {
    subjects: subjects.length,
    chapters: allChapters.length,
    authoredChapters: allChapters.filter((c) => c.hasContent && !c.isPartial).length,
    partialChapters: allChapters.filter((c) => c.isPartial).length,
    questions: questions.length,
    mcqs: questions.filter((q) => q.type === 'mcq').length,
    subjectiveQuestions: questions.filter((q) => q.type === 'subjective').length,
    pdfs: sources.length,
    academicYear: curriculum.meta.academicYear,
    board: curriculum.meta.board,
  };
}
