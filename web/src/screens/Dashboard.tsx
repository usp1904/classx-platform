import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Play,
  Sigma,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { Card, ProgressBar, ProgressRing, SectionHeader, Stat, Badge, Button, CheckLine } from '../components/ui';
import { useApp } from '../lib/store';

const accentMap: Record<string, string> = {
  indigo: 'var(--indigo)',
  emerald: 'var(--mint)',
  amber: 'var(--saffron)',
  rose: 'var(--rose)',
};

function Greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { curriculum, plan, progress, togglePlan, loading, error, notify } = useApp();
  const navigate = useNavigate();

  const next = useMemo(() => {
    if (!curriculum) return null;
    const math = curriculum.subjects.find((s) => s.id === 'mathematics');
    const pool = math?.chapters.filter((c) => c.hasContent) || [];
    const pending = pool.find((c) => !progress.completedChapters[`mathematics:${c.id}`]) || pool[0];
    return pending ? { subject: math!, chapter: pending } : null;
  }, [curriculum, progress.completedChapters]);

  const totals = useMemo(() => {
    if (!curriculum) return { authored: 0, completed: 0, questionsSolved: 0 };
    const authored = curriculum.subjects.reduce((sum, s) => sum + s.coverage.authored, 0);
    const completed = Object.keys(progress.completedChapters).length;
    return { authored, completed, questionsSolved: progress.practice.answered };
  }, [curriculum, progress]);

  const accuracy = progress.practice.answered ? Math.round((progress.practice.correct / progress.practice.answered) * 100) : 0;
  const weekly = plan?.weeks.slice(0, 4) || [];
  const daysToBoards = Math.max(0, Math.ceil((new Date('2027-02-15').getTime() - Date.now()) / 86400000));

  if (loading) {
    return <div className="page-loading"><div className="loader-ring" /><span>Building your curriculum map…</span></div>;
  }
  if (error) {
    return (
      <Card className="error-card">
        <h2>Could not load the platform</h2>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </Card>
    );
  }

  return (
    <div className="dashboard page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="pulse-dot" /> {daysToBoards} days to boards</div>
          <h1>{Greeting()}, learner.</h1>
          <p>One focused block today beats five distracted hours. Your next move is ready.</p>
        </div>
        <Button variant="secondary" icon={<Sparkles size={16} />} onClick={() => navigate('/tutor')}>Ask a doubt</Button>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-main">
          {next && (
            <Card className="continue-card">
              <div className="continue-copy">
                <div className="eyebrow light">Continue where you left off</div>
                <h2>{next.chapter.name}</h2>
                <p>{next.chapter.summary || 'Build the concept, then solve board-style questions with a guided set.'}</p>
                <div className="continue-meta">
                  <span><Clock3 size={14} /> {next.chapter.periods || 6} periods</span>
                  <span><Target size={14} /> {next.chapter.marks ? `${next.chapter.marks} unit marks` : 'High yield'}</span>
                  <span><BookOpen size={14} /> {next.chapter.stats.concepts} concepts</span>
                </div>
                <div className="continue-actions">
                  <Button variant="dark" icon={<Play size={16} />} onClick={() => navigate(`/courses/${next.subject.id}/${next.chapter.id}`)}>Resume chapter</Button>
                  <Button variant="on-dark" icon={<Target size={16} />} onClick={() => navigate(`/practice?subject=${next.subject.id}&chapter=${next.chapter.id}`)}>Practice now</Button>
                </div>
                <div className="continue-progress">
                  <ProgressBar value={progress.completedChapters[`mathematics:${next.chapter.id}`] ? 100 : 18} tone="saffron" height={6} />
                  <small>{progress.completedChapters[`mathematics:${next.chapter.id}`] ? 'Chapter mastered' : 'Concept 1 of 6 · just started'}</small>
                </div>
              </div>
              <div className="continue-art" aria-hidden="true">
                <svg viewBox="0 0 320 260">
                  <defs>
                    <linearGradient id="heroLine" x1="0" x2="1">
                      <stop offset="0" stopColor="#f8c26a" />
                      <stop offset="1" stopColor="#ff8a5c" />
                    </linearGradient>
                  </defs>
                  <g opacity="0.5" stroke="rgba(255,255,255,.22)" strokeWidth="1">
                    {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={x} x1={x} y1="20" x2={x} y2="240" />)}
                    {[40, 80, 120, 160, 200].map((y) => <line key={y} x1="20" y1={y} x2="300" y2={y} />)}
                  </g>
                  <path d="M25 225 C 75 220, 95 170, 130 150 S 200 95, 235 70 S 280 40, 300 34" fill="none" stroke="url(#heroLine)" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="235" cy="70" r="9" fill="#ffd38a" />
                  <circle cx="235" cy="70" r="18" fill="none" stroke="rgba(255,211,138,.45)" />
                  <text x="32" y="58" fill="rgba(255,255,255,.82)" fontSize="14" fontFamily="Georgia">y = ax² + bx + c</text>
                  <text x="220" y="235" fill="rgba(255,255,255,.6)" fontSize="12">your growth curve</text>
                </svg>
              </div>
            </Card>
          )}

          <div className="stat-grid">
            <Stat icon={<Zap size={18} />} label="XP earned" value={progress.xp.toLocaleString('en-IN')} hint="Every solved question counts" tone="indigo" />
            <Stat icon={<Flame size={18} />} label="Day streak" value={`${progress.streak} ${progress.streak === 1 ? 'day' : 'days'}`} hint="Keep the chain alive" tone="saffron" />
            <Stat icon={<Target size={18} />} label="Accuracy" value={`${accuracy}%`} hint={`${progress.practice.answered} questions attempted`} tone="mint" />
            <Stat icon={<Trophy size={18} />} label="Chapters done" value={`${totals.completed}/${totals.authored}`} hint="Authored chapters" tone="rose" />
          </div>

          <section>
            <SectionHeader
              eyebrow="Your course map"
              title="Subjects"
              description="Official CBSE 2026-27 structure, mapped chapter by chapter."
              action={<Link className="link-arrow" to="/courses">Open library <ArrowRight size={14} /></Link>}
            />
            <div className="subject-grid">
              {curriculum?.subjects.map((subject) => {
                const authored = subject.chapters.filter((c) => c.hasContent && !c.isPartial);
                const completed = authored.filter((c) => progress.completedChapters[`${subject.id}:${c.id}`]).length;
                const pct = authored.length ? (completed / authored.length) * 100 : 0;
                const pending = subject.coverage.total - authored.length;
                return (
                  <Link key={subject.id} to={`/courses?subject=${subject.id}`} className={`subject-card accent-${subject.accent}`}>
                    <div className="subject-card-top">
                      <span className="subject-icon">{subject.id === 'mathematics' ? <Sigma size={20} /> : subject.id === 'science' ? <BrainCircuit size={20} /> : <BookOpen size={20} />}</span>
                      <Badge tone={subject.accent as 'indigo' | 'mint' | 'saffron' | 'rose'}>{subject.coverage.total} chapters</Badge>
                    </div>
                    <h3>{subject.name}</h3>
                    <p>{subject.description}</p>
                    <div className="subject-card-foot">
                      <ProgressRing value={pct} size={46} stroke={4} color={accentMap[subject.accent]} />
                      <div>
                        <strong>{completed} of {authored.length} authored</strong>
                        <small>{pending ? `${pending} starter or syllabus chapters` : 'All chapters authored'}</small>
                      </div>
                      <ChevronRight size={18} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="two-col">
            <Card className="plan-card">
              <SectionHeader eyebrow="Next 4 weeks" title="Your plan" action={<Link to="/planner" className="link-arrow">Full planner <ChevronRight size={14} /></Link>} />
              <div className="plan-list">
                {weekly.map((week) => {
                  const key = `week-${week.week}`;
                  return (
                    <CheckLine
                      key={key}
                      checked={Boolean(progress.planChecks[key])}
                      label={`Week ${week.week} · ${week.chapterName}`}
                      hint={`${week.focus} · ${Math.round(week.minutes / 60)}h`}
                      onChange={() => togglePlan(key)}
                    />
                  );
                })}
              </div>
            </Card>

            <Card className="exam-card">
              <div className="eyebrow light">Board readiness</div>
              <h3>{daysToBoards} days left</h3>
              <p>Build a full 80-mark paper from your chosen chapters. Auto-scored objective section, model answers for written work.</p>
              <div className="exam-rings">
                <div><strong>{progress.exams.length}</strong><small>mocks taken</small></div>
                <div><strong>{progress.exams.length ? Math.round(progress.exams.reduce((s, e) => s + (e.score / e.total) * 100, 0) / progress.exams.length) : 0}%</strong><small>avg score</small></div>
                <div><strong>{totals.questionsSolved}</strong><small>questions solved</small></div>
              </div>
              <Button variant="on-dark" icon={<CalendarCheck2 size={16} />} onClick={() => navigate('/mock-tests')}>Generate a mock</Button>
            </Card>
          </div>
        </section>

        <aside className="dashboard-rail">
          <Card className="streak-card">
            <div className="streak-head">
              <span className="flame-xl"><Flame size={24} /></span>
              <div><strong>{progress.streak}-day streak</strong><small>Personal best energy</small></div>
            </div>
            <div className="week-dots">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <div key={`${day}-${index}`} className={index < Math.min(progress.streak, 7) ? 'on' : ''}>
                  <span>{day}</span><i />
                </div>
              ))}
            </div>
            <p>20 minutes today keeps your recall curve rising.</p>
          </Card>

          <Card className="focus-card">
            <div className="eyebrow">Today’s focus</div>
            <h3>Concept → Example → Practice</h3>
            <p>Read one concept, walk one worked example, then attempt 10 MCQs. That loop is the highest-yield revision pattern.</p>
            <div className="focus-steps">
              <div><span>1</span><strong>Concept</strong></div>
              <div><span>2</span><strong>Example</strong></div>
              <div><span>3</span><strong>Drill</strong></div>
            </div>
            <Button variant="secondary" size="sm" icon={<BookOpen size={15} />} onClick={() => next && navigate(`/courses/${next.subject.id}/${next.chapter.id}`)}>Start loop</Button>
          </Card>

          <Card className="insight-card">
            <div className="eyebrow light">Smart insight</div>
            <h3>{accuracy >= 70 ? 'Accuracy is healthy. Add speed.' : 'Accuracy first, speed later.'}</h3>
            <p>{accuracy >= 70 ? 'Move to timed sets and mixed-chapter questions to train retrieval under pressure.' : 'Untimed practice builds the schema. Revisit each wrong answer and name the exact misconception.'}</p>
            <button className="link-arrow light" onClick={() => navigate('/practice')}>Open practice <ArrowRight size={14} /></button>
          </Card>

          <Card className="mini-quote">
            <CheckCircle2 size={18} />
            <p>“Mathematics is not about numbers, equations, computations, or algorithms: it is about understanding.”</p>
            <small>— William Paul Thurston</small>
          </Card>
        </aside>
      </div>
    </div>
  );
}
