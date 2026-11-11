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

export const AID_LABELS = {
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

function safeStr(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(' ');
  return String(value);
}

/**
 * Build solved exercise with step-by-step, shortcuts, formula used, why it matters.
 */
function buildSolvedExercise(problem) {
  const steps = problem.solution_step_by_step || problem.solution || [];
  const finalAnswer = problem.final_answer || problem.answer || '';
  const shortcut = problem.competitive_shortcut || problem.board_tip || '';
  const bookSource = problem.book_source || 'NCERT Textbook';

  return {
    id: problem.id || '',
    question: problem.question,
    steps,
    finalAnswer,
    shortcut,
    formulaUsed: extractFormulaUsed(steps.join(' '), problem.subjectId),
    whyThisMethod: extractWhyThisMethod(shortcut),
    bookSource,
    difficulty: problem.difficulty || 'medium',
  };
}

function extractFormulaUsed(text, subjectId) {
  const formulaMap = {
    mathematics: [
      { pattern: /hcf|gcd|euclid/i, formula: 'HCF/GCD via Euclid\'s Algorithm', when: 'When finding the largest common divisor of two numbers' },
      { pattern: /lcm/i, formula: 'LCM via Prime Factorization', when: 'When finding the smallest common multiple' },
      { pattern: /a × b = lcm|a.*b.*lcm.*hcf/i, formula: 'a × b = LCM × HCF', when: 'To find one number when LCM, HCF and other number are known' },
      { pattern: /prime factorization|prime factor/i, formula: 'Prime Factorization', when: 'To break down composite numbers into prime factors' },
      { pattern: /decimal|terminat/i, formula: 'Denominator Prime Factor Rule', when: 'To check if a decimal terminates (only prime factors 2 and 5)' },
    ],
    science: [
      { pattern: /photosynthesis/i, formula: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', when: 'Photosynthesis equation — light energy to chemical energy' },
      { pattern: /respiration/i, formula: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy (ATP)', when: 'Cellular respiration — glucose to energy' },
      { pattern: /transport|xylem|phloem/i, formula: 'Xylem: Water & minerals upward', when: 'Plant transport — water and minerals move up from roots' },
    ],
    social_science: [],
  };
  const subjectFormulas = formulaMap[subjectId] || [];
  for (const { pattern, formula, when } of subjectFormulas) {
    if (pattern.test(text)) return { formula, when };
  }
  return { formula: 'General problem-solving method', when: 'Apply step-by-step logical reasoning' };
}

function extractWhyThisMethod(shortcut) {
  if (!shortcut) return 'This method uses step-by-step logical reasoning as taught in NCERT.';
  return shortcut;
}

/**
 * Build science experiment content.
 */
function buildScienceExperiment(lesson, chapterName) {
  const concepts = lesson.concepts || [];
  const experiments = [];

  // Generate experiment ideas based on chapter concepts
  concepts.forEach((c, i) => {
    const name = c.name || c.title || `Concept ${i + 1}`;
    const explanation = c.explanation || c.key_points?.[0] || '';
    const realLife = c.real_life_application || '';

    experiments.push({
      id: `exp-${i + 1}`,
      title: `Experiment: ${name}`,
      chapter: chapterName,
      objective: `To understand and verify: ${name}`,
      materialsRequired: ['Textbook', 'Notebook', 'Pen/Pencil', 'Related lab equipment (as per school lab)'],
      steps: [
        `Step 1: Read the concept "${name}" from your NCERT textbook.`,
        `Step 2: Write down the key definition: ${safeStr(explanation).slice(0, 100)}`,
        `Step 3: Perform the activity described in the textbook for this concept.`,
        `Step 4: Record your observations in a table.`,
        `Step 5: Write the conclusion linking to real life: ${safeStr(realLife).slice(0, 100)}`,
      ],
      observations: 'Record observations as per your school science lab manual.',
      conclusion: `The experiment confirms: ${name} works as explained in the textbook.`,
      realLifeConnection: realLife || 'See textbook for real-life applications.',
      safetyNote: 'Perform all experiments under teacher supervision. Wear safety goggles for chemistry experiments.',
    });
  });

  return experiments;
}

/**
 * Build MCQ answers with explanations.
 */
function buildMcqAnswers(quizzes) {
  return quizzes.map((q, i) => ({
    id: q.id || `mcq-${i + 1}`,
    question: q.question,
    options: q.options || [],
    correctIndex: q.correct != null ? q.correct : 0,
    correctAnswer: q.options?.[q.correct] || '',
    explanation: q.explanation?.correct || q.explanation?.wrong_options || 'Refer to NCERT textbook for detailed explanation.',
    difficulty: q.difficulty || 'medium',
  }));
}

/**
 * Build bibliography and equations at end of chapter.
 */
function buildBibliographyAndEquations(lesson, subjectId) {
  const theorems = lesson.theorems || [];
  const concepts = lesson.concepts || [];
  const shortcuts = lesson.vedic_math_shortcuts || [];

  const equations = [];
  const bibliography = [];

  // Collect equations from theorems and concepts
  theorems.forEach((t, i) => {
    if (t.statement) {
      equations.push({
        id: `eq-${i + 1}`,
        name: t.name,
        statement: t.statement,
        subject: subjectId,
        context: t.proposed_by?.name ? `Proposed by ${t.proposed_by.name} (${t.proposed_by.era})` : 'NCERT',
      });
    }
  });

  // Bibliography from lesson metadata
  bibliography.push({
    id: 'bib-1',
    title: 'NCERT Textbook — Class X',
    publisher: 'National Council of Educational Research and Training (NCERT)',
    year: '2026-27',
    subject: subjectId,
    chapter: lesson.chapter || lesson.title,
    type: 'Primary Textbook',
  });

  if (lesson.rd_sharma_extensions) {
    bibliography.push({
      id: 'bib-2',
      title: 'R.D. Sharma — Mathematics Class X',
      publisher: 'Dhanpat Rai Publications',
      year: 'Latest Edition',
      subject: subjectId,
      type: 'Reference Book',
    });
  }

  if (lesson.rs_aggarwal_extensions) {
    bibliography.push({
      id: 'bib-3',
      title: 'R.S. Aggarwal — Mathematics Class X',
      publisher: 'Bharati Bhawan',
      year: 'Latest Edition',
      subject: subjectId,
      type: 'Reference Book',
    });
  }

  return { equations, bibliography };
}

/**
 * Build social studies historical data: dates, revolts, wars, renaissance.
 */
function buildSocialStudiesData(lesson, chapterName) {
  const concepts = lesson.concepts || [];
  const theorems = lesson.theorems || []; // In social science, these might be historical events

  const historicalEvents = [];
  const revoltsAndWars = [];
  const renaissanceEvents = [];
  const importantDates = [];
  const questionNotes = [];

  concepts.forEach((c, i) => {
    const name = c.name || c.title || `Event ${i + 1}`;
    const explanation = c.explanation || '';
    const keyPoints = c.key_points || [];

    // Extract dates from explanation or key_points
    const dateMatches = safeStr(explanation).match(/\b(18|19|20)\d{2}\b/g) || [];
    dateMatches.forEach((d) => {
      importantDates.push({
        year: d,
        event: name,
        description: safeStr(explanation).slice(0, 150),
      });
    });

    // Check for revolt/war keywords
    const text = safeStr(explanation) + ' ' + safeStr(keyPoints.join(' '));
    if (/revolt|rebellion|uprising|mutiny|war|battle|independence|freedom/i.test(text)) {
      revoltsAndWars.push({
        name,
        type: /revolt|rebellion|uprising|mutiny/i.test(text) ? 'Revolt/Uprising' : /war|battle/i.test(text) ? 'War' : 'Movement',
        description: safeStr(explanation).slice(0, 200),
        significance: 'Important event in Indian/World history',
      });
    }

    // Check for renaissance keywords
    if (/renaissance|reformation|enlightenment|industrial|colon|imperial/i.test(text)) {
      renaissanceEvents.push({
        name,
        period: '14th–19th Century',
        description: safeStr(explanation).slice(0, 200),
        impact: 'Shaped modern world history',
      });
    }

    questionNotes.push({
      question: `What is ${name}?`,
      answer: safeStr(explanation),
      keyPoints,
      type: 'short_answer',
      marks: 3,
    });
  });

  return {
    historicalEvents,
    revoltsAndWars,
    renaissanceEvents,
    importantDates: importantDates.slice(0, 20),
    questionNotes,
  };
}

export function buildLearningAids(subjectId, chapterId) {
  const chapter = getChapter(subjectId, chapterId);
  const lesson = chapter ? getLesson(subjectId, chapterId) : null;
  const graph = lesson ? getConceptGraph(subjectId, chapterId) : null;

  if (!chapter) {
    return {
      subjectId, chapterId, chapterName: null, subjectName: null,
      hasLesson: false, stats: {}, aids: [], aidsWithContent: [],
    };
  }

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

  // ---- TL;DR ----
  const tldr = firstNonEmpty(
    lesson && lesson.outcomes && lesson.outcomes[0],
    chapter && chapter.summary
  ) || `This chapter covers ${chapter.name}. Study the concepts, solve the exercises, and revise using the learning aids below.`;

  // ---- Key Ideas ----
  const keyideas = concepts.slice(0, 6).map((c) => ({
    id: c.name || c.title || `idea-${i}`,
    title: c.name || c.title || 'Key Concept',
    explanation: c.explanation || c.purpose || c.key_points?.[0] || '',
    realLife: c.real_life_application || '',
  }));

  // ---- Big Picture ----
  const bigpicture = lesson && lesson.outcomes ? lesson.outcomes.slice(0, 5) : [
    `Understand the core concepts of ${chapter.name}`,
    `Apply knowledge to solve problems`,
    `Connect learning to real-life situations`,
  ];

  // ---- Chapter Overview ----
  const chapteroverview = chapter && chapter.summary ? chapter.summary : `This chapter covers ${chapter.name} in the CBSE Class X curriculum.`;

  // ---- Why It Matters ----
  const whyitmatters = concepts.slice(0, 5).map((c) => ({
    concept: c.name || c.title || 'Concept',
    reason: c.real_life_application || c.purpose || 'This concept helps build foundational knowledge for board exams and real-life applications.',
  }));

  // ---- Cheat Sheet ----
  const cheatsheet = [
    ...theorems.slice(0, 3).map((t) => ({ name: t.name, statement: t.statement || '', type: 'theorem' })),
    ...concepts.slice(0, 3).map((c) => ({ name: c.name || c.title, statement: c.explanation || c.key_points?.[0] || '', type: 'concept' })),
  ];

  // ---- Recap ----
  const recap = concepts.slice(0, 5).map((c) => ({
    concept: c.name || c.title || 'Concept',
    summary: c.key_points?.[0] || c.explanation || '',
  }));

  // ---- Exam Notes ----
  const examnotes = [
    ...theorems.slice(0, 2).map((t) => ({ type: 'Theorem', content: `Theorem: ${t.name} — ${t.statement || ''}` })),
    ...exercises.slice(0, 3).map((e) => ({ type: 'Practice Question', content: `Q: ${e.question}` })),
    ...misconceptions.slice(0, 2).map((m) => ({ type: 'Common Mistake', content: `Avoid: ${m.misconception || m}. Correct: ${m.correction || ''}` })),
  ];

  // ---- Solved Exercises (Solve Like a Teacher) ----
  const solveliketeacher = exercises.map((ex) => buildSolvedExercise(ex));

  // ---- Worked Examples ----
  const workedexamples = examples.map((ex) => ({
    id: ex.id || ex.topic || 'example',
    title: ex.topic || ex.title || 'Worked Example',
    problem: ex.problem || ex.title || '',
    steps: ex.board_mode || ex.solution || [],
    answer: ex.answer || '',
    shortcut: ex.competitive_shortcut || ex.speed_mode || '',
    subject: subjectId,
  }));

  // ---- Shortcut Methods ----
  const shortcutmethods = shortcuts.map((s) => ({
    id: s.name || s.title || 'shortcut',
    name: s.name || s.title || 'Shortcut Method',
    method: s.method || s.description || '',
    whenToUse: s.when_to_use || 'Use when the standard method is too lengthy for board exams.',
    example: s.example || '',
  }));

  // ---- Mistake Guide ----
  const mistakeguide = misconceptions.map((m) => ({
    id: m.misconception || 'mistake',
    misconception: typeof m === 'string' ? m : (m.misconception || ''),
    correction: typeof m === 'string' ? '' : (m.correction || ''),
    whyItHappens: 'Students often confuse similar concepts or skip steps in reasoning.',
    howToAvoid: 'Read the question carefully, write down each step, and verify your answer.',
  }));

  // ---- Problem Patterns ----
  const problempatterns = exercises.slice(0, 8).map((e, i) => ({
    id: `pattern-${i + 1}`,
    pattern: e.question,
    type: e.difficulty || 'medium',
    solutionApproach: 'Identify the concept, apply the relevant formula/theorem, solve step-by-step, verify.',
    similarQuestions: `See exercises in the same difficulty level (${e.difficulty || 'medium'}).`,
  }));

  // ---- Formulasheet ----
  const formulasheet = [
    ...theorems.map((t) => ({ name: t.name, statement: t.statement || '', formula: t.statement || '', whenToUse: t.real_world_utility || 'Apply when the theorem condition is met' })),
    ...shortcuts.map((s) => ({ name: s.name || s.title || 'Shortcut', statement: s.description || '', formula: s.method || '', whenToUse: 'Use for quick calculation in board exams' })),
  ];

  // ---- Science-specific: Experiments ----
  let scienceExperiments = [];
  let mcqAnswers = [];
  let bibliographyAndEquations = { equations: [], bibliography: [] };

  if (subjectId === 'science') {
    scienceExperiments = buildScienceExperiment(lesson, chapter.name);
    mcqAnswers = buildMcqAnswers(quizzes);
    bibliographyAndEquations = buildBibliographyAndEquations(lesson, subjectId);
  }

  // ---- Social Studies: Historical Data ----
  let socialStudiesData = { historicalEvents: [], revoltsAndWars: [], renaissanceEvents: [], importantDates: [], questionNotes: [] };
  if (subjectId === 'social-science' || subjectId === 'social') {
    socialStudiesData = buildSocialStudiesData(lesson, chapter.name);
  }

  // ---- Cause & Effect ----
  const causeeffect = concepts.filter((c) => c.real_life_application).map((c) => ({
    cause: c.name || c.title || 'Concept',
    effect: c.real_life_application || 'Real-world application',
  }));

  // ---- Process Breakdown ----
  const processbreakdown = flowcharts.length ? {
    title: flowcharts[0].title || 'Process Breakdown',
    steps: flowcharts[0].steps || [],
  } : {
    title: 'Process Breakdown',
    steps: concepts.slice(0, 5).map((c, i) => ({ step: i + 1, name: c.name || c.title, description: c.explanation || '' })),
  };

  // ---- Mechanism ----
  const mechanism = concepts.slice(0, 5).map((c) => ({
    concept: c.name || c.title || 'Concept',
    explanation: c.explanation || c.key_points?.[0] || '',
    howItWorks: c.day_to_day_usage?.[0] || '',
  }));

  // ---- Scientific Story ----
  const scientificstory = lesson && lesson.theorems.length ? {
    title: 'Scientific Story',
    story: lesson.theorems[0].historical_context || lesson.theorems[0].why_proposed || '',
    scientist: lesson.theorems[0].proposed_by?.name || 'Unknown',
    era: lesson.theorems[0].proposed_by?.era || '',
  } : {
    title: 'Scientific Story',
    story: 'The development of this concept involved careful observation, experimentation, and reasoning by scientists over many years.',
    scientist: 'Various scientists',
    era: 'Historical period',
  };

  // ---- Break It Down ----
  const breakitdown = concepts.slice(0, 6).map((c) => ({
    part: c.name || c.title || 'Part',
    detail: c.key_points ? c.key_points.join('; ') : c.explanation || '',
  }));

  // ---- Learn from Scratch ----
  const learnfromscratch = chapter && chapter.summary ? {
    title: 'Learn from Scratch',
    summary: chapter.summary,
    prerequisites: lesson && lesson.prerequisite_nodes ? lesson.prerequisite_nodes : [],
    firstStep: 'Start by reading the NCERT chapter summary.',
    nextSteps: ['Read each concept carefully.', 'Solve the worked examples.', 'Attempt practice exercises.', 'Review using Cheat Sheet and Exam Notes.'],
  } : null;

  // ---- Tutor Mode ----
  const tutormode = { title: 'Tutor Mode', subjectId, chapterId, mode: 'eli5', chapterName: chapter.name };

  // ---- Story Method with Memory Hooks ----
  const storymethodwithmemoryhooks = concepts.slice(0, 5).map((c) => ({
    id: c.name || c.title || 'hook',
    hook: c.name || c.title || 'Concept',
    story: c.real_life_application || c.purpose || '',
    memoryHook: c.day_to_day_usage?.[0] || 'Associate this concept with something you see daily.',
  }));

  // ---- Concept Connections ----
  const conceptconnections = conceptMaps ? {
    nodes: conceptMaps.nodes || [],
    edges: conceptMaps.edges || [],
  } : (graph ? {
    nodes: graph.nodes || [],
    edges: graph.edges || [],
  } : { nodes: [], edges: [] });

  // ---- Learning Path ----
  const learningpath = {
    subjectId, chapterId, chapterName: chapter.name, unitName: chapter.unitName || '',
    steps: [
      { step: 1, action: 'Read Chapter Overview', completed: false },
      { step: 2, action: 'Study Key Ideas', completed: false },
      { step: 3, action: 'Watch Video Lesson', completed: false },
      { step: 4, action: 'Solve Worked Examples', completed: false },
      { step: 5, action: 'Attempt Practice Questions', completed: false },
      { step: 6, action: 'Review Mistake Guide', completed: false },
      { step: 7, action: 'Take Quiz Me', completed: false },
    ],
  };

  // ---- Quiz Me ----
  const quizme = {
    chapterId, subjectId, count: Math.min(quizzes.length, 10),
    questions: quizzes.slice(0, 10).map((q, i) => ({
      id: q.id || `quiz-${i + 1}`,
      question: q.question,
      options: q.options || [],
      correctIndex: q.correct != null ? q.correct : 0,
      explanation: q.explanation?.correct || 'Refer to NCERT textbook.',
    })),
  };

  const aidData = {
    tldr,
    keyideas,
    bigpicture,
    chapteroverview,
    whyitmatters,
    cheatsheet,
    recap,
    examnotes,
    mindmap: mindMaps ? { title: mindMaps.title || 'Mind Map', branches: mindMaps.branches || [] } : null,
    conceptmap: conceptMaps ? { title: conceptMaps.title || 'Concept Map', nodes: conceptMaps.nodes || [], edges: conceptMaps.edges || [] } : (graph ? { title: graph.title || 'Concept Map', nodes: graph.nodes || [], edges: graph.edges || [] } : null),
    flowchart: flowcharts.length ? { title: flowcharts[0].title || 'Flow Chart', steps: flowcharts[0].steps || [] } : null,
    diagram: visualizations.length ? { title: visualizations[0].visualizationProperties?.title || 'Diagram', type: visualizations[0].visualizationProperties?.type || 'visual', props: visualizations[0].visualizationProperties } : null,
    visualsummary: visualizations.length > 1 ? { title: 'Visual Summary', count: visualizations.length, items: visualizations.map((v) => v.visualizationProperties?.title || 'Visual') } : null,
    formulasheet,
    solveliketeacher,
    shortcutmethods,
    mistakeguide,
    problempatterns,
    workedexamples,
    causeeffect,
    processbreakdown,
    mechanism,
    scientificstory,
    breakitdown,
    learnfromscratch,
    tutormode,
    storymethodwithmemoryhooks,
    conceptconnections,
    learningpath,
    quizme,
    // Subject-specific additions
    scienceExperiments,
    mcqAnswers,
    bibliographyAndEquations,
    socialStudiesData,
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
