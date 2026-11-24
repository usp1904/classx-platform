import fs from 'node:fs';
import path from 'node:path';
import { subjects } from '../server/lib/data.js';
import { buildKnowledgeHub } from '../server/lib/knowledge-hub.js';

const OUT = path.resolve('web', 'src', 'data', 'knowledge-hub.json');
const hubs = {};
let count = 0;

for (const subject of subjects) {
  for (const chapter of subject.chapters) {
    const hub = buildKnowledgeHub(subject.id, chapter.id);
    if (!hub) continue;
    hubs[`${subject.id}:${chapter.id}`] = hub;
    count += 1;
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(),
  count,
  hubs,
}, null, 2));

console.log(`wrote ${count} knowledge hubs to ${OUT}`);
