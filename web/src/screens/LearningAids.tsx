import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Lightbulb, Zap, FileText, Activity, Target, Play, Network, Share2, Sparkles, Menu, ArrowRight, Video, Microscope, FlaskConical, GraduationCap, History, Clock, AlertTriangle } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { LearningAidsData } from '../types';

const GROUP_LABELS: Record<string, { label: string; icon: any }> = {
  overview: { label: 'Overview', icon: BookOpen },
  quickrevise: { label: 'Quick Revise', icon: FileText },
  visual: { label: 'Visual', icon: Share2 },
  practice: { label: 'Practice', icon: Target },
  shortcuts: { label: 'Shortcuts & Traps', icon: Zap },
  deepdive: { label: 'Deep Dive', icon: Lightbulb },
  connect: { label: 'Connect', icon: Network },
  other: { label: 'Other', icon: Menu },
};

function renderAidData(data: any): React.ReactNode {
  if (!data) return <span className="text-muted">No content available.</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted">No items.</span>;
    return (
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-200">
        {data.map((item, i) => {
          if (typeof item === 'string') return <li key={i}>{item}</li>;
          if (item && typeof item === 'object') {
            const title = item.title || item.name || item.question || item.pattern || item.misconception || item.concept || item.part || item.hook || '';
            const desc = item.explanation || item.method || item.correction || item.answer || item.finalAnswer || item.statement || item.reason || item.description || item.goal || item.objective || item.whenToUse || item.howToAvoid || '';
            return (
              <li key={i} className="flex flex-col gap-1">
                <span className="font-semibold text-indigo-300">{title}</span>
                {desc && <span className="text-sm text-gray-300">{desc}</span>}
                {item.steps && Array.isArray(item.steps) && item.steps.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 text-xs text-gray-400 mt-1">
                    {item.steps.map((s: string, j: number) => (
                      <li key={j} className="text-xs">{s}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          }
          return <li key={i}>{String(item)}</li>;
        })}
      </ul>
    );
  }

  if (typeof data === 'string') return <span className="text-sm text-gray-200">{data}</span>;

  if (data && typeof data === 'object') {
    // Special render for solved exercise
    if (data.finalAnswer || data.steps) {
      return (
        <div className="space-y-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <div className="text-xs font-semibold text-indigo-400 mb-1">Question:</div>
            <p className="text-sm text-gray-200">{data.question || ''}</p>
          </div>
          {data.steps && data.steps.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-emerald-400 mb-1">Step-by-Step Solution:</div>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-200">
                {data.steps.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {data.finalAnswer && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="text-xs font-semibold text-emerald-400 mb-1">Final Answer:</div>
              <p className="text-sm text-green-300">{data.finalAnswer}</p>
            </div>
          )}
          {data.shortcut && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="text-xs font-semibold text-amber-400 mb-1">Shortcut:</div>
              <p className="text-sm text-yellow-300">{data.shortcut}</p>
            </div>
          )}
          {data.formulaUsed && (
            <div className="flex gap-2 text-xs text-gray-400">
              <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">Formula: {data.formulaUsed.formula}</span>
              <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">When: {data.formulaUsed.when}</span>
            </div>
          )}
        </div>
      );
    }

    // Special render for science experiment
    if (data.objective || data.materialsRequired) {
      return (
        <div className="space-y-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-xs font-semibold text-blue-400 mb-1">Objective:</div>
            <p className="text-sm text-gray-200">{data.objective}</p>
          </div>
          {data.materialsRequired && data.materialsRequired.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-blue-400 mb-1">Materials:</div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-gray-200">
                {data.materialsRequired.map((m: string, i: number) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {data.steps && data.steps.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-blue-400 mb-1">Procedure:</div>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-200">
                {data.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
          {data.conclusion && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-xs font-semibold text-green-400 mb-1">Conclusion:</div>
              <p className="text-sm text-green-300">{data.conclusion}</p>
            </div>
          )}
          {data.safetyNote && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <div className="text-xs font-semibold text-rose-400 mb-1">Safety:</div>
              <p className="text-sm text-rose-300">{data.safetyNote}</p>
            </div>
          )}
        </div>
      );
    }

    // Special render for MCQ answer
    if (data.correctIndex !== undefined || data.options) {
      return (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-indigo-400">{data.question}</div>
          {data.options && data.options.map((opt: string, i: number) => (
            <div key={i} className={`flex items-center gap-2 text-sm ${i === data.correctIndex ? 'text-green-400' : 'text-gray-300'}`}>
              {i === data.correctIndex && <AlertTriangle size={14} className="text-green-400" />}
              <span>{opt}</span>
            </div>
          ))}
          {data.explanation && (
            <div className="text-xs text-gray-400 mt-1">Explanation: {data.explanation}</div>
          )}
        </div>
      );
    }

    // Special render for formula sheet item
    if (data.name && data.statement) {
      return (
        <div className="flex justify-between items-start p-2 bg-gray-800/30 rounded border border-gray-700/30 text-sm">
          <div>
            <div className="font-semibold text-indigo-300">{data.name}</div>
            <div className="text-xs text-gray-300">{data.statement}</div>
          </div>
          {data.whenToUse && <span className="text-xs text-gray-400 italic">{data.whenToUse}</span>}
        </div>
      );
    }

    // Generic object render
    const entries = Object.entries(data).filter(([, v]) => v != null && v !== '');
    if (entries.length === 0) return <span className="text-muted">No details available.</span>;
    return (
      <ul className="space-y-1 text-sm text-gray-200">
        {entries.map(([key, val]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
          if (Array.isArray(val)) return (
            <li key={key} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-indigo-400">{label}:</span>
              <ul className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                {val.map((v: any, j: number) => <li key={j}>{typeof v === 'string' ? v : v.title || v.name || String(v)}</li>)}
              </ul>
            </li>
          );
          return (
            <li key={key} className="flex justify-between">
              <span className="text-xs font-semibold text-indigo-400">{label}:</span>
              <span className="text-xs text-gray-300 max-w-[60%] break-words">{String(val)}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return <span className="text-muted">Content format not supported.</span>;
}

function aidPreviewText(aid: any): string {
  if (!aid || !aid.data) return '';
  if (typeof aid.data === 'string') return aid.data.slice(0, 100);
  if (Array.isArray(aid.data)) {
    if (aid.data.length === 0) return '';
    const first = aid.data[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      return first.title || first.name || first.question || first.statement || first.summary || first.objective || '';
    }
    return '';
  }
  if (aid.data && typeof aid.data === 'object') {
    return aid.data.statement || aid.data.title || aid.data.name || aid.data.question || aid.data.summary || aid.data.objective || '';
  }
  return '';
}

export default function LearningAids() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';
  const [data, setData] = useState<LearningAidsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>('overview');

  useEffect(() => {
    api.learningAids(subjectId, chapterId).then((payload) => {
      setData(payload);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [subjectId, chapterId]);

  if (loading) return <div className="p-6 text-center text-muted">Loading learning aids…</div>;
  if (!data) return <div className="p-6 text-center text-muted">No learning aids available.</div>;

  const { aids, aidsWithContent, stats } = data;

  // Group aids
  const grouped: Record<string, typeof aids> = {};
  aids.forEach((a) => {
    if (!grouped[a.group]) grouped[a.group] = [];
    grouped[a.group].push(a);
  });

  const groupOrder = ['overview', 'quickrevise', 'visual', 'practice', 'shortcuts', 'deepdive', 'connect', 'other'];
  const sortedGroups = groupOrder.filter((g) => grouped[g]).map((g) => ({ key: g, aids: grouped[g] }));

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Learning Aids"
        description={`30 ways to master ${data.chapterName || chapterId} — ${data.subjectName || subjectId}`}
        action={
          <div className="flex gap-2">
            <Badge tone="neutral" className="text-xs">{aidsWithContent.length} of {aids.length} ready</Badge>
            <Badge tone={data.hasLesson ? 'mint' : 'rose'} className="text-xs">{data.hasLesson ? 'Full Lesson' : 'Syllabus Map'}</Badge>
          </div>
        }
      />

      {/* Subject-specific special sections */}
      {data.scienceExperiments && data.scienceExperiments.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="Science Experiments" description="Hands-on experiments for this chapter" action={<Badge tone="indigo" className="text-xs">Lab</Badge>} />
          <div className="space-y-3">
            {data.scienceExperiments.map((exp: any) => (
              <Card key={exp.id} className="p-3 border-blue-500/20 bg-blue-500/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-blue-400">{exp.title}</span>
                  <Badge tone="neutral" className="text-xs">Experiment</Badge>
                </div>
                <p className="text-xs text-gray-300 mb-2">{exp.objective}</p>
                <div className="flex gap-2 text-xs text-gray-400 mb-2">
                  <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">Steps: {exp.steps?.length}</span>
                  <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">Safety: Teacher supervision</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-left" onClick={() => {}}>
                  View Full Experiment Procedure
                </Button>
              </Card>
            ))}
              </div>
            </Card>
          )}
          {data.mcqAnswers && data.mcqAnswers.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="MCQ Answers with Explanations" description={`Practice questions for ${chapterId}`} action={<Badge tone="mint" className="text-xs">Auto-graded</Badge>} />
          <div className="space-y-2">
            {data.mcqAnswers.map((q: any) => (
              <Card key={q.id} className="p-3 border-green-500/20 bg-green-500/5">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold text-green-400">Q{q.id?.replace(/\D/g, '') || ''}</span>
                  <Badge tone="neutral" className="text-xs">{q.difficulty}</Badge>
                </div>
                <p className="text-sm text-gray-200 mb-1">{q.question}</p>
                <div className="flex gap-1">
                  {q.options.map((opt: string, i: number) => (
                    <span key={i} className={`px-2 py-1 rounded text-xs border ${i === q.correctIndex ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-gray-800/50 border-gray-700/30 text-gray-400'}`}>
                      {i === q.correctIndex ? '✓ ' : ''}{opt}
                    </span>
                  ))}
                </div>
                {q.explanation && (
                  <div className="mt-1 p-2 rounded bg-gray-800/30 border border-gray-700/30 text-xs text-gray-300">
                    <span className="text-xs font-semibold text-green-400">Explanation:</span> {q.explanation}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}
      {data.bibliographyAndEquations && (
        <Card className="p-4">
          <SectionHeader title="Formulas, Equations & Bibliography" description="Quick reference for revision" action={<Badge tone="rose" className="text-xs">Reference</Badge>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-purple-400 mb-2">Equations & Formulas</h4>
              <div className="space-y-2">
                {data.bibliographyAndEquations.equations.map((eq: any) => (
                  <div key={eq.id} className="p-2 rounded bg-gray-800/30 border border-gray-700/30 text-sm">
                    <div className="font-semibold text-indigo-300">{eq.name}</div>
                    <div className="text-xs text-gray-300">{eq.statement}</div>
                    <div className="text-xs text-gray-500 mt-1">{eq.context}</div>
                  </div>
                ))}
                {data.bibliographyAndEquations.equations.length === 0 && (
                  <span className="text-xs text-gray-500">No specific equations found for this chapter.</span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-purple-400 mb-2">Bibliography & Sources</h4>
              <div className="space-y-2">
                {data.bibliographyAndEquations.bibliography.map((b: any) => (
                  <div key={b.id} className="p-2 rounded bg-gray-800/30 border border-gray-700/30 text-sm">
                    <div className="font-semibold text-indigo-300">{b.title}</div>
                    <div className="text-xs text-gray-300">{b.publisher}, {b.year}</div>
                    <div className="text-xs text-gray-500">{b.type} • {b.subject}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
      {data.socialStudiesData && (
        <Card className="p-4">
          <SectionHeader title="History: Dates, Revolts & Events" description="Historical timeline and key events" action={<Badge tone="rose" className="text-xs">History</Badge>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-rose-400 mb-2">Important Dates</h4>
              <div className="space-y-1">
                {data.socialStudiesData.importantDates.map((d: any) => (
                  <div key={`${d.year}-${d.event}`} className="flex justify-between text-xs text-gray-200 border-b border-gray-700/30 py-1">
                    <span className="text-indigo-400 font-mono">{d.year}</span>
                    <span>{d.event}</span>
                  </div>
                ))}
                {data.socialStudiesData.importantDates.length === 0 && <span className="text-xs text-gray-500">No specific dates found.</span>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-rose-400 mb-2">Revolts & Wars</h4>
              <div className="space-y-1">
                {data.socialStudiesData.revoltsAndWars.map((r: any) => (
                  <div key={r.name} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-sm">
                    <div className="font-semibold text-rose-300">{r.name}</div>
                    <div className="text-xs text-gray-300">{r.type}</div>
                    <div className="text-xs text-gray-400">{r.description}</div>
                  </div>
                ))}
                {data.socialStudiesData.revoltsAndWars.length === 0 && <span className="text-xs text-gray-500">No revolt/war events found.</span>}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {sortedGroups.map(({ key, aids: groupAids }) => {
          const groupInfo = GROUP_LABELS[key] || { label: key, icon: Menu };
          const GroupIcon = groupInfo.icon as any;
          const visibleAids = groupAids.filter((a) => a.hasContent);
          if (visibleAids.length === 0) return null;

          return (
            <Card key={key} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <GroupIcon size={18} className="text-indigo-400" />
                  <h3 className="font-semibold">{groupInfo.label}</h3>
                </div>
                <Badge tone="neutral" className="text-xs">{visibleAids.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {visibleAids.map((aid) => (
                  <Card key={aid.id} className="p-3 cursor-pointer hover:bg-indigo-500/5 border-indigo-500/10 transition group">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        <Badge tone="indigo" className="text-[10px] px-2 py-1">{aid.id}</Badge>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold">{aid.label}</h4>
                        {aidPreviewText(aid) && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {aidPreviewText(aid)}
                          </div>
                        )}
                        <ArrowRight size={14} className="text-gray-400 group-hover:text-indigo-500" />
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700/30">
                      <Button variant="ghost" size="sm" className="w-full text-left" onClick={() => {}}>
                        Open {aid.label}
                      </Button>
                    </div>
                    {aid.data && (
                      <div className="mt-3 pt-3 border-t border-gray-800/50">
                        <div className="p-3 rounded bg-gray-900/50 border border-gray-700/30">
                          {renderAidData(aid.data)}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {!data.hasLesson && (
        <Card className="p-4">
          <SectionHeader title="No Authored Lesson Yet" description="This chapter is a syllabus map. Learning aids will be fully available once the chapter content is authored." />
          <Button variant="ghost" onClick={() => {}}>View Syllabus Map</Button>
        </Card>
      )}
    </div>
  );
}
