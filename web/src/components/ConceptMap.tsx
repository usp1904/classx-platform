import { useMemo } from 'react';

interface Props {
  title?: string;
  nodes: { id: string; label: string; group?: string }[];
  edges: [string, string][];
}

const colors: Record<string, string> = {
  foundation: '#4855c9',
  method: '#0f9f7f',
  analysis: '#e79a2d',
  application: '#d95c72',
  goal: '#7a4fbf',
  concept: '#4855c9',
};

export function ConceptMap({ title, nodes, edges }: Props) {
  const layout = useMemo(() => {
    const groups: string[] = [];
    const grouped = new Map<string, { id: string; label: string; group?: string }[]>();
    for (const node of nodes) {
      const group = node.group || 'concept';
      if (!grouped.has(group)) {
        grouped.set(group, []);
        groups.push(group);
      }
      grouped.get(group)!.push(node);
    }
    const positions = new Map<string, { x: number; y: number; node: typeof nodes[number] }>();
    let maxRows = 1;
    groups.forEach((group, groupIndex) => {
      const list = grouped.get(group)!;
      maxRows = Math.max(maxRows, list.length);
      list.forEach((node, rowIndex) => {
        positions.set(node.id, {
          x: 92 + groupIndex * 178,
          y: 76 + rowIndex * 74,
          node,
        });
      });
    });
    return { edges, groups, grouped, positions, width: Math.max(660, 150 + groups.length * 178), height: Math.max(320, 100 + maxRows * 74) };
  }, [nodes, edges]);

  if (!nodes.length) return null;

  return (
    <div className="concept-map">
      <div className="eyebrow">Concept map</div>
      <h3>{title || 'How the ideas connect'}</h3>
      <div className="concept-map-scroll">
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={title || 'Concept map'}>
          {layout.edges.map(([from, to], index) => {
            const a = layout.positions.get(from);
            const b = layout.positions.get(to);
            if (!a || !b) return null;
            return (
              <path
                key={index}
                d={`M ${a.x + 66} ${a.y} C ${a.x + 110} ${a.y}, ${b.x - 110} ${b.y}, ${b.x - 66} ${b.y}`}
                fill="none"
                stroke="#c9c6be"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
            );
          })}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#c9c6be" />
            </marker>
          </defs>
          {[...layout.positions.entries()].map(([id, position]) => {
            const group = position.node.group || 'concept';
            const color = colors[group] || colors.concept;
            const wordCount = position.node.label.split(' ').length;
            return (
              <g key={id}>
                <rect x={position.x} y={position.y - 24} width="132" height="48" rx="12" fill="#fff" stroke={color} strokeWidth="1.6" />
                <circle cx={position.x + 14} cy={position.y} r="4" fill={color} />
                <text x={position.x + 26} y={position.y + (wordCount > 4 ? -3 : 4)} fontSize="10.5" fontWeight="600" fill="#1c2437">
                  {position.node.label.length > 28 ? `${position.node.label.slice(0, 26)}…` : position.node.label}
                </text>
                {wordCount > 4 && (
                  <text x={position.x + 26} y={position.y + 10} fontSize="9" fill="#7b8294">
                    {position.node.label.split(' ').slice(3, 7).join(' ')}
                  </text>
                )}
                <text x={position.x} y={position.y + 42} fontSize="8.5" fill="#9aa0ae" letterSpacing="0.08em">{group.toUpperCase()}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
