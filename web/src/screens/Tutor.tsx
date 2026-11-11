import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Compass,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import type { Citation, TutorResponse } from '../types';
import { useApp } from '../lib/store';
import { Badge, Button, Card, SectionHeader, Segmented } from '../components/ui';
import { RichText } from '../components/RichText';

type Mode = 'socratic' | 'board' | 'competitive';

interface Message {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  response?: TutorResponse;
}

const modes = [
  { id: 'socratic' as const, label: 'Socratic' },
  { id: 'board' as const, label: 'Board mode' },
  { id: 'competitive' as const, label: 'JEE / NEET' },
];

const modeCopy: Record<Mode, { title: string; description: string; icon: ReactNode }> = {
  socratic: { title: 'Socratic tutor', description: 'Asks the next question instead of dumping the answer.', icon: <Compass size={16} /> },
  board: { title: 'Board answer', description: 'Full-marks structure: given, formula, steps, conclusion.', icon: <ScrollText size={16} /> },
  competitive: { title: 'Competitive edge', description: 'Shortcut, pattern recognition, and time saved.', icon: <Zap size={16} /> },
};

const starterPrompts: Record<string, string[]> = {
  mathematics: [
    'Why is the square root of 2 irrational?',
    'Explain the golden step in 85² without the full expansion.',
    'How do I know whether to use the section formula or midpoint formula?',
    'Walk me through a 3-mark board answer for an HCF proof.',
  ],
  science: [
    'What is the difference between ionic and covalent bonding?',
    'How should I structure a 5-mark life-processes answer?',
    'Explain refraction using a ray diagram, step by step.',
  ],
  'social-science': [
    'What caused the rise of nationalism in Europe?',
    'How do I answer a source-based history question?',
    'Explain federalism with two Indian examples.',
  ],
  english: [
    'How do I structure a letter to the editor?',
    'Give me a thesis statement for a character analysis.',
    'How should I approach an unseen passage?',
  ],
};

function CitationCard({ citation, onOpen }: { citation: Citation; onOpen: () => void }) {
  return (
    <button className="citation-card" onClick={onOpen}>
      <span className={`citation-type type-${citation.type}`}>{citation.type}</span>
      <span>
        <strong>{citation.title}</strong>
        <small>{citation.chapter} · {citation.subject}{citation.page ? ` · p. ${citation.page}` : ''}</small>
      </span>
      <ExternalLink size={13} />
    </button>
  );
}

export default function Tutor() {
  const { curriculum } = useApp();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('socratic');
  const [subjectId, setSubjectId] = useState(params.get('subject') || '');
  const [chapterId, setChapterId] = useState(params.get('chapter') || '');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const subject = curriculum?.subjects.find((item) => item.id === subjectId);
  const chapters = subject?.chapters || [];
  const chapter = chapters.find((item) => item.id === chapterId);
  const prompts = starterPrompts[subjectId] || starterPrompts.mathematics;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    if (!subjectId && curriculum?.subjects.length) setSubjectId(curriculum.subjects[0].id);
  }, [curriculum, subjectId]);

  const setContext = (nextSubject: string, nextChapter: string) => {
    setSubjectId(nextSubject);
    setChapterId(nextChapter);
    const next = new URLSearchParams(params);
    if (nextSubject) next.set('subject', nextSubject); else next.delete('subject');
    if (nextChapter) next.set('chapter', nextChapter); else next.delete('chapter');
    setParams(next, { replace: true });
  };

  const ask = async (override?: string) => {
    const content = (override ?? question).trim();
    if (!content || loading) return;
    const userMessage: Message = { id: `u-${Date.now()}`, role: 'user', text: content };
    const history = messages.slice(-6).map((message) => ({ role: message.role === 'tutor' ? 'assistant' : 'user', content: message.text }));
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setLoading(true);
    setError(null);
    try {
      const response = await api.tutor({ question: content, mode, subjectId: subjectId || undefined, chapterId: chapterId || undefined, history });
      setMessages((current) => [...current, { id: `t-${Date.now()}`, role: 'tutor', text: response.answer, response }]);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : 'The tutor could not answer that.');
    } finally {
      setLoading(false);
      textAreaRef.current?.focus();
    }
  };

  const openCitation = (citation: Citation) => {
    const tab = citation.type === 'theorem'
      ? 'theorems'
      : citation.type === 'example' || citation.type === 'exercise'
        ? 'examples'
        : citation.type === 'quiz' || citation.type === 'practice'
          ? 'practice'
          : ['mindmap', 'flowchart', 'shortcut', 'conceptmap'].includes(citation.type)
            ? 'revision'
            : 'learn';
    navigate(`/courses/${citation.subjectId}/${citation.chapterId}?tab=${tab}&anchor=${encodeURIComponent(citation.anchor)}`);
  };

  return (
    <div className="page tutor-page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><Sparkles size={14} /> Grounded AI tutor</div>
          <h1>Ask the chapter, not the internet.</h1>
          <p>Every answer is retrieved from the CBSE syllabus, authored lessons, and question bank — with citations.</p>
        </div>
        <div className="tutor-head-badges">
          <Badge tone="mint"><ShieldCheck size={13} /> Source-grounded</Badge>
          <Badge tone="indigo"><BrainCircuit size={13} /> Hybrid retrieval</Badge>
        </div>
      </div>

      <div className="tutor-layout">
        <aside className="tutor-context">
          <Card>
            <SectionHeader eyebrow="Context" title="What should the tutor read?" />
            <label className="field-label">Subject</label>
            <div className="select-wrap">
              <select value={subjectId} onChange={(event) => setContext(event.target.value, '')} aria-label="Tutor subject">
                {curriculum?.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <label className="field-label">Chapter</label>
            <div className="select-wrap">
              <select value={chapterId} onChange={(event) => setContext(subjectId, event.target.value)} aria-label="Tutor chapter">
                <option value="">All chapters in this subject</option>
                {chapters.map((item) => <option key={item.id} value={item.id}>{item.number}. {item.name}</option>)}
              </select>
            </div>
            {chapter && (
              <div className="context-summary">
                <strong>{chapter.name}</strong>
                <small>{chapter.unitName} · {chapter.stats.quizzes} MCQs · {chapter.hasContent ? 'authored' : 'syllabus map'}</small>
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader eyebrow="Answer style" title="Choose a mode" />
            <div className="mode-list">
              {(Object.keys(modeCopy) as Mode[]).map((item) => (
                <button key={item} className={`mode-card ${mode === item ? 'active' : ''}`} onClick={() => setMode(item)}>
                  <span className="mode-icon">{modeCopy[item].icon}</span>
                  <span><strong>{modeCopy[item].title}</strong><small>{modeCopy[item].description}</small></span>
                </button>
              ))}
            </div>
            <Segmented items={modes} value={mode} onChange={setMode} ariaLabel="Tutor mode" />
          </Card>

          <Card className="tutor-honesty">
            <ShieldCheck size={20} />
            <h3>No hallucinated notes</h3>
            <p>If retrieval does not cover the question, the tutor says so and points at the syllabus boundary instead of inventing an answer.</p>
          </Card>
        </aside>

        <section className="tutor-chat">
          <div className="chat-topline">
            <div>
              <span className="pulse-dot" />
              <strong>{chapter ? chapter.name : subject?.name || 'Class X'}</strong>
              <small>{modeCopy[mode].title}</small>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" icon={<MessageSquarePlus size={15} />} onClick={() => setMessages([])}>New chat</Button>
            )}
          </div>

          <div className="chat-scroll">
            {!messages.length && (
              <div className="chat-empty">
                <div className="chat-empty-icon"><GraduationCap size={30} /></div>
                <h2>What is blocking you right now?</h2>
                <p>Ask a concept, a proof step, a board-answer structure, or a speed shortcut. The tutor will retrieve the exact chapter context first.</p>
                <div className="prompt-grid">
                  {prompts.map((prompt) => (
                    <button key={prompt} onClick={() => void ask(prompt)}>
                      <Lightbulb size={15} />
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={message.id} className={`chat-message ${message.role}`}>
                <div className="chat-avatar">{message.role === 'tutor' ? <Sparkles size={16} /> : 'You'}</div>
                <div className="chat-bubble">
                  {message.role === 'user' ? <p>{message.text}</p> : <RichText text={message.text} />}
                  {message.response && (
                    <>
                      <div className="chat-meta-row">
                        <span><Timer size={13} /> {message.response.retrieval.latencyMs} ms</span>
                        <span><Target size={13} /> {message.response.retrieval.candidates} candidates</span>
                        <span><BookOpen size={13} /> {message.response.retrieval.strategy}</span>
                        {message.response.provider?.mode === 'grounded-fallback' && <Badge tone="saffron">grounded fallback</Badge>}
                      </div>
                      {message.response.sources.length > 0 && (
                        <div className="citation-strip">
                          {message.response.sources.slice(0, 4).map((citation) => (
                            <CitationCard key={citation.chunkId} citation={citation} onOpen={() => openCitation(citation)} />
                          ))}
                        </div>
                      )}
                      {message.response.retrieval.providerError && (
                        <div className="provider-warning"><AlertSmall /> {message.response.retrieval.providerError}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message tutor">
                <div className="chat-avatar"><Sparkles size={16} /></div>
                <div className="chat-bubble typing"><Loader2 size={16} className="spin" /> Retrieving chapter context and composing an answer…</div>
              </div>
            )}
            {error && <div className="inline-error"><ChevronDown size={15} /> {error}</div>}
            <div ref={endRef} />
          </div>

          <div className="chat-composer">
            <textarea
              ref={textAreaRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void ask();
                }
              }}
              placeholder={`Ask about ${chapter?.name || subject?.name || 'Class X'}…`}
              rows={2}
              aria-label="Ask the tutor"
            />
            <button className="send-btn" onClick={() => void ask()} disabled={!question.trim() || loading} aria-label="Send question">
              {loading ? <Loader2 size={18} className="spin" /> : <ArrowUp size={18} />}
            </button>
            <div className="composer-hint">Enter to send · Shift + Enter for a new line · answers cite retrieved chunks</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AlertSmall() {
  return <span className="alert-dot">!</span>;
}
