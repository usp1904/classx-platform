import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileQuestion,
  ListChecks,
  Play,
  RotateCcw,
  ScrollText,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import type { ExamKey, ExamPaper, PracticeResult } from '../types';
import { useApp } from '../lib/store';
import { Badge, Button, Card, ProgressBar, ProgressRing, SectionHeader, Stat } from '../components/ui';
import { RichText } from '../components/RichText';

const countPresets = {
  quick: { mcq: 10, short: 3, long: 2 },
  standard: { mcq: 20, short: 8, long: 5 },
  full: { mcq: 30, short: 12, long: 8 },
};

type PaperMode = keyof typeof countPresets;

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function MockTests() {
  const { curriculum, progress, recordExam, notify } = useApp();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState('mathematics');
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<PaperMode>('standard');
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [key, setKey] = useState<ExamKey | null>(null);
  const [selfMarks, setSelfMarks] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const subject = curriculum?.subjects.find((item) => item.id === subjectId) || curriculum?.subjects[0];
  const chapters = useMemo(() => (subject?.chapters || []).filter((chapter) => chapter.hasContent), [subject]);
  const chosen = selected.length ? chapters.filter((chapter) => selected.includes(chapter.id)) : chapters;
  const counts = countPresets[mode];
  const totalMcq = subject?.chapters.reduce((sum, chapter) => sum + chapter.stats.quizzes, 0) || 0;

  useEffect(() => {
    if (!paper || result || !startedAt) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [paper, result, startedAt]);

  const toggleChapter = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setKey(null);
    setAnswers({});
    setWritten({});
    setSelfMarks({});
    setElapsed(0);
    try {
      const next = await api.generateExam({
        subjectId,
        chapterIds: selected.length ? selected : undefined,
        counts: countPresets[mode],
      });
      setPaper(next);
      setStartedAt(Date.now());
      notify(`${next.totalMarks}-mark paper generated`, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Could not generate paper');
    } finally {
      setLoading(false);
    }
  };

  const revealKey = async () => {
    if (!paper) return;
    setLoading(true);
    setError(null);
    try {
      const nextKey = await api.examKey(paper.paperId);
      setKey(nextKey);
      setSelfMarks(Object.fromEntries(nextKey.subjective.map((item) => [item.id, selfMarks[item.id] ?? 0])));
      notify('Model answers revealed. Self-mark the written section honestly.', 'info');
    } catch (keyError) {
      setError(keyError instanceof Error ? keyError.message : 'Could not reveal the key');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!paper) return;
    if (!key && !window.confirm('Reveal and self-mark the written section first for a full score. Submit with 0 written marks anyway?')) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = await api.submitExam(paper.paperId, answers, selfMarks);
      setResult(payload);
      recordExam(payload, subjectId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit paper');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setPaper(null);
    setResult(null);
    setAnswers({});
    setWritten({});
    setKey(null);
    setSelfMarks({});
    setElapsed(0);
    setStartedAt(null);
  };

  const remaining = paper ? paper.durationMin * 60 - elapsed : 0;
  const objective = paper?.sections.filter((section) => section.id === 'A') || [];
  const writtenSections = paper?.sections.filter((section) => section.id !== 'A') || [];
  const objectiveCount = objective.reduce((sum, section) => sum + section.questions.length, 0);

  return (
    <div className="page mock-page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><FileQuestion size={14} /> Board simulator</div>
          <h1>Build a real board paper.</h1>
          <p>Objective auto-scoring, written-section model answers, and honest self-marking. Generate, attempt, then review.</p>
        </div>
        <div className="head-metrics">
          <div><strong>{progress.exams.length}</strong><small>papers attempted</small></div>
          <div><strong>{progress.exams.length ? Math.round(progress.exams.reduce((sum, exam) => sum + (exam.score / exam.total) * 100, 0) / progress.exams.length) : 0}%</strong><small>average score</small></div>
          <div><strong>{totalMcq}</strong><small>objective questions</small></div>
        </div>
      </div>

      {!paper && (
        <>
          <div className="stat-grid four">
            <Stat icon={<Target size={18} />} label="Objective pool" value={totalMcq} hint="MCQs across authored chapters" tone="indigo" />
            <Stat icon={<ScrollText size={18} />} label="Written pool" value={subject?.chapters.reduce((sum, chapter) => sum + chapter.stats.exercises, 0) || 0} hint="Steps + model answers" tone="mint" />
            <Stat icon={<Clock3 size={18} />} label="Paper length" value={`${countPresets[mode].mcq + countPresets[mode].short + countPresets[mode].long} Q`} hint="Adjustable blueprint" tone="saffron" />
            <Stat icon={<Trophy size={18} />} label="Last score" value={progress.exams[0] ? `${Math.round((progress.exams[0].score / progress.exams[0].total) * 100)}%` : '—'} hint={progress.exams[0] ? new Date(progress.exams[0].at).toLocaleDateString('en-IN') : 'No paper yet'} tone="rose" />
          </div>

          <div className="mock-layout">
            <Card className="mock-config">
              <SectionHeader eyebrow="Step 1" title="Subject and chapters" description="Choose a focused set or leave all chapters selected for a full-subject paper." />
              <div className="practice-subject-grid compact-grid">
                {curriculum?.subjects.map((item) => (
                  <button
                    key={item.id}
                    className={`practice-subject ${item.id === subjectId ? 'active' : ''}`}
                    onClick={() => { setSubjectId(item.id); setSelected([]); }}
                  >
                    <span className={`subject-dot accent-${item.accent}`} />
                    <span><strong>{item.shortName}</strong><small>{item.chapters.filter((chapter) => chapter.hasContent).length} authored</small></span>
                    {item.id === subjectId && <CheckCircle2 size={17} />}
                  </button>
                ))}
              </div>
              <div className="chapter-check-grid">
                {chapters.map((chapter) => (
                  <label key={chapter.id} className={selected.includes(chapter.id) ? 'checked' : ''}>
                    <input type="checkbox" checked={selected.includes(chapter.id)} onChange={() => toggleChapter(chapter.id)} />
                    <span className="fake-check">{selected.includes(chapter.id) && <Check size={12} />}</span>
                    <span><strong>{chapter.name}</strong><small>{chapter.stats.quizzes} MCQ · {chapter.stats.exercises} written</small></span>
                  </label>
                ))}
                {!chapters.length && <p className="form-note">No authored question bank for this subject yet. Select Mathematics.</p>}
              </div>

              <SectionHeader eyebrow="Step 2" title="Paper blueprint" description="No negative marking. Written questions are self-marked against the model answer." />
              <div className="blueprint-grid">
                {(Object.keys(countPresets) as PaperMode[]).map((preset) => (
                  <button key={preset} className={`blueprint-card ${mode === preset ? 'active' : ''}`} onClick={() => setMode(preset)}>
                    <span className="eyebrow">{preset}</span>
                    <strong>{countPresets[preset].mcq + countPresets[preset].short + countPresets[preset].long} questions</strong>
                    <small>{countPresets[preset].mcq} MCQ · {countPresets[preset].short} short · {countPresets[preset].long} long</small>
                  </button>
                ))}
              </div>

              {error && <div className="inline-error"><AlertCircle size={16} /> {error}</div>}
              <div className="mock-launch">
                <div>
                  <strong>{chosen.length} chapter{chosen.length === 1 ? '' : 's'} in scope</strong>
                  <small>Estimated {Math.max(30, Math.round((counts.mcq + counts.short * 3 + counts.long * 5) * 1.2))} minutes · {counts.mcq * 1 + counts.short * 3 + counts.long * 5} marks approx.</small>
                </div>
                <Button icon={<Play size={16} />} onClick={() => void generate()} loading={loading}>Generate paper</Button>
              </div>
            </Card>

            <aside className="mock-rail">
              <Card className="exam-rules">
                <div className="eyebrow"><ListChecks size={14} /> How it works</div>
                <h3>Three honest phases</h3>
                <ol>
                  <li><strong>Attempt</strong> objective and written questions without notes.</li>
                  <li><strong>Reveal</strong> the written model answers and self-mark each question.</li>
                  <li><strong>Submit</strong> to combine auto-scored MCQs with your written marks.</li>
                </ol>
              </Card>
              <Card>
                <div className="eyebrow"><CalendarCheck2 size={14} /> Recent papers</div>
                <div className="history-list">
                  {progress.exams.slice(0, 5).map((exam, index) => (
                    <div key={`${exam.at}-${index}`}>
                      <span>{new Date(exam.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <strong>{exam.score}/{exam.total}</strong>
                      <Badge tone={(exam.score / exam.total) >= 0.7 ? 'mint' : 'saffron'}>{Math.round((exam.score / exam.total) * 100)}%</Badge>
                    </div>
                  ))}
                  {!progress.exams.length && <p className="muted">No mock attempted yet.</p>}
                </div>
              </Card>
              <Card className="practice-tip">
                <Sparkles size={20} />
                <h3>Board-mode rule</h3>
                <p>Write the formula, substitution, and final unit. Most lost marks are presentation, not knowledge.</p>
              </Card>
            </aside>
          </div>
        </>
      )}

      {paper && (
        <div className="exam-shell">
          <div className="exam-header">
            <div>
              <div className="eyebrow">{paper.subjectName} · mock paper</div>
              <h2>{paper.totalMarks} marks · {paper.durationMin} minutes</h2>
              <p>{paper.sections.length} sections · {paper.sections.reduce((sum, section) => sum + section.questions.length, 0)} questions</p>
            </div>
            <div className="exam-clock">
              <Clock3 size={18} />
              <div><strong>{formatTime(remaining)}</strong><small>{remaining <= 0 ? 'time over' : 'remaining'}</small></div>
            </div>
            <Button variant="secondary" size="sm" onClick={reset} icon={<RotateCcw size={14} />}>Discard</Button>
          </div>

          {!result && (
            <Card className="exam-instructions">
              <div className="eyebrow"><ScrollText size={14} /> Instructions</div>
              <ul>{paper.instructions.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </Card>
          )}

          {result ? (
            <div className="exam-result">
              <Card className="result-card">
                <div className="result-hero">
                  <ProgressRing value={result.percentage} size={112} stroke={8} color={result.percentage >= 70 ? 'var(--mint)' : result.percentage >= 40 ? 'var(--saffron)' : 'var(--rose)'} />
                  <div>
                    <Badge tone={result.percentage >= 70 ? 'mint' : result.percentage >= 40 ? 'saffron' : 'rose'}>
                      {result.percentage >= 85 ? 'Board ready' : result.percentage >= 70 ? 'Strong pass' : result.percentage >= 40 ? 'Needs targeted revision' : 'Rebuild fundamentals'}
                    </Badge>
                    <h2>{result.score} / {result.total} marks</h2>
                    <p>Objective section auto-scored. Written section based on your self-marking.</p>
                  </div>
                </div>
                <div className="result-actions">
                  <Button icon={<RotateCcw size={15} />} onClick={reset}>New paper</Button>
                </div>
              </Card>

              <div className="review-list">
                {result.review.map((item, index) => (
                  <Card key={item.id} className={`review-item ${item.type === 'mcq' ? (item.correct ? 'correct' : 'wrong') : ''}`}>
                    <div className="review-head">
                      <span className="review-index">{index + 1}</span>
                      <div><strong>{item.question}</strong><small>{item.chapterName} · {item.marks} mark{item.marks === 1 ? '' : 's'}</small></div>
                      {item.type === 'mcq' ? (item.correct ? <CheckCircle2 className="ok" size={20} /> : <XCircle className="bad" size={20} />) : <Badge tone={item.awarded === item.marks ? 'mint' : 'saffron'}>{item.awarded ?? 0}/{item.marks}</Badge>}
                    </div>
                    {item.type === 'mcq' && item.options && (
                      <div className="review-options">
                        {item.options.map((option, optionIndex) => (
                          <div key={optionIndex} className={`review-option ${optionIndex === item.correctIndex ? 'right' : ''} ${optionIndex === item.selected && optionIndex !== item.correctIndex ? 'picked-wrong' : ''}`}>
                            <span>{String.fromCharCode(65 + optionIndex)}</span>{option}{optionIndex === item.correctIndex && <Check size={14} />}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.explanation && <p className="review-explanation"><strong>Why:</strong> {item.explanation}</p>}
                    {item.steps && <ol className="review-steps">{item.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>}
                    {item.answer && <p className="review-answer"><strong>Model answer:</strong> {item.answer}</p>}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="exam-body">
              <div className="exam-sections">
                {paper.sections.map((section) => (
                  <section key={section.id} className="exam-section">
                    <div className="exam-section-head">
                      <div><Badge tone="indigo">Section {section.id}</Badge><h3>{section.title}</h3><p>{section.instruction}</p></div>
                      <strong>{section.marks} marks</strong>
                    </div>
                    {section.questions.map((question, questionIndex) => {
                      const keyItem = key?.subjective.find((item) => item.id === question.id);
                      return (
                        <Card key={question.id} className="exam-question" id={`exam-q-${question.id}`}>
                          <div className="exam-q-head">
                            <span className="review-index">{questionIndex + 1}</span>
                            <div><strong>{question.question}</strong><small>{question.chapterName} · {question.marks} mark{question.marks === 1 ? '' : 's'}</small></div>
                            <Badge tone="neutral">{question.difficulty}</Badge>
                          </div>
                          {question.type === 'mcq' && (
                            <div className="option-list">
                              {question.options?.map((option, optionIndex) => (
                                <button
                                  key={optionIndex}
                                  className={`option-btn ${answers[question.id] === optionIndex ? 'selected' : ''}`}
                                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                                  disabled={Boolean(key)}
                                >
                                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                                  <span>{option}</span>
                                  {answers[question.id] === optionIndex && <Check size={17} />}
                                </button>
                              ))}
                            </div>
                          )}
                          {question.type !== 'mcq' && (
                            <div className="written-answer">
                              <label htmlFor={`written-${question.id}`}>Your answer</label>
                              <textarea
                                id={`written-${question.id}`}
                                value={written[question.id] || ''}
                                onChange={(event) => setWritten((current) => ({ ...current, [question.id]: event.target.value }))}
                                placeholder="Write the formula, substitution, and reasoning. Fixed outline, not prose."
                                rows={4}
                                disabled={Boolean(key)}
                              />
                              {keyItem && (
                                <div className="answer-key">
                                  <div className="answer-key-label"><Eye size={15} /> Model answer</div>
                                  {keyItem.steps && <ol>{keyItem.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>}
                                  {keyItem.answer && <p><strong>Final answer:</strong> {keyItem.answer}</p>}
                                  <label className="self-mark">
                                    <span>Self-mark</span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={question.marks}
                                      value={selfMarks[question.id] ?? 0}
                                      onChange={(event) => setSelfMarks((current) => ({ ...current, [question.id]: Math.max(0, Math.min(question.marks, Number(event.target.value) || 0)) }))}
                                    />
                                    <small>/ {question.marks}</small>
                                  </label>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </section>
                ))}
              </div>

              <aside className="exam-submit-rail">
                <Card>
                  <div className="eyebrow"><ListChecks size={14} /> Attempt progress</div>
                  <div className="exam-progress-line"><span>Objective answered</span><strong>{Object.keys(answers).length}/{objectiveCount}</strong></div>
                  <ProgressBar value={objectiveCount ? (Object.keys(answers).length / objectiveCount) * 100 : 0} height={6} />
                  <div className="exam-progress-line"><span>Written notes saved</span><strong>{Object.values(written).filter(Boolean).length}/{paper.sections.reduce((sum, section) => sum + section.questions.filter((question) => question.type !== 'mcq').length, 0)}</strong></div>
                  {!key ? (
                    <>
                      <Button variant="secondary" icon={<Eye size={15} />} onClick={() => void revealKey()} loading={loading}>Reveal & self-mark</Button>
                      <p className="palette-hint">Reveals written model answers. MCQ answers stay locked.</p>
                    </>
                  ) : (
                    <>
                      <div className="self-score-total">
                        <span>Written score</span>
                        <strong>{Object.values(selfMarks).reduce((sum, value) => sum + value, 0)} / {writtenSections.reduce((sum, section) => sum + section.questions.reduce((inner, question) => inner + question.marks, 0), 0)}</strong>
                      </div>
                      <Button icon={<CheckCircle2 size={16} />} onClick={() => void submit()} loading={submitting}>Submit paper</Button>
                    </>
                  )}
                  {error && <div className="inline-error"><AlertCircle size={15} /> {error}</div>}
                  <button className="link-arrow" onClick={reset}><ArrowLeft size={14} /> Discard and rebuild</button>
                </Card>
                <Card className="practice-tip">
                  <Clock3 size={20} />
                  <h3>{remaining > 0 ? `${Math.ceil(remaining / 60)} minutes left` : 'Time is up'}</h3>
                  <p>Aim for one mark per minute. Leave a written question blank only after writing the governing formula.</p>
                </Card>
              </aside>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
