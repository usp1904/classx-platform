import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Lightbulb, Zap, FileText, Activity, Target, Play, Network, Share2, Sparkles, Menu, ArrowRight, Video, Microscope, FlaskConical, GraduationCap, History, Clock, AlertTriangle, Film, TrendingUp } from 'lucide-react';
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

function renderAidData(data: any, aidId: string): React.ReactNode {
  if (!data) return <span className="text-muted">No content available.</span>;

  // ---- Solved Exercise ----
  if (aidId === 'solveliketeacher' || aidId === 'workedexamples') {
    const items = Array.isArray(data) ? data : [data];
    return (
      <div className="space-y-4">
        {items.map((ex: any, i: number) => (
          <div key={ex.id || i} className="p-4 rounded bg-gray-900/50 border border-indigo-500/20">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-indigo-400">Q{ex.id || i + 1}</span>
              <Badge tone="neutral" className="text-xs">{ex.difficulty || 'medium'}</Badge>
            </div>
            <div className="text-sm text-gray-200 mb-2">{ex.question || ex.problem || ''}</div>
            <div className="text-xs font-semibold text-emerald-400 mb-1">Step-by-Step Solution:</div>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300 mb-2">
              {(ex.steps || []).map((s: string, j: number) => (
                <li key={j} className="flex gap-2">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500 text-indigo-300 text-xs text-center leading-5 flex-shrink-0">{j + 1}</span>
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ol>
            {ex.finalAnswer && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="text-xs font-semibold text-emerald-400 mb-1">Final Answer:</div>
                <p className="text-sm text-emerald-300">{ex.finalAnswer}</p>
              </div>
            )}
            {data.shortcut && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="text-xs font-semibold text-amber-400 mb-1">Shortcut:</div>
                <p className="text-sm text-yellow-300">{data.shortcut}</p>
              </div>
            )}
            {data.formulaUsed && (
              <div className="flex gap-2 text-xs text-gray-400 mt-1">
                <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">Formula: {data.formulaUsed.formula}</span>
                <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">When: {data.formulaUsed.when}</span>
              </div>
            )}
            {data.memoryHook && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="text-xs font-semibold text-purple-400 mb-1">Memory Hook:</div>
                <p className="text-sm text-purple-300">{data.memoryHook}</p>
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
          <div key={exp.id || i} className="p-4 rounded bg-blue-500/5 border border-blue-500/20">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-blue-400">{exp.title}</span>
              <Badge tone="indigo" className="text-xs">Lab Experiment</Badge>
            </div>
            <div className="text-sm text-gray-200 mb-2">{exp.objective}</div>
            <div className="flex gap-2 text-xs text-gray-400 mb-2">
              <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">Steps: {exp.steps?.length}</span>
              <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">Teacher supervision required</span>
            </div>
            <div className="mb-2">
              <div className="text-xs font-semibold text-blue-400 mb-1">Procedure:</div>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300">
                {exp.steps.map((s: string, j: number) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
            </div>
            {exp.conclusion && (
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-300">
                <span className="text-xs font-semibold text-green-400">Conclusion: </span>{exp.conclusion}
              </div>
            )}
            {exp.realLifeConnection && (
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
                <span className="text-xs font-semibold text-blue-400">Real Life: </span>{exp.realLifeConnection}
              </div>
            )}
            {exp.safetyNote && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-300">
                <span className="text-xs font-semibold text-rose-400">Safety: </span>{exp.safetyNote}
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
      <div className="space-y-2">
        {items.map((q: any, i: number) => (
          <div key={q.id || i} className="p-3 rounded bg-gray-900/30 border border-gray-700/30">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-green-400">Q{q.id || i + 1}</span>
              <Badge tone="neutral" className="text-xs">{q.difficulty}</Badge>
            </div>
            <p className="text-sm text-gray-200 mb-1">{q.question}</p>
            <div className="flex gap-1">
              {q.options.map((opt: string, idx: number) => (
                <span key={idx} className={`px-2 py-1 rounded text-xs border ${idx === q.correctIndex ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-gray-800/50 border-gray-700/30 text-gray-400'}`}>
                  {idx === q.correctIndex ? '✓ ' : ''}{opt}
                </span>
              ))}
            </div>
            {q.explanation && (
              <div className="mt-1 p-2 rounded bg-gray-800/30 border border-gray-700/30 text-xs text-gray-300">
                <span className="text-xs font-semibold text-green-400">Explanation:</span> {q.explanation}
              </div>
            )}
            {q.memoryHook && (
              <div className="mt-1 p-2 rounded bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                <span className="text-xs font-semibold text-purple-400">Memory Hook:</span> {q.memoryHook}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ---- Bibliography & Equations ----
  if (aidId === 'bibliographyAndEquations') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-purple-400 mb-2">Equations & Formulas</h4>
          <div className="space-y-2">
            {data.equations?.map((eq: any) => (
              <div key={eq.id} className="p-2 rounded bg-gray-800/30 border border-gray-700/30 text-sm">
                <div className="font-semibold text-indigo-300">{eq.name}</div>
                <div className="text-xs text-gray-300">{eq.statement}</div>
                <div className="text-xs text-gray-500 mt-1">{eq.context}</div>
              </div>
            ))}
            {data.equations?.length === 0 && <span className="text-xs text-gray-500">No specific equations found.</span>}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-purple-400 mb-2">Bibliography & Sources</h4>
          <div className="space-y-2">
            {data.bibliography?.map((b: any) => (
              <div key={b.id} className="p-2 rounded bg-gray-800/30 border border-gray-700/30 text-sm">
                <div className="font-semibold text-indigo-300">{b.title}</div>
                <div className="text-xs text-gray-300">{b.publisher}, {b.year}</div>
                <div className="text-xs text-gray-500">{b.type} • {b.subject}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Social Studies Data ----
  if (aidId === 'socialStudiesData') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-rose-400 mb-2">Important Dates</h4>
          <div className="space-y-1">
            {data.importantDates.map((d: any) => (
              <div key={`${d.year}-${d.event}`} className="flex justify-between text-xs text-gray-200 border-b border-gray-700/30 py-1">
                <span className="text-indigo-400 font-mono">{d.year}</span>
                <span>{d.event}</span>
              </div>
            ))}
            {data.importantDates.length === 0 && <span className="text-xs text-gray-500">No specific dates found.</span>}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-rose-400 mb-2">Revolts & Wars</h4>
          <div className="space-y-1">
            {data.revoltsAndWars.map((r: any) => (
              <div key={r.name} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-sm">
                <div className="font-semibold text-rose-300">{r.name}</div>
                <div className="text-xs text-gray-300">{r.type}</div>
                <div className="text-xs text-gray-400">{r.description}</div>
              </div>
            ))}
            {data.revoltsAndWars.length === 0 && <span className="text-xs text-gray-500">No revolt/war events found.</span>}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-rose-400 mb-2">Renaissance & Movements</h4>
          <div className="space-y-1">
            {data.renaissanceEvents?.map((r: any) => (
              <div key={r.name} className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-sm">
                <div className="font-semibold text-purple-300">{r.name}</div>
                <div className="text-xs text-gray-300">{r.period}</div>
                <div className="text-xs text-gray-400">{r.description}</div>
              </div>
            ))}
            {data.renaissanceEvents?.length === 0 && <span className="text-xs text-gray-500">No renaissance events found.</span>}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-rose-400 mb-2">Key Q&A</h4>
          <div className="space-y-1">
            {data.questionNotes?.map((q: any, i: number) => (
              <div key={i} className="p-2 rounded bg-gray-800/30 border border-gray-700/30 text-sm">
                <div className="font-semibold text-indigo-300">Q: {q.question}</div>
                <div className="text-xs text-gray-300 mt-1">{q.answer}</div>
                {q.memoryHook && (
                  <div className="mt-1 p-1 rounded bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    <span className="text-xs font-semibold text-purple-400">Memory Hook:</span> {q.memoryHook}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Concept Map / Concept Connections ----
  if (aidId === 'conceptmap' || aidId === 'conceptconnections') {
    const nodes = data?.nodes || [];
    const edges = data?.edges || [];
    return (
      <div className="h-96 w-full rounded bg-gray-900/30 border border-gray-700/30 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/20 to-gray-900/50 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3xn2hejpRZS1zqk5JmF6maZjQhY')] bg-cover bg-center opacity-10 pointer-events-none" />
        <div className="relative z-10 h-full p-4">
          <div className="text-xs font-semibold text-indigo-400 mb-2">Concept Map — Click nodes to explore connections</div>
          <div className="flex flex-wrap justify-center gap-4 max-h-[300px] overflow-y-auto">
            {nodes.map((node: any) => (
              <div key={node.id} className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                  <span className="text-xs text-indigo-200 font-semibold">{node.label?.slice(0, 3) || '?'}</span>
                </div>
                <span className="text-[10px] text-gray-400 text-center w-16">{node.label}</span>
              </div>
            ))}
          </div>
              {edges.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {edges.map((edge: [string, string], i: number) => {
                    const [from, to] = edge;
                    const fromNode = nodes.find((n: any) => n.id === from);
                    const toNode = nodes.find((n: any) => n.id === to);
                    if (!fromNode || !toNode) return null;
                    return (
                      <svg key={i} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                        <line
                          x1="50%" y1="50%"
                          x2="50%" y2="50%"
                          stroke="#64748b" strokeWidth="1" strokeDasharray="4"
                          opacity={0.5}
                        />
                      </svg>
                    );
                  })}
                </div>
              )}
        </div>
      </div>
    );
  }

  // ---- Visual Summary / Diagram ----
  if (aidId === 'visualsummary' || aidId === 'diagram' || aidId === 'flowchart') {
    if (data?.steps || data?.visualizations) {
      const items = data.steps || data.visualizations || [];
      return (
        <div className="space-y-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-gray-800/30 border border-gray-700/30 text-sm">
              <span className="text-indigo-400 text-xs font-mono flex-shrink-0">{i + 1}.</span>
              <span className="text-gray-200">{item.step || item.title || item.label || String(item)}</span>
            </div>
          ))}
        </div>
      );
    }
  }

  // ---- Generic object render ----
  if (data && typeof data === 'object') {
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

  if (typeof data === 'string') return <span className="text-sm text-gray-200">{data}</span>;
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

  useEffect(() => {
    api.learningAids(subjectId, chapterId).then((payload) => {
      setData(payload);
      setLoading(false);
    }).catch((err) => {
      console.error('LearningAids load error:', err);
      setLoading(false);
    });
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

      {/* Subject-specific special sections - Science Experiments */}
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
                  <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/30">Teacher supervision</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-left" onClick={() => {}}>
                  View Full Experiment Procedure
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      )}
      {/* MCQ Answers */}
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
                {q.memoryHook && (
                  <div className="mt-1 p-2 rounded bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    <span className="text-xs font-semibold text-purple-400">Memory Hook:</span> {q.memoryHook}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}
      {/* Bibliography & Equations */}
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
                {data.bibliographyAndEquations.equations?.length === 0 && (
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
      {/* Social Studies Data */}
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
                          {renderAidData(aid.data, aid.id)}
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
