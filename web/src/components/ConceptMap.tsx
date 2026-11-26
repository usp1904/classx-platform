import { useMemo } from 'react';

interface Props {
  title?: string;
  nodes: { id: string; label: string; group?: string }[];
  edges: [string, string][];
}

const colors: Record<string, string> = {
  foundation: '#1B4332',
  method: '#15803D',
  analysis: '#B45309',
  application: '#D95D39',
  goal: '#18181B',
  concept: '#1B4332',
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
                d={`M ${a.x + 69} ${a.y} C ${a.x + 112} ${a.y}, ${b.x - 112} ${b.y}, ${b.x - 69} ${b.y}`}
                fill="none"
                stroke="var(--line-strong, #D4D1CA)"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
            );
          })}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--line-strong, #D4D1CA)" />
            </marker>
          </defs>
          {[...layout.positions.entries()].map(([id, position]) => {
            const group = position.node.group || 'concept';
            const color = colors[group] || colors.concept;
            const label = position.node.label || '';
            let line1 = label;
            let line2 = '';
            if (label.length > 16) {
              const words = label.split(' ');
              if (words.length > 1) {
                let acc = '';
                let i = 0;
                while (i < words.length && (acc + (acc ? ' ' : '') + words[i]).length <= 16) {
                  acc += (acc ? ' ' : '') + words[i];
                  i++;
                }
                line1 = acc || words[0];
                line2 = words.slice(i).join(' ');
                if (line2.length > 18) line2 = line2.slice(0, 16) + '…';
              } else {
                line1 = label.slice(0, 14);
                line2 = label.slice(14, 28) + (label.length > 28 ? '…' : '');
              }
            }
            return (
              <g key={id}>
                <rect x={position.x} y={position.y - 24} width="138" height="48" rx="12" fill="var(--canvas, #FAF9F6)" stroke={color} strokeWidth="1.6" />
                <circle cx={position.x + 12} cy={position.y} r="4" fill={color} />
                {line2 ? (
                  <>
                    <text x={position.x + 22} y={position.y - 3} fontSize="10" fontWeight="600" fill="var(--ink, #18181B)">
                      {line1}
                    </text>
                    <text x={position.x + 22} y={position.y + 11} fontSize="9" fill="var(--muted, #52525B)">
                      {line2}
                    </text>
                  </>
                ) : (
                  <text x={position.x + 22} y={position.y + 4} fontSize="10.5" fontWeight="600" fill="var(--ink, #18181B)">
                    {line1}
                  </text>
                )}
                <text x={position.x} y={position.y + 42} fontSize="8.5" fill="var(--muted-2, #71717A)" letterSpacing="0.08em">{group.toUpperCase()}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
