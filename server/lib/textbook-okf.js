import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const BUNDLE_BOOKS = path.join(DATA_DIR, 'okf-textbooks', 'books');

const SUBJECT_NAMES = {
  mathematics: 'Mathematics',
  science: 'Science',
  'social-science': 'Social Science',
};

const BOOK_NAMES = {
  mathematics: 'NCERT Mathematics - Textbook for Class X',
  science: 'NCERT Science - Textbook for Class X',
  'social-science': 'NCERT Social Science - Class X',
};

const unquote = (value) => {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
};

function parseFrontmatter(raw) {
  const text = String(raw || '');
  if (!text.startsWith('---')) return { meta: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: text };
  const block = text.slice(3, end);
  const body = text.slice(text.indexOf('\n', end + 1) + 1);
  const meta = {};
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(' ') || line.startsWith('\t') || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    meta[match[1]] = unquote(match[2]);
  }
  return { meta, body };
}

function splitLong(text, max = 1200, overlap = 140) {
  if (text.length <= max) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const parts = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > max) {
      parts.push(current.trim());
      current = current.slice(-overlap) + ' ' + sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length ? parts : [text.slice(0, max)];
}

function pageChunks(meta, body) {
  const subjectId = meta['x-classx-subject'];
  const chapterId = meta['x-classx-chapter'];
  if (!subjectId || !chapterId || !SUBJECT_NAMES[subjectId]) return [];
  const chapterName = meta.title || chapterId;
  const chunks = [];
  const pattern = /^## Page (\d+)(?: \(book p\. (\d+)\))?$/;
  let current = null;

  const flush = () => {
    if (!current) return;
    const text = current.lines
      .join('\n')
      .replace(/^###\s*/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (text.length < 80) return;
    const page = current.bookPage ?? current.pdfPage;
    for (const [index, piece] of splitLong(text).entries()) {
      chunks.push({
        subjectId,
        subjectName: SUBJECT_NAMES[subjectId],
        chapterId,
        chapterName,
        unitId: null,
        anchor: `textbook-p${page}${index ? `-${index + 1}` : ''}`,
        id: `${subjectId}:${chapterId}:textbook:${page}:${index}`,
        type: 'textbook',
        title: `${chapterName} - page ${page}`,
        text: piece,
        page,
        pdfPage: current.pdfPage,
        source: BOOK_NAMES[subjectId],
        book: meta['x-classx-book-code'] || null,
      });
    }
  };

  for (const line of body.split('\n')) {
    const marker = line.match(pattern);
    if (marker) {
      flush();
      current = { pdfPage: Number(marker[1]), bookPage: marker[2] ? Number(marker[2]) : null, lines: [] };
      continue;
    }
    if (current && !line.startsWith('# ')) current.lines.push(line);
  }
  flush();
  return chunks;
}

let cache = null;

export function textbookChunks() {
  if (cache) return cache;
  const chunks = [];
  if (!fs.existsSync(BUNDLE_BOOKS)) {
    cache = chunks;
    return cache;
  }
  for (const subjectId of fs.readdirSync(BUNDLE_BOOKS)) {
    const folder = path.join(BUNDLE_BOOKS, subjectId);
    if (!fs.statSync(folder).isDirectory()) continue;
    for (const file of fs.readdirSync(folder)) {
      if (!file.endsWith('.md') || file === 'index.md') continue;
      const raw = fs.readFileSync(path.join(folder, file), 'utf8').replace(/\r\n?/g, '\n');
      const { meta, body } = parseFrontmatter(raw);
      chunks.push(...pageChunks(meta, body));
    }
  }
  cache = chunks;
  return cache;
}

export const textbookStats = () => ({
  chapters: new Set(textbookChunks().map((chunk) => `${chunk.subjectId}:${chunk.chapterId}`)).size,
  chunks: textbookChunks().length,
});
