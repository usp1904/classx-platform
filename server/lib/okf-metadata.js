import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SYLLABUS_DIR = path.resolve(ROOT, 'source', 'syllabus');

const OKF_VERSION = 'OKF-v1';

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  };
};

const loadOkfSubject = (subjectId) => {
  const file = path.resolve(SYLLABUS_DIR, `${subjectId}_okf.json`);
  return readJson(file);
};

const loadCombinedOkf = () => readJson(path.resolve(SYLLABUS_DIR, 'combined_syllabus_okf.json'));

// Normalize an OKF topic into a metadata record usable by retrieval + UI.
export const okfTopicRecord = (subjectId, topic) => ({
  subjectId,
  topicId: topic.id,
  topicName: topic.name,
  parentUnit: topic.parent_unit,
  difficulty: topic.difficulty || 'medium',
  estimatedPeriods: topic.estimated_periods || 0,
  tags: Array.isArray(topic.tags) ? topic.tags.filter(Boolean) : [],
  okfVersion: OKF_VERSION,
  board: 'CBSE',
  class: 'X',
  academicYear: '2026-27',
});

// Build a flat OKF topic index keyed by chapter id (derived from parent_unit -> chapter mapping).
export class OkfMetadataIndex {
  constructor() {
    this.topics = new Map();   // topicId -> record
    this.byChapter = new Map(); // chapterId -> topicId[]
    this.byUnit = new Map();   // unitId -> topicId[]
    this.tags = new Map();     // tag -> topicId[]
    this.loaded = false;
  }

  load() {
    const combined = loadCombinedOkf();
    if (!combined || !combined.okf) {
      this.loaded = false;
      return this;
    }
    for (const [subjectId, okfSubject] of Object.entries(combined.okf)) {
      const units = okfSubject.knowledge_units || [];
      for (const unit of units) {
        this.byUnit.set(unit.id, (this.byUnit.get(unit.id) || []).concat(units.map((u) => u.id)));
        for (const topic of unit.topics || []) {
          const rec = okfTopicRecord(subjectId, topic);
          this.topics.set(topic.id, rec);
          this.byUnit.set(unit.id, (this.byUnit.get(unit.id) || []).concat([topic.id]));
          for (const tag of rec.tags) {
            this.tags.set(tag, (this.tags.get(tag) || []).concat([topic.id]));
          }
        }
      }
    }
    this.loaded = true;
    return this;
  }

  topicsForTags(tags) {
    if (!tags || !tags.length) return [];
    const ids = new Set();
    for (const tag of tags) {
      for (const id of this.tags.get(tag) || []) ids.add(id);
    }
    return [...ids].map((id) => this.topics.get(id));
  }

  topic(topicId) {
    return this.topics.get(topicId) || null;
  }

  stats() {
    return {
      loaded: this.loaded,
      topicCount: this.topics.size,
      tagCount: this.tags.size,
      unitCount: this.byUnit.size,
      okfVersion: OKF_VERSION,
    };
  }
}

export const okfIndex = new OkfMetadataIndex().load();

export const okfAlignResult = (chunk, okfIdx = okfIndex) => {
  // Attach OKF metadata to a RAG chunk for metadata-aligned retrieval.
  const topicMatch = chunk.topicId ? okfIdx.topic(chunk.topicId) : null;
  const tags = topicMatch ? topicMatch.tags : [];
  return {
    ...chunk,
    okf: {
      version: OKF_VERSION,
      topic: topicMatch ? { id: topicMatch.topicId, name: topicMatch.topicName, difficulty: topicMatch.difficulty } : null,
      tags,
      board: 'CBSE',
      class: 'X',
      academicYear: '2026-27',
    },
  };
};

export const okfFilter = ({ difficulty, tags, board, class: cls, academicYear } = {}) => (chunk) => {
  const okf = chunk.okf || {};
  const topic = okf.topic;
  if (difficulty && topic && topic.difficulty !== difficulty) return false;
  if (tags && tags.length) {
    const chunkTags = okf.tags || [];
    if (!tags.some((t) => chunkTags.includes(t))) return false;
  }
  if (board && okf.board !== board) return false;
  if (cls && okf.class !== cls) return false;
  if (academicYear && okf.academicYear !== academicYear) return false;
  return true;
};
