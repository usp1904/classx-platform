#!/usr/bin/env node
// Verifies that the working tree, the Git history/remote, and the Docker image
// all describe the same build. Single source of truth is the Git commit SHA:
// it is stamped into the Docker image and reported by GET /api/health.
//
// Usage:
//   node scripts/sync-verify.mjs            # fast checks (git + contract)
//   node scripts/sync-verify.mjs --docker   # also build, run, and compare health
//
// Exit code 1 when a check fails. Warnings do not fail the run.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTIFACTS = path.join(ROOT, 'artifacts');
const PORT = Number(process.env.SYNC_VERIFY_PORT || 8899);
const WANT_DOCKER = process.argv.includes('--docker');

const results = [];
const actions = [];

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

function trySh(cmd, args) {
  try {
    return { ok: true, out: sh(cmd, args) };
  } catch (err) {
    return { ok: false, out: (err.stderr || err.stdout || err.message || '').toString().trim() };
  }
}

function check(name, fn, { warnOnly = false } = {}) {
  try {
    const detail = fn();
    results.push({ name, status: 'pass', detail });
  } catch (err) {
    results.push({ name, status: warnOnly ? 'warn' : 'fail', detail: err.message });
    if (!warnOnly) actions.push(`Fix: ${name} — ${err.message}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function health(port) {
  return fetch(`http://127.0.0.1:${port}/api/health`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

async function dockerCheck(sha) {
  const info = trySh('docker', ['info']);
  assert(info.ok, 'Docker daemon unreachable. Start Docker Desktop and re-run.');
  const image = `classx-platform:verify-${sha}`;
  const name = `classx-verify-${process.pid}`;
  try {
    const build = trySh('docker', ['build', '--build-arg', `GIT_SHA=${sha}`, '-t', image, '.']);
    assert(build.ok, `docker build failed: ${build.out.split('\n').pop()}`);
    trySh('docker', ['rm', '-f', name]);
    const run = trySh('docker', ['run', '-d', '--name', name, '-p', `${PORT}:8787`,
      '-e', 'NODE_ENV=production', '-e', 'PORT=8787', '-e', 'COOKIE_SECURE=false', image]);
    assert(run.ok, `docker run failed: ${run.out}`);

    let body = null;
    for (let i = 0; i < 30; i += 1) {
      try {
        body = await health(PORT);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    assert(body, `container never became healthy on :${PORT}`);
    assert(body.commit?.startsWith(sha) || body.commit === sha,
      `image reports commit ${body.commit}, expected ${sha}`);
    return `image ${image} healthy, commit ${body.commit}, version ${body.version}`;
  } finally {
    trySh('docker', ['rm', '-f', name]);
    trySh('docker', ['rmi', '-f', image]);
  }
}

async function main() {
  const repo = trySh('git', ['rev-parse', '--show-toplevel']);
  if (!repo.ok) {
    console.error('Not a git repository:', ROOT);
    process.exit(1);
  }

  const sha = sh('git', ['rev-parse', '--short=12', 'HEAD']);
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

  check('git branch resolved', () => {
    assert(branch && branch !== 'HEAD', 'detached HEAD');
    return branch;
  });

  check('working tree clean', () => {
    const dirty = sh('git', ['status', '--porcelain'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !line.endsWith('artifacts/'));
    assert(dirty.length === 0, `uncommitted changes:\n${dirty.join('\n')}`);
    return 'no pending changes';
  }, { warnOnly: true });

  check('upstream configured', () => {
    const up = trySh('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
    assert(up.ok, 'no upstream branch (git push -u origin HEAD)');
    return up.out;
  });

  check('local matches remote', () => {
    const fetched = trySh('git', ['fetch', '--quiet', 'origin']);
    assert(fetched.ok, `git fetch failed: ${fetched.out}`);
    const counts = sh('git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']).split(/\s+/);
    const [behind, ahead] = counts.map(Number);
    assert(ahead === 0 && behind === 0, `ahead ${ahead}, behind ${behind}`);
    return `HEAD == @{upstream} (${sha})`;
  });

  check('no secrets tracked', () => {
    const tracked = sh('git', ['ls-files']).split('\n');
    const forbidden = tracked.filter((f) =>
      /(^|\/)\.env$/.test(f)
      || /(^|\/)\.env\.(production|local)$/.test(f)
      || (/(^|\/)\.secrets(\.|$)/.test(f) && !/\.secrets\.example$/.test(f))
      || /\.(pem|key)$/.test(f));
    assert(forbidden.length === 0, `tracked secret files: ${forbidden.join(', ')}`);

    const suspicious = [];
    for (const f of tracked) {
      if (!/\.(?:js|mjs|cjs|ts|tsx|jsx|json|ya?ml|md|txt|env|example|conf|toml|ini|sh|ps1)$/.test(f)) continue;
      const abs = path.join(ROOT, f);
      let stat;
      try { stat = fs.statSync(abs); } catch { continue; }
      if (stat.size > 512 * 1024) continue;
      const text = fs.readFileSync(abs, 'utf8');
      if (/sk-or-v1-[0-9a-f]{16,}|sk-[A-Za-z0-9]{32,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/.test(text)) {
        suspicious.push(f);
      }
    }
    assert(suspicious.length === 0, `key-like strings in tracked files: ${suspicious.join(', ')}`);

    assert(fs.existsSync(path.join(ROOT, '.env.production.example')), '.env.production.example missing');
    assert(fs.existsSync(path.join(ROOT, '.secrets.example')), '.secrets.example missing');
    if (fs.existsSync(path.join(ROOT, '.secrets'))) {
      const ignored = trySh('git', ['check-ignore', '-q', '.secrets']);
      assert(ignored.ok, '.secrets exists but is not gitignored');
    }
    return 'templates only; no key patterns in tracked files';
  });

  check('docker context excludes secrets', () => {
    const ignore = read('.dockerignore').split(/\r?\n/).map((line) => line.trim());
    assert(ignore.includes('.env'), '.dockerignore must exclude .env');
    assert(ignore.includes('.secrets'), '.dockerignore must exclude .secrets');
    return '.env and .secrets excluded from build context';
  });

  check('package version parity', () => {
    const pkg = JSON.parse(read('package.json'));
    assert(pkg.version, 'package.json version missing');
    return `v${pkg.version}`;
  });

  check('node version contract', () => {
    const engines = JSON.parse(read('package.json')).engines?.node || '';
    const min = Number((engines.match(/(\d+)/) || [])[1] || 0);
    const image = Number((read('Dockerfile').match(/FROM node:(\d+)/) || [])[1] || 0);
    assert(min && image, 'could not parse node versions');
    assert(image >= min, `Dockerfile node:${image} < engines ${engines}`);
    return `Dockerfile node:${image} satisfies engines ${engines}`;
  });

  check('runtime port contract', () => {
    const serverPort = Number((read('server/index.js').match(/process\.env\.PORT \|\| (\d+)/) || [])[1] || 0);
    const compose = read('docker-compose.yml');
    const hostPort = Number((compose.match(/"(\d+):(\d+)"/) || [])[2] || 0);
    assert(serverPort && hostPort, 'could not parse ports');
    assert(serverPort === hostPort, `server default ${serverPort} != compose ${hostPort}`);
    assert(/COOKIE_SECURE=/.test(compose), 'compose must set COOKIE_SECURE explicitly');
    return `PORT ${serverPort}, cookie flag explicit`;
  });

  check('deploy target branch parity', () => {
    const render = read('render.yaml');
    const target = (render.match(/^\s*branch:\s*(\S+)/m) || [])[1];
    assert(target, 'render.yaml has no branch');
    assert(target === branch, `render.yaml deploys ${target}, local branch is ${branch}`);
    return target;
  });

  if (WANT_DOCKER) {
    const idx = results.length;
    results.push({ name: 'docker image parity', status: 'fail', detail: 'running...' });
    try {
      const detail = await dockerCheck(sha);
      results[idx] = { name: 'docker image parity', status: 'pass', detail };
    } catch (err) {
      results[idx] = { name: 'docker image parity', status: 'fail', detail: err.message };
      actions.push(`Fix: docker image parity — ${err.message}`);
    }
  } else {
    results.push({ name: 'docker image parity', status: 'skip', detail: 'run with --docker' });
  }

  const icon = { pass: 'PASS', warn: 'WARN', fail: 'FAIL', skip: 'SKIP' };
  console.log(`\nClassX sync verification — ${branch} @ ${sha}\n`);
  for (const r of results) {
    console.log(`[${icon[r.status]}] ${r.name}: ${r.detail}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    branch,
    commit: sha,
    dockerChecked: WANT_DOCKER,
    results,
    nextActions: actions,
  };
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS, 'sync-status.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (actions.length) {
    console.log('\nNext actions (feed these into the next improvement pass):');
    for (const a of actions) console.log(`- ${a}`);
  } else {
    console.log('\nNo drift detected. Ready to commit/push/deploy.');
  }

  process.exit(results.some((r) => r.status === 'fail') ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
