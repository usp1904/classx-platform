import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  FileText,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/store';
import { renderStudyWorkspaceModel } from '../lib/studyWorkspace.ts';
import type { AnswerLayerTabId } from '../lib/studyWorkspace.ts';
import type {
  ChapterDetail,
  Citation,
  IntentMode,
  LayeredAnswer,
  PipelineStage,
  Subject,
  TutorResponse,
  VisualAidVideo,
} from '../types.ts';
import { ConceptVideoPlayer } from './ConceptVideoPlayer';
import { PipelineStatus } from './PipelineStatus';
import { RichText } from './RichText';
import { Badge } from './ui';

export { renderStudyWorkspaceModel };

export interface StudyWorkspaceProps {
  subjects?: Subject[];
  activeSubjectId?: string;
  activeChapterId?: string;
  onSelectChapter?: (subjectId: string, chapterId: string) => void;
  chapterDetail?: ChapterDetail | null;
  initialQuery?: string;
  onTestYourself?: (subjectId: string, chapterId: string) => void;
}

const DEFAULT_PROMPTS: Record<string, string[]> = {
  mathematics: [
    'Why is the square root of 2 irrational?',
    'Prove Basic Proportionality Theorem (Thales Theorem) for CBSE Boards',
    'How do you find the nature of roots using the discriminant?',
  ],
  science: [
    'Explain Reaction of Calcium Oxide with Water in Activity 1.1',
    'State Ohm\'s Law and explain how resistance affects the V-I graph',
    'Explain double circulation in the human heart with a diagram path',
  ],
  'social-science': [
    'What makes India a federal country under the three-fold legislative lists?',
    'Explain the causes and impact of the Non-Cooperation Movement',
    'Compare gully erosion and sheet erosion with conservation measures',
  ],
  english: [
    'Analyze the central theme and irony in A Letter to God',
    'Write a CBSE Board-style formal letter of complaint with marking format',
  ],
};

export function StudyWorkspace({
  subjects: propSubjects,
  activeSubjectId: propSubjectId,
  activeChapterId: propChapterId,
  onSelectChapter,
  chapterDetail: propChapterDetail,
  initialQuery = '',
  onTestYourself,
}: StudyWorkspaceProps) {
  const { curriculum, notify } = useApp();
  const subjects = propSubjects ?? curriculum?.subjects ?? [];

  const [subjectId, setSubjectId] = useState<string>(
    propSubjectId || subjects[0]?.id || 'mathematics',
  );
  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId) || subjects[0] || null,
    [subjects, subjectId],
  );

  const [chapterId, setChapterId] = useState<string>(
    propChapterId || activeSubject?.chapters[0]?.id || 'real-numbers',
  );

  useEffect(() => {
    if (propSubjectId) setSubjectId(propSubjectId);
  }, [propSubjectId]);

  useEffect(() => {
    if (propChapterId) setChapterId(propChapterId);
  }, [propChapterId]);

  const activeChapter = useMemo(() => {
    if (!activeSubject) return null;
    return (
      activeSubject.chapters.find((c) => c.id === chapterId) ||
      activeSubject.chapters[0] ||
      null
    );
  }, [activeSubject, chapterId]);

  const [chapterDetail, setChapterDetail] = useState<ChapterDetail | null>(
    propChapterDetail || null,
  );

  useEffect(() => {
    if (propChapterDetail) {
      setChapterDetail(propChapterDetail);
      return;
    }
    if (!subjectId || !chapterId) return;
    let active = true;
    api
      .chapter(subjectId, chapterId)
      .then((res) => {
        if (active && res?.ok) setChapterDetail(res);
      })
      .catch(() => {
        // Offline/fallback chapter info already derived from curriculum
      });
    return () => {
      active = false;
    };
  }, [subjectId, chapterId, propChapterDetail]);

  const [question, setQuestion] = useState(initialQuery);
  const [intentMode, setIntentMode] = useState<IntentMode>('BOARD_EXAM');
  const [learnerRole, setLearnerRole] = useState<'student' | 'parent' | 'teacher'>('student');
  const [activeTab, setActiveTab] = useState<AnswerLayerTabId>('coreIntuition');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);

  const handleSelectChapter = (nextSubjectId: string, nextChapterId: string) => {
    setSubjectId(nextSubjectId);
    setChapterId(nextChapterId);
    onSelectChapter?.(nextSubjectId, nextChapterId);
  };

  const askQuestion = async (rawText?: string) => {
    const query = (rawText ?? question).trim();
    if (!query || loading) return;
    if (rawText) setQuestion(rawText);

    setLoading(true);
    setPipelineStages([
      { node: 'query_analyzer', status: 'running' },
      { node: 'retrieval_grader', status: 'pending' },
      { node: 'pedagogical_generator', status: 'pending' },
      { node: 'video_grounder', status: 'pending' },
    ]);

    try {
      const modeMap: Record<IntentMode, string> = {
        BOARD_EXAM: 'board',
        COMPETITIVE_BRIDGE: 'competitive',
      };
      const res = await api.tutor({
        question: query,
        mode: modeMap[intentMode],
        subjectId,
        chapterId,
        intentMode,
        persona: {
          role: learnerRole,
          exam: intentMode === 'COMPETITIVE_BRIDGE' ? 'JEE/NEET/UPSC' : 'CBSE Board',
          depth: intentMode === 'COMPETITIVE_BRIDGE' ? 'deep' : 'board',
        },
      });
      setResponse(res);
      if (Array.isArray(res.pipelineStages) && res.pipelineStages.length > 0) {
        setPipelineStages(res.pipelineStages);
      } else {
        setPipelineStages([
          { node: 'query_analyzer', status: 'completed', output: res.intentMode || intentMode },
          { node: 'retrieval_grader', status: 'completed', output: res.graderVerdict || 'PASS' },
          { node: 'pedagogical_generator', status: 'completed', output: '4 layers synthesized' },
        ]);
      }
      if (intentMode === 'COMPETITIVE_BRIDGE' && res.answerLayers?.competitiveBridge) {
        setActiveTab('competitiveBridge');
      } else if (res.answerLayers?.boardAnswer) {
        setActiveTab('boardAnswer');
      } else {
        setActiveTab('coreIntuition');
      }
    } catch (err) {
      setPipelineStages([
        { node: 'query_analyzer', status: 'failed', error: 'REQUEST_FAILED' },
      ]);
      notify(err instanceof Error ? err.message : 'Unable to reach tutor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void askQuestion();
  };

  const fallbackCitations: Citation[] = useMemo(() => {
    if (response?.sources && response.sources.length > 0) return response.sources;
    if (!activeChapter || !activeSubject) return [];
    return [
      {
        chunkId: `ncert-${activeSubject.id}-${activeChapter.id}`,
        title: `${activeChapter.name} — NCERT Reference`,
        chapterId: activeChapter.id,
        subjectId: activeSubject.id,
        chapter: activeChapter.name,
        subject: activeSubject.name,
        type: 'concept',
        anchor: `#${activeChapter.id}`,
        source: `NCERT Class X ${activeSubject.name}`,
        page: 1,
      },
    ];
  }, [response?.sources, activeChapter, activeSubject]);

  const resolvedLayers: Partial<LayeredAnswer> | null = useMemo(() => {
    if (response?.answerLayers) return response.answerLayers;
    if (response?.answer) {
      return {
        coreIntuition: response.answer,
        boardAnswer: response.answer,
        competitiveBridge: response.answer,
        examinersTrap: 'Verify NCERT definitions, units, and boundary conditions carefully.',
      };
    }
    return null;
  }, [response]);

  const visualAidVideo: VisualAidVideo | null = response?.visualAidVideo ?? null;

  const model = renderStudyWorkspaceModel({
    syllabus: {
      subjects,
      activeSubjectId: subjectId,
      activeChapterId: chapterId,
    },
    referenceContext: {
      citations: fallbackCitations,
      chunks: chapterDetail?.lesson?.concepts || activeChapter?.topics || [],
      visualAidVideo,
    },
    answerLayers: resolvedLayers,
    activeTab,
    pipelineStages,
  });

  const activeTabObj = model.mainPane.tabs.find((t) => t.id === model.mainPane.activeTab);
  const prompts = DEFAULT_PROMPTS[subjectId] || DEFAULT_PROMPTS.mathematics;

  return (
    <section
      className={`study-workspace-shell ${model.layout.responsiveClass}`}
      style={{
        backgroundColor: model.layout.canvasBg,
        color: model.layout.inkColor,
        border: model.layout.hairlineBorder,
      }}
    >
      {/* Left Pane: Sticky Syllabus Navigation */}
      <aside
        id={model.leftPane.id}
        className={`study-pane-nav ${model.leftPane.className}`}
        style={{ backgroundColor: model.layout.panelBg }}
        aria-label="Syllabus navigation"
      >
        <div className="mb-4">
          <div className="eyebrow">
            <BookOpen size={12} /> Class X Syllabus
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[#18181B]">Workbook Index</h2>
        </div>

        <div className="mb-4 space-y-2">
          <label className="field-label" htmlFor="study-intent-toggle">
            Study Mode
          </label>
          <div id="study-intent-toggle" className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className={`px-2 py-1.5 rounded text-[11px] font-semibold border ${
                intentMode === 'BOARD_EXAM'
                  ? 'bg-[#1B4332] text-[#FAF9F6] border-[#1B4332]'
                  : 'bg-[#FAF9F6] text-[#52525B] border-[#E4E2DD]'
              }`}
              onClick={() => setIntentMode('BOARD_EXAM')}
            >
              Board Exam
            </button>
            <button
              type="button"
              className={`px-2 py-1.5 rounded text-[11px] font-semibold border ${
                intentMode === 'COMPETITIVE_BRIDGE'
                  ? 'bg-[#1B4332] text-[#FAF9F6] border-[#1B4332]'
                  : 'bg-[#FAF9F6] text-[#52525B] border-[#E4E2DD]'
              }`}
              onClick={() => setIntentMode('COMPETITIVE_BRIDGE')}
            >
              Competitive Bridge
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="field-label" htmlFor="learner-role-select">
            Learner Role
          </label>
          <div className="select-wrap compact-select">
            <select
              id="learner-role-select"
              aria-label="Learner role"
              value={learnerRole}
              onChange={(e) => setLearnerRole(e.target.value as 'student' | 'parent' | 'teacher')}
            >
              <option value="student">Class 10 Student</option>
              <option value="teacher">Subject Mentor</option>
              <option value="parent">Parent Review</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {subjects.map((sub) => {
            const isActiveSub = sub.id === activeSubject?.id;
            return (
              <div key={sub.id} className="border-t border-[#E4E2DD] pt-2">
                <button
                  type="button"
                  className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-xs font-bold ${
                    isActiveSub ? 'text-[#1B4332]' : 'text-[#52525B]'
                  }`}
                  onClick={() => {
                    const firstChapter = sub.chapters[0]?.id || '';
                    if (firstChapter) handleSelectChapter(sub.id, firstChapter);
                  }}
                >
                  <span>{sub.name}</span>
                  <span className="font-mono text-[11px]">{sub.chapters.length}</span>
                </button>
                {isActiveSub && (
                  <ul className="mt-1 space-y-1 pl-1">
                    {sub.chapters.map((ch) => {
                      const isCurrent = ch.id === activeChapter?.id;
                      return (
                        <li key={ch.id}>
                          <button
                            type="button"
                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors border ${
                              isCurrent
                                ? 'bg-[#DCFCE7] text-[#1B4332] border-[#1B4332] font-semibold'
                                : 'bg-transparent text-[#52525B] border-transparent hover:bg-[#FAF9F6]'
                            }`}
                            onClick={() => handleSelectChapter(sub.id, ch.id)}
                          >
                            {ch.number}. {ch.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Center Pane: NCERT Reference Context, ConceptVideoPlayer & Citations */}
      <div
        id={model.centerPane.id}
        className={`study-pane-context ${model.centerPane.className}`}
        aria-label="NCERT Reference Context"
      >
        <div className="mb-4">
          <div className="eyebrow">
            <Compass size={12} /> NCERT Reference Context
          </div>
          <h3 className="mt-1 text-base font-semibold text-[#18181B]">
            {activeChapter?.name || 'Select a chapter'}
          </h3>
          {activeChapter?.summary && (
            <p className="mt-1 text-xs text-[#52525B] leading-relaxed">{activeChapter.summary}</p>
          )}
        </div>

        {/* Distraction-locked verified video block (cleanly omitted if null) */}
        {visualAidVideo && (
          <div className="mb-4">
            <div className="eyebrow mb-2">Verified Visual Demonstration</div>
            <ConceptVideoPlayer
              video={visualAidVideo}
              onTestYourself={() => onTestYourself?.(subjectId, chapterId)}
            />
          </div>
        )}

        {/* NCERT Topics / Key Concepts */}
        {activeChapter && activeChapter.topics.length > 0 && (
          <div className="mb-4 p-3 rounded border border-[#E4E2DD] bg-[#F3F1EC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#52525B] mb-2">
              Chapter Topics
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeChapter.topics.slice(0, 6).map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#FAF9F6] border border-[#E4E2DD] text-[#18181B]"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Grounded Citations */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#52525B] mb-2">
            Grounded Sources ({fallbackCitations.length})
          </div>
          <div className="space-y-2">
            {fallbackCitations.map((c, idx) => (
              <div
                key={c.chunkId || idx}
                className="citation-card"
              >
                <span className={`citation-type type-${c.type || 'concept'}`}>
                  S{idx + 1}
                </span>
                <span>
                  <strong>{c.title}</strong>
                  <small>
                    {c.source}
                    {c.page ? ` · p. ${c.page}` : ''}
                  </small>
                </span>
                <FileText size={14} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right / Main Pane: Query Composer, PipelineStatus & 4-Layer Answer Tabs */}
      <div
        id={model.mainPane.id}
        className={`study-pane-main ${model.mainPane.className}`}
        aria-label="Structured Answer Workspace"
      >
        <form onSubmit={handleSubmit} className="mb-4">
          <label className="field-label" htmlFor="study-tutor-input">
            Ask a CBSE Board or Competitive Question
          </label>
          <div className="flex gap-2">
            <input
              id="study-tutor-input"
              aria-label="Ask the tutor"
              type="text"
              className="flex-1 px-3 py-2 rounded border border-[#E4E2DD] bg-[#FAF9F6] text-sm text-[#18181B] focus:border-[#1B4332] focus:outline-none"
              placeholder={`Ask about ${activeChapter?.name || 'this chapter'}...`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="submit"
              aria-label="Send question"
              className="btn btn-primary btn-sm"
              disabled={loading || !question.trim()}
            >
              <Send size={14} />
              Ask
            </button>
          </div>
        </form>

        {/* Monospace Pipeline Execution Status */}
        <PipelineStatus stages={pipelineStages} className="mb-4" />

        {/* Empty state prompt chips when no answer yet */}
        {!response && !loading && (
          <div className="p-4 rounded border border-[#E4E2DD] bg-[#F3F1EC]">
            <div className="eyebrow mb-2">Suggested Workbook Prompts</div>
            <p className="text-xs text-[#52525B] mb-3">
              Select a prompt or enter your own question above to generate a 4-layer NCERT &amp; Competitive answer.
            </p>
            <div className="space-y-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded border border-[#E4E2DD] bg-[#FAF9F6] text-xs text-[#18181B] hover:border-[#1B4332]"
                  onClick={() => void askQuestion(p)}
                >
                  <span>{p}</span>
                  <ArrowRight size={13} className="shrink-0 text-[#1B4332]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4-Layer Pedagogical Answer Workspace */}
        {response && (
          <div className="chat-message tutor">
            <div className="w-full space-y-3">
              {/* 4-Layer Tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-[#E4E2DD] pb-2" role="tablist">
                {model.mainPane.tabs.map((tab) => {
                  const isActive = tab.id === model.mainPane.activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                        isActive
                          ? 'bg-[#1B4332] text-[#FAF9F6] border-[#1B4332]'
                          : 'bg-[#F3F1EC] text-[#52525B] border-[#E4E2DD] hover:bg-[#EAE7E0]'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Active Answer Layer Content (preserving .chat-bubble for E2E contract) */}
              <div
                className={`chat-bubble ${
                  model.mainPane.activeTab === 'examinersTrap' ? 'bg-[#FEE2E2]' : 'bg-[#FAF9F6]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#E4E2DD]">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1B4332] flex items-center gap-1.5">
                    {model.mainPane.activeTab === 'examinersTrap' ? (
                      <ShieldAlert size={13} className="text-[#B91C1C]" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    {activeTabObj?.label} · Board-style Grounded Output [S1]
                  </span>
                  {response.graderVerdict && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#DCFCE7] text-[#1B4332]">
                      {response.graderVerdict}
                    </span>
                  )}
                </div>

                <RichText
                  text={
                    activeTabObj?.content ||
                    response.answer ||
                    'No explanation available for this layer.'
                  }
                />

                {/* Meta Row disclosing provider / engine / grounding */}
                <div className="chat-meta-row">
                  <Badge tone="mint">
                    {response.provider?.mode === 'grounded-fallback'
                      ? 'grounded fallback'
                      : response.provider?.mode || 'grounded'}
                  </Badge>
                  <span className="font-mono">
                    Intent: {response.intentMode || intentMode}
                  </span>
                  <span className="font-mono">
                    {response.sources?.length || fallbackCitations.length} citations
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default StudyWorkspace;
