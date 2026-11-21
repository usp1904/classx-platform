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
      if (key === 'json' || key === 'help') {
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

async function searchApi(apiUrl, query, options) {
  const url = new URL(`${apiUrl.replace(/\/+$/, '')}/api/search`);
  url.searchParams.set('q', query);
  if (options.chapterId) url.searchParams.set('chapter', options.chapterId);
  if (options.limit) url.searchParams.set('limit', String(options.limit));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
  return await res.json();
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const query = String(flags.query || flags.q || '').trim();

  if (flags.help || !query) {
    console.log(`ClassX Grounded RAG Chunk Search CLI
Usage: node search-chunks.mjs --query "<query text>" [options]

Options:
  --query, -q <text>    Search query string
  --subject <id>        Filter by subject (mathematics, science, social, english)
  --chapter <id>        Filter by chapter (real-numbers, chemical-reactions, etc.)
  --type <type>         Filter by chunk type (concept, theorem, example, exercise, quiz, etc.)
  --limit <n>           Maximum results to return (default: 8, max: 30)
  --json                Output in raw JSON format
  --format <type>       Format: json, text, card (default: text)
  --api <url>           Optional live HTTP server URL (e.g. http://localhost:8787)
  --dir <path>          Project root directory override
`);
    process.exit(flags.help ? 0 : 1);
  }

  const projectRoot = resolveProjectRoot(flags.dir);
  const subjectId = flags.subject ? String(flags.subject).trim() : null;
  const chapterId = flags.chapter ? String(flags.chapter).trim() : null;
  const targetType = flags.type ? String(flags.type).trim() : null;
  const parsedLimit = parseInt(flags.limit, 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(30, parsedLimit)) : 8;

  let searchData = null;

  if (flags.api) {
    try {
      searchData = await searchApi(flags.api, query, { chapterId, limit });
    } catch (err) {
      if (!flags.json) {
        console.warn(`[WARN] API search failed (${err.message}). Falling back to local offline index.`);
      }
    }
  }

  if (!searchData) {
    // Local direct import from server/lib/rag.js
    const ragPath = path.join(projectRoot, 'server', 'lib', 'rag.js');
    const { getIndex } = await import(pathToFileURL(ragPath).href);
    const index = getIndex().ensureBuilt();
    
    // Perform search
    const candidateLimit = (targetType || chapterId || subjectId) ? Math.max(limit * 5, 100) : limit;
    const rawResult = index.search(query, { subjectId, chapterId, limit: candidateLimit });
    searchData = {
      ...rawResult,
      totalCandidates: index.chunks.length
    };
  }

  let results = (searchData.results || []).map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    chapterId: r.chapterId,
    chapterName: r.chapterName,
    anchor: r.anchor,
    score: typeof r.score === 'number' ? Math.round(r.score * 1000) / 1000 : 0,
    text: r.text
  }));

  if (targetType) {
    results = results.filter(r => r.type.toLowerCase() === targetType.toLowerCase());
  }
  if (chapterId) {
    results = results.filter(r => r.chapterId === chapterId);
  }
  if (subjectId) {
    results = results.filter(r => r.subjectId === subjectId);
  }

  results = results.slice(0, limit);

  const output = {
    ok: true,
    query,
    count: results.length,
    totalCandidates: searchData.totalCandidates || searchData.diagnostics?.candidates || 4377,
    diagnostics: searchData.diagnostics || {
      strategy: 'bm25 + hashed-vector + graph-boost + rrf'
    },
    results
  };

  if (flags.json || flags.format === 'json') {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`\n=== ClassX RAG Hybrid Search: "${query}" ===`);
  console.log(`Candidates Indexed: ${output.totalCandidates} chunks across 67 chapters`);
  console.log(`Matched: ${results.length} chunks (Strategy: ${output.diagnostics.strategy})\n`);

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    console.log(`[#${i + 1}] (${item.score}) [${item.type.toUpperCase()}] ${item.title}`);
    console.log(`     Location: ${item.subjectId} / ${item.chapterId} (#${item.anchor})`);
    const preview = item.text.replace(/\s+/g, ' ').slice(0, 160);
    console.log(`     Snippet: "${preview}..."\n`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('search-chunks.mjs')) {
  main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
