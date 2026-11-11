#!/usr/bin/env node
/**
 * Auto-deploy script for ClassX Platform to Render.com
 *
 * This script automates deployment after every code update:
 * 1. Stages all changes
 * 2. Commits with a descriptive message
 * 3. Pushes to GitHub (triggers Render auto-deploy via webhook)
 * 4. Optionally triggers Render deploy via API if RENDER_API_KEY is set
 *
 * Usage:
 *   node scripts/deploy-to-render.js "Your commit message"
 *
 * Prerequisites:
 *   - Git remote origin set to your GitHub repo
 *   - Render web service connected to this GitHub repo
 *   - Optional: Set RENDER_API_KEY and RENDER_SERVICE_ID env vars for API deploy
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

function hasRemote() {
  try {
    const remotes = execSync('git remote -v', { stdio: 'pipe', encoding: 'utf8' });
    return remotes.includes('origin');
  } catch {
    return false;
  }
}

function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const message = process.argv.slice(2).join(' ') || `chore: deploy ClassX Platform update ${new Date().toISOString()}`;

  console.log('========================================');
  console.log('  ClassX Platform Auto-Deploy to Render');
  console.log('========================================\n');

  if (!isGitRepo()) {
    console.error('ERROR: Not inside a git repository. Run from classx-platform folder.');
    process.exit(1);
  }

  if (!hasRemote()) {
    console.error('ERROR: No git remote "origin" configured.');
    console.error('  Run: git remote add origin https://github.com/usp1904/classx-platform.git');
    process.exit(1);
  }

  // Check for uncommitted changes
  const status = execSync('git status --porcelain', { stdio: 'pipe', encoding: 'utf8' }).trim();
  const hasChanges = status.length > 0;

  if (hasChanges) {
    console.log('\n[1/4] Staging changes...');
    run('git add -A');
    console.log('  Staged.');

    console.log('\n[2/4] Committing...');
    run(`git commit -m "${message}"`);
    console.log('  Committed.');
  } else {
    console.log('\n[1/2] No uncommitted changes. Skipping commit.');
  }

  console.log('\n[2/4] Pushing to GitHub...');
  run('git push origin HEAD');
  console.log('  Pushed. Render auto-deploy webhook will trigger build.');

  // Optional: Trigger Render API deploy
  const renderApiKey = process.env.RENDER_API_KEY;
  const renderServiceId = process.env.RENDER_SERVICE_ID;

  if (renderApiKey && renderServiceId) {
    console.log('\n[3/4] Triggering Render deploy via API...');
    try {
      const deployResp = execSync(
        `curl -s -X POST "https://api.render.com/v1/services/${renderServiceId}/deploys" ` +
        `-H "Authorization: Bearer ${renderApiKey}" ` +
        `-H "Accept: application/json"`,
        { stdio: 'pipe', encoding: 'utf8' }
      );
      console.log(deployResp);
    } catch (err) {
      console.error('  Render API deploy failed (auto-deploy via Git push should still work):');
      console.error(err.stderr?.toString() || err.message);
    }
  } else {
    console.log('\n[3/4] Skipping Render API trigger (RENDER_API_KEY / RENDER_SERVICE_ID not set).');
    console.log('  Render will auto-deploy on Git push if web service is connected.');
  }

  console.log('\n========================================');
  console.log('  Deploy complete!');
  console.log('  Monitor at: https://dashboard.render.com');
  console.log('  App URL:     https://classx-platform.onrender.com');
  console.log('========================================\n');
}

main();
