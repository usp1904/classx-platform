import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Network, Zap, Play, Share2 } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  foundation: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  method: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  analysis: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  application: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  goal: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  concept: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
};

export default function ConceptMapVisualizer() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';
  const { curriculum } = useApp();
  const [graph, setGraph] = useState<{ nodes: { id: string; label: string; group?: string }[]; edges: [string, string][]; title?: string; source?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.graph(subjectId, chapterId).then((payload) => {
      if (payload.ok && payload.graph) setGraph(payload.graph);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [subjectId, chapterId]);

  if (loading) return <div className="p-6 text-center text-muted">Loading concept map…</div>;
  if (!graph || !graph.nodes.length) return <div className="p-6 text-center text-muted">No concept map for this chapter.</div>;

  const subject = curriculum?.subjects.find((s) => s.id === subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId);

  const groups = useMemo(() => {
    const g = new Map<string, { id: string; label: string; group?: string }[]>();
    for (const node of graph.nodes) {
      const key = node.group || 'concept';
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(node);
    }
    return g;
  }, [graph.nodes]);

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    let groupIndex = 0;
    const width = 860;
    const groupColWidth = width / (groups.size || 1);
    for (const [group, nodes] of groups) {
      let rowIndex = 0;
      for (const node of nodes) {
        pos.set(node.id, { x: groupColWidth / 2 + groupIndex * groupColWidth, y: 120 + rowIndex * 80 });
        rowIndex += 1;
      }
      groupIndex += 1;
    }
    return pos;
  }, [groups]);

  const height = Math.max(320, 120 + Math.max(...Array.from(groups.values()).map((n) => n.length)) * 80);

  return (
    <div className="space-y-4">
      <SectionHeader title="Concept Map" description={`How ideas connect in ${chapter?.name || chapterId}`} action={<Badge tone="neutral" className="text-xs">{graph.source || 'Authored'}</Badge>} />
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Concepts" value={graph.nodes.length} icon={<Share2 size={20} className="text-indigo-400"/>}/>
        <Stat label="Connections" value={graph.edges.length} icon={<Zap size={20} className="text-amber-400"/>}/>
        <Stat label="Groups" value={groups.size} icon={<Network size={20} className="text-emerald-400"/>}/>
      </div>
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-900/30 pointer-events-none" />
        <div className="concept-map-scroll overflow-auto p-2" style={{ minHeight: height + 40, maxHeight: 560 }}>
          <svg viewBox={`0 0 860 ${height}`} className="w-full h-full" role="img" aria-label={graph.title || 'Concept map'}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="2" orient="auto">
                <path d="M 0,0 L 8,2 L 0,4 Z" fill="#9aa3b7" />
              </marker>
            </defs>
            {graph.edges.map(([from, to], index) => {
              const a = positions.get(from);
              const b = positions.get(to);
              if (!a || !b) return null;
              return (
                <path key={`e-${index}`} d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} stroke="#64748b" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
              );
            })}
            {graph.nodes.map((node) => {
              const p = positions.get(node.id)!;
              const style = GROUP_COLORS[node.group || 'concept'];
              const label = String(node.label).slice(0, 14);
              return (
                <g key={node.id} className="node cursor-pointer" style={{ transform: `translate(${p.x - 50}px, ${p.y - 18}px)` }}>
                  <rect x={0} y={0} width={100} height={36} rx="8" fill="var(--color-background-tertiary)" stroke={style.border} strokeWidth="1.5" />
                  <rect x={0} y={0} width={4} height={36} fill={style.text} />
                  <text x={14} y={22} fontSize="11" fontWeight="600" fill="#e8e6de">{label}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          {Array.from(groups.entries()).map(([group, nodes]) => {
            const style = GROUP_COLORS[group || 'concept'];
            return (
              <span key={group} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${style.border} ${style.text} ${style.bg}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                {group}
              </span>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
