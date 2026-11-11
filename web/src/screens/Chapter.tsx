import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Network,
  NotebookPen,
  Play,
  ScrollText,
  Sparkles,
  Target,
  Triangle,
  Zap,
  Film,
} from 'lucide-react';
import { api } from '../api';
import type { ChapterDetail, Lesson } from '../types';
import { useApp } from '../lib/store';
import { Badge, Button, Callout, Card, ProgressRing, SectionHeader, Tabs } from '../components/ui';
import { RichText } from '../components/RichText';
import { PracticeRunner } from '../components/PracticeRunner';
import { VisualBlock } from '../components/VisualBlock';
import { ConceptMap } from '../components/ConceptMap';

type TabId = 'learn' | 'theorems' | 'examples' | 'practice' | 'revision' | 'visuals';

const tabIds: TabId[] = ['learn', 'theorems', 'examples', 'practice', 'revision', 'visuals'];

function topicNames(topics: unknown[] | undefined) {
  return (topics || [])
    .map((topic) => (typeof topic === 'string' ? topic : topic && typeof topic === 'object' && 'name' in topic ? String((topic as { name?: unknown }).name || '') : ''))
    .filter(Boolean);
}

function TheoremCard({ theorem, index }: { theorem: NonNullable<Lesson['theorems']>[number]; index: number }) {
  return (
    <Card className="lesson-card theorem-card" id={`theorem-${index}`}>
      <div className="lesson-card-head">
        <span className="lesson-index">T{index + 1}</span>
        <div><div className="eyebrow">Theorem</div><h3>{theorem.name}</h3></div>
      </div>
      {theorem.statement && <div className="theorem-statement"><RichText text={theorem.statement} /></div>}
      {theorem.proposed_by && (
        <div className="theorem-people">
          {theorem.proposed_by.name && <span><GraduationCap size={14} /> {theorem.proposed_by.name}{theorem.proposed_by.era ? ` · ${theorem.proposed_by.era}` : ''}</span>}
          {theorem.proposed_by.book && <span><BookOpen size={14} /> {theorem.proposed_by.book}</span>}
          {theorem.proposed_by.location && <span><ScrollText size={14} /> {theorem.proposed_by.location}</span>}
        </div>
      )}
      <div className="detail-stack">
        {theorem.historical_context && <details open><summary>Historical context</summary><p>{theorem.historical_context}</p></details>}
        {theorem.why_proposed && <details><summary>Why it was proposed</summary><p>{theorem.why_proposed}</p></details>}
        {theorem.real_world_utility && <details><summary>Real-world utility</summary><p>{theorem.real_world_utility}</p></details>}
        {theorem.why_students_learn && <details><summary>Why you learn it</summary><p>{theorem.why_students_learn}</p></details>}
      </div>
      {theorem.examples && theorem.examples.length > 0 && (
        <div className="theorem-examples">
          <h4><Lightbulb size={16} /> Worked under this theorem</h4>
          {theorem.examples.map((example, exampleIndex) => (
            <div key={exampleIndex} className="mini-example">
              <strong>{example.problem}</strong>
              {example.indiandiaspora_context && <p className="context-note">{example.indiandiaspora_context}</p>}
              {example.solution_step_by_step && <ol>{example.solution_step_by_step.map((step, i) => <li key={i}>{step}</li>)}</ol>}
              {example.final_answer && <div className="answer-chip"><CheckCircle2 size={15} /> {example.final_answer}</div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Concepts({ lesson }: { lesson: Lesson }) {
  return (
    <div className="lesson-stack">
      {lesson.outcomes && lesson.outcomes.length > 0 && (
        <Card className="outcome-card">
          <div className="eyebrow"><Target size={14} /> Learning outcomes</div>
          <h3>By the end of this chapter</h3>
          <div className="outcome-grid">
            {lesson.outcomes.map((outcome, index) => (
              <div key={index} className="outcome-item"><CheckCircle2 size={17} /><span>{outcome}</span></div>
            ))}
          </div>
        </Card>
      )}
      {lesson.concepts?.map((concept, index) => (
        <Card key={index} className="concept-card lesson-card" id={`concept-${index}`}>
          <div className="lesson-card-head">
            <span className="lesson-index">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <div className="eyebrow">Concept</div>
              <h3>{concept.name || concept.title}</h3>
            </div>
          </div>
          {concept.real_life_application && (
            <div className="concept-real">
              <div className="concept-real-label"><Sparkles size={15} /> Real life first</div>
              <p>{concept.real_life_application}</p>
            </div>
          )}
          {(concept.purpose || concept.explanation) && <div className="concept-block"><h4><Target size={15} /> Why this concept exists</h4><p>{concept.purpose || concept.explanation}</p></div>}
          {(concept.day_to_day_usage || concept.key_points) && (concept.day_to_day_usage || concept.key_points)!.length > 0 && (
            <div className="concept-block">
              <h4><ListChecks size={15} /> Where you already use it</h4>
              <ul className="usage-list">{(concept.day_to_day_usage || concept.key_points)!.map((usage, i) => <li key={i}>{usage}</li>)}</ul>
            </div>
          )}
        </Card>
      ))}
      {lesson.common_misconceptions && lesson.common_misconceptions.length > 0 && (
        <Card className="misconception-card" id="misconceptions">
          <div className="eyebrow"><Triangle size={14} /> Trap detector</div>
          <h3>Common misconceptions</h3>
          <div className="misconception-list">
            {lesson.common_misconceptions.map((item, index) => (
              <div key={index} className="misconception-item">
                <span>{index + 1}</span>
                <div>
                  <RichText text={typeof item === 'string' ? item : String(item.misconception || JSON.stringify(item))} />
                  {typeof item !== 'string' && item.correction && <p className="hint-line"><Lightbulb size={14} /> {String(item.correction)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function WorkedExamples({ lesson }: { lesson: Lesson }) {
  return (
    <div className="lesson-stack">
      {lesson.worked_examples?.map((example, index) => (
        <Card key={index} className="lesson-card example-card" id={`example-${index}`}>
          <div className="lesson-card-head">
            <span className="lesson-index">E{index + 1}</span>
            <div><div className="eyebrow">Worked example</div><h3>{example.topic || example.title || 'Board-style problem'}</h3></div>
          </div>
          <p className="example-problem">{example.problem}</p>
          {(example.board_mode || example.solution) && (
            <div className="solution-block board-block">
              <div className="solution-label"><FileText size={15} /> Board mode · full marks</div>
              <ol>{(example.board_mode || example.solution)!.map((step, i) => <li key={i}>{step}</li>)}</ol>
            </div>
          )}
          {(example.speed_mode || example.board_tip || example.exam_tip) && (
            <div className="solution-block speed-block">
              <div className="solution-label"><Zap size={15} /> Speed mode · golden step</div>
              <p>{example.speed_mode || example.board_tip || example.exam_tip}</p>
            </div>
          )}
          {example.answer && <div className="answer-chip"><CheckCircle2 size={15} /> {example.answer}</div>}
          {example.competitive_shortcut && (
            <div className="solution-block compete-block">
              <div className="solution-label"><GraduationCap size={15} /> JEE / NEET foundation shortcut</div>
              <p>{example.competitive_shortcut}</p>
            </div>
          )}
        </Card>
      ))}
      {lesson.exercises && Object.entries(lesson.exercises).map(([groupKey, group]) => (
        <Card key={groupKey} className="lesson-card" id={`exercise-${groupKey}`}>
          <SectionHeader eyebrow="NCERT exercise" title={group.title || groupKey} description={group.objective} />
          <div className="model-question-list">
            {group.problems?.map((problem, index) => (
              <details key={problem.id || index}>
                <summary>{problem.question}</summary>
                {problem.solution && <ol>{problem.solution.map((step, i) => <li key={i}>{step}</li>)}</ol>}
                {problem.final_answer && <div className="answer-chip"><CheckCircle2 size={15} /> {problem.final_answer}</div>}
                {problem.book_source && <p className="hint-line"><BookOpen size={14} /> {problem.book_source}</p>}
              </details>
            ))}
          </div>
        </Card>
      ))}
      {lesson.model_papers && Object.entries(lesson.model_papers).map(([difficulty, questions]) => (
        <Card key={difficulty} className="lesson-card">
          <SectionHeader eyebrow="Model paper" title={`${difficulty[0].toUpperCase()}${difficulty.slice(1)} tier questions`} />
          <div className="model-question-list">
            {questions.map((question, index) => (
              <details key={index}>
                <summary>{question.question}</summary>
                {question.steps && <ol>{question.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
                {question.answer && <div className="answer-chip"><CheckCircle2 size={15} /> {question.answer}</div>}
                {question.hints && <p className="hint-line"><Lightbulb size={14} /> {question.hints.join(' ')}</p>}
              </details>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MindMapCard({ map }: { map: NonNullable<Lesson['mind_maps']> }) {
  if (!map.branches) return null;
  return (
    <Card className="mindmap-card">
      <div className="eyebrow"><Network size={14} /> Mind map</div>
      <h3>{map.title || 'Chapter mind map'}</h3>
      <div className="mindmap">
        {map.branches.map((branch, index) => (
          <div key={index} className="mindmap-branch" id={`mindmap-${index}`}>
            <div className="mindmap-root">{branch.concept}</div>
            {branch.sub_nodes && <ul>{branch.sub_nodes.map((node, i) => <li key={i}>{node}</li>)}</ul>}
            {branch.connections && <p className="connection-line">{branch.connections}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Revision({ lesson }: { lesson: Lesson }) {
  const shortcuts = lesson.vedic_math_shortcuts || [];
  const formulas = lesson.theorems || [];
  return (
    <div className="lesson-stack">
      {lesson.mind_maps?.branches && <MindMapCard map={lesson.mind_maps} />}
      {lesson.flowcharts?.map((flow, index) => (
        <Card key={index} className="flow-card" id={`flow-${index}`}>
          <div className="eyebrow">Decision flow</div>
          <h3>{flow.title}</h3>
          <div className="flow-steps">
            {flow.steps?.map((step, i) => (
              <div key={i} className={`flow-step ${step.decision ? 'decision' : ''}`}>
                <span>{step.order || i + 1}</span>
                <p>{step.action}</p>
                {step.decision && <small>yes → {String(step.if_yes)} · no → {String(step.if_no)}</small>}
              </div>
            ))}
          </div>
        </Card>
      ))}
      {lesson.concept_maps?.nodes && (
        <Card className="conceptmap-card" id="concept-map">
          <ConceptMap title={lesson.concept_maps.title} nodes={lesson.concept_maps.nodes} edges={lesson.concept_maps.edges || []} />
        </Card>
      )}
      {formulas.length > 0 && (
        <Card className="formula-card">
          <div className="eyebrow"><NotebookPen size={14} /> Formula sheet</div>
          <h3>Statements you must be able to reproduce</h3>
          <div className="formula-list">
            {formulas.map((theorem, index) => (
              <div key={index} className="formula-row">
                <strong>{theorem.name}</strong>
                <p>{theorem.statement}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      {shortcuts.length > 0 && (
        <Card className="shortcut-card">
          <div className="eyebrow"><Zap size={14} /> Speed mathematics</div>
          <h3>Vedic & competition shortcuts</h3>
          <div className="shortcut-list">
            {shortcuts.map((shortcut, index) => {
              const item = shortcut as { title?: string; concept?: string; examples?: { problem?: string; steps?: string[]; regular_method?: string }[] };
              return (
                <details key={index} open={index === 0} id={`shortcut-${index}`}>
                  <summary>{item.title || item.concept || `Shortcut ${index + 1}`}</summary>
                  {item.concept && <p>{item.concept}</p>}
                  {item.examples?.map((example, i) => (
                    <div key={i} className="mini-example">
                      <strong>{example.problem}</strong>
                      {example.steps && <ol>{example.steps.map((step, j) => <li key={j}>{step}</li>)}</ol>}
                      {example.regular_method && <small>Regular method: {example.regular_method}</small>}
                    </div>
                  ))}
                </details>
              );
            })}
          </div>
        </Card>
      )}
      {lesson.common_misconceptions && (
        <Callout tone="rose" title="Last-minute trap check">
          <ul>{lesson.common_misconceptions.slice(0, 3).map((item, index) => <li key={index}>{typeof item === 'string' ? item : String(item.misconception || '')}</li>)}</ul>
        </Callout>
      )}
    </div>
  );
}

function SyllabusOnly({ detail }: { detail: ChapterDetail }) {
  const navigate = useNavigate();
  const { chapter } = detail;
  return (
    <div className="lesson-stack">
      <Card className="syllabus-map-card">
        <div className="eyebrow"><ScrollText size={14} /> Official syllabus map</div>
        <h2>{chapter.name}</h2>
        <p>{chapter.summary || `This chapter belongs to ${chapter.unitName}.`}</p>
        <div className="syllabus-facts">
          <div><strong>{chapter.marks ?? '—'}</strong><small>unit marks</small></div>
          <div><strong>{chapter.periods ?? '—'}</strong><small>periods</small></div>
          <div><strong>{chapter.difficulty}</strong><small>difficulty</small></div>
          <div><strong>{chapter.unitName}</strong><small>unit</small></div>
        </div>
        <div className="syllabus-topics">
          <h3>Topics in this chapter</h3>
          {chapter.topics.length ? (
            <ol>{chapter.topics.map((topic) => <li key={topic.id}>{topic.name}</li>)}</ol>
          ) : (
            <p>Topic breakdown is available in the official chapter map. Use the tutor to retrieve the exact syllabus context.</p>
          )}
        </div>
        <Callout tone="saffron" title="Authoring status">
          The syllabus is mapped, but the full authored lesson pack for this chapter is still being built. Practice and notes avoid invented content. You can still ask the tutor for a grounded orientation.
        </Callout>
        <div className="syllabus-actions">
          <Button icon={<Sparkles size={16} />} onClick={() => navigate(`/tutor?subject=${chapter.subjectId || ''}&chapter=${chapter.id}`)}>Ask the tutor</Button>
          <Button variant="secondary" icon={<BookOpen size={16} />} onClick={() => navigate(`/courses?subject=${chapter.subjectId || 'science'}`)}>Back to syllabus</Button>
        </div>
      </Card>
    </div>
  );
}

export default function ChapterPage() {
  const { subjectId = '', chapterId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawTab = (params.get('tab') as TabId) || 'learn';
  const tab: TabId = tabIds.includes(rawTab) ? rawTab : 'learn';
  const [detail, setDetail] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { progress, completeChapter, recordPractice, toggleBookmark, addMinutes, notify } = useApp();
  const navigate = useNavigate();
  const minutesRef = useRef(0);
  const key = `${subjectId}:${chapterId}`;
  const done = Boolean(progress.completedChapters[key]);
  const bookmarked = progress.bookmarks.includes(key);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.chapter(subjectId, chapterId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load chapter');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [subjectId, chapterId]);

  useEffect(() => {
    if (!detail) return;
    const anchor = params.get('anchor');
    if (!anchor) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(anchor);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('flash-target');
        window.setTimeout(() => target.classList.remove('flash-target'), 1800);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [detail, params, tab]);

  useEffect(() => {
    minutesRef.current = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !detail) return;
      minutesRef.current += 1;
      if (minutesRef.current % 5 === 0) addMinutes(subjectId, chapterId, 5);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [addMinutes, chapterId, detail, subjectId]);

  const setTab = (next: TabId) => {
    const updated = new URLSearchParams(params);
    updated.set('tab', next);
    updated.delete('anchor');
    setParams(updated, { replace: true });
  };

  const lesson = detail?.lesson || null;
  const tabs = useMemo(() => ([
    { id: 'learn' as const, label: 'Learn', count: lesson?.concepts?.length },
    { id: 'theorems' as const, label: 'Theorems', count: lesson?.theorems?.length },
    { id: 'examples' as const, label: 'Examples', count: (lesson?.worked_examples?.length || 0) + Math.max(0, lesson?.stats?.exercises || 0) },
    { id: 'practice' as const, label: 'Practice', count: lesson?.stats?.quizzes },
    { id: 'revision' as const, label: 'Revision' },
    { id: 'visuals' as const, label: 'Visuals', count: (lesson?.visualizations?.length || 0) + (lesson?.concept_maps?.nodes?.length ? 1 : 0) + (lesson?.mind_maps?.branches?.length ? 1 : 0) },
  ]), [lesson]);

  if (loading) return <div className="page-loading"><div className="loader-ring" /><span>Loading chapter…</span></div>;
  if (error || !detail) {
    return <Card className="empty-state"><h2>Chapter unavailable</h2><p>{error || 'Not found.'}</p><Button onClick={() => navigate('/courses')}>Back to courses</Button></Card>;
  }

  const chapter = detail.chapter;
  const isMath = chapter.subjectId === 'mathematics';
  const sourceLabel = isMath ? 'NCERT Mathematics · CBSE 2026-27' : `${chapter.subjectName} · CBSE 2026-27`;

  return (
    <div className="page chapter-page">
      <div className="chapter-breadcrumb">
        <Link to="/courses"><ArrowLeft size={14} /> Courses</Link>
        <ChevronRight size={13} />
        <Link to={`/courses?subject=${chapter.subjectId}`}>{chapter.subjectName}</Link>
        <ChevronRight size={13} />
        <span>{chapter.name}</span>
      </div>

      <div className="chapter-header">
        <div className="chapter-header-copy">
          <div className="chapter-badges">
            <Badge tone={chapter.hasContent ? 'indigo' : 'neutral'}>{chapter.hasContent ? (chapter.isPartial ? 'Starter notes' : 'Full lesson') : 'Syllabus map'}</Badge>
            <Badge tone="neutral">{chapter.unitName}</Badge>
            <Badge tone="mint">{chapter.difficulty}</Badge>
            {chapter.marks != null && <Badge tone="saffron">{chapter.marks} unit marks</Badge>}
          </div>
          <h1>{chapter.name}</h1>
          <p>{lesson?.title || chapter.summary || 'Official chapter map from the CBSE syllabus.'}</p>
          <div className="chapter-meta-line">
            <span><Clock3 size={14} /> {chapter.periods || 6} periods</span>
            <span><BookOpen size={14} /> {chapter.stats.concepts || chapter.topics.length} concepts</span>
            <span><ListChecks size={14} /> {chapter.stats.quizzes} MCQs</span>
            <span><ScrollText size={14} /> {sourceLabel}</span>
          </div>
        </div>
        <div className="chapter-header-side">
          <ProgressRing value={done ? 100 : 0} size={68} stroke={6} color={done ? 'var(--mint)' : 'var(--indigo)'} />
          <div className="chapter-actions">
            <Button variant={done ? 'secondary' : 'primary'} icon={done ? <CheckCircle2 size={16} /> : <Play size={16} />} onClick={() => completeChapter(subjectId, chapterId)}>{done ? 'Mastered' : 'Mark complete'}</Button>
            <button className={`icon-btn bookmark ${bookmarked ? 'active' : ''}`} onClick={() => toggleBookmark(key)} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark chapter'}>
              {bookmarked ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
            </button>
          </div>
        </div>
      </div>

      <div className="chapter-tabs-row">
        <Tabs items={tabs} value={tab} onChange={setTab} className="chapter-tabs" />
          <div className="chapter-quick-actions">
            <Button variant="ghost" size="sm" icon={<Sparkles size={15} />} onClick={() => navigate(`/tutor?subject=${subjectId}&chapter=${chapterId}`)}>Ask tutor</Button>
            <Button variant="ghost" size="sm" icon={<Target size={15} />} onClick={() => navigate(`/practice?subject=${subjectId}&chapter=${chapterId}`)}>Practice</Button>
            <Button variant="ghost" size="sm" icon={<Film size={15} />} onClick={() => navigate(`/video/${subjectId}/${chapterId}`)}>Video lesson</Button>
            <Button variant="ghost" size="sm" icon={<Network size={15} />} onClick={() => navigate(`/concept-map/${subjectId}/${chapterId}`)}>Concept map</Button>
          </div>
      </div>

      <div className="chapter-layout">
        <section className="chapter-content">
          {!lesson && <SyllabusOnly detail={detail} />}
          {lesson && tab === 'learn' && <Concepts lesson={lesson} />}
          {lesson && tab === 'theorems' && (
            <div className="lesson-stack">
              {lesson.theorems?.length ? lesson.theorems.map((theorem, index) => <TheoremCard key={index} theorem={theorem} index={index} />) : <Card className="empty-state small"><h3>No theorems in this chapter</h3><p>This chapter is concept- and application-led. Switch to Learn or Examples.</p></Card>}
            </div>
          )}
          {lesson && tab === 'examples' && <WorkedExamples lesson={lesson} />}
          {lesson && tab === 'practice' && (
            <div className="inline-practice">
              <div className="practice-intro">
                <div className="eyebrow"><Target size={14} /> Adaptive drill</div>
                <h2>Practice {chapter.name}</h2>
                <p>Ten grounded MCQs from this chapter. Explanations appear after submission. No negative marking.</p>
              </div>
              <PracticeRunner key={key} subjectId={subjectId} chapterId={chapterId} count={10} onComplete={(result) => recordPractice(result, subjectId)} />
            </div>
          )}
          {lesson && tab === 'revision' && <Revision lesson={lesson} />}
          {lesson && tab === 'visuals' && (
            <div className="lesson-stack">
              {lesson.visualizations?.map((viz, index) => <VisualBlock key={index} viz={viz} />)}
              {lesson.concept_maps?.nodes && (
                <Card className="conceptmap-card" id="concept-map">
                  <ConceptMap title={lesson.concept_maps.title} nodes={lesson.concept_maps.nodes} edges={lesson.concept_maps.edges || []} />
                </Card>
              )}
              {lesson.mind_maps?.branches && <MindMapCard map={lesson.mind_maps} />}
              {!lesson.visualizations?.length && !lesson.concept_maps?.nodes && !lesson.mind_maps?.branches && (
                <Card className="empty-state small"><h3>No visual yet</h3><p>This chapter's authored pack has no interactive visual. The concept map and revision blocks still cover structure.</p></Card>
              )}
            </div>
          )}
        </section>

        <aside className="chapter-rail">
          <Card className="rail-card">
            <div className="eyebrow">Chapter outline</div>
            <div className="outline-list">
              {tabs.filter((item) => item.count !== 0 && item.count !== undefined).map((item) => (
                <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
                  <span>{item.label}</span><small>{item.count}</small>
                </button>
              ))}
              <button className={tab === 'revision' ? 'active' : ''} onClick={() => setTab('revision')}><span>Revision pack</span><small>→</small></button>
            </div>
          </Card>

          {chapter.topics.length > 0 && (
            <Card className="rail-card">
              <div className="eyebrow">Official syllabus topics</div>
              <div className="topic-chip-list">
                {chapter.topics.map((topic) => <span key={topic.id}>{topic.name}</span>)}
              </div>
            </Card>
          )}

          <Card className="rail-card">
            <div className="eyebrow">Study resources</div>
            <div className="resource-list">
              <div><BookOpen size={16} /><span><strong>NCERT core</strong><small>All examples + exercises</small></span></div>
              {lesson?.rd_sharma_extensions && <div><FlaskConical size={16} /><span><strong>RD Sharma</strong><small>{topicNames(lesson.rd_sharma_extensions.topics).slice(0, 2).join(' · ') || 'Must-do extensions'}</small></span></div>}
              {lesson?.rs_aggarwal_extensions && <div><BookMarked size={16} /><span><strong>RS Aggarwal</strong><small>{topicNames(lesson.rs_aggarwal_extensions.topics).slice(0, 2).join(' · ') || 'Bridge problems'}</small></span></div>}
              <div><ScrollText size={16} /><span><strong>Official source</strong><small>{sourceLabel}</small></span></div>
            </div>
          </Card>

          {lesson?.prerequisite_nodes && lesson.prerequisite_nodes.length > 0 && (
            <Card className="rail-card">
              <div className="eyebrow">Prerequisites</div>
              <div className="prereq-list">
                {lesson.prerequisite_nodes.map((node) => <span key={node}>{node.replace(/_/g, ' ')}</span>)}
              </div>
            </Card>
          )}

          {detail.graph.nodes.length > 0 && (
            <Card className="rail-card">
              <div className="eyebrow">Concept web</div>
              <div className="concept-mini">
                {detail.graph.nodes.slice(0, 8).map((node, index) => (
                  <span key={node.id} className={`group-${node.group || 'concept'}`}><i />{node.label}</span>
                ))}
              </div>
              {tab !== 'revision' && <button className="link-arrow" onClick={() => setTab('revision')}>Open full map <ArrowRight size={14} /></button>}
            </Card>
          )}

          {detail.related.length > 0 && (
            <Card className="rail-card">
              <div className="eyebrow">Related next</div>
              <div className="related-list">
                {detail.related.slice(0, 4).map((related) => (
                  <button key={`${related.subjectId}:${related.chapterId}`} onClick={() => navigate(`/courses/${related.subjectId}/${related.chapterId}`)}>
                    <span>{related.chapterName}</span><small>{related.type}</small>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="rail-cta">
            <Sparkles size={18} />
            <h4>Stuck on a step?</h4>
            <p>The tutor answers only from this chapter's retrieved context, with citations.</p>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/tutor?subject=${subjectId}&chapter=${chapterId}`)}>Open tutor</Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
