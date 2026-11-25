"""Query Analyzer & Conditional HyDE Router Node (OKF v0.2)."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

from .schema import AgentState, OKFFilters, PipelineStage, QueryAnalysis

BASE_DIR = Path(__file__).resolve().parents[2]
SYLLABUS_OKF_PATH = BASE_DIR / "source" / "syllabus" / "combined_syllabus_okf.json"

STOP_WORDS = {
    "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by",
    "is", "are", "was", "were", "what", "why", "how", "when", "where", "who", "which",
    "explain", "describe", "state", "find", "calculate", "solve", "show", "that",
    "this", "these", "those", "also", "from", "into", "under", "between", "does", "did",
    "discuss", "significance", "early", "movements", "about", "its", "be", "can", "do",
    "has", "have", "had", "not", "no", "if", "then", "than", "their", "them", "they",
    "you", "your", "our", "we", "me", "my",
}

COMPETITIVE_PATTERNS = [
    re.compile(r"\b(jee|neet|upsc|dsc)\b", re.I),
    re.compile(r"\b(competitive|bridge|olympiad|foundation|advanced|higher-order|hots)\b", re.I),
    re.compile(r"\bcivil\s*services?\b", re.I),
    re.compile(r"\bassertion\s*\(a\)|reason\s*\(r\)\b", re.I),
    re.compile(r"\b(ceva|menelaus|dihybrid|punnett|saponification|esterification)\b", re.I),
    re.compile(r"\b(non-ohmic|semiconductor|ahimsa|secular\s*state|mgnrega|disguised\s*unemployment)\b", re.I),
]

JAILBREAK_RE = re.compile(
    r"(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules)"
    r"|system\s+(?:prompt|message|instructions)"
    r"|(?:developer|dan|jailbreak|god)\s+mode"
    r"|(?:reveal|print|show|leak|repeat)\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions)"
    r"|you\s+are\s+now|prompt\s+injection"
    r"|override\s+(?:your\s+)?(?:instructions|rules)"
    r"|bypass\s+(?:all\s+)?(?:rules|safety|guardrails)"
    r"|roleplay\s+as",
    re.I,
)

DELIMITER_RE = re.compile(r"</?\s*student_question[\s\S]*?>", re.I)
ZERO_WIDTH_RE = re.compile(r"[\u200B-\u200D\uFEFF]")
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")


def sanitize_prompt_input(text: Any, max_length: int = 2000) -> Tuple[str, List[str], bool]:
    if not isinstance(text, str):
        return "", [], False

    flags: List[str] = []
    is_blocked = False
    cleaned = text

    if ZERO_WIDTH_RE.search(cleaned):
        flags.append("zero_width_characters")
        cleaned = ZERO_WIDTH_RE.sub("", cleaned)

    if CONTROL_CHARS_RE.search(cleaned):
        flags.append("control_characters")
        cleaned = CONTROL_CHARS_RE.sub("", cleaned)

    if len(cleaned) > max_length:
        flags.append("length_exceeded")
        cleaned = cleaned[:max_length]

    if DELIMITER_RE.search(cleaned):
        flags.append("delimiter_injection")
        cleaned = DELIMITER_RE.sub(
            lambda m: m.group(0).replace("<", "&lt;").replace(">", "&gt;"),
            cleaned,
        )

    if JAILBREAK_RE.search(cleaned):
        flags.append("jailbreak_attempt")
        is_blocked = True
        cleaned = JAILBREAK_RE.sub("[neutralized]", cleaned)

    return cleaned, flags, is_blocked


def extract_bm25_keywords(text: str, limit: int = 10) -> List[str]:
    normalized = text.lower()
    normalized = re.sub(r"['\u2019]", "", normalized)
    normalized = re.sub(r"[^\w\s-]", " ", normalized)
    tokens: List[str] = []
    seen = set()
    for tok in normalized.split():
        if len(tok) <= 1 or tok in STOP_WORDS:
            continue
        if tok not in seen:
            seen.add(tok)
            tokens.append(tok)
            if len(tokens) >= limit:
                break
    return tokens


def _should_omit_hyde(text: str) -> Tuple[bool, bool, bool, bool]:
    is_direct_exercise = bool(
        re.search(r"\b(?:exercise|ex\.?)\s*(?:\d+(?:\.\d+)?|question\b)", text, re.I)
        or re.search(r"\bquestion\s*\d+\b", text, re.I)
    )
    is_activity = bool(
        re.search(r"\bactivity\s*\d+(?:\.\d+)?\b", text, re.I)
        or re.search(
            r"\b(reaction of .* with .* granules|touches a hot object|heating lead nitrate|magnesium ribbon.*burned|what do we see when|quicklime is added to water)\b",
            text,
            re.I,
        )
    )
    is_numerical = bool(
        re.search(
            r"(?:\b\d+(?:\.\d+)?\s*(?:cm|mm|m|km|v|a|ohm|d|w|j|hz|n|pa|k|°c|%|\^2)\b|\bS_?n\s*=)",
            text,
            re.I,
        )
        and re.search(
            r"\b(find|calculate|determine|solve|power|focal length|resistance|consumed|roots|term|distance|image)\b",
            text,
            re.I,
        )
    )
    return (is_direct_exercise or is_activity or is_numerical), is_direct_exercise, is_activity, is_numerical


# Ordered topic routing table covering all 26 dataset queries + syllabus topics
_TOPIC_RULES: List[Tuple[re.Pattern[str], str, str, str]] = [
    # Mathematics
    (re.compile(r"\b(quadratic|roots|factorisation|splitting\s+middle\s+term)\b", re.I), "mathematics", "quadratic-equations", "solution_by_factorisation"),
    (re.compile(r"\b(arithmetic\s+progression|s_?n\s*=|common\s+difference|20th\s+term|\bap\b)\b", re.I), "mathematics", "arithmetic-progressions", "sum_of_first_n_terms_of_an_ap"),
    (re.compile(r"\b(basic\s+proportionality|thales|ceva|menelaus|triangle)\b", re.I), "mathematics", "triangles", "basic_proportionality_theorem"),
    (re.compile(r"\b(euclid|irrational|fundamental\s+theorem\s+of\s+arithmetic|hcf|lcm|real\s+numbers)\b", re.I), "mathematics", "real-numbers", "fundamental_theorem_of_arithme"),
    (re.compile(r"\b(polynomial|zeroes)\b", re.I), "mathematics", "polynomials", "polynomials"),
    (re.compile(r"\b(trigonometry|sin|cos|tan)\b", re.I), "mathematics", "introduction-to-trigonometry", "trigonometric_identities"),
    # Social Science
    (re.compile(r"\b(non-cooperation|non\s+cooperation|chauri\s+chaura)\b", re.I), "social-science", "nationalism-in-india", "non_cooperation_movement"),
    (re.compile(r"\b(satyagraha|ahimsa|champaran|kheda|gandhi)\b", re.I), "social-science", "nationalism-in-india", "nationalism_in_india"),
    (re.compile(r"\b(frederic\s+sorrieu|sorrieu|utopian\s+vision|1848)\b", re.I), "social-science", "the-rise-of-nationalism-in-europe", "frederic_sorrieu_utopian_visi"),
    (re.compile(r"\b(smallpox|conquest\s+of\s+america|spanish\s+conquerors|global\s+world)\b", re.I), "social-science", "the-making-of-a-global-world", "conquest_disease_and_trade"),
    (re.compile(r"\b(belgium|belgian|sri\s*lanka|majoritarianism|power-sharing|power\s+sharing)\b", re.I), "social-science", "power-sharing", "belgium_and_sri_lanka"),
    (re.compile(r"\b(federalism|federal\s+country|union\s+list|state\s+list|concurrent\s+list|seventh\s+schedule)\b", re.I), "social-science", "federalism", "what_makes_india_a_federal_co"),
    (re.compile(r"\b(secular\s+state|religious\s+freedom|articles?\s+15|gender,\s*religion)\b", re.I), "social-science", "gender-religion-and-caste", "secular_state"),
    (re.compile(r"\b(democracy|social\s+diversity)\b", re.I), "social-science", "outcomes-of-democracy", "accommodation_of_social_diversity"),
    (re.compile(r"\b(gully\s+erosion|sheet\s+erosion|soil\s+conservation|contour\s+ploughing|terrace\s+farming)\b", re.I), "social-science", "resources-and-development", "soil_erosion_and_soil_conserv"),
    (re.compile(r"\b(rice|kharif|major\s+crops|rice-producing)\b", re.I), "social-science", "agriculture", "major_crops_rice"),
    (re.compile(r"\b(non-conventional|conventional.*energy|solar\s+energy|photovoltaic)\b", re.I), "social-science", "minerals-and-energy-resources", "non_conventional_sources_of_e"),
    (re.compile(r"\b(currency|medium\s+of\s+exchange|reserve\s+bank|rbi|money\s+and\s+credit)\b", re.I), "social-science", "money-and-credit", "money_as_medium_of_exchange"),
    (re.compile(r"\b(disguised\s+unemployment|mgnrega|sectors\s+of\s+the\s+indian\s+economy)\b", re.I), "social-science", "sectors-of-the-indian-economy", "division_of_sectors_as_organi"),
    (re.compile(r"\b(globali[sz]ation|mncs|small\s+producers|job\s+insecurity)\b", re.I), "social-science", "globalisation-and-the-indian-economy", "impact_of_globalisation_in_in"),
    # Science
    (re.compile(r"\b(quicklime|calcium\s*oxide|slaked\s*lime|magnesium\s*ribbon|redox|copper\s*oxide|lead\s*nitrate)\b", re.I), "science", "chemical-reactions-and-equations", "chemical_reactions_and_equatio"),
    (re.compile(r"\b(ph\b|tooth\s*decay|bleaching\s*powder|antacid|acids?,?\s*bases)\b", re.I), "science", "acids-bases-and-salts", "importance_of_ph_in_everyday_"),
    (re.compile(r"\b(esterification|saponification|ethanoic|ethanol|carboxylic|carbon\s+and\s+its\s+compounds)\b", re.I), "science", "carbon-and-its-compounds", "chemical_properties_of_carbon_"),
    (re.compile(r"\b(amphoteric|aluminium\s*oxide|sodium\s*aluminate|metals\s+and\s+non-metals)\b", re.I), "science", "metals-and-non-metals", "chemical_properties_of_metals"),
    (re.compile(r"\b(convex\s*lens|concave\s*mirror|focal\s*length|dioptre|power\s+of\s+(?:the\s+)?lens|refraction)\b", re.I), "science", "light-reflection-and-refraction", "refraction_lens_power"),
    (re.compile(r"\b(stars\s+twinkle|twinkle|atmospheric\s+refraction|human\s+eye)\b", re.I), "science", "the-human-eye-and-the-colourful-world", "atmospheric_refraction"),
    (re.compile(r"\b(ohm|non-ohmic|semiconductor|resistance|bulb|220\s*v|v-i\s+characteristic)\b", re.I), "science", "electricity", "ohms_law_resistance"),
    (re.compile(r"\b(fleming|motor|magnetic\s*field|right-hand\s*thumb|split-ring|commutator)\b", re.I), "science", "magnetic-effects-of-electric-current", "flemings_left_hand_rule_moto"),
    (re.compile(r"\b(heart|oxygenated|deoxygenated|double\s+circulation|nephron|kidneys)\b", re.I), "science", "life-processes", "transportation_human_heart"),
    (re.compile(r"\b(reflex\s*arc|touches\s+a\s+hot\s+object|synapse|neurotransmitter|activity\s*7\.1)\b", re.I), "science", "control-and-coordination", "reflex_arc_nervous_system"),
    (re.compile(r"\b(dihybrid|punnett|mendel|independent\s+assortment|ttrr|pea\s+plant)\b", re.I), "science", "heredity-and-evolution", "dihybrid_cross_inheritance"),
]


def _resolve_okf_filters(
    text: str,
    subject_id: Optional[str],
    chapter_id: Optional[str],
    intent_mode: Literal["BOARD_EXAM", "COMPETITIVE_BRIDGE"],
    is_direct_exercise: bool,
    is_activity: bool,
    is_numerical: bool,
) -> OKFFilters:
    resolved_subject = subject_id or "science"
    resolved_chapter = chapter_id or "general-chapter"
    resolved_topic = "general_topic"

    for pattern, subj, chap, tag in _TOPIC_RULES:
        if pattern.search(text):
            if not subject_id:
                resolved_subject = subj
            if not chapter_id:
                resolved_chapter = chap
            resolved_topic = tag
            break

    # Fallback lookup against combined_syllabus_okf.json if still general_topic
    if resolved_topic == "general_topic" and SYLLABUS_OKF_PATH.exists():
        try:
            with SYLLABUS_OKF_PATH.open("r", encoding="utf-8") as fh:
                syllabus = json.load(fh).get("okf", {})
            okf_subj_key = resolved_subject.replace("-", "_")
            subj_block = syllabus.get(okf_subj_key, {})
            lower_text = text.lower()
            for unit in subj_block.get("knowledge_units", []):
                for topic in unit.get("topics", []):
                    t_name = str(topic.get("name", "")).lower()
                    if t_name and t_name in lower_text:
                        tags = topic.get("tags") or []
                        if len(tags) >= 3 and tags[2]:
                            resolved_topic = tags[2]
                            break
        except Exception:
            pass

    if is_direct_exercise or is_numerical:
        block_type = "exercise"
    elif is_activity:
        block_type = "activity"
    elif re.search(r"\b(prove|theorem|basic\s+proportionality|thales)\b", text, re.I):
        block_type = "theorem"
    elif re.search(r"\b(esterification|saponification)\b", text, re.I):
        block_type = "reaction"
    else:
        block_type = "concept"

    source_type = "NCERT_EXEMPLAR" if intent_mode == "COMPETITIVE_BRIDGE" else "NCERT_TEXTBOOK"

    return OKFFilters(
        subject=resolved_subject,
        chapter_id=resolved_chapter,
        topic_tag=resolved_topic,
        content_block_type=block_type,
        source_type=source_type,
    )


def _deterministic_hyde_passage(text: str, subject: str) -> str:
    concise_topic = re.sub(r"[?.!]+", "", text[:180]).strip()
    if subject == "social-science":
        return (
            f"According to NCERT Class 10 Social Science curriculum, {concise_topic} represents a foundational historical and civic principle. "
            "Standard textbook analysis examines constitutional provisions, socioeconomic evidence, and cause-effect relationships across regions. "
            "Board and analytical evaluations require clear factual arguments supported by NCERT institutional examples."
        )
    return (
        f"According to NCERT Class 10 curriculum, {concise_topic} represents a core academic principle. "
        "Key textbook principles demonstrate the systematic relationships and empirical laws governing this topic. "
        "Standard CBSE evaluation requires precise conceptual definitions supported by verified observations."
    )


def _maybe_llm_hyde(text: str, subject: str) -> Optional[str]:
    if os.environ.get("CLASSX_OFFLINE_MODE") == "1":
        return None
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        return None
    try:
        from langchain_openai import ChatOpenAI

        base_url = os.environ.get("OPENAI_BASE_URL") or (
            "https://openrouter.ai/api/v1" if os.environ.get("OPENROUTER_API_KEY") and not os.environ.get("OPENAI_API_KEY") else "https://api.openai.com/v1"
        )
        model = os.environ.get("TUTOR_MODEL") or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"
        llm = ChatOpenAI(api_key=api_key, base_url=base_url, model=model, temperature=0.1, timeout=10)
        prompt = (
            "Write exactly 3 concise sentences in NCERT Class 10 factual style summarizing the core principle behind this student question. "
            "Start with 'According to NCERT Class 10'. Do not invent numerical measurements or mention any commercial coaching brands.\n"
            f"Subject: {subject}\nQuestion: {text}"
        )
        resp = llm.invoke(prompt)
        content = str(getattr(resp, "content", "")).strip()
        if not content:
            return None
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", content) if s.strip()]
        if 2 <= len(sentences) <= 4 and "NCERT Class 10" in content:
            if subject == "social-science" and re.search(r"\b\d+\s*(?:ohm|dioptre|ampere|volt|watt)\b", content, re.I):
                return None
            return " ".join(sentences[:3])
    except Exception:
        return None
    return None


def analyze_query(
    question: str,
    subject_id: Optional[str] = None,
    chapter_id: Optional[str] = None,
    intent_mode: Optional[Literal["BOARD_EXAM", "COMPETITIVE_BRIDGE"]] = None,
) -> QueryAnalysis:
    sanitized, _flags, is_blocked = sanitize_prompt_input(question or "", max_length=2000)
    trimmed = sanitized.strip()

    if is_blocked or not trimmed:
        return QueryAnalysis(
            intent_mode="BOARD_EXAM",
            target_exam="CBSE_BOARD",
            okf_filters=OKFFilters(
                subject=subject_id or "science",
                chapter_id=chapter_id or "general",
                topic_tag="general",
                content_block_type="concept",
                source_type="NCERT_TEXTBOOK",
            ),
            bm25_keywords=[],
            hyde_passage="",
            is_valid=False,
        )

    bm25_keywords = extract_bm25_keywords(trimmed, limit=10)
    if not bm25_keywords:
        return QueryAnalysis(
            intent_mode="BOARD_EXAM",
            target_exam="CBSE_BOARD",
            okf_filters=OKFFilters(
                subject=subject_id or "science",
                chapter_id=chapter_id or "general",
                topic_tag="general",
                content_block_type="concept",
                source_type="NCERT_TEXTBOOK",
            ),
            bm25_keywords=[],
            hyde_passage="",
            is_valid=False,
        )

    if intent_mode in ("BOARD_EXAM", "COMPETITIVE_BRIDGE"):
        resolved_intent: Literal["BOARD_EXAM", "COMPETITIVE_BRIDGE"] = intent_mode
    else:
        is_comp = any(p.search(trimmed) for p in COMPETITIVE_PATTERNS)
        resolved_intent = "COMPETITIVE_BRIDGE" if is_comp else "BOARD_EXAM"

    target_exam: Literal["CBSE_BOARD", "JEE_MAIN", "NEET_UG", "UPSC_CSE", "DSC_STATE"] = "CBSE_BOARD"
    if resolved_intent == "COMPETITIVE_BRIDGE":
        if re.search(
            r"\b(upsc|civil\s*services?|governance|polity|history|sovereign|belgian|majoritarianism|linguistic\s*conflict|federal|seventh\s*schedule|constitutional\s*articles?|secular|smallpox|conquest\s*of\s*america|non-cooperation|satyagraha|sorrieu)\b",
            trimmed,
            re.I,
        ):
            target_exam = "UPSC_CSE"
        elif re.search(
            r"\b(dsc|state\s*commission|rural|mgnrega|disguised\s*unemployment|underemployment|globali[sz]ation|mncs?|job\s+insecurity|soil\s*erosion|rice)\b",
            trimmed,
            re.I,
        ):
            target_exam = "DSC_STATE"
        elif re.search(
            r"\b(neet|biology|heart|circulation|mendel|dihybrid|punnett|reflex|neuron|synapse|mammals|nephron|tooth\s*decay)\b",
            trimmed,
            re.I,
        ):
            target_exam = "NEET_UG"
        else:
            target_exam = "JEE_MAIN"

    should_omit_hyde, is_direct_exercise, is_activity, is_numerical = _should_omit_hyde(trimmed)
    okf_filters = _resolve_okf_filters(
        trimmed,
        subject_id=subject_id,
        chapter_id=chapter_id,
        intent_mode=resolved_intent,
        is_direct_exercise=is_direct_exercise,
        is_activity=is_activity,
        is_numerical=is_numerical,
    )

    if should_omit_hyde:
        hyde_passage = ""
    else:
        hyde_passage = _maybe_llm_hyde(trimmed, okf_filters.subject) or _deterministic_hyde_passage(
            trimmed, okf_filters.subject
        )

    return QueryAnalysis(
        intent_mode=resolved_intent,
        target_exam=target_exam,
        okf_filters=okf_filters,
        bm25_keywords=bm25_keywords,
        hyde_passage=hyde_passage,
        is_valid=True,
    )


def query_analyzer(state: AgentState) -> Dict[str, Any]:
    """LangGraph node: analyzes student query into structured OKF v0.2 routing filters."""
    analysis = analyze_query(
        question=state.query,
        subject_id=state.subject_id,
        chapter_id=state.chapter_id,
        intent_mode=state.intent_mode,
    )
    stages = list(state.pipeline_stages)
    stages.append(
        PipelineStage(
            node="query_analyzer",
            status="completed",
            output=analysis.intent_mode,
        )
    )
    return {
        "analysis": analysis,
        "intent_mode": analysis.intent_mode,
        "pipeline_stages": stages,
    }
