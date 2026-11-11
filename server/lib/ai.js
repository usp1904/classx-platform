import { getChapter, getLesson } from './data.js';
import { getCitations, getIndex } from './rag.js';
import { getMultimodelRag } from './rag-multimodel.js';

const PROVIDERS = [
  { env: 'OPENROUTER_API_KEY', base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { env: 'OPENAI_API_KEY', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { env: 'openAI_API_KEY', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
];

function resolveProvider() {
  for (const p of PROVIDERS) {
    const key = process.env[p.env];
    if (key) {
      const baseUrl = (process.env.OPENAI_BASE_URL || p.base).replace(/\/$/, '');
      return {
        key,
        baseUrl,
        model: process.env.TUTOR_MODEL || process.env.OPENAI_MODEL || p.model,
        provider: p.env === 'OPENROUTER_API_KEY' ? 'openrouter' : 'openai-compatible',
      };
    }
  }
  return null;
}

const str = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(str).join('\n');
  if (typeof value === 'object') return Object.values(value).map(str).join('\n');
  return String(value);
};

function buildPrompt({ question, mode, context, chapter }) {
  const modeRules = {
    socratic: 'Ask one sharp prediction or reasoning question before revealing each major step. Never dump the final answer immediately. Keep the student doing the cognitive work.',
    board: 'Write like a CBSE board examiner: definition, given, formula, step-by-step working, final answer with units. Include marking-scheme friendly steps.',
    competitive: 'Write for JEE/NEET foundation: identify the fastest valid path, a 20-second shortcut, and the common trap. Still show enough work to verify.',
    eli5: 'Explain like I am five. Use tiny words, short sentences, and real-life things a child already knows (toys, food, games, family). No big words, no jargon. If you must use a hard word, explain it right away with a simple example. Make it warm, friendly, and easy to picture.',
  };
  return [
    {
      role: 'system',
      content: `You are the lead teacher for CBSE Class X at a top Indian ed-tech platform. Answer only from the supplied curriculum context. Never invent facts, question numbers, or formulas. If context is insufficient, say what is missing and teach the nearest grounded concept. Use clean Markdown. Render math as LaTeX between $...$ where useful. Cite sources as [S1], [S2] etc. Mode: ${mode}. ${modeRules[mode] || modeRules.socratic}`,
    },
    {
      role: 'user',
      content: `Student question: ${question}\n\nCurrent chapter: ${chapter ? `${chapter.subjectName} · ${chapter.name}` : 'not specified'}\n\nRetrieved curriculum context:\n${context}\n\nProduce a grounded answer with citations. End with one check-for-understanding question.`,
    },
  ];
}

function fallbackAnswer({ question, mode, results, chapter }) {
  const top = results[0];
  const concepts = results.filter((r) => r.type === 'concept').slice(0, 2);
  const theorem = results.find((r) => r.type === 'theorem');
  const worked = results.find((r) => ['exercise', 'example', 'model'].includes(r.type));
  const misconceptions = results.find((r) => r.type === 'misconception');
  const visual = results.find((r) => r.type === 'visual');
  const chapterName = chapter?.name || top?.chapterName || 'this topic';
  const lines = [];

  if (mode === 'socratic') {
    lines.push(`### Let us reason it out`);
    lines.push(`Before the reveal: in **${chapterName}**, what do you think is the *first* quantity or condition the question fixes? Say it in one sentence.`);
    if (top) lines.push(`**Anchor idea:** ${top.text.split('. ').slice(0, 2).join('. ')}. [S1]`);
    if (concepts[0]) lines.push(`**Why it matters:** ${concepts[0].text.split('. ').slice(0, 2).join('. ')}. [S1]`);
    if (visual) lines.push(`**Sketch it:** open the chapter visual **${visual.title}** and point to the quantity your question changes.`);
    lines.push(`### Now test the idea`);
    lines.push(`Use the anchor above on your own question. What is fixed, what is unknown, and which result connects them?`);
    if (worked) {
      lines.push(`A nearby solved problem starts with: “${str(worked.text).slice(0, 220)}” [S2]`);
    }
    lines.push(`Reply with your next step, and I will check the reasoning rather than just the answer.`);
  } else if (mode === 'competitive') {
    lines.push(`### Fast path · ${chapterName}`);
    if (top) lines.push(`**Core move:** ${top.text.slice(0, 260)} [S1]`);
    if (theorem) lines.push(`**Theorem / identity:** ${theorem.title} — ${theorem.text.slice(0, 220)} [S2]`);
    if (worked) lines.push(`**Worked pattern:** ${str(worked.text).slice(0, 320)} [S3]`);
    if (misconceptions) lines.push(`**Trap:** ${misconceptions.text.slice(0, 220)} [S4]`);
    if (visual) lines.push(`**Visual check:** **${visual.title}** — confirm the sign or scale before computing.`);
    lines.push(`**20-second check:** write the governing formula first, substitute the given values, then sanity-check the sign, unit, or order of magnitude.`);
    lines.push(`**Self-check:** redo the last step by a second route before locking the answer.`);
  } else if (mode === 'eli5') {
    lines.push(`### Like you are five · ${chapterName}`);
    lines.push(`Imagine this is a story about everyday things you already know.`);
    if (top) lines.push(`**The big idea:** ${top.text.split('. ').slice(0, 3).join('. ')} [S1]`);
    if (concepts[0]) lines.push(`**Think of it like this:** ${concepts[0].text.split('. ').slice(0, 3).join('. ')} [S2]`);
    if (worked) lines.push(`**A tiny example:** ${str(worked.text).slice(0, 260)} [S3]`);
    if (visual) lines.push(`**Draw it in your head:** **${visual.title}** — picture it like a picture-book page.`);
    lines.push(`So, in short: it works just like [simple thing from daily life], only with numbers or rules from school.`);
    lines.push(`**Did you get it?** Can you tell me one thing you learned, in your own words?`);
  } else {
    lines.push(`### Board-style skeleton · ${chapterName}`);
    if (top) lines.push(`**1. Identify the concept.** ${top.text.slice(0, 300)} [S1]`);
    if (theorem) lines.push(`**2. State the result.** **${theorem.title}** — ${theorem.text.slice(0, 300)} [S2]`);
    if (worked) lines.push(`**3. Model the working.**\n${str(worked.text).slice(0, 700)} [S3]`);
    if (concepts[1]) lines.push(`**4. Connect the idea.** ${concepts[1].text.slice(0, 220)} [S4]`);
    if (misconceptions) lines.push(`**5. Avoid the trap.** ${misconceptions.text.slice(0, 220)} [S5]`);
    if (visual) lines.push(`**6. Draw the check.** **${visual.title}** — label the axis, known values, and the quantity being asked.`);
    lines.push(`**Closing line:** use the retrieved steps as the marking-scheme skeleton — state the formula, substitute the values from the question, simplify, then finish with the correct unit.`);
  }
  lines.push(`> Curriculum-grounded orientation, not a generated solution. Add an AI provider key for a fully worked answer to your exact question.`);
  return lines.join('\n\n');
}

export async function askTutor({ question, mode = 'socratic', subjectId, chapterId, history = [] }) {
  const chapter = subjectId && chapterId ? getChapter(subjectId, chapterId) : null;
  const lesson = chapter ? getLesson(subjectId, chapterId) : null;
  const query = [question, chapter?.name, lesson?.chapter, ...(history.slice(-2).map((m) => m.content || ''))].filter(Boolean).join(' ');
  const multimodelRag = getMultimodelRag();
  const { results, diagnostics } = multimodelRag.search(query, {
    subjectId,
    chapterId,
    limit: 7,
    difficulty: optionsDifficulty(question),
  });
  if (!results.length) {
    return {
      ok: false,
      answer: 'I could not find grounded curriculum context for that question yet. Try naming the chapter, or ask about a topic in the Class X syllabus.',
      sources: [],
      retrieval: diagnostics,
    };
  }
  const context = results
    .map((r, i) => `[S${i + 1}] ${r.subjectName} · ${r.chapterName} · ${r.type} · ${r.title}\n${r.text.slice(0, 1200)}`)
    .join('\n\n');
  const provider = resolveProvider();
  if (provider) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.key}`,
        },
        body: JSON.stringify({
          model: provider.model,
          temperature: 0.25,
          max_tokens: 900,
          messages: buildPrompt({ question, mode, context, chapter }),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`provider ${response.status}`);
      const payload = await response.json();
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('empty provider response');
      return {
        ok: true,
        answer,
        sources: getCitations(results),
        retrieval: { ...diagnostics, provider: provider.provider, model: provider.model },
        provider: { mode: provider.provider, model: provider.model },
      };
    } catch (error) {
      clearTimeout(timeout);
      return {
        ok: true,
        answer: fallbackAnswer({ question, mode, results, chapter }),
        sources: getCitations(results),
        retrieval: { ...diagnostics, providerError: error.message },
        provider: { mode: 'grounded-fallback', model: 'curriculum-ranker' },
      };
    }
  }
  return {
    ok: true,
    answer: fallbackAnswer({ question, mode, results, chapter }),
    sources: getCitations(results),
    retrieval: diagnostics,
    provider: { mode: 'grounded-fallback', model: 'curriculum-ranker' },
  };
}

function optionsDifficulty(question) {
  const q = question.toLowerCase();
  if (/jee|neet|olympiad|competitive|shortcut|trick/.test(q)) return 'complex';
  if (/board|exam|marks|step/.test(q)) return 'medium';
  return 'simple';
}

export { resolveProvider };
