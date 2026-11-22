import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'all';

async function buildTarget(name, base, outRelative) {
  console.log(`\n=== Building for ${name} (base: ${base}, outDir: ${outRelative}) ===`);
  const outDir = path.resolve(root, outRelative);
  
  process.env.BUILD_TARGET = name;
  process.env.VITE_BASE = base;
  process.env.BUILD_OUT_DIR = outRelative;

  await build({
    configFile: path.resolve(root, 'web', 'vite.config.ts'),
    base,
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: false,
    },
  });

  const indexHtml = path.join(outDir, 'index.html');
  const fourOhFour = path.join(outDir, '404.html');

  if (fs.existsSync(indexHtml)) {
    // Copy index.html -> 404.html for SPA fallback
    fs.copyFileSync(indexHtml, fourOhFour);
    console.log(`✓ Created SPA fallback: ${fourOhFour}`);
  }

  if (name === 'gh-pages') {
    // GitHub Pages requires .nojekyll to prevent Jekyll from skipping underscore assets
    const nojekyll = path.join(outDir, '.nojekyll');
    fs.writeFileSync(nojekyll, '');
    console.log(`✓ Created GitHub Pages bypass flag: ${nojekyll}`);
  }

  if (name === 'cloudflare') {
    // Cloudflare Pages requires _redirects for SPA routing
    const redirects = path.join(outDir, '_redirects');
    fs.writeFileSync(redirects, '/*    /index.html   200\n');
    console.log(`✓ Created Cloudflare SPA redirects: ${redirects}`);

    const headers = path.join(outDir, '_headers');
    const headersContent = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
`;
    fs.writeFileSync(headers, headersContent);
    console.log(`✓ Created Cloudflare security headers: ${headers}`);
  }

  console.log(`✓ ${name} build complete in ${outRelative}`);
}

async function run() {
  if (target === 'gh-pages' || target === 'all') {
    await buildTarget('gh-pages', '/classx-platform/', 'dist/gh-pages');
  }
  if (target === 'cloudflare' || target === 'all') {
    await buildTarget('cloudflare', '/', 'dist/cloudflare');
  }
}

run().catch((err) => {
  console.error('[build-static] failed:', err);
  process.exit(1);
});
