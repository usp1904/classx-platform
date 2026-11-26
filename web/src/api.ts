import type {
  AdaptivePracticeSession,
  Badge,
  ChapterDetail,
  Curriculum,
  ExamPaper,
  ExamKey,
  GamifyXpResult,
  IntentMode,
  LeaderboardEntry,
  LearningAid,
  LearningAidsData,
  LearningAidsIds,
  LibraryData,
  OkfSearchResult,
  OkfStats,
  OkfTopic,
  ParentView,
  Plan,
  PracticeResult,
  PracticeSession,
  Progress,
  SearchResult,
  TutorResponse,
  VideoCatalog,
  YouTubePlayerConfig,
  YouTubeSearchItem,
  YouTubeValidation,
} from './types';
import { handleMockRequest, isMockMode, setMockMode } from './services/mockApi.ts';
import { normalizeAcademicPayload } from './lib/sanitize.ts';

export { isMockMode, setMockMode, handleMockRequest };

function engageAutoMock() {
  if (typeof window !== 'undefined') {
    (window as unknown as { __classx_auto_mock?: boolean }).__classx_auto_mock = true;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('classx_mock_mode', 'true');
    }
  } catch {
    // Ignore storage issues
  }
}

const json = async <T>(url: string, init?: RequestInit): Promise<T> => {
  // Explicit or active mock mode: dispatch straight to client-side mock service
  if (isMockMode()) {
    return normalizeAcademicPayload(await handleMockRequest<T>(url, init));
  }

  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    });

    const contentType = response.headers.get('content-type') || '';

    // Check for SPA HTML catch-all (GitHub Pages / Cloudflare 404 returning index.html)
    if (contentType.includes('text/html') || response.status === 404) {
      engageAutoMock();
      return normalizeAcademicPayload(await handleMockRequest<T>(url, init));
    }

    const payload = await response.json().catch(() => null);

    // Check for service-worker offline response { ok: false, error: 'offline' } or non-OK response
    if (!response.ok || (payload && payload.ok === false && payload.error === 'offline')) {
      engageAutoMock();
      return normalizeAcademicPayload(await handleMockRequest<T>(url, init));
    }

    return normalizeAcademicPayload(payload as T);
  } catch (_networkError) {
    // Network failure, CORS issue, or server offline -> fallback to mock without crashing
    engageAutoMock();
    return normalizeAcademicPayload(await handleMockRequest<T>(url, init));
  }
};

export const api = {
  health: () => json<{ ok: boolean; curriculum: Record<string, number>; rag: Record<string, number> }>('/api/health'),
  curriculum: () => json<{ ok: boolean; meta: Curriculum['meta']; subjects: Curriculum['subjects'] }>('/api/curriculum'),
  chapter: (subjectId: string, chapterId: string) => json<ChapterDetail>(`/api/chapters/${subjectId}/${chapterId}`),
  search: (q: string, subjectId?: string, limit = 8) =>
    json<{ ok: boolean; results: SearchResult[]; diagnostics: { latencyMs: number; strategy: string } }>(
      `/api/search?q=${encodeURIComponent(q)}${subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : ''}&limit=${limit}`,
    ),
  tutor: (body: { question: string; mode: string; subjectId?: string; chapterId?: string; intentMode?: IntentMode; persona?: { role?: string; exam?: string; depth?: string; ageBand?: string }; history?: { role: string; content: string }[] }) =>
    json<TutorResponse>('/api/tutor', { method: 'POST', body: JSON.stringify(body) }),
  ragAnalyze: (body: { question: string; mode?: string; subjectId?: string; chapterId?: string; intentMode?: IntentMode; persona?: { role?: string; exam?: string; depth?: string; ageBand?: string }; history?: { role: string; content: string }[] }) =>
    json<TutorResponse>('/api/rag/analyze', { method: 'POST', body: JSON.stringify(body) }),
  startPractice: (body: { subjectId: string; chapterId?: string; count?: number; difficulty?: string }) =>
    json<PracticeSession>('/api/practice/start', { method: 'POST', body: JSON.stringify(body) }),
  submitPractice: (sessionId: string, answers: Record<string, number>) =>
    json<PracticeResult>('/api/practice/submit', { method: 'POST', body: JSON.stringify({ sessionId, answers }) }),
  generateExam: (body: { subjectId: string; chapterIds?: string[]; counts?: { mcq: number; short: number; long: number } }) =>
    json<ExamPaper>('/api/exam/generate', { method: 'POST', body: JSON.stringify(body) }),
  submitExam: (paperId: string, answers: Record<string, number>, subjectiveMarks: Record<string, number>) =>
    json<PracticeResult>('/api/exam/submit', { method: 'POST', body: JSON.stringify({ paperId, answers, subjectiveMarks }) }),
  examKey: (paperId: string) => json<ExamKey>(`/api/exam/${paperId}/key`),
  plan: () => json<{ ok: boolean; plan: Plan }>('/api/plan'),
  library: () => json<{ ok: boolean } & LibraryData>('/api/library'),
  progress: (userId = 'guest') => json<{ ok: boolean; progress: Progress }>(`/api/progress?userId=${userId}`),
  saveProgress: (progress: Progress) => json<{ ok: boolean; progress: Progress }>('/api/progress', { method: 'PUT', body: JSON.stringify(progress) }),
  video: (subjectId: string, chapterId: string) =>
    json<VideoCatalog>(`/api/video/${subjectId}/${chapterId}`),
  knowledgeHub: (subjectId: string, chapterId: string) =>
    json<{ ok: boolean; hub: NonNullable<VideoCatalog['hub']>; videos: VideoCatalog['videos']; video: VideoCatalog['video']; validation: VideoCatalog['validation'] }>(`/api/knowledge-hub/${subjectId}/${chapterId}`),
  saveVideoProgress: (body: { userId: string; chapterId: string; positionSec: number; durationSec: number; bookmarked: boolean }) =>
    json<{ ok: boolean; saved: boolean }>('/api/video/progress', { method: 'POST', body: JSON.stringify(body) }),
  gamifyBadges: () => json<{ ok: boolean; badges: Badge[] }>('/api/gamify/badges'),
  gamifyLeaderboard: (limit = 20) =>
    json<{ ok: boolean; leaderboard: LeaderboardEntry[] }>(`/api/gamify/leaderboard?limit=${limit}`),
  gamifyXp: (body: { userId?: string; amount: number; reason?: string }) =>
    json<GamifyXpResult>('/api/gamify/xp', { method: 'POST', body: JSON.stringify(body) }),
  parentView: (childUserId: string) => json<{ ok: boolean; parent: ParentView }>(`/api/parent/${childUserId}`),
  parentLink: (childUserId: string) =>
    json<{ ok: boolean; linked: boolean; childUserId: string; linkedAt: string }>('/api/parent/link', { method: 'POST', body: JSON.stringify({ childUserId }) }),
  graph: (subjectId: string, chapterId: string) =>
    json<{ ok: boolean; graph: { nodes: { id: string; label: string; group?: string }[]; edges: [string, string][]; title?: string; source?: string } }>(`/api/graph/${subjectId}/${chapterId}`),
  adaptivePractice: (body: { subjectId?: string; chapterId?: string; count?: number; currentDifficulty?: string; accuracy?: number }) =>
    json<AdaptivePracticeSession>('/api/practice/adaptive', { method: 'POST', body: JSON.stringify(body) }),
  okfStats: () => json<{ ok: boolean } & OkfStats>('/api/okf/stats'),
  okfTopics: (tags?: string) => json<{ ok: boolean; okfVersion: string; topics: OkfTopic[] }>(`/api/okf/topics${tags ? `?tags=${encodeURIComponent(tags)}` : ''}`),
  multimodelSearch: (q: string, opts?: { subjectId?: string; chapterId?: string; limit?: number; difficulty?: string; tags?: string }) =>
    json<{ ok: boolean; query: string; results: OkfSearchResult[]; diagnostics: any }>(
      `/api/search/multimodel?q=${encodeURIComponent(q)}&limit=${opts?.limit || 10}${opts?.subjectId ? `&subjectId=${encodeURIComponent(opts.subjectId)}` : ''}${opts?.chapterId ? `&chapterId=${encodeURIComponent(opts.chapterId)}` : ''}${opts?.difficulty ? `&difficulty=${encodeURIComponent(opts.difficulty)}` : ''}${opts?.tags ? `&tags=${encodeURIComponent(opts.tags)}` : ''}`,
    ),
  learningAids: (subjectId: string, chapterId: string) =>
    json<{ ok: boolean } & LearningAidsData>(`/api/learning-aids/${subjectId}/${chapterId}`),
  learningAidsIds: () => json<{ ok: boolean } & LearningAidsIds>('/api/learning-aids/ids'),
  learningAidsGroup: (group: string) => json<{ ok: boolean; group: string; aids: string[] }>(`/api/learning-aids/group/${group}`),
  youtubeConfig: () => json<YouTubePlayerConfig>('/api/youtube/player-config'),
  youtubeValidate: (videoId: string) => json<YouTubeValidation>(`/api/youtube/validate/${encodeURIComponent(videoId)}`),
  youtubeSearch: (q: string, limit = 12) =>
    json<{ ok: boolean; items: YouTubeSearchItem[]; reason: string | null; source?: string }>(`/api/youtube/search?q=${encodeURIComponent(q)}&limit=${limit}`),
};
