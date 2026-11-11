import React, { useMemo, useState } from 'react';
import type { Visualization } from '../types';

const palette = { indigo: '#4855c9', mint: '#0f9f7f', saffron: '#e79a2d', rose: '#d95c72', ink: '#1c2437' };

function NumberLine({ props }: { props: Record<string, unknown> }) {
  const range = (props.range as [number, number]) || [-10, 10];
  const markers = (props.markers as { position: number; label: string; color?: string }[]) || [];
  const width = 720;
  const pad = 44;
  const x = (value: number) => pad + ((value - range[0]) / (range[1] - range[0])) * (width - pad * 2);
  return (
    <svg viewBox="0 0 720 190" className="viz-svg" role="img" aria-label="Number line classification">
      <line x1={pad} y1="100" x2={width - pad} y2="100" stroke="#9aa3b7" strokeWidth="2" />
      <polygon points={`${width - pad + 12},100 ${width - pad - 2},94 ${width - pad - 2},106`} fill="#9aa3b7" />
      {Array.from({ length: Math.round(range[1] - range[0]) + 1 }).map((_, i) => {
        const value = range[0] + i;
        const major = value % 2 === 0;
        return (
          <g key={value}>
            <line x1={x(value)} y1={major ? 94 : 97} x2={x(value)} y2={major ? 106 : 103} stroke="#b8bfcc" />
            {major && <text x={x(value)} y="128" textAnchor="middle" fontSize="11" fill="#6f7789">{value}</text>}
          </g>
        );
      })}
      {markers.map((marker, index) => {
        const color = marker.color === 'green' ? palette.mint : marker.color === 'red' ? palette.rose : palette.indigo;
        const above = index % 2 === 0;
        return (
          <g key={`${marker.position}-${index}`}>
            <line x1={x(marker.position)} y1={above ? 56 : 100} x2={x(marker.position)} y2={above ? 100 : 145} stroke={color} strokeWidth="1.5" />
            <circle cx={x(marker.position)} cy="100" r="6" fill={color} />
            <text x={x(marker.position)} y={above ? 47 : 160} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{marker.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function RightTriangle({ props, interactive = false }: { props: Record<string, unknown>; interactive?: boolean }) {
  const [angle, setAngle] = useState(Number(props.angle) || 34);
  const labels = (props.labels as string[]) || ['a', 'b', 'c'];
  const sides = (props.sides as (number | string)[]) || [3, 4, 5];
  const base = Math.max(120, Math.min(300, Number(sides[1]) * 38 || 220));
  const height = Math.max(90, Math.min(280, Number(sides[0]) * 38 || 150));
  const hyp = Math.sqrt(base * base + height * height);
  const angleActual = interactive ? angle : (Math.atan2(height, base) * 180) / Math.PI;
  const rad = (angleActual * Math.PI) / 180;
  const h = interactive ? Math.min(280, base * Math.tan(rad)) : height;
  return (
    <div className="viz-interactive">
      <svg viewBox="0 0 520 360" className="viz-svg" role="img" aria-label={String(props.title || 'Right triangle')}>
        <g transform="translate(70 300)">
          <polygon points={`0,0 ${base},0 ${base},${-h}`} fill="rgba(72,85,201,.08)" stroke="none" />
          <line x1="0" y1="0" x2={base} y2="0" stroke={palette.indigo} strokeWidth="4" />
          <line x1={base} y1="0" x2={base} y2={-h} stroke={palette.mint} strokeWidth="4" />
          <line x1="0" y1="0" x2={base} y2={-h} stroke={palette.rose} strokeWidth="4" />
          <rect x={base - 16} y={-16} width="16" height="16" fill="none" stroke="#9aa3b7" strokeWidth="1.5" />
          <path d={`M 38 0 A 38 38 0 0 0 ${38 * Math.cos(rad)} ${-38 * Math.sin(rad)}`} fill="none" stroke={palette.saffron} strokeWidth="2.5" />
          <text x="48" y="-12" fontSize="13" fill={palette.saffron} fontWeight="700">{Math.round(angleActual)}°</text>
          <text x={base / 2} y="24" textAnchor="middle" fill={palette.indigo} fontSize="13" fontWeight="700">{labels[1] || 'adjacent'}</text>
          <text x={base + 12} y={-h / 2} fill={palette.mint} fontSize="13" fontWeight="700">{labels[0] || 'opposite'}</text>
          <text x={base / 2 - 60} y={-h / 2 - 12} fill={palette.rose} fontSize="13" fontWeight="700">{labels[2] || 'hypotenuse'}</text>
        </g>
        {Boolean(props.showSquares) && (
          <g opacity="0.85">
            <rect x="88" y="270" width={Math.min(90, base * 0.32)} height={Math.min(90, base * 0.32)} fill="rgba(72,85,201,.12)" stroke={palette.indigo} strokeDasharray="4 4" />
            <rect x="385" y="150" width={Math.min(70, h * 0.28)} height={Math.min(70, h * 0.28)} fill="rgba(15,159,127,.12)" stroke={palette.mint} strokeDasharray="4 4" />
          </g>
        )}
      </svg>
      {interactive && (
        <label className="viz-slider">
          <span>Angle <strong>{angle}°</strong></span>
          <input type="range" min="12" max="75" value={angle} onChange={(event) => setAngle(Number(event.target.value))} />
          <small>Watch opposite grow and adjacent shrink. sin θ = opp/hyp, cos θ = adj/hyp.</small>
        </label>
      )}
    </div>
  );
}

function HeightDistance({ props }: { props: Record<string, unknown> }) {
  const [angle, setAngle] = useState(Number(props.angle) || 45);
  const distance = Number(props.observerDistance) || 100;
  const height = distance * Math.tan((angle * Math.PI) / 180);
  const clamp = Math.min(230, Math.max(30, height * 0.7));
  const base = Math.min(300, Math.max(140, distance * 1.4));
  return (
    <div className="viz-interactive">
      <svg viewBox="0 0 520 340" className="viz-svg" role="img" aria-label="Angle of elevation">
        <line x1="60" y1="285" x2="470" y2="285" stroke="#9aa3b7" strokeWidth="2" />
        <g>
          <line x1="60" y1="285" x2="60" y2={285 - clamp} stroke={palette.ink} strokeWidth="7" strokeLinecap="round" />
          <rect x="52" y={285 - clamp - 10} width="18" height="10" fill={palette.saffron} />
          <line x1="60" y1="285" x2="60 + base" y2="285" stroke={palette.indigo} strokeWidth="3" />
          <line x1="60" y1="285" x2="60" y2={285 - clamp} stroke={palette.mint} strokeWidth="2" strokeDasharray="5 4" />
          <line x1="60" y1="285" x2={"60"} y2={285 - clamp} stroke={palette.rose} strokeWidth="2" />
          <path d={`M 112 285 A 52 52 0 0 0 ${60 + 52 * Math.cos((angle * Math.PI) / 180)} ${285 - 52 * Math.sin((angle * Math.PI) / 180)}`} fill="none" stroke={palette.saffron} strokeWidth="2.5" />
          <text x="68" y="266" fontSize="14" fontWeight="700" fill={palette.saffron}>{angle}°</text>
          <text x={60 + base / 2} y="307" textAnchor="middle" fontSize="12" fill={palette.indigo}>observer distance {distance} m</text>
          <text x="78" y={285 - clamp / 2} fontSize="12" fill={palette.mint}>height ≈ {height.toFixed(1)} m</text>
          <circle cx="60" cy="285" r="4" fill={palette.ink} />
          <circle cx={60 + base} cy="285" r="4" fill={palette.indigo} />
        </g>
      </svg>
      <label className="viz-slider">
        <span>Angle of elevation <strong>{angle}°</strong></span>
        <input type="range" min="15" max="70" value={angle} onChange={(event) => setAngle(Number(event.target.value))} />
        <small>Height = distance × tan θ. At {distance} m, height ≈ {height.toFixed(1)} m. No trigonometry table needed — reason with the ratio.</small>
      </label>
    </div>
  );
}

function CoordinateGraph({ props }: { props: Record<string, unknown> }) {
  const points = (props.points as number[][]) || [[0, 0], [5, 5]];
  const size = 420;
  const pad = 48;
  const max = Math.max(6, ...points.flat().map((n) => Math.abs(Number(n)) + 2));
  const x = (v: number) => pad + ((v + max) / (max * 2)) * (size - pad * 2);
  const y = (v: number) => size - pad - ((v + max) / (max * 2)) * (size - pad * 2);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="viz-svg" role="img" aria-label="Coordinate geometry graph">
      {Array.from({ length: max * 2 + 1 }).map((_, i) => (
        <g key={i}>
          <line x1={pad + (i * (size - pad * 2)) / (max * 2)} y1={pad} x2={pad + (i * (size - pad * 2)) / (max * 2)} y2={size - pad} stroke="#e7e5df" />
          <line x1={pad} y1={pad + (i * (size - pad * 2)) / (max * 2)} x2={size - pad} y2={pad + (i * (size - pad * 2)) / (max * 2)} stroke="#e7e5df" />
        </g>
      ))}
      <line x1={pad} y1={y(0)} x2={size - pad} y2={y(0)} stroke="#8c93a4" strokeWidth="1.5" />
      <line x1={x(0)} y1={pad} x2={x(0)} y2={size - pad} stroke="#8c93a4" strokeWidth="1.5" />
      {points.length >= 2 && (
        <>
          <line x1={x(points[0][0])} y1={y(points[0][1])} x2={x(points[1][0])} y2={y(points[1][1])} stroke={palette.rose} strokeWidth="3" />
          {Boolean(props.showRightTriangle) && (
            <polyline points={`${x(points[0][0])},${y(points[0][1])} ${x(points[1][0])},${y(points[0][1])} ${x(points[1][0])},${y(points[1][1])}`} fill="none" stroke="#c8ccd6" strokeDasharray="5 4" />
          )}
          {Boolean(props.showDistance) && (
            <text x={(x(points[0][0]) + x(points[1][0])) / 2} y={(y(points[0][1]) + y(points[1][1])) / 2 - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill={palette.rose}>
              d = √[(x₂−x₁)² + (y₂−y₁)²]
            </text>
          )}
        </>
      )}
      {points.map((point, index) => (
        <g key={index}>
          <circle cx={x(point[0])} cy={y(point[1])} r="6" fill={palette.indigo} />
          <text x={x(point[0]) + 10} y={y(point[1]) - 10} fontSize="12" fontWeight="700" fill={palette.ink}>({point[0]}, {point[1]})</text>
        </g>
      ))}
    </svg>
  );
}

function SimilarTriangles({ props }: { props: Record<string, unknown> }) {
  const triangles = (props.triangles as { vertices: number[][]; label?: string }[]) || [];
  const all = triangles.flatMap((t) => t.vertices);
  const max = Math.max(4, ...all.flat().map((n) => Math.abs(Number(n)))) + 2;
  const scale = 150 / max;
  return (
    <svg viewBox="0 0 520 320" className="viz-svg" role="img" aria-label="Similar triangles">
      {triangles.map((triangle, index) => {
        const offset = 70 + index * 230;
        const points = triangle.vertices.map(([px, py]) => `${offset + px * scale},${260 - py * scale}`).join(' ');
        return (
          <g key={index}>
            <polygon points={points} fill={index ? 'rgba(15,159,127,.12)' : 'rgba(72,85,201,.12)'} stroke={index ? palette.mint : palette.indigo} strokeWidth="3" />
            <text x={offset + 38} y="292" fontSize="13" fontWeight="700" fill={index ? palette.mint : palette.indigo}>{triangle.label || `Triangle ${index + 1}`}</text>
          </g>
        );
      })}
      <text x="260" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill={palette.ink}>AA similarity → corresponding sides in equal ratio</text>
    </svg>
  );
}

function UnitCircle({ props }: { props: Record<string, unknown> }) {
  const [angle, setAngle] = useState(45);
  const rad = (angle * Math.PI) / 180;
  const cx = 210;
  const cy = 210;
  const r = 140;
  const px = cx + r * Math.cos(rad);
  const py = cy - r * Math.sin(rad);
  return (
    <div className="viz-interactive">
      <svg viewBox="0 0 420 420" className="viz-svg" role="img" aria-label="Unit circle">
        <line x1="40" y1="210" x2="380" y2="210" stroke="#8c93a4" />
        <line x1="210" y1="40" x2="210" y2="380" stroke="#8c93a4" />
        <circle cx="210" cy="210" r="140" fill="none" stroke={palette.indigo} strokeWidth="3" />
        <line x1="210" y1="210" x2={px} y2={py} stroke={palette.rose} strokeWidth="3" />
        <line x1={px} y1={py} x2={px} y2="210" stroke={palette.mint} strokeWidth="2" strokeDasharray="5 4" />
        <line x1="210" y1={py} x2={px} y2={py} stroke={palette.saffron} strokeWidth="2" strokeDasharray="5 4" />
        <circle cx={px} cy={py} r="6" fill={palette.rose} />
        <text x={px + 10} y={py - 10} fontSize="12" fontWeight="700" fill={palette.ink}>(cos θ, sin θ)</text>
        <text x="222" y="200" fontSize="12" fill={palette.saffron}>sin</text>
        <text x={px + 6} y="228" fontSize="12" fill={palette.mint}>cos</text>
        <text x="48" y="50" fontSize="12" fill={palette.indigo}>radius = 1</text>
      </svg>
      <label className="viz-slider">
        <span>Angle <strong>{angle}°</strong></span>
        <input type="range" min="0" max="360" value={angle} onChange={(event) => setAngle(Number(event.target.value))} />
        <small>sin({angle}°) = {Math.sin(rad).toFixed(3)} · cos({angle}°) = {Math.cos(rad).toFixed(3)} · tan = {Math.tan(rad).toFixed(3)}</small>
      </label>
    </div>
  );
}

export function VisualBlock({ viz }: { viz: Visualization }) {
  const props = viz.visualizationProperties || {};
  const type = String(props.type || '');
  return (
    <div className="visual-card">
      <div className="visual-head">
        <div>
          <div className="eyebrow">Interactive visual</div>
          <h3>{String(props.title || 'Concept visual')}</h3>
        </div>
        <span className="visual-tag">{type.replace(/_/g, ' ')}</span>
      </div>
      {type === 'number_line' && <NumberLine props={props} />}
      {(type === 'right_triangle' || type === 'right_triangle_labels') && <RightTriangle props={props} interactive />}
      {type === 'height_distance' && <HeightDistance props={props} />}
      {type === 'coordinate_graph' && <CoordinateGraph props={props} />}
      {type === 'similar_triangles' && <SimilarTriangles props={props} />}
      {type === 'unit_circle' && <UnitCircle props={props} />}
      {!['number_line', 'right_triangle', 'right_triangle_labels', 'height_distance', 'coordinate_graph', 'similar_triangles', 'unit_circle'].includes(type) && (
        <div className="empty-state small">Visual mapped but renderer not yet assigned ({type}).</div>
      )}
    </div>
  );
}
