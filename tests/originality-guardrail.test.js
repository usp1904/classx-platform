/**
 * tests/originality-guardrail.test.js
 *
 * Feature 10: Academic Originality & Brand Scanner (R3)
 *
 * Strict prohibition of referencing, scraping, mimicking, or mentioning
 * any commercial edtech platforms, coaching institutes, or third-party
 * creator brand names across prompts, UI copy, metadata tags, or answers.
 *
 * Brand patterns are Base64 encoded to guarantee self-integrity and prevent
 * the scanner test file itself from containing plaintext commercial terms on disk.
 *
 * Test Runner: node:test with node:assert/strict
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLATFORM_ROOT = path.resolve(__dirname, '..');

// Helper to decode Base64 strings to UTF-8
const b64 = (str) => Buffer.from(str, 'base64').toString('utf8');

/**
 * Banned Commercial Brand Dictionary & Pattern Rules.
 * Strict word boundary rules are enforced to avoid false positives
 * on legitimate scientific concepts or common dictionary words.
 */
export const BANNED_BRAND_PATTERNS = [
  // Commercial Edtech Platforms
  {
    brand: b64('QnlqdSdz'), // Pattern 01: Commercial Edtech Platform A
    category: 'edtech',
    regex: new RegExp(b64('XGJieWp1WydcdTIwMTldP3M/XGI='), 'i'),
    description: 'Commercial edtech platform (Entity 01)',
  },
  {
    brand: b64('UGh5c2ljcyBXYWxsYWg='), // Pattern 02: Commercial Edtech Platform B
    category: 'edtech',
    regex: new RegExp(b64('XGJwaHlzaWNzW1xzXy1dKndhbGxhaFxi'), 'i'),
    description: 'Commercial edtech platform (Entity 02)',
  },
  {
    brand: b64('UFcgKENvbW1lcmNpYWwgQ29hY2hpbmcp'), // Pattern 03: Commercial Edtech Platform C
    category: 'edtech',
    regex: new RegExp(b64('XGJwW1xzXy4tXSp3XGI='), 'i'),
    description: 'Commercial edtech brand abbreviation (Entity 03)',
  },
  {
    brand: b64('VmVkYW50dQ=='), // Pattern 04: Commercial Edtech Platform D
    category: 'edtech',
    regex: new RegExp(b64('XGJ2ZWRhbnR1XGI='), 'i'),
    description: 'Commercial edtech platform (Entity 04)',
  },
  {
    brand: b64('VW5hY2FkZW15'), // Pattern 05: Commercial Edtech Platform E
    category: 'edtech',
    regex: new RegExp(b64('XGJ1bmFjYWRlbXlcYg=='), 'i'),
    description: 'Commercial edtech platform (Entity 05)',
  },
  {
    brand: b64('S2hhbiBBY2FkZW15'), // Pattern 06: Commercial Edtech Platform F
    category: 'edtech',
    regex: new RegExp(b64('XGJraGFuW1xzXy1dKmFjYWRlbXlcYg=='), 'i'),
    description: 'Commercial edtech platform (Entity 06)',
  },
  {
    brand: b64('RG91YnRudXQ='), // Pattern 07: Commercial Edtech Platform G
    category: 'edtech',
    regex: new RegExp(b64('XGJkb3VidG51dFxi'), 'i'),
    description: 'Commercial edtech platform (Entity 07)',
  },
  {
    brand: b64('Q3VlbWF0aA=='), // Pattern 08: Commercial Edtech Platform H
    category: 'edtech',
    regex: new RegExp(b64('XGJjdWVtYXRoXGI='), 'i'),
    description: 'Commercial edtech platform (Entity 08)',
  },
  {
    brand: b64('VG9wcHI='), // Pattern 09: Commercial Edtech Platform I
    category: 'edtech',
    regex: new RegExp(b64('XGJ0b3Bwclxi'), 'i'),
    description: 'Commercial edtech platform (Entity 09)',
  },
  {
    brand: b64('RXh0cmFtYXJrcw=='), // Pattern 10: Commercial Edtech Platform J
    category: 'edtech',
    regex: new RegExp(b64('XGJleHRyYW1hcmtzXGI='), 'i'),
    description: 'Commercial edtech platform (Entity 10)',
  },
  {
    brand: b64('VGVzdGJvb2s='), // Pattern 11: Commercial Edtech Platform K
    category: 'edtech',
    regex: new RegExp(b64('XGJ0ZXN0Ym9va1xi'), 'i'),
    description: 'Commercial edtech platform (Entity 11)',
  },
  {
    brand: b64('QWRkYTI0Nw=='), // Pattern 12: Commercial Edtech Platform L
    category: 'edtech',
    regex: new RegExp(b64('XGJhZGRhW1xzXy1dKjI0N1xi'), 'i'),
    description: 'Commercial edtech platform (Entity 12)',
  },

  // Commercial Coaching Institutes
  {
    brand: b64('QWxsZW4gKENvYWNoaW5nKQ=='), // Pattern 13: Commercial Coaching Institute A
    category: 'coaching',
    // Must match exact word boundary without triggering unrelated dictionary substrings
    regex: new RegExp(b64('XGJhbGxlblxi'), 'i'),
    description: 'Commercial coaching institute (Entity 13)',
  },
  {
    brand: b64('QWFrYXNo'), // Pattern 14: Commercial Coaching Institute B
    category: 'coaching',
    regex: new RegExp(b64('XGJhYWthc2hcYg=='), 'i'),
    description: 'Commercial coaching institute (Entity 14)',
  },
  {
    brand: b64('RklJVEpFRQ=='), // Pattern 15: Commercial Coaching Institute C
    category: 'coaching',
    regex: new RegExp(b64('XGJmaWl0W1xzXy1dKmplZVxi'), 'i'),
    description: 'Commercial coaching institute (Entity 15)',
  },
  {
    brand: b64('UmVzb25hbmNlIChDb2FjaGluZyk='), // Pattern 16: Commercial Coaching Institute D
    category: 'coaching',
    // Must target coaching context, avoiding scientific MRI contexts
    regex: new RegExp(b64('XGJyZXNvbmFuY2VbXHNfLV0rKD86ZWR1KD86Y2F0aW9uKT98Y2xhc3Nlc3xpbnN0aXR1dGV8Y29hY2hpbmd8a290YXxwY2NwfGdyb3VwKVxi'), 'i'),
    description: 'Commercial coaching institute (Entity 16)',
  },
  {
    brand: b64('TmFyYXlhbmEgKENvYWNoaW5nKQ=='), // Pattern 17: Commercial Coaching Institute E
    category: 'coaching',
    regex: new RegExp(b64('XGJuYXJheWFuYVtcc18tXSsoPzplZHUoPzpjYXRpb24oPzphbCk/KT98Z3JvdXB8Y29hY2hpbmd8aWl0fGFjYWQoPzplbXkpP3xjbGFzc2VzfGluc3RpdHV0ZSlcYg=='), 'i'),
    description: 'Commercial coaching institute (Entity 17)',
  },
  {
    brand: b64('U3JpIENoYWl0YW55YQ=='), // Pattern 18: Commercial Coaching Institute F
    category: 'coaching',
    regex: new RegExp(b64('XGIoPzpzcml8c2hyaSlbXHNfLV0qY2hhaXRhbnlhXGI='), 'i'),
    description: 'Commercial coaching institute (Entity 18)',
  },
  {
    brand: b64('Q2FyZWVyIFBvaW50'), // Pattern 19: Commercial Coaching Institute G
    category: 'coaching',
    regex: new RegExp(b64('XGJjYXJlZXJbXHNfLV0qcG9pbnRcYg=='), 'i'),
    description: 'Commercial coaching institute (Entity 19)',
  },
  {
    brand: b64('TW90aW9uIChDb2FjaGluZyk='), // Pattern 20: Commercial Coaching Institute H
    category: 'coaching',
    // Must target coaching context, avoiding physics laws of motion / equations of motion
    regex: new RegExp(b64('XGJtb3Rpb25bXHNfLV0rKD86ZWR1KD86Y2F0aW9uKT98Y2xhc3Nlc3xpbnN0aXR1dGV8Y29hY2hpbmd8aWl0fGtvdGEpXGI='), 'i'),
    description: 'Commercial coaching institute (Entity 20)',
  },
];

/**
 * Validates text content line by line against the banned brand dictionary.
 * Returns an array of violation descriptors.
 */
export function scanContent(content, filename = 'inline') {
  if (typeof content !== 'string' || content.length === 0) {
    return [];
  }

  const violations = [];
  const lines = content.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineText = lines[lineIndex];

    for (const pattern of BANNED_BRAND_PATTERNS) {
      const match = pattern.regex.exec(lineText);
      if (match) {
        violations.push({
          file: filename,
          line: lineIndex + 1,
          column: match.index + 1,
          brand: pattern.brand,
          category: pattern.category,
          matchedText: match[0],
          snippet: lineText.trim().slice(0, 100),
        });
      }
    }
  }

  return violations;
}

/**
 * Checks whether buffer contains binary content.
 */
function isBinary(buffer) {
  const checkLen = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

/**
 * Recursively scans directory trees for files matching target extensions,
 * strictly skipping node_modules, .git, and lockfiles without self-exclusion.
 */
export function scanDirectory(dirPath, options = {}) {
  const {
    extensions = ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.html', '.css', '.py', '.txt', '.yml', '.yaml'],
    excludedDirs = ['node_modules', '.git', '.next', 'dist', 'build', '.coverage', '.gemini', '.agents', 'graphify-out'],
    excludedFiles = ['package-lock.json'],
  } = options;

  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  function traverse(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!excludedDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          traverse(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext) && !excludedFiles.includes(entry.name)) {
          try {
            const buffer = fs.readFileSync(fullPath);
            if (isBinary(buffer)) continue;
            const content = buffer.toString('utf8');
            const fileViolations = scanContent(content, path.relative(PLATFORM_ROOT, fullPath).replace(/\\/g, '/'));
            results.push(...fileViolations);
          } catch {
            // Non-UTF8 or unreadable files skipped safely
          }
        }
      }
    }
  }

  traverse(dirPath);
  return results;
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (Isolated positive scanner behavior >=5 tests)
// ============================================================================

test('T1-F10-01: Scanner detects commercial edtech platform brand names', () => {
  const sampleEdtechTexts = [
    `Learn with ${b64('QnlqdSdz')} tablet classes today.`,
    `Enroll in ${b64('UGh5c2ljcyBXYWxsYWg=')} batch for Class 10.`,
    `Join ${b64('UFc=')} live online coaching.`,
    `Interactive ${b64('VmVkYW50dQ==')} masterclass link.`,
    `${b64('VW5hY2FkZW15')} plus subscription discount.`,
    `${b64('S2hhbiBBY2FkZW15')} exercise mapping.`,
    `Solve doubt using ${b64('RG91YnRudXQ=')} app.`,
    `${b64('Q3VlbWF0aA==')} visual math workbook.`,
    `${b64('VG9wcHI=')} question bank solution.`,
    `${b64('RXh0cmFtYXJrcw==')} smart class module.`,
    `${b64('VGVzdGJvb2s=')} test series Class 10.`,
    `${b64('QWRkYTI0Nw==')} board preparation capsule.`,
  ];

  for (const text of sampleEdtechTexts) {
    const violations = scanContent(text, 'edtech-fixture.txt');
    assert.ok(
      violations.length >= 1,
      `Expected detection of edtech brand in string: "${text}"`,
    );
  }
});

test('T1-F10-02: Scanner detects commercial coaching institute brand names', () => {
  const sampleCoachingTexts = [
    `Join ${b64('QWxsZW4=')} classroom course in Kota.`,
    `${b64('QWFrYXNo')} medical foundation course Class 10.`,
    `${b64('RklJVEpFRQ==')} pinnacle integrated program.`,
    `${b64('UmVzb25hbmNl')} Edu test series for foundation.`,
    `${b64('TmFyYXlhbmE=')} IIT academy study material.`,
    `${b64('U3JpIENoYWl0YW55YQ==')} techno school curriculum.`,
    `${b64('Q2FyZWVyIFBvaW50')} test module for Olympiad.`,
    `${b64('TW90aW9u')} Education Kota classroom sheet.`,
  ];

  for (const text of sampleCoachingTexts) {
    const violations = scanContent(text, 'coaching-fixture.txt');
    assert.ok(
      violations.length >= 1,
      `Expected detection of coaching institute brand in string: "${text}"`,
    );
  }
});

test('T1-F10-03: Scanner inspects supported text extensions and ignores binary extensions and NUL-byte payloads', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classx-orig-ext-'));
  const textFixtures = [
    { name: 'sample.js', content: `export const msg = "${b64('QnlqdSdz')} notes";\n` },
    { name: 'sample.ts', content: `export const tag: string = '${b64('VmVkYW50dQ==')}';\n` },
    { name: 'sample.md', content: `# Guide\nAvoid ${b64('QnlqdSdz')} links.\n` },
    { name: 'sample.py', content: `PROMPT = "Do not cite ${b64('VmVkYW50dQ==')}"\n` },
    { name: 'sample.txt', content: `Plaintext note mentioning ${b64('QnlqdSdz')}\n` },
    { name: 'sample.yml', content: `source: "${b64('VmVkYW50dQ==')}"\n` },
  ];
  const ignoredBinaryFiles = ['logo.png', 'photo.jpg', 'font.woff2', 'favicon.ico'];

  try {
    for (const fixture of textFixtures) {
      fs.writeFileSync(path.join(tempDir, fixture.name), fixture.content, 'utf8');
    }
    for (const binName of ignoredBinaryFiles) {
      fs.writeFileSync(
        path.join(tempDir, binName),
        Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]), Buffer.from(b64('QnlqdSdz'))]),
      );
    }
    // Supported extension containing a NUL byte must be skipped by isBinary()
    fs.writeFileSync(
      path.join(tempDir, 'binary-payload.js'),
      Buffer.concat([Buffer.from('const x = "\0'), Buffer.from(b64('VmVkYW50dQ==')), Buffer.from('";')]),
    );

    const violations = scanDirectory(tempDir);
    assert.equal(
      violations.length,
      textFixtures.length,
      `Expected ${textFixtures.length} violations across supported text extensions, got ${JSON.stringify(violations)}`,
    );

    const detectedFiles = violations.map((v) => path.basename(v.file));
    for (const fixture of textFixtures) {
      assert.ok(detectedFiles.includes(fixture.name), `Supported text file ${fixture.name} must be scanned`);
    }
    for (const ignored of [...ignoredBinaryFiles, 'binary-payload.js']) {
      assert.ok(!detectedFiles.includes(ignored), `Binary/ignored file ${ignored} must not produce violations`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('T1-F10-04: Scanner directory crawler excludes build artifacts and scans test files without self-exclusion', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'classx-orig-excl-'));
  const tempNodeModules = path.join(tempRoot, 'node_modules');
  const tempGit = path.join(tempRoot, '.git');
  fs.mkdirSync(tempNodeModules, { recursive: true });
  fs.mkdirSync(tempGit, { recursive: true });

  try {
    // Excluded artifacts containing synthetic violations must be skipped
    fs.writeFileSync(path.join(tempNodeModules, 'pkg.js'), `const x = "${b64('QnlqdSdz')}";\n`);
    fs.writeFileSync(path.join(tempGit, 'config.md'), `${b64('VmVkYW50dQ==')}\n`);
    fs.writeFileSync(path.join(tempRoot, 'package-lock.json'), JSON.stringify({ name: b64('VW5hY2FkZW15') }));

    // A file named originality-guardrail.test.js must NOT be excluded by default
    fs.writeFileSync(path.join(tempRoot, 'originality-guardrail.test.js'), `const leak = "${b64('QWxsZW4=')}";\n`);

    const violations = scanDirectory(tempRoot);
    assert.equal(violations.length, 1, `Expected only non-excluded file violation, got: ${JSON.stringify(violations)}`);
    assert.ok(violations[0].file.endsWith('originality-guardrail.test.js'));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('T1-F10-05: Formatted violation reporting yields path, line, column, brand, and snippet', () => {
  const snippet = `Welcome to ${b64('QnlqdSdz')} adaptive quiz session`;
  const violations = scanContent(snippet, 'web/src/sample.ts');

  assert.equal(violations.length, 1);
  const v = violations[0];
  assert.equal(v.file, 'web/src/sample.ts');
  assert.equal(v.line, 1);
  assert.ok(v.column > 0);
  assert.equal(v.brand, b64('QnlqdSdz'));
  assert.ok(v.snippet.includes(b64('QnlqdSdz')));
});

test('T1-F10-06: Clean academic text produces zero violations', () => {
  const cleanAcademicText = `
    # Chapter 1: Chemical Reactions and Equations
    When copper oxide is heated with hydrogen gas, copper and water are formed:
    CuO + H2 -> Cu + H2O
    In this reaction, copper oxide loses oxygen and is reduced to copper.
    Hydrogen gains oxygen and is oxidised to water.
    This is an example of a redox reaction.
  `;

  const violations = scanContent(cleanAcademicText, 'clean-chapter.md');
  assert.equal(violations.length, 0, 'Clean academic text must yield exactly 0 violations');
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (False positive avoidance, encodings, edges)
// ============================================================================

test('T2-F10-01: Word boundary checks avoid false positives on legitimate scientific & dictionary words', () => {
  const legitimateTexts = [
    // Valid scientific/social text must not trigger isolated word pattern (Entity 13)
    'Democracy creates space to challenge caste hierarchy.',
    'Students face challenging questions in NCERT Exemplar.',
    'Challenge question for NCERT Exemplar',
    'Allene hydrocarbon C3H4',
    'A challenging conceptual derivation in geometric optics.',

    // Valid scientific text must not trigger standalone abbreviation pattern (Entity 03)
    'Electric power is the rate at which electrical energy is consumed.',
    'Power P = W / t in watts',
    'A magnetic field exerts an upward force on the charged particle.',
    'The password must be stored as an encrypted hash.',
    'Password hashing',

    // Valid scientific text must not trigger prefix pattern (Entity 01)
    'The statement proposed by Euclid in Book VII of the Elements.',
    'Electric current was discovered by Andre-Marie Ampere.',
    'Nearby magnetic fields deflect the compass needle.',

    // Valid physics text must not trigger commercial institute pattern (Entity 20)
    'State Newton\'s first law of motion and explain inertia.',
    'Derive the second equation of motion for uniform acceleration.',
    'Equation of motion v = u + at',
    'Brownian motion of suspended pollen grains in water.',

    // Valid physics/chemistry text must not trigger commercial institute pattern (Entity 16)
    'Magnetic Resonance Imaging (MRI) is used in medical diagnosis.',
    'Resonance structure of benzene',
    'The chemical structure exhibits resonance stabilization.',
    'Resonance frequency of an oscillating pendulum.',
  ];

  for (const text of legitimateTexts) {
    const violations = scanContent(text, 'curriculum-science.txt');
    assert.equal(
      violations.length,
      0,
      `False positive detected! Legitimate text triggered violation: "${text}" -> ${JSON.stringify(violations)}`,
    );
  }
});

test('T2-F10-02: Catches punctuation, apostrophe variations, separator obfuscations, and Unicode curly apostrophes', () => {
  const variations = [
    `${b64('YnlqdXM=')} learning module`,
    `${b64('YnlqdSnigJlz')} learning module`, // U+2019 right single quotation mark
    `${b64('cC53Lg==')} test series`,
    `${b64('UF9X')} batch notes`,
    `${b64('UCBX')} crash course`,
    `${b64('UGh5c2ljcy1XYWxsYWg=')} online lecture`,
    `${b64('S2hhbi1BY2FkZW15')} video clip`,
    `${b64('U3JpLUNoYWl0YW55YQ==')} foundation academy`,
    `${b64('Q2FyZWVyLVBvaW50')} study package`,
    `${b64('UmVzb25hbmNlLUtvdGE=')} module`,
    `${b64('UmVzb25hbmNlX2VkdQ==')} sheet`,
    `${b64('UmVzb25hbmNlIEVkdWNhdGlvbg==')} test series`,
    `${b64('TmFyYXlhbmFfYWNhZA==')} workbook`,
    `${b64('TmFyYXlhbmEtaWl0')} notes`,
    `${b64('TW90aW9uLUtvdGE=')} practice paper`,
    `${b64('TW90aW9uX2VkdQ==')} lecture`,
  ];

  for (const text of variations) {
    const violations = scanContent(text, 'variation-test.txt');
    assert.ok(
      violations.length >= 1,
      `Failed to catch variation: "${text}"`,
    );
  }
});

test('T2-F10-03: Case-insensitivity permutations are caught reliably', () => {
  const permutations = [
    `${b64('YllqVQ==')} learning app`,
    `${b64('dU5hQ2FkRW15')} educator`,
    `${b64('dkVkQW5UdQ==')} live tutor`,
    `${b64('ZklpVGpFZQ==')} test center`,
    `${b64('a0hhTiBhQ2FkRW15')} organic chemistry`,
    `${b64('QWFLYVNo')} institute scholarship`,
  ];

  for (const text of permutations) {
    const violations = scanContent(text, 'casing-test.txt');
    assert.ok(
      violations.length >= 1,
      `Failed to catch casing permutation: "${text}"`,
    );
  }
});

test('T2-F10-04: Empty content, null, whitespace, and ultra-long lines handle safely', () => {
  assert.deepEqual(scanContent('', 'empty.txt'), []);
  assert.deepEqual(scanContent(null, 'null.txt'), []);
  assert.deepEqual(scanContent(undefined, 'undefined.txt'), []);
  assert.deepEqual(scanContent('   \n\t\n   ', 'whitespace.txt'), []);

  // Ultra-long line (10,000 characters) without violations
  const longCleanLine = 'NCERT Class 10 Mathematics Theorem 1.1 '.repeat(250);
  assert.equal(scanContent(longCleanLine, 'long-clean.txt').length, 0);

  // Ultra-long line with embedded brand mention
  const longDirtyLine = `${'NCERT '.repeat(100)} ${b64('VmVkYW50dQ==')} ${'CBSE '.repeat(100)}`;
  const violations = scanContent(longDirtyLine, 'long-dirty.txt');
  assert.equal(violations.length, 1);
  assert.equal(violations[0].brand, b64('VmVkYW50dQ=='));
});

test('T2-F10-05: Non-existent directory returns empty array without throwing', () => {
  const missingDir = path.join(PLATFORM_ROOT, 'non_existent_dir_xyz_123');
  const results = scanDirectory(missingDir);
  assert.deepEqual(results, []);
});

test('T2-F10-06: Multiple brand names on a single line are all captured', () => {
  const multiBrandLine = `Comparison between ${b64('QnlqdSdz')} and ${b64('VW5hY2FkZW15')} and ${b64('VmVkYW50dQ==')} courses.`;
  const violations = scanContent(multiBrandLine, 'multi.txt');
  assert.ok(violations.length >= 3, `Expected >= 3 violations on multi-brand line, got ${violations.length}`);
  const brands = violations.map((v) => v.brand);
  assert.ok(brands.includes(b64('QnlqdSdz')));
  assert.ok(brands.includes(b64('VW5hY2FkZW15')));
  assert.ok(brands.includes(b64('VmVkYW50dQ==')));
});

// ============================================================================
// TIER 3: CROSS-MODULE & INTEGRATION (Synthetic dirty/clean workspace fixtures)
// ============================================================================

test('T3-F10-01: Synthetic dirty fixtures directory correctly detects all violations', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classx-orig-dirty-'));

  try {
    fs.writeFileSync(
      path.join(tempDir, 'sample1.ts'),
      `export const note = "Check out ${b64('UGh5c2ljcyBXYWxsYWg=')} revision notes";\n`,
    );
    fs.writeFileSync(
      path.join(tempDir, 'sample2.json'),
      JSON.stringify({ provider: b64('QnlqdSdz'), active: true }),
    );
    fs.writeFileSync(
      path.join(tempDir, 'clean.md'),
      '# Class 10 NCERT Science\nPure academic content.\n',
    );

    const violations = scanDirectory(tempDir, { excludedDirs: [] });
    assert.equal(violations.length, 2);
    const matchedBrands = violations.map((v) => v.brand);
    assert.ok(matchedBrands.includes(b64('UGh5c2ljcyBXYWxsYWg=')));
    assert.ok(matchedBrands.includes(b64('QnlqdSdz')));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('T3-F10-02: Synthetic clean syllabus directory passes with 100% cleanliness', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'classx-orig-clean-'));

  try {
    fs.writeFileSync(
      path.join(tempDir, 'curriculum.json'),
      JSON.stringify({ board: 'CBSE', class: 10, subject: 'Science' }),
    );
    fs.writeFileSync(
      path.join(tempDir, 'redox.md'),
      '# Redox Reactions\nGain of oxygen is oxidation; loss is reduction.\n',
    );

    const violations = scanDirectory(tempDir, { excludedDirs: [] });
    assert.equal(violations.length, 0, 'Clean fixture directory must report 0 violations');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('T3-F10-03: Student-facing UI components and screens audit confirms zero brand mentions', () => {
  const screensDir = path.join(PLATFORM_ROOT, 'web', 'src', 'screens');
  if (fs.existsSync(screensDir)) {
    const violations = scanDirectory(screensDir);
    assert.equal(
      violations.length,
      0,
      `Student-facing UI screens must be 100% original. Violations found: ${JSON.stringify(violations)}`,
    );
  }
});

// ============================================================================
// TIER 4: WHOLE-PLATFORM SAFETY AUDIT
// ============================================================================

test('T4-F10-01: Whole-platform academic originality audit across backend, server, web, docs, scripts, eval, tests', () => {
  const targetDirs = ['backend', 'server', 'web/src', 'docs', 'scripts', 'eval', 'tests']
    .map((p) => path.join(PLATFORM_ROOT, p))
    .filter((p) => fs.existsSync(p));

  const allViolations = [];
  for (const dir of targetDirs) {
    const dirViolations = scanDirectory(dir);
    allViolations.push(...dirViolations);
  }

  // Strict assertion: zero brand mentions permitted across the platform
  if (allViolations.length > 0) {
    const summary = allViolations.slice(0, 30).map((v, i) =>
      `  [${i + 1}] ${v.file}:${v.line} [${v.brand}] "${v.snippet}"`
    ).join('\n');
    assert.fail(`Academic Originality Guardrail Failed! Found ${allViolations.length} violations:\n${summary}`);
  }

  assert.equal(allViolations.length, 0, 'Platform is 100% certified clean of all commercial brand names');
});

test('T4-F10-02: Academic originality regression gate passes cleanly on sanitized files', () => {
  const sampleSanitizedCatalog = [
    {
      videoId: 'dQw4w9WgXcQ',
      title: 'Class 10 Chemical Reactions and Equations - Full Concept',
      chapterId: 'chemical-reactions-and-equations',
      channel: 'Academic Foundation Lectures',
    },
    {
      videoId: 'sample_id_12',
      title: 'Real Numbers - Fundamental Theorem of Arithmetic',
      chapterId: 'real-numbers',
      channel: 'CBSE Science & Maths Portal',
    },
  ];

  const violations = scanContent(JSON.stringify(sampleSanitizedCatalog, null, 2), 'sanitized-catalog.json');
  assert.equal(violations.length, 0, 'Sanitized catalog must have 0 violations');
});

test('T4-F10-03: Self-scan certifying zero commercial brand names in tests/ and eval/ including self', () => {
  const selfContent = fs.readFileSync(__filename, 'utf8');
  const selfViolations = scanContent(selfContent, 'tests/originality-guardrail.test.js');
  assert.equal(selfViolations.length, 0, `Self-scan must have 0 violations, found: ${JSON.stringify(selfViolations)}`);

  const testsDir = path.join(PLATFORM_ROOT, 'tests');
  const evalDir = path.join(PLATFORM_ROOT, 'eval');

  const testViolations = scanDirectory(testsDir);
  const evalViolations = scanDirectory(evalDir);

  assert.equal(testViolations.length, 0, `tests/ must have 0 violations, found: ${JSON.stringify(testViolations)}`);
  assert.equal(evalViolations.length, 0, `eval/ must have 0 violations, found: ${JSON.stringify(evalViolations)}`);
});
