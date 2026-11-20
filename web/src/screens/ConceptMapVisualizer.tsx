import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Network, Zap, Share2, AlertCircle, Sparkles, BookOpen, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';

interface NodeColor {
  fill: string;
  stroke: string;
  text: string;
  accent: string;
}

const COLOR_MAP: Record<string, NodeColor> = {
  foundation: { fill: '#1e1b4b', stroke: '#6366f1', text: '#c7d2fe', accent: '#818cf8' },
  method: { fill: '#064e3b', stroke: '#10b981', text: '#a7f3d0', accent: '#34d399' },
  analysis: { fill: '#451a03', stroke: '#f59e0b', text: '#fde68a', accent: '#fbbf24' },
  application: { fill: '#4c0519', stroke: '#f43f5e', text: '#fecdd3', accent: '#fb7185' },
  goal: { fill: '#3b0764', stroke: '#a855f7', text: '#f3e8ff', accent: '#c084fc' },
  concept: { fill: '#1e293b', stroke: '#64748b', text: '#e2e8f0', accent: '#94a3b8' },
};

export default function ConceptMapVisualizer() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const navigate = useNavigate();
  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';
  const { curriculum } = useApp();

  const [graph, setGraph] = useState<{ nodes: { id: string; label: string; group?: string }[]; edges: [string, string][]; title?: string; source?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; group?: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedNode(null);
    api.graph(subjectId, chapterId).then((payload) => {
      if (payload.ok && payload.graph && payload.graph.nodes && payload.graph.nodes.length > 0) {
        setGraph(payload.graph);
        setError(false);
        setSelectedNode(payload.graph.nodes[0] || null);
      } else {
        setError(true);
      }
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [subjectId, chapterId]);

  const currentSubject = curriculum?.subjects?.find((s) => s.id === subjectId);
  const currentChapter = currentSubject?.chapters?.find((c) => c.id === chapterId);

  const groups = useMemo(() => {
    const g = new Map<string, { id: string; label: string; group?: string }[]>();
    if (!graph?.nodes) return g;
    for (const node of graph.nodes) {
      const key = node.group || 'concept';
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(node);
    }
    return g;
  }, [graph?.nodes]);

  // Layout positions: clean multi-tier circular and column layout
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    if (!graph?.nodes) return pos;

    const width = 860;
    const groupColWidth = width / Math.max(1, groups.size);
    let groupIndex = 0;

    for (const [, nodes] of groups) {
      let rowIndex = 0;
      for (const node of nodes) {
        const x = groupColWidth / 2 + groupIndex * groupColWidth;
        const y = 80 + rowIndex * 90;
        pos.set(node.id, { x, y });
        rowIndex += 1;
      }
      groupIndex += 1;
    }
    return pos;
  }, [groups, graph?.nodes]);

  const maxRow = Math.max(1, ...Array.from(groups.values()).map((n) => n.length));
  const height = Math.max(380, 100 + maxRow * 90);

  // Connected nodes for the selected node
  const connectedEdges = useMemo(() => {
    if (!graph || !selectedNode) return [];
    return graph.edges.filter(([from, to]) => from === selectedNode.id || to === selectedNode.id);
  }, [graph, selectedNode]);

  if (loading) return <div className="page-loading"><div className="loader-ring" /><span>Synthesizing Concept Knowledge Graph…</span></div>;

  return (
    <div className="page space-y-6">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow light flex items-center gap-2">
            <Network size={14} className="text-indigo-400" />
            <span>Interactive Cognitive Architecture</span>
          </div>
          <h1>Concept Graph Visualizer</h1>
          <p>
            Explore the structural topology of <strong>{currentChapter?.name || chapterId}</strong>. Trace definitions, theorems, formulas, and real-world mechanisms.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="indigo" className="text-xs font-bold">{graph?.nodes?.length || 0} Nodes</Badge>
          <Badge tone="mint" className="text-xs font-bold">{graph?.edges?.length || 0} Relations</Badge>
        </div>
      </div>

      {/* Chapter Switcher Toolbar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="select-wrap compact-select">
            <select
              value={subjectId}
              onChange={(e) => {
                const newSub = curriculum?.subjects?.find((s) => s.id === e.target.value);
                const firstCh = newSub?.chapters?.[0]?.id || 'real-numbers';
                navigate(`/concept-map/${e.target.value}/${firstCh}`);
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
              onChange={(e) => navigate(`/concept-map/${subjectId}/${e.target.value}`)}
            >
              {currentSubject?.chapters?.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/courses/${subjectId}/${chapterId}`)}>
            <BookOpen size={14} />
            <span>Read Chapter</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/learning-aids/${subjectId}/${chapterId}`)}>
            <Sparkles size={14} />
            <span>Learning Aids</span>
          </Button>
        </div>
      </Card>

      {error || !graph || !graph.nodes.length ? (
        <Card className="p-12 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-amber-400" />
          <h3 className="text-lg font-bold text-white mb-2">No Visual Graph for this Chapter</h3>
          <p className="text-gray-400 text-xs max-width-md mx-auto mb-4">
            This syllabus chapter is currently indexed as raw topic text. Visual concept maps are available for all authored Mathematics, Science, and Social Science chapters.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" size="sm" onClick={() => navigate('/concept-map/mathematics/real-numbers')}>
              View Real Numbers Graph
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/concept-map/science/chemical-reactions-and-equations')}>
              View Chemical Reactions Graph
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main SVG Graph Canvas */}
          <Card className="lg:col-span-3 p-4 overflow-hidden relative min-h-[460px]">
            <div className="flex items-center justify-between mb-3 text-xs text-gray-400 border-b border-white/10 pb-2">
              <span className="flex items-center gap-2 font-semibold text-gray-200">
                <Layers size={14} className="text-indigo-400" />
                <span>Click any node to inspect semantic connections</span>
              </span>
              <span className="font-mono text-[11px] text-gray-500">860 × {height}</span>
            </div>

            <div className="overflow-auto max-h-[580px] p-2">
              <svg viewBox={`0 0 860 ${height}`} className="w-full h-auto min-w-[720px]" role="img" aria-label={graph.title || 'Concept Map'}>
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="2" orient="auto">
                    <path d="M 0,0 L 8,2 L 0,4 Z" fill="#6366f1" />
                  </marker>
                  <marker id="arrow-active" markerWidth="10" markerHeight="10" refX="8" refY="2" orient="auto">
                    <path d="M 0,0 L 8,2 L 0,4 Z" fill="#10b981" />
                  </marker>
                </defs>

                {/* Edges */}
                {graph.edges.map(([from, to], index) => {
                  const a = positions.get(from);
                  const b = positions.get(to);
                  if (!a || !b) return null;
                  const isHighlighted = selectedNode && (from === selectedNode.id || to === selectedNode.id);
                  return (
                    <path
                      key={`e-${index}`}
                      d={`M ${a.x} ${a.y} Q ${(a.x + b.x) / 2 + 10} ${(a.y + b.y) / 2 - 10} ${b.x} ${b.y}`}
                      stroke={isHighlighted ? '#10b981' : 'rgba(99,102,241,0.3)'}
                      strokeWidth={isHighlighted ? 2.5 : 1.2}
                      strokeDasharray={isHighlighted ? 'none' : '4 3'}
                      fill="none"
                      markerEnd={isHighlighted ? 'url(#arrow-active)' : 'url(#arrow)'}
                      className="transition-all duration-300"
                    />
                  );
                })}

                {/* Nodes */}
                {graph.nodes.map((node) => {
                  const p = positions.get(node.id);
                  if (!p) return null;
                  const style = COLOR_MAP[node.group || 'concept'] || COLOR_MAP.concept;
                  const isSelected = selectedNode?.id === node.id;
                  const isConnected = selectedNode && connectedEdges.some(([from, to]) => (from === node.id && to === selectedNode.id) || (to === node.id && from === selectedNode.id));

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer transition-transform duration-200"
                      onClick={() => setSelectedNode(node)}
                      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                    >
                      <rect
                        x={p.x - 65}
                        y={p.y - 20}
                        width={130}
                        height={40}
                        rx={10}
                        fill={isSelected ? '#1e1b4b' : style.fill}
                        stroke={isSelected ? '#818cf8' : isConnected ? '#34d399' : style.stroke}
                        strokeWidth={isSelected ? 2.5 : isConnected ? 2 : 1.2}
                        className="transition-colors shadow-lg"
                      />
                      <rect
                        x={p.x - 65}
                        y={p.y - 20}
                        width={5}
                        height={40}
                        rx={2}
                        fill={isSelected ? '#818cf8' : style.accent}
                      />
                      <text
                        x={p.x - 52}
                        y={p.y + 4}
                        fontSize={11}
                        fontWeight="600"
                        fill={isSelected ? '#ffffff' : style.text}
                      >
                        {String(node.label).length > 15 ? `${String(node.label).slice(0, 14)}…` : String(node.label)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-white/10">
              {Array.from(groups.entries()).map(([group]) => {
                const style = COLOR_MAP[group] || COLOR_MAP.concept;
                return (
                  <span
                    key={group}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: style.fill, color: style.text, border: `1px solid ${style.stroke}` }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: style.accent }} />
                    {group}
                  </span>
                );
              })}
            </div>
          </Card>

          {/* Node Inspector Side Panel */}
          <div className="space-y-4">
            <Card className="p-5 border-indigo-500/30">
              <div className="eyebrow light mb-2 text-indigo-400">Node Inspector</div>
              {selectedNode ? (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white">{selectedNode.label}</h3>
                  <div className="flex items-center gap-2">
                    <Badge tone="indigo" className="text-xs uppercase">{selectedNode.group || 'concept'}</Badge>
                    <span className="text-[11px] font-mono text-gray-400">ID: {selectedNode.id}</span>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-gray-300 block">Direct Connections ({connectedEdges.length}):</span>
                    {connectedEdges.length === 0 ? (
                      <span className="text-xs text-muted block">No incoming or outgoing links</span>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {connectedEdges.map(([from, to], i) => {
                          const otherId = from === selectedNode.id ? to : from;
                          const otherNode = graph.nodes.find((n) => n.id === otherId);
                          const isOutgoing = from === selectedNode.id;
                          return (
                            <button
                              key={i}
                              className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs flex items-center justify-between text-gray-200 transition-colors"
                              onClick={() => otherNode && setSelectedNode(otherNode)}
                            >
                              <span>{isOutgoing ? '→ ' : '← '} {otherNode?.label || otherId}</span>
                              <ArrowRight size={12} className="text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted">Click any node on the graph to examine relationships.</p>
              )}
            </Card>

            <Card className="p-4 space-y-2">
              <span className="text-xs font-semibold text-gray-300 block">Pedagogical Value</span>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Graph-structured learning enhances retention for Class X Board reasoning questions and builds deep mental schemata for UPSC/DSC analytical sections.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
