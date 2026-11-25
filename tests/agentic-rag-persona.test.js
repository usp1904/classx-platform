import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePersona,
  buildAnswerPlan,
  PERSONA_PROFILES,
  runAgenticRag,
} from '../server/lib/agentic-rag.js';
import { modeFromPersona } from '../server/lib/ai.js';

test('B1 persona: legacy mode maps to depth', () => {
  assert.equal(resolvePersona({ mode: 'eli5' }).depth, 'eli5');
  assert.equal(resolvePersona({ mode: 'board' }).depth, 'board');
  assert.equal(resolvePersona({ mode: 'competitive' }).depth, 'deep');
  assert.equal(resolvePersona({ mode: 'socratic' }).depth, 'socratic');
});

test('B1 persona: role aliases normalize', () => {
  assert.equal(resolvePersona({ role: 'dsc' }).role, 'aspirant');
  assert.equal(resolvePersona({ role: 'guardian' }).role, 'parent');
  assert.equal(resolvePersona({ role: 'tutor' }).role, 'teacher');
  assert.equal(resolvePersona({ role: 'unknown-role' }).role, 'student');
});

test('B1 persona: exam inference and explicit exam', () => {
  assert.equal(resolvePersona({ role: 'aspirant' }).exam, 'DSC');
  assert.equal(resolvePersona({ role: 'student' }).exam, 'CBSE_BOARD');
  assert.equal(resolvePersona({ role: 'aspirant', exam: 'upsc' }).exam, 'UPSC');
});

test('B1 persona: profiles define distinct layer order and depth budgets', () => {
  const student = buildAnswerPlan(resolvePersona({ role: 'student' }));
  const teacher = buildAnswerPlan(resolvePersona({ role: 'teacher' }));
  const aspirant = buildAnswerPlan(resolvePersona({ role: 'aspirant' }));
  const parent = buildAnswerPlan(resolvePersona({ role: 'parent' }));
  assert.deepEqual(student.layerOrder, PERSONA_PROFILES.student.layerOrder);
  assert.equal(student.layerOrder[0], 'coreIntuition');
  assert.equal(aspirant.layerOrder[0], 'competitiveBridge');
  assert.equal(teacher.depthBudget.workedSteps, 3);
  assert.equal(parent.visualPolicy, 'summary-only');
  assert.notEqual(student.depthBudget.words, aspirant.depthBudget.words);
});

test('B1 persona: nested persona object wins and plan echoes values', () => {
  const p = resolvePersona({ persona: { role: 'aspirant', exam: 'UPSC', depth: 'deep', ageBand: '20+' } });
  assert.deepEqual(p, { role: 'aspirant', exam: 'UPSC', depth: 'deep', ageBand: '20+' });
  const plan = buildAnswerPlan(p);
  assert.equal(plan.examBridge, 'exam-tier');
  assert.equal(plan.role, 'aspirant');
});

test('B1 persona: runAgenticRag is exported and resolver agrees with wrapper input', () => {
  assert.equal(typeof runAgenticRag, 'function');
  const direct = resolvePersona({ role: 'teacher', mode: 'board' });
  assert.equal(direct.role, 'teacher');
  assert.equal(direct.depth, 'board');
});

test('B1b persona: depth maps to legacy tutor mode', () => {
  assert.equal(modeFromPersona({ depth: 'eli5' }), 'eli5');
  assert.equal(modeFromPersona({ depth: 'board' }), 'board');
  assert.equal(modeFromPersona({ depth: 'deep' }), 'competitive');
  assert.equal(modeFromPersona({ depth: 'socratic' }), 'socratic');
});

test('B1b persona: missing persona leaves mode untouched', () => {
  assert.equal(modeFromPersona(null), null);
  assert.equal(modeFromPersona(undefined), null);
  assert.equal(modeFromPersona({ role: 'student' }), null);
});
