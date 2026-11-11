import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bookmark,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  Clock3,
  Flame,
  RotateCcw,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Badge, Button, Card, ProgressBar, ProgressRing, SectionHeader, Stat } from '../components/ui';

export default function ProgressPage() {
  const { curriculum, progress, resetProgress, toggleBookmark } = useApp();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const subjects = useMemo(() => (curriculum?.subjects || []).map((subject) => {
    const authored = subject.chapters.filter((chapter) => chapter.hasContent);
    const completed = authored.filter((chapter) => progress.completedChapters[`${subject.id}:${chapter.id}`]);
    return {
      ...subject,
      authoredCount: authored.length,
      completedCount: completed.length,
      pct: authored.length ? Math.round((completed.length / authored.length) * 100) : 0,
    };
  }), [curriculum, progress.completedChapters]);

  const completedEntries = useMemo(() => Object.entries(progress.completedChapters).map(([key, value]) => {
    const [subjectId, chapterId] = key.split(':');
    const subject = curriculum?.subjects.find((item) => item.id === subjectId);
    const chapter = subject?.chapters.find((item) => item.id === chapterId);
    return { key, subjectId, chapterId, at: value.at, subject, chapter };
  }).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()), [curriculum, progress.completedChapters]);

  const minutes = useMemo(() => Object.entries(progress.chapterMinutes).map(([key, value]) => {
    const [subjectId, chapterId] = key.split(':');
    const subject = curriculum?.subjects.find((item) => item.id === subjectId);
    const chapter = subject?.chapters.find((item) => item.id === chapterId);
    return { key, subjectId, chapterId, minutes: value, chapter };
  }).sort((a, b) => b.minutes - a.minutes), [curriculum, progress.chapterMinutes]);

  const accuracy = progress.practice.answered ? Math.round((progress.practice.correct / progress.practice.answered) * 100) : 0;
  const totalMinutes = Object.values(progress.chapterMinutes).reduce((sum, value) => sum + value, 0);
  const authoredTotal = subjects.reduce((sum, subject) => sum + subject.authoredCount, 0);
  const examAverage = progress.exams.length ? Math.round(progress.exams.reduce((sum, exam) => sum + (exam.score / exam.total) * 100, 0) / progress.exams.length) : 0;
  const level = Math.floor(progress.xp / 200) + 1;
  const bookmarks = progress.bookmarks.map((key) => {
    const [subjectId, chapterId] = key.split(':');
    const subject = curriculum?.subjects.find((item) => item.id === subjectId);
    return { key, subjectId, chapterId, subject, chapter: subject?.chapters.find((item) => item.id === chapterId) };
  });

  return (
    <div className="page progress-page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><ChartNoAxesColumnIncreasing size={14} /> Learning record</div>
          <h1>Evidence, not vibes.</h1>
          <p>Every completed chapter, practiced question, and mock paper in one honest view.</p>
        </div>
        <div className="level-badge">
          <span>Level {level}</span>
          <small>{progress.xp} XP</small>
          <ProgressBar value={(progress.xp % 200) / 2} height={5} />
        </div>
      </div>

      <div className="stat-grid four">
        <Stat icon={<Zap size={18} />} label="Total XP" value={progress.xp} hint={`Level ${level}`} tone="indigo" />
        <Stat icon={<Flame size={18} />} label="Streak" value={`${progress.streak} days`} hint={progress.lastActive ? `Last active ${new Date(progress.lastActive).toLocaleDateString('en-IN')}` : 'Start today'} tone="saffron" />
        <Stat icon={<Target size={18} />} label="Practice accuracy" value={`${accuracy}%`} hint={`${progress.practice.answered} attempted`} tone="mint" />
        <Stat icon={<Clock3 size={18} />} label="Study time" value={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`} hint="Tracked in chapter reader" tone="rose" />
      </div>

      <div className="progress-layout">
        <section className="progress-main">
          <Card>
            <SectionHeader eyebrow="Subject mastery" title="Coverage by course" description="Only authored chapters count toward mastery. Syllabus-only chapters are mapped separately." />
            <div className="mastery-list">
              {subjects.map((subject) => (
                <div key={subject.id} className="mastery-row">
                  <span className={`subject-dot accent-${subject.accent}`} />
                  <div className="mastery-copy">
                    <div><strong>{subject.name}</strong><small>{subject.completedCount} of {subject.authoredCount} authored chapters · {subject.coverage.syllabusOnly} syllabus maps</small></div>
                    <ProgressBar value={subject.pct} tone={subject.accent as 'indigo' | 'mint' | 'saffron' | 'rose'} height={7} />
                  </div>
                  <strong className="mastery-pct">{subject.pct}%</strong>
                  <button className="icon-btn ghost" onClick={() => navigate(`/courses?subject=${subject.id}`)} aria-label={`Open ${subject.name}`}><ArrowRight size={16} /></button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Mock performance" title="Paper history" action={<Link to="/mock-tests" className="link-arrow">New paper <ArrowRight size={14} /></Link>} />
            {progress.exams.length ? (
              <>
                <div className="score-chart">
                  {progress.exams.slice(0, 10).reverse().map((exam, index) => {
                    const pct = Math.round((exam.score / exam.total) * 100);
                    return (
                      <div key={`${exam.at}-${index}`} className="score-bar-wrap" title={`${pct}% on ${new Date(exam.at).toLocaleDateString('en-IN')}`}>
                        <span className={`score-bar ${pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low'}`} style={{ height: `${Math.max(8, pct)}%` }} />
                        <small>{pct}%</small>
                      </div>
                    );
                  })}
                </div>
                <div className="exam-table">
                  {progress.exams.slice(0, 8).map((exam, index) => (
                    <div key={`${exam.at}-${index}`}>
                      <span>{new Date(exam.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <span>{curriculum?.subjects.find((subject) => subject.id === exam.subjectId)?.shortName || exam.subjectId}</span>
                      <strong>{exam.score}/{exam.total}</strong>
                      <Badge tone={(exam.score / exam.total) >= 0.7 ? 'mint' : (exam.score / exam.total) >= 0.4 ? 'saffron' : 'rose'}>{Math.round((exam.score / exam.total) * 100)}%</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-inline"><Trophy size={22} /><div><strong>No mock paper yet</strong><p>Generate one to establish a baseline. Objective questions auto-score.</p></div><Button size="sm" onClick={() => navigate('/mock-tests')}>Generate</Button></div>
            )}
          </Card>

          <Card>
            <SectionHeader eyebrow="Recent activity" title="What you actually did" />
            {progress.recent.length ? (
              <div className="activity-list">
                {progress.recent.slice(0, 10).map((item, index) => (
                  <div key={`${item.at}-${index}`} className="activity-row">
                    <span className={`activity-icon type-${item.type}`}>
                      {item.type === 'chapter' ? <CheckCircle2 size={15} /> : item.type === 'exam' ? <Trophy size={15} /> : <Target size={15} />}
                    </span>
                    <div><strong>{item.title}</strong><small>{item.chapterId ? `${item.subjectId} · ${item.chapterId}` : item.subjectId || 'Class X'} · {new Date(item.at).toLocaleString('en-IN')}</small></div>
                  </div>
                ))}
              </div>
            ) : <p className="muted">Complete a chapter or practice set to start the log.</p>}
          </Card>
        </section>

        <aside className="progress-rail">
          <Card className="board-readiness-card">
            <div className="eyebrow light">Board readiness</div>
            <div className="readiness-ring"><ProgressRing value={examAverage} size={104} stroke={8} color="#f8c26a" /></div>
            <h3>{examAverage >= 70 ? 'On a strong trajectory' : examAverage >= 40 ? 'Foundation is forming' : 'Baseline needed'}</h3>
            <p>{progress.exams.length ? `Average across ${progress.exams.length} paper${progress.exams.length === 1 ? '' : 's'}. Keep mixed-chapter practice in the loop.` : 'Take one diagnostic paper to replace guesswork with a real number.'}</p>
            <Button variant="on-dark" size="sm" onClick={() => navigate('/mock-tests')}>Open simulator</Button>
          </Card>

          <Card>
            <div className="eyebrow"><Clock3 size={14} /> Time by chapter</div>
            <div className="minutes-list">
              {minutes.slice(0, 5).map((entry) => (
                <div key={entry.key}>
                  <span>{entry.chapter?.name || entry.chapterId}</span>
                  <strong>{entry.minutes}m</strong>
                  <ProgressBar value={(entry.minutes / Math.max(minutes[0]?.minutes || 1, 1)) * 100} height={4} />
                </div>
              ))}
              {!minutes.length && <p className="muted">Chapter time is tracked while you read for 5+ minutes.</p>}
            </div>
          </Card>

          <Card>
            <div className="eyebrow"><Bookmark size={14} /> Bookmarks</div>
            {bookmarks.length ? (
              <div className="bookmark-list">
                {bookmarks.map((bookmark) => (
                  <div key={bookmark.key}>
                    <button onClick={() => navigate(`/courses/${bookmark.subjectId}/${bookmark.chapterId}`)}>
                      <span>{bookmark.chapter?.name || bookmark.chapterId}</span>
                      <small>{bookmark.subject?.shortName}</small>
                    </button>
                    <button className="icon-btn ghost" onClick={() => toggleBookmark(bookmark.key)} aria-label="Remove bookmark">×</button>
                  </div>
                ))}
              </div>
            ) : <p className="muted">Bookmark a chapter to pin it here.</p>}
          </Card>

          <Card>
            <div className="eyebrow"><CheckCircle2 size={14} /> Completed</div>
            <div className="completed-list">
              {completedEntries.slice(0, 6).map((entry) => (
                <button key={entry.key} onClick={() => navigate(`/courses/${entry.subjectId}/${entry.chapterId}`)}>
                  <CheckCircle2 size={14} />
                  <span>{entry.chapter?.name || entry.chapterId}</span>
                  <small>{new Date(entry.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>
                </button>
              ))}
              {!completedEntries.length && <p className="muted">No chapters completed yet.</p>}
            </div>
          </Card>

          <Card className="danger-card">
            <div className="eyebrow"><RotateCcw size={14} /> Local data</div>
            <p>Progress is stored in this browser and on the local API. Reset clears both for this device.</p>
            {confirmReset ? (
              <div className="danger-actions">
                <Button variant="danger" size="sm" onClick={() => { resetProgress(); setConfirmReset(false); }}>Confirm reset</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            ) : <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>Reset progress</Button>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
