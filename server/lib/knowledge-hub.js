import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getChapter, getLesson, getQuestions } from './data.js';
import { getVideoEntry } from './video-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDE_FILE = path.resolve(__dirname, '..', 'data', 'knowledge-hub-overrides.json');

let overrides = {};
try {
  overrides = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'));
} catch {
  overrides = {};
}

const INDIA_RE = /\b(india|indian|cbse|ncert|rupee|₹|mandi|kirana|upi|aadhaar|diwali|eid|holi|kerala|mumbai|delhi|chennai|kolkata|bengaluru|rajasthan|ganga|himalaya|monsoon|panchayat|saris|vedic|aryabhata|brahmagupta|ramanujan|konark|taj mahal)\b/i;

const SUBJECT_CAREERS = {
  mathematics: ['Data Science', 'Engineering', 'Actuarial Science', 'Banking & Finance', 'Cryptography', 'Architecture', 'Teaching'],
  science: ['Medicine', 'Pharmacy', 'Biotechnology', 'Environmental Science', 'Electrical Engineering', 'Chemical Engineering', 'Research'],
  'social-science': ['Civil Services', 'Law', 'Journalism', 'Economics', 'Public Policy', 'Urban Planning', 'Social Work'],
  english: ['Journalism', 'Law', 'Content Writing', 'Teaching', 'Publishing', 'Translation', 'Civil Services'],
};

const CHAPTER_CAREERS = {
  'real-numbers': ['Cryptography', 'Banking & Finance', 'Data Science', 'Computer Science'],
  polynomials: ['Engineering', 'Computer Graphics', 'Economics', 'Data Science'],
  'pair-of-linear-equations': ['Operations Research', 'Economics', 'Engineering', 'Logistics'],
  'quadratic-equations': ['Engineering', 'Physics', 'Computer Science', 'Architecture'],
  'arithmetic-progressions': ['Finance', 'Actuarial Science', 'Computer Science', 'Economics'],
  'coordinate-geometry': ['Surveying', 'Computer Graphics', 'Architecture', 'Geospatial Technology'],
  triangles: ['Architecture', 'Civil Engineering', 'Surveying', 'Design'],
  circles: ['Mechanical Engineering', 'Architecture', 'Astronomy', 'Design'],
  'introduction-to-trigonometry': ['Surveying', 'Navigation', 'Engineering', 'Astronomy'],
  constructions: ['Civil Engineering', 'Architecture', 'Interior Design', 'Surveying'],
  'applications-of-trigonometry': ['Civil Engineering', 'Aviation', 'Surveying', 'Defence'],
  'areas-related-to-circles': ['Architecture', 'Mechanical Engineering', 'Design', 'Landscaping'],
  'surface-areas-and-volumes': ['Packaging', 'Civil Engineering', 'Manufacturing', 'Architecture'],
  statistics: ['Data Science', 'Actuarial Science', 'Economics', 'Market Research'],
  probability: ['Data Science', 'Insurance', 'Finance', 'Artificial Intelligence'],
  'chemical-reactions-and-equations': ['Chemical Engineering', 'Pharmacy', 'Materials Science', 'Environmental Science'],
  'acids-bases-and-salts': ['Chemistry', 'Pharmacy', 'Food Technology', 'Environmental Science'],
  'metals-and-non-metals': ['Metallurgy', 'Materials Science', 'Mechanical Engineering', 'Mining'],
  'carbon-and-its-compounds': ['Organic Chemistry', 'Pharmacy', 'Petrochemicals', 'Materials Science'],
  'periodic-classification-of-elements': ['Chemistry', 'Materials Science', 'Research', 'Pharmacy'],
  'life-processes': ['Medicine', 'Biotechnology', 'Nutrition', 'Environmental Science'],
  'control-and-coordination': ['Medicine', 'Neuroscience', 'Psychology', 'Physiotherapy'],
  'how-do-organisms-reproduce': ['Medicine', 'Biotechnology', 'Agriculture', 'Genetics'],
  'heredity-and-evolution': ['Genetics', 'Biotechnology', 'Medicine', 'Evolutionary Biology'],
  'light-reflection-and-refraction': ['Optics', 'Ophthalmology', 'Photography', 'Engineering'],
  'human-eye-and-colourful-world': ['Ophthalmology', 'Optics', 'Design', 'Physics'],
  electricity: ['Electrical Engineering', 'Electronics', 'Renewable Energy', 'Robotics'],
  'magnetic-effects-of-electric-current': ['Electrical Engineering', 'Motors & Generators', 'Robotics', 'Physics'],
  'our-environment': ['Environmental Science', 'Conservation', 'Public Policy', 'Sustainability'],
  'management-of-natural-resources': ['Environmental Management', 'Forestry', 'Public Policy', 'Sustainability'],
  'the-rise-of-nationalism-in-europe': ['History', 'Civil Services', 'International Relations', 'Law'],
  'nationalism-in-india': ['Civil Services', 'History', 'Law', 'Journalism'],
  'the-making-of-a-global-world': ['International Relations', 'Economics', 'History', 'Trade Policy'],
  'the-age-of-industrialization': ['Economics', 'History', 'Business', 'Labour Studies'],
  'print-culture-and-the-modern-world': ['Publishing', 'Journalism', 'Media Studies', 'History'],
  'resources-and-development': ['Urban Planning', 'Environmental Science', 'Civil Services', 'Geography'],
  'forest-and-wildlife-resources': ['Forestry', 'Wildlife Conservation', 'Environmental Law', 'Ecology'],
  'water-resources': ['Water Management', 'Civil Engineering', 'Environmental Science', 'Public Policy'],
  agriculture: ['Agriculture', 'Agribusiness', 'Food Technology', 'Rural Development'],
  'minerals-and-energy-resources': ['Mining', 'Energy Policy', 'Geology', 'Environmental Science'],
  'manufacturing-industries': ['Manufacturing', 'Industrial Engineering', 'Business', 'Supply Chain'],
  'lifelines-of-national-economy': ['Logistics', 'Transport Planning', 'Trade', 'Civil Services'],
  'power-sharing': ['Public Policy', 'Law', 'Civil Services', 'Political Science'],
  federalism: ['Law', 'Public Administration', 'Civil Services', 'Political Science'],
  'gender-religion-and-caste': ['Sociology', 'Law', 'Social Work', 'Journalism'],
  'political-parties': ['Political Science', 'Law', 'Civil Services', 'Journalism'],
  'outcomes-of-democracy': ['Public Policy', 'Political Science', 'Civil Services', 'Law'],
  development: ['Economics', 'Public Policy', 'Civil Services', 'Social Work'],
  'sectors-of-the-indian-economy': ['Economics', 'Banking', 'Public Policy', 'Business'],
  'money-and-credit': ['Banking', 'Finance', 'Economics', 'Fintech'],
  'globalisation-and-the-indian-economy': ['International Trade', 'Economics', 'Business', 'Public Policy'],
  'consumer-rights': ['Law', 'Consumer Protection', 'Public Policy', 'Journalism'],
};

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const unique = (items) => [...new Set(items.map(text).filter(Boolean))];

function collectIndiaContext(lesson) {
  const candidates = [];
  for (const concept of asArray(lesson?.concepts)) {
    candidates.push(concept.real_life_application, concept.purpose, ...asArray(concept.day_to_day_usage));
  }
  for (const theorem of asArray(lesson?.theorems)) {
    candidates.push(theorem.historical_context, theorem.real_world_utility);
  }
  const found = unique(candidates.filter((item) => item && INDIA_RE.test(item)));
  return found.slice(0, 4);
}

function collectQuickCheck(lesson) {
  const quizzes = lesson?.quizzes || {};
  const questions = [];
  for (const level of ['simple', 'medium', 'complex']) {
    for (const quiz of asArray(quizzes[level])) {
      if (!quiz?.question || !Array.isArray(quiz.options)) continue;
      const explanation = typeof quiz.explanation === 'string'
        ? quiz.explanation
        : quiz.explanation?.correct || '';
      questions.push({
        level,
        question: quiz.question,
        options: quiz.options,
        correct: Number(quiz.correct) || 0,
        explanation,
      });
      if (questions.length >= 4) return questions;
    }
  }
  return questions;
}

function collectWorkedExamples(lesson) {
  return asArray(lesson?.worked_examples).slice(0, 3).map((example) => ({
    title: example.title || example.topic || 'Worked example',
    problem: example.problem || '',
    steps: asArray(example.board_mode || example.solution || example.steps).slice(0, 10),
    shortcut: example.competitive_shortcut || example.speed_mode || '',
  }));
}

function collectShortcuts(lesson) {
  const shortcuts = [];
  for (const item of asArray(lesson?.vedic_math_shortcuts)) {
    shortcuts.push({
      title: item.title || 'Shortcut',
      concept: item.concept || '',
      application: item.real_numbers_application || item.application || '',
    });
  }
  for (const example of asArray(lesson?.worked_examples)) {
    if (example.competitive_shortcut) {
      shortcuts.push({
        title: example.topic || 'Competitive shortcut',
        concept: example.competitive_shortcut,
        application: 'Use when the same pattern appears in a timed exam.',
      });
    }
  }
  return shortcuts.slice(0, 6);
}

function collectVisuals(lesson) {
  return asArray(lesson?.visualizations).slice(0, 4).map((visual, index) => {
    const props = visual.visualizationProperties || visual;
    return {
      title: props.title || visual.title || `Visual ${index + 1}`,
      type: props.type || visual.rendererType || 'concept diagram',
      description: props.description || visual.description || '',
    };
  });
}

function collectMindMap(lesson) {
  const map = lesson?.mind_maps;
  if (!map) return null;
  return {
    title: map.title || 'Chapter mind map',
    branches: asArray(map.branches).map((branch) => branch.concept || branch.name || '').filter(Boolean).slice(0, 10),
  };
}

function buildFallback(chapter) {
  const topics = asArray(chapter?.topics).map((topic) => topic.name || topic).filter(Boolean);
  const title = chapter?.name || 'Topic';
  return {
    outcomes: topics.length ? topics.map((topic) => `Explain and apply ${topic}.`) : [`Understand ${title}.`],
    concepts: topics.map((topic) => ({
      name: topic,
      purpose: `Build clear understanding of ${topic} with definitions, examples and exam-style practice.`,
      realLife: '',
    })),
    keyPoints: topics.length ? topics : [`Revise the core definitions and examples of ${title}.`],
    revisionPlan: [
      `Read the ${title} notes and write five key definitions.`,
      'Solve three board-style questions and check every step.',
      'Attempt a timed mixed practice set and review mistakes.',
    ],
    applyTips: [
      'Write the given information and what is asked before solving.',
      'Show every step; board marking rewards reasoning.',
      'Reattempt wrong questions after 24 hours.',
    ],
    quickCheck: [],
  };
}

function buildConnect(chapter, lesson, override) {
  const careers = CHAPTER_CAREERS[chapter?.id] || SUBJECT_CAREERS[chapter?.subjectId] || SUBJECT_CAREERS[chapter?.subjectName?.toLowerCase()] || [];
  const realLife = unique([
    ...asArray(lesson?.concepts).flatMap((concept) => [concept.real_life_application, ...asArray(concept.day_to_day_usage)]),
    ...asArray(override?.connect?.realLife),
  ]).slice(0, 6);
  const competitive = unique([
    ...asArray(lesson?.worked_examples).map((example) => example.competitive_shortcut),
    ...asArray(lesson?.vedic_math_shortcuts).map((item) => item.real_numbers_application || item.concept),
    ...asArray(override?.connect?.competitive),
  ]).slice(0, 5);
  const indianContext = unique([
    ...collectIndiaContext(lesson),
    ...asArray(override?.connect?.indianContext),
  ]).slice(0, 5);
  const academics = unique([
    ...asArray(lesson?.outcomes),
    ...asArray(override?.connect?.academics),
    chapter?.unitName ? `Unit: ${chapter.unitName}` : '',
    chapter?.marks ? `CBSE weightage: ${chapter.marks} marks` : '',
  ]).slice(0, 6);
  return {
    academics,
    competitive: competitive.length ? competitive : ['Practise previous-year CBSE questions and one competitive-exam style set.'],
    realLife: realLife.length ? realLife : ['Connect the topic to everyday decisions, measurements and observations around you.'],
    indianContext: indianContext.length ? indianContext : ['Use Indian examples from homes, markets, agriculture, transport and public services while revising.'],
    careers: unique([...(override?.connect?.careers || []), ...careers]).slice(0, 6),
  };
}

export function buildKnowledgeHub(subjectId, chapterId) {
  const chapter = getChapter(subjectId, chapterId);
  if (!chapter) return null;
  const lesson = getLesson(subjectId, chapterId);
  const override = overrides[`${subjectId}:${chapterId}`] || null;
  const fallback = buildFallback(chapter);
  const videoEntry = getVideoEntry(subjectId, chapterId);
  const questionBank = getQuestions({ subjectId, chapterId });
  const concepts = asArray(lesson?.concepts).map((concept) => ({
    name: concept.name || concept.title || 'Concept',
    purpose: concept.purpose || concept.explanation || '',
    realLife: concept.real_life_application || '',
  }));
  const theorems = asArray(lesson?.theorems).map((theorem) => ({
    name: theorem.name || 'Theorem',
    statement: theorem.statement || '',
  }));
  const misconceptions = unique(asArray(lesson?.common_misconceptions));
  const shortcuts = collectShortcuts(lesson);
  const quickCheck = collectQuickCheck(lesson);
  const workedExamples = collectWorkedExamples(lesson);
  const visuals = collectVisuals(lesson);
  const mindMap = collectMindMap(lesson);
  const flowcharts = asArray(lesson?.flowcharts).map((flow) => flow.title || 'Flowchart').filter(Boolean).slice(0, 4);

  return {
    title: `${chapter.name} — Student Knowledge Hub for India`,
    subjectId,
    subjectName: chapter.subjectName,
    chapterId,
    chapterName: chapter.name,
    unitName: chapter.unitName || '',
    marks: chapter.marks || 0,
    periods: chapter.periods || 0,
    difficulty: chapter.difficulty || '',
    summary: chapter.summary || '',
    examWeightage: lesson?.examWeightage || chapter.marks || 0,
    topics: asArray(chapter.topics).map((topic) => topic.name || topic).filter(Boolean),
    understand: {
      outcomes: unique([...asArray(override?.understand), ...asArray(lesson?.outcomes), ...fallback.outcomes]).slice(0, 8),
      concepts: concepts.length ? concepts.slice(0, 8) : fallback.concepts,
    },
    visualize: {
      items: visuals.length ? visuals : asArray(override?.visualize).map((item) => ({ title: item, type: 'study visual', description: '' })),
      mindMap,
      flowcharts,
    },
    remember: {
      keyPoints: unique([...asArray(override?.remember), ...concepts.map((concept) => concept.name), ...theorems.map((theorem) => theorem.name), ...fallback.keyPoints]).slice(0, 10),
      theorems: theorems.slice(0, 6),
      misconceptions: misconceptions.slice(0, 6),
      shortcuts,
    },
    revise: {
      quickCheck: quickCheck.length ? quickCheck : asArray(override?.quickCheck),
      revisionPlan: unique([...asArray(override?.revise), ...fallback.revisionPlan]).slice(0, 6),
      questionBank: {
        total: questionBank.length,
        mcq: questionBank.filter((question) => question.type === 'mcq').length,
        subjective: questionBank.filter((question) => question.type === 'subjective').length,
      },
    },
    apply: {
      workedExamples: workedExamples.length ? workedExamples : [],
      tips: unique([...asArray(override?.apply), ...fallback.applyTips]).slice(0, 6),
      practice: {
        subjectId,
        chapterId,
        suggestedCount: Math.min(12, Math.max(5, questionBank.filter((question) => question.type === 'mcq').length || 5)),
      },
    },
    connect: buildConnect(chapter, lesson, override),
    sources: asArray(lesson?.web_references).slice(0, 5).map((source) => ({
      title: source.title || 'Reference',
      url: source.url || '',
      type: source.type || 'reference',
    })),
    videos: videoEntry?.picks || [],
    video: videoEntry?.primary || null,
    videoValidation: videoEntry?.validation || null,
  };
}
