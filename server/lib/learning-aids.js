import { getLesson, getChapter, subjects, subjectById } from './data.js';
import { getConceptGraph } from './rag.js';

const AID_IDS = [
  'tldr', 'keyideas', 'bigpicture', 'chapteroverview', 'whyitmatters',
  'cheatsheet', 'recap', 'examnotes', 'mindmap', 'conceptmap',
  'flowchart', 'diagram', 'visualsummary', 'formulasheet',
  'solveliketeacher', 'shortcutmethods', 'mistakeguide', 'problempatterns',
  'workedexamples', 'causeeffect', 'processbreakdown', 'mechanism',
  'scientificstory', 'breakitdown', 'learnfromscratch', 'tutormode',
  'storymethodwithmemoryhooks', 'conceptconnections', 'learningpath', 'quizme',
];

const AID_LABELS = {
  tldr: 'TL;DR',
  keyideas: 'Key Ideas',
  bigpicture: 'Big Picture',
  chapteroverview: 'Chapter Overview',
  whyitmatters: 'Why It Matters',
  cheatsheet: 'Cheat Sheet',
  recap: 'Recap',
  examnotes: 'Exam Notes',
  mindmap: 'Mind Map',
  conceptmap: 'Concept Map',
  flowchart: 'Flow Chart',
  diagram: 'Diagram',
  visualsummary: 'Visual Summary',
  formulasheet: 'Formula Sheet',
  solveliketeacher: 'Solve Like a Teacher',
  shortcutmethods: 'Shortcut Methods',
  mistakeguide: 'Mistake Guide',
  problempatterns: 'Problem Patterns',
  workedexamples: 'Worked Examples',
  causeeffect: 'Cause & Effect',
  processbreakdown: 'Process Breakdown',
  mechanism: 'Mechanism',
  scientificstory: 'Scientific Story',
  breakitdown: 'Break It Down',
  learnfromscratch: 'Learn from Scratch',
  tutormode: 'Tutor Mode',
  storymethodwithmemoryhooks: 'Story Method with Memory Hooks',
  conceptconnections: 'Concept Connections',
  learningpath: 'Learning Path',
  quizme: 'Quiz Me',
};

const AID_GROUPS = {
  overview: ['tldr', 'keyideas', 'bigpicture', 'chapteroverview', 'whyitmatters'],
  quickrevise: ['cheatsheet', 'recap', 'examnotes', 'formulasheet'],
  visual: ['mindmap', 'conceptmap', 'flowchart', 'diagram', 'visualsummary'],
  practice: ['solveliketeacher', 'workedexamples', 'quizme'],
  shortcuts: ['shortcutmethods', 'mistakeguide', 'problempatterns'],
  deepdive: ['causeeffect', 'processbreakdown', 'mechanism', 'scientificstory', 'breakitdown', 'learnfromscratch'],
  connect: ['tutormode', 'storymethodwithmemoryhooks', 'conceptconnections', 'learningpath'],
};

const ALL_AIDS = Object.values(AID_GROUPS).flat();

export function getAllAidIds() {
  return [...AID_IDS];
}

export function getAidLabel(aidId) {
  return AID_LABELS[aidId] || aidId;
}

export function getAidGroups() {
  return AID_GROUPS;
}

export function getAidGroup(aidId) {
  for (const [group, aids] of Object.entries(AID_GROUPS)) {
    if (aids.includes(aidId)) return group;
  }
  return 'other';
}

function firstNonEmpty(...values) {
  for (const v of values) {
    if (v != null && v !== '' && !(Array.isArray(v) && v.length === 0)) return v;
  }
  return null;
}

export function buildLearningAids(subjectId, chapterId) {
  const chapter = getChapter(subjectId, chapterId);
  const lesson = getChapter(subjectId, chapterId) ? getLesson(subjectId, chapterId) : null;
  const graph = lesson ? getConceptGraph(subjectId, chapterId) : null;

  const concepts = (lesson && lesson.concepts) || [];
  const theorems = (lesson && lesson.theorems) || [];
  const examples = (lesson && lesson.worked_examples) || [];
  const exercises = lesson && lesson.exercises ? Object.values(lesson.exercises).flatMap((g) => g.problems || []) : [];
  const quizzes = lesson && lesson.quizzes ? Object.values(lesson.quizzes).flat() : [];
  const misconceptions = (lesson && lesson.common_misconceptions) || [];
  const shortcuts = (lesson && lesson.vedic_math_shortcuts) || [];
  const mindMaps = (lesson && lesson.mind_maps) || null;
  const conceptMaps = (lesson && lesson.concept_maps) || null;
  const flowcharts = (lesson && lesson.flowcharts) || [];
  const visualizations = (lesson && lesson.visualizations) || [];
  const chapterStats = chapter ? chapter.stats : {};

  const tldr = firstNonEmpty(
    lesson && lesson.outcomes && lesson.outcomes[0],
    chapter && chapter.summary
  );

  const keyideas = concepts.slice(0, 5).map((c) => c.name || c.title || '').filter(Boolean);
  const bigpicture = lesson && lesson.outcomes ? lesson.outcomes.slice(0, 3) : null;
  const chapteroverview = chapter && chapter.summary ? chapter.summary : null;
  const whyitmatters = concepts.slice(0, 3).map((c) => c.real_life_application || c.purpose || '').filter(Boolean);

  const cheatsheet = [
    ...theorems.slice(0, 3).map((t) => t.name + ': ' + (t.statement || '')),
    ...concepts.slice(0, 3).map((c) => (c.name || c.title) + ': ' + (c.explanation || c.key_points?.[0] || '')),
  ].filter(Boolean);

  const recap = [
    ...concepts.slice(0, 3).map((c) => (c.name || c.title) + ' — ' + (c.key_points?.[0] || '')),
  ].filter(Boolean);

  const examnotes = [
    ...theorems.slice(0, 2).map((t) => 'Theorem: ' + t.name),
    ...exercises.slice(0, 3).map((e) => 'Q: ' + e.question),
  ].filter(Boolean);

  const mindmap = mindMaps ? { title: mindMaps.title || 'Mind Map', branches: mindMaps.branches || [] } : null;
  const conceptmap = conceptMaps ? { title: conceptMaps.title || 'Concept Map', nodes: conceptMaps.nodes || [], edges: conceptMaps.edges || [] } : (graph ? { title: graph.title || 'Concept Map', nodes: graph.nodes || [], edges: graph.edges || [] } : null);
  const flowchart = flowcharts.length ? { title: flowcharts[0].title || 'Flow Chart', steps: flowcharts[0].steps || [] } : null;
  const diagram = visualizations.length ? { title: visualizations[0].visualizationProperties?.title || 'Diagram', type: visualizations[0].visualizationProperties?.type || 'visual', props: visualizations[0].visualizationProperties } : null;
  const visualsummary = visualizations.length > 1 ? { title: 'Visual Summary', count: visualizations.length } : null;

  const formulasheet = [
    ...theorems.map((t) => ({ name: t.name, statement: t.statement })),
    ...shortcuts.map((s) => ({ name: s.name || s.title || 'Shortcut', statement: s.description || '' })),
  ];

  const solveliketeacher = examples.length ? { title: 'Worked Example', problem: examples[0].problem, steps: examples[0].board_mode || examples[0].solution, answer: examples[0].answer } : null;
  const shortcutmethods = shortcuts.map((s) => ({ name: s.name || s.title || 'Shortcut', method: s.method || s.description || '' }));

  const mistakeguide = misconceptions.map((m) => ({ misconception: m.misconception || m, correction: m.correction || '' }));

  const problempatterns = exercises.slice(0, 5).map((e) => ({ pattern: e.question, type: e.difficulty || 'medium' }));

  const workedexamples = examples.map((ex) => ({ title: ex.topic || ex.title || 'Example', problem: ex.problem, steps: ex.board_mode || ex.solution, answer: ex.answer }));

  const causeeffect = concepts.filter((c) => c.real_life_application).map((c) => ({ cause: c.name || c.title, effect: c.real_life_application }));

  const processbreakdown = flowcharts.length ? { title: flowcharts[0].title || 'Process', steps: flowcharts[0].steps } : null;

  const mechanism = concepts.slice(0, 3).map((c) => ({ concept: c.name || c.title, explanation: c.explanation || c.key_points?.[0] || '' }));

  const scientificstory = lesson && lesson.theorems.length ? { title: 'Scientific Story', story: lesson.theorems[0].historical_context || lesson.theorems[0].why_proposed || '' } : null;

  const breakitdown = concepts.slice(0, 4).map((c) => ({ part: c.name || c.title, detail: c.key_points ? c.key_points.join('; ') : c.explanation || '' }));

  const learnfromscratch = chapter && chapter.summary ? { title: 'Learn from Scratch', summary: chapter.summary, prerequisites: lesson && lesson.prerequisite_nodes ? lesson.prerequisite_nodes : [] } : null;

  const tutormode = { title: 'Tutor Mode', subjectId, chapterId, mode: 'eli5' };

  const storymethodwithmemoryhooks = concepts.slice(0, 3).map((c) => ({ hook: c.name || c.title, story: c.real_life_application || c.purpose || '' }));

  const conceptconnections = conceptMaps ? { nodes: conceptMaps.nodes || [], edges: conceptMaps.edges || [] } : (graph ? { nodes: graph.nodes || [], edges: graph.edges || [] } : null);

  const learningpath = { subjectId, chapterId, chapterName: chapter ? chapter.name : '', unitName: chapter ? chapter.unitName : '' };

  const quizme = { chapterId, subjectId, count: Math.min(quizzes.length, 10), questions: quizzes.slice(0, 10) };

  const aidData = {
    tldr, keyideas, bigpicture, chapteroverview, whyitmatters,
    cheatsheet, recap, examnotes, mindmap, conceptmap,
    flowchart, diagram, visualsummary, formulasheet,
    solveliketeacher, shortcutmethods, mistakeguide, problempatterns,
    workedexamples, causeeffect, processbreakdown, mechanism,
    scientificstory, breakitdown, learnfromscratch, tutormode,
    storymethodwithmemoryhooks, conceptconnections, learningpath, quizme,
  };

  const aids = [];
  for (const aidId of AID_IDS) {
    const data = aidData[aidId];
    const hasContent = data != null && (
      Array.isArray(data) ? data.length > 0 : typeof data === 'string' ? data.length > 0 : Object.keys(data).length > 0
    );
    aids.push({
      id: aidId,
      label: AID_LABELS[aidId],
      group: getAidGroup(aidId),
      hasContent,
      data,
    });
  }

  return {
    subjectId,
    chapterId,
    chapterName: chapter ? chapter.name : null,
    subjectName: chapter ? chapter.subjectName : null,
    hasLesson: Boolean(lesson),
    stats: chapterStats,
    aids,
    aidsWithContent: aids.filter((a) => a.hasContent),
  };
}

export function getLearningAids(subjectId, chapterId) {
  return buildLearningAids(subjectId, chapterId);
}
