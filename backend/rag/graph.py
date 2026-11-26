"""LangGraph StateGraph orchestrating the ClassX Academic Agentic RAG Pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict, Literal, Optional

from langgraph.graph import END, START, StateGraph

from .analyzer import query_analyzer
from .grader import query_rewriter, retrieval_grader, retrieve_chunks
from .schema import AgentState
from .synthesizer import pedagogical_generator
from .video import video_grounder


def route_after_analyzer(state: AgentState) -> Literal["retriever", "__end__"]:
    if not state.analysis or not state.analysis.is_valid:
        return END
    return "retriever"


def route_after_grader(state: AgentState) -> Literal["pedagogical_generator", "query_rewriter"]:
    if state.grader_verdict == "PASS":
        return "pedagogical_generator"
    if state.retry_count >= state.max_retries:
        return "pedagogical_generator"
    return "query_rewriter"


def build_academic_rag_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("query_analyzer", query_analyzer)
    workflow.add_node("retriever", retrieve_chunks)
    workflow.add_node("retrieval_grader", retrieval_grader)
    workflow.add_node("query_rewriter", query_rewriter)
    workflow.add_node("pedagogical_generator", pedagogical_generator)
    workflow.add_node("video_grounder", video_grounder)

    workflow.add_edge(START, "query_analyzer")
    workflow.add_conditional_edges(
        "query_analyzer",
        route_after_analyzer,
        {
            "retriever": "retriever",
            END: END,
        },
    )
    workflow.add_edge("retriever", "retrieval_grader")
    workflow.add_conditional_edges(
        "retrieval_grader",
        route_after_grader,
        {
            "pedagogical_generator": "pedagogical_generator",
            "query_rewriter": "query_rewriter",
        },
    )
    workflow.add_edge("query_rewriter", "retriever")
    workflow.add_edge("pedagogical_generator", "video_grounder")
    workflow.add_edge("video_grounder", END)

    return workflow.compile()


_COMPILED_GRAPH = None


def get_compiled_graph():
    global _COMPILED_GRAPH
    if _COMPILED_GRAPH is None:
        _COMPILED_GRAPH = build_academic_rag_graph()
    return _COMPILED_GRAPH


def run_pipeline(payload: Dict[str, Any]) -> Dict[str, Any]:
    raw_query = str(payload.get("query") or payload.get("question") or "").strip()
    if not raw_query:
        return {
            "ok": False,
            "error": "question is required",
        }

    input_state: Dict[str, Any] = {
        "query": raw_query,
        "subject_id": payload.get("subject_id") or payload.get("subjectId"),
        "chapter_id": payload.get("chapter_id") or payload.get("chapterId"),
    }
    intent_mode = payload.get("intent_mode") or payload.get("intentMode")
    if intent_mode in ("BOARD_EXAM", "COMPETITIVE_BRIDGE"):
        input_state["intent_mode"] = intent_mode

    persona = payload.get("persona")
    if isinstance(persona, dict):
        input_state["persona"] = {
            "role": str(persona.get("role") or "student"),
            "exam": str(persona.get("exam") or ""),
            "depth": str(persona.get("depth") or ""),
            "ageBand": persona.get("ageBand"),
        }

    graph = get_compiled_graph()
    raw_result = graph.invoke(input_state)
    state = AgentState(**raw_result) if isinstance(raw_result, dict) else raw_result

    analysis_dict = state.analysis.model_dump() if state.analysis else None
    layers_dict = state.answer_layers.model_dump() if state.answer_layers else None
    video_dict = state.visual_aid_video.model_dump() if state.visual_aid_video else None
    stages_list = [s.model_dump() for s in state.pipeline_stages]

    is_valid = bool(state.analysis and state.analysis.is_valid)
    return {
        "ok": is_valid,
        "intentMode": state.analysis.intent_mode if state.analysis else "BOARD_EXAM",
        "analysis": analysis_dict,
        "graderVerdict": state.grader_verdict or "REWRITE_QUERY",
        "answerLayers": layers_dict,
        "visualAidVideo": video_dict,
        "pipelineStages": stages_list,
    }


def run_worker_loop() -> int:
    # Pre-warm compiled LangGraph pipeline before signaling readiness
    get_compiled_graph()
    sys.stdout.write(json.dumps({"type": "ready"}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue
        req_id = None
        try:
            msg = json.loads(raw)
            req_id = msg.get("id")
            payload = msg.get("payload", msg)
            result = run_pipeline(payload if isinstance(payload, dict) else {})
            out = {"id": req_id, "result": result}
        except Exception as exc:
            out = {"id": req_id, "result": {"ok": False, "error": str(exc)}}
        sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    return 0


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="ClassX Academic Agentic RAG CLI")
    parser.add_argument("--worker", action="store_true", help="Run persistent line-delimited JSON stdio worker")
    parser.add_argument("--query", type=str, default=None)
    parser.add_argument("--subject-id", type=str, default=None)
    parser.add_argument("--chapter-id", type=str, default=None)
    parser.add_argument("--intent-mode", type=str, default=None)
    args = parser.parse_args(argv)

    if args.worker:
        return run_worker_loop()

    if args.query is not None:
        payload: Dict[str, Any] = {
            "query": args.query,
            "subject_id": args.subject_id,
            "chapter_id": args.chapter_id,
            "intent_mode": args.intent_mode,
        }
    else:
        raw_stdin = sys.stdin.read().strip()
        payload = json.loads(raw_stdin) if raw_stdin else {}

    result = run_pipeline(payload)
    sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
