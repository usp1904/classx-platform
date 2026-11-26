import test from 'node:test';
import assert from 'node:assert/strict';
import {
  composePersonaAnswer,
  DEPTH_DIRECTIVES,
  ROLE_COMPOSITIONS,
} from '../server/lib/persona-composer.js';
import { resolvePersona, buildAnswerPlan } from '../server/lib/agentic-rag.js';

test('B2 composer: student uses worked step ladder', () => {
  const c = composePersonaAnswer({ role: 'student', depth: 'board', exam: 'CBSE_BOARD' });
  assert.deepEqual(c.sections, ROLE_COMPOSITIONS.student.sections);
  assert.ok(c.sections.includes('workedSteps'));
  assert.match(c.guidance, /step/i);
});

test('B2 composer: teacher gets lesson plan, common errors, differentiation', () => {
  const c = composePersonaAnswer({ role: 'teacher', depth: 'board' });
  for (const s of ['lessonPlan', 'commonErrors', 'differentiation']) {
    assert.ok(c.sections.includes(s), `missing ${s}`);
  }
});

test('B2 composer: parent gets plain summary + progress link', () => {
  const c = composePersonaAnswer({ role: 'parent', depth: 'board' });
  assert.ok(c.sections.includes('plainSummary'));
  assert.ok(c.sections.includes('progressLink'));
  assert.equal(c.exam, 'CBSE_BOARD');
});

test('B2 composer: aspirant gets exam tier + PYQ framing, defaults to DSC', () => {
  const c = composePersonaAnswer({ role: 'aspirant', depth: 'deep' });
  assert.ok(c.sections.includes('examTier'));
  assert.ok(c.sections.includes('pyqFraming'));
  assert.equal(c.exam, 'DSC');
});

test('B2 composer: ELI5 depth is short analogy + micro-example', () => {
  const c = composePersonaAnswer({ role: 'student', depth: 'eli5' });
  assert.deepEqual(c.sections, ['analogy', 'microExample', 'coreIntuition']);
  assert.equal(c.depthDirective.requireAnalogy, true);
  assert.equal(c.depthDirective.requireMicroExample, true);
});

test('B2 composer: unknown role/depth fall back safely', () => {
  const c = composePersonaAnswer({ role: 'alien', depth: 'warp' });
  assert.equal(c.role, 'student');
  assert.equal(c.depth, 'socratic');
});

test('B2 composer: deeper depth raises sentence budget', () => {
  assert.ok(DEPTH_DIRECTIVES.deep.maxSentences > DEPTH_DIRECTIVES.board.maxSentences);
  assert.ok(DEPTH_DIRECTIVES.eli5.maxSentences < DEPTH_DIRECTIVES.board.maxSentences);
});

test('B2 composer: buildAnswerPlan attaches composition', () => {
  const plan = buildAnswerPlan(resolvePersona({ role: 'teacher', depth: 'board' }));
  assert.ok(plan.composition);
  assert.equal(plan.composition.role, 'teacher');
  assert.ok(plan.composition.sections.includes('lessonPlan'));
});
