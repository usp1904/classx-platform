#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveProjectRoot() {
  if (process.env.CLASSX_PLATFORM_DIR && fs.existsSync(path.join(process.env.CLASSX_PLATFORM_DIR, 'package.json'))) {
    return path.resolve(process.env.CLASSX_PLATFORM_DIR);
  }
  let current = __dirname;
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

const projectRoot = resolveProjectRoot();
const skillRoot = path.resolve(__dirname, '..');

const checks = [];
function recordCheck(name, passed, message = '') {
  checks.push({ name, passed, message });
  const symbol = passed ? '✔' : '✖';
  console.log(`${symbol} ${name}${message ? ' — ' + message : ''}`);
}

console.log(`\n=== ClassX Agent Skill & Knowledge RAG Verification Suite ===`);
console.log(`Project Root: ${projectRoot}`);
console.log(`Skill Root: ${skillRoot}\n`);

// 1. Verify SKILL.md Frontmatter and Standards
try {
  const skillMdPath = path.join(skillRoot, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    recordCheck('SKILL.md exists', false, 'SKILL.md file missing');
  } else {
    recordCheck('SKILL.md exists', true);
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
      recordCheck('SKILL.md YAML frontmatter', false, 'Missing YAML frontmatter markers');
    } else {
      recordCheck('SKILL.md YAML frontmatter', true);
      const fmLines = frontmatterMatch[1].split(/\r?\n/);
      let name = null;
      let description = null;
      for (const line of fmLines) {
        if (line.startsWith('name:')) name = line.replace('name:', '').trim();
        if (line.startsWith('description:')) description = line.replace('description:', '').trim();
      }
      
      const validName = name === 'classx-knowledge-rag' && /^[a-z0-9-]+$/.test(name);
      recordCheck('SKILL.md name contract', validName, `name="${name}" (must be lowercase alphanumeric + hyphens)`);

      const validDesc = description && description.startsWith('Use when') && description.length <= 1024;
      recordCheck('SKILL.md description contract', !!validDesc, `description starts with "Use when..." and length ${description?.length || 0} <= 1024 chars`);
    }
  }
} catch (err) {
  recordCheck('SKILL.md validation', false, err.message);
}

// 2. Verify Schema Definitions in resources/schemas.json
try {
  const schemasPath = path.join(skillRoot, 'resources', 'schemas.json');
  if (!fs.existsSync(schemasPath)) {
    recordCheck('resources/schemas.json exists', false, 'File not found');
  } else {
    const rawSchemas = JSON.parse(fs.readFileSync(schemasPath, 'utf8'));
    const defs = rawSchemas.definitions || {};
    const hasConceptNode = !!defs.ConceptNode;
    const hasTopological = !!defs.TopologicalSortOutput;
    const hasPrereq = !!defs.PrereqChainOutput;
    const hasRAGSearch = !!defs.RAGSearchOutput;
    recordCheck('JSON Schemas completeness', hasConceptNode && hasTopological && hasPrereq && hasRAGSearch, 'ConceptNode, TopologicalSortOutput, PrereqChainOutput, RAGSearchOutput defined');
  }
} catch (err) {
  recordCheck('JSON Schemas validation', false, err.message);
}

// 3. Test query-graph.mjs CLI execution
try {
  const queryScript = path.join(skillRoot, 'scripts', 'query-graph.mjs');
  const stdout = execFileSync(process.execPath, [queryScript, '--subject', 'mathematics', '--chapter', 'real-numbers', '--topo', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 30000
  });
  const res = JSON.parse(stdout);
  const ok = res.ok === true && Array.isArray(res.nodes) && res.nodes.length >= 5 && Array.isArray(res.topologicalOrder);
  recordCheck('CLI query-graph.mjs', ok, `Extracted ${res.nodes?.length} nodes, ${res.edges?.length} edges, topoOrder length: ${res.topologicalOrder?.length}`);
} catch (err) {
  recordCheck('CLI query-graph.mjs', false, err.message);
}

// 4. Test topological-sort.mjs Kahn's algorithm and dynamic learning path
try {
  const topoScript = path.join(skillRoot, 'scripts', 'topological-sort.mjs');
  const stdout = execFileSync(process.execPath, [topoScript, '--subject', 'mathematics', '--chapter', 'real-numbers', '--learning-path', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 30000
  });
  const res = JSON.parse(stdout);
  const ok = res.ok === true && res.isDAG === true && !res.hasCycle && Array.isArray(res.learningPath) && res.learningPath.length > 0;
  recordCheck("Kahn's Topological Sort & Learning Path", ok, `Valid DAG: ${res.isDAG}, Steps: ${res.learningPath?.length}`);
} catch (err) {
  recordCheck("Kahn's Topological Sort & Learning Path", false, err.message);
}

// 5. Test topological-sort.mjs cycle detection
try {
  const topoScript = path.join(skillRoot, 'scripts', 'topological-sort.mjs');
  let cycleCaught = false;
  try {
    execFileSync(process.execPath, [topoScript, '--subject', 'mathematics', '--chapter', 'real-numbers', '--cycle-test', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
  } catch (procErr) {
    if (procErr.status === 1) {
      const parsed = JSON.parse(procErr.stdout || '{}');
      if (parsed.hasCycle === true && parsed.isDAG === false && parsed.cycle?.length > 0) {
        cycleCaught = true;
      }
    }
  }
  recordCheck('Kahn Cycle Detection Gate', cycleCaught, 'Deliberate cycle correctly identified and returned exit code 1');
} catch (err) {
  recordCheck('Kahn Cycle Detection Gate', false, err.message);
}

// 6. Test prereq-chain.mjs backward and forward traversal
try {
  const prereqScript = path.join(skillRoot, 'scripts', 'prereq-chain.mjs');
  const stdout = execFileSync(process.execPath, [prereqScript, '--subject', 'mathematics', '--chapter', 'real-numbers', '--concept', 'n9', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 30000
  });
  const res = JSON.parse(stdout);
  const ok = res.ok === true && Array.isArray(res.upstreamPrerequisites) && res.upstreamPrerequisites.length > 0 && Array.isArray(res.chapterPrerequisites);
  recordCheck('Prerequisite Chaining (Backward & Forward)', ok, `Target n9: ${res.upstreamPrerequisites?.length} upstream prerequisites identified, ${res.chapterPrerequisites?.length} chapter prerequisites`);
} catch (err) {
  recordCheck('Prerequisite Chaining (Backward & Forward)', false, err.message);
}

// 7. Test search-chunks.mjs Grounded RAG Retrieval
try {
  const searchScript = path.join(skillRoot, 'scripts', 'search-chunks.mjs');
  const stdout = execFileSync(process.execPath, [searchScript, '--query', 'Fundamental Theorem of Arithmetic', '--limit', '3', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 30000
  });
  const res = JSON.parse(stdout);
  const ok = res.ok === true && Array.isArray(res.results) && res.results.length > 0 && res.results[0].chapterId === 'real-numbers';
  recordCheck('Grounded RAG Chunk Retrieval', ok, `Matched ${res.results?.length} chunks. Top hit: "${res.results?.[0]?.title}" in ${res.results?.[0]?.chapterId} (score: ${res.results?.[0]?.score})`);
} catch (err) {
  recordCheck('Grounded RAG Chunk Retrieval', false, err.message);
}

// 8. Test query-graph.mjs Non-existent Chapter Validation
try {
  const queryScript = path.join(skillRoot, 'scripts', 'query-graph.mjs');
  let invalidCaught = false;
  try {
    execFileSync(process.execPath, [queryScript, '--subject', 'nonexistent', '--chapter', 'nonexistent', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
  } catch (procErr) {
    if (procErr.status === 1) {
      const parsed = JSON.parse(procErr.stdout || '{}');
      if (parsed.ok === false && parsed.error && parsed.error.includes("Chapter 'nonexistent' not found")) {
        invalidCaught = true;
      }
    }
  }
  recordCheck('query-graph.mjs Invalid Chapter Rejection', invalidCaught, 'Nonexistent subject/chapter exits with code 1 and ok: false');
} catch (err) {
  recordCheck('query-graph.mjs Invalid Chapter Rejection', false, err.message);
}

// 9. Test topological-sort.mjs Non-existent Chapter Validation
try {
  const topoScript = path.join(skillRoot, 'scripts', 'topological-sort.mjs');
  let invalidCaught = false;
  try {
    execFileSync(process.execPath, [topoScript, '--subject', 'nonexistent', '--chapter', 'nonexistent', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
  } catch (procErr) {
    if (procErr.status === 1) {
      const parsed = JSON.parse(procErr.stdout || '{}');
      if (parsed.ok === false && parsed.error && parsed.error.includes("Chapter 'nonexistent' not found")) {
        invalidCaught = true;
      }
    }
  }
  recordCheck('topological-sort.mjs Invalid Chapter Rejection', invalidCaught, 'Nonexistent subject/chapter exits with code 1 and ok: false');
} catch (err) {
  recordCheck('topological-sort.mjs Invalid Chapter Rejection', false, err.message);
}

// 10. Test search-chunks.mjs Whitespace Query Rejection
try {
  const searchScript = path.join(skillRoot, 'scripts', 'search-chunks.mjs');
  let whitespaceRejected = false;
  try {
    execFileSync(process.execPath, [searchScript, '--query', '   ', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
  } catch (procErr) {
    if (procErr.status === 1) {
      whitespaceRejected = true;
    }
  }
  recordCheck('search-chunks.mjs Whitespace Query Rejection', whitespaceRejected, 'Whitespace-only query exits with code 1 and usage help');
} catch (err) {
  recordCheck('search-chunks.mjs Whitespace Query Rejection', false, err.message);
}

// 11. Test search-chunks.mjs Zero Limit Clamping & Chapter Boundary Isolation
try {
  const searchScript = path.join(skillRoot, 'scripts', 'search-chunks.mjs');
  const stdoutLimit0 = execFileSync(process.execPath, [searchScript, '--query', 'Fundamental Theorem', '--limit', '0', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 90000
  });
  const resLimit0 = JSON.parse(stdoutLimit0);

  const stdoutIsolation = execFileSync(process.execPath, [searchScript, '--query', 'real numbers', '--chapter', 'nonexistent_chap_xyz', '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 90000
  });
  const resIsolation = JSON.parse(stdoutIsolation);

  const ok = resLimit0.ok === true && resLimit0.count === 1 && resLimit0.results?.length === 1 &&
             resIsolation.ok === true && resIsolation.count === 0 && resIsolation.results?.length === 0;
  recordCheck('search-chunks.mjs Boundary Clamping & Chapter Isolation', ok, '--limit 0 clamped to 1 chunk, non-matching chapter strictly returns 0 chunks');
} catch (err) {
  recordCheck('search-chunks.mjs Boundary Clamping & Chapter Isolation', false, err.message);
}

// Summary
const total = checks.length;
const passedCount = checks.filter(c => c.passed).length;
console.log(`\nVerification Result: ${passedCount}/${total} checks passed.`);

if (passedCount === total) {
  console.log(`✔ All skill and knowledge RAG verifications passed cleanly.\n`);
  process.exit(0);
} else {
  console.error(`✖ Verification failed: ${total - passedCount} checks did not pass.\n`);
  process.exit(1);
}
