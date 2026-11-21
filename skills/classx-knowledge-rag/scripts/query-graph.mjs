#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function parseArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key === 'json' || key === 'topo' || key === 'help') {
        flags[key] = true;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function resolveProjectRoot(explicitDir) {
  if (explicitDir && fs.existsSync(path.join(explicitDir, 'package.json'))) {
    return path.resolve(explicitDir);
  }
  if (process.env.CLASSX_PLATFORM_DIR && fs.existsSync(path.join(process.env.CLASSX_PLATFORM_DIR, 'package.json'))) {
    return path.resolve(process.env.CLASSX_PLATFORM_DIR);
  }
  // Upward traversal from current file
  let current = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'classx-platform') return current;
      } catch {}
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  // Fallback to process.cwd()
  return process.cwd();
}

function verifyChapterExists(projectRoot, subjectId, chapterId) {
  const lessonPath = path.join(projectRoot, 'server', 'data', 'lessons', subjectId, `${chapterId}.json`);
  const srcPath = path.join(projectRoot, 'source', 'lessons', subjectId, `${chapterId}.json`);
  if (fs.existsSync(lessonPath) || fs.existsSync(srcPath)) return true;

  const curriculumPath = path.join(projectRoot, 'server', 'data', 'curriculum.json');
  if (fs.existsSync(curriculumPath)) {
    try {
      const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
      const subject = curriculum.subjects?.find(s => s.id === subjectId || (subjectId === 'social' && s.id === 'social-science'));
      if (subject?.chapters?.some(c => c.id === chapterId)) return true;
    } catch {}
  }
  return false;
}

function kahnTopologicalSort(nodes, edges) {
  const nodeIds = new Set(nodes.map(n => n.id));
  const inDegree = new Map();
  const adj = new Map();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const [from, to] of edges) {
    if (nodeIds.has(from) && nodeIds.has(to)) {
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
      adj.get(from).push(to);
    }
  }
  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }
  const order = [];
  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);
    for (const v of adj.get(u)) {
      const nextDeg = inDegree.get(v) - 1;
      inDegree.set(v, nextDeg);
      if (nextDeg === 0) queue.push(v);
    }
  }
  const isDAG = order.length === nodes.length;
  return { isDAG, order: isDAG ? order : null };
}

async function fetchFromApi(apiUrl, subjectId, chapterId) {
  const url = `${apiUrl.replace(/\/+$/, '')}/api/graph/${encodeURIComponent(subjectId)}/${encodeURIComponent(chapterId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
  return await res.json();
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help || (!flags.subject && !flags.chapter)) {
    console.log(`ClassX Knowledge Graph Query CLI
Usage: node query-graph.mjs --subject <subjectId> --chapter <chapterId> [options]

Options:
  --subject <id>    Subject identifier (mathematics, science, social, english)
  --chapter <id>    Chapter identifier (real-numbers, chemical-reactions, etc.)
  --node <id>       Filter to specific node and its immediate connections
  --group <group>   Filter nodes by pedagogical group (foundation, method, analysis, etc.)
  --topo            Include Kahn's topological sort sequence in output
  --json            Output in raw JSON format
  --format <type>   Format: json, tree, text (default: text)
  --api <url>       Optional live HTTP server URL (e.g. http://localhost:8787)
  --dir <path>      Project root directory override
`);
    process.exit(flags.help ? 0 : 1);
  }

  const projectRoot = resolveProjectRoot(flags.dir);
  const subjectId = String(flags.subject || '').trim();
  const chapterId = String(flags.chapter || '').trim();

  if (!verifyChapterExists(projectRoot, subjectId, chapterId)) {
    const errorOutput = {
      ok: false,
      error: `Chapter '${chapterId}' not found in subject '${subjectId}'`,
      subjectId,
      chapterId
    };
    if (flags.json || flags.format === 'json') {
      console.log(JSON.stringify(errorOutput, null, 2));
    } else {
      console.error(`Error: ${errorOutput.error}`);
    }
    process.exit(1);
  }

  let graphData = null;

  if (flags.api) {
    try {
      graphData = await fetchFromApi(flags.api, subjectId, chapterId);
    } catch (err) {
      if (!flags.json) {
        console.warn(`[WARN] API fetch failed (${err.message}). Falling back to local offline direct import.`);
      }
    }
  }

  if (!graphData) {
    // Local direct import
    try {
      const ragPath = path.join(projectRoot, 'server', 'lib', 'rag.js');
      const { getConceptGraph, getIndex } = await import(pathToFileURL(ragPath).href);
      graphData = getConceptGraph(subjectId, chapterId);
      
      // Also get chapter neighbors if RAG index available
      try {
        const index = getIndex().ensureBuilt();
        const neighborsSet = index.graph.get(`${subjectId}:${chapterId}`);
        if (neighborsSet) {
          graphData.neighbors = Array.from(neighborsSet).map(c => `${subjectId}:${c}`);
        }
      } catch {}
    } catch (importErr) {
      // Fallback: direct JSON read
      const lessonPath = path.join(projectRoot, 'server', 'data', 'lessons', subjectId, `${chapterId}.json`);
      if (fs.existsSync(lessonPath)) {
        const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
        if (lesson.concept_maps?.nodes) {
          graphData = {
            title: lesson.concept_maps.title || `${chapterId} Concept Map`,
            nodes: lesson.concept_maps.nodes,
            edges: lesson.concept_maps.edges || [],
            source: 'Authored lesson JSON'
          };
        }
      }
    }
  }

  if (!graphData || !graphData.nodes) {
    const errorOutput = {
      ok: false,
      error: `Concept graph not found for subject '${subjectId}', chapter '${chapterId}'`,
      subjectId,
      chapterId
    };
    if (flags.json || flags.format === 'json') {
      console.log(JSON.stringify(errorOutput, null, 2));
    } else {
      console.error(`Error: ${errorOutput.error}`);
    }
    process.exit(1);
  }

  let nodes = graphData.nodes.map(n => ({ ...n }));
  let edges = graphData.edges || [];

  // Compute in/out degrees
  const inDegreeMap = new Map();
  const outDegreeMap = new Map();
  for (const n of nodes) {
    inDegreeMap.set(n.id, 0);
    outDegreeMap.set(n.id, 0);
  }
  for (const [from, to] of edges) {
    if (outDegreeMap.has(from)) outDegreeMap.set(from, outDegreeMap.get(from) + 1);
    if (inDegreeMap.has(to)) inDegreeMap.set(to, inDegreeMap.get(to) + 1);
  }

  for (const n of nodes) {
    n.inDegree = inDegreeMap.get(n.id) || 0;
    n.outDegree = outDegreeMap.get(n.id) || 0;
  }

  const rootConcepts = nodes.filter(n => n.inDegree === 0).map(n => n.id);
  const leafConcepts = nodes.filter(n => n.outDegree === 0).map(n => n.id);

  // Grouping
  const groups = {};
  for (const n of nodes) {
    const g = n.group || 'concept';
    if (!groups[g]) groups[g] = [];
    groups[g].push(n.id);
  }

  // Filter if requested
  if (flags.group) {
    nodes = nodes.filter(n => n.group === flags.group);
    const activeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(([from, to]) => activeIds.has(from) && activeIds.has(to));
  }
  if (flags.node) {
    const targetId = flags.node;
    const connectedEdges = edges.filter(([from, to]) => from === targetId || to === targetId);
    const relatedIds = new Set([targetId, ...connectedEdges.flatMap(e => e)]);
    nodes = nodes.filter(n => relatedIds.has(n.id));
    edges = connectedEdges;
  }

  let topologicalOrder = null;
  if (flags.topo) {
    const topoResult = kahnTopologicalSort(nodes, edges);
    topologicalOrder = topoResult.order;
  }

  const output = {
    ok: true,
    subjectId,
    chapterId,
    title: graphData.title || `${chapterId} Concept Map`,
    source: graphData.source || 'ClassX Graph Engine',
    totalNodes: nodes.length,
    totalEdges: edges.length,
    rootConcepts,
    leafConcepts,
    groups,
    neighbors: graphData.neighbors || [],
    nodes,
    edges,
    ...(topologicalOrder ? { topologicalOrder } : {})
  };

  if (flags.json || flags.format === 'json') {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (flags.format === 'tree') {
    console.log(`\n=== Concept Tree: ${output.title} ===`);
    console.log(`Subject: ${subjectId} | Chapter: ${chapterId} | Source: ${output.source}\n`);
    for (const rootId of rootConcepts) {
      const rootNode = nodes.find(n => n.id === rootId);
      console.log(`[Root] ${rootId}: ${rootNode?.label || rootId} (${rootNode?.group || 'concept'})`);
      const childEdges = edges.filter(([from]) => from === rootId);
      for (const [, childId] of childEdges) {
        const childNode = nodes.find(n => n.id === childId);
        console.log(`  └─> ${childId}: ${childNode?.label || childId} (${childNode?.group || 'concept'})`);
        const grandEdges = edges.filter(([from]) => from === childId);
        for (const [, grandId] of grandEdges) {
          const grandNode = nodes.find(n => n.id === grandId);
          console.log(`      └─> ${grandId}: ${grandNode?.label || grandId}`);
        }
      }
    }
    return;
  }

  // Default text format
  console.log(`\n=== Concept Graph: ${output.title} ===`);
  console.log(`Subject: ${subjectId} | Chapter: ${chapterId}`);
  console.log(`Nodes (${output.totalNodes}):`);
  for (const n of nodes) {
    console.log(`  - [${n.id}] ${n.label} (group: ${n.group}, in: ${n.inDegree}, out: ${n.outDegree})`);
  }
  console.log(`\nDirected Edges (${output.totalEdges}):`);
  for (const [from, to] of edges) {
    console.log(`  ${from} ───> ${to}`);
  }
  console.log(`\nRoot Concepts (in-degree 0): ${rootConcepts.join(', ') || 'None'}`);
  console.log(`Leaf Concepts (out-degree 0): ${leafConcepts.join(', ') || 'None'}`);
  if (topologicalOrder) {
    console.log(`Topological Sequence: ${topologicalOrder.join(' -> ')}`);
  }
  if (output.neighbors.length > 0) {
    console.log(`Chapter Neighbors: ${output.neighbors.join(', ')}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
