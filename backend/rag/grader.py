"""Local OKF v0.2 Retriever, Retrieval Grader & Source Balancer, and Query Rewriter Nodes."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .analyzer import extract_bm25_keywords
from .schema import AgentState, GraderResult, OKFFilters, PipelineStage

BASE_DIR = Path(__file__).resolve().parents[2]
LESSONS_DIR = BASE_DIR / "server" / "data" / "lessons"
TEXTBOOKS_DIR = BASE_DIR / "server" / "data" / "okf-textbooks" / "books"

CHAPTER_ALIASES: Dict[str, str] = {
    "the-human-eye-and-the-colourful-world": "human-eye-and-colourful-world",
}

_CHAPTER_CACHE: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}


def resolve_chapter_slug(chapter_id: str) -> str:
    slug = (chapter_id or "").strip().lower()
    return CHAPTER_ALIASES.get(slug, slug)


def _flatten_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return " ".join(_flatten_text(v) for v in value)
    if isinstance(value, dict):
        return " ".join(_flatten_text(v) for v in value.values())
    return str(value)


def _load_chapter_chunks(subject_id: str, chapter_id: str) -> List[Dict[str, Any]]:
    resolved_chapter = resolve_chapter_slug(chapter_id)
    cache_key = (subject_id, resolved_chapter)
    if cache_key in _CHAPTER_CACHE:
        return _CHAPTER_CACHE[cache_key]

    chunks: List[Dict[str, Any]] = []

    # 1. OKF v0.2 Textbook Markdown Pages -> NCERT_TEXTBOOK
    tb_path = TEXTBOOKS_DIR / subject_id / f"{resolved_chapter}.md"
    if tb_path.exists():
        raw = tb_path.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n")
        if raw.startswith("---"):
            end_idx = raw.find("\n---", 3)
            if end_idx != -1:
                raw = raw[end_idx + 4 :]
        pages = re.split(r"(?m)^## Page (\d+).*$", raw)
        # pages[0] is preamble; then pairs (page_num, body)
        for idx in range(1, len(pages), 2):
            page_num = pages[idx]
            body = pages[idx + 1] if idx + 1 < len(pages) else ""
            cleaned = re.sub(r"\n{3,}", "\n\n", body).strip()
            if len(cleaned) < 40:
                continue
            page_int = int(page_num) if page_num.isdigit() else None
            # Split long pages along major ### subheadings or NCERT Q U E S T I O N S / E X E R C I S E S blocks
            split_pattern = r"(?m)(?=^###\s+(?!Figure\b))|(?=\bQ\s+U\s+E\s+S\s+T\s+I\s+O\s+N\s+S\b|\bE\s+X\s+E\s+R\s+C\s+I\s+S\s+E\s+S\b)"
            if len(cleaned) > 900 and re.search(split_pattern, cleaned, re.I):
                parts = re.split(split_pattern, cleaned, flags=re.I)
                merged_sections: List[str] = []
                pending = ""
                for part in parts:
                    part_s = part.strip()
                    if not part_s:
                        continue
                    combined_part = f"{pending}\n\n{part_s}".strip() if pending else part_s
                    if len(combined_part) < 160:
                        pending = combined_part
                        continue
                    merged_sections.append(combined_part)
                    pending = ""
                if pending:
                    if merged_sections:
                        merged_sections[-1] = f"{merged_sections[-1]}\n\n{pending}".strip()
                    else:
                        merged_sections.append(pending)

                for sub_idx, sec_text in enumerate(merged_sections):
                    if len(sec_text) < 40:
                        continue
                    first_line = sec_text.splitlines()[0].lstrip("#").strip()[:80]
                    is_exercise_block = bool(
                        re.match(r"^(?:Q\s+U\s+E\s+S\s+T\s+I\s+O\s+N\s+S|E\s+X\s+E\s+R\s+C\s+I\s+S\s+E\s+S)\b", sec_text, re.I)
                    )
                    block_type = (
                        "exercise"
                        if is_exercise_block
                        else ("activity" if re.search(r"\bactivity\s+\d", sec_text, re.I) else "concept")
                    )
                    chunks.append(
                        {
                            "id": f"{subject_id}:{resolved_chapter}:textbook:p{page_num}_s{sub_idx}",
                            "source_type": "NCERT_TEXTBOOK",
                            "content_block_type": block_type,
                            "subject": subject_id,
                            "chapter_id": chapter_id,
                            "title": f"{resolved_chapter} p{page_num}: {first_line}",
                            "content": sec_text[:1600],
                            "page": page_int,
                        }
                    )
            else:
                is_exercise_block = bool(
                    re.match(r"^(?:[\w\s]+\d+\s+)?(?:Q\s+U\s+E\s+S\s+T\s+I\s+O\s+N\s+S|E\s+X\s+E\s+R\s+C\s+I\s+S\s+E\s+S)\b", cleaned, re.I)
                    or re.search(r"\bE\s+X\s+E\s+R\s+C\s+I\s+S\s+E\s+S\s+1\.", cleaned, re.I)
                )
                block_type = (
                    "exercise"
                    if is_exercise_block
                    else ("activity" if re.search(r"\bactivity\s+\d", cleaned, re.I) else "concept")
                )
                chunks.append(
                    {
                        "id": f"{subject_id}:{resolved_chapter}:textbook:p{page_num}",
                        "source_type": "NCERT_TEXTBOOK",
                        "content_block_type": block_type,
                        "subject": subject_id,
                        "chapter_id": chapter_id,
                        "title": f"{resolved_chapter} page {page_num}",
                        "content": cleaned[:1600],
                        "page": page_int,
                    }
                )

    # 2. Authored Lesson JSONs -> NCERT_TEXTBOOK, CBSE_SQP, NCERT_EXEMPLAR
    lesson_path = LESSONS_DIR / subject_id / f"{resolved_chapter}.json"
    if lesson_path.exists():
        try:
            lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
        except Exception:
            lesson = {}

        for i, concept in enumerate(lesson.get("concepts", []) or []):
            name = concept.get("name") or concept.get("title") or f"Concept {i + 1}"
            text = _flatten_text(
                [
                    name,
                    concept.get("purpose") or concept.get("explanation"),
                    concept.get("real_life_application") or concept.get("real_life_example"),
                    concept.get("day_to_day_usage") or concept.get("key_points"),
                ]
            )
            chunks.append(
                {
                    "id": f"{subject_id}:{resolved_chapter}:concept:{i}",
                    "source_type": "NCERT_TEXTBOOK",
                    "content_block_type": "concept",
                    "subject": subject_id,
                    "chapter_id": chapter_id,
                    "title": str(name),
                    "content": text[:1600],
                    "real_life_application": concept.get("real_life_application") or concept.get("real_life_example") or "",
                }
            )

        for i, theorem in enumerate(lesson.get("theorems", []) or []):
            name = theorem.get("name") or f"Theorem {i + 1}"
            text = _flatten_text([name, theorem.get("statement"), theorem.get("examples"), theorem.get("real_world_utility")])
            chunks.append(
                {
                    "id": f"{subject_id}:{resolved_chapter}:theorem:{i}",
                    "source_type": "NCERT_TEXTBOOK",
                    "content_block_type": "theorem",
                    "subject": subject_id,
                    "chapter_id": chapter_id,
                    "title": str(name),
                    "content": text[:1600],
                }
            )

        for i, ex in enumerate(lesson.get("worked_examples", []) or []):
            topic = ex.get("topic") or ex.get("title") or f"Worked Example {i + 1}"
            board_text = _flatten_text([topic, ex.get("problem"), ex.get("board_mode") or ex.get("solution"), ex.get("answer")])
            chunks.append(
                {
                    "id": f"{subject_id}:{resolved_chapter}:sqp:{i}",
                    "source_type": "CBSE_SQP",
                    "content_block_type": "exercise",
                    "subject": subject_id,
                    "chapter_id": chapter_id,
                    "title": f"CBSE Marking Scheme: {topic}",
                    "content": f"[1 Mark] {board_text[:1500]}",
                }
            )
            comp_text = _flatten_text([topic, ex.get("problem"), ex.get("competitive_shortcut"), ex.get("speed_mode") or ex.get("board_tip")])
            chunks.append(
                {
                    "id": f"{subject_id}:{resolved_chapter}:exemplar:{i}",
                    "source_type": "NCERT_EXEMPLAR",
                    "content_block_type": "concept",
                    "subject": subject_id,
                    "chapter_id": chapter_id,
                    "title": f"NCERT Exemplar Bridge: {topic}",
                    "content": comp_text[:1600],
                }
            )

        for group_key, group in (lesson.get("exercises") or {}).items():
            if not isinstance(group, dict):
                continue
            for i, prob in enumerate(group.get("problems", []) or []):
                q_text = _flatten_text([prob.get("book_source"), prob.get("question"), prob.get("solution"), prob.get("final_answer")])
                marks = prob.get("marks") or 2
                chunks.append(
                    {
                        "id": f"{subject_id}:{resolved_chapter}:exercise:{group_key}:{i}",
                        "source_type": "NCERT_TEXTBOOK",
                        "content_block_type": "exercise",
                        "subject": subject_id,
                        "chapter_id": chapter_id,
                        "title": str(prob.get("book_source") or group.get("title") or group_key),
                        "content": q_text[:1600],
                    }
                )
                chunks.append(
                    {
                        "id": f"{subject_id}:{resolved_chapter}:sqp_ex:{group_key}:{i}",
                        "source_type": "CBSE_SQP",
                        "content_block_type": "exercise",
                        "subject": subject_id,
                        "chapter_id": chapter_id,
                        "title": f"SQP Rubric ({marks} Marks): {group.get('title') or group_key}",
                        "content": f"[{marks} Marks] {q_text[:1500]}",
                    }
                )

        for i, misc in enumerate(lesson.get("common_misconceptions", []) or []):
            chunks.append(
                {
                    "id": f"{subject_id}:{resolved_chapter}:misconception:{i}",
                    "source_type": "NCERT_EXEMPLAR",
                    "content_block_type": "concept",
                    "subject": subject_id,
                    "chapter_id": chapter_id,
                    "title": "Common Misconception / Exemplar Pitfall",
                    "content": _flatten_text(misc)[:1600],
                }
            )

    _CHAPTER_CACHE[cache_key] = chunks
    return chunks


def _term_matches(term: str, lower_text: str, collapsed_text: str) -> bool:
    if term in lower_text:
        return True
    if len(term) >= 6:
        compact = term.replace("-", "")
        if len(compact) >= 6 and compact in collapsed_text:
            return True
    return False


class LocalOKFRetriever:
    """Hybrid lexical + OKF metadata retriever over local NCERT markdowns & authored lessons."""

    def retrieve(
        self,
        query: str,
        okf_filters: OKFFilters,
        bm25_keywords: List[str],
        hyde_passage: str = "",
        relaxed: bool = False,
        top_k: int = 8,
    ) -> List[Dict[str, Any]]:
        subject = okf_filters.subject or "science"
        chapter_id = okf_filters.chapter_id or "general-chapter"

        candidates = list(_load_chapter_chunks(subject, chapter_id))

        # On relaxed search or if chapter had no chunks, scan all chapters in subject
        if relaxed or not candidates:
            subject_dir = LESSONS_DIR / subject
            if subject_dir.exists():
                for path in sorted(subject_dir.glob("*.json")):
                    chap_slug = path.stem
                    if resolve_chapter_slug(chapter_id) != chap_slug:
                        candidates.extend(_load_chapter_chunks(subject, chap_slug))

        if not candidates:
            return []

        query_terms = set(bm25_keywords or extract_bm25_keywords(query))
        if hyde_passage:
            query_terms.update(extract_bm25_keywords(hyde_passage, limit=12))
        if not query_terms:
            return []

        prep: List[Tuple[Dict[str, Any], str, str]] = []
        for chunk in candidates:
            haystack = f"{chunk.get('title', '')} {chunk.get('content', '')}".lower()
            collapsed = re.sub(r"[\s-]+", "", haystack)
            prep.append((chunk, haystack, collapsed))

        n_docs = len(prep)
        term_weights: Dict[str, float] = {}
        for kw in query_terms:
            df = sum(1 for _, hay, col in prep if _term_matches(kw, hay, col))
            base = 2.0 if (len(kw) >= 6 or "." in kw or any(ch.isdigit() for ch in kw)) else 1.0
            idf = math.log(1.0 + (n_docs + 1.0) / (df + 1.0))
            term_weights[kw] = base * (idf ** 2)

        scored: List[Dict[str, Any]] = []
        target_chapter = resolve_chapter_slug(chapter_id)
        max_weight = sum(term_weights.values()) or 1.0
        for chunk, haystack, collapsed in prep:
            weighted_hits = 0.0
            raw_hits = 0
            for kw in query_terms:
                if _term_matches(kw, haystack, collapsed):
                    raw_hits += 1
                    weighted_hits += term_weights[kw]
            if raw_hits == 0 and not relaxed:
                continue
            overlap = weighted_hits / max_weight
            same_chapter = resolve_chapter_slug(chunk.get("chapter_id", "")) == target_chapter
            block_match = (
                okf_filters.content_block_type
                and chunk.get("content_block_type") == okf_filters.content_block_type
            )
            exercise_penalty = (
                0.08
                if (okf_filters.content_block_type != "exercise" and chunk.get("content_block_type") == "exercise" and chunk.get("source_type") == "NCERT_TEXTBOOK")
                else 0.0
            )
            if raw_hits > 0:
                raw_score = (
                    0.52
                    + 0.45 * overlap
                    + (0.03 if same_chapter else 0.0)
                    + (0.12 if block_match else 0.0)
                    - exercise_penalty
                )
            elif relaxed and same_chapter:
                raw_score = 0.55
            else:
                raw_score = 0.25

            scored.append({**chunk, "score": min(1.0, round(raw_score, 4)), "_raw_score": raw_score})

        scored.sort(key=lambda c: c["_raw_score"], reverse=True)
        for c in scored:
            c.pop("_raw_score", None)

        # Pseudo-Relevance Feedback (PRF): align CBSE_SQP / NCERT_EXEMPLAR with top NCERT_TEXTBOOK concept
        top_tb = next((c for c in scored if c["source_type"] == "NCERT_TEXTBOOK" and c["score"] >= 0.5), None)
        prf_terms: List[str] = []
        if top_tb is not None:
            tb_tokens = extract_bm25_keywords(f"{top_tb.get('title', '')} {top_tb.get('content', '')}", limit=20)
            prf_terms = [t for t in tb_tokens if t not in query_terms and len(t) >= 3][:10]

        def _prf_key(item: Dict[str, Any]) -> Tuple[float, float]:
            if not prf_terms:
                return (item["score"], 0.0)
            hay = f"{item.get('title', '')} {item.get('content', '')}".lower()
            prf_hits = sum(1.0 for t in prf_terms if t in hay)
            return (item["score"] + 0.12 * prf_hits, item["score"])

        # Ensure source balance across NCERT_TEXTBOOK, CBSE_SQP, and NCERT_EXEMPLAR among matching chunks
        selected: List[Dict[str, Any]] = []
        seen_ids = set()
        for needed_source in ("NCERT_TEXTBOOK", "CBSE_SQP", "NCERT_EXEMPLAR"):
            pool = [item for item in scored if item["source_type"] == needed_source and item["score"] >= 0.5]
            if not pool:
                continue
            best_item = max(pool, key=_prf_key) if needed_source != "NCERT_TEXTBOOK" else pool[0]
            selected.append(best_item)
            seen_ids.add(best_item["id"])

        for item in scored:
            if item["id"] not in seen_ids and len(selected) < top_k:
                selected.append(item)
                seen_ids.add(item["id"])

        return selected[:top_k]


_DEFAULT_RETRIEVER = LocalOKFRetriever()


def retrieve_chunks(state: AgentState) -> Dict[str, Any]:
    """LangGraph node: retrieves OKF-aligned chunks from local NCERT & lesson corpus."""
    analysis = state.analysis
    if not analysis or not analysis.is_valid:
        return {"retrieved_chunks": []}

    # Respect pre-injected chunks in state when caller explicitly supplied them on initial turn
    if state.retrieved_chunks and state.retry_count == 0 and not state.relaxed_filters:
        return {"retrieved_chunks": state.retrieved_chunks}

    chunks = _DEFAULT_RETRIEVER.retrieve(
        query=state.query,
        okf_filters=analysis.okf_filters,
        bm25_keywords=analysis.bm25_keywords,
        hyde_passage=analysis.hyde_passage,
        relaxed=state.relaxed_filters,
    )
    return {"retrieved_chunks": chunks}


def grade_retrieval(
    intent_mode: str,
    chunks: List[Dict[str, Any]],
    threshold: float = 0.5,
    retry_count: int = 0,
) -> GraderResult:
    if not chunks:
        return GraderResult(
            verdict="REWRITE_QUERY",
            passed_chunks=[],
            pruned_chunks=[],
            reason="Empty chunk list provided for evaluation.",
            source_summary={"has_textbook": False, "has_board_sqp": False, "has_exemplar": False},
            relaxed_filters=retry_count > 0,
        )

    passed_chunks: List[Dict[str, Any]] = []
    pruned_chunks: List[Dict[str, Any]] = []

    for chunk in chunks:
        raw_score = chunk.get("score", chunk.get("similarity", 1.0))
        score = float(raw_score) if raw_score is not None else 1.0
        if score >= threshold:
            passed_chunks.append(chunk)
        else:
            pruned_chunks.append({**chunk, "prune_reason": "Below relevance threshold"})

    sources = {c.get("source_type") for c in passed_chunks}
    has_textbook = "NCERT_TEXTBOOK" in sources
    has_board_sqp = "CBSE_SQP" in sources
    has_exemplar = "NCERT_EXEMPLAR" in sources
    source_summary = {
        "has_textbook": has_textbook,
        "has_board_sqp": has_board_sqp,
        "has_exemplar": has_exemplar,
    }

    if not has_textbook:
        return GraderResult(
            verdict="REWRITE_QUERY",
            passed_chunks=passed_chunks,
            pruned_chunks=pruned_chunks,
            reason="Factual insufficiency: Missing primary NCERT_TEXTBOOK grounding chunks.",
            source_summary=source_summary,
            relaxed_filters=retry_count > 0,
        )

    if intent_mode == "BOARD_EXAM" and not has_board_sqp:
        return GraderResult(
            verdict="REWRITE_QUERY",
            passed_chunks=passed_chunks,
            pruned_chunks=pruned_chunks,
            reason="Exam misalignment: Missing official CBSE_SQP marking scheme context for BOARD_EXAM.",
            source_summary=source_summary,
            relaxed_filters=retry_count > 0,
        )

    if intent_mode == "COMPETITIVE_BRIDGE" and not has_exemplar:
        return GraderResult(
            verdict="REWRITE_QUERY",
            passed_chunks=passed_chunks,
            pruned_chunks=pruned_chunks,
            reason="Exam misalignment: Missing NCERT_EXEMPLAR higher-order thinking context for COMPETITIVE_BRIDGE.",
            source_summary=source_summary,
            relaxed_filters=retry_count > 0,
        )

    return GraderResult(
        verdict="PASS",
        passed_chunks=passed_chunks,
        pruned_chunks=pruned_chunks,
        reason="Factual sufficiency and exam alignment requirements satisfied.",
        source_summary=source_summary,
        relaxed_filters=retry_count > 0,
    )


def retrieval_grader(state: AgentState) -> Dict[str, Any]:
    """LangGraph node: audits chunk relevance, factual sufficiency, and exam source alignment."""
    intent_mode = (
        state.analysis.intent_mode
        if state.analysis
        else (state.intent_mode or "BOARD_EXAM")
    )
    result = grade_retrieval(
        intent_mode=intent_mode,
        chunks=state.retrieved_chunks,
        threshold=0.5,
        retry_count=state.retry_count,
    )
    stages = list(state.pipeline_stages)
    stages.append(
        PipelineStage(
            node="retrieval_grader",
            status="completed",
            output=result.verdict,
        )
    )
    return {
        "retrieved_chunks": result.passed_chunks,
        "pruned_chunks": result.pruned_chunks,
        "grader_verdict": result.verdict,
        "grader_reason": result.reason,
        "relaxed_filters": result.relaxed_filters,
        "pipeline_stages": stages,
    }


def query_rewriter(state: AgentState) -> Dict[str, Any]:
    """LangGraph node: relaxes OKF metadata filters and widens keywords on REWRITE_QUERY."""
    analysis = state.analysis
    if analysis is not None:
        relaxed_okf = analysis.okf_filters.model_copy(
            update={"source_type": "ALL", "topic_tag": "general", "content_block_type": "concept"}
        )
        expanded_keywords = list(dict.fromkeys(analysis.bm25_keywords + [analysis.okf_filters.chapter_id.replace("-", " ")]))[:10]
        updated_analysis = analysis.model_copy(
            update={"okf_filters": relaxed_okf, "bm25_keywords": expanded_keywords}
        )
    else:
        updated_analysis = None

    stages = list(state.pipeline_stages)
    stages.append(
        PipelineStage(
            node="query_rewriter",
            status="completed",
            output="RELAXED_OKF_FILTERS",
        )
    )
    return {
        "analysis": updated_analysis,
        "retry_count": state.retry_count + 1,
        "relaxed_filters": True,
        "pipeline_stages": stages,
    }
