import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const skillRoot = path.join(projectRoot, 'skills', 'classx-knowledge-rag');

test('Skill Package: structure, frontmatter, and schema validity', async (t) => {
  await t.test('SKILL.md exists and adheres to frontmatter standards', () => {
    const skillMdPath = path.join(skillRoot, 'SKILL.md');
    assert.ok(fs.existsSync(skillMdPath), 'SKILL.md must exist in skill root');
    const content = fs.readFileSync(skillMdPath, 'utf8');

    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatterMatch, 'SKILL.md must contain valid YAML frontmatter between --- markers');

    const fmLines = frontmatterMatch[1].split(/\r?\n/);
    let name = null;
    let description = null;
    for (const line of fmLines) {
      if (line.startsWith('name:')) name = line.replace('name:', '').trim();
      if (line.startsWith('description:')) description = line.replace('description:', '').trim();
    }

    assert.equal(name, 'classx-knowledge-rag', 'Skill name must be "classx-knowledge-rag"');
    assert.match(name, /^[a-z0-9-]+$/, 'Skill name must be lowercase alphanumeric and hyphens only');
    assert.ok(description && description.startsWith('Use when'), 'Skill description must begin with "Use when..."');
    assert.ok(description.length <= 1024, 'Skill description must be <= 1024 characters');
  });

  await t.test('All CLI scripts and schema resources exist', () => {
    const expectedScripts = [
      'query-graph.mjs',
      'topological-sort.mjs',
      'prereq-chain.mjs',
      'search-chunks.mjs',
      'verify-rag.mjs'
    ];
    for (const script of expectedScripts) {
      const scriptPath = path.join(skillRoot, 'scripts', script);
      assert.ok(fs.existsSync(scriptPath), `Missing expected CLI script: scripts/${script}`);
    }

    const schemasPath = path.join(skillRoot, 'resources', 'schemas.json');
    assert.ok(fs.existsSync(schemasPath), 'resources/schemas.json must exist');
    const schemas = JSON.parse(fs.readFileSync(schemasPath, 'utf8'));
    assert.ok(schemas.definitions.ConceptNode, 'Schema definition ConceptNode must exist');
    assert.ok(schemas.definitions.TopologicalSortOutput, 'Schema definition TopologicalSortOutput must exist');
    assert.ok(schemas.definitions.PrereqChainOutput, 'Schema definition PrereqChainOutput must exist');
    assert.ok(schemas.definitions.RAGSearchOutput, 'Schema definition RAGSearchOutput must exist');
  });
});

test('Skill Tools: CLI execution, graph queries, and algorithm correctness', async (t) => {
  await t.test('query-graph.mjs extracts concept graph with topological order', () => {
    const script = path.join(skillRoot, 'scripts', 'query-graph.mjs');
    const stdout = execFileSync(process.execPath, [script, '--subject', 'mathematics', '--chapter', 'real-numbers', '--topo', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
    const res = JSON.parse(stdout);
    assert.equal(res.ok, true);
    assert.equal(res.subjectId, 'mathematics');
    assert.equal(res.chapterId, 'real-numbers');
    assert.ok(Array.isArray(res.nodes) && res.nodes.length >= 8);
    assert.ok(Array.isArray(res.edges) && res.edges.length >= 8);
    assert.ok(Array.isArray(res.rootConcepts) && res.rootConcepts.includes('n1'));
    assert.ok(Array.isArray(res.topologicalOrder) && res.topologicalOrder.length === res.nodes.length);
  });

  await t.test('topological-sort.mjs executes Kahn algorithm and returns dynamic learning path', () => {
    const script = path.join(skillRoot, 'scripts', 'topological-sort.mjs');
    const stdout = execFileSync(process.execPath, [script, '--subject', 'mathematics', '--chapter', 'real-numbers', '--learning-path', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
    const res = JSON.parse(stdout);
    assert.equal(res.ok, true);
    assert.equal(res.isDAG, true);
    assert.equal(res.hasCycle, false);
    assert.ok(Array.isArray(res.order) && res.order.length >= 8);
    assert.ok(Array.isArray(res.learningPath) && res.learningPath.length === res.order.length);
    assert.equal(res.learningPath[0].step, 1);
    assert.ok(res.learningPath[0].unlocks.length > 0);
  });

  await t.test('topological-sort.mjs cycle detection catches deliberate cycle', () => {
    const script = path.join(skillRoot, 'scripts', 'topological-sort.mjs');
    let threw = false;
    try {
      execFileSync(process.execPath, [script, '--subject', 'mathematics', '--chapter', 'real-numbers', '--cycle-test', '--json'], {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 30000
      });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 1, 'Process must exit with code 1 on cycle detection');
      const parsed = JSON.parse(err.stdout);
      assert.equal(parsed.hasCycle, true);
      assert.equal(parsed.isDAG, false);
      assert.ok(Array.isArray(parsed.cycle) && parsed.cycle.length > 0);
    }
    assert.ok(threw, 'Cycle test must trigger process exit code 1');
  });

  await t.test('prereq-chain.mjs resolves backward prerequisites and forward unlocks', () => {
    const script = path.join(skillRoot, 'scripts', 'prereq-chain.mjs');
    const stdout = execFileSync(process.execPath, [script, '--subject', 'mathematics', '--chapter', 'real-numbers', '--concept', 'n9', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
    const res = JSON.parse(stdout);
    assert.equal(res.ok, true);
    assert.equal(res.conceptId, 'n9');
    assert.ok(Array.isArray(res.upstreamPrerequisites) && res.upstreamPrerequisites.length >= 4);
    assert.ok(Array.isArray(res.chapterPrerequisites) && res.chapterPrerequisites.includes('MATH_CLASS9_NUMBER_SYSTEMS'));
  });

  await t.test('search-chunks.mjs retrieves grounded RAG chunks with score', () => {
    const script = path.join(skillRoot, 'scripts', 'search-chunks.mjs');
    const stdout = execFileSync(process.execPath, [script, '--query', 'Fundamental Theorem of Arithmetic', '--limit', '3', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
    const res = JSON.parse(stdout);
    assert.equal(res.ok, true);
    assert.ok(Array.isArray(res.results) && res.results.length > 0);
    assert.equal(res.results[0].chapterId, 'real-numbers');
    assert.ok(typeof res.results[0].score === 'number' && res.results[0].score > 0);
  });

  await t.test('query-graph.mjs validates nonexistent subject/chapter and exits 1', () => {
    const script = path.join(skillRoot, 'scripts', 'query-graph.mjs');
    let threw = false;
    try {
      execFileSync(process.execPath, [script, '--subject', 'nonexistent', '--chapter', 'nonexistent', '--json'], {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 30000
      });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 1, 'query-graph.mjs must exit with code 1 on nonexistent chapter');
      const parsed = JSON.parse(err.stdout);
      assert.equal(parsed.ok, false);
      assert.match(parsed.error, /Chapter 'nonexistent' not found in subject 'nonexistent'/);
    }
    assert.ok(threw, 'Nonexistent chapter must trigger exit code 1');
  });

  await t.test('topological-sort.mjs validates nonexistent subject/chapter and exits 1', () => {
    const script = path.join(skillRoot, 'scripts', 'topological-sort.mjs');
    let threw = false;
    try {
      execFileSync(process.execPath, [script, '--subject', 'nonexistent', '--chapter', 'nonexistent', '--json'], {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 30000
      });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 1, 'topological-sort.mjs must exit with code 1 on nonexistent chapter');
      const parsed = JSON.parse(err.stdout);
      assert.equal(parsed.ok, false);
      assert.match(parsed.error, /Chapter 'nonexistent' not found in subject 'nonexistent'/);
    }
    assert.ok(threw, 'Nonexistent chapter must trigger exit code 1');
  });

  await t.test('search-chunks.mjs rejects whitespace-only query and exits 1 with usage help', () => {
    const script = path.join(skillRoot, 'scripts', 'search-chunks.mjs');
    let threw = false;
    try {
      execFileSync(process.execPath, [script, '--query', '   ', '--json'], {
        cwd: projectRoot,
        encoding: 'utf8',
        timeout: 30000
      });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 1, 'search-chunks.mjs must exit with code 1 on whitespace query');
      assert.match(err.stdout, /ClassX Grounded RAG Chunk Search CLI/);
    }
    assert.ok(threw, 'Whitespace-only query must trigger exit code 1');
  });

  await t.test('search-chunks.mjs clamps limit 0 to 1 and strictly isolates chapter boundaries', () => {
    const script = path.join(skillRoot, 'scripts', 'search-chunks.mjs');
    
    // Test limit 0 clamping
    const stdoutLimit0 = execFileSync(process.execPath, [script, '--query', 'Fundamental Theorem', '--limit', '0', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
    const resLimit0 = JSON.parse(stdoutLimit0);
    assert.equal(resLimit0.ok, true);
    assert.equal(resLimit0.count, 1);
    assert.equal(resLimit0.results.length, 1);

    // Test chapter isolation (0 cross-chapter leakage)
    const stdoutIsolation = execFileSync(process.execPath, [script, '--query', 'real numbers', '--chapter', 'nonexistent_chap_xyz', '--json'], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30000
    });
    const resIsolation = JSON.parse(stdoutIsolation);
    assert.equal(resIsolation.ok, true);
    assert.equal(resIsolation.count, 0);
    assert.equal(resIsolation.results.length, 0);
  });

  await t.test('verify-rag.mjs executes full suite cleanly with exit code 0', () => {
    const script = path.join(skillRoot, 'scripts', 'verify-rag.mjs');
    const stdout = execFileSync(process.execPath, [script], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 45000
    });
    assert.match(stdout, /14\/14 checks passed/);
  });
});

test('UI/UX Layout Integrity: CSS coordination, rail offsets, and SVG bug fixes', async (t) => {
  await t.test('web/src/utilities.css exists, is imported in main.tsx, and defines key utilities', () => {
    const utilsPath = path.join(projectRoot, 'web', 'src', 'utilities.css');
    assert.ok(fs.existsSync(utilsPath), 'utilities.css must exist');
    const content = fs.readFileSync(utilsPath, 'utf8');
    assert.ok(content.includes('.grid-cols-3'), 'Must define .grid-cols-3');
    assert.ok(content.includes('.aspect-video'), 'Must define .aspect-video');
    assert.ok(content.includes('.space-y-4'), 'Must define .space-y-4');
    assert.ok(content.includes('.relative'), 'Must define .relative');
    assert.ok(content.includes('.absolute'), 'Must define .absolute');

    const mainTsx = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'main.tsx'), 'utf8');
    assert.ok(mainTsx.includes('./utilities.css'), 'main.tsx must import utilities.css');
  });

  await t.test('Sticky header CSS variables are coordinated without rail underlap', () => {
    const stylesCss = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'styles.css'), 'utf8');
    assert.ok(stylesCss.includes('--topbar-height:'), 'Must define --topbar-height');
    assert.ok(stylesCss.includes('--quickbar-height:'), 'Must define --quickbar-height');
    assert.ok(stylesCss.includes('--header-total-height:'), 'Must define --header-total-height');
    assert.ok(stylesCss.includes('top: var(--topbar-height'), 'quick-access-bar must use dynamic --topbar-height');

    const chapterCss = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'courses-chapter.css'), 'utf8');
    assert.ok(chapterCss.includes('top: calc(var(--header-total-height'), 'chapter-rail must align below header-total-height');

    const practiceCss = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'practice-mock.css'), 'utf8');
    assert.ok(practiceCss.includes('top: calc(var(--header-total-height'), 'practice-rail and mock-rail must align below header-total-height');

    const tutorCss = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'tutor-planner.css'), 'utf8');
    assert.ok(tutorCss.includes('top: calc(var(--header-total-height'), 'tutor-context and planner-rail must align below header-total-height');

    const progressCss = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'progress-library.css'), 'utf8');
    assert.ok(progressCss.includes('top: calc(var(--header-total-height'), 'progress-rail must align below header-total-height');
  });

  await t.test('Responsive media queries prevent mid-viewport crushing and mobile drift', () => {
    const responsiveCss = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'responsive.css'), 'utf8');
    assert.ok(responsiveCss.includes('.continue-card { grid-template-columns: 1fr'), 'continue-card must collapse at <= 1080px');
    assert.ok(responsiveCss.includes('--topbar-height: 52px'), '780px breakpoint must adjust --topbar-height to 52px');
    assert.ok(responsiveCss.includes('--topbar-height: 48px'), '560px breakpoint must adjust --topbar-height to 48px');
  });

  await t.test('SVG syntax bug in VisualBlock.tsx is fixed', () => {
    const visualBlockTsx = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'components', 'VisualBlock.tsx'), 'utf8');
    assert.ok(!visualBlockTsx.includes('x2="60 + base"'), 'VisualBlock must not contain string literal "60 + base"');
    assert.ok(visualBlockTsx.includes('x2={60 + base}'), 'VisualBlock must use numeric expression {60 + base}');
  });

  await t.test('ConceptMap.tsx theme fill and label wrapping are fixed', () => {
    const conceptMapTsx = fs.readFileSync(path.join(projectRoot, 'web', 'src', 'components', 'ConceptMap.tsx'), 'utf8');
    assert.ok(!conceptMapTsx.includes('fill="#fff"'), 'ConceptMap must not have hardcoded white rect fill');
    assert.ok(conceptMapTsx.includes('var(--surface-solid'), 'ConceptMap must use theme-aware surface-solid fill');
  });
});

test('Documentation & Progress Tracking: INSTRUCTIONS.md audit & checklist', async (t) => {
  await t.test('INSTRUCTIONS.md tracks recent commits and contains structured checklist with explicit tags', () => {
    const instructionsPath = path.join(projectRoot, 'INSTRUCTIONS.md');
    assert.ok(fs.existsSync(instructionsPath), 'INSTRUCTIONS.md must exist');
    const content = fs.readFileSync(instructionsPath, 'utf8');

    assert.ok(content.includes('c594959'), 'INSTRUCTIONS.md must audit commit c594959');
    assert.ok(content.includes('b7a11e2'), 'INSTRUCTIONS.md must audit commit b7a11e2');
    assert.ok(content.includes('classx-knowledge-rag'), 'INSTRUCTIONS.md must reference classx-knowledge-rag');

    const completedMatches = content.match(/\[COMPLETED\]/g) || [];
    const incompleteMatches = content.match(/\[INCOMPLETE\]/g) || [];

    assert.ok(completedMatches.length >= 15, `Must have >= 15 [COMPLETED] tags (found ${completedMatches.length})`);
    assert.ok(incompleteMatches.length >= 5, `Must have >= 5 [INCOMPLETE] tags (found ${incompleteMatches.length})`);
  });
});
