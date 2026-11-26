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
  advanced_extensions?: { book?: string; topics?: string[] };
  competitive_bridge_extensions?: { book?: string; topics?: string[] };
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
  source?: string;
  page?: number | null;
  pdfPage?: number | null;
  book?: string | null;
  docId?: string;
  sectionPath?: string[];
  chunkIndex?: number;
  checksum?: string;
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
  pdfPage?: number | null;
  book?: string | null;
  docId?: string;
  sectionPath?: string[];
  chunkIndex?: number;
  checksum?: string;
}

export type IntentMode = 'BOARD_EXAM' | 'COMPETITIVE_BRIDGE';

export interface OKFFilters {
  subject: string;
  chapter_id: string;
  topic_tag: string;
  content_block_type: string;
  source_type: string;
}

export interface QueryAnalysis {
  intent_mode: IntentMode;
  target_exam?: string;
  okf_filters: OKFFilters;
  bm25_keywords: string[];
  hyde_passage: string;
  is_valid?: boolean;
}

export interface LayeredAnswer {
  coreIntuition: string;
  boardAnswer: string;
  competitiveBridge: string;
  examinersTrap: string;
}

export interface VisualAidVideo {
  video_id: string;
  start_sec: number;
  end_sec: number;
  concept_title: string;
  observation_cue: string;
}

export interface PipelineStage {
  node: string;
  status: 'pending' | 'running' | 'completed' | 'rewrite' | 'failed' | string;
  output?: string;
  error?: string;
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
    engine?: string;
    providerError?: string;
  };
  provider?: { mode: string; model: string };
  intentMode?: IntentMode;
  analysis?: QueryAnalysis;
  graderVerdict?: 'PASS' | 'REWRITE_QUERY';
  answerLayers?: LayeredAnswer | null;
  visualAidVideo?: VisualAidVideo | null;
  pipelineStages?: PipelineStage[];
  persona?: { role: string; exam: string; depth: string; ageBand?: string | null };
  answerPlan?: Record<string, unknown>;
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
  channel?: string;
  safe?: boolean;
  verified?: boolean;
  verifiedAt?: string | null;
  rating?: number | null;
  summary?: string;
  validityScore?: number;
  url?: string;
}
export interface VideoCatalog {
  ok: boolean;
  video: VideoLesson;
  videos?: VideoLesson[];
  chapterId: string;
  subjectId: string;
  gating: { requiredMastery: number };
  validation?: {
    provider: string;
    method: string;
    generatedAt: string;
    verified: boolean;
    safetyFilter: string;
  } | null;
  hub?: KnowledgeHub;
}

export interface YouTubePlayerConfig {
  ok: boolean;
  educationEnabled: boolean;
  educationBase: string | null;
  educationToken: string | null;
  origin: string | null;
}

export interface YouTubeValidation {
  ok: boolean;
  videoId: string;
  validated: boolean;
  reason: string | null;
  verifiedBy?: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string | null;
  embeddable?: boolean;
  publicVideo?: boolean;
  ageRestricted?: boolean;
  regionBlocked?: boolean;
  regionCode?: string;
}

export interface YouTubeSearchItem {
  videoId: string;
  title: string;
  channel: string;
  publishedAt: string | null;
  thumbnail: string | null;
  duration: string | null;
}

export interface HubConcept {
  name: string;
  purpose: string;
  realLife: string;
}

export interface HubVisual {
  title: string;
  type: string;
  description?: string;
}

export interface HubWorkedExample {
  title: string;
  problem: string;
  steps: string[];
  shortcut: string;
}

export interface HubQuickCheck {
  level?: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface KnowledgeHub {
  title: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  unitName: string;
  marks: number;
  periods: number;
  difficulty: string;
  summary: string;
  examWeightage: number;
  topics: string[];
  understand: {
    outcomes: string[];
    concepts: HubConcept[];
  };
  visualize: {
    items: HubVisual[];
    mindMap: { title: string; branches: string[] } | null;
    flowcharts: string[];
  };
  remember: {
    keyPoints: string[];
    theorems: { name: string; statement: string }[];
    misconceptions: string[];
    shortcuts: { title: string; concept: string; application: string }[];
  };
  revise: {
    quickCheck: HubQuickCheck[];
    revisionPlan: string[];
    questionBank: { total: number; mcq: number; subjective: number };
  };
  apply: {
    workedExamples: HubWorkedExample[];
    tips: string[];
    practice: { subjectId: string; chapterId: string; suggestedCount: number };
  };
  connect: {
    academics: string[];
    competitive: string[];
    realLife: string[];
    indianContext: string[];
    careers: string[];
  };
  sources: { title: string; url: string; type: string }[];
  videos: VideoLesson[];
  video: VideoLesson | null;
  videoValidation: VideoCatalog['validation'];
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
  scienceExperiments: any[];
  mcqAnswers: any[];
  bibliographyAndEquations: any;
  socialStudiesData: any;
  // OKF metadata alignment
  source_references: any;
  web_references: any;
  educational_disclaimer: string;
  okf_version: string;
  board: string;
  class: string;
  academicYear: string;
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

