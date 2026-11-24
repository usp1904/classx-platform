import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');
const CONSOLIDATED_WORKFLOW = path.join(WORKFLOWS_DIR, 'deploy.yml');
const DOCS_DEPLOYMENT = path.join(ROOT_DIR, 'docs', 'DEPLOYMENT.md');
const PACKAGE_JSON = path.join(ROOT_DIR, 'package.json');

// Helper to read file utf-8
function readFile(p) {
  assert.ok(fs.existsSync(p), `File must exist: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

// ============================================================================
// Test Suite 1: Package.json Scripts & Aliases
// ============================================================================
test('1. Package.json defines required build script aliases for static targets', () => {
  const pkgContent = readFile(PACKAGE_JSON);
  const pkg = JSON.parse(pkgContent);

  assert.ok(pkg.scripts, 'package.json must contain scripts section');

  // Verify gh-pages build scripts
  assert.equal(
    pkg.scripts['build:gh-pages'],
    'node scripts/build-static.mjs gh-pages',
    'package.json must define build:gh-pages script alias',
  );
  assert.equal(
    pkg.scripts['build:gh'],
    'node scripts/build-static.mjs gh-pages',
    'package.json must retain build:gh script',
  );

  // Verify cloudflare build scripts
  assert.equal(
    pkg.scripts['build:cloudflare'],
    'node scripts/build-static.mjs cloudflare',
    'package.json must define build:cloudflare script alias',
  );
  assert.equal(
    pkg.scripts['build:cf'],
    'node scripts/build-static.mjs cloudflare',
    'package.json must retain build:cf script',
  );

  // Verify unified static build script
  assert.equal(
    pkg.scripts['build:static'],
    'node scripts/build-static.mjs all',
    'package.json must define build:static script',
  );
});

// ============================================================================
// Test Suite 2: Single Consolidated Deploy Workflow
// ============================================================================
test('2. Duplicate per-target deploy workflows are removed', () => {
  const files = fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(!files.includes('deploy-gh-pages.yml'), 'Standalone GitHub Pages workflow must be removed');
  assert.ok(!files.includes('deploy-cloudflare.yml'), 'Standalone Cloudflare workflow must be removed');
  assert.deepEqual(files, ['deploy.yml'], 'Only the consolidated deploy.yml workflow must remain');
});

// ============================================================================
// Test Suite 4: Consolidated Workflow (.github/workflows/deploy.yml)
// ============================================================================
test('4. Consolidated Workflow (.github/workflows/deploy.yml) structural compliance', async (t) => {
  const content = readFile(CONSOLIDATED_WORKFLOW);

  await t.test('4.1 Triggers and Parallel Jobs Definition', () => {
    assert.match(content, /on:\s*\n[\s\S]*?push:\s*\n[\s\S]*?branches:\s*\n[\s\S]*?-\s*main/, 'Must trigger on push to main branch');
    assert.match(content, /workflow_dispatch:/, 'Must support workflow_dispatch manual trigger');
    assert.match(content, /deploy-gh-pages:\s*\n/, 'Must define deploy-gh-pages job');
    assert.match(content, /deploy-cloudflare:\s*\n/, 'Must define deploy-cloudflare job');
  });

  await t.test('4.2 Consolidated GitHub Pages Job Compliance', () => {
    assert.match(content, /permissions:\s*\n[\s\S]*?pages:\s*write/, 'Must declare pages: write in GH Pages job');
    assert.match(content, /environment:\s*\n[\s\S]*?name:\s*github-pages/, 'Environment must be github-pages');
    assert.match(content, /npm\s+run\s+build:gh-pages/, 'Must build via npm run build:gh-pages');
    assert.match(content, /actions\/deploy-pages@v4/, 'Must deploy via actions/deploy-pages@v4');
  });

  await t.test('4.3 Consolidated Cloudflare Pages Job Compliance', () => {
    assert.match(content, /npm\s+run\s+build:cloudflare/, 'Must build via npm run build:cloudflare');
    assert.match(content, /id:\s*check_creds/, 'Must define check_creds in CF Pages job');
    assert.match(content, /cloudflare\/wrangler-action@v3/, 'Must use cloudflare/wrangler-action@v3');
    assert.match(content, /--commit-dirty=true/, 'Must include --commit-dirty=true');
  });
});

// ============================================================================
// Test Suite 5: Secrets & Security Audit Across All Workflow Files
// ============================================================================
test('5. Security Audit: Zero hardcoded secrets, plaintext tokens, or interactive prompts', () => {
  const workflowFiles = fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(workflowFiles.length >= 1, 'Must have at least one deploy workflow file');

  // Regex patterns detecting potential credentials
  const suspiciousPatterns = [
    /ghp_[a-zA-Z0-9]{36}/,                    // GitHub Personal Access Token
    /github_pat_[a-zA-Z0-9_]{82}/,             // Fine-grained GitHub PAT
    /sk-[a-zA-Z0-9_-]{20,}/,                  // OpenAI / generic Secret Key
    /(?:^|[^\$])\{(?!\s*secrets\.)[a-f0-9]{32,40}\}/i, // 32-40 char hex token not in secrets context
    /password:\s*['"][^'"]+['"]/i,             // Plaintext password
    /api_key:\s*['"][a-zA-Z0-9_-]{16,}['"]/i, // Plaintext API Key
  ];

  for (const wf of workflowFiles) {
    const fullPath = path.join(WORKFLOWS_DIR, wf);
    const content = fs.readFileSync(fullPath, 'utf8');

    for (const pattern of suspiciousPatterns) {
      assert.ok(
        !pattern.test(content),
        `Workflow file ${wf} must not contain credentials matching ${pattern}`,
      );
    }

    // Must never use interactive npm install
    assert.ok(
      !content.includes('npm install') || content.includes('npm ci'),
      `Workflow ${wf} must not use interactive 'npm install'; use 'npm ci'`,
    );

    // Any wrangler deployment must pass --commit-dirty=true
    if (content.includes('wrangler-action')) {
      assert.match(
        content,
        /--commit-dirty=true/,
        `Workflow ${wf} using wrangler must specify --commit-dirty=true to prevent git prompts`,
      );
    }
  }
});

// ============================================================================
// Test Suite 6: Documentation Verification (docs/DEPLOYMENT.md)
// ============================================================================
test('6. Documentation (docs/DEPLOYMENT.md) comprehensive content validation', async (t) => {
  const doc = readFile(DOCS_DEPLOYMENT);

  await t.test('6.1 General document structure and minimum depth', () => {
    assert.ok(doc.length > 3000, 'DEPLOYMENT.md must be comprehensive (size > 3000 chars)');
    assert.match(doc, /^#\s+Deployment\s+&/m, 'Must start with main deployment heading');
  });

  await t.test('6.2 Section 1: Overview of classx-platform multi-target deployment architecture', () => {
    assert.match(doc, /##\s*1\.\s*Deployment\s+Architecture\s+Overview/i, 'Must contain Section 1 heading');
    assert.match(doc, /usp1904\.github\.io\/classx-platform/i, 'Must document GitHub Pages live URL');
    assert.match(doc, /classx-platform\.pages\.dev/i, 'Must document Cloudflare Pages live URL');
    assert.match(doc, /\/classx-platform\//, 'Must document GitHub Pages base path');
    assert.match(doc, /dist\/gh-pages/, 'Must document GitHub Pages output dir');
    assert.match(doc, /dist\/cloudflare/, 'Must document Cloudflare Pages output dir');
    assert.match(doc, /404\.html/, 'Must document 404.html SPA fallback');
    assert.match(doc, /\.nojekyll/, 'Must document .nojekyll flag');
    assert.match(doc, /_redirects/, 'Must document _redirects file');
    assert.match(doc, /_headers/, 'Must document _headers file');
  });

  await t.test('6.3 Section 2: GitHub Pages setup instructions', () => {
    assert.match(doc, /##\s*2\.\s*GitHub\s+Pages\s+Setup/i, 'Must contain Section 2 heading');
    assert.match(doc, /Settings[\s\S]*?->[\s\S]*?Pages/i, 'Must guide user to Settings -> Pages');
    assert.match(doc, /GitHub\s+Actions/i, 'Must instruct selecting GitHub Actions as source');
    assert.match(doc, /GITHUB_TOKEN/i, 'Must explain automatic GITHUB_TOKEN usage');
    assert.match(doc, /pages:\s*write/, 'Must document pages: write permission');
  });

  await t.test('6.4 Section 3: Cloudflare Pages setup instructions', () => {
    assert.match(doc, /##\s*3\.\s*Cloudflare\s+Pages\s+Setup/i, 'Must contain Section 3 heading');
    assert.match(doc, /dash\.cloudflare\.com/i, 'Must link to Cloudflare Dashboard');
    assert.match(doc, /Account\s+ID/i, 'Must explain Account ID discovery');
    assert.match(doc, /API\s+Token/i, 'Must explain API Token creation');
    assert.match(doc, /Cloudflare\s+Pages/i, 'Must mention Cloudflare Pages permission');
    assert.match(doc, /Edit/i, 'Must specify Edit permission');
    assert.match(doc, /Direct\s+Upload/i, 'Must document Direct Upload project model');
    assert.match(doc, /0\s+Cloudflare\s+build\s+minutes/i, 'Must highlight 0 Cloudflare build minutes');
  });

  await t.test('6.5 Section 4: Repository secrets configuration', () => {
    assert.match(doc, /##\s*4\.\s*GitHub\s+Repository\s+Secrets/i, 'Must contain Section 4 heading');
    assert.match(doc, /CLOUDFLARE_API_TOKEN/, 'Must specify CLOUDFLARE_API_TOKEN secret name');
    assert.match(doc, /CLOUDFLARE_ACCOUNT_ID/, 'Must specify CLOUDFLARE_ACCOUNT_ID secret name');
    assert.match(doc, /Settings[\s\S]*?Secrets\s+and\s+variables[\s\S]*?Actions/i, 'Must document navigation path for secrets');
    assert.match(doc, /has_creds=false/i, 'Must document pre-flight credential check logic');
    assert.match(doc, /Fork\s+Safety/i, 'Must explain fork safety behavior');
  });

  await t.test('6.6 Section 5: Free-tier guardrails & limits table', () => {
    assert.match(doc, /##\s*5\.\s*Free-Tier\s+Guardrails/i, 'Must contain Section 5 heading');
    assert.match(doc, /\|\s*Parameter\s*\|\s*GitHub\s+Pages[\s\S]*?\|\s*Cloudflare\s+Pages/i, 'Must include comparative table');
    assert.match(doc, /100\s*GB\s*\/\s*month/i, 'Must document 100 GB GitHub Pages bandwidth');
    assert.match(doc, /Unlimited/i, 'Must document Cloudflare Pages unlimited requests/bandwidth');
    assert.match(doc, /25\s*MB/i, 'Must document Cloudflare max file size');
    assert.match(doc, /Custom\s+Domains/i, 'Must document custom domains');
    assert.match(doc, /SSL\s*\/\s*HTTPS/i, 'Must document SSL/TLS automatic certificates');
  });

  await t.test('6.7 Section 6: Security guardrails & input sanitization model', () => {
    assert.match(doc, /##\s*6\.\s*Security\s+Guardrails/i, 'Must contain Section 6 heading');
    assert.match(doc, /<student_question>/, 'Must document structural boundary delimiter <student_question>');
    assert.match(doc, /1000/, 'Must document 1000-character input limit');
    assert.match(doc, /validateSlug/, 'Must document validateSlug path traversal defense');
    assert.match(doc, /escapeHtml/, 'Must document escapeHtml DOM XSS prevention');
    assert.match(doc, /jailbreak/i, 'Must document jailbreak phrase screening');
  });

  await t.test('6.8 Section 7: Switching between client-side mock mode and live backend mode', () => {
    assert.match(doc, /##\s*7\.\s*Client-Side\s+Mock\s+Fallback/i, 'Must contain Section 7 heading');
    assert.match(doc, /VITE_USE_MOCK_API/i, 'Must document VITE_USE_MOCK_API environment variable');
    assert.match(doc, /classx_mock_mode/i, 'Must document localStorage classx_mock_mode toggle');
    assert.match(doc, /VITE_STATIC_MOCK/i, 'Must document VITE_STATIC_MOCK build-time flag');
    assert.match(doc, /29\s+Endpoints/i, 'Must document complete 29 endpoint mock API coverage');
    assert.match(doc, /Automatic\s+Network\s+Fallback/i, 'Must explain automatic 404/network fallback');
  });

  await t.test('6.9 Section 8: Non-interactive execution verification', () => {
    assert.match(doc, /##\s*8\.\s*Non-Interactive\s+CI\/CD/i, 'Must contain Section 8 heading');
    assert.match(doc, /npm\s+ci/i, 'Must document npm ci usage');
    assert.match(doc, /--commit-dirty=true/i, 'Must document --commit-dirty=true');
    assert.match(doc, /CI:\s*true/i, 'Must document CI: true');
  });

  await t.test('6.10 Section 9: Local verification commands', () => {
    assert.match(doc, /##\s*9\.\s*Local\s+Verification\s+Commands/i, 'Must contain Section 9 heading');
    assert.match(doc, /npm\s+run\s+typecheck/i, 'Must list npm run typecheck');
    assert.match(doc, /npm\s+test/i, 'Must list npm test');
    assert.match(doc, /node\s+scripts\/build-static\.mjs\s+all/i, 'Must list static build command');
  });

  await t.test('6.11 Single workflow and remote status references', () => {
    assert.match(doc, /\.github\/workflows\/deploy\.yml/, 'Must reference the consolidated deploy workflow');
    assert.ok(!doc.includes('deploy-gh-pages.yml'), 'Must not reference the deleted standalone GitHub Pages workflow');
    assert.ok(!doc.includes('deploy-cloudflare.yml'), 'Must not reference the deleted standalone Cloudflare workflow');
    assert.match(doc, /##\s*10\.\s*Current\s+Remote\s+Status/i, 'Must contain Section 10 heading');
    assert.match(doc, /Docker\s+parity/i, 'Must record Docker parity status');
    assert.match(doc, /NXDOMAIN/i, 'Must record the unresolved Cloudflare Pages hostname');
  });
});
