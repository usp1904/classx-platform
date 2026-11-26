// Persona composer (B2): turns a resolved persona into the answer shape the
// tutor should produce. Qualitative only; numeric depth budgets stay in
// PERSONA_PROFILES (agentic-rag.js) to keep a single source of truth.

export const DEPTH_DIRECTIVES = {
  eli5: {
    label: 'Explain like I am 5',
    maxSentences: 4,
    requireAnalogy: true,
    requireMicroExample: true,
    guidance: 'Short and concrete: one analogy plus one micro-example.',
  },
  socratic: {
    label: 'Socratic',
    maxSentences: 8,
    requireAnalogy: false,
    requireMicroExample: false,
    guidance: 'Lead with guiding questions, then resolve the reasoning.',
  },
  board: {
    label: 'Board answer',
    maxSentences: 10,
    requireAnalogy: false,
    requireMicroExample: false,
    guidance: 'Exam-ready definition, working, and conclusion.',
  },
  deep: {
    label: 'Exam tier',
    maxSentences: 14,
    requireAnalogy: false,
    requireMicroExample: false,
    guidance: 'Analytical, exam-tier depth with PYQ framing.',
  },
};

export const ROLE_COMPOSITIONS = {
  student: {
    sections: ['coreIntuition', 'boardAnswer', 'workedSteps', 'examinersTrap'],
    guidance: 'Worked step ladder: one reasoning step per line.',
  },
  teacher: {
    sections: ['lessonPlan', 'commonErrors', 'differentiation', 'boardAnswer'],
    guidance: 'Lesson plan, common errors, and differentiation notes.',
  },
  parent: {
    sections: ['plainSummary', 'progressLink'],
    guidance: 'Plain-language summary tied to the child\'s progress; no jargon.',
  },
  aspirant: {
    sections: ['examTier', 'pyqFraming', 'boardAnswer', 'examinersTrap'],
    guidance: 'Exam-tier answer with PYQ framing and state-syllabus grounding.',
  },
};

const ELI5_SECTIONS = ['analogy', 'microExample', 'coreIntuition'];

export function composePersonaAnswer(persona = {}) {
  const role = ROLE_COMPOSITIONS[persona.role] ? persona.role : 'student';
  const depth = DEPTH_DIRECTIVES[persona.depth] ? persona.depth : 'socratic';
  const roleSpec = ROLE_COMPOSITIONS[role];
  const depthDirective = DEPTH_DIRECTIVES[depth];
  const sections = depth === 'eli5' ? [...ELI5_SECTIONS] : [...roleSpec.sections];
  const exam = persona.exam || (role === 'aspirant' ? 'DSC' : 'CBSE_BOARD');
  return {
    role,
    depth,
    exam,
    sections,
    guidance: `${roleSpec.guidance} ${depthDirective.guidance}`,
    depthDirective,
  };
}
