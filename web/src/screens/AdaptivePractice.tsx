import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, FileQuestion, Flame, Layers3, Play, RotateCcw, Target, Trophy, Zap, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, ProgressBar, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { PracticeQuestion } from '../types';

const difficultyOptions = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'simple', label: 'Simple' },
  { id: 'medium', label: 'Medium' },
  { id: 'complex', label: 'Complex' },
];

const countOptions = [5, 10, 15, 20];

export default function AdaptivePractice() {
  const { curriculum, progress, recordPractice } = useApp();
  const [params, setParams] = useSearchParams();
  const initialSubject = params.get('subject') || 'mathematics';
  const initialChapter = params.get('chapter') || '';
  const [subjectId, setSubjectId] = useState(initialSubject);
  const [chapterId, setChapterId] = useState(initialChapter);
  const [difficulty, setDifficulty] = useState('simple');
  const [count, setCount] = useState(10);
  const [runKey, setRunKey] = useState(0);
  const [started, setStarted] = useState(Boolean(initialChapter));
  const [session, setSession] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [accuracy, setAccuracy] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState('simple');

  const subject = curriculum?.subjects.find((item) => item.id === subjectId) || curriculum?.subjects[0];
  const chapterOptions = useMemo(() => (subject?.chapters || []).filter((chapter) => chapter.stats.quizzes > 0), [subject]);
  const activeChapter = chapterOptions.find((chapter) => chapter.id === chapterId);

  const chapterAccuracy = useMemo(() => accuracy, [accuracy]);

  useEffect(() => {
    if (!chapterId) return;
    if (chapterOptions.length && !chapterOptions.some((chapter) => chapter.id === chapterId)) {
      setChapterId('');
      setStarted(false);
    }
  }, [chapterId, chapterOptions]);

  const chooseSubject = (id: string) => {
    setSubjectId(id);
    setChapterId('');
    setStarted(false);
    setResult(null);
    setSession(null);
    const next = new URLSearchParams(params);
    next.set('subject', id);
    next.delete('chapter');
    setParams(next, { replace: true });
  };

  const chooseChapter = (id: string) => {
    setChapterId(id);
    setStarted(false);
    setResult(null);
    setSession(null);
    const next = new URLSearchParams(params);
    next.set('subject', subjectId);
    if (id) next.set('chapter', id); else next.delete('chapter');
    setParams(next, { replace: true });
  };

  const launch = async () => {
    setStarted(true);
    setResult(null);
    setAnswers({});
    setSubmitting(false);
    try {
      const payload = await api.adaptivePractice({
        subjectId,
        chapterId,
        count,
        currentDifficulty,
        accuracy: chapterAccuracy / 100,
      });
      setSession(payload);
      setCurrentDifficulty(payload.adaptive?.difficulty || difficulty);
    } catch {
      setStarted(false);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const payload = await api.submitPractice(session.sessionId, answers);
      setResult(payload);
      recordPractice(payload, subjectId);
      setAccuracy(payload.percentage);
      setSubmitting(false);
    } catch {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setResult(null);
    setSession(null);
    setAnswers({});
    setStarted(false);
  };

  if (!started) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Adaptive Practice" description="Difficulty adjusts to your accuracy — Simple → Medium → Complex"/>
        <div className="grid gap-4">
          <div className="card p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="eyebrow">Subject</div>
                <h3 className="text-lg font-semibold">{subject?.name || 'Mathematics'}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {}}>Change</Button>
            </div>
            <div className="space-y-2">
              {chapterOptions.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => chooseChapter(chapter.id)}
                  className={`w-full text-left px-3 py-2 rounded border transition ${chapter.id === chapterId ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-gray-700 hover:border-gray-500'}`}
                >
                  <span>{chapter.name}</span>
                  <span className="ml-auto text-xs text-muted">×{chapter.stats.quizzes} questions</span>
                </button>
              ))}
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <div className="eyebrow">Settings</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted mb-1">Difficulty</label>
                <div className="flex gap-1">
                  {difficultyOptions.map((opt) => (
                    <Button
                      key={opt.id}
                      variant={difficulty === opt.id ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setDifficulty(opt.id)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Questions</label>
                <div className="flex gap-1">
                  {countOptions.map((c) => (
                    <Button key={c} variant={count === c ? 'primary' : 'ghost'} size="sm" onClick={() => setCount(c)}>
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted">Adaptive: correct streaks raise difficulty; misses lower it.</p>
            </div>
            <Button
              onClick={launch}
              disabled={!chapterId || submitting}
              className="w-full btn-lg"
              loading={submitting}
            >
              <Play size={18} className="mr-2" /> Start adaptive set
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const correct = result.correct || 0;
    const attempted = result.attempted || 0;
    const pct = result.percentage || 0;
    const nextDiff = pct >= 80 ? 'complex' : pct >= 60 ? 'medium' : 'simple';
    return (
      <div className="space-y-4">
        <SectionHeader title="Practice complete" description="Review your results and adaptive placement"/>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Score" value={`${correct} / ${attempted}`} icon={<CheckCircle2 size={20} className="text-mint-400"/>}/>
          <Stat label="Accuracy" value={`${pct}%`} icon={<TrendingUp size={20} className="text-amber-400"/>}/>
          <Stat label="Next level" value={nextDiff.charAt(0).toUpperCase() + nextDiff.slice(1)} icon={<Zap size={20} className="text-indigo-400"/>}/>
        </div>
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Adaptive placement</span>
              <Badge tone="indigo">{nextDiff}</Badge>
            </div>
            <ProgressBar value={pct} tone={pct >= 70 ? 'mint' : pct >= 40 ? 'saffron' : 'rose'} />
            <p className="text-sm text-muted">
              {pct >= 80 ? 'Strong mastery — next set moves to Complex.' : pct >= 60 ? 'Steady progress — Medium difficulty ahead.' : 'Review the concepts — next set stays Simple.'}
            </p>
          </div>
        </Card>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={restart}>Review wrong answers</Button>
          <Button onClick={launch}>Next adaptive set</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title={`Adaptive set · ${session?.meta?.count || count} questions`} description={`Difficulty: ${currentDifficulty.toUpperCase()} · Chapter: ${activeChapter?.name || ''}`}/>
      <div className="grid gap-4">
        {session?.questions.map((q: PracticeQuestion, i: number) => (
          <Card key={q.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-muted">Question {i + 1}</span>
              <Badge tone="neutral">{q.difficulty}</Badge>
            </div>
            <p className="text-lg font-semibold mb-3">{q.question}</p>
            {q.type === 'mcq' && q.options && (
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                      className={`w-full text-left px-3 py-2 rounded border transition ${selected ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-gray-700 hover:border-gray-500'}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            {q.type === 'subjective' && (
              <div className="pt-2">
                <p className="text-xs text-muted mb-1">Type your answer (open-ended):</p>
                <textarea
                  className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  placeholder="Write your answer…"
                  onChange={(e) => setAnswers({ ...answers, [q.id]: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </Card>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={restart}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length < session.questions.length} loading={submitting}>
          Submit set
        </Button>
      </div>
    </div>
  );
}
