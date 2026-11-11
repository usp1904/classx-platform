import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, RotateCcw, Target, XCircle } from 'lucide-react';
import { api } from '../api';
import type { PracticeQuestion, PracticeResult } from '../types';
import { Badge, Button, Card, ProgressBar, ProgressRing } from './ui';

interface Props {
  subjectId: string;
  chapterId?: string;
  count?: number;
  difficulty?: string;
  onComplete?: (result: PracticeResult) => void;
  compact?: boolean;
}

export function PracticeRunner({ subjectId, chapterId, count = 10, difficulty, onComplete, compact = false }: Props) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const started = useRef(false);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    setIndex(0);
    try {
      const session = await api.startPractice({ subjectId, chapterId, count, difficulty });
      setQuestions(session.questions);
      setSessionId(session.sessionId);
      setDuration(session.durationMin * 60);
      setSeconds(0);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Could not start practice');
    } finally {
      setLoading(false);
    }
  }, [subjectId, chapterId, count, difficulty]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  const submit = useCallback(async () => {
    if (!sessionId || submitting) return;
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0 && !window.confirm(`${unanswered} question${unanswered === 1 ? '' : 's'} unanswered. Submit anyway?`)) return;
    setSubmitting(true);
    try {
      const payload = await api.submitPractice(sessionId, answers);
      setResult(payload);
      onComplete?.(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit practice');
    } finally {
      setSubmitting(false);
    }
  }, [answers, onComplete, questions.length, sessionId, submitting]);

  useEffect(() => {
    if (result || loading || !sessionId || seconds >= duration) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [duration, loading, result, seconds, sessionId]);

  useEffect(() => {
    if (duration && seconds >= duration && sessionId && !result && !submitting) {
      void submit();
    }
  }, [duration, result, seconds, sessionId, submit, submitting]);

  if (loading) {
    return <Card className="runner-loading"><div className="loader-ring" /><span>Selecting grounded questions…</span></Card>;
  }
  if (error) {
    return <Card className="empty-state"><h3>Practice unavailable</h3><p>{error}</p><Button variant="secondary" onClick={() => void start()}>Try another set</Button></Card>;
  }

  if (result) {
    const wrong = result.review.filter((item) => item.type === 'mcq' && item.correct === false);
    return (
      <Card className={`result-card ${compact ? 'compact' : ''}`}>
        <div className="result-hero">
          <ProgressRing value={result.percentage} size={104} stroke={8} color={result.percentage >= 70 ? 'var(--mint)' : result.percentage >= 40 ? 'var(--saffron)' : 'var(--rose)'} />
          <div>
            <Badge tone={result.percentage >= 70 ? 'mint' : result.percentage >= 40 ? 'saffron' : 'rose'}>
              {result.percentage >= 85 ? 'Excellent' : result.percentage >= 70 ? 'On track' : result.percentage >= 40 ? 'Needs revision' : 'Rebuild the concept'}
            </Badge>
            <h2>{result.score} / {result.total} marks</h2>
            <p>{result.attempted} of {result.questionCount} attempted · {result.accuracy}% accuracy on MCQs</p>
          </div>
        </div>
        <div className="result-actions">
          <Button icon={<RotateCcw size={15} />} onClick={() => void start()}>New set</Button>
        </div>
        {wrong.length > 0 && <div className="result-note"><XCircle size={16} /> {wrong.length} MCQ{wrong.length === 1 ? '' : 's'} need review. Read the explanation and name the misconception before retrying.</div>}
        <div className="review-list">
          {result.review.map((item, reviewIndex) => (
            <div key={item.id} className={`review-item ${item.type === 'mcq' ? (item.correct ? 'correct' : 'wrong') : ''}`}>
              <div className="review-head">
                <span className="review-index">{reviewIndex + 1}</span>
                <div>
                  <strong>{item.question}</strong>
                  <small>{item.chapterName} · {item.marks} mark{item.marks === 1 ? '' : 's'}</small>
                </div>
                {item.type === 'mcq' && (item.correct ? <CheckCircle2 className="ok" size={20} /> : <XCircle className="bad" size={20} />)}
              </div>
              {item.type === 'mcq' && item.options && (
                <div className="review-options">
                  {item.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`review-option ${optionIndex === item.correctIndex ? 'right' : ''} ${optionIndex === item.selected && optionIndex !== item.correctIndex ? 'picked-wrong' : ''}`}
                    >
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      {option}
                      {optionIndex === item.correctIndex && <Check size={14} />}
                    </div>
                  ))}
                </div>
              )}
              {item.explanation && <p className="review-explanation"><strong>Why:</strong> {item.explanation}</p>}
              {item.steps && item.steps.length > 0 && (
                <ol className="review-steps">{item.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>
              )}
              {item.answer && <p className="review-answer"><strong>Model answer:</strong> {item.answer}</p>}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!questions.length) {
    return <Card className="empty-state"><h3>No grounded questions yet</h3><p>This chapter is mapped but its question bank is still being authored.</p><Button variant="secondary" onClick={() => void start()}>Retry</Button></Card>;
  }

  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const remaining = Math.max(0, duration - seconds);
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <Card className={`practice-runner ${compact ? 'compact' : ''}`}>
      <div className="runner-head">
        <div>
          <div className="eyebrow"><Target size={14} /> Practice set</div>
          <strong>{question.chapterName}</strong>
        </div>
        <div className="runner-head-right">
          <span className={`timer ${remaining < 60 ? 'urgent' : ''}`}><Clock3 size={15} /> {time}</span>
          <Badge tone="neutral">{question.difficulty}</Badge>
        </div>
      </div>
      <ProgressBar value={(answeredCount / questions.length) * 100} height={5} />
      <div className="runner-layout">
        <div className="runner-question">
          <div className="q-meta"><span>Question {index + 1} of {questions.length}</span><span>{question.marks} mark{question.marks === 1 ? '' : 's'}</span></div>
          <h3>{question.question}</h3>
          <div className="option-list" role="radiogroup" aria-label="Answer options">
            {question.options?.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              return (
                <button
                  key={optionIndex}
                  role="radio"
                  aria-checked={selected}
                  className={`option-btn ${selected ? 'selected' : ''}`}
                  onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                >
                  <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                  <span>{option}</span>
                  {selected && <Check size={17} />}
                </button>
              );
            })}
          </div>
          <div className="runner-nav">
            <Button variant="ghost" icon={<ArrowLeft size={15} />} disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>Previous</Button>
            {index === questions.length - 1 ? (
              <Button icon={<Check size={16} />} loading={submitting} onClick={() => void submit()}>Submit set</Button>
            ) : (
              <Button icon={<ArrowRight size={15} />} onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>Next</Button>
            )}
          </div>
        </div>
        {!compact && (
          <aside className="question-palette">
            <div className="palette-head"><strong>Question map</strong><small>{answeredCount}/{questions.length} answered</small></div>
            <div className="palette-dots">
              {questions.map((item, itemIndex) => (
                <button
                  key={item.id}
                  className={`${answers[item.id] !== undefined ? 'answered' : ''} ${itemIndex === index ? 'current' : ''}`}
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Go to question ${itemIndex + 1}`}
                >
                  {itemIndex + 1}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => void submit()} loading={submitting}>Submit early</Button>
            <p className="palette-hint">No negative marking. Answer every question before time runs out.</p>
          </aside>
        )}
      </div>
    </Card>
  );
}
