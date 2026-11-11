import { getLesson, subjects, sources } from './data.js';

const STOP = new Set('a an and are as at be but by for from has have how in into is it its of on or that the their then there these this to was were what when where which who why will with you your'.split(' '));
const SYNONYMS = new Map(Object.entries({
  hcf: ['gcd', 'highest common factor', 'greatest common divisor'],
  gcd: ['hcf', 'highest common factor'],
  lcm: ['lowest common multiple', 'least common multiple'],
  quadratic: ['degree two', 'parabola', 'discriminant'],
  discriminant: ['nature of roots', 'b2-4ac'],
  trigonometry: ['sin', 'cos', 'tan', 'sine', 'cosine', 'tangent'],
  trig: ['trigonometry', 'sin', 'cos', 'tan'],
  ap: ['arithmetic progression', 'common difference'],
  probability: ['chance', 'likely', 'outcome'],
  mensuration: ['area', 'volume', 'surface area'],
  electricity: ['current', 'voltage', 'resistance', 'ohm'],
  light: ['reflection', 'refraction', 'mirror', 'lens'],
  life: ['nutrition', 'respiration', 'transportation', 'excretion'],
  nationalism: ['nation', 'freedom', 'movement'],
  power: ['sharing', 'federalism', 'government'],
  board: ['cbse', 'ncert', 'examination', 'marks'],
  jee: ['competitive', 'shortcut', 'foundation'],
  neet: ['biology', 'foundation', 'competitive'],
  formula: ['expression', 'equation', 'identity'],
  practice: ['exercise', 'question', 'quiz', 'test'],
  solve: ['solution', 'steps', 'worked example'],
}));

const TYPE_HINTS = [
  { re: /\b(prove|proof|theorem|derive|derivation)\b/, types: ['theorem', 'concept'] },
  { re: /\b(example|solve|solution|step|how do i|how to)\b/, types: ['example', 'exercise', 'model', 'concept'] },
  { re: /\b(practice|quiz|mcq|question|test)\b/, types: ['quiz', 'exercise', 'model'] },
  { re: /\b(why|meaning|understand|concept|explain)\b/, types: ['concept', 'theorem', 'overview'] },
  { re: /\b(mistake|misconception|confus)\b/, types: ['misconception'] },
  { re: /\b(revis|summary|map|flow)\b/, types: ['mindmap', 'flowchart', 'overview'] },
];

const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const stem = (word) => {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
};

export function tokenize(text) {
  const raw = String(text || '')
    .toLowerCase()
    .replace(/[²]/g, ' 2 ')
    .replace(/[³]/g, ' 3 ')
    .replace(/[√]/g, ' sqrt ')
    .replace(/[×]/g, ' x ')
    .replace(/[÷]/g, ' / ')
    .replace(/[^a-z0-9+\-/.]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && t.length > 1 && !STOP.has(t));
  const out = [];
  for (const term of raw) {
    out.push(stem(term));
    if (/^[0-9]+$/.test(term)) out.push(`n${term}`);
  }
  for (let i = 0; i < raw.length - 1; i += 1) out.push(`${stem(raw[i])}_${stem(raw[i + 1])}`);
  return out;
}

const flatten = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(flatten).join(' ');
  if (typeof value === 'object') return Object.values(value).map(flatten).join(' ');
  return '';
};

class HybridIndex {
  constructor() {
    this.chunks = [];
    this.df = new Map();
    this.postings = new Map();
    this.vectors = [];
    this.nodeVectors = [];
    this.avgdl = 0;
    this.graph = new Map();
    this.conceptNodes = new Map();
    this.build();
  }

  add(chunk) {
    const tokens = tokenize(`${chunk.title} ${chunk.text} ${chunk.chapterName} ${chunk.subjectName}`);
    const tf = new Map();
    for (const token of tokens) tf.set(token, (tf.get(token) || 0) + 1);
    const id = this.chunks.length;
    const vector = new Float32Array(512);
    for (const [token, count] of tf) {
      const weight = 1 + Math.log(count);
      vector[hash(token) % 512] += weight;
      for (let i = 0; i < token.length - 2; i += 1) {
        vector[hash(token.slice(i, i + 3)) % 512] += weight * 0.35;
      }
    }
    let norm = 0;
    for (const v of vector) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
    chunk.tokens = tokens;
    chunk.len = tokens.length;
    chunk.vector = vector;
    this.chunks.push(chunk);
    for (const token of new Set(tokens)) {
      this.df.set(token, (this.df.get(token) || 0) + 1);
      if (!this.postings.has(token)) this.postings.set(token, []);
      this.postings.get(token).push(id);
    }
  }

  build() {
    for (const subject of subjects) {
      for (const chapter of subject.chapters) {
        const base = {
          subjectId: subject.id,
          subjectName: subject.name,
          chapterId: chapter.id,
          chapterName: chapter.name,
          unitId: chapter.unitId,
          anchor: 'overview',
          source: `${subject.name} · ${chapter.name}`,
        };
        const lesson = getLesson(subject.id, chapter.id);
        if (!lesson) {
          this.add({
            ...base,
            id: `${subject.id}:${chapter.id}:syllabus`,
            type: 'syllabus',
            title: `${chapter.name} — syllabus map`,
            text: `${chapter.summary} Topics: ${(chapter.topics || []).map((t) => t.name).join(', ')}. This chapter is mapped to the official CBSE 2026-27 syllabus. Authored lesson pack is being prepared.`,
          });
          continue;
        }
        this.add({
          ...base,
          id: `${subject.id}:${chapter.id}:overview`,
          type: 'overview',
          title: `${chapter.name} — overview`,
          text: [
            lesson.title,
            (lesson.outcomes || []).join(' '),
            (lesson.concepts || []).map((c) => c.name || c.title).join(' '),
            lesson.prerequisite_nodes ? `Prerequisites: ${lesson.prerequisite_nodes.join(', ')}` : '',
          ].join(' '),
        });
        (lesson.concepts || []).forEach((concept, index) => {
          this.add({
            ...base,
            anchor: `concept-${index}`,
            id: `${subject.id}:${chapter.id}:concept:${index}`,
            type: 'concept',
            title: concept.name || concept.title,
            text: [
              concept.real_life_application,
              concept.purpose || concept.explanation,
              flatten(concept.day_to_day_usage || concept.key_points),
            ].join(' '),
          });
          const key = String(concept.name || concept.title).toLowerCase();
          this.conceptNodes.set(key, { subjectId: subject.id, chapterId: chapter.id, chapterName: chapter.name, label: concept.name || concept.title });
        });
        (lesson.theorems || []).forEach((theorem, index) => {
          this.add({
            ...base,
            anchor: `theorem-${index}`,
            id: `${subject.id}:${chapter.id}:theorem:${index}`,
            type: 'theorem',
            title: theorem.name,
            text: [
              theorem.statement,
              theorem.historical_context,
              theorem.why_proposed,
              theorem.real_world_utility,
              theorem.why_students_learn,
              flatten(theorem.examples),
            ].join(' '),
          });
        });
        (lesson.worked_examples || []).forEach((example, index) => {
          this.add({
            ...base,
            anchor: `example-${index}`,
            id: `${subject.id}:${chapter.id}:example:${index}`,
            type: 'example',
            title: example.topic || example.title || `Worked example ${index + 1}`,
            text: [example.problem, flatten(example.board_mode || example.solution), example.answer, example.speed_mode || example.board_tip || example.exam_tip, example.competitive_shortcut].join(' '),
          });
        });
        Object.entries(lesson.exercises || {}).forEach(([groupKey, group]) => {
          (group.problems || []).forEach((problem, index) => {
            this.add({
              ...base,
              anchor: `exercise-${groupKey}`,
              id: `${subject.id}:${chapter.id}:exercise:${problem.id || index}`,
              type: 'exercise',
              title: `${group.title || groupKey} · ${problem.id || index + 1}`,
              text: [problem.question, flatten(problem.solution), problem.final_answer, problem.book_source].join(' '),
            });
          });
        });
        Object.entries(lesson.quizzes || {}).forEach(([difficulty, list]) => {
          if (!Array.isArray(list)) return;
          list.forEach((quiz, index) => {
            this.add({
              ...base,
              anchor: `practice-${difficulty}`,
              id: `${subject.id}:${chapter.id}:quiz:${difficulty}:${quiz.id || index}`,
              type: 'quiz',
              title: `${difficulty} practice · ${chapter.name}`,
              text: [quiz.question, flatten(quiz.options), flatten(quiz.explanation)].join(' '),
            });
          });
        });
        (lesson.common_misconceptions || []).forEach((item, index) => {
          this.add({
            ...base,
            anchor: `misconception-${index}`,
            id: `${subject.id}:${chapter.id}:misconception:${index}`,
            type: 'misconception',
            title: 'Common misconception',
            text: flatten(item),
          });
        });
        const branches = lesson.mind_maps?.branches || [];
        branches.forEach((branch, index) => {
          this.add({
            ...base,
            anchor: `mindmap-${index}`,
            id: `${subject.id}:${chapter.id}:mindmap:${index}`,
            type: 'mindmap',
            title: lesson.mind_maps.title || 'Mind map',
            text: [branch.concept, flatten(branch.sub_nodes), branch.connections].join(' '),
          });
        });
        (lesson.flowcharts || []).forEach((flow, index) => {
          this.add({
            ...base,
            anchor: `flow-${index}`,
            id: `${subject.id}:${chapter.id}:flow:${index}`,
            type: 'flowchart',
            title: flow.title,
            text: flatten(flow.steps),
          });
        });
        (lesson.visualizations || []).forEach((visual, index) => {
          const props = visual.visualizationProperties || {};
          this.add({
            ...base,
            anchor: `visual-${index}`,
            id: `${subject.id}:${chapter.id}:visual:${index}`,
            type: 'visual',
            title: props.title || `Visual ${index + 1}`,
            text: [props.title, props.type, flatten(props.markers), flatten(props.bars), flatten(props.labels), visual.syllabusSource].join(' '),
          });
        });
        (lesson.vedic_math_shortcuts || []).forEach((shortcut, index) => {
          this.add({
            ...base,
            anchor: `shortcut-${index}`,
            id: `${subject.id}:${chapter.id}:shortcut:${index}`,
            type: 'shortcut',
            title: shortcut.name || shortcut.title || 'Speed shortcut',
            text: flatten(shortcut),
          });
        });
        if (lesson.concept_maps?.nodes) {
          for (const node of lesson.concept_maps.nodes) {
            const edges = (lesson.concept_maps.edges || []).filter(([a, b]) => a === node.id || b === node.id);
            this.add({
              ...base,
              anchor: 'concept-map',
              id: `${subject.id}:${chapter.id}:conceptmap:${node.id}`,
              type: 'conceptmap',
              title: `${node.label} — concept map`,
              text: `${node.label} ${node.group || ''} ${edges.map((e) => e.join(' ')).join(' ')}`,
            });
          }
        }
      }
    }
    for (const subject of subjects) {
      const chapterIds = subject.chapters.map((c) => c.id);
      for (const chapter of subject.chapters) {
        const neighbors = new Set(chapterIds.filter((id) => id !== chapter.id && subject.chapters.find((c) => c.id === id)?.unitId === chapter.unitId));
        this.graph.set(`${subject.id}:${chapter.id}`, neighbors);
      }
    }
    this.avgdl = this.chunks.reduce((sum, c) => sum + c.len, 0) / Math.max(this.chunks.length, 1);
    this.chunks.forEach((c, i) => {
      this.vectors[i] = c.vector;
    });
    this.nodeVectors = [];
  }

  expandQuery(query) {
    const base = tokenize(query);
    const expanded = new Set(base);
    for (const term of base) {
      for (const [key, values] of SYNONYMS) {
        if (term === key || term.startsWith(key)) {
          for (const value of values) tokenize(value).forEach((t) => expanded.add(t));
        }
      }
    }
    return [...expanded];
  }

  bm25(tokens, filter) {
    const scores = new Float32Array(this.chunks.length);
    const k1 = 1.35;
    const b = 0.72;
    for (const token of tokens) {
      const ids = this.postings.get(token);
      if (!ids) continue;
      const idf = Math.log(1 + (this.chunks.length - ids.length + 0.5) / (ids.length + 0.5));
      for (const id of ids) {
        const chunk = this.chunks[id];
        if (filter && !filter(chunk)) continue;
        const tf = chunk.tokens.reduce((count, t) => count + (t === token ? 1 : 0), 0);
        scores[id] += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * chunk.len) / this.avgdl)));
      }
    }
    return scores;
  }

  vectorSearch(tokens) {
    const query = new Float32Array(512);
    for (const token of tokens) {
      const weight = 1;
      query[hash(token) % 512] += weight;
      for (let i = 0; i < token.length - 2; i += 1) query[hash(token.slice(i, i + 3)) % 512] += weight * 0.35;
    }
    let norm = 0;
    for (const v of query) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < query.length; i += 1) query[i] /= norm;
    const scores = new Float32Array(this.chunks.length);
    for (let i = 0; i < this.vectors.length; i += 1) {
      let dot = 0;
      for (let j = 0; j < 512; j += 1) dot += query[j] * this.vectors[i][j];
      scores[i] = dot;
    }
    return scores;
  }

  candidates(scores, limit, filter) {
    const out = [];
    for (let i = 0; i < scores.length; i += 1) {
      if (filter && !this.chunks[i] || (filter && !filter(this.chunks[i]))) continue;
      if (scores[i] > 0) out.push({ id: i, score: scores[i] });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit);
  }

  search(query, options = {}) {
    const started = performance.now();
    const normalized = String(query || '').trim();
    if (!normalized) return { results: [], diagnostics: { query: '', strategy: 'none', latencyMs: 0 } };
    const tokens = this.expandQuery(normalized);
    const subjectId = options.subjectId || null;
    const chapterId = options.chapterId || null;
    const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 30);
    const filter = (chunk) => (!subjectId || chunk.subjectId === subjectId) && (!chapterId || chunk.chapterId === chapterId);
    const softFilter = (chunk) => !subjectId || chunk.subjectId === subjectId;

    let bm25 = this.bm25(tokens, filter);
    let vector = this.vectorSearch(tokens);
    if (chapterId) {
      const hasSignal = this.candidates(bm25, 1, filter).length > 0;
      if (!hasSignal) bm25 = this.bm25(tokens, softFilter);
    }
    const bm25Top = this.candidates(bm25, 40, filter);
    const vecTop = this.candidates(vector, 40, filter);
    const scores = new Map();
    const add = (id, value) => scores.set(id, (scores.get(id) || 0) + value);
    bm25Top.forEach(({ id }, rank) => add(id, 1.0 / (12 + rank)));
    vecTop.forEach(({ id }, rank) => add(id, 0.78 / (12 + rank)));

    const phrase = normalized.toLowerCase();
    const qTokens = new Set(tokens);
    const hintedTypes = TYPE_HINTS.filter((hint) => hint.re.test(phrase)).flatMap((hint) => hint.types);
    const queryNorm = phrase.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    for (let id = 0; id < this.chunks.length; id += 1) {
      const chunk = this.chunks[id];
      let bonus = 0;
      if (queryNorm && chunk.title.toLowerCase().includes(queryNorm)) bonus += 0.14;
      if (queryNorm && chunk.chapterName.toLowerCase().includes(queryNorm)) bonus += 0.12;
      if (queryNorm && queryNorm.includes(chunk.chapterName.toLowerCase())) bonus += 0.1;
      if (hintedTypes.includes(chunk.type)) bonus += 0.05;
      if (options.chapterId && chunk.chapterId === options.chapterId) bonus += 0.06;
      const textLower = chunk.text.toLowerCase();
      let coverage = 0;
      for (const token of qTokens) if (textLower.includes(token)) coverage += 1;
      bonus += Math.min(0.08, (coverage / Math.max(qTokens.size, 1)) * 0.08);
      if (bonus) add(id, bonus);
    }

    const structural = new Set();
    for (const subject of subjects) {
      for (const chapter of subject.chapters) {
        const name = chapter.name.toLowerCase();
        const nameTokens = tokenize(name).filter((t) => !/^[0-9]/.test(t));
        const hits = nameTokens.filter((t) => qTokens.has(t)).length;
        if ((queryNorm && queryNorm.includes(name)) || (nameTokens.length && hits / nameTokens.length >= 0.6)) {
          structural.add(`${subject.id}:${chapter.id}`);
          for (const neighbor of this.graph.get(`${subject.id}:${chapter.id}`) || []) structural.add(`${subject.id}:${neighbor}`);
        }
      }
    }
    if (structural.size) {
      for (let id = 0; id < this.chunks.length; id += 1) {
        if (structural.has(`${this.chunks[id].subjectId}:${this.chunks[id].chapterId}`)) add(id, 0.028);
      }
    }

    const qLexical = new Set(tokens);
    const ranked = [...scores.entries()]
      .map(([id, score]) => ({ ...this.chunks[id], score }))
      .filter((item) => item.tokens.some((token) => qLexical.has(token)))
      .sort((a, b) => b.score - a.score);
    const perChapter = new Map();
    const results = [];
    for (const item of ranked) {
      const count = perChapter.get(item.chapterId) || 0;
      if (count >= 3) continue;
      perChapter.set(item.chapterId, count + 1);
      results.push(item);
      if (results.length >= limit) break;
    }
    return {
      results,
      diagnostics: {
        query: normalized,
        expandedTerms: tokens.slice(0, 24),
        strategy: chapterId ? 'tree-filter + bm25 + hashed-vector + rrf' : 'bm25 + hashed-vector + graph-boost + rrf',
        candidates: this.chunks.length,
        latencyMs: Math.round((performance.now() - started) * 10) / 10,
        intent: hintedTypes,
      },
    };
  }

  similar(chapterId, limit = 5) {
    const anchor = this.chunks.find((c) => c.chapterId === chapterId && c.type === 'concept') || this.chunks.find((c) => c.chapterId === chapterId);
    if (!anchor) return [];
    const scores = new Float32Array(this.chunks.length);
    for (let i = 0; i < this.vectors.length; i += 1) {
      if (this.chunks[i].chapterId === chapterId) continue;
      let dot = 0;
      for (let j = 0; j < 512; j += 1) dot += anchor.vector[j] * this.vectors[i][j];
      scores[i] = dot;
    }
    return this.candidates(scores, limit * 4)
      .filter(({ id }) => this.chunks[id].type === 'concept' || this.chunks[id].type === 'overview')
      .slice(0, limit)
      .map(({ id }) => this.chunks[id]);
  }
}

let index;
export function getIndex() {
  if (!index) index = new HybridIndex();
  return index;
}

export function getConceptGraph(subjectId, chapterId) {
  const lesson = getLesson(subjectId, chapterId);
  if (lesson?.concept_maps?.nodes?.length) {
    return {
      title: lesson.concept_maps.title,
      nodes: lesson.concept_maps.nodes,
      edges: lesson.concept_maps.edges || [],
      source: 'Authored concept map',
    };
  }
  const nodes = (lesson?.concepts || []).map((c, i) => ({ id: `n${i}`, label: c.name, group: 'concept' }));
  const edges = nodes.slice(1).map((node, i) => [nodes[0].id, node.id]);
  return { title: lesson?.chapter || 'Chapter map', nodes, edges, source: 'Derived from lesson concepts' };
}

export function getCitations(results) {
  return results.map((r) => ({
    chunkId: r.id,
    title: r.title,
    chapterId: r.chapterId,
    subjectId: r.subjectId,
    chapter: r.chapterName,
    subject: r.subjectName,
    type: r.type,
    anchor: r.anchor,
    source: r.source,
    page: null,
  }));
}

export function getSourcePdfs() {
  return sources;
}

export const ragStats = () => ({
  chunks: getIndex().chunks.length,
  graphNodes: getIndex().conceptNodes.size,
});
