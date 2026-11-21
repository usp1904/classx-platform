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
      if (key === 'json' || key === 'learning-path' || key === 'help' || key === 'cycle-test') {
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

/**
 * Kahn's Algorithm for DAG Topological Sorting & Cycle Detection
 * @param {Array<{id: string, label: string, group?: string}>} nodes
 * @param {Array<[string, string]>} edges - directed [source, target]
 */
export function kahnTopologicalSort(nodes, edges) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map();
  const outgoing = new Map();
  const incoming = new Map();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }

  for (const [from, to] of edges) {
    if (nodeMap.has(from) && nodeMap.has(to)) {
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
      outgoing.get(from).push(to);
      incoming.get(to).push(from);
    }
  }

  // Enqueue all nodes with in-degree 0
  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  // Deterministic sorting of queue for stable topological orders
  queue.sort();

  const order = [];
  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);

    const neighbors = outgoing.get(u) || [];
    for (const v of neighbors) {
      const nextDeg = inDegree.get(v) - 1;
      inDegree.set(v, nextDeg);
      if (nextDeg === 0) {
        queue.push(v);
        queue.sort();
      }
    }
  }

  const isDAG = order.length === nodes.length;
  if (!isDAG) {
    // Collect nodes remaining with inDegree > 0 that form or are trapped in a cycle
    const cycleNodes = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg > 0) cycleNodes.push(id);
    }
    return {
      isDAG: false,
      hasCycle: true,
      order: null,
      cycle: cycleNodes,
      error: `Graph contains a directed cycle involving ${cycleNodes.length} node(s): ${cycleNodes.join(', ')}`
    };
  }

  // Generate dynamic linear learning path
  const learningPath = order.map((id, index) => {
    const node = nodeMap.get(id);
    return {
      step: index + 1,
      id,
      label: node?.label || id,
      group: node?.group || 'concept',
      prerequisites: incoming.get(id) || [],
      unlocks: outgoing.get(id) || []
    };
  });

  return {
    isDAG: true,
    hasCycle: false,
    order,
    cycle: null,
    learningPath
  };
}

async function loadGraph(projectRoot, subjectId, chapterId) {
  // Try local direct rag.js import
  try {
    const ragPath = path.join(projectRoot, 'server', 'lib', 'rag.js');
    const { getConceptGraph } = await import(pathToFileURL(ragPath).href);
    const graph = getConceptGraph(subjectId, chapterId);
    if (graph?.nodes?.length) return graph;
  } catch {}

  // Fallback direct JSON read
  const lessonPath = path.join(projectRoot, 'server', 'data', 'lessons', subjectId, `${chapterId}.json`);
  if (fs.existsSync(lessonPath)) {
    const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
    if (lesson.concept_maps?.nodes?.length) {
      return {
        title: lesson.concept_maps.title,
        nodes: lesson.concept_maps.nodes,
        edges: lesson.concept_maps.edges || []
      };
    }
  }
  return null;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help || (!flags.subject && !flags.chapter)) {
    console.log(`ClassX Topological Concept Sorter & DAG Validator
Usage: node topological-sort.mjs --subject <subjectId> --chapter <chapterId> [options]

Options:
  --subject <id>        Subject identifier (mathematics, science, social, english)
  --chapter <id>        Chapter identifier (real-numbers, etc.)
  --learning-path       Output detailed step-by-step linear learning path
  --cycle-test          Inject a deliberate cycle to verify cycle detection logic
  --json                Output in raw JSON format
  --format <type>       Format: json, text, steps (default: text)
  --dir <path>          Project root directory override
`);
    process.exit(flags.help ? 0 : 1);
  }

  const projectRoot = resolveProjectRoot(flags.dir);
  const subjectId = String(flags.subject || '').trim();
  const chapterId = String(flags.chapter || '').trim();

  if (!verifyChapterExists(projectRoot, subjectId, chapterId)) {
    const err = {
      ok: false,
      error: `Chapter '${chapterId}' not found in subject '${subjectId}'`,
      subjectId,
      chapterId
    };
    if (flags.json || flags.format === 'json') {
      console.log(JSON.stringify(err, null, 2));
    } else {
      console.error(`Error: ${err.error}`);
    }
    process.exit(1);
  }

  const graph = await loadGraph(projectRoot, subjectId, chapterId);
  if (!graph) {
    const err = { ok: false, error: `Could not load graph for ${subjectId}/${chapterId}` };
    console.log(flags.json || flags.format === 'json' ? JSON.stringify(err, null, 2) : err.error);
    process.exit(1);
  }

  let nodes = graph.nodes;
  let edges = graph.edges || [];

  if (flags['cycle-test']) {
    // Deliberately add an edge from leaf to root to create a cycle
    if (nodes.length >= 2) {
      const from = nodes[nodes.length - 1].id;
      const to = nodes[0].id;
      edges = [...edges, [from, to]];
    }
  }

  const result = kahnTopologicalSort(nodes, edges);

  const output = {
    ok: !result.hasCycle,
    subjectId,
    chapterId,
    title: graph.title,
    algorithm: "Kahn's Algorithm (DAG BFS)",
    totalNodes: nodes.length,
    totalEdges: edges.length,
    isDAG: result.isDAG,
    hasCycle: result.hasCycle,
    order: result.order,
    ...(result.cycle ? { cycle: result.cycle, error: result.error } : {}),
    ...(result.learningPath ? { learningPath: result.learningPath } : {})
  };

  if (flags.json || flags.format === 'json') {
    console.log(JSON.stringify(output, null, 2));
    if (result.hasCycle) process.exit(1);
    return;
  }

  if (result.hasCycle) {
    console.error(`\n❌ CYCLE DETECTED! Graph is NOT a valid DAG.`);
    console.error(result.error);
    process.exit(1);
  }

  console.log(`\n=== Topological Concept Sequence: ${output.title} ===`);
  console.log(`Subject: ${subjectId} | Chapter: ${chapterId} | Algorithm: ${output.algorithm}`);
  console.log(`Valid DAG: YES (${nodes.length} nodes sorted)\n`);

  console.log(`Linear Mastery Sequence:`);
  console.log(`  ${output.order.join(' ──> ')}\n`);

  if (flags['learning-path'] || flags.format === 'steps') {
    console.log(`Dynamic Learning Path:`);
    for (const step of output.learningPath) {
      const prereqs = step.prerequisites.length > 0 ? ` (prereq: ${step.prerequisites.join(', ')})` : ' (prereq: none [Root])';
      const unlocks = step.unlocks.length > 0 ? ` ──unlocks──> [${step.unlocks.join(', ')}]` : ' [Mastery Goal]';
      console.log(`  Step ${step.step}: [${step.id}] ${step.label} (${step.group})${prereqs}${unlocks}`);
    }
    console.log('');
  }
}

if (process.argv[1] && process.argv[1].endsWith('topological-sort.mjs')) {
  main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
