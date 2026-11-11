import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  LibraryBig,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import type { LibraryData } from '../types';
import { useApp } from '../lib/store';
import { Badge, Button, Card, EmptyState, SectionHeader, Segmented } from '../components/ui';
import { RichText } from '../components/RichText';

type Tab = 'formulas' | 'shortcuts' | 'flashcards';

const tabs = [
  { id: 'formulas' as const, label: 'Formula sheet' },
  { id: 'shortcuts' as const, label: 'Speed shortcuts' },
  { id: 'flashcards' as const, label: 'Flashcards' },
];

export default function Library() {
  const { curriculum, notify } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('formulas');
  const [subjectId, setSubjectId] = useState('all');
  const [query, setQuery] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    api.library()
      .then((payload) => setData({ formulas: payload.formulas, shortcuts: payload.shortcuts, flashcards: payload.flashcards }))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not load library'))
      .finally(() => setLoading(false));
  }, []);

  const subjects = useMemo(() => [...new Set((data?.formulas || []).map((item) => item.subjectId))], [data]);
  const normalizedQuery = query.trim().toLowerCase();
  const formulas = useMemo(() => (data?.formulas || []).filter((item) =>
    (subjectId === 'all' || item.subjectId === subjectId) &&
    (!normalizedQuery || `${item.name} ${item.statement} ${item.chapterName}`.toLowerCase().includes(normalizedQuery))
  ), [data, normalizedQuery, subjectId]);
  const shortcuts = useMemo(() => (data?.shortcuts || []).filter((item) =>
    (subjectId === 'all' || item.subjectId === subjectId) &&
    (!normalizedQuery || JSON.stringify(item).toLowerCase().includes(normalizedQuery))
  ), [data, normalizedQuery, subjectId]);
  const flashcards = useMemo(() => (data?.flashcards || []).filter((item) =>
    (subjectId === 'all' || item.subjectId === subjectId) &&
    (!normalizedQuery || `${item.front} ${item.back} ${item.chapterName}`.toLowerCase().includes(normalizedQuery))
  ), [data, normalizedQuery, subjectId]);

  const activeCard = flashcards[cardIndex % Math.max(flashcards.length, 1)];

  const moveCard = (direction: number) => {
    if (!flashcards.length) return;
    setFlipped(false);
    setCardIndex((current) => (current + direction + flashcards.length) % flashcards.length);
  };

  const copyFormula = async (statement: string) => {
    try {
      await navigator.clipboard.writeText(statement);
      notify('Formula copied', 'success');
    } catch {
      notify('Clipboard unavailable in this browser', 'error');
    }
  };

  if (loading) return <div className="page-loading"><div className="loader-ring" /><span>Assembling formulas and flashcards…</span></div>;
  if (error) return <Card className="empty-state"><h2>Library unavailable</h2><p>{error}</p><Button onClick={() => window.location.reload()}>Retry</Button></Card>;

  return (
    <div className="page library-page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><LibraryBig size={14} /> Revision library</div>
          <h1>Everything worth memorising.</h1>
          <p>Formula sheet, Vedic shortcuts, and flashcards extracted from the authored chapters. One screen before an exam.</p>
        </div>
        <div className="head-metrics">
          <div><strong>{data?.formulas.length || 0}</strong><small>formulas</small></div>
          <div><strong>{data?.shortcuts.length || 0}</strong><small>shortcuts</small></div>
          <div><strong>{data?.flashcards.length || 0}</strong><small>flashcards</small></div>
        </div>
      </div>

      <Card className="library-toolbar">
        <Segmented items={tabs} value={tab} onChange={setTab} ariaLabel="Library section" />
        <div className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search formulas, tricks, flashcards…" aria-label="Search library" />
        </div>
        <div className="select-wrap compact-select">
          <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setCardIndex(0); setFlipped(false); }} aria-label="Filter subject">
            <option value="all">All subjects</option>
            {subjects.map((id) => <option key={id} value={id}>{curriculum?.subjects.find((subject) => subject.id === id)?.shortName || id}</option>)}
          </select>
        </div>
      </Card>

      {tab === 'formulas' && (
        formulas.length ? (
          <div className="formula-library-grid">
            {formulas.map((formula) => (
              <Card key={formula.id} className="formula-library-card">
                <div className="formula-lib-head">
                  <Badge tone="indigo">{formula.chapterName}</Badge>
                  <button className="icon-btn ghost" onClick={() => void copyFormula(formula.statement)} aria-label="Copy formula"><Copy size={15} /></button>
                </div>
                <h3>{formula.name}</h3>
                <div className="formula-lib-body"><RichText text={formula.statement} /></div>
                {formula.example && <p className="formula-example"><Target size={14} /> {formula.example}</p>}
                <button className="link-arrow" onClick={() => navigate(`/courses/${formula.subjectId}/${formula.chapterId}?tab=theorems`)}>Open theorem <ArrowRight size={14} /></button>
              </Card>
            ))}
          </div>
        ) : <EmptyState icon={<BookOpen size={24} />} title="No formulas match" description="Clear the search or switch the subject filter." action={<Button variant="secondary" onClick={() => { setQuery(''); setSubjectId('all'); }}>Reset filters</Button>} />
      )}

      {tab === 'shortcuts' && (
        shortcuts.length ? (
          <div className="library-stack">
            {shortcuts.map((shortcut) => {
              const item = shortcut as {
                id: string; title?: string; name?: string; concept?: string; chapterName: string; subjectId: string; chapterId: string;
                examples?: { problem?: string; steps?: string[]; regular_method?: string; explanation?: string }[];
                real_numbers_application?: string;
              };
              return (
                <Card key={item.id} className="shortcut-library-card">
                  <div className="shortcut-head">
                    <span className="shortcut-icon"><Zap size={18} /></span>
                    <div><div className="eyebrow">{item.chapterName}</div><h3>{item.title || item.name}</h3></div>
                    <Badge tone="saffron">Speed</Badge>
                  </div>
                  {item.concept && <p>{item.concept}</p>}
                  {item.real_numbers_application && <p className="muted">{item.real_numbers_application}</p>}
                  {item.examples?.map((example, index) => (
                    <div key={index} className="mini-example">
                      <strong>{example.problem}</strong>
                      {example.explanation && <p>{example.explanation}</p>}
                      {example.steps && <ol>{example.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>}
                      {example.regular_method && <small>Regular method: {example.regular_method}</small>}
                    </div>
                  ))}
                  <button className="link-arrow" onClick={() => navigate(`/courses/${item.subjectId}/${item.chapterId}?tab=revision`)}>Open in chapter <ArrowRight size={14} /></button>
                </Card>
              );
            })}
          </div>
        ) : <EmptyState icon={<Zap size={24} />} title="No shortcuts match" description="Try another subject or a broader search." />
      )}

      {tab === 'flashcards' && (
        activeCard ? (
          <div className="flashcard-layout">
            <div className="flashcard-main">
              <button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((value) => !value)} aria-label="Flip flashcard">
                <div className="flashcard-inner">
                  <div className="flashcard-face front">
                    <span className="eyebrow">{activeCard.difficulty} · {activeCard.chapterName}</span>
                    <h3>{activeCard.front}</h3>
                    <small>Tap to reveal the answer</small>
                  </div>
                  <div className="flashcard-face back">
                    <span className="eyebrow"><Sparkles size={13} /> Answer</span>
                    <p>{activeCard.back || 'Review the chapter for the full explanation.'}</p>
                    {activeCard.options && activeCard.correct !== undefined && <div className="flash-answer"><Check size={15} /> {activeCard.options[activeCard.correct]}</div>}
                    <small>Tap to flip back</small>
                  </div>
                </div>
              </button>
              <div className="flashcard-controls">
                <Button variant="secondary" icon={<ChevronLeft size={15} />} onClick={() => moveCard(-1)}>Previous</Button>
                <span>{cardIndex + 1} / {flashcards.length}</span>
                <Button variant="secondary" onClick={() => moveCard(1)}>Next <ChevronRight size={15} /></Button>
                <Button variant="ghost" icon={<RotateCcw size={14} />} onClick={() => { setCardIndex(0); setFlipped(false); }}>Restart</Button>
              </div>
            </div>
            <aside className="flashcard-rail">
              <Card>
                <div className="eyebrow">Card map</div>
                <div className="flash-map">
                  {flashcards.map((card, index) => (
                    <button key={card.id} className={index === cardIndex ? 'active' : ''} onClick={() => { setCardIndex(index); setFlipped(false); }}>{index + 1}</button>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="eyebrow">How to use</div>
                <p>Answer out loud before flipping. If you hesitate for more than five seconds, mark it for a second pass tomorrow.</p>
                <button className="link-arrow" onClick={() => navigate(`/courses/${activeCard.subjectId}/${activeCard.chapterId}?tab=learn`)}>Review source chapter <ArrowRight size={14} /></button>
              </Card>
            </aside>
          </div>
        ) : <EmptyState icon={<Sparkles size={24} />} title="No flashcards match" description="Clear the search or choose another subject." />
      )}
    </div>
  );
}
