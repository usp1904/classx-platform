import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  FlaskConical,
  Globe2,
  Layers3,
  Search,
  Sigma,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge, Button, Card, ProgressBar, ProgressRing, SectionHeader, Tabs } from '../components/ui';
import { useApp } from '../lib/store';
import type { Chapter, Subject } from '../types';

const icons: Record<string, React.ReactNode> = {
  mathematics: <Sigma size={18} />,
  science: <FlaskConical size={18} />,
  'social-science': <Globe2 size={18} />,
  english: <BookOpen size={18} />,
};

const accents: Record<string, string> = { indigo: 'var(--indigo)', emerald: 'var(--mint)', amber: 'var(--saffron)', rose: 'var(--rose)' };

function ChapterCard({ subject, chapter, done }: { subject: Subject; chapter: Chapter; done: boolean }) {
  const navigate = useNavigate();
  const coverage = !chapter.hasContent ? 'Syllabus only' : chapter.isPartial ? 'Starter notes' : 'Full lesson';
  return (
    <button
      className={`chapter-card ${done ? 'done' : ''}`}
      onClick={() => navigate(`/courses/${subject.id}/${chapter.id}`)}
      aria-label={`Open ${chapter.name}`}
    >
      <div className={`chapter-num accent-${subject.accent}`}>{done ? <CheckCircle2 size={18} /> : String(chapter.number).padStart(2, '0')}</div>
      <div className="chapter-body">
        <div className="chapter-topline">
          <Badge tone={chapter.hasContent ? (subject.accent as 'indigo' | 'mint' | 'saffron' | 'rose') : 'neutral'}>{coverage}</Badge>
          <span className="chapter-diff">{chapter.difficulty}</span>
        </div>
        <h3>{chapter.name}</h3>
        <p>{chapter.summary || `${chapter.unitName} · official syllabus chapter`}</p>
        <div className="chapter-stats">
          <span><Layers3 size={13} /> {chapter.stats.concepts} concepts</span>
          <span><Target size={13} /> {chapter.stats.quizzes} MCQs</span>
          <span><Sparkles size={13} /> {chapter.stats.examples} examples</span>
        </div>
      </div>
      <div className="chapter-side">
        {chapter.marks != null && <span className="weightage"><strong>{chapter.marks}</strong><small>unit marks</small></span>}
        <span className="chapter-open">Open <ChevronRight size={14} /></span>
      </div>
    </button>
  );
}

export default function Courses() {
  const { curriculum, progress } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'ready' | 'progress' | 'syllabus'>('all');
  const selectedId = params.get('subject') || curriculum?.subjects[0]?.id || 'mathematics';
  const subject = curriculum?.subjects.find((s) => s.id === selectedId) || curriculum?.subjects[0];

  const filtered = useMemo(() => {
    if (!subject) return [];
    let list = subject.chapters;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => `${c.name} ${c.summary} ${c.unitName}`.toLowerCase().includes(q));
    }
    if (filter === 'ready') list = list.filter((c) => c.hasContent && !c.isPartial);
    if (filter === 'progress') list = list.filter((c) => progress.completedChapters[`${subject.id}:${c.id}`]);
    if (filter === 'syllabus') list = list.filter((c) => !c.hasContent || c.isPartial);
    return list;
  }, [subject, query, filter, progress.completedChapters]);

  const units = useMemo(() => {
    if (!subject) return [];
    const groups = new Map<string, { name: string; marks: number | null; periods: number | null; chapters: Chapter[] }>();
    for (const chapter of filtered) {
      const key = chapter.unitId || 'other';
      if (!groups.has(key)) {
        const unit = subject.units.find((u) => u.id === key);
        groups.set(key, { name: unit?.name || chapter.unitName || 'Other', marks: unit?.marks ?? chapter.marks, periods: unit?.periods ?? chapter.periods, chapters: [] });
      }
      groups.get(key)!.chapters.push(chapter);
    }
    return [...groups.values()];
  }, [subject, filtered]);

  if (!curriculum || !subject) return null;

  const authored = subject.chapters.filter((c) => c.hasContent && !c.isPartial);
  const completed = authored.filter((c) => progress.completedChapters[`${subject.id}:${c.id}`]).length;
  const pct = authored.length ? Math.round((completed / authored.length) * 100) : 0;

  return (
    <div className="page courses-page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><BookOpen size={14} /> Course library</div>
          <h1>Class X, organised for mastery.</h1>
          <p>Every chapter mapped to CBSE 2026-27. Deep-authored lessons for mathematics, with structured syllabus maps across the full course.</p>
        </div>
        <div className="head-metrics">
          <div><strong>{curriculum.subjects.reduce((s, x) => s + x.coverage.total, 0)}</strong><small>chapters mapped</small></div>
          <div><strong>{curriculum.subjects.reduce((s, x) => s + x.coverage.authored, 0)}</strong><small>deep lessons</small></div>
          <div><strong>{curriculum.subjects.reduce((s, x) => s + x.coverage.syllabusOnly, 0)}</strong><small>syllabus maps</small></div>
        </div>
      </div>

      <Card className="subject-switcher">
        <div className="subject-tabs">
          {curriculum.subjects.map((item) => (
            <button
              key={item.id}
              className={`subject-tab ${item.id === subject.id ? 'active' : ''}`}
              onClick={() => {
                params.set('subject', item.id);
                setParams(params, { replace: true });
              }}
            >
              <span className={`subject-tab-icon accent-${item.accent}`}>{icons[item.id]}</span>
              <span>
                <strong>{item.shortName}</strong>
                <small>{item.coverage.authored}/{item.coverage.total} authored</small>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <div className="course-hero">
        <div className="course-hero-copy">
          <div className="eyebrow">{subject.code ? `CBSE code ${subject.code}` : 'CBSE'} · {subject.maxMarks} marks</div>
          <h2>{subject.name}</h2>
          <p>{subject.description}</p>
          <div className="course-hero-meta">
            <span><Clock3 size={14} /> {subject.totalPeriods} periods</span>
            <span><Layers3 size={14} /> {subject.chapters.length} chapters</span>
            <span><Target size={14} /> {subject.internalMarks} internal marks</span>
          </div>
        </div>
        <div className="course-hero-progress">
          <ProgressRing value={pct} size={94} stroke={7} color={accents[subject.accent]} />
          <div>
            <strong>{completed} of {authored.length}</strong>
            <small>authored chapters complete</small>
            <ProgressBar value={pct} tone={subject.accent as 'indigo' | 'mint' | 'saffron' | 'rose'} height={5} />
          </div>
        </div>
      </div>

      <div className="course-tools">
        <div className="search-box">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${subject.name} chapters…`} aria-label="Search chapters" />
        </div>
        <Tabs
          items={[
            { id: 'all', label: 'All chapters', count: subject.chapters.length },
            { id: 'ready', label: 'Full lessons', count: subject.coverage.authored },
            { id: 'syllabus', label: 'Syllabus maps', count: subject.coverage.syllabusOnly + subject.coverage.partial },
            { id: 'progress', label: 'Completed', count: completed },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <span className="tools-note"><Filter size={14} /> Filtered view</span>
      </div>

      {units.length === 0 ? (
        <Card className="empty-state">
          <h3>No chapters match that filter.</h3>
          <p>Clear the search or switch to “All chapters”.</p>
          <Button variant="secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Reset filters</Button>
        </Card>
      ) : (
        <div className="unit-stack">
          {units.map((unit) => (
            <section key={unit.name} className="unit-block">
              <div className="unit-head">
                <div>
                  <div className="eyebrow">Unit</div>
                  <h3>{unit.name}</h3>
                </div>
                <div className="unit-meta">
                  {unit.marks != null && <Badge tone="indigo">{unit.marks} marks</Badge>}
                  {unit.periods != null && <span>{unit.periods} periods</span>}
                  <span>{unit.chapters.length} chapters</span>
                </div>
              </div>
              <div className="chapter-grid">
                {unit.chapters.map((chapter) => (
                  <ChapterCard key={chapter.id} subject={subject} chapter={chapter} done={Boolean(progress.completedChapters[`${subject.id}:${chapter.id}`])} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Card className="course-footnote">
        <div>
          <strong>Coverage is honest.</strong>
          <p>Full authored lessons are marked. Syllabus-only chapters expose the official topics and unit weightage, with AI tutor retrieval available from the syllabus map. No invented notes.</p>
        </div>
        <Link to="/tutor" className="link-arrow">Ask across the syllabus <ArrowRight size={14} /></Link>
      </Card>
    </div>
  );
}
