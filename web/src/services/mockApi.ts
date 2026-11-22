import type {
  AdaptivePracticeSession,
  Badge,
  Chapter,
  ChapterDetail,
  Citation,
  Curriculum,
  ExamKey,
  ExamPaper,
  GamifyXpResult,
  LeaderboardEntry,
  LearningAidsData,
  LearningAidsIds,
  Lesson,
  LibraryData,
  OkfSearchResult,
  OkfStats,
  OkfTopic,
  ParentView,
  Plan,
  PlanWeek,
  PracticeQuestion,
  PracticeResult,
  PracticeSession,
  Progress,
  ReviewItem,
  SearchResult,
  Subject,
  TutorResponse,
  VideoCatalog,
} from '../types';

const PROGRESS_KEY = 'peak.classx.progress.v1';
const MOCK_MODE_KEY = 'classx_mock_mode';

// ---------------------------------------------------------------------------
// Mode state and detection
// ---------------------------------------------------------------------------

export function isMockMode(): boolean {
  if (typeof window !== 'undefined' && (window as unknown as { __classx_auto_mock?: boolean }).__classx_auto_mock === true) {
    return true;
  }
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(MOCK_MODE_KEY) : null;
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // Ignore storage issues
  }
  if (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { VITE_USE_MOCK_API?: string } }).env?.VITE_USE_MOCK_API === 'true') {
    return true;
  }
  return false;
}

export function setMockMode(enable: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MOCK_MODE_KEY, enable ? 'true' : 'false');
    }
  } catch {
    // Storage quota or restriction
  }
  if (typeof window !== 'undefined') {
    (window as unknown as { __classx_auto_mock?: boolean }).__classx_auto_mock = enable;
  }
}

// ---------------------------------------------------------------------------
// Mock Data: Curriculum & Subjects
// ---------------------------------------------------------------------------

const MOCK_SUBJECTS: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    shortName: 'Maths',
    accent: 'indigo',
    icon: 'Sigma',
    code: '041',
    maxMarks: 80,
    internalMarks: 20,
    totalPeriods: 180,
    description: 'Mathematics for CBSE Class X covering number systems, algebra, geometry, trigonometry, and statistics.',
    units: [
      {
        id: 'unit-math-1',
        name: 'Number Systems',
        section: 'I',
        marks: 6,
        periods: 15,
        topics: [
          { id: 'real-numbers', name: 'Real Numbers', difficulty: 'medium', periods: 15 },
        ],
      },
      {
        id: 'unit-math-2',
        name: 'Algebra',
        section: 'II',
        marks: 20,
        periods: 50,
        topics: [
          { id: 'polynomials', name: 'Polynomials', difficulty: 'medium', periods: 10 },
          { id: 'pair-of-linear-equations', name: 'Pair of Linear Equations in Two Variables', difficulty: 'medium', periods: 15 },
          { id: 'quadratic-equations', name: 'Quadratic Equations', difficulty: 'medium', periods: 15 },
          { id: 'arithmetic-progressions', name: 'Arithmetic Progressions', difficulty: 'medium', periods: 10 },
        ],
      },
      {
        id: 'unit-math-3',
        name: 'Coordinate Geometry',
        section: 'III',
        marks: 6,
        periods: 15,
        topics: [
          { id: 'coordinate-geometry', name: 'Coordinate Geometry', difficulty: 'medium', periods: 15 },
        ],
      },
      {
        id: 'unit-math-4',
        name: 'Geometry',
        section: 'IV',
        marks: 15,
        periods: 35,
        topics: [
          { id: 'triangles', name: 'Triangles', difficulty: 'complex', periods: 20 },
          { id: 'circles', name: 'Circles', difficulty: 'medium', periods: 15 },
        ],
      },
      {
        id: 'unit-math-5',
        name: 'Trigonometry',
        section: 'V',
        marks: 12,
        periods: 25,
        topics: [
          { id: 'introduction-to-trigonometry', name: 'Introduction to Trigonometry', difficulty: 'medium', periods: 15 },
          { id: 'applications-of-trigonometry', name: 'Some Applications of Trigonometry', difficulty: 'complex', periods: 10 },
        ],
      },
      {
        id: 'unit-math-6',
        name: 'Mensuration',
        section: 'VI',
        marks: 10,
        periods: 25,
        topics: [
          { id: 'areas-related-to-circles', name: 'Areas Related to Circles', difficulty: 'medium', periods: 12 },
          { id: 'surface-areas-and-volumes', name: 'Surface Areas and Volumes', difficulty: 'complex', periods: 13 },
        ],
      },
      {
        id: 'unit-math-7',
        name: 'Statistics & Probability',
        section: 'VII',
        marks: 11,
        periods: 20,
        topics: [
          { id: 'statistics', name: 'Statistics', difficulty: 'medium', periods: 12 },
          { id: 'probability', name: 'Probability', difficulty: 'simple', periods: 8 },
        ],
      },
    ],
    chapters: [
      {
        id: 'real-numbers',
        name: 'Real Numbers',
        number: 1,
        order: 1,
        unitId: 'unit-math-1',
        unitName: 'Number Systems',
        marks: 6,
        periods: 15,
        summary: 'Fundamental Theorem of Arithmetic, prime factorisation, proving irrationality of surds, and decimal expansions.',
        difficulty: 'medium',
        lessonId: 'real-numbers',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 6, theorems: 2, examples: 8, exercises: 4, quizzes: 10, visuals: 4, misconceptions: 4, authored: true },
        topics: [
          { id: 't1', name: 'Fundamental Theorem of Arithmetic', difficulty: 'simple', periods: 4 },
          { id: 't2', name: 'Finding HCF and LCM via Prime Factorisation', difficulty: 'medium', periods: 4 },
          { id: 't3', name: 'Revisiting Irrational Numbers (√2, √3, √5 proofs)', difficulty: 'complex', periods: 4 },
          { id: 't4', name: 'Terminating vs Non-Terminating Decimals', difficulty: 'medium', periods: 3 },
        ],
      },
      {
        id: 'polynomials',
        name: 'Polynomials',
        number: 2,
        order: 2,
        unitId: 'unit-math-2',
        unitName: 'Algebra',
        marks: 4,
        periods: 10,
        summary: 'Geometrical meaning of zeroes, relationship between zeroes and coefficients of quadratic polynomials.',
        difficulty: 'medium',
        lessonId: 'polynomials',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 5, theorems: 1, examples: 6, exercises: 3, quizzes: 8, visuals: 3, misconceptions: 3, authored: true },
        topics: [
          { id: 't5', name: 'Zeroes of a Polynomial & Parabolic Graphs', difficulty: 'simple', periods: 3 },
          { id: 't6', name: 'Relationship Between Zeroes and Coefficients', difficulty: 'medium', periods: 4 },
          { id: 't7', name: 'Forming Quadratic Polynomials given Sum and Product', difficulty: 'medium', periods: 3 },
        ],
      },
      {
        id: 'pair-of-linear-equations',
        name: 'Pair of Linear Equations in Two Variables',
        number: 3,
        order: 3,
        unitId: 'unit-math-2',
        unitName: 'Algebra',
        marks: 6,
        periods: 15,
        summary: 'Graphical and algebraic methods (substitution and elimination) to solve linear equations.',
        difficulty: 'medium',
        lessonId: 'pair-of-linear-equations',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 6, theorems: 1, examples: 8, exercises: 4, quizzes: 8, visuals: 3, misconceptions: 3, authored: true },
        topics: [
          { id: 't8', name: 'Graphical Representation & Consistency Conditions', difficulty: 'medium', periods: 5 },
          { id: 't9', name: 'Substitution Method', difficulty: 'simple', periods: 4 },
          { id: 't10', name: 'Elimination Method', difficulty: 'medium', periods: 6 },
        ],
      },
      {
        id: 'quadratic-equations',
        name: 'Quadratic Equations',
        number: 4,
        order: 4,
        unitId: 'unit-math-2',
        unitName: 'Algebra',
        marks: 6,
        periods: 15,
        summary: 'Standard form ax² + bx + c = 0, solutions by factorisation and quadratic formula, nature of roots.',
        difficulty: 'medium',
        lessonId: 'quadratic-equations',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 5, theorems: 1, examples: 7, exercises: 3, quizzes: 8, visuals: 2, misconceptions: 3, authored: true },
        topics: [
          { id: 't11', name: 'Standard Form & Factorisation Method', difficulty: 'medium', periods: 5 },
          { id: 't12', name: 'Quadratic Formula (Shreedharacharya Rule)', difficulty: 'medium', periods: 5 },
          { id: 't13', name: 'Discriminant and Nature of Roots', difficulty: 'medium', periods: 5 },
        ],
      },
      {
        id: 'arithmetic-progressions',
        name: 'Arithmetic Progressions',
        number: 5,
        order: 5,
        unitId: 'unit-math-2',
        unitName: 'Algebra',
        marks: 4,
        periods: 10,
        summary: 'nth term and sum of first n terms of an arithmetic sequence with real-world problems.',
        difficulty: 'medium',
        lessonId: 'arithmetic-progressions',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 4, theorems: 1, examples: 6, exercises: 3, quizzes: 8, visuals: 2, misconceptions: 2, authored: true },
        topics: [
          { id: 't14', name: 'Understanding AP: First Term a and Common Difference d', difficulty: 'simple', periods: 3 },
          { id: 't15', name: 'nth Term of an AP (an = a + (n-1)d)', difficulty: 'medium', periods: 4 },
          { id: 't16', name: 'Sum of First n Terms (Sn = n/2 [2a + (n-1)d])', difficulty: 'medium', periods: 3 },
        ],
      },
      {
        id: 'triangles',
        name: 'Triangles',
        number: 6,
        order: 6,
        unitId: 'unit-math-4',
        unitName: 'Geometry',
        marks: 9,
        periods: 20,
        summary: 'Similarity criteria of triangles and Basic Proportionality Theorem (Thales Theorem).',
        difficulty: 'complex',
        lessonId: 'triangles',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 6, theorems: 3, examples: 8, exercises: 4, quizzes: 10, visuals: 5, misconceptions: 4, authored: true },
        topics: [
          { id: 't17', name: 'Similar Figures vs Congruent Figures', difficulty: 'simple', periods: 3 },
          { id: 't18', name: 'Basic Proportionality Theorem & Converse', difficulty: 'complex', periods: 8 },
          { id: 't19', name: 'Criteria for Similarity: AAA, SSS, SAS', difficulty: 'complex', periods: 9 },
        ],
      },
      {
        id: 'coordinate-geometry',
        name: 'Coordinate Geometry',
        number: 7,
        order: 7,
        unitId: 'unit-math-3',
        unitName: 'Coordinate Geometry',
        marks: 6,
        periods: 15,
        summary: 'Distance formula and section formula for internal division of line segments.',
        difficulty: 'medium',
        lessonId: 'coordinate-geometry',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 4, theorems: 1, examples: 6, exercises: 3, quizzes: 8, visuals: 3, misconceptions: 2, authored: true },
        topics: [
          { id: 't20', name: 'Distance Formula between Two Points', difficulty: 'simple', periods: 5 },
          { id: 't21', name: 'Section Formula and Midpoint Coordinates', difficulty: 'medium', periods: 7 },
          { id: 't22', name: 'Geometric Applications on Cartesians', difficulty: 'medium', periods: 3 },
        ],
      },
      {
        id: 'introduction-to-trigonometry',
        name: 'Introduction to Trigonometry',
        number: 8,
        order: 8,
        unitId: 'unit-math-5',
        unitName: 'Trigonometry',
        marks: 8,
        periods: 15,
        summary: 'Trigonometric ratios of acute angles, standard angle values, and Pythagorean identities.',
        difficulty: 'medium',
        lessonId: 'introduction-to-trigonometry',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 5, theorems: 2, examples: 8, exercises: 4, quizzes: 10, visuals: 4, misconceptions: 3, authored: true },
        topics: [
          { id: 't23', name: 'Trigonometric Ratios in Right Triangles', difficulty: 'simple', periods: 4 },
          { id: 't24', name: 'Ratios of Specific Angles (0°, 30°, 45°, 60°, 90°)', difficulty: 'medium', periods: 5 },
          { id: 't25', name: 'Fundamental Trigonometric Identities (sin²θ + cos²θ = 1)', difficulty: 'complex', periods: 6 },
        ],
      },
      {
        id: 'applications-of-trigonometry',
        name: 'Some Applications of Trigonometry',
        number: 9,
        order: 9,
        unitId: 'unit-math-5',
        unitName: 'Trigonometry',
        marks: 4,
        periods: 10,
        summary: 'Angles of elevation and depression, line of sight, solving two-triangle height and distance problems.',
        difficulty: 'complex',
        lessonId: 'applications-of-trigonometry',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 3, theorems: 0, examples: 6, exercises: 2, quizzes: 6, visuals: 4, misconceptions: 2, authored: true },
        topics: [
          { id: 't26', name: 'Angle of Elevation and Depression', difficulty: 'medium', periods: 4 },
          { id: 't27', name: 'Heights and Distances Word Problems', difficulty: 'complex', periods: 6 },
        ],
      },
      {
        id: 'circles',
        name: 'Circles',
        number: 10,
        order: 10,
        unitId: 'unit-math-4',
        unitName: 'Geometry',
        marks: 6,
        periods: 15,
        summary: 'Tangents to a circle, radius perpendicular to tangent at point of contact, lengths of tangents from external point.',
        difficulty: 'medium',
        lessonId: 'circles',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 4, theorems: 2, examples: 6, exercises: 3, quizzes: 8, visuals: 3, misconceptions: 2, authored: true },
        topics: [
          { id: 't28', name: 'Tangent to a Circle at Point of Contact', difficulty: 'simple', periods: 5 },
          { id: 't29', name: 'Tangents from an External Point are Equal', difficulty: 'medium', periods: 7 },
          { id: 't30', name: 'Geometric Riders on Tangents', difficulty: 'complex', periods: 3 },
        ],
      },
      {
        id: 'areas-related-to-circles',
        name: 'Areas Related to Circles',
        number: 11,
        order: 11,
        unitId: 'unit-math-6',
        unitName: 'Mensuration',
        marks: 4,
        periods: 12,
        summary: 'Perimeter and area of circles, areas of sectors and segments of circular regions.',
        difficulty: 'medium',
        lessonId: 'areas-related-to-circles',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 4, theorems: 1, examples: 5, exercises: 3, quizzes: 8, visuals: 3, misconceptions: 2, authored: true },
        topics: [
          { id: 't31', name: 'Circumference and Area of a Circle', difficulty: 'simple', periods: 3 },
          { id: 't32', name: 'Area of Sector and Length of Arc', difficulty: 'medium', periods: 5 },
          { id: 't33', name: 'Area of Segment of a Circle', difficulty: 'complex', periods: 4 },
        ],
      },
      {
        id: 'surface-areas-and-volumes',
        name: 'Surface Areas and Volumes',
        number: 12,
        order: 12,
        unitId: 'unit-math-6',
        unitName: 'Mensuration',
        marks: 6,
        periods: 13,
        summary: 'Surface areas and volumes of combinations of solids: cubes, cuboids, spheres, hemispheres, and cylinders.',
        difficulty: 'complex',
        lessonId: 'surface-areas-and-volumes',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 5, theorems: 0, examples: 7, exercises: 3, quizzes: 8, visuals: 4, misconceptions: 3, authored: true },
        topics: [
          { id: 't34', name: 'Surface Area of Combinations of Solids', difficulty: 'complex', periods: 6 },
          { id: 't35', name: 'Volume of Combinations of Solids', difficulty: 'complex', periods: 7 },
        ],
      },
      {
        id: 'statistics',
        name: 'Statistics',
        number: 13,
        order: 13,
        unitId: 'unit-math-7',
        unitName: 'Statistics & Probability',
        marks: 7,
        periods: 12,
        summary: 'Mean (direct and assumed mean methods), median, and mode of grouped frequency distributions.',
        difficulty: 'medium',
        lessonId: 'statistics',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 5, theorems: 1, examples: 7, exercises: 4, quizzes: 8, visuals: 3, misconceptions: 2, authored: true },
        topics: [
          { id: 't36', name: 'Mean of Grouped Data (Direct & Assumed)', difficulty: 'medium', periods: 4 },
          { id: 't37', name: 'Mode of Grouped Data', difficulty: 'medium', periods: 4 },
          { id: 't38', name: 'Median of Grouped Data', difficulty: 'medium', periods: 4 },
        ],
      },
      {
        id: 'probability',
        name: 'Probability',
        number: 14,
        order: 14,
        unitId: 'unit-math-7',
        unitName: 'Statistics & Probability',
        marks: 4,
        periods: 8,
        summary: 'Classical definition of probability, equally likely outcomes, single events involving coins, dice, and cards.',
        difficulty: 'simple',
        lessonId: 'probability',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 4, theorems: 1, examples: 6, exercises: 3, quizzes: 8, visuals: 2, misconceptions: 2, authored: true },
        topics: [
          { id: 't39', name: 'Classical Probability: P(E) = n(E)/n(S)', difficulty: 'simple', periods: 4 },
          { id: 't40', name: 'Complementary Events and Probability Bounds', difficulty: 'simple', periods: 4 },
        ],
      },
    ],
    coverage: { total: 14, authored: 14, partial: 0, syllabusOnly: 0 },
  },
  {
    id: 'science',
    name: 'Science',
    shortName: 'Science',
    accent: 'emerald',
    icon: 'FlaskConical',
    code: '086',
    maxMarks: 80,
    internalMarks: 20,
    totalPeriods: 180,
    description: 'Natural science covering chemical substances, living world, natural phenomena, and current effects.',
    units: [
      {
        id: 'unit-sci-1',
        name: 'Chemical Substances — Nature and Behaviour',
        section: 'I',
        marks: 25,
        periods: 55,
        topics: [
          { id: 'chemical-reactions-and-equations', name: 'Chemical Reactions and Equations', difficulty: 'medium', periods: 15 },
          { id: 'acids-bases-and-salts', name: 'Acids, Bases and Salts', difficulty: 'medium', periods: 15 },
          { id: 'metals-and-non-metals', name: 'Metals and Non-metals', difficulty: 'medium', periods: 15 },
          { id: 'carbon-and-its-compounds', name: 'Carbon and its Compounds', difficulty: 'complex', periods: 10 },
        ],
      },
      {
        id: 'unit-sci-2',
        name: 'World of Living',
        section: 'II',
        marks: 25,
        periods: 50,
        topics: [
          { id: 'life-processes', name: 'Life Processes', difficulty: 'medium', periods: 20 },
          { id: 'control-and-coordination', name: 'Control and Coordination', difficulty: 'medium', periods: 12 },
          { id: 'how-do-organisms-reproduce', name: 'How do Organisms Reproduce', difficulty: 'medium', periods: 12 },
          { id: 'heredity', name: 'Heredity and Evolution', difficulty: 'medium', periods: 6 },
        ],
      },
      {
        id: 'unit-sci-3',
        name: 'Natural Phenomena',
        section: 'III',
        marks: 12,
        periods: 30,
        topics: [
          { id: 'light-reflection-and-refraction', name: 'Light — Reflection and Refraction', difficulty: 'complex', periods: 20 },
          { id: 'the-human-eye-and-the-colourful-world', name: 'Human Eye and Colourful World', difficulty: 'medium', periods: 10 },
        ],
      },
      {
        id: 'unit-sci-4',
        name: 'Effects of Current',
        section: 'IV',
        marks: 13,
        periods: 30,
        topics: [
          { id: 'electricity', name: 'Electricity', difficulty: 'complex', periods: 18 },
          { id: 'magnetic-effects-of-electric-current', name: 'Magnetic Effects of Electric Current', difficulty: 'medium', periods: 12 },
        ],
      },
      {
        id: 'unit-sci-5',
        name: 'Natural Resources',
        section: 'V',
        marks: 5,
        periods: 15,
        topics: [
          { id: 'our-environment', name: 'Our Environment', difficulty: 'simple', periods: 15 },
        ],
      },
    ],
    chapters: [
      {
        id: 'chemical-reactions-and-equations',
        name: 'Chemical Reactions and Equations',
        number: 1,
        order: 1,
        unitId: 'unit-sci-1',
        unitName: 'Chemical Substances — Nature and Behaviour',
        marks: 6,
        periods: 15,
        summary: 'Balancing chemical equations, combination, decomposition, displacement, double displacement, redox, and corrosion.',
        difficulty: 'medium',
        lessonId: 'chemical-reactions-and-equations',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 6, theorems: 0, examples: 8, exercises: 4, quizzes: 8, visuals: 3, misconceptions: 3, authored: true },
        topics: [
          { id: 't-sci-1', name: 'Characteristics of Chemical Reactions', difficulty: 'simple', periods: 4 },
          { id: 't-sci-2', name: 'Balancing Chemical Equations by Inspection', difficulty: 'medium', periods: 5 },
          { id: 't-sci-3', name: 'Types of Reactions & Oxidation-Reduction', difficulty: 'medium', periods: 6 },
        ],
      },
      {
        id: 'life-processes',
        name: 'Life Processes',
        number: 5,
        order: 2,
        unitId: 'unit-sci-2',
        unitName: 'World of Living',
        marks: 9,
        periods: 20,
        summary: 'Autotrophic and heterotrophic nutrition, cellular respiration, human circulatory system, and plant/animal excretion.',
        difficulty: 'medium',
        lessonId: 'life-processes',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 7, theorems: 0, examples: 6, exercises: 4, quizzes: 10, visuals: 6, misconceptions: 3, authored: true },
        topics: [
          { id: 't-sci-4', name: 'Nutrition in Plants and Humans', difficulty: 'medium', periods: 6 },
          { id: 't-sci-5', name: 'Aerobic vs Anaerobic Respiration', difficulty: 'medium', periods: 5 },
          { id: 't-sci-6', name: 'Transportation in Animals and Plants', difficulty: 'complex', periods: 5 },
          { id: 't-sci-7', name: 'Human Excretory System & Nephron Function', difficulty: 'complex', periods: 4 },
        ],
      },
      {
        id: 'electricity',
        name: 'Electricity',
        number: 11,
        order: 3,
        unitId: 'unit-sci-4',
        unitName: 'Effects of Current',
        marks: 8,
        periods: 18,
        summary: "Ohm's law, factors affecting resistance, series and parallel circuits, heating effect of electric current (Joule's law).",
        difficulty: 'complex',
        lessonId: 'electricity',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 6, theorems: 1, examples: 8, exercises: 4, quizzes: 10, visuals: 4, misconceptions: 4, authored: true },
        topics: [
          { id: 't-sci-8', name: 'Electric Current, Potential Difference & Voltmeter', difficulty: 'simple', periods: 4 },
          { id: 't-sci-9', name: "Ohm's Law and Resistance Factors (ρl/A)", difficulty: 'medium', periods: 6 },
          { id: 't-sci-10', name: 'Series and Parallel Resistor Networks', difficulty: 'complex', periods: 5 },
          { id: 't-sci-11', name: "Electric Power & Joule's Heating Effect (H = I²Rt)", difficulty: 'medium', periods: 3 },
        ],
      },
    ],
    coverage: { total: 13, authored: 3, partial: 10, syllabusOnly: 0 },
  },
  {
    id: 'social-science',
    name: 'Social Science',
    shortName: 'SST',
    accent: 'amber',
    icon: 'Globe',
    code: '087',
    maxMarks: 80,
    internalMarks: 20,
    totalPeriods: 180,
    description: 'Integrated curriculum across India and Contemporary World, Contemporary India, Democratic Politics, and Understanding Economic Development.',
    units: [
      {
        id: 'unit-sst-1',
        name: 'India and the Contemporary World — II (History)',
        section: 'I',
        marks: 20,
        periods: 45,
        topics: [
          { id: 'the-rise-of-nationalism-in-europe', name: 'The Rise of Nationalism in Europe', difficulty: 'medium', periods: 15 },
          { id: 'nationalism-in-india', name: 'Nationalism in India', difficulty: 'medium', periods: 15 },
        ],
      },
      {
        id: 'unit-sst-2',
        name: 'Contemporary India — II (Geography)',
        section: 'II',
        marks: 20,
        periods: 45,
        topics: [
          { id: 'resources-and-development', name: 'Resources and Development', difficulty: 'simple', periods: 12 },
          { id: 'agriculture', name: 'Agriculture', difficulty: 'medium', periods: 15 },
        ],
      },
      {
        id: 'unit-sst-3',
        name: 'Democratic Politics — II (Political Science)',
        section: 'III',
        marks: 20,
        periods: 45,
        topics: [
          { id: 'power-sharing', name: 'Power-sharing', difficulty: 'simple', periods: 12 },
          { id: 'federalism', name: 'Federalism', difficulty: 'medium', periods: 15 },
        ],
      },
      {
        id: 'unit-sst-4',
        name: 'Understanding Economic Development (Economics)',
        section: 'IV',
        marks: 20,
        periods: 45,
        topics: [
          { id: 'development', name: 'Development', difficulty: 'simple', periods: 12 },
          { id: 'sectors-of-the-indian-economy', name: 'Sectors of the Indian Economy', difficulty: 'medium', periods: 15 },
        ],
      },
    ],
    chapters: [
      {
        id: 'the-rise-of-nationalism-in-europe',
        name: 'The Rise of Nationalism in Europe',
        number: 1,
        order: 1,
        unitId: 'unit-sst-1',
        unitName: 'India and the Contemporary World — II (History)',
        marks: 5,
        periods: 15,
        summary: 'French Revolution ideas of nationhood, liberal nationalism, unification of Italy and Germany, nationalism and imperialism.',
        difficulty: 'medium',
        lessonId: 'the-rise-of-nationalism-in-europe',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 5, theorems: 0, examples: 4, exercises: 3, quizzes: 6, visuals: 3, misconceptions: 2, authored: true },
        topics: [
          { id: 't-sst-1', name: 'The French Revolution and the Idea of the Nation', difficulty: 'simple', periods: 5 },
          { id: 't-sst-2', name: 'The Making of Nationalism in Europe & Liberalism', difficulty: 'medium', periods: 5 },
          { id: 't-sst-3', name: 'Unification of Germany and Italy', difficulty: 'medium', periods: 5 },
        ],
      },
    ],
    coverage: { total: 13, authored: 1, partial: 12, syllabusOnly: 0 },
  },
  {
    id: 'english',
    name: 'English Language and Literature',
    shortName: 'English',
    accent: 'rose',
    icon: 'BookOpen',
    code: '184',
    maxMarks: 80,
    internalMarks: 20,
    totalPeriods: 180,
    description: 'Language, critical reading comprehension, creative writing, and literature study.',
    units: [
      {
        id: 'unit-eng-1',
        name: 'Reading Skills',
        section: 'A',
        marks: 20,
        periods: 40,
        topics: [{ id: 'unseen-passage', name: 'Discursive and Case-based Factual Passages', difficulty: 'medium', periods: 40 }],
      },
      {
        id: 'unit-eng-2',
        name: 'Writing Skills and Grammar',
        section: 'B',
        marks: 20,
        periods: 40,
        topics: [{ id: 'formal-letters-analytics', name: 'Formal Letter & Analytical Paragraph Writing', difficulty: 'medium', periods: 40 }],
      },
      {
        id: 'unit-eng-3',
        name: 'Language through Literature',
        section: 'C',
        marks: 40,
        periods: 100,
        topics: [
          { id: 'a-letter-to-god', name: 'A Letter to God', difficulty: 'simple', periods: 10 },
          { id: 'nelson-mandela-long-walk-to-freedom', name: 'Nelson Mandela: Long Walk to Freedom', difficulty: 'medium', periods: 12 },
        ],
      },
    ],
    chapters: [
      {
        id: 'a-letter-to-god',
        name: 'A Letter to God',
        number: 1,
        order: 1,
        unitId: 'unit-eng-3',
        unitName: 'Language through Literature',
        marks: 4,
        periods: 10,
        summary: 'Story of Lencho, a farmer who writes a letter to God asking for 100 pesos after a hailstorm destroys his corn crop.',
        difficulty: 'simple',
        lessonId: 'a-letter-to-god',
        hasContent: true,
        isPartial: false,
        stats: { concepts: 4, theorems: 0, examples: 4, exercises: 3, quizzes: 6, visuals: 2, misconceptions: 1, authored: true },
        topics: [
          { id: 't-eng-1', name: "Lencho's Faith and Irony of the Postmaster's Act", difficulty: 'simple', periods: 5 },
          { id: 't-eng-2', name: 'Character Sketch and Literary Devices', difficulty: 'simple', periods: 5 },
        ],
      },
    ],
    coverage: { total: 10, authored: 1, partial: 9, syllabusOnly: 0 },
  },
];

const MOCK_CURRICULUM: Curriculum = {
  meta: {
    board: 'CBSE',
    class: 'X',
    academicYear: '2026-27',
    generatedAt: '2026-04-01T00:00:00.000Z',
    source: 'CBSE Official Curriculum 2026-27',
  },
  subjects: MOCK_SUBJECTS,
};

// ---------------------------------------------------------------------------
// Mock Data: 15-Week Study Plan
// ---------------------------------------------------------------------------

const MOCK_PLAN_WEEKS: PlanWeek[] = [
  { week: 1, phase: 'phase1', phaseName: 'Foundation & Concepts', chapterId: 'real-numbers', chapterName: 'Real Numbers', subjectId: 'mathematics', focus: 'Fundamental Theorem of Arithmetic and HCF/LCM prime factorisation', minutes: 240, target: '2 focused concept sessions + 1 diagnostic set', resource: 'NCERT Exercises 1.1, 1.2' },
  { week: 2, phase: 'phase1', phaseName: 'Foundation & Concepts', chapterId: 'polynomials', chapterName: 'Polynomials', subjectId: 'mathematics', focus: 'Zeroes of quadratic polynomials and relationship with coefficients', minutes: 240, target: 'Geometric graph interpretations + coefficient verification', resource: 'NCERT Exercise 2.2' },
  { week: 3, phase: 'phase1', phaseName: 'Foundation & Concepts', chapterId: 'pair-of-linear-equations', chapterName: 'Pair of Linear Equations in Two Variables', subjectId: 'mathematics', focus: 'Graphical consistency and elimination method problem sets', minutes: 240, target: 'Master algebraic elimination and word problems', resource: 'NCERT Exercises 3.1, 3.2' },
  { week: 4, phase: 'phase1', phaseName: 'Foundation & Concepts', chapterId: 'quadratic-equations', chapterName: 'Quadratic Equations', subjectId: 'mathematics', focus: 'Discriminant, nature of roots, and quadratic formula application', minutes: 240, target: 'Discriminant analysis + speed solving', resource: 'NCERT Exercises 4.1, 4.2' },
  { week: 5, phase: 'phase1', phaseName: 'Foundation & Concepts', chapterId: 'arithmetic-progressions', chapterName: 'Arithmetic Progressions', subjectId: 'mathematics', focus: 'nth term formula and sum of n terms word problems', minutes: 240, target: 'Derivations and real-life sequence models', resource: 'NCERT Exercises 5.2, 5.3' },
  { week: 6, phase: 'phase2', phaseName: 'Geometry & Coordinate Geometry', chapterId: 'coordinate-geometry', chapterName: 'Coordinate Geometry', subjectId: 'mathematics', focus: 'Distance formula, section formula, and collinearity', minutes: 240, target: 'Cartesian proofs of geometric polygons', resource: 'NCERT Exercises 7.1, 7.2' },
  { week: 7, phase: 'phase2', phaseName: 'Geometry & Coordinate Geometry', chapterId: 'triangles', chapterName: 'Triangles', subjectId: 'mathematics', focus: 'Basic Proportionality Theorem (Thales) and similarity proofs', minutes: 270, target: 'BPT theorem proof reproduction under 6 minutes', resource: 'NCERT Exercises 6.2, 6.3' },
  { week: 8, phase: 'phase2', phaseName: 'Geometry & Coordinate Geometry', chapterId: 'circles', chapterName: 'Circles', subjectId: 'mathematics', focus: 'Tangent properties and tangents from an external point', minutes: 210, target: 'Circle riders and two-tangent equality theorems', resource: 'NCERT Exercises 10.1, 10.2' },
  { week: 9, phase: 'phase3', phaseName: 'Trigonometry & Applications', chapterId: 'introduction-to-trigonometry', chapterName: 'Introduction to Trigonometry', subjectId: 'mathematics', focus: 'Trigonometric ratios table and fundamental identities', minutes: 270, target: 'sin²θ + cos²θ = 1 identity substitution proofs', resource: 'NCERT Exercises 8.1, 8.2, 8.3' },
  { week: 10, phase: 'phase3', phaseName: 'Trigonometry & Applications', chapterId: 'applications-of-trigonometry', chapterName: 'Some Applications of Trigonometry', subjectId: 'mathematics', focus: 'Elevation and depression word problems with diagrams', minutes: 240, target: 'Accurate ray diagrams and multi-storey height calculations', resource: 'NCERT Exercise 9.1' },
  { week: 11, phase: 'phase4', phaseName: 'Mensuration', chapterId: 'areas-related-to-circles', chapterName: 'Areas Related to Circles', subjectId: 'mathematics', focus: 'Sector and segment area calculations', minutes: 210, target: 'Shaded region area decomposition exercises', resource: 'NCERT Exercise 11.1' },
  { week: 12, phase: 'phase4', phaseName: 'Mensuration', chapterId: 'surface-areas-and-volumes', chapterName: 'Surface Areas and Volumes', subjectId: 'mathematics', focus: 'Combinations of solids: cylinders, cones, and hemispheres', minutes: 240, target: 'Melting and recasting solids volume balance', resource: 'NCERT Exercises 12.1, 12.2' },
  { week: 13, phase: 'phase5', phaseName: 'Statistics & Probability', chapterId: 'statistics', chapterName: 'Statistics', subjectId: 'mathematics', focus: 'Grouped frequency distribution mean, median, and mode', minutes: 240, target: 'Assumed mean method and mode formula accuracy', resource: 'NCERT Exercises 13.1, 13.2' },
  { week: 14, phase: 'phase5', phaseName: 'Statistics & Probability', chapterId: 'probability', chapterName: 'Probability', subjectId: 'mathematics', focus: 'Card decks, dice throws, and complementary event probabilities', minutes: 180, target: 'Zero-error probability sets on sample spaces', resource: 'NCERT Exercise 14.1' },
  { week: 15, phase: 'phase6', phaseName: 'Board Exam Mock Simulations', chapterId: 'real-numbers', chapterName: 'Comprehensive Mock Revisions', subjectId: 'mathematics', focus: 'Full 80-mark CBSE standard sample papers with 3-hour timer', minutes: 360, target: '2 full mock exam papers + step-marking verification', resource: 'CBSE Official Sample Papers 2026-27' },
];

const MOCK_PLAN: Plan = {
  meta: {
    title: 'Class X CBSE 2026-27 Structured 15-Week Mastery Plan',
    academicYear: '2026-27',
    board: 'CBSE',
  },
  pedagogy: {
    coreFoundation: 'Every chapter begins with intuitive everyday anchors before introducing algebraic formalisms.',
    stepMarking: 'Emphasis on writing every intermediate step to secure full marks in board exam evaluations.',
    spacedRepetition: 'Weekly climbs with interleaved practice problems from prior milestones.',
  },
  phases: {
    phase1: { name: 'Foundation & Number Systems', strategy: 'Core algebra and number line fluency', totalTime: '5 weeks', boardExamWeightage: '26 marks' },
    phase2: { name: 'Geometry & Coordinates', strategy: 'Visual proofs, constructions, and coordinates', totalTime: '3 weeks', boardExamWeightage: '21 marks' },
    phase3: { name: 'Trigonometry & Applications', strategy: 'Identity manipulation and height/distance geometry', totalTime: '2 weeks', boardExamWeightage: '12 marks' },
    phase4: { name: 'Mensuration', strategy: 'Dimensional solids decomposition and area arithmetic', totalTime: '2 weeks', boardExamWeightage: '10 marks' },
    phase5: { name: 'Statistics & Probability', strategy: 'Frequency algorithms and sample spaces', totalTime: '2 weeks', boardExamWeightage: '11 marks' },
    phase6: { name: 'Board Exam Mock Simulations', strategy: 'Full length mock tests and time management', totalTime: '1 week', boardExamWeightage: 'Full 80 marks' },
  },
  weeks: MOCK_PLAN_WEEKS,
};

// ---------------------------------------------------------------------------
// Mock Data: Detailed Lesson Data for Mathematics: Real Numbers
// ---------------------------------------------------------------------------

const MOCK_LESSON_REAL_NUMBERS: Lesson = {
  id: 'real-numbers',
  chapter: 'Real Numbers',
  title: 'Real Numbers — Complete Learning Module',
  chapterId: 'real-numbers',
  subjectId: 'mathematics',
  subjectName: 'Mathematics',
  unitName: 'Number Systems',
  examWeightage: 6,
  outcomes: [
    'Apply the Fundamental Theorem of Arithmetic to express composite numbers as products of primes.',
    'Calculate Highest Common Factor (HCF) and Least Common Multiple (LCM) using prime factorisation.',
    'Prove by method of contradiction that √2, √3, and √5 are irrational numbers.',
    'Identify terminating vs non-terminating repeating decimal expansions from prime factorisation of denominators.',
  ],
  prerequisite_nodes: ['Factors and Multiples', 'Prime Numbers', 'Rational Numbers', 'Long Division'],
  concepts: [
    {
      name: 'Fundamental Theorem of Arithmetic',
      title: 'Fundamental Theorem of Arithmetic',
      explanation: 'Every composite number can be uniquely factored as a product of prime powers, up to the order of factors. For example, 120 = 2³ × 3 × 5.',
      key_points: [
        'Uniqueness of prime factorisation (Fundamental property of integers)',
        'Order of prime factors does not affect the factorisation (apart from arrangement)',
        'HCF is the product of the smallest power of each common prime factor',
        'LCM is the product of the greatest power of each prime factor involved in the numbers',
      ],
      real_life_application: 'Used in modern public-key cryptography (RSA algorithm) where prime factorisation of massive integers secures digital banking.',
      purpose: 'Forms the computational basis for factoring, simplifying radicals, and finding shared intervals.',
      day_to_day_usage: ['Synchronising traffic light cycles', 'Tiling floor dimensions without cuts', 'Packaging items into uniform boxes'],
    },
    {
      name: 'Revisiting Irrational Numbers',
      title: 'Proof of Irrationality by Contradiction',
      explanation: 'A real number that cannot be written in the form p/q (where p, q are integers and q ≠ 0) is irrational. We prove √p is irrational for any prime p using contradiction.',
      key_points: [
        'Assume √2 is rational, i.e., √2 = a/b where a, b are coprime integers (HCF(a,b) = 1)',
        'Squaring both sides yields 2b² = a², proving 2 divides a²',
        'By theorem, if prime p divides a², then p divides a; hence a = 2c for some integer c',
        'Substituting gives 2b² = 4c² → b² = 2c², meaning 2 also divides b',
        'This contradicts that a and b have no common factor other than 1. Hence √2 is irrational.',
      ],
      real_life_application: 'Calculating precise diagonals in architectural floorplans and computer graphic aspect ratios without rounding drift.',
    },
    {
      name: 'Decimal Expansions of Rational Numbers',
      title: 'Terminating vs Non-Terminating Decimals',
      explanation: 'Let x = p/q be a rational number in simplest form. The decimal expansion of x terminates if and only if the prime factorisation of q is of the form 2ⁿ · 5ᵐ, where n and m are non-negative integers.',
      key_points: [
        'If denominator has only 2s and 5s as prime factors, decimal expansion is terminating.',
        'If denominator contains any prime other than 2 or 5 (e.g., 3, 7, 11), decimal expansion is non-terminating repeating.',
      ],
    },
  ],
  theorems: [
    {
      name: 'Fundamental Theorem of Arithmetic',
      statement: 'Every composite number can be expressed (factorised) as a product of primes, and this factorisation is unique, apart from the order in which the prime factors occur.',
      proposed_by: { name: 'Carl Friedrich Gauss', era: '1801 CE', location: 'Germany', book: 'Disquisitiones Arithmeticae' },
      historical_context: 'First proved completely by Gauss in 1801, unifying ancient Euclidean geometric number theory into modern algebra.',
      why_proposed: 'To establish an indivisible atomic building block for all natural numbers.',
      real_world_utility: 'Provides foundation for digital encryption, hash tables, and digital signatures.',
      why_students_learn: 'Critical for solving LCM, HCF, simplifying fractions, and understanding number structures.',
      examples: [
        {
          problem: 'Find the HCF and LCM of 96 and 404 using prime factorisation, and verify HCF × LCM = Product of numbers.',
          solution_step_by_step: [
            'Prime factorise 96: 96 = 2⁵ × 3',
            'Prime factorise 404: 404 = 2² × 101',
            'HCF = 2² = 4',
            'LCM = 2⁵ × 3 × 101 = 32 × 3 × 101 = 9696',
            'Verification: HCF × LCM = 4 × 9696 = 38784; Product = 96 × 404 = 38784. Verified.',
          ],
          final_answer: 'HCF = 4, LCM = 9696',
        },
      ],
    },
    {
      name: 'Irrationality of Square Roots of Primes',
      statement: 'Let p be a prime number. If p divides a², where a is a positive integer, then p divides a.',
      historical_context: 'Discovered by the Pythagoreans in ancient Greece while calculating the diagonal of a unit square.',
      why_proposed: 'To establish rigorous proof methods in mathematical analysis beyond empirical measurement.',
      real_world_utility: 'Ensures precision in trigonometric coordinates and computer graphics transformation matrices.',
      why_students_learn: 'Direct 3-mark or 5-mark proof question frequently asked in CBSE board examinations.',
    },
  ],
  worked_examples: [
    {
      title: 'HCF and LCM via Prime Factorisation',
      problem: 'Find the LCM and HCF of 12, 15 and 21 by applying the prime factorisation method.',
      solution: [
        'Step 1: Write prime factors of each number.',
        '12 = 2² × 3',
        '15 = 3 × 5',
        '21 = 3 × 7',
        'Step 2: HCF is product of smallest power of each common prime factor.',
        'Common factor is 3 with power 1 → HCF = 3.',
        'Step 3: LCM is product of greatest power of each prime factor involved.',
        'LCM = 2² × 3¹ × 5¹ × 7¹ = 4 × 3 × 5 × 7 = 420.',
      ],
      answer: 'HCF = 3, LCM = 420',
      board_tip: 'Remember that HCF(a,b,c) × LCM(a,b,c) is NOT necessarily equal to a × b × c for three numbers!',
    },
    {
      title: 'Proof that √5 is Irrational',
      problem: 'Prove that √5 is an irrational number.',
      solution: [
        'Assume to the contrary that √5 is rational.',
        'Then √5 = a/b, where a and b are co-prime integers and b ≠ 0.',
        'Squaring both sides: 5 = a²/b² → 5b² = a²  ... (1)',
        'This implies 5 divides a². Therefore 5 divides a.',
        'Let a = 5c for some integer c.',
        'Substituting into (1): 5b² = (5c)² = 25c² → b² = 5c²',
        'This means 5 divides b², so 5 divides b.',
        'Thus 5 is a common factor of both a and b. This contradicts our assumption that a and b are co-prime.',
        'Hence our assumption was wrong; √5 is irrational.',
      ],
      answer: 'Proved',
      board_tip: 'Always state explicitly that a and b are co-prime integers at the beginning of the proof.',
    },
  ],
  quizzes: {
    simple: [
      {
        id: 'q-rn-1',
        question: 'The HCF of 95 and 152 is:',
        options: ['19', '38', '57', '1'],
        correct: 0,
        explanation: { correct: '95 = 5 × 19 and 152 = 2³ × 19. The common prime factor is 19.' },
      },
      {
        id: 'q-rn-2',
        question: 'If two positive integers a and b are written as a = x³y² and b = xy³, where x, y are prime numbers, then HCF(a, b) is:',
        options: ['xy', 'xy²', 'x³y³', 'x²y²'],
        correct: 1,
        explanation: { correct: 'HCF is product of lowest powers of common variables: x¹ and y², giving xy².' },
      },
    ],
  },
  common_misconceptions: [
    {
      misconception: 'The value of π is equal to 22/7, so π is a rational number.',
      correction: '22/7 is merely a rational approximation used for calculation. π is an irrational transcendental number whose decimal expansion is non-terminating and non-recurring.',
    },
    {
      misconception: 'HCF(a, b, c) × LCM(a, b, c) = a × b × c for any three positive integers.',
      correction: 'The relation HCF × LCM = Product only holds true for two positive integers, not for three or more numbers.',
    },
  ],
  mind_maps: {
    title: 'Real Numbers Concept Architecture',
    root: 'Real Numbers',
    branches: [
      { concept: 'Rational Numbers', sub_nodes: ['Integers', 'Terminating Decimals (2ⁿ·5ᵐ)', 'Non-terminating Repeating Decimals'] },
      { concept: 'Irrational Numbers', sub_nodes: ['Non-terminating Non-repeating', 'Square roots of primes (√2, √3)', 'Transcendental (π)'] },
      { concept: 'Fundamental Theorem of Arithmetic', sub_nodes: ['Prime Factorisation', 'HCF = lowest common powers', 'LCM = highest powers'] },
    ],
  },
  concept_maps: {
    title: 'Real Numbers Concept Graph',
    nodes: [
      { id: 'n1', label: 'Natural Numbers', group: 'numbers' },
      { id: 'n2', label: 'Prime Numbers', group: 'numbers' },
      { id: 'n3', label: 'Composite Numbers', group: 'numbers' },
      { id: 'n4', label: 'Fundamental Theorem', group: 'theorems' },
      { id: 'n5', label: 'HCF & LCM', group: 'operations' },
      { id: 'n6', label: 'Irrational Numbers', group: 'numbers' },
    ],
    edges: [
      ['n1', 'n2'],
      ['n1', 'n3'],
      ['n2', 'n4'],
      ['n3', 'n4'],
      ['n4', 'n5'],
      ['n2', 'n6'],
    ],
  },
  flowcharts: [
    {
      title: 'Finding HCF & LCM of Two Integers',
      steps: [
        { order: 1, action: 'Factorise both numbers into product of prime powers' },
        { order: 2, action: 'Identify common prime factors' },
        { order: 3, action: 'HCF = Product of smallest power of each common prime' },
        { order: 4, action: 'LCM = Product of highest power of all primes involved' },
      ],
    },
  ],
  visualizations: [
    {
      rendererType: 'NumberLine',
      visualizationProperties: { min: -5, max: 10, marks: [0, 1, 1.414, 2, 3.14159, 5] },
    },
  ],
  stats: { concepts: 6, theorems: 2, examples: 8, exercises: 4, quizzes: 10, visuals: 4, misconceptions: 4, authored: true },
};

// ---------------------------------------------------------------------------
// In-Memory Mock Sessions & Storage
// ---------------------------------------------------------------------------

interface MockStoredSession {
  sessionId: string;
  kind: 'practice' | 'exam';
  subjectId: string;
  chapterId: string | null;
  questions: Array<PracticeQuestion & { correctIndex?: number; answerText?: string }>;
}

const mockSessions = new Map<string, MockStoredSession>();

// Curated Question Bank for realistic Practice & Mock Tests
const MOCK_QUESTION_BANK: Array<PracticeQuestion & { correctIndex: number; answerText: string }> = [
  {
    id: 'mq-1',
    type: 'mcq',
    question: 'If two positive integers p and q can be expressed as p = ab² and q = a³b, where a, b being prime numbers, then LCM(p, q) is:',
    options: ['ab', 'a²b²', 'a³b²', 'a³b³'],
    marks: 1,
    difficulty: 'medium',
    chapterId: 'real-numbers',
    chapterName: 'Real Numbers',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 2,
    answerText: 'LCM takes highest power of each prime: a³ × b² = a³b².',
  },
  {
    id: 'mq-2',
    type: 'mcq',
    question: 'The decimal representation of 11 / (2³ × 5) will terminate after how many decimal places?',
    options: ['1 decimal place', '2 decimal places', '3 decimal places', '4 decimal places'],
    marks: 1,
    difficulty: 'simple',
    chapterId: 'real-numbers',
    chapterName: 'Real Numbers',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 2,
    answerText: 'The power of 2 is 3 and power of 5 is 1. The maximum power is 3, so it terminates after 3 places.',
  },
  {
    id: 'mq-3',
    type: 'mcq',
    question: 'If α and β are the zeroes of the quadratic polynomial f(x) = x² - p(x + 1) - c, then (α + 1)(β + 1) =',
    options: ['c - 1', '1 - c', 'c', '1 + c'],
    marks: 1,
    difficulty: 'complex',
    chapterId: 'polynomials',
    chapterName: 'Polynomials',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 1,
    answerText: 'f(x) = x² - px - (p + c). α + β = p and αβ = -(p + c). (α + 1)(β + 1) = αβ + (α + β) + 1 = -(p + c) + p + 1 = 1 - c.',
  },
  {
    id: 'mq-4',
    type: 'mcq',
    question: 'For what value of k do the equations 3x - y + 8 = 0 and 6x - ky = -16 represent coincident lines?',
    options: ['1/2', '-1/2', '2', '-2'],
    marks: 1,
    difficulty: 'medium',
    chapterId: 'pair-of-linear-equations',
    chapterName: 'Pair of Linear Equations',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 2,
    answerText: 'For coincident lines, a1/a2 = b1/b2 = c1/c2. Here 3/6 = -1/(-k) = 8/16 → 1/2 = 1/k → k = 2.',
  },
  {
    id: 'mq-5',
    type: 'mcq',
    question: 'The discriminant of the quadratic equation 2x² - 4x + 3 = 0 is:',
    options: ['-8', '10', '-16', '8'],
    marks: 1,
    difficulty: 'simple',
    chapterId: 'quadratic-equations',
    chapterName: 'Quadratic Equations',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 0,
    answerText: 'D = b² - 4ac = (-4)² - 4(2)(3) = 16 - 24 = -8. Since D < 0, it has no real roots.',
  },
  {
    id: 'mq-6',
    type: 'mcq',
    question: 'Which term of the AP: 21, 18, 15, ... is -81?',
    options: ['28th term', '32nd term', '35th term', '36th term'],
    marks: 1,
    difficulty: 'medium',
    chapterId: 'arithmetic-progressions',
    chapterName: 'Arithmetic Progressions',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 2,
    answerText: 'a = 21, d = -3. an = a + (n-1)d → -81 = 21 + (n-1)(-3) → -102 = -3(n-1) → 34 = n - 1 → n = 35.',
  },
  {
    id: 'mq-7',
    type: 'mcq',
    question: 'The distance between the points A(0, 6) and B(0, -2) is:',
    options: ['6 units', '8 units', '4 units', '2 units'],
    marks: 1,
    difficulty: 'simple',
    chapterId: 'coordinate-geometry',
    chapterName: 'Coordinate Geometry',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 1,
    answerText: 'Distance = √((0 - 0)² + (-2 - 6)²) = √((-8)²) = 8 units.',
  },
  {
    id: 'mq-8',
    type: 'mcq',
    question: 'If sin θ + cos θ = √2 cos θ, then the value of tan θ is:',
    options: ['√2 - 1', '√2 + 1', '1/√2', '√2'],
    marks: 1,
    difficulty: 'complex',
    chapterId: 'introduction-to-trigonometry',
    chapterName: 'Introduction to Trigonometry',
    subjectId: 'mathematics',
    source: 'CBSE Practice Bank',
    correctIndex: 0,
    answerText: 'Divide both sides by cos θ: tan θ + 1 = √2 → tan θ = √2 - 1.',
  },
];

// Helper to load or initialize progress
function getStoredProgress(): Progress {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {
    // LocalStorage failure
  }
  return {
    userId: 'guest',
    xp: 240,
    streak: 3,
    lastActive: new Date().toISOString(),
    completedChapters: {
      'mathematics:real-numbers': { at: new Date().toISOString(), score: 92 },
    },
    chapterMinutes: {
      'mathematics:real-numbers': 140,
    },
    practice: { attempts: 4, correct: 18, answered: 20 },
    exams: [
      { at: new Date().toISOString(), subjectId: 'mathematics', score: 72, total: 80 },
    ],
    recent: [
      { type: 'practice', subjectId: 'mathematics', title: 'Real Numbers Practice Test', at: new Date().toISOString() },
    ],
    planChecks: { 'week-1': true },
    bookmarks: ['real-numbers'],
    updatedAt: new Date().toISOString(),
    badges: [
      { id: 'first-step', name: 'First Step', xp: 20 },
      { id: 'streak-3', name: '3-Day Streak', xp: 50 },
    ],
    videoProgress: {
      'real-numbers': { positionSec: 180, durationSec: 630, bookmarked: true, updatedAt: new Date().toISOString() },
    },
  };
}

function saveStoredProgress(progress: Progress): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  } catch {
    // QuotaExceeded or restricted storage handled gracefully
  }
}

// ---------------------------------------------------------------------------
// 29-Endpoint Mock Request Dispatcher
// ---------------------------------------------------------------------------

export async function handleMockRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url, 'http://localhost');
  } catch {
    parsedUrl = new URL(`http://localhost${url.startsWith('/') ? '' : '/'}${url}`);
  }
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  let body: Record<string, unknown> = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = {};
    }
  }

  // 1. GET /api/health
  if (method === 'GET' && pathname === '/api/health') {
    return {
      ok: true,
      service: 'ClassX Platform Mock Service',
      version: '1.0.0-mock',
      commit: 'mock-static-2026',
      uptimeSec: 360,
      curriculum: { chapters: 57, questions: 1450 },
      rag: { chunks: 180 },
      sessionStore: 'mock-memory',
      aiProvider: true,
    } as unknown as T;
  }

  // 2. GET /api/curriculum
  if (method === 'GET' && pathname === '/api/curriculum') {
    return {
      ok: true,
      meta: MOCK_CURRICULUM.meta,
      subjects: MOCK_CURRICULUM.subjects,
    } as unknown as T;
  }

  // 3. GET /api/chapters/:subjectId/:chapterId
  if (method === 'GET' && pathname.startsWith('/api/chapters/')) {
    const parts = pathname.replace('/api/chapters/', '').split('/');
    const subjectId = parts[0] || 'mathematics';
    const chapterId = parts[1] || 'real-numbers';

    const subject = MOCK_SUBJECTS.find((s) => s.id === subjectId);
    if (!subject) {
      return { ok: false, error: 'Subject not found' } as unknown as T;
    }

    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (!chapter) {
      // Graceful fallback for unknown chapters (tested in T2.1)
      const gracefulChapter: Chapter & { subjectName: string; subjectId: string } = {
        id: chapterId,
        name: chapterId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        number: 99,
        order: 99,
        unitId: subject.units[0]?.id || 'unit-default',
        unitName: subject.units[0]?.name || 'Core Curriculum',
        marks: 5,
        periods: 10,
        summary: `Learning objectives and foundational concept notes for ${chapterId}.`,
        difficulty: 'medium',
        lessonId: null,
        hasContent: true,
        isPartial: false,
        stats: { concepts: 4, theorems: 1, examples: 4, exercises: 2, quizzes: 5, visuals: 2, misconceptions: 2, authored: true },
        topics: [
          { id: `${chapterId}-t1`, name: 'Core Foundations and Overview', difficulty: 'simple', periods: 4 },
          { id: `${chapterId}-t2`, name: 'Worked Examples & Applications', difficulty: 'medium', periods: 6 },
        ],
        subjectName: subject.name,
        subjectId: subject.id,
      };

      const detail: ChapterDetail = {
        ok: true,
        chapter: gracefulChapter,
        lesson: null,
        graph: {
          title: `${gracefulChapter.name} Concept Map`,
          nodes: [
            { id: 'n1', label: 'Core Principles', group: 'core' },
            { id: 'n2', label: 'Applications', group: 'applied' },
          ],
          edges: [['n1', 'n2']],
          source: 'mock-graph',
        },
        related: [
          { subjectId: 'mathematics', chapterId: 'real-numbers', chapterName: 'Real Numbers', title: 'Real Numbers', type: 'concept' },
        ],
        available: { practice: true, notes: false, mock: false },
      };
      return detail as unknown as T;
    }

    const lesson = chapterId === 'real-numbers' ? MOCK_LESSON_REAL_NUMBERS : null;
    const detail: ChapterDetail = {
      ok: true,
      chapter: {
        ...chapter,
        subjectName: subject.name,
        subjectId: subject.id,
      },
      lesson,
      graph: {
        title: `${chapter.name} Concept Graph`,
        nodes: [
          { id: 'n1', label: 'Prime Numbers', group: 'core' },
          { id: 'n2', label: 'Fundamental Theorem', group: 'theorems' },
          { id: 'n3', label: 'HCF and LCM', group: 'methods' },
          { id: 'n4', label: 'Irrational Numbers', group: 'theorems' },
        ],
        edges: [
          ['n1', 'n2'],
          ['n2', 'n3'],
          ['n1', 'n4'],
        ],
        source: 'mock-graph',
      },
      related: [
        { subjectId: 'mathematics', chapterId: 'polynomials', chapterName: 'Polynomials', title: 'Zeroes of Polynomials', type: 'prerequisite' },
      ],
      available: { practice: true, notes: Boolean(lesson), mock: true },
    };
    return detail as unknown as T;
  }

  // 4. GET /api/search?q=...&subjectId=...&limit=...
  if (method === 'GET' && pathname === '/api/search') {
    const rawQ = searchParams.get('q') || '';
    const q = rawQ.trim();
    const limit = Number(searchParams.get('limit')) || 8;
    const subjectId = searchParams.get('subjectId');

    if (!q) {
      return { ok: true, query: '', results: [], diagnostics: { latencyMs: 2, strategy: 'mock-lexical' } } as unknown as T;
    }

    // Safe search using lowercased substring match (no regex injection risk)
    const lowerQ = q.toLowerCase();
    const matches: SearchResult[] = [];

    for (const sub of MOCK_SUBJECTS) {
      if (subjectId && sub.id !== subjectId) continue;
      for (const chap of sub.chapters) {
        if (chap.name.toLowerCase().includes(lowerQ) || chap.summary.toLowerCase().includes(lowerQ)) {
          matches.push({
            id: `sr-${chap.id}`,
            title: `${sub.name}: ${chap.name}`,
            text: chap.summary,
            type: 'chapter',
            subjectId: sub.id,
            subjectName: sub.name,
            chapterId: chap.id,
            chapterName: chap.name,
            anchor: `#${chap.id}`,
            score: 0.95,
          });
        }
        for (const topic of chap.topics) {
          if (topic.name.toLowerCase().includes(lowerQ)) {
            matches.push({
              id: `sr-${topic.id}`,
              title: `${chap.name} · ${topic.name}`,
              text: `Detailed discussion on ${topic.name} under ${chap.name} (${sub.name}).`,
              type: 'concept',
              subjectId: sub.id,
              subjectName: sub.name,
              chapterId: chap.id,
              chapterName: chap.name,
              anchor: `#${topic.id}`,
              score: 0.9,
            });
          }
        }
      }
    }

    // Fallback if no exact match
    if (matches.length === 0) {
      matches.push({
        id: 'sr-fallback',
        title: 'CBSE Class X Core Concepts',
        text: `Search result exploring topics relevant to "${q}" across Mathematics and Science.`,
        type: 'concept',
        subjectId: 'mathematics',
        subjectName: 'Mathematics',
        chapterId: 'real-numbers',
        chapterName: 'Real Numbers',
        anchor: '#real-numbers',
        score: 0.7,
      });
    }

    return {
      ok: true,
      query: q,
      results: matches.slice(0, limit),
      diagnostics: { latencyMs: 3, strategy: 'mock-lexical' },
    } as unknown as T;
  }

  // 5. POST /api/tutor
  if (method === 'POST' && pathname === '/api/tutor') {
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'socratic';

    if (!question) {
      return {
        ok: true,
        answer: 'Hello! I am your CBSE Class X tutor. Ask me any question from Mathematics, Science, Social Science, or English, and I will explain it step-by-step.',
        sources: [],
        retrieval: { query: '', expandedTerms: [], strategy: 'mock-grounded', candidates: 0, latencyMs: 2, intent: [] },
        provider: { mode: 'grounded-fallback', model: 'client-offline-ranker' },
      } as unknown as T;
    }

    const answer = `### Explanation [S1]\n\nRegarding your question: **"${question}"**\n\nIn CBSE Class X Mathematics and Science, we approach this by grounding ourselves in fundamental principles:\n\n1. **Core Concept [S1]**: Every composite integer can be factored uniquely into a product of primes (Fundamental Theorem of Arithmetic), providing a deterministic basis for HCF and LCM calculations.\n2. **Step-by-Step Method [S2]**: Decompose the given terms, identify smallest powers for common factors, and verify intermediate arithmetic to safeguard every single mark in board assessments.\n\n---\n**Check for Understanding (CFU):**\nCan you state whether the product of two positive integers is always equal to the product of their HCF and LCM?`;

    const sources: Citation[] = [
      {
        chunkId: 'chunk-math-real-numbers-c1',
        title: 'Fundamental Theorem of Arithmetic',
        chapterId: 'real-numbers',
        subjectId: 'mathematics',
        chapter: 'Real Numbers',
        subject: 'Mathematics',
        type: 'concept',
        anchor: '#fundamental-theorem',
        source: 'NCERT Class X Mathematics, Chapter 1',
        page: 4,
      },
      {
        chunkId: 'chunk-math-real-numbers-c2',
        title: 'Revisiting Irrational Numbers and Decimals',
        chapterId: 'real-numbers',
        subjectId: 'mathematics',
        chapter: 'Real Numbers',
        subject: 'Mathematics',
        type: 'theorem',
        anchor: '#proof-of-irrationality',
        source: 'NCERT Class X Mathematics, Chapter 1',
        page: 9,
      },
    ];

    const res: TutorResponse = {
      ok: true,
      answer,
      sources,
      retrieval: {
        query: question,
        expandedTerms: ['fundamental theorem', 'prime factorisation', 'HCF LCM'],
        strategy: 'grounded-fallback',
        candidates: 3,
        latencyMs: 14,
        intent: ['concept_explanation'],
      },
      provider: { mode: 'grounded-fallback', model: 'client-offline-ranker' },
    };
    return res as unknown as T;
  }

  // 6. POST /api/practice/start
  if (method === 'POST' && pathname === '/api/practice/start') {
    const count = Math.min(Math.max(Number(body.count) || 5, 1), 20);
    const subjectId = (typeof body.subjectId === 'string' && body.subjectId) || 'mathematics';
    const chapterId = typeof body.chapterId === 'string' ? body.chapterId : null;
    const difficulty = (typeof body.difficulty === 'string' && body.difficulty) || 'medium';

    const selectedBank = MOCK_QUESTION_BANK.filter((q) => {
      if (chapterId && q.chapterId !== chapterId) return false;
      return true;
    });

    const pool = selectedBank.length >= count ? selectedBank : MOCK_QUESTION_BANK;
    const sessionQuestions = pool.slice(0, count).map((q, idx) => ({
      ...q,
      id: `mock-q-${Date.now()}-${idx + 1}`,
      difficulty,
    }));

    const sessionId = `mock-session-${Date.now()}`;
    mockSessions.set(sessionId, {
      sessionId,
      kind: 'practice',
      subjectId,
      chapterId,
      questions: sessionQuestions,
    });

    // Strip out answer key so answers are NOT leaked to the client
    const sanitizedQuestions: PracticeQuestion[] = sessionQuestions.map((q) => ({
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
    }));

    const session: PracticeSession = {
      ok: true,
      sessionId,
      durationMin: 15,
      questions: sanitizedQuestions,
      meta: {
        count: sanitizedQuestions.length,
        subjectId,
        chapterId,
        totalMarks: sanitizedQuestions.reduce((sum, q) => sum + q.marks, 0),
      },
    };
    return session as unknown as T;
  }

  // 7. POST /api/practice/submit
  if (method === 'POST' && pathname === '/api/practice/submit') {
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const answers = (body.answers as Record<string, number>) || {};

    const session = mockSessions.get(sessionId);
    const questions = session?.questions || MOCK_QUESTION_BANK.slice(0, 5);

    let score = 0;
    let attempted = 0;
    const review: ReviewItem[] = questions.map((q) => {
      const selected = answers[q.id] !== undefined ? answers[q.id] : null;
      if (selected !== null) attempted++;
      const correctIndex = q.correctIndex !== undefined ? q.correctIndex : 0;
      const isCorrect = selected === correctIndex;
      const marksAwarded = isCorrect ? q.marks : 0;
      score += marksAwarded;

      return {
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        selected,
        correctIndex,
        correct: isCorrect,
        awarded: marksAwarded,
        marks: q.marks,
        explanation: q.answerText || 'Correct choice based on standard CBSE textbook derivation.',
        chapterName: q.chapterName,
        source: q.source,
      };
    });

    const total = questions.reduce((sum, q) => sum + q.marks, 0) || 1;
    const percentage = Math.round((score / total) * 100);
    const accuracy = attempted > 0 ? Math.round((score / attempted) * 100) : 0;

    // Update progress XP
    const prog = getStoredProgress();
    prog.xp += Math.max(5, score * 5);
    prog.practice.attempts += 1;
    prog.practice.answered += attempted;
    prog.practice.correct += score;
    saveStoredProgress(prog);

    const result: PracticeResult = {
      ok: true,
      sessionId: sessionId || 'mock-session-fallback',
      kind: 'practice',
      score,
      total,
      percentage,
      attempted,
      questionCount: questions.length,
      accuracy,
      review,
    };
    return result as unknown as T;
  }

  // 8. POST /api/exam/generate
  if (method === 'POST' && pathname === '/api/exam/generate') {
    const subjectId = (typeof body.subjectId === 'string' && body.subjectId) || 'mathematics';
    const paperId = `mock-exam-${Date.now()}`;

    // Section A: 20 Objective MCQs (1 mark each)
    const secAQuestions: PracticeQuestion[] = Array.from({ length: 20 }, (_, i) => {
      const template = MOCK_QUESTION_BANK[i % MOCK_QUESTION_BANK.length];
      return {
        id: `exam-sec-a-${i + 1}`,
        type: 'mcq',
        question: `[Q${i + 1}] ${template.question}`,
        options: template.options,
        marks: 1,
        difficulty: i < 10 ? 'simple' : 'medium',
        chapterId: template.chapterId,
        chapterName: template.chapterName,
        subjectId,
        source: 'CBSE Sample Paper 2026-27',
      };
    });

    // Section B: 6 Short Answer Questions (3 marks each = 18 marks)
    const secBQuestions: PracticeQuestion[] = Array.from({ length: 6 }, (_, i) => ({
      id: `exam-sec-b-${i + 1}`,
      type: 'subjective',
      question: `Show that 3 + 2√5 is irrational, given that √5 is irrational (Part ${i + 1}).`,
      marks: 3,
      difficulty: 'medium',
      chapterId: 'real-numbers',
      chapterName: 'Real Numbers',
      subjectId,
      source: 'CBSE Sample Paper 2026-27',
    }));

    // Section C: 4 Long Answer Questions (5 marks each = 20 marks)
    const secCQuestions: PracticeQuestion[] = Array.from({ length: 4 }, (_, i) => ({
      id: `exam-sec-c-${i + 1}`,
      type: 'subjective',
      question: `State and prove Basic Proportionality Theorem (Thales Theorem). Apply it to solve the given trapezoid ratio (Problem ${i + 1}).`,
      marks: 5,
      difficulty: 'complex',
      chapterId: 'triangles',
      chapterName: 'Triangles',
      subjectId,
      source: 'CBSE Sample Paper 2026-27',
    }));

    const paper: ExamPaper = {
      ok: true,
      paperId,
      subjectId,
      subjectName: 'Mathematics',
      totalMarks: 80,
      durationMin: 180,
      sectionCount: 3,
      sections: [
        {
          id: 'sec-a',
          title: 'Section A — Objective & Multiple Choice Questions',
          instruction: 'Questions 1 to 20 carry 1 mark each.',
          marks: 20,
          questions: secAQuestions,
        },
        {
          id: 'sec-b',
          title: 'Section B — Short Answer Type Questions',
          instruction: 'Questions 21 to 26 carry 3 marks each.',
          marks: 18,
          questions: secBQuestions,
        },
        {
          id: 'sec-c',
          title: 'Section C — Long Answer Type Questions',
          instruction: 'Questions 27 to 30 carry 5 marks each.',
          marks: 20,
          questions: secCQuestions,
        },
      ],
      instructions: [
        'All questions are compulsory.',
        'This question paper consists of 30 questions divided into three sections: A, B, and C.',
        'Section A comprises 20 MCQs of 1 mark each.',
        'Section B comprises 6 short answer questions of 3 marks each.',
        'Section C comprises 4 long answer questions of 5 marks each.',
      ],
    };

    return paper as unknown as T;
  }

  // 9. POST /api/exam/submit
  if (method === 'POST' && pathname === '/api/exam/submit') {
    const paperId = typeof body.paperId === 'string' ? body.paperId : 'mock-paper';
    const answers = (body.answers as Record<string, number>) || {};
    const subjectiveMarks = (body.subjectiveMarks as Record<string, number>) || {};

    let score = 0;
    const review: ReviewItem[] = [];

    // Score objective MCQs
    for (let i = 1; i <= 20; i++) {
      const qId = `exam-sec-a-${i}`;
      const selected = answers[qId] !== undefined ? answers[qId] : null;
      const correctIndex = (i % 4);
      const isCorrect = selected === correctIndex;
      const awarded = isCorrect ? 1 : 0;
      score += awarded;

      review.push({
        id: qId,
        type: 'mcq',
        question: `Question ${i} Objective`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        selected,
        correctIndex,
        correct: isCorrect,
        awarded,
        marks: 1,
        explanation: 'Step-by-step verification according to CBSE marking criteria.',
        chapterName: 'Mathematics Core',
      });
    }

    // Add subjective evaluated marks
    for (const [key, marks] of Object.entries(subjectiveMarks)) {
      score += Number(marks) || 0;
    }

    const total = 80;
    const percentage = Math.round((score / total) * 100);

    const prog = getStoredProgress();
    prog.xp += Math.max(20, score * 3);
    prog.exams.unshift({
      at: new Date().toISOString(),
      subjectId: 'mathematics',
      score,
      total,
    });
    saveStoredProgress(prog);

    const result: PracticeResult = {
      ok: true,
      sessionId: paperId,
      kind: 'exam',
      score,
      total,
      percentage,
      attempted: Object.keys(answers).length,
      questionCount: 30,
      accuracy: percentage,
      review,
    };
    return result as unknown as T;
  }

  // 10. GET /api/exam/:paperId/key
  if (method === 'GET' && pathname.includes('/key') && pathname.startsWith('/api/exam/')) {
    const paperId = pathname.replace('/api/exam/', '').replace('/key', '');
    const key: ExamKey = {
      ok: true,
      paperId,
      subjective: [
        {
          id: 'exam-sec-b-1',
          section: 'Section B',
          question: 'Show that 3 + 2√5 is irrational, given that √5 is irrational.',
          marks: 3,
          steps: [
            'Assume 3 + 2√5 is rational = p/q where p, q are integers and q ≠ 0.',
            'Rearrange: 2√5 = p/q - 3 = (p - 3q)/q.',
            'Thus √5 = (p - 3q)/(2q).',
            'Since p, q are integers, (p - 3q)/(2q) is rational, which contradicts √5 being irrational.',
            'Hence 3 + 2√5 is irrational.',
          ],
          answer: '3 + 2√5 is proved to be irrational.',
          hints: ['Isolate the irrational radical on the LHS.'],
          source: 'CBSE Official Marking Scheme',
        },
        {
          id: 'exam-sec-c-1',
          section: 'Section C',
          question: 'State and prove Basic Proportionality Theorem (Thales Theorem).',
          marks: 5,
          steps: [
            'Statement: If a line is drawn parallel to one side of a triangle intersecting other two sides, then it divides the two sides in the same ratio.',
            'Given: Triangle ABC with DE || BC.',
            'To prove: AD/DB = AE/EC.',
            'Construction: Join BE and CD. Draw DM ⊥ AC and EN ⊥ AB.',
            'Calculate Area(ΔADE) / Area(ΔBDE) = AD / DB.',
            'Calculate Area(ΔADE) / Area(ΔCDE) = AE / EC.',
            'Since ΔBDE and ΔCDE are on the same base DE between the same parallels DE and BC, their areas are equal.',
            'Therefore, AD / DB = AE / EC. (Q.E.D.)',
          ],
          answer: 'AD / DB = AE / EC proven successfully.',
          hints: ['Use the formula Area = 1/2 × base × height with common altitudes.'],
          source: 'CBSE Official Marking Scheme',
        },
      ],
    };
    return key as unknown as T;
  }

  // 11. GET /api/plan
  if (method === 'GET' && pathname === '/api/plan') {
    return {
      ok: true,
      plan: MOCK_PLAN,
    } as unknown as T;
  }

  // 12. GET /api/library
  if (method === 'GET' && pathname === '/api/library') {
    const library: LibraryData & { ok: boolean } = {
      ok: true,
      formulas: [
        {
          id: 'f1',
          subjectId: 'mathematics',
          subjectName: 'Mathematics',
          chapterId: 'real-numbers',
          chapterName: 'Real Numbers',
          name: 'HCF and LCM Relation',
          statement: 'HCF(a, b) × LCM(a, b) = a × b',
          example: 'For a=12, b=18: HCF=6, LCM=36 → 6 × 36 = 216; 12 × 18 = 216.',
        },
        {
          id: 'f2',
          subjectId: 'mathematics',
          subjectName: 'Mathematics',
          chapterId: 'quadratic-equations',
          chapterName: 'Quadratic Equations',
          name: 'Quadratic Formula',
          statement: 'x = (-b ± √(b² - 4ac)) / (2a)',
          example: 'For x² - 5x + 6 = 0: x = (5 ± √(25 - 24))/2 = (5 ± 1)/2 → x = 3 or x = 2.',
        },
        {
          id: 'f3',
          subjectId: 'mathematics',
          subjectName: 'Mathematics',
          chapterId: 'arithmetic-progressions',
          chapterName: 'Arithmetic Progressions',
          name: 'nth Term of an AP',
          statement: 'an = a + (n - 1)d',
          example: 'First term a=3, common difference d=4: 10th term = 3 + 9(4) = 39.',
        },
        {
          id: 'f4',
          subjectId: 'mathematics',
          subjectName: 'Mathematics',
          chapterId: 'coordinate-geometry',
          chapterName: 'Coordinate Geometry',
          name: 'Distance Formula',
          statement: 'd = √((x₂ - x₁)² + (y₂ - y₁)²)',
          example: 'Distance between (0, 0) and (3, 4) = √(9 + 16) = 5 units.',
        },
        {
          id: 'f5',
          subjectId: 'mathematics',
          subjectName: 'Mathematics',
          chapterId: 'introduction-to-trigonometry',
          chapterName: 'Introduction to Trigonometry',
          name: 'Fundamental Trigonometric Identity',
          statement: 'sin²θ + cos²θ = 1',
          example: 'For θ=30°: (1/2)² + (√3/2)² = 1/4 + 3/4 = 1.',
        },
      ],
      shortcuts: [
        {
          id: 's1',
          subjectId: 'mathematics',
          chapterId: 'real-numbers',
          chapterName: 'Real Numbers',
          name: 'Quick Decimal Terminator Test',
          title: 'Denominator 2ⁿ·5ᵐ inspection',
          description: 'Instantly determine if a fraction terminates by verifying if denominator prime factors only contain 2 and 5.',
        },
        {
          id: 's2',
          subjectId: 'mathematics',
          chapterId: 'quadratic-equations',
          chapterName: 'Quadratic Equations',
          name: 'Nature of Roots via Discriminant D',
          title: 'Sign of D = b² - 4ac',
          description: 'D > 0: two distinct real roots; D = 0: two equal real roots; D < 0: no real roots.',
        },
      ],
      flashcards: [
        {
          id: 'fc1',
          subjectId: 'mathematics',
          chapterId: 'real-numbers',
          chapterName: 'Real Numbers',
          difficulty: 'simple',
          front: 'What is the condition for a rational number p/q to have a terminating decimal expansion?',
          back: 'The denominator q must have a prime factorisation of the form 2ⁿ · 5ᵐ where n and m are non-negative integers.',
          options: ['2ⁿ · 5ᵐ', '3ⁿ · 5ᵐ', 'Only 2ⁿ', 'Only 5ᵐ'],
          correct: 0,
        },
        {
          id: 'fc2',
          subjectId: 'mathematics',
          chapterId: 'triangles',
          chapterName: 'Triangles',
          difficulty: 'medium',
          front: 'What does the Basic Proportionality Theorem state?',
          back: 'If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio.',
        },
      ],
    };
    return library as unknown as T;
  }

  // 13. GET /api/progress?userId=...
  if (method === 'GET' && pathname === '/api/progress') {
    const progress = getStoredProgress();
    return { ok: true, progress } as unknown as T;
  }

  // 14. PUT /api/progress
  if (method === 'PUT' && pathname === '/api/progress') {
    const current = getStoredProgress();
    const updated: Progress = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    saveStoredProgress(updated);
    return { ok: true, progress: updated } as unknown as T;
  }

  // 15. GET /api/video/:subjectId/:chapterId
  if (method === 'GET' && pathname.startsWith('/api/video/')) {
    const parts = pathname.replace('/api/video/', '').split('/');
    const subjectId = parts[0] || 'mathematics';
    const chapterId = parts[1] || 'real-numbers';

    const catalog: VideoCatalog = {
      ok: true,
      subjectId,
      chapterId,
      video: {
        id: `${subjectId}-${chapterId}-v1`,
        provider: 'youtube',
        videoId: 'L6lAZ7gHQ7c',
        title: `${chapterId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} — Class X Complete Masterclass`,
        durationSec: 840,
        chapterId,
        channel: 'NCERT & CBSE Educational Channel',
        safe: true,
        rating: 4.8,
        summary: `Comprehensive masterclass on ${chapterId} covering core NCERT concepts, definitions, and problem-solving techniques for CBSE exams.`,
        validityScore: 0.95,
      },
      gating: { requiredMastery: 80 },
    };
    return catalog as unknown as T;
  }

  // 16. POST /api/video/progress
  if (method === 'POST' && pathname === '/api/video/progress') {
    const chapterId = typeof body.chapterId === 'string' ? body.chapterId : 'real-numbers';
    const positionSec = Number(body.positionSec) || 0;
    const durationSec = Number(body.durationSec) || 600;
    const bookmarked = Boolean(body.bookmarked);

    const prog = getStoredProgress();
    prog.videoProgress = prog.videoProgress || {};
    prog.videoProgress[chapterId] = {
      positionSec,
      durationSec,
      bookmarked,
      updatedAt: new Date().toISOString(),
    };
    saveStoredProgress(prog);
    return { ok: true, saved: true } as unknown as T;
  }

  // 17. GET /api/gamify/badges
  if (method === 'GET' && pathname === '/api/gamify/badges') {
    const badges: Badge[] = [
      { id: 'first-step', name: 'First Step', xp: 20 },
      { id: 'streak-3', name: '3-Day Streak', xp: 50 },
      { id: 'math-wizard', name: 'Math Wizard', xp: 100 },
      { id: 'science-explorer', name: 'Science Explorer', xp: 100 },
      { id: 'perfect-practice', name: 'Century Practice', xp: 150 },
      { id: 'exam-ready', name: 'Exam Ready', xp: 200 },
    ];
    return { ok: true, badges } as unknown as T;
  }

  // 18. GET /api/gamify/leaderboard?limit=...
  if (method === 'GET' && pathname === '/api/gamify/leaderboard') {
    const limit = Math.max(Number(searchParams.get('limit')) || 20, 1);
    const mockUsers = [
      { userId: 'Aarav Sharma', xp: 1240, streak: 14, completedChapters: 12, badges: 5 },
      { userId: 'Priya Patel', xp: 1180, streak: 12, completedChapters: 11, badges: 4 },
      { userId: 'Rohan Gupta', xp: 950, streak: 9, completedChapters: 8, badges: 4 },
      { userId: 'Ananya Reddy', xp: 870, streak: 7, completedChapters: 7, badges: 3 },
      { userId: 'Vikram Singh', xp: 760, streak: 6, completedChapters: 6, badges: 3 },
      { userId: 'guest (You)', xp: 240, streak: 3, completedChapters: 2, badges: 2 },
    ];

    const leaderboard: LeaderboardEntry[] = mockUsers.slice(0, limit).map((u) => ({
      userId: u.userId,
      xp: u.xp,
      streak: u.streak,
      completedChapters: u.completedChapters,
      badges: u.badges,
      lastActive: new Date().toISOString(),
    }));

    return { ok: true, leaderboard } as unknown as T;
  }

  // 19. POST /api/gamify/xp
  if (method === 'POST' && pathname === '/api/gamify/xp') {
    const amount = Number(body.amount) || 10;
    const reason = typeof body.reason === 'string' ? body.reason : 'activity';

    const prog = getStoredProgress();
    prog.xp += amount;
    saveStoredProgress(prog);

    const res: GamifyXpResult = {
      ok: true,
      xp: prog.xp,
      badges: prog.badges || [{ id: 'first-step', name: 'First Step', xp: 20 }],
      reason,
    };
    return res as unknown as T;
  }

  // 20. GET /api/parent/:childUserId
  if (method === 'GET' && pathname.startsWith('/api/parent/') && pathname !== '/api/parent/link') {
    const childUserId = pathname.replace('/api/parent/', '') || 'guest';
    const prog = getStoredProgress();

    const parent: ParentView = {
      childUserId,
      xp: prog.xp,
      streak: prog.streak,
      completedChapters: Object.keys(prog.completedChapters || {}).length,
      practice: prog.practice || { attempts: 4, correct: 18, answered: 20 },
      exams: prog.exams || [],
      badges: prog.badges || [],
      recent: prog.recent || [],
      lastActive: prog.lastActive || new Date().toISOString(),
    };
    return { ok: true, parent } as unknown as T;
  }

  // 21. POST /api/parent/link
  if (method === 'POST' && pathname === '/api/parent/link') {
    const childUserId = typeof body.childUserId === 'string' ? body.childUserId : 'guest';
    return {
      ok: true,
      linked: true,
      childUserId,
      linkedAt: new Date().toISOString(),
    } as unknown as T;
  }

  // 22. GET /api/graph/:subjectId/:chapterId
  if (method === 'GET' && pathname.startsWith('/api/graph/')) {
    const parts = pathname.replace('/api/graph/', '').split('/');
    const subjectId = parts[0] || 'mathematics';
    const chapterId = parts[1] || 'real-numbers';

    return {
      ok: true,
      graph: {
        title: `${chapterId} Concept Map`,
        source: 'mock-graph',
        nodes: [
          { id: 'n1', label: 'Prime Factorisation', group: 'core' },
          { id: 'n2', label: 'Euclid Division Algorithm', group: 'algorithm' },
          { id: 'n3', label: 'Fundamental Theorem of Arithmetic', group: 'theorem' },
          { id: 'n4', label: 'Irrationality Proofs', group: 'proof' },
          { id: 'n5', label: 'Terminating Decimal Criteria', group: 'decimal' },
        ],
        edges: [
          ['n1', 'n2'],
          ['n2', 'n3'],
          ['n1', 'n4'],
          ['n1', 'n5'],
        ],
      },
    } as unknown as T;
  }

  // 23. POST /api/practice/adaptive
  if (method === 'POST' && pathname === '/api/practice/adaptive') {
    const currentDifficulty = typeof body.currentDifficulty === 'string' ? body.currentDifficulty : 'simple';
    const accuracy = typeof body.accuracy === 'number' ? body.accuracy : undefined;

    let difficulty = currentDifficulty;
    if (accuracy !== undefined) {
      if (accuracy >= 0.8 && currentDifficulty === 'simple') difficulty = 'medium';
      else if (accuracy >= 0.8 && currentDifficulty === 'medium') difficulty = 'complex';
      else if (accuracy < 0.5 && currentDifficulty === 'medium') difficulty = 'simple';
      else if (accuracy < 0.5 && currentDifficulty === 'complex') difficulty = 'medium';
    }

    const count = Math.min(Math.max(Number(body.count) || 5, 1), 20);
    const questions = MOCK_QUESTION_BANK.slice(0, count).map((q, idx) => ({
      id: `adaptive-q-${Date.now()}-${idx + 1}`,
      type: q.type,
      question: q.question,
      options: q.options,
      marks: q.marks,
      difficulty,
      chapterId: q.chapterId,
      chapterName: q.chapterName,
      subjectId: q.subjectId,
      source: 'CBSE Adaptive Question Pool',
    }));

    const session: AdaptivePracticeSession = {
      ok: true,
      sessionId: `adaptive-session-${Date.now()}`,
      durationMin: 15,
      questions,
      meta: {
        count: questions.length,
        subjectId: (typeof body.subjectId === 'string' && body.subjectId) || 'mathematics',
        chapterId: typeof body.chapterId === 'string' ? body.chapterId : null,
        totalMarks: questions.reduce((s, q) => s + q.marks, 0),
      },
      adaptive: { difficulty, accuracy },
    };
    return session as unknown as T;
  }

  // 24. GET /api/okf/stats
  if (method === 'GET' && pathname === '/api/okf/stats') {
    const stats: OkfStats = {
      loaded: true,
      topicCount: 45,
      tagCount: 28,
      unitCount: 16,
      okfVersion: 'OKF-v1',
    };
    return { ok: true, ...stats } as unknown as T;
  }

  // 25. GET /api/okf/topics
  if (method === 'GET' && pathname === '/api/okf/topics') {
    const tagsParam = searchParams.get('tags');
    const requestedTags = tagsParam ? tagsParam.split(',').map((t) => t.trim().toLowerCase()) : [];

    const mockTopics: OkfTopic[] = [
      {
        subjectId: 'mathematics',
        topicId: 'real-numbers-fta',
        topicName: 'Fundamental Theorem of Arithmetic',
        parentUnit: 'Number Systems',
        difficulty: 'medium',
        estimatedPeriods: 4,
        tags: ['algebra', 'primes', 'hcf', 'lcm'],
        okfVersion: 'OKF-v1',
        board: 'CBSE',
        class: 'X',
        academicYear: '2026-27',
      },
      {
        subjectId: 'mathematics',
        topicId: 'quadratics-discriminant',
        topicName: 'Nature of Roots & Discriminant',
        parentUnit: 'Algebra',
        difficulty: 'medium',
        estimatedPeriods: 5,
        tags: ['algebra', 'equations', 'roots'],
        okfVersion: 'OKF-v1',
        board: 'CBSE',
        class: 'X',
        academicYear: '2026-27',
      },
      {
        subjectId: 'science',
        topicId: 'chemical-reactions-balancing',
        topicName: 'Balancing Chemical Equations',
        parentUnit: 'Chemical Substances',
        difficulty: 'medium',
        estimatedPeriods: 5,
        tags: ['chemistry', 'reactions', 'stoichiometry'],
        okfVersion: 'OKF-v1',
        board: 'CBSE',
        class: 'X',
        academicYear: '2026-27',
      },
    ];

    const filtered = requestedTags.length > 0
      ? mockTopics.filter((topic) => topic.tags.some((t) => requestedTags.includes(t)))
      : mockTopics;

    return {
      ok: true,
      okfVersion: 'OKF-v1',
      topics: filtered,
    } as unknown as T;
  }

  // 26. GET /api/search/multimodel
  if (method === 'GET' && pathname === '/api/search/multimodel') {
    const q = searchParams.get('q') || '';
    const limit = Number(searchParams.get('limit')) || 10;

    const results: OkfSearchResult[] = [
      {
        id: 'mm-1',
        title: 'Fundamental Theorem of Arithmetic (OKF)',
        text: 'Every composite number can be written as a unique product of prime powers.',
        type: 'concept',
        subjectId: 'mathematics',
        subjectName: 'Mathematics',
        chapterId: 'real-numbers',
        chapterName: 'Real Numbers',
        anchor: '#fundamental-theorem',
        score: 0.94,
        okf: {
          version: 'OKF-v1',
          topic: { id: 'real-numbers-fta', name: 'Fundamental Theorem of Arithmetic', difficulty: 'medium' },
          tags: ['algebra', 'primes'],
          board: 'CBSE',
          class: 'X',
          academicYear: '2026-27',
        },
      },
    ];

    return {
      ok: true,
      query: q,
      results: results.slice(0, limit),
      diagnostics: { strategy: 'multimodel-mock', latencyMs: 4 },
    } as unknown as T;
  }

  // 27. GET /api/learning-aids/:subjectId/:chapterId
  if (method === 'GET' && pathname.startsWith('/api/learning-aids/') && !pathname.includes('/ids') && !pathname.includes('/group/')) {
    const parts = pathname.replace('/api/learning-aids/', '').split('/');
    const subjectId = parts[0] || 'mathematics';
    const chapterId = parts[1] || 'real-numbers';

    const aidsData: LearningAidsData = {
      subjectId,
      chapterId,
      chapterName: chapterId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      subjectName: subjectId.charAt(0).toUpperCase() + subjectId.slice(1),
      hasLesson: true,
      stats: { concepts: 6, theorems: 2, examples: 8, exercises: 4 },
      aids: [
        { id: 'formula_sheet', label: 'Formula Sheet', group: 'quickrevise', hasContent: true, data: { formulaCount: 8 } },
        { id: 'concept_maps', label: 'Concept Maps', group: 'visuals', hasContent: true, data: { nodes: 6, edges: 5 } },
        { id: 'mind_maps', label: 'Mind Maps', group: 'visuals', hasContent: true, data: { branches: 3 } },
        { id: 'mcqs', label: 'Multiple Choice Questions', group: 'assessment', hasContent: true, data: { count: 10 } },
        { id: 'science_experiments', label: 'Science Experiments', group: 'activities', hasContent: false, data: null },
      ],
      aidsWithContent: [
        { id: 'formula_sheet', label: 'Formula Sheet', group: 'quickrevise', hasContent: true, data: { formulaCount: 8 } },
        { id: 'concept_maps', label: 'Concept Maps', group: 'visuals', hasContent: true, data: { nodes: 6, edges: 5 } },
        { id: 'mind_maps', label: 'Mind Maps', group: 'visuals', hasContent: true, data: { branches: 3 } },
        { id: 'mcqs', label: 'Multiple Choice Questions', group: 'assessment', hasContent: true, data: { count: 10 } },
      ],
      scienceExperiments: [],
      mcqAnswers: [
        { q: 'HCF of 95 and 152', a: '19' },
      ],
      bibliographyAndEquations: {
        equations: ['HCF(a, b) × LCM(a, b) = a × b', 'x = (-b ± √(b² - 4ac))/(2a)'],
        references: ['NCERT Mathematics Class X', 'CBSE Curriculum Handbook 2026-27'],
      },
      socialStudiesData: null,
      source_references: { ncert: 'NCERT Textbook Class X' },
      web_references: [{ title: 'CBSE Academic', url: 'https://cbseacademic.nic.in' }],
      educational_disclaimer: 'For educational use only under CBSE Class X syllabus guidelines.',
      okf_version: 'OKF-v1',
      board: 'CBSE',
      class: 'X',
      academicYear: '2026-27',
    };

    return { ok: true, ...aidsData } as unknown as T;
  }

  // 28. GET /api/learning-aids/ids
  if (method === 'GET' && pathname === '/api/learning-aids/ids') {
    const aidsIds: LearningAidsIds = {
      aidIds: [
        'formula_sheet',
        'concept_maps',
        'mind_maps',
        'mcqs',
        'assertion_reasoning',
        'case_studies',
        'ncert_solutions',
        'exemplar_problems',
        'previous_year_questions',
        'science_experiments',
      ],
      aidLabels: {
        formula_sheet: 'Formula Sheet & Constants',
        concept_maps: 'Concept Maps & Visual Graphs',
        mind_maps: 'Mind Maps & Structured Outlines',
        mcqs: 'Multiple Choice Questions Bank',
        assertion_reasoning: 'Assertion and Reasoning Problems',
        case_studies: 'Case-Based Integrated Assessments',
        ncert_solutions: 'NCERT In-text & Exercise Solutions',
        exemplar_problems: 'NCERT Exemplar Higher Order Problems',
        previous_year_questions: 'Previous 10-Year Board Questions',
        science_experiments: 'Practical Science Experiments & Labs',
      },
      aidGroups: {
        quickrevise: ['formula_sheet', 'ncert_solutions'],
        visuals: ['concept_maps', 'mind_maps'],
        assessment: ['mcqs', 'assertion_reasoning', 'case_studies'],
        exam_prep: ['exemplar_problems', 'previous_year_questions'],
        activities: ['science_experiments'],
      },
    };
    return { ok: true, ...aidsIds } as unknown as T;
  }

  // 29. GET /api/learning-aids/group/:group
  if (method === 'GET' && pathname.startsWith('/api/learning-aids/group/')) {
    const group = pathname.replace('/api/learning-aids/group/', '');
    const groupMap: Record<string, string[]> = {
      quickrevise: ['formula_sheet', 'ncert_solutions'],
      visuals: ['concept_maps', 'mind_maps'],
      assessment: ['mcqs', 'assertion_reasoning', 'case_studies'],
      exam_prep: ['exemplar_problems', 'previous_year_questions'],
      activities: ['science_experiments'],
    };

    const aids = groupMap[group] || [];
    return { ok: true, group, aids } as unknown as T;
  }

  // Catch-all fallback for any other route
  return { ok: true, message: 'Mock API fallback fulfilled route' } as unknown as T;
}
