export type SubjectId = 'mathematics' | 'science' | 'social-science' | 'english' | string;

export interface ChapterStats {
  concepts: number;
  theorems: number;
  examples: number;
  exercises: number;
  quizzes: number;
  visuals: number;
  misconceptions: number;
  authored: boolean;
}

export interface Chapter {
  id: string;
  name: string;
  number: number;
  order: number;
  unitId: string;
  unitName: string;
  marks: number | null;
  periods: number | null;
  summary: string;
  difficulty: string;
  lessonId: string | null;
  hasContent: boolean;
  isPartial: boolean;
  stats: ChapterStats;
  topics: { id: string; name: string; difficulty: string; periods: number | null }[];
}

export interface Unit {
  id: string;
  name: string;
  section: string;
  marks: number | null;
  periods: number | null;
  topics: { id: string; name: string; difficulty: string; periods: number | null }[];
}

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  accent: string;
  icon: string;
  code: string;
  maxMarks: number;
  internalMarks: number;
  totalPeriods: number;
  description: string;
  units: Unit[];
  chapters: Chapter[];
  coverage: { total: number; authored: number; partial: number; syllabusOnly: number };
}

export interface Curriculum {
  meta: { board: string; class: string; academicYear: string; generatedAt: string; source: string };
  subjects: Subject[];
}

export interface Concept {
  name?: string;
  title?: string;
  explanation?: string;
  key_points?: string[];
  real_life_application?: string;
  purpose?: string;
  day_to_day_usage?: string[];
  video_embed?: string;
}

export interface TheoremExample {
  problem?: string;
  indiandiaspora_context?: string;
  solution_step_by_step?: string[];
  final_answer?: string;
}

export interface Theorem {
  name: string;
  statement?: string;
  proposed_by?: { name?: string; era?: string; location?: string; book?: string; known_as?: string };
  historical_context?: string;
  why_proposed?: string;
  real_world_utility?: string;
  why_students_learn?: string;
  examples?: TheoremExample[];
}

export interface WorkedExample {
  topic?: string;
  title?: string;
  answer?: string;
  solution?: string[];
  board_tip?: string;
  exam_tip?: string;
  problem?: string;
  board_mode?: string[];
  speed_mode?: string;
  competitive_shortcut?: string;
}

export interface ExerciseProblem {
  id?: string;
  question: string;
  solution?: string[];
  final_answer?: string;
  difficulty?: string;
  book_source?: string;
}

export interface ExerciseGroup {
  title?: string;
  objective?: string;
  problems?: ExerciseProblem[];
}

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correct: number;
  explanation?: { correct?: string; wrong_options?: Record<string, string> };
}

export interface ModelPaperQuestion {
  id?: string;
  question: string;
  answer?: string;
  steps?: string[];
  hints?: string[];
}

export interface MindMapBranch {
  concept: string;
  sub_nodes?: string[];
  connections?: string;
}

export interface FlowStep {
  order?: number;
  action?: string;
  decision?: boolean;
  if_yes?: number | string;
  if_no?: number | string;
  next?: number | string;
}

export interface Visualization {
  rendererType: string;
  syllabusSource?: string;
  visualizationProperties: Record<string, unknown>;
}

export interface Misconception {
  misconception?: string;
  correction?: string;
  [key: string]: unknown;
}

export interface Lesson {
  id: string;
  chapter: string;
  title: string;
  chapterId: string;
  subjectId: string;
  subjectName: string;
  unitName: string;
  examWeightage: number | null;
  outcomes?: string[];
  prerequisite_nodes?: string[];
  concepts?: Concept[];
  theorems?: Theorem[];
  worked_examples?: WorkedExample[];
  exercises?: Record<string, ExerciseGroup>;
  quizzes?: Record<string, QuizQuestion[]>;
  model_papers?: Record<string, ModelPaperQuestion[]>;
  vedic_math_shortcuts?: Record<string, unknown>[];
  mind_maps?: { title?: string; root?: string; branches?: MindMapBranch[] };
  concept_maps?: { title?: string; nodes?: { id: string; label: string; group?: string }[]; edges?: [string, string][] };
  flowcharts?: { title?: string; steps?: FlowStep[] }[];
  visualizations?: Visualization[];
  common_misconceptions?: (string | Misconception)[];
  rd_sharma_extensions?: { book?: string; topics?: string[] };
  rs_aggarwal_extensions?: { book?: string; topics?: string[] };
  stats?: ChapterStats;
}

export interface ChapterDetail {
  ok: boolean;
  chapter: Chapter & { subjectName: string; subjectId: string };
  lesson: Lesson | null;
  graph: {
    title?: string;
    nodes: { id: string; label: string; group?: string }[];
    edges: [string, string][];
    source: string;
  };
  related: { subjectId: string; chapterId: string; chapterName: string; title: string; type: string }[];
  available: { practice: boolean; notes: boolean; mock: boolean };
}

export interface SearchResult {
  id: string;
  title: string;
  text: string;
  type: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  anchor: string;
  score: number;
}

export interface Citation {
  chunkId: string;
  title: string;
  chapterId: string;
  subjectId: string;
  chapter: string;
  subject: string;
  type: string;
  anchor: string;
  source: string;
  page: number | null;
}

export interface TutorResponse {
  ok: boolean;
  answer: string;
  sources: Citation[];
  retrieval: {
    query: string;
    expandedTerms: string[];
    strategy: string;
    candidates: number;
    latencyMs: number;
    intent: string[];
    providerError?: string;
  };
  provider?: { mode: string; model: string };
}

export interface PracticeQuestion {
  id: string;
  type: 'mcq' | 'subjective';
  question: string;
  options?: string[];
  marks: number;
  difficulty: string;
  chapterId: string;
  chapterName: string;
  subjectId: string;
  source: string;
}

export interface PracticeSession {
  ok: boolean;
  sessionId: string;
  durationMin: number;
  questions: PracticeQuestion[];
  meta: { count: number; subjectId: string; chapterId: string | null; totalMarks: number };
}

export interface ReviewItem {
  id: string;
  type: string;
  question: string;
  options?: string[];
  selected: number | null;
  correctIndex?: number;
  correct?: boolean;
  awarded?: number;
  marks: number;
  explanation?: string;
  steps?: string[];
  answer?: string;
  hints?: string[];
  chapterName: string;
  source?: string;
}

export interface PracticeResult {
  ok: boolean;
  sessionId: string;
  kind: 'practice' | 'exam';
  score: number;
  total: number;
  percentage: number;
  attempted: number;
  questionCount: number;
  accuracy: number;
  review: ReviewItem[];
}

export interface ExamSection {
  id: string;
  title: string;
  instruction: string;
  marks: number;
  questions: PracticeQuestion[];
}

export interface ExamPaper {
  ok: boolean;
  paperId: string;
  subjectId: string;
  subjectName: string;
  totalMarks: number;
  durationMin: number;
  sectionCount: number;
  sections: ExamSection[];
  instructions: string[];
}

export interface ExamKeyItem {
  id: string;
  section: string;
  question: string;
  marks: number;
  steps?: string[];
  answer?: string;
  hints?: string[];
  source?: string;
}

export interface ExamKey {
  ok: boolean;
  paperId: string;
  subjective: ExamKeyItem[];
}

export interface Progress {
  userId: string;
  xp: number;
  streak: number;
  lastActive: string | null;
  completedChapters: Record<string, { at: string; score?: number }>;
  chapterMinutes: Record<string, number>;
  practice: { attempts: number; correct: number; answered: number };
  exams: { at: string; subjectId: string; score: number; total: number }[];
  recent: { type: string; subjectId?: string; chapterId?: string; title: string; at: string }[];
  planChecks: Record<string, boolean>;
  bookmarks: string[];
  updatedAt: string | null;
  videoProgress?: Record<string, { positionSec: number; durationSec: number; bookmarked: boolean; updatedAt: string }>;
  badges?: { id: string; name: string; xp: number }[];
}

export interface PlanWeek {
  week: number;
  phase: string;
  phaseName: string;
  chapterId: string;
  chapterName: string;
  subjectId: string;
  focus: string;
  minutes: number;
  target: string;
  resource: string;
}

export interface Plan {
  meta?: Record<string, unknown>;
  pedagogy?: Record<string, string>;
  validation?: unknown;
  phases?: Record<string, { name: string; strategy: string; totalTime: string; boardExamWeightage: string }>;
  weeks: PlanWeek[];
}

export interface LibraryData {
  formulas: { id: string; subjectId: string; subjectName: string; chapterId: string; chapterName: string; name: string; statement: string; example: string }[];
  shortcuts: { id: string; subjectId: string; chapterId: string; chapterName: string; name?: string; title?: string; [key: string]: unknown }[];
  flashcards: { id: string; subjectId: string; chapterId: string; chapterName: string; difficulty: string; front: string; back: string; options?: string[]; correct?: number }[];
}

/* ---- SPEC-16 Video lessons ---- */
export interface VideoLesson {
  id: string;
  provider: 'youtube' | 'self';
  videoId: string;
  title: string;
  durationSec: number;
  chapterId: string;
}
export interface VideoCatalog {
  ok: boolean;
  video: VideoLesson;
  chapterId: string;
  subjectId: string;
  gating: { requiredMastery: number };
}
export interface VideoProgress {
  chapterId: string;
  positionSec: number;
  durationSec: number;
  bookmarked: boolean;
  updatedAt: string;
}

/* ---- SPEC-18 Gamification ---- */
export interface Badge {
  id: string;
  name: string;
  xp: number;
}
export interface GamifyXpResult {
  ok: boolean;
  xp: number;
  badges: { id: string; name: string; xp: number }[];
  reason: string;
}
export interface LeaderboardEntry {
  userId: string;
  xp: number;
  streak: number;
  completedChapters: number;
  badges: number;
  lastActive: string;
}

/* ---- SPEC-19 Parent dashboard ---- */
export interface ParentView {
  childUserId: string;
  xp: number;
  streak: number;
  completedChapters: number;
  practice: { attempts: number; correct: number; answered: number };
  exams: { at: string; subjectId: string; score: number; total: number }[];
  badges: { id: string; name: string; xp: number }[];
  recent: { type: string; subjectId?: string; chapterId?: string; title: string; at: string }[];
  lastActive: string | null;
}

/* ---- OKF metadata alignment ---- */
export interface OkfTopic {
  subjectId: string;
  topicId: string;
  topicName: string;
  parentUnit: string;
  difficulty: string;
  estimatedPeriods: number;
  tags: string[];
  okfVersion: string;
  board: string;
  class: string;
  academicYear: string;
}
export interface OkfStats {
  loaded: boolean;
  topicCount: number;
  tagCount: number;
  unitCount: number;
  okfVersion: string;
}
export interface OkfSearchResult extends SearchResult {
  okf?: {
    version: string;
    topic: { id: string; name: string; difficulty: string } | null;
    tags: string[];
    board: string;
    class: string;
    academicYear: string;
  };
}

/* ---- SPEC-17 Adaptive practice ---- */
export interface AdaptivePracticeSession extends PracticeSession {
  adaptive: { difficulty: string; accuracy?: number };
}

/* ---- SPEC-23 Learning Aids ---- */
export interface LearningAid {
  id: string;
  label: string;
  group: string;
  hasContent: boolean;
  data: any;
}
export interface LearningAidsData {
  subjectId: string;
  chapterId: string;
  chapterName: string | null;
  subjectName: string | null;
  hasLesson: boolean;
  stats: any;
  aids: LearningAid[];
  aidsWithContent: LearningAid[];
}
export interface LearningAidsIds {
  aidIds: string[];
  aidLabels: Record<string, string>;
  aidGroups: Record<string, string[]>;
}
export interface LearningAidGroup {
  group: string;
  aids: string[];
}

