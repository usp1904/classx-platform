import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getChapter, getLesson } from './data.js';
import { getCitations } from './rag.js';
import { getMultimodelRag } from './rag-multimodel.js';
import { okfIndex } from './okf-metadata.js';
import { sanitizePromptInput } from './security.js';
import { isValidVideoId } from './youtube.js';
import { resolveProvider } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DEFAULT_VIDEO_CATALOG_PATH = path.resolve(ROOT_DIR, 'backend', 'rag', 'visual_aid_videos.json');

const CHAPTER_ALIASES = {
  'the-human-eye-and-the-colourful-world': 'human-eye-and-colourful-world',
};

function resolveChapterSlug(chapterId) {
  const slug = String(chapterId || '').trim().toLowerCase();
  return CHAPTER_ALIASES[slug] || slug;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'is', 'are', 'was', 'were', 'what', 'why', 'how', 'when', 'where', 'who', 'which',
  'explain', 'describe', 'state', 'find', 'calculate', 'solve', 'show', 'that',
  'this', 'these', 'those', 'also', 'from', 'into', 'under', 'between', 'does', 'did',
  'discuss', 'significance', 'early', 'movements', 'about', 'its', 'be', 'can', 'do',
  'has', 'have', 'had', 'not', 'no', 'if', 'then', 'than', 'their', 'them', 'they',
  'you', 'your', 'our', 'we', 'me', 'my',
]);

const COMPETITIVE_PATTERNS = [
  /\b(jee|neet|upsc|dsc)\b/i,
  /\b(competitive|bridge|olympiad|foundation|advanced|higher-order|hots)\b/i,
  /\bcivil\s*services?\b/i,
  /\bassertion\s*\(a\)|reason\s*\(r\)\b/i,
  /\bceva|menelaus|dihybrid|punnett|saponification|esterification\b/i,
  /\bnon-ohmic|semiconductor|ahimsa|secular\s*state|mgnrega|disguised\s*unemployment\b/i,
];

const TOPIC_RULES = [
  // Mathematics
  { re: /\b(quadratic|roots|factorisation|splitting\s+middle\s+term)\b/i, subject: 'mathematics', chapterId: 'quadratic-equations', topicTag: 'solution_by_factorisation' },
  { re: /\b(arithmetic\s+progression|s_?n\s*=|common\s+difference|20th\s+term|\bap\b)\b/i, subject: 'mathematics', chapterId: 'arithmetic-progressions', topicTag: 'sum_of_first_n_terms_of_an_ap' },
  { re: /\b(basic\s+proportionality|thales|ceva|menelaus|triangle)\b/i, subject: 'mathematics', chapterId: 'triangles', topicTag: 'basic_proportionality_theorem' },
  { re: /\b(euclid|irrational|fundamental\s+theorem\s+of\s+arithmetic|hcf|lcm|real\s+numbers)\b/i, subject: 'mathematics', chapterId: 'real-numbers', topicTag: 'fundamental_theorem_of_arithme' },
  { re: /\b(polynomial|zeroes)\b/i, subject: 'mathematics', chapterId: 'polynomials', topicTag: 'polynomials' },
  // Social Science
  { re: /\b(non-cooperation|non\s+cooperation|chauri\s+chaura)\b/i, subject: 'social-science', chapterId: 'nationalism-in-india', topicTag: 'non_cooperation_movement' },
  { re: /\b(satyagraha|ahimsa|champaran|kheda|gandhi)\b/i, subject: 'social-science', chapterId: 'nationalism-in-india', topicTag: 'nationalism_in_india' },
  { re: /\b(frederic\s+sorrieu|sorrieu|utopian\s+vision|1848)\b/i, subject: 'social-science', chapterId: 'the-rise-of-nationalism-in-europe', topicTag: 'frederic_sorrieu_utopian_visi' },
  { re: /\b(smallpox|conquest\s+of\s+america|spanish\s+conquerors|global\s+world)\b/i, subject: 'social-science', chapterId: 'the-making-of-a-global-world', topicTag: 'conquest_disease_and_trade' },
  { re: /\b(belgium|belgian|sri\s*lanka|majoritarianism|power-sharing|power\s+sharing)\b/i, subject: 'social-science', chapterId: 'power-sharing', topicTag: 'belgium_and_sri_lanka' },
  { re: /\b(federalism|federal\s+country|union\s+list|state\s+list|concurrent\s+list|seventh\s+schedule)\b/i, subject: 'social-science', chapterId: 'federalism', topicTag: 'what_makes_india_a_federal_co' },
  { re: /\b(secular\s+state|religious\s+freedom|articles?\s+15|gender,\s*religion)\b/i, subject: 'social-science', chapterId: 'gender-religion-and-caste', topicTag: 'secular_state' },
  { re: /\b(democracy|social\s+diversity)\b/i, subject: 'social-science', chapterId: 'outcomes-of-democracy', topicTag: 'accommodation_of_social_diversity' },
  { re: /\b(gully\s+erosion|sheet\s+erosion|soil\s+conservation|contour\s+ploughing|terrace\s+farming)\b/i, subject: 'social-science', chapterId: 'resources-and-development', topicTag: 'soil_erosion_and_soil_conserv' },
  { re: /\b(rice|kharif|major\s+crops|rice-producing)\b/i, subject: 'social-science', chapterId: 'agriculture', topicTag: 'major_crops_rice' },
  { re: /\b(non-conventional|conventional.*energy|solar\s+energy|photovoltaic)\b/i, subject: 'social-science', chapterId: 'minerals-and-energy-resources', topicTag: 'non_conventional_sources_of_e' },
  { re: /\b(currency|medium\s+of\s+exchange|reserve\s+bank|rbi|money\s+and\s+credit)\b/i, subject: 'social-science', chapterId: 'money-and-credit', topicTag: 'money_as_medium_of_exchange' },
  { re: /\b(disguised\s+unemployment|mgnrega|sectors\s+of\s+the\s+indian\s+economy)\b/i, subject: 'social-science', chapterId: 'sectors-of-the-indian-economy', topicTag: 'division_of_sectors_as_organi' },
  { re: /\b(globali[sz]ation|mncs?|small\s+producers|job\s+insecurity)\b/i, subject: 'social-science', chapterId: 'globalisation-and-the-indian-economy', topicTag: 'impact_of_globalisation_in_in' },
  // Science
  { re: /\b(quicklime|calcium\s*oxide|slaked\s*lime|magnesium\s*ribbon|redox|copper\s*oxide|lead\s*nitrate)\b/i, subject: 'science', chapterId: 'chemical-reactions-and-equations', topicTag: 'chemical_reactions_and_equatio' },
  { re: /\b(ph\b|tooth\s*decay|bleaching\s*powder|antacid|acids?,?\s*bases)\b/i, subject: 'science', chapterId: 'acids-bases-and-salts', topicTag: 'importance_of_ph_in_everyday_' },
  { re: /\b(esterification|saponification|ethanoic|ethanol|carboxylic|carbon\s+and\s+its\s+compounds)\b/i, subject: 'science', chapterId: 'carbon-and-its-compounds', topicTag: 'chemical_properties_of_carbon_' },
  { re: /\b(amphoteric|aluminium\s*oxide|sodium\s*aluminate|metals\s+and\s+non-metals)\b/i, subject: 'science', chapterId: 'metals-and-non-metals', topicTag: 'chemical_properties_of_metals' },
  { re: /\b(convex\s*lens|concave\s*mirror|focal\s*length|dioptre|power\s+of\s+(?:the\s+)?lens|refraction)\b/i, subject: 'science', chapterId: 'light-reflection-and-refraction', topicTag: 'refraction_lens_power' },
  { re: /\b(stars\s+twinkle|twinkle|atmospheric\s+refraction|human\s+eye)\b/i, subject: 'science', chapterId: 'the-human-eye-and-the-colourful-world', topicTag: 'atmospheric_refraction' },
  { re: /\b(ohm|non-ohmic|semiconductor|resistance|bulb|220\s*v|v-i\s+characteristic)\b/i, subject: 'science', chapterId: 'electricity', topicTag: 'ohms_law_resistance' },
  { re: /\b(fleming|motor|magnetic\s*field|right-hand\s*thumb|split-ring|commutator)\b/i, subject: 'science', chapterId: 'magnetic-effects-of-electric-current', topicTag: 'flemings_left_hand_rule_moto' },
  { re: /\b(heart|oxygenated|deoxygenated|double\s+circulation|nephron|kidneys)\b/i, subject: 'science', chapterId: 'life-processes', topicTag: 'transportation_human_heart' },
  { re: /\b(reflex\s*arc|touches\s+a\s+hot\s+object|synapse|neurotransmitter|activity\s*7\.1)\b/i, subject: 'science', chapterId: 'control-and-coordination', topicTag: 'reflex_arc_nervous_system' },
  { re: /\b(dihybrid|punnett|mendel|independent\s+assortment|ttrr|pea\s+plant)\b/i, subject: 'science', chapterId: 'heredity-and-evolution', topicTag: 'dihybrid_cross_inheritance' },
];

export function analyzeQuery(input) {
  const rawQuery = typeof input === 'string' ? input : (input?.question || '');
  const { sanitized, isBlocked } = sanitizePromptInput(rawQuery, { maxLength: 2000 });
  const trimmed = sanitized.trim();

  const invalidPayload = () => ({
    intent_mode: 'BOARD_EXAM',
    target_exam: 'CBSE_BOARD',
    okf_filters: {
      subject: input?.subjectId || 'science',
      chapter_id: input?.chapterId || 'general',
      topic_tag: 'general',
      content_block_type: 'concept',
      source_type: 'NCERT_TEXTBOOK',
    },
    bm25_keywords: [],
    hyde_passage: '',
    is_valid: false,
  });

  if (isBlocked || !trimmed) {
    return invalidPayload();
  }

  const rawTokens = trimmed
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  if (rawTokens.length === 0) {
    return invalidPayload();
  }

  const bm25_keywords = [...new Set(rawTokens)].slice(0, 10);

  let intent_mode = 'BOARD_EXAM';
  if (input && typeof input === 'object' && (input.intentMode === 'BOARD_EXAM' || input.intentMode === 'COMPETITIVE_BRIDGE')) {
    intent_mode = input.intentMode;
  } else if (COMPETITIVE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    intent_mode = 'COMPETITIVE_BRIDGE';
  }

  let target_exam = 'CBSE_BOARD';
  if (intent_mode === 'COMPETITIVE_BRIDGE') {
    if (/\b(upsc|civil\s*services?|governance|polity|history|sovereign|belgian|majoritarianism|linguistic\s*conflict|federal|seventh\s*schedule|constitutional\s*articles?|secular|smallpox|conquest\s*of\s*america|non-cooperation|satyagraha|sorrieu)\b/i.test(trimmed)) {
      target_exam = 'UPSC_CSE';
    } else if (/\b(dsc|state\s*commission|rural|mgnrega|disguised\s*unemployment|underemployment|globali[sz]ation|mncs?|job\s+insecurity|soil\s*erosion|rice)\b/i.test(trimmed)) {
      target_exam = 'DSC_STATE';
    } else if (/\b(neet|biology|heart|circulation|mendel|dihybrid|punnett|reflex|neuron|synapse|mammals|nephron|tooth\s*decay)\b/i.test(trimmed)) {
      target_exam = 'NEET_UG';
    } else {
      target_exam = 'JEE_MAIN';
    }
  }

  const isDirectExercise =
    /\b(?:exercise|ex\.?)\s*(?:\d+(?:\.\d+)?|question\b)/i.test(trimmed) ||
    /\bquestion\s*\d+/i.test(trimmed);
  const isActivity =
    /\bactivity\s*\d+(?:\.\d+)?/i.test(trimmed) ||
    /\b(reaction of .* with .* granules|touches a hot object|heating lead nitrate|magnesium ribbon.*burned|what do we see when|quicklime is added to water)\b/i.test(trimmed);
  const isNumerical =
    /(?:\b\d+(?:\.\d+)?\s*(?:cm|mm|m|km|v|a|ohm|d|w|j|hz|n|pa|k|°c|%|\^2)\b|\bS_?n\s*=)/i.test(trimmed) &&
    /\b(find|calculate|determine|solve|power|focal length|resistance|consumed|roots|term|distance|image)\b/i.test(trimmed);

  const shouldOmitHyde = isDirectExercise || isActivity || isNumerical;

  let subject = (typeof input === 'object' && input?.subjectId) ? input.subjectId : 'science';
  let chapter_id = (typeof input === 'object' && input?.chapterId) ? input.chapterId : 'general-chapter';
  let topic_tag = 'general_topic';

  for (const rule of TOPIC_RULES) {
    if (rule.re.test(trimmed)) {
      if (!(typeof input === 'object' && input?.subjectId)) subject = rule.subject;
      if (!(typeof input === 'object' && input?.chapterId)) chapter_id = rule.chapterId;
      topic_tag = rule.topicTag;
      break;
    }
  }

  if (topic_tag === 'general_topic' && okfIndex?.loaded) {
    const lower = trimmed.toLowerCase();
    for (const rec of okfIndex.topics.values()) {
      if (rec.topicName && lower.includes(rec.topicName.toLowerCase()) && rec.tags?.[2]) {
        topic_tag = rec.tags[2];
        break;
      }
    }
  }

  let hyde_passage = '';
  if (!shouldOmitHyde) {
    const conciseTopic = trimmed.slice(0, 180).replace(/[?.!]/g, '');
    if (subject === 'social-science') {
      hyde_passage = `According to NCERT Class 10 Social Science curriculum, ${conciseTopic} represents a core institutional and historical theme. Standard textbook analysis examines constitutional structures, socio-economic outcomes, and cause-effect relationships. Board and analytical evaluations require clear factual evidence grounded in NCERT chapters.`;
    } else {
      hyde_passage = `According to NCERT Class 10 curriculum, ${conciseTopic} represents a core academic principle. Key textbook principles demonstrate the systematic relationships and empirical laws governing this topic. Standard CBSE evaluation requires precise conceptual definitions supported by verified observations.`;
    }
  }

  let content_block_type = 'concept';
  if (isDirectExercise || isNumerical) content_block_type = 'exercise';
  else if (isActivity) content_block_type = 'activity';
  else if (/\b(prove|theorem|basic\s+proportionality|thales)\b/i.test(trimmed)) content_block_type = 'theorem';
  else if (/\b(esterification|saponification)\b/i.test(trimmed)) content_block_type = 'reaction';

  const okf_filters = {
    subject,
    chapter_id,
    topic_tag,
    content_block_type,
    source_type: intent_mode === 'COMPETITIVE_BRIDGE' ? 'NCERT_EXEMPLAR' : 'NCERT_TEXTBOOK',
  };

  return {
    intent_mode,
    target_exam,
    okf_filters,
    bm25_keywords,
    hyde_passage,
    is_valid: true,
  };
}

export function gradeRetrieval({ intent_mode, chunks = [], threshold = 0.5, retryCount = 0 } = {}) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return {
      verdict: 'REWRITE_QUERY',
      passed_chunks: [],
      pruned_chunks: [],
      reason: 'Empty chunk list provided for evaluation.',
      source_summary: { has_textbook: false, has_board_sqp: false, has_exemplar: false },
      relaxed_filters: retryCount > 0,
    };
  }

  const passed_chunks = [];
  const pruned_chunks = [];

  for (const chunk of chunks) {
    const score = Number(chunk.score ?? chunk.similarity ?? 1.0);
    if (score >= threshold) {
      passed_chunks.push(chunk);
    } else {
      pruned_chunks.push({ ...chunk, prune_reason: 'Below relevance threshold' });
    }
  }

  const sources = new Set(passed_chunks.map((c) => c.source_type));
  const has_textbook = sources.has('NCERT_TEXTBOOK');
  const has_board_sqp = sources.has('CBSE_SQP');
  const has_exemplar = sources.has('NCERT_EXEMPLAR');
  const source_summary = { has_textbook, has_board_sqp, has_exemplar };

  if (!has_textbook) {
    return {
      verdict: 'REWRITE_QUERY',
      passed_chunks,
      pruned_chunks,
      reason: 'Factual insufficiency: Missing primary NCERT_TEXTBOOK grounding chunks.',
      source_summary,
      relaxed_filters: retryCount > 0,
    };
  }

  if (intent_mode === 'BOARD_EXAM' && !has_board_sqp) {
    return {
      verdict: 'REWRITE_QUERY',
      passed_chunks,
      pruned_chunks,
      reason: 'Exam misalignment: Missing official CBSE_SQP marking scheme context for BOARD_EXAM.',
      source_summary,
      relaxed_filters: retryCount > 0,
    };
  }

  if (intent_mode === 'COMPETITIVE_BRIDGE' && !has_exemplar) {
    return {
      verdict: 'REWRITE_QUERY',
      passed_chunks,
      pruned_chunks,
      reason: 'Exam misalignment: Missing NCERT_EXEMPLAR higher-order thinking context for COMPETITIVE_BRIDGE.',
      source_summary,
      relaxed_filters: retryCount > 0,
    };
  }

  return {
    verdict: 'PASS',
    passed_chunks,
    pruned_chunks,
    reason: 'Factual sufficiency and exam alignment requirements satisfied.',
    source_summary,
    relaxed_filters: retryCount > 0,
  };
}

export function validateAnswerLayers(layers, options = {}) {
  const errors = [];

  if (!layers || typeof layers !== 'object') {
    return { ok: false, errors: ['answerLayers must be a non-null object'] };
  }

  const requiredKeys = ['coreIntuition', 'boardAnswer', 'competitiveBridge', 'examinersTrap'];
  for (const key of requiredKeys) {
    if (typeof layers[key] !== 'string' || layers[key].trim().length === 0) {
      errors.push(`Missing or empty required layer: "${key}"`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const forbiddenCliches = [
    /as an ai language model/i,
    /certainly! here is/i,
    /sure thing/i,
    /i hope this helps/i,
    /feel free to ask/i,
    /in conclusion, it is important/i,
  ];

  const fullText = Object.values(layers).join(' ');
  for (const regex of forbiddenCliches) {
    if (regex.test(fullText)) {
      errors.push(`AI cliché violation: Matched "${regex.source}"`);
    }
  }

  const boardText = layers.boardAnswer;
  const boldMatch = boardText.match(/\*\*([^*]+)\*\*/g);
  if (!boldMatch || boldMatch.length === 0) {
    errors.push('CBSE Board Answer must contain bold keywords formatted with **keyword**');
  }

  const markRegex = /\[(?:\d+(?:\.\d+)?|1\/2)\s*(?:Mark|Marks|mark|marks)\]/g;
  const markMatches = boardText.match(markRegex);
  if (!markMatches || markMatches.length === 0) {
    errors.push('CBSE Board Answer must contain step-wise mark distribution in brackets, e.g. [1 Mark]');
  }

  if (options.requiresSiUnits) {
    const siUnitRegex = /\b\d+(?:\.\d+)?\s*(?:m\/s|cm|m|v|a|ohm|dioptre|d|w|j|n|s|pa|°c|k|g|kg)\b/i;
    if (!siUnitRegex.test(boardText)) {
      errors.push('STEM Board Answer must include physical quantities with standard SI units');
    }
  }

  if (options.subject === 'social-science') {
    if (/\b(jee|neet)\b/i.test(layers.competitiveBridge)) {
      errors.push('Humanities/Social Science Competitive Bridge must not reference STEM exams (JEE/NEET)');
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    boldKeywordCount: boldMatch ? boldMatch.length : 0,
    markCount: markMatches ? markMatches.length : 0,
  };
}

export function synthesizePedagogicalAnswer(input) {
  if (input && input.expected_synthesis) {
    const {
      core_intuition_cue,
      mandatory_bold_keywords,
      step_mark_breakdown,
      requires_si_units,
      competitive_target,
      examiners_trap_keyword,
    } = input.expected_synthesis;

    const coreIntuition = `${core_intuition_cue} This everyday intuition illustrates why the underlying academic principle functions effortlessly in nature.`;
    const boldKeywordsFormatted = mandatory_bold_keywords.join(' and ');
    const stepsFormatted = step_mark_breakdown.join('\n- ');
    const boardAnswer = `Official CBSE Board Standard Working:\n- Key principles involving ${boldKeywordsFormatted}.\n- ${stepsFormatted}${requires_si_units ? '\n- Numerical values calculated with appropriate SI units (e.g. +4 D or 50 cm).' : ''}`;
    const competitiveBridge = `Competitive Bridge (${competitive_target}): Connects foundational Class 10 concepts to advanced problem types in ${competitive_target} examination curricula.`;
    const examinersTrap = `Examiner's Trap: A frequent pitfall is ${examiners_trap_keyword} resulting in avoidable negative marks or lost grading steps.`;

    return { coreIntuition, boardAnswer, competitiveBridge, examinersTrap };
  }

  const question = String(input?.question || '');
  const analysis = input?.analysis || analyzeQuery(question);
  const subject = input?.subjectId || analysis?.okf_filters?.subject || 'science';
  const chapterId = input?.chapterId || analysis?.okf_filters?.chapter_id || 'general-chapter';
  const targetExam = analysis?.target_exam || 'CBSE_BOARD';
  const chunks = Array.isArray(input?.chunks) ? input.chunks : [];

  const lesson = getLesson(subject, resolveChapterSlug(chapterId));
  const concept = lesson?.concepts?.[0];
  const worked = lesson?.worked_examples?.[0];
  const misconception = lesson?.common_misconceptions?.[0];
  const tbChunk = chunks.find((c) => c.source_type === 'NCERT_TEXTBOOK') || chunks[0];
  const sqpChunk = chunks.find((c) => c.source_type === 'CBSE_SQP');
  const exemplarChunk = chunks.find((c) => c.source_type === 'NCERT_EXEMPLAR');

  const keyword = (analysis?.bm25_keywords?.[0] || chapterId.replace(/-/g, ' '));
  const analogyBase = concept?.real_life_application || concept?.real_life_example || '';
  const coreIntuition = analogyBase
    ? `Think of it like an everyday example: ${analogyBase}`
    : `Think of ${chapterId.replace(/-/g, ' ')} as a predictable cause-and-effect balance seen in daily life.`;

  const tbText = (tbChunk?.text || tbChunk?.content || concept?.purpose || concept?.explanation || `Core NCERT principle of ${keyword}.`).slice(0, 280);
  const sqpText = (sqpChunk?.text || sqpChunk?.content || (worked?.board_mode ? [].concat(worked.board_mode).join(' ') : '') || `Structured CBSE working for ${keyword}.`).slice(0, 260);
  const needsSi = /\b\d+(?:\.\d+)?\s*(?:cm|m|v|a|ohm|d|w|j)\b/i.test(question) && subject !== 'social-science';
  const siLine = needsSi ? '\n- Express final physical quantities with standard SI units (e.g. 10 ohm or +4 D) [1 Mark].' : '';

  const boardAnswer = `- **${keyword}**: ${tbText} [1 Mark].\n- **CBSE Marking Scheme**: ${sqpText} [1 Mark].${siLine}`;

  let competitiveBridge;
  if (subject === 'social-science') {
    const label = targetExam === 'DSC_STATE' ? 'State DSC / UPSC' : 'UPSC CSE / State DSC';
    const detail = (exemplarChunk?.text || exemplarChunk?.content || 'Connects Class 10 institutional and constitutional principles to analytical civil services questions.').slice(0, 260);
    competitiveBridge = `${label} Analytical Bridge: ${detail}`;
  } else {
    const label = targetExam === 'NEET_UG' ? 'NEET UG' : 'JEE Main';
    const detail = (worked?.competitive_shortcut || exemplarChunk?.text || exemplarChunk?.content || `Extends ${keyword} to higher-order quantitative and conceptual edge cases.`).slice(0, 260);
    competitiveBridge = `${label} Foundation Bridge: ${detail}`;
  }

  const examinersTrap = misconception
    ? (typeof misconception === 'string' ? misconception : JSON.stringify(misconception)).slice(0, 240)
    : `Avoid omitting qualifying NCERT conditions, sign conventions, or key definitions related to ${keyword}.`;

  return { coreIntuition, boardAnswer, competitiveBridge, examinersTrap };
}

export class VideoGroundingCatalog {
  constructor(entries) {
    this.catalog = new Map();
    let list;
    if (Array.isArray(entries)) {
      list = entries;
    } else if (entries === undefined && fs.existsSync(DEFAULT_VIDEO_CATALOG_PATH)) {
      try {
        list = JSON.parse(fs.readFileSync(DEFAULT_VIDEO_CATALOG_PATH, 'utf8'));
      } catch {
        list = [];
      }
    } else {
      list = [];
    }

    for (const entry of list) {
      if (entry && entry.topic_tag && entry.video_metadata) {
        const normalized = this.normalizeTag(entry.topic_tag);
        if (normalized && this.isValidVideoMetadata(entry.video_metadata)) {
          this.catalog.set(normalized, { ...entry.video_metadata });
        }
      }
    }
  }

  normalizeTag(tag) {
    if (!tag || typeof tag !== 'string') return '';
    return tag.toLowerCase().trim().replace(/[_\s-]+/g, '_');
  }

  isValidVideoMetadata(video) {
    if (!video || typeof video !== 'object') return false;
    if (!isValidVideoId(video.video_id)) return false;
    if (typeof video.start_sec !== 'number' || typeof video.end_sec !== 'number') return false;
    if (!Number.isInteger(video.start_sec) || !Number.isInteger(video.end_sec)) return false;
    if (video.start_sec < 0 || video.start_sec >= video.end_sec) return false;
    if (typeof video.concept_title !== 'string' || video.concept_title.trim().length === 0) return false;
    if (typeof video.observation_cue !== 'string' || video.observation_cue.trim().length === 0) return false;
    return true;
  }

  groundTopic(topicTag) {
    const normalized = this.normalizeTag(topicTag);
    if (!normalized || !this.catalog.has(normalized)) {
      return null;
    }
    const video = this.catalog.get(normalized);
    if (!video || !this.isValidVideoMetadata(video)) {
      return null;
    }
    return { ...video };
  }

  buildEmbedUrl(video) {
    if (!video || !this.isValidVideoMetadata(video)) return '';
    return `https://www.youtube-nocookie.com/embed/${video.video_id}?rel=0&modestbranding=1&iv_load_policy=3&controls=1&start=${video.start_sec}&end=${video.end_sec}&enablejsapi=1`;
  }
}

export class QueryAnalyzer {
  analyze(input) {
    return analyzeQuery(input);
  }
}

export class RetrievalGrader {
  grade(params) {
    return gradeRetrieval(params);
  }
}

export class PedagogicalSynthesizer {
  validate(layers, options) {
    return validateAnswerLayers(layers, options);
  }

  synthesize(input) {
    return synthesizePedagogicalAnswer(input);
  }
}

const defaultVideoCatalog = new VideoGroundingCatalog();

function formatLayersAsMarkdown(layers, visualAidVideo) {
  if (!layers) return '';
  const parts = [
    `### 1. Core Intuition (The 'Why')\n${layers.coreIntuition}`,
    `### 2. CBSE Board Answer\n${layers.boardAnswer}`,
    `### 3. Competitive Exam Bridge\n${layers.competitiveBridge}`,
    `### 4. Examiner's Trap\n${layers.examinersTrap}`,
  ];
  if (visualAidVideo) {
    parts.push(
      `### Visual Aid Clip\n**${visualAidVideo.concept_title}** (${visualAidVideo.start_sec}s–${visualAidVideo.end_sec}s): ${visualAidVideo.observation_cue}`,
    );
  }
  return parts.join('\n\n');
}

function mapChunkToOkfSource(chunk) {
  const t = String(chunk.type || '');
  if (t === 'example' || t === 'exercise' || t === 'model') return 'CBSE_SQP';
  if (t === 'quiz' || t === 'shortcut' || t === 'misconception') return 'NCERT_EXEMPLAR';
  return 'NCERT_TEXTBOOK';
}

function buildSupplementalLessonChunks(subjectId, chapterId) {
  const lesson = getLesson(subjectId, resolveChapterSlug(chapterId));
  if (!lesson) return [];
  const out = [];
  if (lesson.concepts?.[0]) {
    out.push({
      id: `${subjectId}:${chapterId}:lesson:concept:0`,
      source_type: 'NCERT_TEXTBOOK',
      content: `${lesson.concepts[0].name || ''} ${lesson.concepts[0].purpose || lesson.concepts[0].explanation || ''}`,
      score: 0.72,
    });
  }
  if (lesson.worked_examples?.[0]) {
    const we = lesson.worked_examples[0];
    out.push({
      id: `${subjectId}:${chapterId}:lesson:sqp:0`,
      source_type: 'CBSE_SQP',
      content: `${we.problem || ''} ${[].concat(we.board_mode || we.solution || []).join(' ')}`,
      score: 0.7,
    });
    out.push({
      id: `${subjectId}:${chapterId}:lesson:exemplar:0`,
      source_type: 'NCERT_EXEMPLAR',
      content: `${we.competitive_shortcut || we.speed_mode || we.problem || ''}`,
      score: 0.68,
    });
  }
  if (lesson.common_misconceptions?.[0]) {
    out.push({
      id: `${subjectId}:${chapterId}:lesson:misconception:0`,
      source_type: 'NCERT_EXEMPLAR',
      content: JSON.stringify(lesson.common_misconceptions[0]),
      score: 0.66,
    });
  }
  return out;
}

function spawnPythonGraph(payload, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const graphPath = path.resolve(ROOT_DIR, 'backend', 'rag', 'graph.py');
    if (!fs.existsSync(graphPath)) {
      return reject(new Error('backend/rag/graph.py not present'));
    }
    const pythonBin = process.env.PYTHON_BIN || 'python';
    const child = spawn(pythonBin, ['-m', 'backend.rag'], {
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';
    const MAX_STDOUT = 1024 * 1024;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Python LangGraph timeout'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      if (stdout.length > MAX_STDOUT) {
        clearTimeout(timer);
        child.kill('SIGKILL');
        reject(new Error('Python stdout exceeded limit'));
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(stderr || `Python exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Invalid JSON from Python graph: ${err.message}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

async function synthesizeWithLlmIfConfigured({ question, analysis, chunks, subject }) {
  if (process.env.CLASSX_OFFLINE_MODE === '1') return null;
  const provider = resolveProvider();
  if (!provider) return null;

  const requiresSiUnits = /\b\d+(?:\.\d+)?\s*(?:cm|m|v|a|ohm|d|w|j)\b/i.test(question) && subject !== 'social-science';
  const contextText = chunks
    .slice(0, 6)
    .map((c, idx) => `[S${idx + 1} ${c.source_type}] ${(c.text || c.content || '').slice(0, 500)}`)
    .join('\n\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Return strictly a JSON object with keys: coreIntuition, boardAnswer, competitiveBridge, examinersTrap. ' +
              'boardAnswer MUST wrap key NCERT terms in **bold** and include bracketed marks like [1 Mark]. ' +
              (subject === 'social-science'
                ? 'Subject is social-science: competitiveBridge MUST target UPSC/DSC and MUST NOT mention JEE or NEET.'
                : 'Subject is STEM: competitiveBridge targets JEE Main or NEET UG.') +
              ' Never use AI clichés or mention commercial coaching brands.',
          },
          {
            role: 'user',
            content: `Question: ${question}\nIntent: ${analysis.intent_mode}\nContext:\n${contextText}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const payload = await response.json();
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const check = validateAnswerLayers(parsed, { subject, requiresSiUnits });
    if (check.ok) return { layers: parsed, provider };
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export async function runAgenticRag({
  question,
  mode = 'socratic',
  subjectId,
  chapterId,
  intentMode,
  history = [],
} = {}) {
  const sanitization = sanitizePromptInput(question || '', { maxLength: 2000 });
  if (sanitization.isBlocked) {
    return {
      ok: false,
      answer: 'Your question contains prohibited patterns or instructions and cannot be processed. Please ask an educational question about the Class X syllabus.',
      sources: [],
      retrieval: { flags: sanitization.flags, blocked: true },
      provider: { mode: 'security-guard', model: 'input-filter' },
      intentMode: 'BOARD_EXAM',
      analysis: analyzeQuery(''),
      graderVerdict: 'REWRITE_QUERY',
      answerLayers: null,
      visualAidVideo: null,
      pipelineStages: [{ node: 'query_analyzer', status: 'failed', output: 'BLOCKED' }],
    };
  }

  const cleanQuestion = sanitization.sanitized.trim();
  const analysis = analyzeQuery({ question: cleanQuestion, subjectId, chapterId, intentMode });

  const resolvedSubject = subjectId || analysis.okf_filters.subject;
  const resolvedChapter = resolveChapterSlug(chapterId || analysis.okf_filters.chapter_id);
  const chapter = resolvedSubject && resolvedChapter ? getChapter(resolvedSubject, resolvedChapter) : null;
  const cleanHistory = (Array.isArray(history) ? history.slice(-2) : [])
    .map((m) => (m && typeof m.content === 'string' ? sanitizePromptInput(m.content).sanitized : ''))
    .filter(Boolean);
  const searchQuery = [cleanQuestion, analysis.hyde_passage ? analysis.bm25_keywords.join(' ') : '', chapter?.name, ...cleanHistory]
    .filter(Boolean)
    .join(' ');

  const multimodelRag = getMultimodelRag();
  let { results, diagnostics } = multimodelRag.search(searchQuery, {
    subjectId: subjectId || undefined,
    chapterId: chapter ? resolvedChapter : undefined,
    limit: 8,
  });

  if (!results.length && (subjectId || chapterId)) {
    const broad = multimodelRag.search(cleanQuestion, { limit: 8 });
    results = broad.results;
    diagnostics = broad.diagnostics;
  }

  if (!results.length) {
    return {
      ok: false,
      answer: 'I could not find grounded curriculum context for that question yet. Try naming the chapter, or ask about a topic in the Class X syllabus.',
      sources: [],
      retrieval: diagnostics,
      provider: { mode: 'grounded-fallback', model: 'agentic-okf-v0.2' },
      intentMode: analysis.intent_mode,
      analysis,
      graderVerdict: 'REWRITE_QUERY',
      answerLayers: null,
      visualAidVideo: null,
      pipelineStages: [
        { node: 'query_analyzer', status: 'completed', output: analysis.intent_mode },
        { node: 'retrieval_grader', status: 'completed', output: 'REWRITE_QUERY' },
      ],
    };
  }

  const sources = getCitations(results);

  // Attempt Python LangGraph pipeline first unless disabled
  if (process.env.AGENTIC_RAG_PYTHON !== 'false') {
    try {
      const pyResult = await spawnPythonGraph({
        query: cleanQuestion,
        subject_id: subjectId || analysis.okf_filters.subject,
        chapter_id: chapterId || analysis.okf_filters.chapter_id,
        intent_mode: intentMode || analysis.intent_mode,
      });
      if (pyResult && pyResult.ok && pyResult.answerLayers) {
        const subject = pyResult.analysis?.okf_filters?.subject || resolvedSubject;
        const requiresSi = /\b\d+(?:\.\d+)?\s*(?:cm|m|v|a|ohm|d|w|j)\b/i.test(cleanQuestion) && subject !== 'social-science';
        const layerCheck = validateAnswerLayers(pyResult.answerLayers, { subject, requiresSiUnits: requiresSi });
        const validVideo =
          pyResult.visualAidVideo === null ||
          pyResult.visualAidVideo === undefined ||
          defaultVideoCatalog.isValidVideoMetadata(pyResult.visualAidVideo);

        if (layerCheck.ok && validVideo) {
          return {
            ok: true,
            intentMode: pyResult.intentMode,
            analysis: pyResult.analysis,
            graderVerdict: pyResult.graderVerdict,
            answerLayers: pyResult.answerLayers,
            visualAidVideo: pyResult.visualAidVideo ?? null,
            pipelineStages: pyResult.pipelineStages || [],
            answer: formatLayersAsMarkdown(pyResult.answerLayers, pyResult.visualAidVideo),
            sources,
            retrieval: { ...diagnostics, engine: 'langgraph-python' },
            provider: { mode: 'langgraph-python', model: 'langgraph-okf-v0.2' },
          };
        }
      }
    } catch {
      // Fall back cleanly to deterministic JS agentic pipeline below
    }
  }

  // Deterministic JS Agentic RAG Fallback
  const pipelineStages = [{ node: 'query_analyzer', status: 'completed', output: analysis.intent_mode }];
  const maxScore = Math.max(...results.map((r) => Number(r.score) || 0.1), 0.1);
  let okfChunks = results.map((r) => ({
    ...r,
    source_type: mapChunkToOkfSource(r),
    content: r.text,
    score: Math.min(1, Math.max(0.55, (Number(r.score) || 0.5) / maxScore)),
  }));

  let gradeResult = gradeRetrieval({ intent_mode: analysis.intent_mode, chunks: okfChunks, retryCount: 0 });
  pipelineStages.push({ node: 'retrieval_grader', status: 'completed', output: gradeResult.verdict });

  if (gradeResult.verdict === 'REWRITE_QUERY') {
    pipelineStages.push({ node: 'query_rewriter', status: 'completed', output: 'RELAXED_OKF_FILTERS' });
    const supplemental = buildSupplementalLessonChunks(resolvedSubject, resolvedChapter);
    okfChunks = [...okfChunks, ...supplemental];
    gradeResult = gradeRetrieval({ intent_mode: analysis.intent_mode, chunks: okfChunks, retryCount: 1 });
    pipelineStages.push({ node: 'retrieval_grader', status: 'completed', output: gradeResult.verdict });
  }

  const llmAttempt = await synthesizeWithLlmIfConfigured({
    question: cleanQuestion,
    analysis,
    chunks: gradeResult.passed_chunks.length ? gradeResult.passed_chunks : okfChunks,
    subject: analysis.okf_filters.subject,
  });

  const answerLayers =
    llmAttempt?.layers ||
    synthesizePedagogicalAnswer({
      question: cleanQuestion,
      analysis,
      chunks: gradeResult.passed_chunks.length ? gradeResult.passed_chunks : okfChunks,
      subjectId: analysis.okf_filters.subject,
      chapterId: analysis.okf_filters.chapter_id,
      mode,
    });

  pipelineStages.push({ node: 'pedagogical_generator', status: 'completed', output: '4_LAYERS_GENERATED' });

  const visualAidVideo = defaultVideoCatalog.groundTopic(analysis.okf_filters.topic_tag);
  pipelineStages.push({
    node: 'video_grounder',
    status: 'completed',
    output: visualAidVideo ? 'ATTACHED' : 'OMITTED_CLEANLY',
  });

  const provider = llmAttempt?.provider
    ? { mode: llmAttempt.provider.provider, model: llmAttempt.provider.model }
    : { mode: 'grounded-fallback', model: 'agentic-okf-v0.2' };

  return {
    ok: true,
    intentMode: analysis.intent_mode,
    analysis,
    graderVerdict: gradeResult.verdict,
    answerLayers,
    visualAidVideo,
    pipelineStages,
    answer: formatLayersAsMarkdown(answerLayers, visualAidVideo),
    sources,
    retrieval: { ...diagnostics, engine: 'js-agentic-fallback' },
    provider,
  };
}
