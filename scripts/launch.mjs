import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8787);
const url = `http://localhost:${port}`;
const args = new Set(process.argv.slice(2));
const openAll = args.has('--all') || args.has('-AllBrowsers');
const noOpen = args.has('--no-open');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browserPaths = {
  chrome: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'],
  edge: ['C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'],
  firefox: ['C:\\Program Files\\Mozilla Firefox\\firefox.exe', 'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'],
};

async function status() {
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1200) });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function launchDetached(command, commandArgs) {
  const child = spawn(command, commandArgs, { cwd: root, detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
}

function openDefault() {
  if (process.platform === 'win32') launchDetached('cmd', ['/c', 'start', '', url]);
  else if (process.platform === 'darwin') launchDetached('open', [url]);
  else launchDetached('xdg-open', [url]);
}

function openInstalled() {
  let opened = 0;
  for (const [name, candidates] of Object.entries(browserPaths)) {
    const exe = candidates.find((candidate) => fs.existsSync(candidate));
    if (!exe) continue;
    launchDetached(exe, [url]);
    console.log(`opened ${name}`);
    opened += 1;
  }
  if (!opened) {
    console.log('no supported browser found; opening the system default instead');
    openDefault();
  }
}

if (!fs.existsSync(path.join(root, 'server', 'public', 'index.html'))) {
  console.log('building the frontend once…');
  const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'web/vite.config.ts'], { cwd: root, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status || 1);
}

let running = await status();
if (!running) {
  const log = fs.openSync(path.join(os.tmpdir(), 'classx-platform.log'), 'a');
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  child.unref();
  fs.writeFileSync(path.join(os.tmpdir(), 'classx-platform.pid'), String(child.pid));
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(500);
    running = await status();
    if (running) break;
  }
}

if (!running) {
  console.error(`ClassX did not start. Check ${path.join(os.tmpdir(), 'classx-platform.log')}`);
  process.exit(1);
}

console.log(`ClassX ready at ${url}`);
console.log(`${running.curriculum.chapters} chapters · ${running.curriculum.questions} questions · ${running.rag.chunks} retrieval chunks`);

if (!noOpen) {
  if (openAll) openInstalled();
  else openDefault();
}

if (process.platform === 'win32' && !noOpen) {
  console.log('Tip: run "Start-ClassX.cmd --all" to open every installed browser.');
}
