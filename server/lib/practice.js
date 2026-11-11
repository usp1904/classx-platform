import crypto from 'node:crypto';
import { getChapter, getQuestions, subjects } from './data.js';

const sessions = new Map();
const TTL = 3 * 60 * 60 * 1000;

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const publicQuestion = (q) => ({
  id: q.id,
  type: q.type,
  question: q.question,
  options: q.options,
  marks: q.marks,
  difficulty: q.difficulty,
  chapterId: q.chapterId,
  chapterName: q.chapterName,
  subjectId: q.subjectId,
  source: q.source,
});

function prune() {
  const now = Date.now();
  for (const [id, session] of sessions) if (now - session.createdAt > TTL) sessions.delete(id);
}

export function startPractice({ subjectId = 'mathematics', chapterId, count = 12, difficulty }) {
  let pool = getQuestions({ subjectId, chapterId, type: 'mcq', difficulty: difficulty || undefined });
  if (pool.length < count && difficulty) pool = getQuestions({ subjectId, chapterId, type: 'mcq' });
  const picked = shuffle(pool).slice(0, Math.max(1, Math.min(Number(count) || 12, 40)));
  if (!picked.length) return { ok: false, error: 'No practice questions are available for this chapter yet.' };
  const session = {
    id: crypto.randomUUID(),
    kind: 'practice',
    createdAt: Date.now(),
    questions: picked,
    subjectId,
    chapterId: chapterId || null,
    durationMin: Math.max(5, Math.ceil(picked.length * 1.2)),
  };
  sessions.set(session.id, session);
  prune();
  return {
    ok: true,
    sessionId: session.id,
    durationMin: session.durationMin,
    questions: picked.map(publicQuestion),
    meta: { count: picked.length, subjectId, chapterId: chapterId || null, totalMarks: picked.reduce((sum, q) => sum + q.marks, 0) },
  };
}

export function startExam({ subjectId = 'mathematics', chapterIds, counts } = {}) {
  const blueprint = {
    mcq: counts?.mcq ?? 20,
    short: counts?.short ?? 10,
    long: counts?.long ?? 6,
  };
  const chapterFilter = new Set(chapterIds && chapterIds.length ? chapterIds : []);
  let pool = getQuestions({ subjectId });
  if (chapterFilter.size) pool = pool.filter((q) => chapterFilter.has(q.chapterId));
  const mcq = shuffle(pool.filter((q) => q.type === 'mcq')).slice(0, blueprint.mcq);
  const subjective = shuffle(pool.filter((q) => q.type === 'subjective'));
  const short = subjective.filter((q) => q.marks <= 3).slice(0, blueprint.short);
  const long = subjective.filter((q) => q.marks > 3).slice(0, blueprint.long);
  const fallbackLong = subjective.filter((q) => !short.includes(q) && !long.includes(q)).slice(0, Math.max(0, blueprint.long - long.length));
  const sections = [
    { id: 'A', title: 'Section A · Objective', instruction: 'All questions are compulsory. Choose the single best option.', questions: mcq },
    { id: 'B', title: 'Section B · Short answer', instruction: 'Show the governing formula and every key substitution.', questions: [...short, ...fallbackLong] },
    { id: 'C', title: 'Section C · Long answer', instruction: 'Write step-by-step. Marks are awarded for reasoning, not only the final answer.', questions: long },
  ].filter((section) => section.questions.length);
  if (!sections.length) return { ok: false, error: 'No question bank available for that selection yet.' };
  const totalMarks = sections.reduce((sum, section) => sum + section.questions.reduce((s, q) => s + q.marks, 0), 0);
  const subject = subjects.find((s) => s.id === subjectId);
  const session = {
    id: crypto.randomUUID(),
    kind: 'exam',
    createdAt: Date.now(),
    subjectId,
    chapterIds: [...chapterFilter],
    sections,
    durationMin: Math.max(30, Math.round(totalMarks * 1.2)),
    totalMarks,
    subjectName: subject?.name || subjectId,
  };
  sessions.set(session.id, session);
  prune();
  return {
    ok: true,
    paperId: session.id,
    subjectId,
    subjectName: session.subjectName,
    totalMarks,
    durationMin: session.durationMin,
    sectionCount: sections.length,
    sections: sections.map((s) => ({ id: s.id, title: s.title, instruction: s.instruction, marks: s.questions.reduce((sum, q) => sum + q.marks, 0), questions: s.questions.map(publicQuestion) })),
    instructions: [
      '15 minutes reading time before the exam.',
      'Section A has objective questions with no negative marking.',
      'Section B and C require step-by-step working.',
      'Use the answer key only after submitting your responses.',
    ],
  };
}

export function submitSession({ sessionId, answers = {}, subjectiveMarks = {} }) {
  const session = sessions.get(sessionId);
  if (!session) return { ok: false, error: 'Session expired. Start a new test.' };
  const flat = session.kind === 'practice' ? session.questions : session.sections.flatMap((s) => s.questions);
  let score = 0;
  let total = 0;
  let attempted = 0;
  let correct = 0;
  let mcqAttempted = 0;
  const review = flat.map((q) => {
    total += q.marks;
    if (q.type === 'mcq') {
      const selected = answers[q.id];
      const isAttempted = selected !== undefined && selected !== null && selected !== '';
      if (isAttempted) {
        attempted += 1;
        mcqAttempted += 1;
      }
      const isCorrect = Number(selected) === q.correct;
      if (isCorrect) {
        correct += 1;
        score += q.marks;
      }
      return {
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        selected: isAttempted ? Number(selected) : null,
        correctIndex: q.correct,
        correct: isCorrect,
        marks: q.marks,
        explanation: q.explanation,
        chapterName: q.chapterName,
      };
    }
    const self = subjectiveMarks[q.id];
    const awarded = self === undefined || self === null ? 0 : Math.max(0, Math.min(Number(self) || 0, q.marks));
    score += awarded;
    if (self !== undefined && self !== null) attempted += 1;
    return {
      id: q.id,
      type: q.type,
      question: q.question,
      marks: q.marks,
      awarded,
      steps: q.steps,
      answer: q.answer,
      hints: q.hints,
      chapterName: q.chapterName,
      source: q.source,
    };
  });
  sessions.delete(sessionId);
  return {
    ok: true,
    sessionId,
    kind: session.kind,
    score,
    total,
    percentage: total ? Math.round((score / total) * 1000) / 10 : 0,
    attempted,
    questionCount: flat.length,
    accuracy: mcqAttempted ? Math.round((correct / mcqAttempted) * 1000) / 10 : 0,
    review,
  };
}

export function getExamKey(paperId) {
  const session = sessions.get(paperId);
  if (!session || session.kind !== 'exam') return { ok: false, error: 'Paper expired. Generate a new mock test.' };
  return {
    ok: true,
    paperId,
    subjective: session.sections
      .flatMap((section) => section.questions.map((question) => ({ section: section.title, ...question })))
      .filter((question) => question.type !== 'mcq')
      .map((question) => ({
        id: question.id,
        section: question.section,
        question: question.question,
        marks: question.marks,
        steps: question.steps,
        answer: question.answer,
        hints: question.hints,
        source: question.source,
      })),
  };
}

export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}
