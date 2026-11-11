import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Flag,
  Lightbulb,
  ListChecks,
  Play,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Badge, Button, Card, CheckLine, ProgressBar, ProgressRing, SectionHeader, Tabs } from '../components/ui';

const phaseTones: Record<string, 'indigo' | 'mint' | 'saffron' | 'rose'> = {
  phase1: 'indigo',
  phase2: 'mint',
  phase3: 'saffron',
  phase4: 'rose',
};

export default function Planner() {
  const { plan, progress, togglePlan, curriculum } = useApp();
  const navigate = useNavigate();
  const [phaseFilter, setPhaseFilter] = useState<string>('all');

  const weeks = plan?.weeks || [];
  const done = weeks.filter((week) => progress.planChecks[`week-${week.week}`]).length;
  const pct = weeks.length ? Math.round((done / weeks.length) * 100) : 0;
  const nextWeek = weeks.find((week) => !progress.planChecks[`week-${week.week}`]) || weeks[weeks.length - 1];
  const totalMinutes = weeks.reduce((sum, week) => sum + week.minutes, 0);
  const filtered = phaseFilter === 'all' ? weeks : weeks.filter((week) => week.phase === phaseFilter);
  const phaseIds = useMemo(() => [...new Set(weeks.map((week) => week.phase))], [weeks]);

  const findChapter = (subjectId: string, chapterId: string) =>
    curriculum?.subjects.find((subject) => subject.id === subjectId)?.chapters.find((chapter) => chapter.id === chapterId);

  if (!plan) return <div className="page-loading"><div className="loader-ring" /><span>Loading your study plan…</span></div>;

  return (
    <div className="page planner-page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><CalendarDays size={14} /> Study planner</div>
          <h1>{weeks.length ? `A ${weeks.length}-week climb, not a panic sprint.` : 'A steady climb, not a panic sprint.'}</h1>
          <p>NCERT first, then RD Sharma and RS Aggarwal extensions. Each week has one target and one measurable output.</p>
        </div>
        <div className="head-metrics">
          <div><strong>{weeks.length}</strong><small>planned weeks</small></div>
          <div><strong>{Math.round(totalMinutes / 60)}h</strong><small>total study time</small></div>
          <div><strong>{done}/{weeks.length}</strong><small>weeks complete</small></div>
        </div>
      </div>

      {nextWeek && (
        <Card className="planner-hero">
          <div className="planner-hero-copy">
            <div className="eyebrow light">Next checkpoint</div>
            <h2>Week {nextWeek.week} · {nextWeek.chapterName}</h2>
            <p>{nextWeek.target}</p>
            <div className="continue-meta">
              <span><Clock3 size={14} /> {nextWeek.minutes} minutes</span>
              <span><Target size={14} /> {nextWeek.focus}</span>
              <span><BookOpen size={14} /> {nextWeek.resource}</span>
            </div>
            <div className="continue-actions">
              <Button variant="dark" icon={<Play size={16} />} onClick={() => navigate(`/courses/${nextWeek.subjectId}/${nextWeek.chapterId}`)}>Start this week</Button>
              <Button variant="on-dark" icon={<CheckCircle2 size={16} />} onClick={() => togglePlan(`week-${nextWeek.week}`)}>Mark week done</Button>
            </div>
          </div>
          <div className="planner-hero-ring">
            <ProgressRing value={pct} size={118} stroke={8} color="var(--saffron)" />
            <small>{done} of {weeks.length} weeks</small>
          </div>
        </Card>
      )}

      <div className="planner-layout">
        <section className="planner-main">
          <div className="planner-toolbar">
            <Tabs
              items={[
                { id: 'all', label: 'Full plan', count: weeks.length },
                ...phaseIds.map((phase) => ({ id: phase, label: plan.phases?.[phase]?.name?.split(' (')[0] || phase, count: weeks.filter((week) => week.phase === phase).length })),
              ]}
              value={phaseFilter}
              onChange={setPhaseFilter}
            />
            <span className="tools-note"><Flag size={14} /> {filtered.length} weeks shown</span>
          </div>

          <div className="week-timeline">
            {filtered.map((week, index) => {
              const key = `week-${week.week}`;
              const checked = Boolean(progress.planChecks[key]);
              const chapter = findChapter(week.subjectId, week.chapterId);
              const subject = curriculum?.subjects.find((item) => item.id === week.subjectId);
              return (
                <div key={key} className={`week-row ${checked ? 'done' : ''}`}>
                  <div className="week-rail">
                    <span className={`week-dot tone-${phaseTones[week.phase] || 'indigo'}`}>{checked ? <CheckCircle2 size={16} /> : week.week}</span>
                    {index < filtered.length - 1 && <span className="week-line" />}
                  </div>
                  <Card className="week-card">
                    <div className="week-card-head">
                      <div>
                        <div className="week-meta">
                          <Badge tone={phaseTones[week.phase] || 'indigo'}>Week {week.week}</Badge>
                          <span>{week.phaseName}</span>
                          <span><Clock3 size={13} /> {week.minutes} min</span>
                        </div>
                        <h3>{week.chapterName}</h3>
                        <p>{week.target}</p>
                      </div>
                      <div className="week-card-actions">
                        <Button variant={checked ? 'secondary' : 'primary'} size="sm" icon={checked ? <CheckCircle2 size={14} /> : <Play size={14} />} onClick={() => togglePlan(key)}>{checked ? 'Done' : 'Mark done'}</Button>
                      </div>
                    </div>
                    <div className="week-details">
                      <span><Target size={14} /><strong>Focus</strong>{week.focus}</span>
                      <span><BookOpen size={14} /><strong>Resource</strong>{week.resource}</span>
                      <span><Compass size={14} /><strong>Subject</strong>{subject?.shortName || week.subjectId}</span>
                    </div>
                    <div className="week-foot">
                      <div className="week-chapter-link">
                        {chapter && <><Badge tone="neutral">{chapter.difficulty}</Badge><span>{chapter.stats.quizzes} MCQs · {chapter.periods || '—'} periods</span></>}
                      </div>
                      <div className="week-links">
                        <button className="link-arrow" onClick={() => navigate(`/courses/${week.subjectId}/${week.chapterId}`)}>Open chapter <ArrowRight size={14} /></button>
                        <button className="link-arrow" onClick={() => navigate(`/practice?subject=${week.subjectId}&chapter=${week.chapterId}`)}>Practice <ChevronRight size={14} /></button>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="planner-rail">
          <Card>
            <div className="eyebrow"><ListChecks size={14} /> Plan progress</div>
            <div className="plan-progress-head"><strong>{pct}%</strong><small>{done} of {weeks.length} weeks</small></div>
            <ProgressBar value={pct} height={8} />
            <div className="phase-mini-list">
              {phaseIds.map((phase) => {
                const phaseWeeks = weeks.filter((week) => week.phase === phase);
                const phaseDone = phaseWeeks.filter((week) => progress.planChecks[`week-${week.week}`]).length;
                return (
                  <button key={phase} className={phaseFilter === phase ? 'active' : ''} onClick={() => setPhaseFilter(phaseFilter === phase ? 'all' : phase)}>
                    <span className={`subject-dot tone-${phaseTones[phase]}`} />
                    <span><strong>{plan.phases?.[phase]?.name || phase}</strong><small>{phaseDone}/{phaseWeeks.length} weeks</small></span>
                    <small>{Math.round((phaseDone / Math.max(phaseWeeks.length, 1)) * 100)}%</small>
                  </button>
                );
              })}
            </div>
          </Card>

          {phaseFilter !== 'all' && plan.phases?.[phaseFilter] && (
            <Card>
              <div className="eyebrow"><Sparkles size={14} /> Phase strategy</div>
              <h3>{plan.phases[phaseFilter].name}</h3>
              <p>{plan.phases[phaseFilter].strategy}</p>
              <div className="phase-facts">
                <span><Timer size={14} /> {plan.phases[phaseFilter].totalTime}</span>
                <span><Target size={14} /> {plan.phases[phaseFilter].boardExamWeightage}</span>
              </div>
            </Card>
          )}

          <Card className="practice-tip">
            <Lightbulb size={20} />
            <h3>Two chapters per week</h3>
            <p>Each chapter gets two focused sessions: one for concept + example, one for timed practice. Keep the second session shorter.</p>
          </Card>

          <Card>
            <div className="eyebrow"><BookOpen size={14} /> Reference stack</div>
            <div className="resource-list">
              <div><BookOpen size={15} /><span><strong>NCERT core</strong><small>All exercises first</small></span></div>
              <div><BookOpen size={15} /><span><strong>RD Sharma</strong><small>Must-do + illustrations</small></span></div>
              <div><BookOpen size={15} /><span><strong>RS Aggarwal</strong><small>Bridge and MCQ sets</small></span></div>
            </div>
            <Link to="/library" className="link-arrow">Open formula library <ArrowRight size={14} /></Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
