import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Lightbulb, Zap, FileText, Target, Network, Share2, Menu,
  ArrowRight, ChevronDown, ChevronUp, Microscope, GraduationCap,
  History, Clock, AlertTriangle, Film, CheckCircle2, Search, Sparkles
} from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { LearningAidsData } from '../types';

const GROUP_LABELS: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  overview: { label: 'Chapter Overview', icon: BookOpen, color: 'text-indigo-400', desc: 'High-level architectural picture and core motivation' },
  quickrevise: { label: 'Quick Revision', icon: FileText, color: 'text-amber-400', desc: 'Cheat sheets, formulas, and high-yield exam notes' },
  visual: { label: 'Visual & Spatial', icon: Share2, color: 'text-emerald-400', desc: 'Mind maps, concept graphs, and visual breakdowns' },
  practice: { label: 'Teacher-Grade Practice', icon: Target, color: 'text-rose-400', desc: 'Step-by-step solved walkthroughs and diagnostics' },
  shortcuts: { label: 'Shortcuts & Traps', icon: Zap, color: 'text-amber-300', desc: 'Common pitfalls, examiner traps, and quick calculation tricks' },
  deepdive: { label: 'Deep Conceptual Dive', icon: Lightbulb, color: 'text-purple-400', desc: 'Scientific stories, mechanisms, and first-principles explanations' },
  connect: { label: 'Real-World Connections', icon: Network, color: 'text-blue-400', desc: 'Memory hooks, interdisciplinary bridges, and tutor scaffolds' },
  other: { label: 'Additional Resources', icon: Menu, color: 'text-gray-400', desc: 'Supplemental syllabus reference tools' },
};

function renderAidData(data: any, aidId: string): React.ReactNode {
  if (!data) return <span className="text-muted">No content available for this aid yet.</span>;

  // ---- Solved Exercise / Teacher Mode ----
  if (aidId === 'solveliketeacher' || aidId === 'workedexamples') {
    const items = Array.isArray(data) ? data : [data];
    return (
      <div className="space-y-4">
        {items.map((ex: any, i: number) => (
          <div key={ex.id || i} className="p-4 rounded-xl bg-gray-900/60 border border-indigo-500/20 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-indigo-400">Problem {ex.id || i + 1}</span>
              <Badge tone="neutral" className="text-xs">{ex.difficulty || 'medium'}</Badge>
            </div>
            <div className="text-sm text-gray-100 font-medium mb-3">{ex.question || ex.problem || ''}</div>
            <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              <span>Step-by-Step Pedagogical Walkthrough:</span>
            </div>
            <ol className="list-none space-y-1.5 text-xs text-gray-300 mb-3 pl-1">
              {(ex.steps || []).map((s: string, j: number) => (
                <li key={j} className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{j + 1}</span>
                  <span className="text-xs leading-relaxed text-gray-200">{s}</span>
                </li>
              ))}
            </ol>
            {ex.finalAnswer && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg mb-2">
                <span className="text-xs font-semibold text-emerald-400 block mb-0.5">Final Answer / Verdict:</span>
                <p className="text-sm font-semibold text-emerald-200">{ex.finalAnswer}</p>
              </div>
            )}
            {data.shortcut && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg mb-2">
                <span className="text-xs font-semibold text-amber-400 block mb-0.5">Competitive Shortcut (IIT/DSC/NEET):</span>
                <p className="text-xs text-amber-200">{data.shortcut}</p>
              </div>
            )}
            {data.memoryHook && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-lg">
                <span className="text-xs font-semibold text-purple-400 block mb-0.5">Mnemonic Memory Hook:</span>
                <p className="text-xs text-purple-200">{data.memoryHook}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ---- Science Experiments ----
  if (aidId === 'scienceExperiments' || (data.objective && data.materialsRequired)) {
    const exps = Array.isArray(data) ? data : [data];
    return (
      <div className="space-y-3">
        {exps.map((exp: any, i: number) => (
          <div key={exp.id || i} className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-semibold text-blue-300">{exp.title}</span>
              <Badge tone="indigo" className="text-xs">NCERT Activity</Badge>
            </div>
            <div className="text-xs text-gray-300 mb-2 leading-relaxed">{exp.objective}</div>
            <div className="mb-2">
              <div className="text-xs font-semibold text-blue-400 mb-1.5">Experimental Procedure:</div>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300">
                {(exp.steps || []).map((s: string, j: number) => (
                  <li key={j} className="leading-relaxed">{s}</li>
                ))}
              </ol>
            </div>
            {exp.conclusion && (
              <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-300 mt-2">
                <span className="font-semibold text-green-400">Scientific Conclusion: </span>{exp.conclusion}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ---- MCQ Answers ----
  if (aidId === 'mcqAnswers' || (data.correctIndex !== undefined || data.options)) {
    const items = Array.isArray(data) ? data : [data];
    return (
      <div className="space-y-2.5">
        {items.map((q: any, i: number) => (
          <div key={q.id || i} className="p-3.5 rounded-xl bg-gray-900/50 border border-gray-700/40">
            <div className="flex justify-between items-start mb-1.5">
              <span className="text-xs font-bold text-emerald-400">Question {q.id || i + 1}</span>
              <Badge tone="neutral" className="text-xs">{q.difficulty || 'medium'}</Badge>
            </div>
            <p className="text-xs font-medium text-gray-200 mb-2 leading-relaxed">{q.question}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(q.options || []).map((opt: string, idx: number) => (
                <div key={idx} className={`px-2.5 py-1.5 rounded-lg text-xs border ${idx === q.correctIndex ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-semibold' : 'bg-gray-800/40 border-gray-700/30 text-gray-300'}`}>
                  <span className="font-mono mr-1.5">{String.fromCharCode(65 + idx)}.</span>
                  {idx === q.correctIndex && '✓ '}
                  {opt}
                </div>
              ))}
            </div>
            {q.explanation && (
              <div className="mt-2 p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/30 text-xs text-gray-300 leading-relaxed">
                <span className="font-semibold text-emerald-400">Examiner Rationale: </span>{q.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ---- Concept Map Nodes / Connections ----
  if (aidId === 'conceptmap' || aidId === 'conceptconnections') {
    const nodes = data?.nodes || [];
    const edges = data?.edges || [];
    return (
      <div className="p-4 rounded-xl bg-gray-950/60 border border-indigo-500/20">
        <div className="text-xs font-semibold text-indigo-300 mb-3 flex items-center justify-between">
          <span>Conceptual Nodes & Logical Bridges</span>
          <Badge tone="indigo" className="text-[10px]">{nodes.length} Concepts</Badge>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {nodes.map((node: any, idx: number) => (
            <div key={node.id || idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 font-medium shadow-sm hover:border-indigo-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>{node.label || node.name || node.title}</span>
            </div>
          ))}
        </div>
        {edges.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800/60">
            <span className="text-[11px] font-semibold text-gray-400 block mb-2">Relational Links:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {edges.slice(0, 8).map((edge: any, i: number) => {
                const from = Array.isArray(edge) ? edge[0] : edge.from;
                const to = Array.isArray(edge) ? edge[1] : edge.to;
                return (
                  <div key={i} className="text-[11px] text-gray-300 bg-gray-900/40 px-2.5 py-1 rounded border border-gray-800 flex items-center gap-1.5">
                    <span className="text-indigo-400 font-semibold">{from}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-emerald-400 font-semibold">{to}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Generic structured rendering ----
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((item: any, i: number) => (
          <div key={i} className="p-3 rounded-lg bg-gray-900/40 border border-gray-800 text-xs text-gray-200 leading-relaxed">
            {typeof item === 'string' ? item : item.summary || item.title || item.statement || item.description || JSON.stringify(item)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data).filter(([k, v]) => v != null && v !== '' && !['id', 'chapterId', 'subjectId'].includes(k));
    return (
      <div className="space-y-2">
        {entries.map(([key, val]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
          return (
            <div key={key} className="p-2.5 rounded-lg bg-gray-900/40 border border-gray-800 text-xs">
              <span className="font-semibold text-indigo-300 block mb-1">{formattedKey}:</span>
              {Array.isArray(val) ? (
                <ul className="list-disc pl-4 space-y-1 text-gray-300">
                  {val.map((v: any, j: number) => (
                    <li key={j}>{typeof v === 'string' ? v : v.title || v.name || JSON.stringify(v)}</li>
                  ))}
                </ul>
              ) : typeof val === 'object' ? (
                <pre className="text-[11px] text-gray-300 whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
              ) : (
                <span className="text-gray-200 leading-relaxed">{String(val)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-xs text-gray-200 leading-relaxed">{String(data)}</p>;
}

export default function LearningAids() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const navigate = useNavigate();
  const { curriculum } = useApp();

  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';

  const [data, setData] = useState<LearningAidsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [expandedAid, setExpandedAid] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const loadData = () => {
    setLoading(true);
    setFetchError(false);
    api.learningAids(subjectId, chapterId).then((payload) => {
      if (payload && payload.aids && payload.aids.length > 0) {
        setData(payload);
        setFetchError(false);
      } else {
        setFetchError(true);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('LearningAids load error:', err);
      setFetchError(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [subjectId, chapterId]);

  const currentSubject = curriculum?.subjects?.find((s) => s.id === subjectId);
  const currentChapter = currentSubject?.chapters?.find((c) => c.id === chapterId);

  if (loading) return <div className="page-loading"><div className="loader-ring" /><span>Compiling 30 Master Learning Aids…</span></div>;

  if (fetchError || !data) {
    return (
      <div className="page space-y-6">
        <Card className="empty-state p-10">
          <AlertTriangle size={36} className="text-amber-400 mb-2" />
          <h2>Learning Aids Temporarily Unavailable</h2>
          <p>We encountered a brief hiccup loading learning aids for <strong>{currentChapter?.name || chapterId}</strong>.</p>
          <div className="flex gap-3 mt-4">
            <Button variant="primary" onClick={loadData}>Retry Loading</Button>
            <Button variant="secondary" onClick={() => navigate('/learning-aids/mathematics/real-numbers')}>
              Explore Real Numbers
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { aids, aidsWithContent } = data;

  // Filter aids by group and search
  const filteredAids = aids.filter((aid) => {
    const matchesGroup = selectedGroup === 'all' || aid.group === selectedGroup;
    const matchesSearch = !searchFilter ||
      aid.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      aid.id.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="page space-y-6">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow light flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span>Class X · CBSE, DSC & UPSC Foundation Companion</span>
          </div>
          <h1>30 Learning Aids</h1>
          <p>
            Master <strong>{data.chapterName || chapterId}</strong> across 30 cognitive formats — from TL;DR quick cards and examiner cheat sheets to teacher-grade walkthroughs.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="mint" className="text-xs font-bold">{aidsWithContent.length} / 30 Ready</Badge>
          <Badge tone={data.hasLesson ? 'indigo' : 'neutral'} className="text-xs">{data.hasLesson ? 'Complete Lesson' : 'Syllabus Map'}</Badge>
        </div>
      </div>

      {/* Chapter Selector & Search Toolbar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="select-wrap compact-select">
            <select
              value={subjectId}
              onChange={(e) => {
                const newSub = curriculum?.subjects?.find((s) => s.id === e.target.value);
                const firstCh = newSub?.chapters?.[0]?.id || 'real-numbers';
                navigate(`/learning-aids/${e.target.value}/${firstCh}`);
              }}
            >
              {curriculum?.subjects?.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div className="select-wrap compact-select">
            <select
              value={chapterId}
              onChange={(e) => navigate(`/learning-aids/${subjectId}/${e.target.value}`)}
            >
              {currentSubject?.chapters?.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-box max-w-xs">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by aid name or skill…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Group Switcher Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${selectedGroup === 'all' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
          onClick={() => setSelectedGroup('all')}
        >
          All 30 Aids
        </button>
        {Object.entries(GROUP_LABELS).map(([key, info]) => {
          const count = aids.filter((a) => a.group === key && a.hasContent).length;
          const Icon = info.icon;
          return (
            <button
              key={key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border whitespace-nowrap ${selectedGroup === key ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
              onClick={() => setSelectedGroup(key)}
            >
              <Icon size={14} className={info.color} />
              <span>{info.label}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Special Sections (if data present) */}
      {data.scienceExperiments && data.scienceExperiments.length > 0 && (
        <Card className="p-5 border-blue-500/30 bg-blue-950/20">
          <SectionHeader
            title="Science Experiments & Lab Activities"
            description="Prescribed NCERT practical activities and hands-on demonstrations"
            action={<Badge tone="indigo" className="text-xs">Lab Portfolio</Badge>}
          />
          {renderAidData(data.scienceExperiments, 'scienceExperiments')}
        </Card>
      )}

      {data.mcqAnswers && data.mcqAnswers.length > 0 && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-950/20">
          <SectionHeader
            title="Diagnostic MCQ Solutions & Explanations"
            description="Verified exam-oriented questions with step explanations"
            action={<Badge tone="mint" className="text-xs">CBSE Standard</Badge>}
          />
          {renderAidData(data.mcqAnswers, 'mcqAnswers')}
        </Card>
      )}

      {/* 30 Aids Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAids.map((aid) => {
          const isExpanded = expandedAid === aid.id;
          const groupInfo = GROUP_LABELS[aid.group] || { label: aid.group, icon: Menu, color: 'text-gray-400' };
          const GroupIcon = groupInfo.icon;

          return (
            <Card
              key={aid.id}
              className={`transition-all duration-200 ${isExpanded ? 'border-[var(--primary)] ring-1 ring-[var(--primary)] md:col-span-2 lg:col-span-3' : ''}`}
            >
              <div
                className="flex items-start justify-between gap-3 cursor-pointer p-4"
                onClick={() => setExpandedAid(isExpanded ? null : aid.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <GroupIcon size={18} className={groupInfo.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-[var(--ink)]">{aid.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] uppercase">{aid.id}</span>
                    </div>
                    <span className="text-xs text-[var(--muted)] block">{groupInfo.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={aid.hasContent ? 'mint' : 'neutral'} className="text-[10px]">
                    {aid.hasContent ? 'Ready' : 'Pending'}
                  </Badge>
                  <Button variant="ghost" size="sm" className="p-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
              </div>

              {/* Collapsed Preview */}
              {!isExpanded && aid.hasContent && (
                <div className="px-4 pb-4 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={() => setExpandedAid(aid.id)}
                  >
                    <span>Inspect {aid.label}</span>
                    <ArrowRight size={13} />
                  </Button>
                </div>
              )}

              {/* Expanded Accordion Body */}
              {isExpanded && (
                <div className="px-4 pb-5 pt-2 border-t border-[var(--glass-border)] mt-1 space-y-3">
                  <div className="flex justify-between items-center text-xs text-[var(--muted)] pt-2">
                    <span className="font-semibold text-[var(--primary)]">Detailed Cognitive Aid Content:</span>
                    <span className="text-[11px]">Click title to collapse</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] overflow-hidden">
                    {renderAidData(aid.data, aid.id)}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
