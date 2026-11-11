import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.OPENAI_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENAI_BASE_URL;

const { askTutor } = await import('../server/lib/ai.js');

test('grounded tutor answers with citations and a disclosed provider', async () => {
  const answer = await askTutor({
    question: 'Why is the square root of 2 irrational?',
    mode: 'board',
    subjectId: 'mathematics',
    chapterId: 'real-numbers',
  });
  assert.equal(answer.ok, true);
  assert.equal(answer.provider.mode, 'grounded-fallback');
  assert.ok(answer.answer.length > 200);
  assert.ok(!/Answer to your question/i.test(answer.answer));
  assert.ok(answer.sources.length >= 1);
  assert.ok(answer.sources.every((source) => source.chapterId && source.subjectId && source.type));
});

test('tutor refuses to invent when retrieval has no match', async () => {
  const answer = await askTutor({ question: 'zqxv blorf tarn', mode: 'socratic' });
  assert.equal(answer.ok, false);
  assert.equal(answer.sources.length, 0);
  assert.match(answer.answer, /could not find grounded curriculum/i);
});
