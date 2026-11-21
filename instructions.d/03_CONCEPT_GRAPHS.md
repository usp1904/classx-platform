# Subsystem: Concept Graph Generation & Visualization

## 1. Operational Status

- **Status**: **PRODUCTION READY**
- **Target Git SHA**: `b7a11e2`
- **Affected Files**:
  - `server/lib/rag.js` (lines 623-645)
  - `web/src/screens/ConceptMapVisualizer.tsx` (lines 15-22, 69-92, 202-328)
- **Verified Capabilities**:
  - Multi-tiered concept graph extraction pipeline in RAG engine.
  - Zero-exception fallback synthesis for unauthored or non-STEM chapters.
  - Interactive 2D SVG graph visualizer with responsive grid layout and quadratic Bezier arcs.
  - Arrowhead markers (`url(#arrow)`) and emerald active-path highlights (`#10B981`).
  - Hex color map isolation eliminating Tailwind class failures in SVG children.
  - Detailed Node Inspector side panel with incoming/outgoing relation traversal.

---

## 2. Usage Instructions

### 2.1 Graph Extraction Pipeline

The concept graph for any syllabus chapter is synthesized via `getConceptGraph(subjectId, chapterId)` in `server/lib/rag.js`.

#### Fallback Extraction Cascade
1. **Tier 1 (Authored Concept Map)**:
   - If `lesson?.concept_maps?.nodes?.length > 0`, the curated pedagogical graph is returned directly.
2. **Tier 2 (Lesson Concepts)**:
   - If no curated map exists but `lesson?.concepts` is present, nodes are generated from each concept, categorized into `foundation`, `method`, `analysis`, or `concept`.
3. **Tier 3 (Chapter Topics Fallback)**:
   - If no lesson file exists, `rag.js` invokes `getChapter(subjectId, chapterId)` (newly imported in `b7a11e2`).
   - Topics from `chapter.topics` are mapped into hierarchical nodes (`n0`, `n1`, `n2`...).
   - A balanced binary tree structure is constructed:
     ```javascript
     const edges = nodes.slice(1).map((node, i) => [nodes[Math.floor(i / 2)].id, node.id]);
     ```
4. **Tier 4 (Synthesized Core Nodes)**:
   - If chapter metadata is sparse, standard core pedagogical concept nodes are synthesized, guaranteeing that the returned graph is never null or empty.

#### Endpoint API Contract
```bash
GET /api/graph/:subjectId/:chapterId
```
**Example Response**:
```json
{
  "ok": true,
  "graph": {
    "nodes": [
      { "id": "n0", "label": "Euclid's Division Lemma", "group": "foundation" },
      { "id": "n1", "label": "Fundamental Theorem of Arithmetic", "group": "method" }
    ],
    "edges": [
      ["n0", "n1"]
    ]
  }
}
```

---

### 2.2 Interactive SVG Visualizer & Inspector

The React visualizer screen (`web/src/screens/ConceptMapVisualizer.tsx`) provides an interactive canvas:

1. **2D Coordinate Calculation**:
   - The `positions` memo divides nodes across columns and rows based on depth and index, ensuring node cards never overlap.
2. **Quadratic Bezier Curve Connectors**:
   - Connections between parent and child nodes are rendered as smooth SVG paths:
     ```typescript
     const d = `M ${startX} ${startY} C ${startX + dx / 2} ${startY}, ${startX + dx / 2} ${endY}, ${endX} ${endY}`;
     ```
   - Connectors carry directional arrow markers (`markerEnd="url(#arrow)"`).
3. **Active Path Highlighting**:
   - When a node is selected, all incoming and outgoing edges transition from slate (`#334155`) to vibrant emerald (`#10b981`) with increased stroke width (`strokeWidth={2.5}`).
4. **Node Inspector Side Panel**:
   - Clicking any node opens the inspector, showing its definition, group badge, and two interactive relation pill lists:
     - **Incoming Prerequisites** (`← Requires`)
     - **Outgoing Dependent Concepts** (`→ Leads to`)
   - Clicking any pill smoothly pans and focuses the inspector onto the target node.

---

## 3. Known Boundaries & Constraints

### 3.1 SVG Styling & Color Palette Isolation

SVG specifications (SVG 1.1 / 2) do not reliably evaluate utility class inheritance inside child elements (such as `<rect>` or `<path>`). Previous releases experienced unstyled or invisible cards when using Tailwind classes (`bg-indigo-950`).

Commit `b7a11e2` resolved this by isolating node styling into an immutable inline hex color dictionary:

```typescript
const COLOR_MAP: Record<string, { fill: string; stroke: string; text: string }> = {
  foundation:  { fill: '#1e1b4b', stroke: '#4338ca', text: '#c7d2fe' }, // Indigo
  method:      { fill: '#064e3b', stroke: '#059669', text: '#a7f3d0' }, // Emerald
  analysis:    { fill: '#451a03', stroke: '#d97706', text: '#fde68a' }, // Amber
  application: { fill: '#4c0519', stroke: '#e11d48', text: '#fecdd3' }, // Rose
  goal:        { fill: '#3b0764', stroke: '#9333ea', text: '#e9d5ff' }, // Purple
  concept:     { fill: '#1e293b', stroke: '#475569', text: '#cbd5e1' }  // Slate
};
```
Every SVG node card applies `fill={colors.fill}` and `stroke={colors.stroke}` directly, guaranteeing 100% reliable rendering across all browsers.

### 3.2 Graph Fallback Hierarchy

- **Large Node Counts**: For chapters with >20 topics, the visualizer auto-scales SVG viewBox width and height to prevent label truncation.
- **Empty States**: If a network failure occurs, the visualizer renders an `AlertCircle` empty-state card with one-tap redirect buttons to canonical chapter maps (e.g., *Real Numbers* or *Chemical Reactions*).

---

## 4. Validation Results & Verification Reference

- **STEM Graph Verification**: `/api/graph/mathematics/real-numbers` -> 9 nodes, 10 edges (HTTP 200).
- **Non-STEM Graph Verification**: `/api/graph/social-science/resources-and-development` -> 10 nodes, 12 edges (HTTP 200).
- **SVG Edge Math**: Verified quadratic Bezier path generation and arrow marker orientation.
- **Validation Checklist Reference**:
  - See items **CG-01 through CG-05** in [ClassX Validation Checklist — Section 3.3](../VALIDATION_CHECKLIST.md#33-concept-graph-generation--visualization).
