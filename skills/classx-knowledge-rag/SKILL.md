---
name: classx-knowledge-rag
description: Use when querying the ClassX Platform knowledge graph, traversing topological concept maps, retrieving grounded RAG chunks, analyzing prerequisite learning chains, or verifying CBSE Class X curriculum citations
---

# ClassX Platform Knowledge Graph, RAG & Concept Maps Skill

This production skill provides operational workflows and standalone CLI utilities for querying and traversing the ClassX Platform knowledge graph, topological concept maps, and 4,377 grounded RAG chunks across 4 subjects and 67 chapters.

## Architectural Overview

ClassX Platform is an offline-first educational system mapped to the CBSE Class X 2026-27 curriculum and DSC/UPSC competitive foundation tracks.
- **Knowledge Graph**: 284 indexed concept nodes, 52 authored chapter concept maps (`concept_maps` DAG with directed edges), 67 curriculum chapters, and prerequisite nodes linking foundational Class 6–9 competencies.
- **Grounded Hybrid RAG Index**: 4,377 chunks across 13 pedagogical chunk types (`concept`, `theorem`, `example`, `exercise`, `quiz`, `misconception`, `overview`, `mindmap`, `flowchart`, `visual`, `shortcut`, `syllabus`, `conceptmap`).
- **Retrieval Engine**: 512-dimensional hashed vector similarity + BM25 term frequency + intra-unit graph neighbor boost (+0.028) + Reciprocal Rank Fusion (RRF).
- **Execution Modes**: Dual-mode support.
  1. *Direct Disk / In-Memory Mode* (Default, offline, sub-50ms): Evaluates directly against `server/data/lessons/` JSON and imports `server/lib/rag.js`. No running server required.
  2. *Live HTTP Mode*: Pass `--api http://localhost:8787` to query live API endpoints (`/api/graph/:subject/:chapter`, `/api/search`).

---

## Bundled CLI Tool Reference

All tools are standalone Node.js ESM scripts located in `skills/classx-knowledge-rag/scripts/`. Always invoke with the `node` runtime interpreter:

| Tool | CLI Command | Purpose |
|---|---|---|
| **Graph Query** | `node skills/classx-knowledge-rag/scripts/query-graph.mjs --subject <id> --chapter <id> [options]` | Extract concept nodes, directed edges, root concepts, and neighbor chapters |
| **Topological Sort** | `node skills/classx-knowledge-rag/scripts/topological-sort.mjs --subject <id> --chapter <id> [options]` | Kahn's algorithm DAG topological sort, cycle detection, and dynamic learning path |
| **Prerequisite Chain** | `node skills/classx-knowledge-rag/scripts/prereq-chain.mjs --subject <id> --chapter <id> [options]` | Backward recursive prerequisite tracing and forward concept unlock tree |
| **RAG Chunk Search** | `node skills/classx-knowledge-rag/scripts/search-chunks.mjs --query "<text>" [options]` | Hybrid BM25 + hashed-vector retrieval across 4,377 curriculum chunks |
| **Verification Suite** | `node skills/classx-knowledge-rag/scripts/verify-rag.mjs` | Automated verification of skill syntax, tool execution, and layout validity |

---

## Operational Workflows

### 1. Concept Graph Query & Topology Inspection

Retrieve the directed concept graph for any curriculum chapter:

```bash
# Formatted text inspection
node skills/classx-knowledge-rag/scripts/query-graph.mjs --subject mathematics --chapter real-numbers

# Output as ASCII concept tree
node skills/classx-knowledge-rag/scripts/query-graph.mjs --subject mathematics --chapter real-numbers --format tree

# Full JSON payload with Kahn's topological order
node skills/classx-knowledge-rag/scripts/query-graph.mjs --subject mathematics --chapter real-numbers --topo --json
```

**JSON Output Structure**:
```json
{
  "ok": true,
  "subjectId": "mathematics",
  "chapterId": "real-numbers",
  "title": "How Real Numbers Connect — Concept Map",
  "source": "Authored concept map",
  "totalNodes": 9,
  "totalEdges": 10,
  "rootConcepts": ["n1", "n3"],
  "leafConcepts": ["n9"],
  "groups": {
    "foundation": ["n1", "n3"],
    "algorithm": ["n2"],
    "application": ["n4", "n5", "n7"],
    "proof": ["n6"],
    "technique": ["n8"],
    "goal": ["n9"]
  },
  "nodes": [
    { "id": "n1", "label": "Euclid's Lemma", "group": "foundation", "inDegree": 0, "outDegree": 1 }
  ],
  "edges": [["n1", "n2"], ["n2", "n9"]],
  "topologicalOrder": ["n1", "n3", "n2", "n4", "n5", "n6", "n7", "n8", "n9"]
}
```

---

### 2. Kahn's Algorithm DAG Topological Sorting & Dynamic Learning Paths

Compute the mathematically validated linear pedagogical progression through a chapter's concept dependencies:

```bash
# Linear topological order
node skills/classx-knowledge-rag/scripts/topological-sort.mjs --subject mathematics --chapter real-numbers

# Step-by-step dynamic linear learning path with prerequisites and unlocks
node skills/classx-knowledge-rag/scripts/topological-sort.mjs --subject mathematics --chapter real-numbers --learning-path --json
```

**Cycle Detection Contract**:
If directed edges contain a dependency cycle (e.g., A → B → C → A), the tool aborts with exit code 1 and surfaces the offending nodes:
```json
{
  "ok": false,
  "isDAG": false,
  "hasCycle": true,
  "order": null,
  "cycle": ["n1", "n2", "n9"],
  "error": "Graph contains a directed cycle involving 3 node(s): n1, n2, n9"
}
```

---

### 3. Prerequisite Chaining (Backward & Forward)

Trace foundational competencies upstream or assess what advanced topics are unlocked downstream:

```bash
# Full backward + forward trace for concept n9 (Competitive Exam Problems)
node skills/classx-knowledge-rag/scripts/prereq-chain.mjs --subject mathematics --chapter real-numbers --concept n9 --json

# Backward prerequisites only for irrationality proofs (n6)
node skills/classx-knowledge-rag/scripts/prereq-chain.mjs --subject mathematics --chapter real-numbers --concept n6 --direction backward

# Audit foundational Class 6-9 prerequisite node identifiers for a chapter
node skills/classx-knowledge-rag/scripts/prereq-chain.mjs --subject mathematics --chapter real-numbers --all-prereqs --json
```

**Output**:
```json
{
  "ok": true,
  "conceptId": "n9",
  "conceptLabel": "Competitive Exam Problems",
  "chapterPrerequisites": [
    "MATH_CLASS9_NUMBER_SYSTEMS",
    "MATH_CLASS6_FRACTIONS",
    "MATH_CLASS9_LINEAR_EQUATIONS_ONE_VAR"
  ],
  "upstreamPrerequisites": [
    { "id": "n5", "label": "Decimal Expansions", "group": "application", "distance": 4 },
    { "id": "n6", "label": "Irrationality Proofs", "group": "proof", "distance": 3 },
    { "id": "n1", "label": "Euclid's Lemma", "group": "foundation", "distance": 2 },
    { "id": "n2", "label": "HCF via Algorithm", "group": "algorithm", "distance": 1 }
  ],
  "downstreamUnlocked": []
}
```

---

### 4. Grounded RAG Chunk Search & Intent Filtering

Retrieve authoritative curriculum citations across 4,377 chunks:

```bash
# Query with type filter and limit
node skills/classx-knowledge-rag/scripts/search-chunks.mjs --query "Fundamental Theorem of Arithmetic" --type theorem --limit 3 --json

# Query specific chapter
node skills/classx-knowledge-rag/scripts/search-chunks.mjs --query "neutralization reaction" --chapter chemical-reactions-and-equations --limit 5
```

**Output Diagnostics**:
```json
{
  "ok": true,
  "query": "Fundamental Theorem of Arithmetic",
  "count": 1,
  "totalCandidates": 4377,
  "diagnostics": {
    "strategy": "bm25 + hashed-vector + graph-boost + rrf",
    "latencyMs": 14.2,
    "intent": ["theorem", "concept"]
  },
  "results": [
    {
      "id": "mathematics:real-numbers:theorem:1",
      "type": "theorem",
      "title": "Fundamental Theorem of Arithmetic",
      "subjectId": "mathematics",
      "chapterId": "real-numbers",
      "anchor": "theorem-1",
      "score": 0.289,
      "text": "Every composite number greater than 1 can be expressed as a product of primes uniquely..."
    }
  ]
}
```

---

### 5. Automated Verification

Run the bundled verification test suite to ensure all tools and schemas comply with the operational specification:

```bash
node skills/classx-knowledge-rag/scripts/verify-rag.mjs
```

---

## Resources & Schemas

The skill includes schema definitions in `resources/schemas.json`:
- `ConceptNode`: Node schema (`id`, `label`, `group`, `inDegree`, `outDegree`).
- `ConceptGraphOutput`: Full graph query response schema.
- `TopologicalSortOutput`: Topological sort and dynamic learning path schema.
- `PrereqChainOutput`: Prerequisite resolution schema.
- `RAGSearchOutput`: Grounded chunk search result schema.
