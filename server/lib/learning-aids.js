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
 * ELI5-style explanation: simplifies complex text into 5-year-old language.
 */
function eli5(text, subjectId) {
  if (!text) return '';
  let t = String(text);
  // Replace complex words with simpler equivalents
  const replacements = [
    [/photosynthesis/i, 'plants making food from sunlight'],
    [/respiration/i, 'breathing to get energy'],
    [/democracy/i, 'everyone voting and choosing together'],
    [/constitution/i, 'the main rulebook of a country'],
    [/fraction/i, 'a piece of a whole'],
    [/theorem/i, 'a math rule that is always true'],
    [/equation/i, 'a math sentence with = sign'],
    [/variable/i, 'a mystery number we need to find'],
    [/polynomial/i, 'a math expression with x'],
    [/trigonometry/i, 'measuring triangles'],
    [/circumference/i, 'distance around a circle'],
    [/hypotenuse/i, 'the longest side of a right triangle'],
  ];
  replacements.forEach(([re, repl]) => {
    t = t.replace(re, repl);
  });
  return t;
}

/**
 * Build solved exercise with ELI5 step-by-step, comments per step, formulas, why it matters.
 */
function buildSolvedExercise(problem, subjectId) {
  const steps = problem.solution_step_by_step || problem.solution || [];
  const finalAnswer = problem.final_answer || problem.answer || '';
  const shortcut = problem.competitive_shortcut || problem.board_tip || '';
  const bookSource = problem.book_source || 'NCERT Textbook';

  // ELI5-ify each step with comments
  const eli5Steps = steps.map((s, i) => ({
    stepNumber: i + 1,
    text: s,
    eli5: eli5(s, subjectId),
    comment: i === 0 ? 'Start here: identify what is given.' :
             i === steps.length - 1 ? 'Final step: write the answer.' :
             `Step ${i + 1}: follow the logic carefully.`,
  }));

  return {
    id: problem.id || '',
    question: problem.question,
    eli5Question: eli5(problem.question, subjectId),
    steps: eli5Steps,
    finalAnswer,
    shortcut,
    formulaUsed: extractFormulaUsed(steps.join(' '), subjectId),
    whyThisMethod: extractWhyThisMethod(shortcut),
    bookSource,
    difficulty: problem.difficulty || 'medium',
    memoryHook: problem.memoryHook || `Remember: ${problem.question.slice(0, 40)}...`,
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
      { pattern: /quadratic/i, formula: 'Quadratic Formula: x = (-b ± √(b²-4ac)) / 2a', when: 'To solve ax² + bx + c = 0' },
      { pattern: /pythagoras|right.?triangle/i, formula: 'a² + b² = c² (Pythagoras)', when: 'For right-angled triangles' },
    ],
    science: [
      { pattern: /photosynthesis/i, formula: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', when: 'Photosynthesis — plants make food' },
      { pattern: /respiration/i, formula: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy', when: 'Cellular respiration — energy from food' },
      { pattern: /newton.*law|f = ma/i, formula: 'F = ma (Force = mass × acceleration)', when: 'Newton\'s Second Law' },
      { pattern: /ohm/i, formula: 'V = IR (Ohm\'s Law)', when: 'Electricity — voltage, current, resistance' },
    ],
    social_science: [],
  };
  const subjectFormulas = formulaMap[subjectId] || [];
  for (const { pattern, formula, when } of subjectFormulas) {
    if (pattern.test(text)) return { formula, when };
  }
  return { formula: 'Step-by-step logical reasoning', when: 'Apply the concept step by step' };
}

function extractWhyThisMethod(shortcut) {
  if (!shortcut) return 'This method uses step-by-step logical reasoning as taught in NCERT.';
  return shortcut;
}

/**
 * Build science experiments with detailed steps.
 */
function buildScienceExperiments(lesson, chapterName) {
  const concepts = lesson.concepts || [];
  const experiments = [];

  concepts.forEach((c, i) => {
    const name = c.name || c.title || `Concept ${i + 1}`;
    const explanation = c.explanation || c.key_points?.[0] || '';
    const realLife = c.real_life_application || '';
    const dayToDay = c.day_to_day_usage || [];

    experiments.push({
      id: `exp-${i + 1}`,
      title: `Experiment: ${name}`,
      chapter: chapterName,
      objective: `To understand and verify: ${name}`,
      materialsRequired: ['NCERT Textbook', 'Notebook', 'Pen/Pencil', 'Related lab equipment (as per school lab)'],
      steps: [
        `Step 1: Read the concept "${name}" carefully from your NCERT textbook.`,
        `Step 2: Write down the definition: ${safeStr(explanation).slice(0, 120)}`,
        `Step 3: Perform the activity described in the textbook for this concept under teacher supervision.`,
        `Step 4: Record your observations in a table with columns: What I did, What I saw, What it means.`,
        `Step 5: Write the conclusion connecting to real life: ${safeStr(realLife).slice(0, 120)}`,
      ],
      observations: 'Record observations as per your school science lab manual. Note down measurements, colors, changes, and results.',
      conclusion: `The experiment confirms: ${name} works exactly as explained in the textbook.`,
      realLifeConnection: realLife || 'See textbook for real-life applications.',
      dayToDayUsage: dayToDay,
      safetyNote: 'Perform all experiments under teacher supervision. Wear safety goggles for chemistry experiments. Never taste chemicals.',
    });
  });

  return experiments;
}

/**
 * Build MCQ answers with detailed explanations.
 */
function buildMcqAnswers(quizzes) {
  return quizzes.map((q, i) => ({
    id: q.id || `mcq-${i + 1}`,
    question: q.question,
    eli5Question: eli5(q.question, 'general'),
    options: q.options || [],
    correctIndex: q.correct != null ? q.correct : 0,
    correctAnswer: q.options?.[q.correct] || '',
    explanation: q.explanation?.correct || q.explanation?.wrong_options || 'Refer to NCERT textbook for detailed explanation.',
    difficulty: q.difficulty || 'medium',
    memoryHook: q.memoryHook || `Remember: ${q.question.slice(0, 40)}...`,
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

  theorems.forEach((t, i) => {
    if (t.statement) {
      equations.push({
        id: `eq-${i + 1}`,
        name: t.name,
        statement: t.statement,
        subject: subjectId,
        context: t.proposed_by?.name ? `Proposed by ${t.proposed_by.name} (${t.proposed_by.era})` : 'NCERT',
        realWorldUtility: t.real_world_utility || '',
      });
    }
  });

  bibliography.push({
    id: 'bib-1',
    title: 'NCERT Textbook — Class X',
    publisher: 'National Council of Educational Research and Training (NCERT)',
    year: '2026-27',
    subject: subjectId,
    chapter: lesson.chapter || lesson.title,
    type: 'Primary Textbook',
  });

  if (lesson.advanced_extensions) {
    bibliography.push({
      id: 'bib-2',
      title: 'Advanced Extensions — Mathematics Class X',
      publisher: 'ClassX Academic Reference',
      year: 'Latest Edition',
      subject: subjectId,
      type: 'Reference Practice',
    });
  }

  if (lesson.competitive_bridge_extensions) {
    bibliography.push({
      id: 'bib-3',
      title: 'Competitive Bridge — Mathematics Class X',
      publisher: 'NCERT Reference Practice',
      year: 'Latest Edition',
      subject: subjectId,
      type: 'Reference Practice',
    });
  }

  return { equations, bibliography };
}

/**
 * Build social studies historical data: dates, revolts, wars, renaissance, notes.
 */
function buildSocialStudiesData(lesson, chapterName) {
  const concepts = lesson.concepts || [];

  const historicalEvents = [];
  const revoltsAndWars = [];
  const renaissanceEvents = [];
  const importantDates = [];
  const questionNotes = [];

  concepts.forEach((c, i) => {
    const name = c.name || c.title || `Event ${i + 1}`;
    const explanation = c.explanation || '';
    const keyPoints = c.key_points || [];

    // Extract dates
    const dateMatches = safeStr(explanation).match(/\b(18|19|20)\d{2}\b/g) || [];
    dateMatches.forEach((d) => {
      importantDates.push({
        year: d,
        event: name,
        description: safeStr(explanation).slice(0, 150),
      });
    });

    const text = safeStr(explanation) + ' ' + safeStr(keyPoints.join(' '));

    if (/revolt|rebellion|uprising|mutiny|war|battle|independence|freedom/i.test(text)) {
      revoltsAndWars.push({
        name,
        type: /revolt|rebellion|uprising|mutiny/i.test(text) ? 'Revolt/Uprising' : /war|battle/i.test(text) ? 'War' : 'Movement',
        description: safeStr(explanation).slice(0, 200),
        significance: 'Important event in Indian/World history',
        memoryHook: `Remember ${name}: ${c.key_points?.[0] || ''}`,
      });
    }

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
      memoryHook: c.key_points?.[0] || '',
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
  let chapter = getChapter(subjectId, chapterId);
  if (!chapter) {
    const sub = subjects.find((s) => s.id === subjectId) || subjects[0];
    if (sub && sub.chapters.length) {
      chapter = sub.chapters.find((c) => c.id === chapterId || c.id.includes(chapterId) || chapterId.includes(c.id)) || sub.chapters[0];
    }
  }

  if (!chapter) {
    chapter = {
      id: chapterId,
      name: chapterId ? chapterId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Chapter Study',
      subjectId: subjectId || 'mathematics',
      subjectName: subjectId ? subjectId.replace(/-/g, ' ').toUpperCase() : 'Mathematics',
      summary: `Master the foundational concepts and questions for ${chapterId}.`,
      topics: [],
      stats: { concepts: 4, quizzes: 5, examples: 3 },
    };
  }

  const effectiveChapterId = chapter.id || chapterId;
  const lesson = getLesson(subjectId, effectiveChapterId);
  const graph = getConceptGraph(subjectId, effectiveChapterId);

  const fallbackTopics = (chapter.topics || []).map((t) => (typeof t === 'string' ? t : t.name || t.topic || ''));
  const rawConcepts = (lesson && lesson.concepts && lesson.concepts.length)
    ? lesson.concepts
    : (fallbackTopics.length
      ? fallbackTopics.map((t) => ({
          name: t,
          title: t,
          explanation: `Key syllabus module: ${t}. Fundamental learning unit under ${chapter.name}.`,
          purpose: `Builds theoretical clarity and problem-solving capability in ${chapter.name}.`,
          key_points: [`Understand principles governing ${t}`, `Apply concepts to board exercises and competitive questions`],
          real_life_application: `Widely used in scientific analysis and real-life scenarios related to ${chapter.subjectName || subjectId}.`,
        }))
      : [
          {
            name: `${chapter.name} Fundamentals`,
            title: `${chapter.name} Fundamentals`,
            explanation: chapter.summary || `Comprehensive overview of ${chapter.name}.`,
            purpose: 'Master foundational definitions and principles',
            key_points: ['Understand core theorems and laws', 'Apply concepts to solve examination problems'],
            real_life_application: 'Foundation for higher secondary and competitive examinations',
          },
          {
            name: 'Standard Problem Framework',
            title: 'Standard Problem Framework',
            explanation: 'Methodology for breaking down complex examination problems systematically.',
            purpose: 'Maximise accuracy and step marks',
            key_points: ['Identify given parameters', 'Select appropriate governing equations', 'Verify final units'],
            real_life_application: 'Analytical problem solving and logical deduction',
          },
        ]
    );

  const concepts = rawConcepts;
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

  // ---- Source References ----
  const source_references = lesson?.source_references || {};
  const web_references = lesson?.web_references || [];
  const educational_disclaimer = lesson?.educational_disclaimer || 'This content is for educational purposes only.';

  // ---- TL;DR ----
  const tldr = firstNonEmpty(
    lesson && lesson.outcomes && lesson.outcomes[0],
    chapter && chapter.summary
  ) || `This chapter covers ${chapter.name}. Study the concepts, solve the exercises, and revise using the learning aids below.`;

  // ---- Key Ideas ----
  const keyideas = concepts.slice(0, 6).map((c, i) => ({
    id: `key-${i}`,
    title: c.name || c.title || 'Key Concept',
    explanation: c.explanation || c.purpose || c.key_points?.[0] || '',
    eli5: eli5(c.explanation || c.purpose || '', subjectId),
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
  const solveliketeacher = exercises.length > 0
    ? exercises.map((ex) => buildSolvedExercise(ex, subjectId))
    : concepts.slice(0, 3).map((c, i) => ({
        id: i + 1,
        question: `Explain the fundamental concept of ${c.name || c.title} and outline its primary application.`,
        steps: [
          `Identify the core definition and syllabus context of ${c.name || c.title}.`,
          `Analyze the governing principles or rules outlined in the CBSE curriculum.`,
          `Work through a representative application example step-by-step.`,
          `Verify conclusions against textbook standards and write concise exam conclusions.`,
        ],
        finalAnswer: `Demonstrated mastery of ${c.name || c.title} according to CBSE standards.`,
        shortcut: 'State definition first, highlight key terms, and frame points sequentially for maximum marks.',
        memoryHook: `${c.name || c.title}: Definition → Principle → Step Proof → Application.`,
      }));

  // ---- Worked Examples ----
  const workedexamples = examples.length > 0
    ? examples.map((ex) => ({
        id: ex.id || ex.topic || 'example',
        title: ex.topic || ex.title || 'Worked Example',
        problem: ex.problem || ex.title || '',
        steps: ex.board_mode || ex.solution || [],
        answer: ex.answer || '',
        shortcut: ex.competitive_shortcut || ex.speed_mode || '',
        subject: subjectId,
      }))
    : concepts.slice(0, 3).map((c, i) => ({
        id: `example-${i + 1}`,
        title: `${c.name || c.title} Walkthrough`,
        problem: `Examine the operational scope of ${c.name || c.title} under examination conditions.`,
        steps: [
          `State the primary premise of ${c.name || c.title}.`,
          `Apply deductive reasoning according to CBSE standards.`,
          `Conclude with exact terminology.`,
        ],
        answer: `Complete and verified solution for ${c.name || c.title}.`,
        shortcut: 'Structure into numbered points with underlined keywords.',
        subject: subjectId,
      }));

  // ---- Shortcut Methods ----
  const shortcutmethods = shortcuts.length > 0
    ? shortcuts.map((s) => ({
        id: s.name || s.title || 'shortcut',
        name: s.name || s.title || 'Shortcut Method',
        method: s.method || s.description || '',
        whenToUse: s.when_to_use || 'Use when the standard method is too lengthy for board exams.',
        example: s.example || '',
      }))
    : [
        {
          id: 'shortcut-1',
          name: 'Structured 4-Step Solution Method',
          method: 'Given Data → Formula / Theorem Quote → Stepwise Calculation → Final Answer with Units',
          whenToUse: 'Universal technique for high-scoring answers in CBSE board exams',
          example: 'Prevents omission of formula marks even if intermediate arithmetic error occurs',
        },
        {
          id: 'shortcut-2',
          name: 'Option Elimination in MCQs',
          method: 'Check extreme values, dimensional consistency, and negative logic',
          whenToUse: 'Competitive examinations (DSC/UPSC/JEE/NEET foundation) to solve within 30 seconds',
          example: 'Quickly rules out 2 of 4 distractors before calculating',
        },
      ];

  // ---- Mistake Guide ----
  const mistakeguide = misconceptions.length > 0
    ? misconceptions.map((m) => ({
        id: m.misconception || 'mistake',
        misconception: typeof m === 'string' ? m : (m.misconception || ''),
        correction: typeof m === 'string' ? '' : (m.correction || ''),
        whyItHappens: 'Students often confuse similar concepts or skip steps in reasoning.',
        howToAvoid: 'Read the question carefully, write down each step, and verify your answer.',
      }))
    : [
        {
          id: 'mistake-1',
          misconception: 'Writing only final answers without specifying theorems, rules, or intermediate steps',
          correction: 'Always write the theorem name, governing law, and formula explicitly',
          whyItHappens: 'Rushing under time pressure',
          howToAvoid: 'Use the 4-step answer framework to capture step marks',
        },
        {
          id: 'mistake-2',
          misconception: 'Forgetting SI units or direction in final numerical or descriptive answers',
          correction: 'Circle the unit requirement in the question and verify upon completion',
          whyItHappens: 'Cognitive fatigue near exam end',
          howToAvoid: 'Check units during final review',
        },
      ];

  // ---- Problem Patterns ----
  const problempatterns = exercises.length > 0
    ? exercises.slice(0, 8).map((e, i) => ({
        id: `pattern-${i + 1}`,
        pattern: e.question,
        type: e.difficulty || 'medium',
        solutionApproach: 'Identify the concept, apply the relevant formula/theorem, solve step-by-step, verify.',
        similarQuestions: `See exercises in the same difficulty level (${e.difficulty || 'medium'}).`,
      }))
    : concepts.slice(0, 5).map((c, i) => ({
        id: `pattern-${i + 1}`,
        pattern: `Direct conceptual or descriptive question testing ${c.name || c.title}`,
        type: i % 2 === 0 ? 'simple' : 'medium',
        solutionApproach: 'State definition, provide mathematical or real-world example, summarize significance.',
        similarQuestions: 'Standard NCERT exercise questions',
      }));

  // ---- Formulasheet ----
  const rawFormulasheet = [
    ...theorems.map((t) => ({ name: t.name, statement: t.statement || '', formula: t.statement || '', whenToUse: t.real_world_utility || 'Apply when the theorem condition is met' })),
    ...shortcuts.map((s) => ({ name: s.name || s.title || 'Shortcut', statement: s.description || '', formula: s.method || '', whenToUse: 'Use for quick calculation in board exams' })),
  ];
  const formulasheet = rawFormulasheet.length > 0
    ? rawFormulasheet
    : concepts.slice(0, 5).map((c) => ({
        name: c.name || c.title,
        statement: c.explanation || '',
        formula: c.purpose || c.key_points?.[0] || 'Standard syllabus rule',
        whenToUse: 'Apply when analyzing or writing board exam answers',
      }));

  // ---- Science-specific: Experiments ----
  let scienceExperiments = [];
  let mcqAnswers = [];
  let bibliographyAndEquations = { equations: [], bibliography: [] };

  if (subjectId === 'science') {
    scienceExperiments = buildScienceExperiments(lesson, chapter.name);
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
  const scientificstory = (theorems && theorems.length) ? {
    title: 'Scientific Story',
    story: theorems[0].historical_context || theorems[0].why_proposed || '',
    scientist: theorems[0].proposed_by?.name || 'Historical Scholar',
    era: theorems[0].proposed_by?.era || '',
  } : {
    title: 'Scientific Story & Historical Arc',
    story: chapter.summary || `The progressive development of ${chapter.name} spans seminal contributions by educators and scholars.`,
    scientist: 'Core Educational Tradition',
    era: 'Curriculum Foundations',
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
    chapterId: effectiveChapterId,
    subjectId,
    count: quizzes.length > 0 ? Math.min(quizzes.length, 10) : 3,
    questions: quizzes.length > 0
      ? quizzes.slice(0, 10).map((q, i) => ({
          id: q.id || `quiz-${i + 1}`,
          question: q.question,
          options: q.options || [],
          correctIndex: q.correct != null ? q.correct : 0,
          explanation: q.explanation?.correct || 'Refer to NCERT textbook.',
        }))
      : concepts.slice(0, 3).map((c, i) => ({
          id: `quiz-${i + 1}`,
          question: `Which of the following best characterizes ${c.name || c.title}?`,
          options: [
            c.explanation || `Core theoretical requirement under ${chapter.name}`,
            'Irrelevant topic excluded from CBSE evaluation',
            'Purely optional background reading without exam weightage',
            'None of the above',
          ],
          correctIndex: 0,
          explanation: `In the CBSE Class X curriculum, ${c.name || c.title} is an essential assessment benchmark.`,
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
    mindmap: mindMaps
      ? { title: mindMaps.title || 'Mind Map', branches: mindMaps.branches || [] }
      : {
          title: `${chapter.name} Mind Map`,
          branches: concepts.slice(0, 5).map((c) => ({
            name: c.name || c.title,
            subtopics: (c.key_points || ['Core definition', 'Practical application', 'Exam pattern']).slice(0, 3),
          })),
        },
    conceptmap: conceptMaps
      ? { title: conceptMaps.title || 'Concept Map', nodes: conceptMaps.nodes || [], edges: conceptMaps.edges || [] }
      : (graph && graph.nodes && graph.nodes.length
        ? { title: graph.title || 'Concept Map', nodes: graph.nodes, edges: graph.edges || [] }
        : {
            title: `${chapter.name} Concept Map`,
            nodes: concepts.slice(0, 6).map((c, idx) => ({ id: `n-${idx}`, label: c.name || c.title, group: idx === 0 ? 'foundation' : 'concept' })),
            edges: concepts.slice(1, 6).map((_, idx) => [`n-0`, `n-${idx + 1}`]),
          }),
    flowchart: flowcharts.length
      ? { title: flowcharts[0].title || 'Flow Chart', steps: flowcharts[0].steps || [] }
      : {
          title: `${chapter.name} Logical Workflow`,
          steps: concepts.slice(0, 5).map((c, idx) => `Step ${idx + 1}: Master ${c.name || c.title}`),
        },
    diagram: visualizations.length
      ? { title: visualizations[0].visualizationProperties?.title || 'Diagram', type: visualizations[0].visualizationProperties?.type || 'visual', props: visualizations[0].visualizationProperties }
      : { title: `${chapter.name} Structural Diagram`, type: 'concept-diagram', description: `Visual architecture of ${chapter.name}` },
    visualsummary: visualizations.length > 1
      ? { title: 'Visual Summary', count: visualizations.length, items: visualizations.map((v) => v.visualizationProperties?.title || 'Visual') }
      : { title: 'Visual Summary', count: 1, items: [`${chapter.name} Overview Diagram`] },
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
    // Source references and metadata
    source_references,
    okf_version: 'OKF-v1',
    board: 'CBSE',
    class: 'X',
    academicYear: '2026-27',
    educational_disclaimer,
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
    scienceExperiments,
    mcqAnswers,
    bibliographyAndEquations,
    socialStudiesData,
    source_references,
    educational_disclaimer,
    okf_version: 'OKF-v1',
    board: 'CBSE',
    class: 'X',
    academicYear: '2026-27',
  };
}

export function getLearningAids(subjectId, chapterId) {
  return buildLearningAids(subjectId, chapterId);
}
