import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.resolve(process.env.CONTENT_SOURCE || path.join(ROOT, 'source'));
const OUT = path.join(ROOT, 'server', 'data');

const SUBJECTS = [
  { id: 'mathematics', okf: 'mathematics_okf.json', lessonDir: 'mathematics', accent: 'indigo', icon: 'Sigma' },
  { id: 'science', okf: 'science_okf.json', lessonDir: 'science', accent: 'emerald', icon: 'FlaskConical' },
  { id: 'social-science', okf: 'social_science_okf.json', lessonDir: 'social', accent: 'amber', icon: 'Globe2' },
  { id: 'english', okf: 'english_okf.json', lessonDir: 'english', accent: 'rose', icon: 'BookOpenText' },
];

const MATH_UNITS = {
  'real-numbers': 'number-systems',
  polynomials: 'algebra',
  'pair-of-linear-equations': 'algebra',
  'quadratic-equations': 'algebra',
  'arithmetic-progressions': 'algebra',
  'coordinate-geometry': 'coordinate-geometry',
  triangles: 'geometry',
  circles: 'geometry',
  constructions: 'geometry',
  'introduction-to-trigonometry': 'trigonometry',
  'applications-of-trigonometry': 'trigonometry',
  'areas-related-to-circles': 'mensuration',
  'surface-areas-and-volumes': 'mensuration',
  statistics: 'statistics-and-probability',
  probability: 'statistics-and-probability',
};

const MATH_TOPIC_GROUPS = {
  'real-numbers': ['real-numbers', 'euclid-s-division-lemma', 'fundamental-theorem-of-arithmetic', 'revisiting-irrational-numbers', 'revisiting-rational-numbers-and-decimal-expansions'],
  polynomials: ['polynomials'],
  'pair-of-linear-equations': ['pair-of-linear-equations-in-two-variables'],
  'quadratic-equations': ['quadratic-equations'],
  'arithmetic-progressions': ['arithmetic-progressions'],
  'coordinate-geometry': ['lines-in-two-dimensions', 'distance-formula', 'section-formula', 'area-of-triangle'],
  triangles: ['triangles'],
  circles: ['circles'],
  constructions: ['constructions'],
  'introduction-to-trigonometry': ['introduction-to-trigonometry', 'trigonometric-identities'],
  'applications-of-trigonometry': ['heights-and-distances', 'applications-of-trigonometry'],
  'areas-related-to-circles': ['areas-related-to-circles'],
  'surface-areas-and-volumes': ['surface-areas-and-volumes'],
  statistics: ['statistics'],
  probability: ['probability'],
};

function attachOfficialTopics(subjectId, chapters, units) {
  const topics = new Map();
  for (const unit of units) {
    for (const topic of unit.topics) topics.set(topic.id, { ...topic, unitId: unit.id, unitName: unit.name });
  }
  const used = new Set();
  for (const chapter of chapters) {
    const ids = subjectId === 'mathematics' ? MATH_TOPIC_GROUPS[chapter.id] || [chapter.id] : [chapter.id];
    chapter.topics = ids
      .map((id) => topics.get(id))
      .filter(Boolean)
      .map((topic) => {
        used.add(topic.id);
        return { id: topic.id, name: topic.name, difficulty: topic.difficulty, periods: topic.periods };
      });
    if (!chapter.topics.length) chapter.topics = [{ id: chapter.id, name: chapter.name, difficulty: null, periods: chapter.periods ?? null }];
  }
  const unassigned = [...topics.keys()].filter((id) => !used.has(id));
  if (unassigned.length) throw new Error(`${subjectId}: official topics not attached to a chapter: ${unassigned.join(', ')}`);
}

const ALIASES = {
  'light-reflection-and-refraction': ['light - reflection and refraction'],
  'chemical-reactions-and-equations': ['chemical reactions and equations'],
  'life-processes': ['life processes'],
  'nationalism-in-india': ['nationalism in india'],
  'power-sharing': ['power sharing'],
  'sectors-of-the-indian-economy': ['sectors of the indian economy'],
  'resources-and-development': ['resources and development'],
};

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const norm = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const ensure = (dir) => fs.mkdirSync(dir, { recursive: true });

const normalizeDifficulty = (value) => {
  const difficulty = String(value || 'medium').toLowerCase();
  if (difficulty === 'easy') return 'simple';
  if (difficulty === 'hard') return 'complex';
  return ['simple', 'medium', 'complex'].includes(difficulty) ? difficulty : 'medium';
};

function readLessons(dir) {
  if (!dir) return [];
  const abs = path.join(SOURCE, 'lessons', dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const data = readJson(path.join(abs, file));
      return { file, slug: path.basename(file, '.json'), data };
    });
}

function matchLesson(lessons, topicName) {
  const target = norm(topicName);
  if (!target) return null;
  const candidates = lessons.map((lesson) => {
    const names = [lesson.data.chapter, lesson.data.id, lesson.slug, ...(ALIASES[lesson.slug] || [])]
      .map(norm)
      .filter(Boolean);
    return { lesson, names };
  });

  for (const { lesson, names } of candidates) {
    if (names.includes(target)) return lesson;
  }

  const targetTokens = target.split(' ').length;
  let best = null;
  let bestLength = 0;
  for (const { lesson, names } of candidates) {
    for (const candidate of names) {
      if (candidate.length <= bestLength) continue;
      if (target.includes(candidate) || (targetTokens >= 2 && candidate.includes(target))) {
        best = lesson;
        bestLength = candidate.length;
      }
    }
  }
  return best;
}

function lessonStats(lesson) {
  if (!lesson) return { concepts: 0, theorems: 0, examples: 0, exercises: 0, quizzes: 0, visuals: 0, misconceptions: 0, authored: false };
  const d = lesson;
  const quizzes = d.quizzes ? Object.values(d.quizzes).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0) : 0;
  const exercises = d.exercises
    ? Object.values(d.exercises).reduce((sum, group) => sum + (Array.isArray(group?.problems) ? group.problems.length : 0), 0)
    : 0;
  const visuals = (d.visualizations?.length || 0) + (d.concept_maps?.nodes?.length ? 1 : 0) + (d.mind_maps?.branches?.length ? 1 : 0);
  return {
    concepts: d.concepts?.length || 0,
    theorems: d.theorems?.length || 0,
    examples: d.worked_examples?.length || 0,
    exercises,
    quizzes,
    visuals,
    misconceptions: d.common_misconceptions?.length || 0,
    authored: (d.concepts?.length || 0) >= 3
      && (d.worked_examples?.length || 0) + exercises >= 3
      && quizzes >= 5
      && (d.common_misconceptions?.length || 0) >= 1
      && visuals >= 1,
  };
}

function buildQuestions(subjectId, chapter, lesson) {
  const bank = [];
  if (!lesson) return bank;

  if (lesson.quizzes) {
    for (const [difficulty, questions] of Object.entries(lesson.quizzes)) {
      if (!Array.isArray(questions)) continue;
      questions.forEach((q, index) => {
        if (!Array.isArray(q.options) || typeof q.correct !== 'number') return;
        bank.push({
          id: `${subjectId}:${chapter.id}:mcq:${difficulty}:${q.id || index}`,
          subjectId,
          chapterId: chapter.id,
          chapterName: chapter.name,
          type: 'mcq',
          difficulty: normalizeDifficulty(difficulty),
          question: q.question,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation?.correct || '',
          wrongExplanations: q.explanation?.wrong_options || {},
          marks: 1,
          source: 'Chapter practice bank',
        });
      });
    }
  }

  if (lesson.exercises) {
    for (const [groupKey, group] of Object.entries(lesson.exercises)) {
      for (const problem of group?.problems || []) {
        if (!problem?.question) continue;
        bank.push({
          id: `${subjectId}:${chapter.id}:subjective:${problem.id || groupKey}`,
          subjectId,
          chapterId: chapter.id,
          chapterName: chapter.name,
          type: 'subjective',
          difficulty: normalizeDifficulty(problem.difficulty),
          question: problem.question,
          steps: Array.isArray(problem.solution) ? problem.solution : [],
          answer: problem.final_answer || problem.answer || (Array.isArray(problem.solution) ? problem.solution.at(-1) || '' : ''),
          marks: problem.marks || (normalizeDifficulty(problem.difficulty) === 'complex' ? 5 : 3),
          source: problem.book_source || group.title || 'NCERT exercise',
        });
      }
    }
  }

  if (lesson.model_papers) {
    for (const [difficulty, questions] of Object.entries(lesson.model_papers)) {
      if (!Array.isArray(questions)) continue;
      const level = normalizeDifficulty(difficulty);
      for (const q of questions) {
        bank.push({
          id: `${subjectId}:${chapter.id}:model:${q.id || bank.length}`,
          subjectId,
          chapterId: chapter.id,
          chapterName: chapter.name,
          type: 'subjective',
          difficulty: level,
          question: q.question,
          steps: q.steps || [],
          answer: q.answer || '',
          hints: q.hints || [],
          marks: level === 'complex' ? 5 : level === 'medium' ? 3 : 1,
          source: 'Model paper',
        });
      }
    }
  }

  return bank;
}

function buildCurriculum() {
  ensure(OUT);
  ensure(path.join(OUT, 'lessons'));
  const curriculum = {
    meta: {
      board: 'CBSE',
      class: 'X',
      academicYear: '2026-27',
      generatedAt: new Date().toISOString(),
      source: 'CBSE official curriculum PDFs, NCERT-aligned authored lessons',
      subjects: SUBJECTS.length,
    },
    subjects: [],
  };
  const allQuestions = [];
  const sourceIndex = [];

  for (const spec of SUBJECTS) {
    const okfPath = path.join(SOURCE, 'syllabus', spec.okf);
    if (!fs.existsSync(okfPath)) {
      console.warn(`skip ${spec.id}: missing ${okfPath}`);
      continue;
    }
    const okf = readJson(okfPath);
    const lessons = readLessons(spec.lessonDir);
    const subjectName = okf.course_structure?.subject || spec.id;
    const units = [];
    const chapters = [];
    const usedLessons = new Set();

    for (const rawUnit of okf.knowledge_units || []) {
      const unitId = slugify(rawUnit.id || rawUnit.name || rawUnit.section);
      const unit = {
        id: unitId,
        name: rawUnit.name || rawUnit.section || 'Core unit',
        section: rawUnit.section || '',
        marks: rawUnit.marks ?? null,
        periods: rawUnit.periods ?? null,
        topics: (rawUnit.topics || []).map((t) => ({ id: slugify(t.name), name: t.name, difficulty: t.difficulty || 'medium', periods: t.estimated_periods ?? null })),
      };
      units.push(unit);
    }

    if (spec.id === 'mathematics') {
      for (const lesson of lessons.filter((l) => l.data.chapterNumber)) {
        const chapterId = lesson.slug;
        const unit = units.find((u) => u.name.toLowerCase().includes('number') && chapterId === 'real-numbers') ||
          units.find((u) => u.name.includes('Algebra') && ['polynomials', 'pair-of-linear-equations', 'quadratic-equations', 'arithmetic-progressions'].includes(lesson.slug)) ||
          units.find((u) => u.name.includes('Coordinate') && chapterId === 'coordinate-geometry') ||
          units.find((u) => u.name.includes('Geometry') && ['triangles', 'circles', 'constructions'].includes(lesson.slug)) ||
          units.find((u) => u.name.includes('Trigonometry') && chapterId.includes('trigonometry')) ||
          units.find((u) => u.name.includes('Mensuration') && ['areas-related-to-circles', 'surface-areas-and-volumes'].includes(lesson.slug)) ||
          units.find((u) => u.name.includes('Statistics') && ['statistics', 'probability'].includes(lesson.slug)) ||
          units.find((u) => u.name.includes('Number') && chapterId === 'real-numbers');
        const stats = lessonStats(lesson.data);
        chapters.push({
          id: chapterId,
          name: lesson.data.chapter,
          order: lesson.data.chapterNumber || 15,
          unitId: unit?.id || null,
          unitName: unit?.name || null,
          marks: unit?.marks ?? null,
          periods: unit?.periods ?? null,
          summary: lesson.data.outcomes?.slice(0, 2).join(' ') || '',
          difficulty: lesson.data.chapterNumber <= 5 ? 'Foundation' : 'Intermediate',
          lessonId: chapterId,
          hasContent: true,
          isPartial: !stats.authored,
          stats,
          topics: [],
        });
        usedLessons.add(lesson.slug);
      }
      const constructions = lessons.find((l) => l.slug === 'constructions');
      if (constructions && !chapters.some((c) => c.id === 'constructions')) {
        const unit = units.find((u) => u.name.includes('Geometry'));
        const stats = lessonStats(constructions.data);
        chapters.push({
          id: 'constructions',
          name: 'Constructions',
          order: 9,
          unitId: unit?.id || 'geometry',
          unitName: unit?.name || 'Geometry',
          marks: null,
          periods: null,
          summary: 'Formal construction of similar triangles and tangents using ruler and compass.',
          difficulty: 'Intermediate',
          lessonId: 'constructions',
          hasContent: true,
          isPartial: !stats.authored,
          stats,
          topics: [],
        });
      }
      chapters.sort((a, b) => a.order - b.order);
      chapters.forEach((c, index) => { c.order = index + 1; c.number = index + 1; });
    } else {
      let order = 0;
      for (const unit of units) {
        for (const topic of unit.topics) {
          const lesson = matchLesson(lessons, topic.name);
          const stats = lessonStats(lesson?.data);
          const chapterId = slugify(topic.name);
          chapters.push({
            id: chapterId,
            name: topic.name,
            order: ++order,
            number: order,
            unitId: unit.id,
            unitName: unit.name,
            marks: unit.marks,
            periods: topic.periods,
            summary: unit.section ? `${unit.section} · ${unit.name}` : unit.name,
            difficulty: topic.difficulty === 'hard' ? 'Advanced' : topic.difficulty === 'easy' ? 'Foundation' : 'Intermediate',
            lessonId: lesson ? chapterId : null,
            hasContent: Boolean(lesson),
            isPartial: Boolean(lesson) && !stats.authored,
            stats,
            topics: [],
          });
          if (lesson) usedLessons.add(lesson.slug);
        }
      }
    }

    attachOfficialTopics(spec.id, chapters, units);

    const lessonDirOut = path.join(OUT, 'lessons', spec.id);
    ensure(lessonDirOut);
    for (const chapter of chapters) {
      if (!chapter.lessonId) continue;
      const lesson = spec.id === 'mathematics'
        ? lessons.find((l) => l.slug === chapter.lessonId)
        : lessons.find((l) => matchLesson([l], chapter.name));
      if (!lesson) continue;
      const payload = {
        ...lesson.data,
        id: chapter.id,
        chapterId: chapter.id,
        subjectId: spec.id,
        subjectName,
        unitId: chapter.unitId,
        unitName: chapter.unitName,
        examWeightage: chapter.marks,
        stats: chapter.stats,
      };
      fs.writeFileSync(path.join(lessonDirOut, `${chapter.id}.json`), JSON.stringify(payload, null, 2));
      allQuestions.push(...buildQuestions(spec.id, chapter, lesson.data));
    }

    curriculum.subjects.push({
      id: spec.id,
      name: subjectName,
      shortName: spec.id === 'mathematics' ? 'Maths' : spec.id === 'social-science' ? 'Social Science' : subjectName,
      accent: spec.accent,
      icon: spec.icon,
      code: okf.course_structure?.code || '',
      maxMarks: okf.course_structure?.max_marks || 80,
      internalMarks: okf.course_structure?.internal_assessment || 20,
      totalPeriods: okf.course_structure?.total_periods || units.reduce((sum, u) => sum + (u.periods || 0), 0),
      description: `${okf.course_structure?.subject || subjectName} · CBSE Class X (2026-27)`,
      units,
      chapters,
      coverage: {
        total: chapters.length,
        authored: chapters.filter((c) => c.hasContent && !c.isPartial).length,
        partial: chapters.filter((c) => c.isPartial).length,
        syllabusOnly: chapters.filter((c) => !c.hasContent).length,
      },
    });

    sourceIndex.push({
      subjectId: spec.id,
      pdf: {
        mathematics: 'maths.pdf',
        science: 'science.pdf',
        'social-science': 'social_science.pdf',
        english: 'english.pdf',
      }[spec.id],
      pages: null,
      note: 'Official CBSE 2026-27 curriculum PDF, imported without modification.',
    });
  }

  curriculum.subjects.sort((a, b) => SUBJECTS.findIndex((s) => s.id === a.id) - SUBJECTS.findIndex((s) => s.id === b.id));
  fs.writeFileSync(path.join(OUT, 'curriculum.json'), JSON.stringify(curriculum, null, 2));
  fs.writeFileSync(path.join(OUT, 'questions.json'), JSON.stringify(allQuestions, null, 2));
  fs.writeFileSync(path.join(OUT, 'sources.json'), JSON.stringify(sourceIndex, null, 2));

  const planSource = path.join(SOURCE, 'plan', 'study-plan-ncert-2026-27.json');
  if (fs.existsSync(planSource)) {
    const plan = readJson(planSource);
    const math = curriculum.subjects.find((s) => s.id === 'mathematics');
    const weeks = [];
    const phases = plan.studySchedule || {};
    let week = 0;
    for (const [key, phase] of Object.entries(phases)) {
      const chapterIds = phase.order || [];
      for (const chapterId of chapterIds) {
        const chapter = math?.chapters.find((c) => c.id === chapterId);
        if (!chapter) continue;
        week += 1;
        weeks.push({
          week,
          phase: key,
          phaseName: phase.name,
          chapterId,
          chapterName: chapter.name,
          subjectId: 'mathematics',
          focus: week % 2 === 0 ? 'Practice + error log' : 'Concept + NCERT exercises',
          minutes: 240,
          target: `${chapter.name}: 2 focused sessions, 1 diagnostic set`,
          resource: 'NCERT core + RD Sharma must-do',
        });
      }
    }
    fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify({
      meta: plan.meta,
      pedagogy: plan.pedagogy,
      validation: plan.validation,
      phases,
      weeks,
    }, null, 2));
  }

  const counts = {
    subjects: curriculum.subjects.length,
    chapters: curriculum.subjects.reduce((sum, s) => sum + s.chapters.length, 0),
    lessons: curriculum.subjects.reduce((sum, s) => sum + s.chapters.filter((c) => c.hasContent).length, 0),
    questions: allQuestions.length,
    authored: curriculum.subjects.reduce((sum, s) => sum + s.coverage.authored, 0),
  };
  console.log('content synced', counts);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildCurriculum();
}

export { matchLesson, normalizeDifficulty };
