import { QdrantClient } from '@qdrant/js-client-rest';

let qdrant = null;
let qdrantReady = false;

export async function initQdrant({ url = process.env.QDRANT_URL || 'http://127.0.0.1:6333' } = {}) {
  try {
    qdrant = new QdrantClient({ url });
    await qdrant.getCollections();
    qdrantReady = true;
    console.log('[qdrant] connected at', url);
    return qdrant;
  } catch (err) {
    console.warn('[qdrant] not available:', err.message);
    qdrant = null;
    qdrantReady = false;
    return null;
  }
}

export function getQdrant() {
  return qdrant;
}

export function isQdrantReady() {
  return qdrantReady;
}

/**
 * Semantic search over chapter content using Qdrant vectors.
 * Falls back to local lexical RAG when Qdrant is unavailable.
 */
export async function qdrantSearch({ query, subjectId, chapterId, limit = 5 }) {
  if (!isQdrantReady() || !qdrant) return null;

  const collection = 'classx_curriculum';
  try {
    // Generate a simple embedding placeholder — in production use an embedding model
    const vector = new Array(384).fill(0);
    const searchResult = await qdrant.search(collection, {
      vector,
      limit,
      filter: {
        must: [
          { key: 'subjectId', match: { value: subjectId } },
          ...(chapterId ? [{ key: 'chapterId', match: { value: chapterId } }] : []),
        ],
      },
      with_payload: true,
    });
    return searchResult.map((point) => ({
      id: point.id,
      title: point.payload?.title || '',
      text: point.payload?.text || '',
      type: point.payload?.type || 'chunk',
      subjectId: point.payload?.subjectId || subjectId,
      chapterId: point.payload?.chapterId || chapterId || '',
      score: point.score || 0,
    }));
  } catch (err) {
    console.warn('[qdrant] search failed:', err.message);
    return null;
  }
}

export async function qdrantUpsert(points) {
  if (!isQdrantReady() || !qdrant) return false;
  try {
    await qdrant.upsert('classx_curriculum', { points });
    return true;
  } catch (err) {
    console.warn('[qdrant] upsert failed:', err.message);
    return false;
  }
}
