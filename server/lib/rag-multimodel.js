import { getIndex as getBaseIndex } from './rag.js';
import { okfIndex, okfAlignResult, okfFilter } from './okf-metadata.js';

const EMBEDDING_DIM = 512;

// Lightweight, dependency-free multimodel embedding stubs.
// Each provider returns a normalized Float32Array. Swap in real model calls
// (OpenAI embeddings, sentence-transformers, Cohere, local ONNX) without
// changing the retrieval contract.
const providers = {
  local: (text) => {
    const v = new Float32Array(EMBEDDING_DIM);
    let h = 2166136261;
    const clean = String(text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
    const tokens = clean.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      for (let i = 0; i < token.length; i += 1) {
        h ^= token.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      v[h >>> 0] += 1;
      for (let i = 0; i < token.length - 2; i += 1) {
        const hh = Math.imul(h ^ token.charCodeAt(i), 16777619) >>> 0;
        v[hh % EMBEDDING_DIM] += 0.35;
      }
    }
    let norm = 0;
    for (let i = 0; i < EMBEDDING_DIM; i += 1) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < EMBEDDING_DIM; i += 1) v[i] /= norm;
    return v;
  },
  openai: (text) => providers.local(text), // placeholder; wire real OpenAI embedding endpoint when key present
  cohere: (text) => providers.local(text),  // placeholder
};

const selectProvider = (name) => providers[name] || providers.local;

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
};

const rerank = (queryVec, chunks, scores, topN) => {
  // Cross-encoder style rerank stub: blend vector similarity + lexical overlap.
  const qTokens = new Set(String(queryVec._query || '').toLowerCase().split(/\s+/).filter(Boolean));
  const scored = chunks.map((chunk, i) => {
    const cText = (chunk.title + ' ' + chunk.text).toLowerCase();
    let overlap = 0;
    for (const t of qTokens) if (cText.includes(t)) overlap += 1;
    const lex = qTokens.size ? overlap / qTokens.size : 0;
    return { i, score: 0.6 * scores[i] + 0.4 * lex };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
};

export class MultimodelRag {
  constructor() {
    this.base = getBaseIndex();
    this.provider = selectProvider(process.env.RAG_EMBEDDING_PROVIDER || 'local');
    this.rerankProvider = process.env.RAG_RERANK_PROVIDER || 'none';
    this.okf = okfIndex;
  }

  stats() {
    const base = this.base;
    return {
      chunks: base.chunks.length,
      graphNodes: base.conceptNodes.size,
      embeddingProvider: process.env.RAG_EMBEDDING_PROVIDER || 'local',
      rerankProvider: this.rerankProvider,
      okf: this.okf.stats(),
    };
  }

  search(query, options = {}) {
    const { results, diagnostics } = this.base.search(query, {
      subjectId: options.subjectId,
      chapterId: options.chapterId,
      limit: Math.min(Math.max(Number(options.limit) || 12, 1), 50),
    });

    // Multimodel: embed query + candidates with selected provider, rerank.
    const queryVec = this.provider(query);
    queryVec._query = query;
    const reranked = rerank(query, results, results.map((r) => r.score), Number(options.limit) || 12);

    // OKF metadata alignment + filtering.
    let aligned = reranked.map(({ i }) => okfAlignResult(results[i], this.okf));

    if (options.difficulty || options.tags || options.board || options.class || options.academicYear) {
      aligned = aligned.filter(okfFilter(options));
    }

    return {
      ok: true,
      query,
      results: aligned.map((r) => ({
        id: r.id,
        title: r.title,
        text: r.text.slice(0, 1200),
        type: r.type,
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        chapterId: r.chapterId,
        chapterName: r.chapterName,
        anchor: r.anchor,
        score: Math.round(r.score * 10000) / 10000,
        okf: r.okf,
      })),
      diagnostics: {
        ...diagnostics,
        strategy: `multimodel-${process.env.RAG_EMBEDDING_PROVIDER || 'local'}+okf-metadata+rerank-${this.rerankProvider}`,
      },
    };
  }
}

let instance;
export const getMultimodelRag = () => {
  if (!instance) instance = new MultimodelRag();
  return instance;
};
