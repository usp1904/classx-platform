import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, FileQuestion, Flame, Layers3, Play, RotateCcw, Target, Trophy, Zap } from 'lucide-react';
import { Badge, Button, Card, ProgressBar, SectionHeader, Segmented, Stat } from '../components/ui';
import { PracticeRunner } from '../components/PracticeRunner';
import { useApp } from '../lib/store';

const difficultyOptions = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const countOptions = [5, 10, 15, 20];

export default function Practice() {
  const { curriculum, progress, recordPractice } = useApp();
  const [params, setParams] = useSearchParams();
  const initialSubject = params.get('subject') || 'mathematics';
  const initialChapter = params.get('chapter') || '';
  const [subjectId, setSubjectId] = useState(initialSubject);
  const [chapterId, setChapterId] = useState(initialChapter);
  const [difficulty, setDifficulty] = useState('mixed');
  const [count, setCount] = useState(10);
  const [runKey, setRunKey] = useState(0);
  const [started, setStarted] = useState(Boolean(initialChapter));
  const [last, setLast] = useState<{ percentage: number; score: number; total: number } | null>(null);

  const subject = curriculum?.subjects.find((item) => item.id === subjectId) || curriculum?.subjects[0];
  const chapterOptions = useMemo(() => (subject?.chapters || []).filter((chapter) => chapter.stats.quizzes > 0), [subject]);
  const activeChapter = chapterOptions.find((chapter) => chapter.id === chapterId);
  const totalMcqs = subject?.chapters.reduce((sum, chapter) => sum + chapter.stats.quizzes, 0) || 0;
  const accuracy = progress.practice.answered ? Math.round((progress.practice.correct / progress.practice.answered) * 100) : 0;

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
    setLast(null);
    const next = new URLSearchParams(params);
    next.set('subject', id);
    next.delete('chapter');
    setParams(next, { replace: true });
  };

  const chooseChapter = (id: string) => {
    setChapterId(id);
    setStarted(false);
    const next = new URLSearchParams(params);
    next.set('subject', subjectId);
    if (id) next.set('chapter', id); else next.delete('chapter');
    setParams(next, { replace: true });
  };

  const launch = () => {
    setStarted(true);
    setRunKey((value) => value + 1);
    setLast(null);
  };

  return (
    <div className="page practice-page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Target size={14} /> Practice studio</div>
          <h1>Turn reading into recall.</h1>
          <p>Short, grounded sets with instant explanations. Pick one chapter or run a mixed subject drill.</p>
        </div>
        <div className="head-metrics">
          <div><strong>{progress.practice.attempts}</strong><small>sets attempted</small></div>
          <div><strong>{progress.practice.answered}</strong><small>questions solved</small></div>
          <div><strong>{accuracy}%</strong><small>lifetime accuracy</small></div>
        </div>
      </div>

      <div className="stat-grid four">
        <Stat icon={<Zap size={18} />} label="XP earned" value={progress.xp} hint="Practice adds XP per correct mark" tone="indigo" />
        <Stat icon={<Flame size={18} />} label="Current streak" value={`${progress.streak} ${progress.streak === 1 ? 'day' : 'days'}`} hint="Consistency beats intensity" tone="saffron" />
        <Stat icon={<Target size={18} />} label="Accuracy" value={`${accuracy}%`} hint="Across all practice sets" tone="mint" />
        <Stat icon={<Trophy size={18} />} label="Grounded MCQs" value={totalMcqs} hint={`${chapterOptions.length} chapters ready`} tone="rose" />
      </div>

      <div className="practice-layout">
        <section className="practice-main">
          <Card className="practice-config">
            <SectionHeader eyebrow="1 · Choose scope" title="Subject" />
            <div className="practice-subject-grid">
              {curriculum?.subjects.map((item) => (
                <button key={item.id} className={`practice-subject ${item.id === subjectId ? 'active' : ''}`} onClick={() => chooseSubject(item.id)}>
                  <span className={`subject-dot accent-${item.accent}`} />
                  <span>
                    <strong>{item.shortName}</strong>
                    <small>{item.chapters.reduce((sum, chapter) => sum + chapter.stats.quizzes, 0)} MCQs</small>
                  </span>
                  {item.id === subjectId && <CheckCircle2 size={17} />}
                </button>
              ))}
            </div>

            <SectionHeader eyebrow="2 · Choose chapter" title="Focus" />
            <div className="select-wrap">
              <select value={chapterId} onChange={(event) => chooseChapter(event.target.value)} aria-label="Practice chapter">
                <option value="">Mixed · all ready chapters</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.number}. {chapter.name} · {chapter.stats.quizzes} MCQs</option>
                ))}
              </select>
            </div>
            {!chapterOptions.length && <p className="form-note">No authored MCQ bank for this subject yet. Mathematics is fully populated; other subjects expose the official syllabus.</p>}

            <div className="config-split">
              <div>
                <SectionHeader eyebrow="3 · Difficulty" title="Level" />
                <Segmented items={difficultyOptions} value={difficulty} onChange={setDifficulty} ariaLabel="Difficulty" />
              </div>
              <div>
                <SectionHeader eyebrow="4 · Length" title="Questions" />
                <div className="count-pills">
                  {countOptions.map((value) => <button key={value} className={count === value ? 'active' : ''} onClick={() => setCount(value)}>{value}</button>)}
                </div>
              </div>
            </div>

            <div className="practice-launch">
              <div>
                <strong>{activeChapter ? activeChapter.name : `${subject?.shortName || 'Subject'} mixed drill`}</strong>
                <small>{Math.min(count, activeChapter?.stats.quizzes || totalMcqs)} questions · {difficulty === 'mixed' ? 'mixed difficulty' : difficulty} · no negative marking</small>
              </div>
              <Button icon={<Play size={16} />} onClick={launch}>Start practice</Button>
            </div>
          </Card>

          {started && (
            <div className="practice-runner-wrap" key={runKey}>
              <PracticeRunner
                subjectId={subjectId}
                chapterId={chapterId || undefined}
                count={count}
                difficulty={difficulty === 'mixed' ? undefined : difficulty}
                onComplete={(result) => {
                  recordPractice(result, subjectId);
                  setLast({ percentage: result.percentage, score: result.score, total: result.total });
                }}
              />
            </div>
          )}

          {last && !started && (
            <Card className="last-result">
              <div><strong>Last set: {last.percentage}%</strong><small>{last.score}/{last.total} marks</small></div>
              <div className="last-result-bar"><ProgressBar value={last.percentage} tone={last.percentage >= 70 ? 'mint' : 'saffron'} /></div>
              <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={launch}>Another set</Button>
            </Card>
          )}
        </section>

        <aside className="practice-rail">
          <Card className="practice-tip">
            <div className="eyebrow"><Clock3 size={14} /> The 20-minute loop</div>
            <h3>Read → Example → 10 MCQs</h3>
            <p>Retrieval, not re-reading, is what moves answers into long-term memory. Keep sets short enough to finish in one sitting.</p>
            <div className="loop-list">
              <div><span>1</span><p>Skim the concept and the worked example.</p></div>
              <div><span>2</span><p>Close the notes. Attempt the set without hints.</p></div>
              <div><span>3</span><p>Read every explanation, including the ones you got right.</p></div>
            </div>
          </Card>

          <Card className="practice-tip">
            <div className="eyebrow"><Layers3 size={14} /> Ready banks</div>
            <div className="bank-list">
              {chapterOptions.slice(0, 8).map((chapter) => (
                <button key={chapter.id} onClick={() => { chooseChapter(chapter.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <span>{chapter.name}</span>
                  <Badge tone="neutral">{chapter.stats.quizzes}</Badge>
                </button>
              ))}
              {!chapterOptions.length && <p className="muted">No authored bank in this subject.</p>}
            </div>
            {chapterOptions.length > 8 && <p className="muted">+{chapterOptions.length - 8} more chapters in the selector.</p>}
          </Card>

          <Card className="practice-tip accuracy-card">
            <FileQuestion size={20} />
            <h3>{accuracy >= 70 ? 'Add timed pressure' : 'Accuracy before speed'}</h3>
            <p>{accuracy >= 70 ? 'Use 5-question timed sets with mixed difficulty to simulate board pacing.' : 'Stay untimed until you cross 70%. Then shorten the clock, not the reasoning.'}</p>
            <button className="link-arrow" onClick={() => { document.querySelector('.practice-config')?.scrollIntoView({ behavior: 'smooth' }); }}>Configure a set <ArrowRight size={14} /></button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
