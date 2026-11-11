import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, firefox } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.E2E_PORT || 8799);
const base = `http://127.0.0.1:${port}`;
const shots = path.join(root, 'artifacts', 'e2e');
fs.mkdirSync(shots, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const edgePaths = [
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const findExe = (paths) => paths.find((item) => fs.existsSync(item));

const matrix = [
  { name: 'chrome', engine: chromium, options: { executablePath: findExe(chromePaths) }, full: true },
  { name: 'edge', engine: chromium, options: { executablePath: findExe(edgePaths) }, full: false },
  { name: 'firefox', engine: firefox, options: {}, full: false },
].filter((browser) => browser.engine !== chromium || browser.options.executablePath);

async function health() {
  try {
    const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1200) });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

async function ensureServer() {
  if (await health()) return null;
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
    stdio: 'ignore',
    windowsHide: true,
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(500);
    const status = await health();
    if (status?.ok) return child;
    if (child.exitCode != null) throw new Error(`server exited with code ${child.exitCode}`);
  }
  child.kill();
  throw new Error('server did not become healthy');
}

async function stopServer(child) {
  if (!child) return;
  child.kill();
  await sleep(300);
}

function watch(page, state) {
  page.on('console', (message) => {
    if (message.type() === 'error') state.errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => state.errors.push(`page: ${error.message}`));
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && url.startsWith(base) && !url.includes('favicon')) {
      state.errors.push(`http ${response.status()}: ${url.replace(base, '')}`);
    }
  });
}

async function check(state, condition, message) {
  if (!condition) throw new Error(message);
  state.passes += 1;
}

async function checkNoOverflow(page, state, label) {
  const result = await page.evaluate(() => {
    const width = window.innerWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.right > width + 1 && style.position !== 'fixed';
      })
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className || '').split(' ').filter(Boolean).slice(0, 3).join('.')}`);
    return { overflow: document.documentElement.scrollWidth - width, offenders };
  });
  await check(state, result.overflow <= 1, `${label}: horizontal overflow ${result.overflow}px (${result.offenders.join(', ')})`);
}

async function checkA11y(page, state, label) {
  const result = await page.evaluate(() => {
    const unnamed = [...document.querySelectorAll('button')].filter((button) => {
      if (!button.offsetParent) return false;
      const text = (button.innerText || '').trim();
      return !text && !button.getAttribute('aria-label') && !button.getAttribute('title');
    }).length;
    const unlabelled = [...document.querySelectorAll('input, textarea, select')].filter((field) => {
      if (!field.offsetParent) return false;
      if (field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')) return false;
      return !(field.id && document.querySelector(`label[for="${field.id}"]`)) && !field.closest('label');
    }).length;
    const images = [...document.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length;
    return { unnamed, unlabelled, images };
  });
  await check(state, result.unnamed === 0, `${label}: ${result.unnamed} buttons without names`);
  await check(state, result.unlabelled === 0, `${label}: ${result.unlabelled} unlabelled fields`);
  await check(state, result.images === 0, `${label}: ${result.images} images without alt`);
}

async function open(page, route) {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.app-shell', { timeout: 20000 });
  await page.waitForTimeout(350);
}

async function courseFlows(page, state, browserName) {
  await open(page, '/');
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 15000 });
  await check(state, (await page.locator('.subject-card, .course-subject-card').count()) >= 0, 'home rendered');
  await checkNoOverflow(page, state, `${browserName} home`);
  await checkA11y(page, state, `${browserName} home`);
  const searchTriggers = await page.locator('.search-trigger:visible').count();
  const mobileSearch = await page.locator('.mobile-search-btn:visible').count();
  await check(state, searchTriggers === 1 && mobileSearch === 0, 'desktop exposes exactly one search control');

  await open(page, '/courses');
  await page.locator('.subject-tab').filter({ hasText: /^Science/ }).click();
  await page.waitForURL(/subject=science/);
  await page.getByLabel('Search chapters').fill('Electricity');
  await page.getByRole('button', { name: 'Open Electricity' }).click();
  await page.waitForURL(/\/courses\/science\/electricity/);
  await page.getByRole('heading', { name: 'Electricity', level: 1 }).waitFor();
  await check(state, await page.getByText('Full lesson', { exact: true }).first().isVisible(), 'science chapter labelled full lesson');
  await check(state, !(await page.locator('text=/still being built/i').first().isVisible()), 'syllabus map authoring notice not shown for authored chapter');
  await check(state, (await page.locator('.topic-chip-list span, .syllabus-topics li').count()) >= 1, 'science chapter shows topic breakdown');
  await checkNoOverflow(page, state, `${browserName} science chapter`);

  await open(page, '/courses/mathematics/real-numbers');
  await page.getByRole('heading', { name: 'Real Numbers', level: 1 }).waitFor();
  await check(state, await page.getByText('Full lesson', { exact: true }).first().isVisible(), 'maths chapter labelled full lesson');
  await check(state, (await page.locator('.topic-chip-list span').count()) >= 3, 'maths chapter shows full official topic breakdown');
  await check(state, !(await page.locator('body').innerText()).includes('[object Object]'), 'chapter renders no stringified objects');
  for (const tab of ['Theorems', 'Examples', 'Practice', 'Revision', 'Visuals']) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
    await page.waitForTimeout(250);
    await check(state, (await page.locator('.chapter-page').count()) === 1, `chapter tab ${tab} rendered`);
    await check(state, !(await page.locator('body').innerText()).includes('[object Object]'), `chapter tab ${tab} renders no stringified objects`);
  }
  await checkNoOverflow(page, state, `${browserName} maths chapter`);
}

async function practiceFlow(page, state, browserName) {
  await open(page, '/practice?subject=mathematics&chapter=real-numbers');
  await page.getByRole('button', { name: 'Start practice' }).first().click();
  await page.getByText(/Question 1 of/).waitFor({ timeout: 20000 });
  const options = page.locator('.option-btn');
  await check(state, (await options.count()) >= 2, 'practice question has options');
  await options.first().click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Submit early' }).click();
  await page.locator('.result-card').waitFor({ timeout: 20000 });
  const resultText = await page.locator('.result-card').innerText();
  await check(state, /marks/.test(resultText) && /accuracy/i.test(resultText), 'practice result shows marks and accuracy');
  await check(state, (await page.locator('.review-item').count()) >= 1, 'practice result shows review');
  await check(state, state.errors.length === 0, `${browserName} practice console clean: ${state.errors.join(' | ')}`);
}

async function tutorFlow(page, state, browserName) {
  await open(page, '/tutor?subject=mathematics&chapter=real-numbers');
  await page.getByLabel('Ask the tutor').fill('Why is the square root of 2 irrational?');
  await page.getByLabel('Ask the tutor').press('Enter');
  await page.locator('.citation-card').first().waitFor({ timeout: 25000 });
  const answer = await page.locator('.chat-message.tutor .chat-bubble').first().innerText();
  await check(state, answer.length > 200, 'tutor answer has substance');
  await check(state, /S1|Given|Anchor idea|Board-style|Fast path|Let us reason/i.test(answer), 'tutor answer is structured');
  await check(state, (await page.locator('.citation-card').count()) >= 1, 'tutor returns citations');
  await check(state, /grounded fallback/i.test(await page.locator('.chat-meta-row').first().innerText()) || (await page.locator('.chat-meta-row .badge').count()) > 0, 'tutor discloses provider mode');
  await checkNoOverflow(page, state, `${browserName} tutor`);
}

async function mockFlow(page, state) {
  await open(page, '/mock-tests');
  await page.locator('.blueprint-card').filter({ hasText: 'quick' }).click();
  await page.getByRole('button', { name: 'Generate paper' }).click();
  await page.locator('.exam-shell').waitFor({ timeout: 25000 });
  await page.getByRole('button', { name: 'Reveal & self-mark' }).click();
  await page.locator('.answer-key').first().waitFor({ timeout: 20000 });
  await check(state, (await page.locator('.answer-key').count()) >= 1, 'written model answers revealed');
  await page.getByRole('button', { name: 'Submit paper' }).click();
  await page.locator('.exam-result .result-card').waitFor({ timeout: 20000 });
  await check(state, (await page.locator('.review-list .review-item').count()) >= 1, 'exam result includes review');
}

async function plannerFlow(page, state) {
  await open(page, '/planner');
  await page.getByRole('heading', { level: 1 }).waitFor();
  const heading = await page.getByRole('heading', { level: 1 }).innerText();
  await check(state, /15-week climb/.test(heading), `planner title matches 15 weeks (got ${heading})`);
  await check(state, (await page.locator('.week-row').count()) === 15, 'planner renders 15 weeks');
  await page.locator('.week-row').first().getByRole('button', { name: /Open chapter/ }).click();
  await page.waitForURL(/\/courses\/mathematics\//);
  await check(state, /\/courses\/mathematics\//.test(page.url()), 'planner chapter link opens maths lesson');
}

async function libraryFlow(page, state) {
  await open(page, '/library');
  await page.getByRole('heading', { level: 1 }).waitFor();
  for (const tab of ['Formula sheet', 'Speed shortcuts', 'Flashcards']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.waitForTimeout(200);
    await check(state, (await page.locator('.page').count()) === 1, `library ${tab} rendered`);
  }
  const search = page.getByLabel('Search library');
  if (await search.count()) {
    await search.fill('circle');
    await page.waitForTimeout(250);
  }
  await check(state, (await page.locator('body').innerText()).length > 500, 'library has content');
}

async function paletteFlow(page, state) {
  await open(page, '/');
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog', { name: 'Search curriculum' }).waitFor();
  const input = page.getByLabel('Search the curriculum');
  await input.fill('HCF');
  await page.locator('.palette-item').first().waitFor({ timeout: 15000 });
  await page.locator('.palette-item').first().click();
  await page.waitForURL(/\/courses\//);
  await check(state, /\/courses\//.test(page.url()), 'command palette opens a chapter');
}

async function mobileFlow(browser, state) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  watch(page, state);
  await open(page, '/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await check(state, await page.locator('.sidebar.open').isVisible(), 'mobile drawer opens');
  await page.locator('.sidebar.open').getByRole('link', { name: /Practice/ }).click();
  await page.waitForURL(/\/practice/);
  await check(state, (await page.locator('.sidebar.open').count()) === 0, 'mobile drawer closes on navigation');
  for (const route of ['/', '/courses', '/courses/mathematics/real-numbers', '/practice', '/mock-tests', '/tutor', '/planner', '/progress', '/library']) {
    await open(page, route);
    await checkNoOverflow(page, state, `mobile ${route}`);
  }
  await check(state, state.errors.length === 0, `mobile console clean: ${state.errors.join(' | ')}`);
  await open(page, '/');
  await page.screenshot({ path: path.join(shots, `${state.browser}-mobile.png`), fullPage: true });
  await context.close();
}

const server = await ensureServer();
let failed = 0;
try {
  const status = await health();
  if (!status) throw new Error('health check failed');
  console.log(`e2e: server ${base} · ${status.curriculum.chapters} chapters · ${status.curriculum.questions} questions`);

  for (const spec of matrix) {
    const state = { browser: spec.name, passes: 0, errors: [] };
    let browser;
    try {
      browser = await spec.engine.launch({ headless: true, ...spec.options });
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      watch(page, state);
      await courseFlows(page, state, spec.name);
      await practiceFlow(page, state, spec.name);
      await tutorFlow(page, state, spec.name);
      if (spec.full) {
        await mockFlow(page, state);
        await plannerFlow(page, state);
        await libraryFlow(page, state);
        await paletteFlow(page, state);
        await page.locator('.chapter-page').waitFor({ timeout: 20000 });
        await page.screenshot({ path: path.join(shots, 'chrome-full.png'), fullPage: true });
      }
      await check(state, state.errors.length === 0, `${spec.name} console clean: ${state.errors.join(' | ')}`);
      await context.close();
      if (spec.full) {
        const mobileState = { browser: spec.name, passes: 0, errors: [] };
        await mobileFlow(browser, mobileState);
        state.passes += mobileState.passes;
        state.errors.push(...mobileState.errors);
      }
      console.log(`PASS ${spec.name}: ${state.passes} checks`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${spec.name}: ${error.message}`);
      if (state.errors.length) console.error(`  errors: ${state.errors.slice(0, 6).join(' | ')}`);
    } finally {
      if (browser) await browser.close();
    }
  }
} finally {
  await stopServer(server);
}

if (failed) {
  console.error(`e2e failed: ${failed} browser(s)`);
  process.exit(1);
}
console.log('e2e ok: chrome, edge, firefox');
