#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key === 'json' || key === 'all-prereqs' || key === 'help') {
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

async function loadLesson(projectRoot, subjectId, chapterId) {
  const lessonPath = path.join(projectRoot, 'server', 'data', 'lessons', subjectId, `${chapterId}.json`);
  if (fs.existsSync(lessonPath)) {
    return JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
  }
  // Try source/lessons
  const srcPath = path.join(projectRoot, 'source', 'lessons', subjectId, `${chapterId}.json`);
  if (fs.existsSync(srcPath)) {
    return JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  }
  return null;
}

/**
 * Backward prerequisite tracing via BFS
 */
export function traceBackwardPrerequisites(targetId, nodes, edges) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const incoming = new Map();
  for (const n of nodes) incoming.set(n.id, []);
  for (const [from, to] of edges) {
    if (incoming.has(to)) incoming.get(to).push(from);
  }

  const visited = new Map(); // id -> distance
  const queue = [{ id: targetId, dist: 0 }];

  while (queue.length > 0) {
    const { id, dist } = queue.shift();
    const parents = incoming.get(id) || [];
    for (const p of parents) {
      if (!visited.has(p)) {
        visited.set(p, dist + 1);
        queue.push({ id: p, dist: dist + 1 });
      }
    }
  }

  return Array.from(visited.entries()).map(([id, distance]) => {
    const node = nodeMap.get(id);
    return {
      id,
      label: node?.label || id,
      group: node?.group || 'concept',
      distance
    };
  }).sort((a, b) => b.distance - a.distance || a.id.localeCompare(b.id));
}

/**
 * Forward unlock tree tracing via BFS
 */
export function traceForwardUnlocks(targetId, nodes, edges) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const outgoing = new Map();
  for (const n of nodes) outgoing.set(n.id, []);
  for (const [from, to] of edges) {
    if (outgoing.has(from)) outgoing.get(from).push(to);
  }

  const visited = new Map(); // id -> distance
  const queue = [{ id: targetId, dist: 0 }];

  while (queue.length > 0) {
    const { id, dist } = queue.shift();
    const children = outgoing.get(id) || [];
    for (const c of children) {
      if (!visited.has(c)) {
        visited.set(c, dist + 1);
        queue.push({ id: c, dist: dist + 1 });
      }
    }
  }

  return Array.from(visited.entries()).map(([id, distance]) => {
    const node = nodeMap.get(id);
    return {
      id,
      label: node?.label || id,
      group: node?.group || 'concept',
      distance
    };
  }).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help || (!flags.subject && !flags['all-prereqs'])) {
    console.log(`ClassX Prerequisite Chain & Unlock Tree CLI
Usage: node prereq-chain.mjs --subject <subjectId> --chapter <chapterId> [options]

Options:
  --subject <id>        Subject identifier (mathematics, science, social, english)
  --chapter <id>        Chapter identifier (real-numbers, etc.)
  --concept <id>        Target concept node identifier (e.g. n9, n5)
  --direction <dir>     Direction: backward, forward, both (default: both)
  --all-prereqs         Audit all chapter-level prerequisite nodes in this chapter or curriculum
  --json                Output in raw JSON format
  --format <type>       Format: json, text (default: text)
  --dir <path>          Project root directory override
`);
    process.exit(flags.help ? 0 : 1);
  }

  const projectRoot = resolveProjectRoot(flags.dir);
  const subjectId = String(flags.subject || '').trim();
  const chapterId = String(flags.chapter || '').trim();
  const targetConcept = String(flags.concept || flags.node || '').trim();
  const direction = String(flags.direction || 'both').toLowerCase();

  const lesson = await loadLesson(projectRoot, subjectId, chapterId);
  const chapterPrerequisites = lesson?.prerequisite_nodes || [];

  if (flags['all-prereqs'] && !targetConcept) {
    const output = {
      ok: true,
      subjectId,
      chapterId,
      chapterPrerequisites,
      totalChapterPrereqs: chapterPrerequisites.length
    };
    if (flags.json || flags.format === 'json') {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`\n=== Chapter Prerequisites: ${subjectId}/${chapterId} ===`);
      for (const pr of chapterPrerequisites) {
        console.log(`  - ${pr}`);
      }
    }
    return;
  }

  const nodes = lesson?.concept_maps?.nodes || [];
  const edges = lesson?.concept_maps?.edges || [];

  if (!nodes.length) {
    const err = { ok: false, error: `No concept map nodes found for ${subjectId}/${chapterId}` };
    console.log(flags.json || flags.format === 'json' ? JSON.stringify(err, null, 2) : err.error);
    process.exit(1);
  }

  // If no concept specified, pick the terminal leaf node
  const activeTarget = targetConcept || nodes[nodes.length - 1].id;
  const targetNode = nodes.find(n => n.id === activeTarget);

  if (!targetNode) {
    const err = { ok: false, error: `Concept node '${activeTarget}' not found in concept map` };
    console.log(flags.json || flags.format === 'json' ? JSON.stringify(err, null, 2) : err.error);
    process.exit(1);
  }

  let upstreamPrerequisites = [];
  let downstreamUnlocked = [];

  if (direction === 'backward' || direction === 'both') {
    upstreamPrerequisites = traceBackwardPrerequisites(activeTarget, nodes, edges);
  }
  if (direction === 'forward' || direction === 'both') {
    downstreamUnlocked = traceForwardUnlocks(activeTarget, nodes, edges);
  }

  const output = {
    ok: true,
    subjectId,
    chapterId,
    conceptId: activeTarget,
    conceptLabel: targetNode.label,
    group: targetNode.group || 'concept',
    direction,
    chapterPrerequisites,
    ...(direction === 'backward' || direction === 'both' ? {
      upstreamPrerequisites,
      totalUpstreamPrerequisites: upstreamPrerequisites.length
    } : {}),
    ...(direction === 'forward' || direction === 'both' ? {
      downstreamUnlocked,
      totalDownstreamUnlocked: downstreamUnlocked.length
    } : {})
  };

  if (flags.json || flags.format === 'json') {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`\n=== Prerequisite & Unlock Analysis: [${activeTarget}] ${targetNode.label} ===`);
  console.log(`Subject: ${subjectId} | Chapter: ${chapterId} | Group: ${targetNode.group || 'concept'}`);

  if (chapterPrerequisites.length > 0) {
    console.log(`\nFoundational Chapter Prerequisites:`);
    for (const pr of chapterPrerequisites) {
      console.log(`  ★ ${pr}`);
    }
  }

  if (direction === 'backward' || direction === 'both') {
    console.log(`\nUpstream Concepts Required (Backward Traversal):`);
    if (upstreamPrerequisites.length === 0) {
      console.log(`  None (This concept is a foundational root)`);
    } else {
      for (const item of upstreamPrerequisites) {
        console.log(`  [${item.id}] ${item.label} (hops: ${item.distance}, group: ${item.group})`);
      }
    }
  }

  if (direction === 'forward' || direction === 'both') {
    console.log(`\nDownstream Concepts Unlocked (Forward Traversal):`);
    if (downstreamUnlocked.length === 0) {
      console.log(`  None (This concept is a final mastery goal)`);
    } else {
      for (const item of downstreamUnlocked) {
        console.log(`  [${item.id}] ${item.label} (hops: ${item.distance}, group: ${item.group})`);
      }
    }
  }
  console.log('');
}

if (process.argv[1] && process.argv[1].endsWith('prereq-chain.mjs')) {
  main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
