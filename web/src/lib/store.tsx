import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { Curriculum, Plan, PracticeResult, Progress, Subject } from '../types';

const STORAGE_KEY = 'peak.classx.progress.v1';

const emptyProgress = (): Progress => ({
  userId: 'guest',
  xp: 0,
  streak: 1,
  lastActive: null,
  completedChapters: {},
  chapterMinutes: {},
  practice: { attempts: 0, correct: 0, answered: 0 },
  exams: [],
  recent: [],
  planChecks: {},
  bookmarks: [],
  updatedAt: null,
});

function loadLocal(): Progress {
  try {
    return { ...emptyProgress(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return emptyProgress();
  }
}

const chapterKey = (subjectId: string, chapterId: string) => `${subjectId}:${chapterId}`;
const today = () => new Date().toISOString().slice(0, 10);

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'error';
}

interface AppContextValue {
  curriculum: Curriculum | null;
  plan: Plan | null;
  loading: boolean;
  error: string | null;
  progress: Progress;
  toasts: Toast[];
  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  subjectById: (id: string) => Subject | undefined;
  isChapterComplete: (subjectId: string, chapterId: string) => boolean;
  completeChapter: (subjectId: string, chapterId: string, score?: number) => void;
  recordPractice: (result: PracticeResult, subjectId: string) => void;
  recordExam: (result: PracticeResult, subjectId: string) => void;
  togglePlan: (key: string) => void;
  toggleBookmark: (key: string) => void;
  addMinutes: (subjectId: string, chapterId: string, minutes: number) => void;
  addXp: (amount: number, reason?: string) => void;
  resetProgress: () => void;
  reload: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadLocal());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const hydrated = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const toastId = useRef(0);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3800);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [curriculumResult, planResult, progressResult] = await Promise.allSettled([api.curriculum(), api.plan(), api.progress()]);
      if (curriculumResult.status === 'fulfilled') {
        setCurriculum({ meta: curriculumResult.value.meta, subjects: curriculumResult.value.subjects });
      } else {
        throw curriculumResult.reason;
      }
      if (planResult.status === 'fulfilled') setPlan(planResult.value.plan);
      if (progressResult.status === 'fulfilled') {
        const local = loadLocal();
        const remote = progressResult.value.progress;
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        setProgress(remoteTime > localTime ? remote : local);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load curriculum');
    } finally {
      hydrated.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hydrated.current) return;
    const stamped = { ...progress, updatedAt: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    } catch {
      // Storage may be blocked; API persistence still works.
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void api.saveProgress(stamped).catch(() => undefined);
    }, 900);
  }, [progress]);

  const touch = useCallback((current: Progress) => {
    const day = today();
    const last = current.lastActive?.slice(0, 10);
    let streak = current.streak || 1;
    if (last && last !== day) {
      const diff = (new Date(day).getTime() - new Date(last).getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
    }
    return { ...current, streak, lastActive: new Date().toISOString() };
  }, []);

  const completeChapter = useCallback(
    (subjectId: string, chapterId: string, score?: number) => {
      setProgress((current) => {
        const key = chapterKey(subjectId, chapterId);
        if (current.completedChapters[key]) return current;
        const next = touch(current);
        return {
          ...next,
          xp: next.xp + 40,
          completedChapters: { ...next.completedChapters, [key]: { at: new Date().toISOString(), score } },
          recent: [{ type: 'chapter', subjectId, chapterId, title: 'Completed a chapter', at: new Date().toISOString() }, ...next.recent].slice(0, 20),
        };
      });
      notify('Chapter marked complete · +40 XP', 'success');
    },
    [notify, touch],
  );

  const recordPractice = useCallback(
    (result: PracticeResult, subjectId: string) => {
      setProgress((current) => {
        const next = touch(current);
        const answered = next.practice.answered + result.attempted;
        const correct = next.practice.correct + Math.round((result.accuracy / 100) * Math.max(result.attempted, 1));
        return {
          ...next,
          xp: next.xp + Math.max(5, Math.round(result.score * 4)),
          practice: { attempts: next.practice.attempts + 1, answered, correct },
          recent: [{ type: 'practice', subjectId, title: `Practice set · ${result.percentage}%`, at: new Date().toISOString() }, ...next.recent].slice(0, 20),
        };
      });
    },
    [touch],
  );

  const recordExam = useCallback(
    (result: PracticeResult, subjectId: string) => {
      setProgress((current) => {
        const next = touch(current);
        return {
          ...next,
          xp: next.xp + Math.max(20, Math.round(result.score * 5)),
          exams: [{ at: new Date().toISOString(), subjectId, score: result.score, total: result.total }, ...next.exams].slice(0, 20),
          recent: [{ type: 'exam', subjectId, title: `Mock test · ${result.percentage}%`, at: new Date().toISOString() }, ...next.recent].slice(0, 20),
        };
      });
    },
    [touch],
  );

  const addXp = useCallback((amount: number, reason = 'activity') => {
    setProgress((current) => {
      const next = touch(current);
      return { ...next, xp: next.xp + amount };
    });
    void api.gamifyXp({ userId: 'guest', amount, reason }).catch(() => undefined);
    notify(`+${amount} XP`, 'success');
  }, [notify, touch]);

  const togglePlan = useCallback((key: string) => {
    setProgress((current) => ({ ...current, planChecks: { ...current.planChecks, [key]: !current.planChecks[key] } }));
  }, []);

  const toggleBookmark = useCallback((key: string) => {
    setProgress((current) => {
      const exists = current.bookmarks.includes(key);
      return { ...current, bookmarks: exists ? current.bookmarks.filter((b) => b !== key) : [...current.bookmarks, key] };
    });
  }, []);

  const addMinutes = useCallback((subjectId: string, chapterId: string, minutes: number) => {
    setProgress((current) => {
      const key = chapterKey(subjectId, chapterId);
      return { ...current, chapterMinutes: { ...current.chapterMinutes, [key]: (current.chapterMinutes[key] || 0) + Math.max(1, Math.round(minutes)) } };
    });
  }, []);

  const resetProgress = useCallback(() => {
    const next = emptyProgress();
    setProgress(next);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
    notify('Progress reset for this browser', 'info');
  }, [notify]);

  const value = useMemo<AppContextValue>(
    () => ({
      curriculum,
      plan,
      loading,
      error,
      progress,
      toasts,
      notify,
      dismissToast,
      subjectById: (id: string) => curriculum?.subjects.find((s) => s.id === id),
      isChapterComplete: (subjectId: string, chapterId: string) => Boolean(progress.completedChapters[chapterKey(subjectId, chapterId)]),
      completeChapter,
      recordPractice,
      recordExam,
      togglePlan,
      toggleBookmark,
      addMinutes,
      addXp,
      resetProgress,
      reload: load,
    }),
    [curriculum, plan, loading, error, progress, toasts, notify, dismissToast, completeChapter, recordPractice, recordExam, togglePlan, toggleBookmark, addMinutes, addXp, resetProgress, load],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppDataProvider');
  return context;
}

export const keys = { chapter: chapterKey };
