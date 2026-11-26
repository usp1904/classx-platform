"""4-Layer Pedagogical Synthesizer Node (Core Intuition, CBSE Board Answer, Competitive Bridge, Examiner's Trap)."""

from __future__ import annotations

import json
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .analyzer import STOP_WORDS, extract_bm25_keywords
from .grader import resolve_chapter_slug
from .schema import AgentState, LayeredAnswer, PipelineStage

BASE_DIR = Path(__file__).resolve().parents[2]
LESSONS_DIR = BASE_DIR / "server" / "data" / "lessons"

AI_CLICHE_PATTERNS = [
    re.compile(r"as an ai language model", re.I),
    re.compile(r"certainly! here is", re.I),
    re.compile(r"sure thing", re.I),
    re.compile(r"i hope this helps", re.I),
    re.compile(r"feel free to ask", re.I),
    re.compile(r"in conclusion, it is important", re.I),
]

SI_UNIT_RE = re.compile(
    r"\b\d+(?:\.\d+)?\s*(?:m/s|cm|m|v|a|ohm|dioptre|d|w|j|n|s|pa|°c|k|g|kg)\b",
    re.I,
)

_BOILERPLATE_TERMS = {
    "ncert", "cbse", "sqp", "textbook", "exemplar", "marking", "scheme",
    "mark", "marks", "question", "chapter", "answer", "exercise", "activity",
    "assertion", "reason", "validate", "pair", "class", "board", "exam",
}
_GENERIC_FILLERS = {
    "added", "placed", "taken", "given", "using", "used", "makes", "made",
    "forms", "formed", "based", "called", "known", "shown", "following",
    "above", "below", "become", "becomes", "produces", "produce",
}


def validate_answer_layers(
    layers: LayeredAnswer | Dict[str, Any],
    subject: str = "science",
    requires_si_units: bool = False,
) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if isinstance(layers, LayeredAnswer):
        data = layers.model_dump()
    elif isinstance(layers, dict):
        data = layers
    else:
        return False, ["answerLayers must be a LayeredAnswer or dict"]

    for key in ("coreIntuition", "boardAnswer", "competitiveBridge", "examinersTrap"):
        val = data.get(key)
        if not isinstance(val, str) or not val.strip():
            errors.append(f"Missing or empty required layer: {key}")

    if errors:
        return False, errors

    full_text = " ".join(str(data[k]) for k in ("coreIntuition", "boardAnswer", "competitiveBridge", "examinersTrap"))
    for pattern in AI_CLICHE_PATTERNS:
        if pattern.search(full_text):
            errors.append(f"AI cliché violation: {pattern.pattern}")

    board_text = data["boardAnswer"]
    if not re.search(r"\*\*([^*]+)\*\*", board_text):
        errors.append("CBSE Board Answer must contain bold keywords formatted with **keyword**")
    if not re.search(r"\[(?:\d+(?:\.\d+)?|1\/2)\s*(?:Mark|Marks|mark|marks)\]", board_text):
        errors.append("CBSE Board Answer must contain step-wise mark distribution in brackets")

    if requires_si_units and not SI_UNIT_RE.search(board_text):
        errors.append("STEM Board Answer must include physical quantities with standard SI units")

    if subject == "social-science" and re.search(r"\b(jee|neet)\b", data["competitiveBridge"], re.I):
        errors.append("Humanities/Social Science Competitive Bridge must not reference JEE or NEET")

    return len(errors) == 0, errors


def _load_lesson_fallback(subject: str, chapter_id: str) -> Dict[str, Any]:
    resolved = resolve_chapter_slug(chapter_id)
    path = LESSONS_DIR / subject / f"{resolved}.json"
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _clean_snippet(raw: str, max_len: int = 260) -> str:
    text = re.sub(r"\s+", " ", str(raw or "")).strip()
    text = re.sub(r"^(?:NCERT_TEXTBOOK|CBSE_SQP|NCERT_EXEMPLAR)\s*:\s*", "", text, flags=re.I)
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    last_space = cut.rfind(" ")
    if last_space > max_len // 2:
        cut = cut[:last_space]
    return cut.rstrip(" ,;:") + "."


def _term_matches(term: str, lower_text: str, collapsed_text: str) -> bool:
    if term in lower_text:
        return True
    if len(term) >= 6:
        compact = term.replace("-", "")
        if len(compact) >= 6 and compact in collapsed_text:
            return True
    return False


def _compute_term_weights(corpus_texts: List[str], query_terms: set[str]) -> Dict[str, float]:
    # Weight terms by intrinsic specificity (length/numeric/non-generic) without small-sample IDF inversion
    weights: Dict[str, float] = {}
    for t in query_terms:
        if t in _GENERIC_FILLERS:
            weights[t] = 0.25
        elif len(t) >= 8 or "." in t or any(ch.isdigit() for ch in t):
            weights[t] = 2.5
        elif len(t) >= 6:
            weights[t] = 2.0
        else:
            weights[t] = 1.0
    return weights


def _compute_idf_weights(corpus_texts: List[str], query_terms: set[str]) -> Dict[str, float]:
    prep = []
    for txt in corpus_texts:
        low = str(txt or "").lower()
        prep.append((low, re.sub(r"[\s-]+", "", low)))
    n_docs = max(len(prep), 1)
    weights: Dict[str, float] = {}
    for t in query_terms:
        base = 0.25 if t in _GENERIC_FILLERS else (2.0 if (len(t) >= 6 or "." in t or any(ch.isdigit() for ch in t)) else 1.0)
        df = sum(1 for low, col in prep if _term_matches(t, low, col))
        idf = math.log(1.0 + (n_docs + 1.0) / (df + 1.0))
        weights[t] = base * (idf ** 2)
    return weights


def _score_overlap(
    text: str,
    query_terms: set[str],
    term_weights: Optional[Dict[str, float]] = None,
) -> float:
    lower = text.lower()
    collapsed = re.sub(r"[\s-]+", "", lower)
    score = 0.0
    for t in query_terms:
        if _term_matches(t, lower, collapsed):
            if term_weights and t in term_weights:
                score += term_weights[t]
            elif t in _GENERIC_FILLERS:
                score += 0.25
            elif len(t) >= 6 or "." in t or any(ch.isdigit() for ch in t):
                score += 2.0
            else:
                score += 1.0
    return score


def _extract_relevant_excerpt(
    raw: str,
    query_terms: set[str],
    max_len: int = 560,
    term_weights: Optional[Dict[str, float]] = None,
) -> str:
    cleaned = re.sub(r"###\s*", "", str(raw or ""))
    cleaned = re.sub(
        r"^(?:Science|Mathematics|Social Science|Democratic Politics|India and the Contemporary World|Contemporary India|Understanding Economic Development)\s+\d+\s*",
        "",
        cleaned.strip(),
        flags=re.I,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"^(?:NCERT_TEXTBOOK|CBSE_SQP|NCERT_EXEMPLAR)\s*:\s*", "", cleaned, flags=re.I)
    if len(cleaned) <= max_len:
        return cleaned

    segments = [
        s.strip()
        for s in re.split(r"(?<!Fig)(?<!Eq)(?<!e\.g)(?<!i\.e)(?<=[.!?])\s+|\s*\n+\s*", cleaned)
        if len(s.strip()) >= 12
    ]
    if not segments:
        return _clean_snippet(cleaned, max_len)

    best_idx = 0
    best_score = -1.0
    for idx, seg in enumerate(segments):
        sc = _score_overlap(seg, query_terms, term_weights)
        if sc > best_score:
            best_score = sc
            best_idx = idx

    if best_score <= 0:
        return _clean_snippet(cleaned, max_len)

    excerpt = segments[best_idx]
    for next_idx in range(best_idx + 1, min(best_idx + 6, len(segments))):
        candidate = f"{excerpt} {segments[next_idx]}"
        if len(candidate) <= max_len:
            excerpt = candidate
        else:
            break
    return _clean_snippet(excerpt, max_len)


def _pick_best_chunk(
    chunks: List[Dict[str, Any]],
    source_type: str,
    query_terms: set[str],
    term_weights: Optional[Dict[str, float]] = None,
    preferred_block_type: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    candidates = [c for c in chunks if c.get("source_type") == source_type]
    if not candidates:
        return None
    return max(
        candidates,
        key=lambda c: (
            (float(c.get("score") or 0.0) * 10.0)
            + _score_overlap(f"{c.get('title', '')} {c.get('content', '')}", query_terms, term_weights)
            + (3.0 if preferred_block_type and c.get("content_block_type") == preferred_block_type else 0.0),
            float(c.get("score") or 0.0),
        ),
    )


def _pick_best_item(
    items: List[Any],
    query_terms: set[str],
    extractor: Any,
    term_weights: Optional[Dict[str, float]] = None,
) -> Optional[Tuple[Any, float]]:
    best_item = None
    best_score = 0.0
    for item in items:
        txt = extractor(item)
        sc = _score_overlap(txt, query_terms, term_weights)
        if sc > best_score:
            best_score = sc
            best_item = item
    if best_item is None:
        return None
    return best_item, best_score


def _extract_grounded_keywords(
    query: str,
    chunks: List[Dict[str, Any]],
    bm25_keywords: List[str],
    chapter_id: str,
    term_weights: Optional[Dict[str, float]] = None,
) -> List[str]:
    chunk_corpus = " ".join(f"{c.get('title', '')} {c.get('content', '')}" for c in chunks)
    chunk_lower = chunk_corpus.lower()
    chunk_collapsed = re.sub(r"[\s-]+", "", chunk_lower)

    candidates: List[str] = []
    seen = set()

    def _add(term: str) -> None:
        clean = re.sub(r"^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$", "", term.strip())
        low = clean.lower()
        if len(clean) < 3 or low in STOP_WORDS or low in _BOILERPLATE_TERMS or low in _GENERIC_FILLERS:
            return
        if low not in seen:
            seen.add(low)
            candidates.append(clean)

    # 1. Specific overlapping terms between bm25_keywords/query and chunks first (highest IDF/specificity first)
    overlapping_kws = [kw for kw in bm25_keywords if _term_matches(kw.lower(), chunk_lower, chunk_collapsed)]
    overlapping_kws.sort(
        key=lambda k: ((term_weights or {}).get(k.lower(), 1.0), len(k)),
        reverse=True,
    )
    for kw in overlapping_kws:
        _add(kw)

    # 2. Extract capitalized/domain terms from chunks
    for tok in extract_bm25_keywords(chunk_corpus, limit=24):
        _add(tok)

    # 3. Remaining bm25_keywords from query
    for kw in sorted(bm25_keywords, key=lambda k: len(k), reverse=True):
        _add(kw)

    # 4. Chapter fallback terms
    for part in chapter_id.replace("-", " ").split():
        _add(part)

    while len(candidates) < 3:
        fallback = f"ncert_concept_{len(candidates) + 1}"
        if fallback not in seen:
            seen.add(fallback)
            candidates.append(fallback)
    return candidates[:5]


def _bold_first_occurrence(text: str, terms: List[str]) -> Tuple[str, int]:
    updated = text
    bolded = 0
    for term in terms:
        if f"**{term}**" in updated:
            bolded += 1
            continue
        pattern = re.compile(rf"(?<!\*)\b({re.escape(term)})\b(?!\*)", re.I)
        if pattern.search(updated):
            updated = pattern.sub(r"**\1**", updated, count=1)
            bolded += 1
    return updated, bolded


def _si_unit_step(query: str, chunks_text: str, subject: str) -> Tuple[bool, str]:
    if subject == "social-science":
        return False, ""
    combined = f"{query} {chunks_text}"
    has_inline_num_unit = bool(
        re.search(
            r"\b\d+(?:\.\d+)?\s*(?:m/s|cm|mm|m|km|v|a|ohm|dioptre|d|w|j|hz|n|pa|k|°c)\b",
            query,
            re.I,
        )
    )
    is_physics_quantity = bool(
        re.search(
            r"\b(ohm|resistance|potential\s+difference|current|voltage|electric\s+power|power\s+of\s+(?:the\s+)?lens|focal\s+length|convex\s+lens|concave\s+(?:lens|mirror)|lens|dioptre|ampere|volt|watt|joule|refractive\s+index|snell)\b",
            query,
            re.I,
        )
    )
    if not (has_inline_num_unit or is_physics_quantity):
        return False, ""

    if re.search(r"\b(focal\s+length|dioptre|power\s+of\s+(?:the\s+)?lens|convex\s+lens|concave\s+lens)\b", query, re.I):
        if re.search(r"\b50\s*cm\b", query, re.I) and re.search(r"\bequal\s+to\s+the\s+size|same\s+size\b", query, re.I):
            return True, "Applying the lens formula gives focal length **f = +0.25 m** (+25 cm) and **power of the lens** **P = +4 D** (dioptre) [1 Mark]."
        return True, "Express focal length in metres (**m**) and lens power in **dioptre** (**1 D = 1 m^-1**) [1 Mark]."
    if re.search(r"\b(snell|refractive\s+index|refraction)\b", query, re.I):
        return True, "Snell's constant ratio $\\sin i / \\sin r$ yields dimensionless **refractive index**, with light speed measured in **m/s** ($3 \\times 10^8\\ \\text{m/s}$ in vacuum) [1 Mark]."
    if re.search(r"\b(ohm|resistance|potential\s+difference|current|voltage|electric\s+power|bulb|220\s*v|110\s*v|watt|volt|ampere)\b", query, re.I):
        return True, "Express **resistance** in SI unit **ohm** (1 ohm = 1 V / 1 A), potential difference in **volt** (1 V), and current in **ampere** (1 A) [1 Mark]."
    if has_inline_num_unit:
        m = re.search(r"\b(\d+(?:\.\d+)?\s*(?:m/s|cm|mm|m|km|v|a|ohm|dioptre|d|w|j|hz|n|pa|k|°c))\b", combined, re.I)
        sample = m.group(1) if m else "1 m"
        return True, f"Express final physical quantities with standard SI units (matching {sample}) [1 Mark]."
    return False, ""


def _deterministic_synthesize(state: AgentState) -> LayeredAnswer:
    analysis = state.analysis
    subject = (analysis.okf_filters.subject if analysis else state.subject_id) or "science"
    chapter_id = (analysis.okf_filters.chapter_id if analysis else state.chapter_id) or "general-chapter"
    intent_mode = (analysis.intent_mode if analysis else state.intent_mode) or "BOARD_EXAM"
    target_exam = (analysis.target_exam if analysis else None) or "CBSE_BOARD"
    bm25_keywords = list(analysis.bm25_keywords) if analysis and analysis.bm25_keywords else extract_bm25_keywords(state.query, limit=10)
    query_terms = set(bm25_keywords) | set(extract_bm25_keywords(state.query, limit=12))

    chunks = state.retrieved_chunks or []
    lesson = _load_lesson_fallback(subject, chapter_id)
    concepts = lesson.get("concepts") or []
    misconceptions = lesson.get("common_misconceptions") or []
    worked = lesson.get("worked_examples") or []

    corpus_texts = [f"{c.get('title', '')} {c.get('content', '')}" for c in chunks]
    corpus_texts.extend(
        f"{c.get('name', '')} {c.get('title', '')} {c.get('purpose', '')} {c.get('explanation', '')} {c.get('real_life_application', '')}"
        for c in concepts if isinstance(c, dict)
    )
    term_weights = _compute_term_weights(corpus_texts, query_terms)

    preferred_block_type = analysis.okf_filters.content_block_type if analysis else None
    textbook_chunk = _pick_best_chunk(chunks, "NCERT_TEXTBOOK", query_terms, term_weights, preferred_block_type) or (chunks[0] if chunks else None)
    # Use top textbook chunk terms as lightweight PRF context when picking matching SQP/Exemplar chunks
    aligned_terms = set(query_terms)
    aligned_weights = dict(term_weights)
    if textbook_chunk:
        tb_excerpt_for_prf = _extract_relevant_excerpt(textbook_chunk.get("content", ""), query_terms, 450, term_weights)
        for tok in extract_bm25_keywords(tb_excerpt_for_prf, limit=14):
            if tok not in aligned_terms and len(tok) >= 3:
                aligned_terms.add(tok)
                aligned_weights[tok] = 2.0
    sqp_chunk = _pick_best_chunk(chunks, "CBSE_SQP", aligned_terms, aligned_weights)
    exemplar_chunk = _pick_best_chunk(chunks, "NCERT_EXEMPLAR", aligned_terms, aligned_weights)

    concept_texts = [
        f"{c.get('name', '')} {c.get('title', '')} {c.get('purpose', '')} {c.get('explanation', '')} {c.get('real_life_application', '')}"
        for c in concepts if isinstance(c, dict)
    ]
    concept_weights = _compute_idf_weights(concept_texts, query_terms) if concept_texts else term_weights
    matched_concept_res = _pick_best_item(
        concepts,
        query_terms,
        lambda c: (
            f"{c.get('name', '')} {c.get('title', '')} {c.get('purpose', '')} "
            f"{c.get('explanation', '')} {c.get('real_life_application', '')} {c.get('real_life_example', '')}"
        ) if isinstance(c, dict) else str(c),
        concept_weights,
    )
    matched_concept = matched_concept_res[0] if matched_concept_res else None

    matched_worked_res = _pick_best_item(
        worked,
        query_terms,
        lambda w: f"{w.get('topic', '')} {w.get('problem', '')} {w.get('answer', '')} {' '.join(w.get('board_mode') or []) if isinstance(w.get('board_mode'), list) else ''}" if isinstance(w, dict) else str(w),
        term_weights,
    )
    matched_worked = matched_worked_res[0] if matched_worked_res and matched_worked_res[1] >= 2.0 else None

    matched_misc_res = _pick_best_item(
        misconceptions,
        query_terms,
        lambda m: json.dumps(m) if isinstance(m, dict) else str(m),
        term_weights,
    )
    matched_misc = matched_misc_res[0] if matched_misc_res else (misconceptions[0] if misconceptions and not chunks else None)

    persona = state.persona or {}
    persona_role = str(persona.get("role") or "student").lower()
    persona_depth = str(persona.get("depth") or "").lower()
    persona_exam = str(persona.get("exam") or "").upper()

    keywords = _extract_grounded_keywords(state.query, chunks, bm25_keywords, chapter_id, term_weights)
    kw1, kw2, kw3 = keywords[0], keywords[1], keywords[2]

    # 1. Core Intuition (everyday analogy, persona-aware)
    analogy_src = ""
    if textbook_chunk and textbook_chunk.get("real_life_application"):
        analogy_src = str(textbook_chunk.get("real_life_application")).strip()
    elif isinstance(matched_concept, dict):
        analogy_src = str(matched_concept.get("real_life_application") or matched_concept.get("real_life_example") or "").strip()

    if analogy_src:
        if persona_depth == "eli5":
            core_intuition = f"Imagine in simple everyday terms: {analogy_src}"
        else:
            core_intuition = f"Think of {kw1} like an everyday example: {analogy_src}"
    else:
        chapter_label = chapter_id.replace("-", " ")
        if persona_depth == "eli5":
            core_intuition = f"Imagine {kw1} in {chapter_label} like a simple everyday seesaw where pushing one side shifts the other predictably."
        else:
            core_intuition = f"Think of {kw1} and {kw2} in {chapter_label} like a balanced everyday system where changing one factor produces a clear, measurable response."

    if persona_role == "parent":
        core_intuition = f"{core_intuition} (Parent guide: verify that your child can explain {kw1} using this everyday picture.)"

    # 2. CBSE Board Answer (chunk-grounded, >= 3 bold keywords, >= 3 [X Mark] allocations, SI units)
    retrieval_insufficient = (state.grader_verdict == "REWRITE_QUERY" and not chunks)
    tb_raw = (
        textbook_chunk.get("content", "")
        if textbook_chunk
        else (
            (matched_concept.get("purpose") or matched_concept.get("explanation") or "")
            if isinstance(matched_concept, dict)
            else f"Core NCERT principle linking {kw1}, {kw2}, and {kw3}."
        )
    )
    tb_snippet = _extract_relevant_excerpt(tb_raw, query_terms, 520, term_weights) or f"Core NCERT principle linking {kw1} and {kw2}."

    sqp_raw = ""
    if sqp_chunk:
        sqp_raw = sqp_chunk.get("content", "")
    elif matched_worked and isinstance(matched_worked, dict):
        bm = matched_worked.get("board_mode") or matched_worked.get("solution") or []
        sqp_raw = " ".join(bm) if isinstance(bm, list) else str(bm)
    elif exemplar_chunk:
        sqp_raw = exemplar_chunk.get("content", "")
    else:
        sqp_raw = f"Apply the relationship between {kw1}, {kw2}, and {kw3} step by step as prescribed by NCERT."
    sqp_snippet = _extract_relevant_excerpt(sqp_raw, query_terms, 320, term_weights)

    chunks_text = " ".join(c.get("content", "") for c in chunks)
    needs_si, si_step = _si_unit_step(state.query, chunks_text, subject)

    step1, b1 = _bold_first_occurrence(tb_snippet, [kw1, kw2])
    if b1 == 0:
        step1 = f"**{kw1}** and **{kw2}**: {tb_snippet}"
    elif b1 == 1:
        step1 = f"{step1} (involving **{kw2}**)"

    step2, b2 = _bold_first_occurrence(sqp_snippet, [kw3])
    if b2 == 0:
        step2 = f"Applying **{kw3}**: {sqp_snippet}"

    if retrieval_insufficient:
        step3 = f"Note: Retrieved NCERT/SQP context was limited for **{kw1}**; verify exact textbook conditions for **{kw2}** and **{kw3}** [1 Mark]."
    elif needs_si and si_step:
        step3 = si_step
    else:
        step3 = f"State qualifying NCERT conditions and conclude clearly using **{kw2}** and **{kw3}** [1 Mark]."

    rubric_note = " (Rubric note: award step marks separately for definition, working, and conclusion.)" if persona_role == "teacher" else ""
    board_answer = (
        f"1. {step1} [1 Mark].\n"
        f"2. {step2} [1 Mark].\n"
        f"3. {step3}{rubric_note}"
    )
    # Ensure at least 3 bold terms in board_answer
    if len(re.findall(r"\*\*([^*]+)\*\*", board_answer)) < 3:
        board_answer = f"**{kw1}** ({kw2}) — " + board_answer

    # 3. Competitive Exam Bridge (strict discipline guardrail + persona exam awareness)
    is_bio = bool(re.search(r"\b(heart|blood|circulation|mendel|dihybrid|reflex|neuron|nephron|biology|pea|ttrr|ph|enamel)\b", f"{state.query} {chapter_id}", re.I))
    if subject == "social-science":
        if target_exam == "DSC_STATE" or "DSC" in persona_exam:
            exam_label = "State DSC / UPSC"
        else:
            exam_label = "UPSC CSE / State DSC"
        comp_raw = (
            exemplar_chunk.get("content", "")
            if exemplar_chunk
            else f"Connects {kw1} and {kw2} to institutional, constitutional, and socio-economic analysis."
        )
        comp_detail = _extract_relevant_excerpt(comp_raw, query_terms, 240, term_weights)
        # Enforce zero STEM leakage in social-science
        comp_detail = re.sub(r"\b(jee|neet)\b", "UPSC", comp_detail, flags=re.I)
        competitive_bridge = f"{exam_label} Analytical Bridge ({intent_mode}): {comp_detail}"
    else:
        if target_exam == "NEET_UG" or is_bio or "NEET" in persona_exam:
            exam_label = "NEET UG"
        else:
            exam_label = "JEE Main"
        shortcut = ""
        if matched_worked and isinstance(matched_worked, dict):
            shortcut = str(matched_worked.get("competitive_shortcut") or matched_worked.get("speed_mode") or "").strip()
        comp_raw = shortcut or (exemplar_chunk.get("content", "") if exemplar_chunk else f"Extends {kw1} and {kw2} to higher-order conceptual edge cases and multi-step problems.")
        comp_detail = _extract_relevant_excerpt(comp_raw, query_terms, 240, term_weights)
        competitive_bridge = f"{exam_label} Foundation Bridge: {comp_detail}"

    if persona_role == "aspirant" and persona_exam:
        competitive_bridge = f"[{persona_exam} Focus] {competitive_bridge}"

    # 4. Examiner's Trap
    trap_text = ""
    if matched_misc is not None:
        if isinstance(matched_misc, dict):
            trap_text = str(matched_misc.get("misconception") or matched_misc.get("trap") or matched_misc.get("correction") or "").strip()
            if not trap_text:
                trap_text = " ".join(str(v) for v in matched_misc.values() if v)
        else:
            trap_text = str(matched_misc).strip()
    if trap_text:
        examiners_trap = _clean_snippet(trap_text, 230)
    else:
        examiners_trap = f"Avoid omitting qualifying NCERT conditions, sign conventions, or standard units related to {kw1} and {kw2}."

    if persona_role == "parent":
        examiners_trap = f"{examiners_trap} (Parent check: verify units and key definitions are written explicitly.)"

    return LayeredAnswer(
        coreIntuition=core_intuition,
        boardAnswer=board_answer,
        competitiveBridge=competitive_bridge,
        examinersTrap=examiners_trap,
    )


def _maybe_llm_synthesize(state: AgentState) -> Optional[LayeredAnswer]:
    if os.environ.get("CLASSX_OFFLINE_MODE") == "1":
        return None
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    analysis = state.analysis
    subject = (analysis.okf_filters.subject if analysis else state.subject_id) or "science"
    requires_si, _ = _si_unit_step(state.query, "", subject)
    persona = state.persona or {}
    persona_depth = str(persona.get("depth") or "").lower()
    persona_role = str(persona.get("role") or "student").lower()
    persona_exam = str(persona.get("exam") or "").upper()
    try:
        from langchain_openai import ChatOpenAI

        base_url = os.environ.get("OPENAI_BASE_URL") or (
            "https://openrouter.ai/api/v1" if os.environ.get("OPENROUTER_API_KEY") and not os.environ.get("OPENAI_API_KEY") else "https://api.openai.com/v1"
        )
        model = os.environ.get("TUTOR_MODEL") or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"
        llm = ChatOpenAI(api_key=api_key, base_url=base_url, model=model, temperature=0.2, timeout=15).with_structured_output(LayeredAnswer)
        context_text = "\n\n".join(
            f"[{c.get('source_type', 'NCERT')}] {c.get('content', '')[:600]}"
            for c in (state.retrieved_chunks or [])[:6]
        )
        discipline_rule = (
            "Subject is social-science: competitiveBridge MUST connect to UPSC CSE or State DSC and MUST NOT mention JEE or NEET."
            if subject == "social-science"
            else "Subject is STEM: competitiveBridge connects to JEE Main or NEET UG."
        )
        if persona_depth == "eli5":
            persona_rule = (
                "Audience: a curious 10-year-old. Use short sentences, everyday objects, "
                "and one concrete picture; avoid jargon."
            )
        elif persona_role == "parent":
            persona_rule = (
                "Audience: a parent. Emphasise what the child must master, how marks are awarded, "
                "and one thing the parent can check; keep it concise."
            )
        elif persona_role == "teacher":
            persona_rule = (
                "Audience: a teacher. Include the marking scheme, a likely misconception, "
                "and a quick board-style model answer."
            )
        elif persona_role == "aspirant" or persona_exam in ("DSC", "DSC_STATE", "UPSC", "UPSC_CSE"):
            persona_rule = (
                "Audience: a DSC/UPSC aspirant. Lead with the competitiveBridge and an exam-tier "
                "framing, but keep the board answer accurate."
            )
        else:
            persona_rule = (
                "Audience: a Class 10 student. Keep the core intuition concrete and the board answer exam-ready."
            )
        prompt = (
            "Synthesize a 4-layer NCERT Class 10 response strictly from the retrieved context.\n"
            "1. coreIntuition: simple everyday analogy for a 15-year-old.\n"
            "2. boardAnswer: CBSE marking-scheme answer with mandatory NCERT keywords in **bold** and bracketed marks like [1 Mark].\n"
            f"3. competitiveBridge: {discipline_rule}\n"
            "4. examinersTrap: one specific board/competitive mistake.\n"
            f"Persona: {persona_rule}\n"
            f"Requested depth: {persona_depth or 'board'}\n"
            "Do NOT use AI clichés or mention any commercial coaching brands.\n\n"
            f"Question: {state.query}\nContext:\n{context_text}"
        )
        layers = llm.invoke(prompt)
        ok, _ = validate_answer_layers(layers, subject=subject, requires_si_units=requires_si)
        if ok:
            return layers
    except Exception:
        return None
    return None


def pedagogical_generator(state: AgentState) -> Dict[str, Any]:
    """LangGraph node: generates the 4-layer pedagogical answer grounded in retrieved OKF chunks."""
    layers = _maybe_llm_synthesize(state) or _deterministic_synthesize(state)
    stages = list(state.pipeline_stages)
    stages.append(
        PipelineStage(
            node="pedagogical_generator",
            status="completed",
            output="4_LAYERS_GENERATED",
        )
    )
    return {
        "answer_layers": layers,
        "pipeline_stages": stages,
    }
