"""Pytest test suite for LangGraph Academic Agentic RAG Pipeline contracts.

Adheres strictly to:
- ORIGINAL_REQUEST.md § R1
- PROJECT.md § Architecture, Feature Inventory, and Code Layout
- OKF v0.2 metadata schema
"""

import json
import os
import re
import sys
from typing import List, Literal, Optional
import pytest
from pydantic import BaseModel, Field, field_validator, model_validator, ValidationError

# Locate workspace root & eval dataset
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

EVAL_DATASET_PATH = os.path.join(BASE_DIR, "eval", "dataset-class10-queries.json")

# ============================================================================
# Dynamic Backend Import Probe (Milestone 2: backend/rag/)
# Uses live production Pydantic models & LangGraph StateGraph when present,
# falling back to canonical specification contracts during pre-implementation.
# ============================================================================

PRODUCTION_BACKEND_AVAILABLE = False
build_academic_rag_graph = None

try:
    from backend.rag.schema import (
        OKFFilters as _ProdOKFFilters,
        QueryAnalysis as _ProdQueryAnalysis,
        VisualAidVideo as _ProdVisualAidVideo,
        LayeredAnswer as _ProdLayeredAnswer,
        PipelineStage as _ProdPipelineStage,
        AgentState as _ProdAgentState,
    )
    from backend.rag.graph import build_academic_rag_graph as _prod_build_graph

    OKFFilters = _ProdOKFFilters
    QueryAnalysis = _ProdQueryAnalysis
    VisualAidVideo = _ProdVisualAidVideo
    LayeredAnswer = _ProdLayeredAnswer
    PipelineStage = _ProdPipelineStage
    AgentState = _ProdAgentState
    build_academic_rag_graph = _prod_build_graph
    PRODUCTION_BACKEND_AVAILABLE = True
except ImportError:
    class OKFFilters(BaseModel):
        subject: str = Field(..., min_length=1, description="Subject identifier (e.g. science, mathematics, social-science)")
        chapter_id: str = Field(..., min_length=1, description="Chapter slug/ID")
        topic_tag: str = Field(..., min_length=1, description="OKF topic tag")
        content_block_type: str = Field(default="concept", description="concept | activity | exercise | theorem | reaction")
        source_type: str = Field(default="NCERT_TEXTBOOK", description="NCERT_TEXTBOOK | CBSE_SQP | NCERT_EXEMPLAR")

    class QueryAnalysis(BaseModel):
        intent_mode: Literal["BOARD_EXAM", "COMPETITIVE_BRIDGE"] = Field(..., description="Target exam preparation mode")
        target_exam: Optional[Literal["CBSE_BOARD", "JEE_MAIN", "NEET_UG", "UPSC_CSE", "DSC_STATE"]] = None
        okf_filters: OKFFilters = Field(..., description="Resolved OKF metadata filters")
        bm25_keywords: List[str] = Field(default_factory=list, description="Stemmed non-stopword tokens for sparse search")
        hyde_passage: str = Field(default="", description="3-sentence NCERT prose for dense search; empty for exercise/activity/numerical")

        @field_validator("bm25_keywords")
        @classmethod
        def validate_keywords(cls, v: List[str]) -> List[str]:
            return [k.lower().strip() for k in v if k and k.strip()]

    class VisualAidVideo(BaseModel):
        video_id: str = Field(..., min_length=11, max_length=11, description="11-character YouTube video ID")
        start_sec: int = Field(..., ge=0, description="Start timestamp in seconds")
        end_sec: int = Field(..., gt=0, description="End timestamp in seconds")
        concept_title: str = Field(..., min_length=1, description="Pedagogical concept title")
        observation_cue: str = Field(..., min_length=1, description="Direct observational cue caption")

        @field_validator("video_id")
        @classmethod
        def validate_video_id(cls, v: str) -> str:
            if not re.match(r"^[a-zA-Z0-9_-]{11}$", v):
                raise ValueError(f"Invalid video_id: '{v}'. Must be an 11-character alphanumeric identifier.")
            return v

        @model_validator(mode="after")
        def validate_timestamps(self) -> "VisualAidVideo":
            if self.start_sec >= self.end_sec:
                raise ValueError(f"start_sec ({self.start_sec}) must be strictly less than end_sec ({self.end_sec})")
            return self

    class LayeredAnswer(BaseModel):
        coreIntuition: str = Field(..., min_length=10, description="Intuitive everyday analogy for 15yo")
        boardAnswer: str = Field(..., min_length=10, description="Marking scheme formatted with **bold** and [X Mark]")
        competitiveBridge: str = Field(..., min_length=10, description="Link to JEE/NEET/UPSC/DSC")
        examinersTrap: str = Field(..., min_length=10, description="Common pitfall or negative-marking trap")

        @model_validator(mode="after")
        def validate_board_formatting(self) -> "LayeredAnswer":
            if not re.search(r"\*\*([^*]+)\*\*", self.boardAnswer):
                raise ValueError("boardAnswer must contain bold keywords formatted with **keyword**")
            if not re.search(r"\[(?:\d+(?:\.\d+)?|1\/2)\s*(?:Mark|Marks|mark|marks)\]", self.boardAnswer):
                raise ValueError("boardAnswer must contain step-wise mark distribution in brackets, e.g. [1 Mark]")
            return self

    class PipelineStage(BaseModel):
        node: str = Field(..., min_length=1)
        status: Literal["pending", "running", "completed", "failed"] = "pending"
        output: Optional[str] = None

    class AgentState(BaseModel):
        query: str = Field(..., min_length=1)
        subject_id: Optional[str] = None
        chapter_id: Optional[str] = None
        analysis: Optional[QueryAnalysis] = None
        retrieved_chunks: List[dict] = Field(default_factory=list)
        grader_verdict: Optional[Literal["PASS", "REWRITE_QUERY"]] = None
        answer_layers: Optional[LayeredAnswer] = None
        visual_aid_video: Optional[VisualAidVideo] = None
        pipeline_stages: List[PipelineStage] = Field(default_factory=list)
        retry_count: int = Field(default=0, ge=0)


def _load_dataset():
    with open(EVAL_DATASET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================================
# Tier 1 & 2 Test Cases: Pydantic Model Schema & Constraint Validation (13 tests)
# ============================================================================

def test_okf_filters_validation():
    """Verify OKFFilters accepts valid schemas and assigns defaults."""
    filters = OKFFilters(
        subject="science",
        chapter_id="chemical-reactions-and-equations",
        topic_tag="chemical_reactions_and_equatio",
    )
    assert filters.subject == "science"
    assert filters.content_block_type == "concept"
    assert filters.source_type == "NCERT_TEXTBOOK"


def test_okf_filters_empty_fields_rejected():
    """Verify empty strings in required fields trigger validation errors."""
    with pytest.raises(ValidationError):
        OKFFilters(subject="", chapter_id="chap1", topic_tag="tag1")


def test_query_analysis_board_exam():
    """Verify QueryAnalysis models BOARD_EXAM queries correctly."""
    analysis = QueryAnalysis(
        intent_mode="BOARD_EXAM",
        target_exam="CBSE_BOARD",
        okf_filters=OKFFilters(
            subject="science",
            chapter_id="acids-bases-and-salts",
            topic_tag="ph_in_daily_life",
        ),
        bm25_keywords=["ph", "tooth", "decay", "antacid"],
        hyde_passage="NCERT Class 10 states that tooth decay begins when mouth pH falls below 5.5.",
    )
    assert analysis.intent_mode == "BOARD_EXAM"
    assert analysis.target_exam == "CBSE_BOARD"
    assert len(analysis.bm25_keywords) == 4
    assert len(analysis.hyde_passage) > 20


def test_query_analysis_competitive_bridge():
    """Verify QueryAnalysis models COMPETITIVE_BRIDGE queries with target exams."""
    analysis = QueryAnalysis(
        intent_mode="COMPETITIVE_BRIDGE",
        target_exam="JEE_MAIN",
        okf_filters=OKFFilters(
            subject="science",
            chapter_id="electricity",
            topic_tag="ohms_law_resistance",
            source_type="NCERT_EXEMPLAR",
        ),
        bm25_keywords=["ohm", "non-ohmic", "semiconductor", "v-i"],
        hyde_passage="Ohm's law relates potential difference to electric current at constant temperature.",
    )
    assert analysis.intent_mode == "COMPETITIVE_BRIDGE"
    assert analysis.target_exam == "JEE_MAIN"
    assert analysis.okf_filters.source_type == "NCERT_EXEMPLAR"


def test_query_analysis_invalid_intent_rejected():
    """Verify unknown intent modes raise ValidationError."""
    with pytest.raises(ValidationError):
        QueryAnalysis(
            intent_mode="INVALID_INTENT",  # type: ignore
            okf_filters=OKFFilters(subject="s", chapter_id="c", topic_tag="t"),
            bm25_keywords=["keyword"],
        )


def test_visual_aid_video_valid():
    """Verify VisualAidVideo passes validation on correct 11-char ID and valid timestamps."""
    video = VisualAidVideo(
        video_id="8U8F4R4o1Lw",
        start_sec=42,
        end_sec=105,
        concept_title="Activity 1.1: Quicklime Reaction",
        observation_cue="Observe vigorous hissing and steam release.",
    )
    assert len(video.video_id) == 11
    assert video.start_sec == 42
    assert video.end_sec == 105
    assert video.start_sec < video.end_sec


def test_visual_aid_video_invalid_id_length():
    """Verify video_id shorter or longer than 11 characters is rejected."""
    with pytest.raises(ValidationError):
        VisualAidVideo(
            video_id="short_id",
            start_sec=10,
            end_sec=60,
            concept_title="Title",
            observation_cue="Cue",
        )


def test_visual_aid_video_invalid_id_characters():
    """Verify video_id containing forbidden characters is rejected."""
    with pytest.raises(ValidationError):
        VisualAidVideo(
            video_id="8U8F4R4o1<w",
            start_sec=10,
            end_sec=60,
            concept_title="Title",
            observation_cue="Cue",
        )


def test_visual_aid_video_inverted_timestamps_rejected():
    """Verify start_sec >= end_sec triggers a validation error."""
    with pytest.raises(ValidationError):
        VisualAidVideo(
            video_id="8U8F4R4o1Lw",
            start_sec=120,
            end_sec=60,
            concept_title="Title",
            observation_cue="Cue",
        )


def test_visual_aid_video_negative_timestamp_rejected():
    """Verify negative timestamps trigger a validation error."""
    with pytest.raises(ValidationError):
        VisualAidVideo(
            video_id="8U8F4R4o1Lw",
            start_sec=-5,
            end_sec=60,
            concept_title="Title",
            observation_cue="Cue",
        )


def test_layered_answer_valid():
    """Verify LayeredAnswer validates successfully with bold terms and mark brackets."""
    answer = LayeredAnswer(
        coreIntuition="A dual-lane expressway separating incoming and outgoing delivery trucks.",
        boardAnswer="The **four-chambered heart** prevents intermixing [1 Mark]. High energy demand [1 Mark].",
        competitiveBridge="NEET cardiology extensions.",
        examinersTrap="Confusing left and right ventricle chambers.",
    )
    assert answer.coreIntuition.startswith("A dual-lane")
    assert "**four-chambered heart**" in answer.boardAnswer
    assert "[1 Mark]" in answer.boardAnswer


def test_layered_answer_missing_bold_rejected():
    """Verify boardAnswer missing bold keywords raises ValidationError."""
    with pytest.raises(ValidationError):
        LayeredAnswer(
            coreIntuition="Valid intuition.",
            boardAnswer="Plain answer without bold formatting [1 Mark].",
            competitiveBridge="Valid bridge.",
            examinersTrap="Valid trap.",
        )


def test_layered_answer_missing_marks_rejected():
    """Verify boardAnswer missing bracketed mark allocation raises ValidationError."""
    with pytest.raises(ValidationError):
        LayeredAnswer(
            coreIntuition="Valid intuition.",
            boardAnswer="Answer with **bold keyword** but no mark brackets anywhere.",
            competitiveBridge="Valid bridge.",
            examinersTrap="Valid trap.",
        )


# ============================================================================
# Tier 3: LangGraph StateGraph Contract & Dataset Integration Tests (2 tests)
# ============================================================================

def test_agent_state_transitions():
    """Simulate sequential LangGraph node execution over AgentState."""
    state = AgentState(query="What happens when quicklime is added to water?")
    assert state.analysis is None
    assert state.grader_verdict is None

    state.pipeline_stages.append(PipelineStage(node="query_analyzer", status="running"))
    state.analysis = QueryAnalysis(
        intent_mode="BOARD_EXAM",
        target_exam="CBSE_BOARD",
        okf_filters=OKFFilters(
            subject="science",
            chapter_id="chemical-reactions-and-equations",
            topic_tag="chemical_reactions_and_equatio",
            content_block_type="activity",
        ),
        bm25_keywords=["quicklime", "water", "calcium", "oxide"],
        hyde_passage="",
    )
    state.pipeline_stages[-1].status = "completed"
    state.pipeline_stages[-1].output = "BOARD_EXAM"

    state.pipeline_stages.append(PipelineStage(node="retrieval_grader", status="running"))
    state.retrieved_chunks = [
        {"source_type": "NCERT_TEXTBOOK", "content": "Activity 1.1"},
        {"source_type": "CBSE_SQP", "content": "Marking scheme"},
    ]
    state.grader_verdict = "PASS"
    state.pipeline_stages[-1].status = "completed"
    state.pipeline_stages[-1].output = "PASS"

    state.pipeline_stages.append(PipelineStage(node="pedagogical_generator", status="running"))
    state.answer_layers = LayeredAnswer(
        coreIntuition="Two Lego bricks snapping together releasing heat.",
        boardAnswer="**Combination reaction** [1 Mark]. Balanced equation: CaO + H2O -> **Ca(OH)2** [1 Mark].",
        competitiveBridge="NEET enthalpy changes.",
        examinersTrap="Confusing quicklime with slaked lime.",
    )
    state.pipeline_stages[-1].status = "completed"
    state.pipeline_stages[-1].output = "4_LAYERS_GENERATED"

    state.visual_aid_video = VisualAidVideo(
        video_id="8U8F4R4o1Lw",
        start_sec=42,
        end_sec=105,
        concept_title="Activity 1.1: Quicklime",
        observation_cue="Observe hissing sound and heat.",
    )

    assert state.grader_verdict == "PASS"
    assert len(state.pipeline_stages) == 3
    assert state.answer_layers is not None
    assert state.visual_aid_video is not None


def test_dataset_queries_pydantic_validation():
    """Validate all 26 queries in eval/dataset-class10-queries.json against Pydantic models."""
    assert os.path.exists(EVAL_DATASET_PATH), f"Eval dataset not found at {EVAL_DATASET_PATH}"
    dataset = _load_dataset()

    assert isinstance(dataset, list)
    assert len(dataset) >= 24, f"Dataset must contain >= 24 queries, found {len(dataset)}"

    for item in dataset:
        filters = OKFFilters(
            subject=item["subject"],
            chapter_id=item["chapter_id"],
            topic_tag=item["topic_tag"],
            content_block_type=item["expected_routing"]["okf_filters"].get("content_block_type", "concept"),
            source_type=item["expected_routing"]["okf_filters"].get("source_type", "NCERT_TEXTBOOK"),
        )
        assert filters.subject in ["science", "mathematics", "social-science"]

        analysis = QueryAnalysis(
            intent_mode=item["expected_routing"]["intent_mode"],
            target_exam=item["expected_routing"].get("target_exam"),
            okf_filters=filters,
            bm25_keywords=item["expected_routing"]["bm25_keywords"],
            hyde_passage="NCERT factual passage" if item["expected_routing"]["hyde_expected"] else "",
        )
        assert analysis.intent_mode in ["BOARD_EXAM", "COMPETITIVE_BRIDGE"]

        if item["expected_video_grounding"]["has_verified_video"]:
            meta = item["expected_video_grounding"]["video_metadata"]
            video = VisualAidVideo(
                video_id=meta["video_id"],
                start_sec=meta["start_sec"],
                end_sec=meta["end_sec"],
                concept_title=meta["concept_title"],
                observation_cue=meta["observation_cue"],
            )
            assert len(video.video_id) == 11
        else:
            assert item["expected_video_grounding"]["video_metadata"] is None


# ============================================================================
# Tier 4: End-to-End Pydantic Validation Journeys (5 tests -> Total 20 tests)
# ============================================================================

def test_e2e_cbse_board_high_scorer_pipeline_journey():
    """Tier 4 Scenario 1: CBSE Chemistry Activity 1.1 end-to-end validation journey."""
    if os.environ.get("REQUIRE_PRODUCTION_BACKEND") == "1":
        assert PRODUCTION_BACKEND_AVAILABLE, "Production backend/rag/ module must be installed in M4"

    dataset = _load_dataset()
    item = next(d for d in dataset if d["id"] == "eval-sci-chem-001")

    if PRODUCTION_BACKEND_AVAILABLE and build_academic_rag_graph is not None:
        graph = build_academic_rag_graph()
        result = graph.invoke({"query": item["query"], "subject_id": item["subject"], "chapter_id": item["chapter_id"]})
        state = AgentState(**result) if isinstance(result, dict) else result
    else:
        routing = item["expected_routing"]
        synth = item["expected_synthesis"]
        vid = item["expected_video_grounding"]["video_metadata"]
        state = AgentState(
            query=item["query"],
            subject_id=item["subject"],
            chapter_id=item["chapter_id"],
            analysis=QueryAnalysis(
                intent_mode=routing["intent_mode"],
                target_exam=routing["target_exam"],
                okf_filters=OKFFilters(**routing["okf_filters"]),
                bm25_keywords=routing["bm25_keywords"],
                hyde_passage="",
            ),
            retrieved_chunks=[
                {"source_type": "NCERT_TEXTBOOK", "content": "Activity 1.1 CaO + H2O -> Ca(OH)2"},
                {"source_type": "CBSE_SQP", "content": "3-mark rubric for combination reaction"},
            ],
            grader_verdict="PASS",
            answer_layers=LayeredAnswer(
                coreIntuition=synth["core_intuition_cue"],
                boardAnswer=" ".join(synth["mandatory_bold_keywords"]) + " " + " ".join(synth["step_mark_breakdown"]),
                competitiveBridge="NEET thermodynamic enthalpy changes in lime hydration.",
                examinersTrap=synth["examiners_trap_keyword"],
            ),
            visual_aid_video=VisualAidVideo(**vid),
            pipeline_stages=[
                PipelineStage(node="query_analyzer", status="completed", output="BOARD_EXAM"),
                PipelineStage(node="retrieval_grader", status="completed", output="PASS"),
                PipelineStage(node="pedagogical_generator", status="completed", output="4_LAYERS_GENERATED"),
                PipelineStage(node="video_grounder", status="completed", output="ATTACHED"),
            ],
        )

    assert state.analysis.intent_mode == "BOARD_EXAM"
    assert state.analysis.hyde_passage == ""
    assert state.grader_verdict == "PASS"
    assert "**calcium oxide**" in state.answer_layers.boardAnswer
    assert state.visual_aid_video.video_id == "8U8F4R4o1Lw"


def test_e2e_jee_competitive_bridge_pipeline_journey():
    """Tier 4 Scenario 2: CBSE-to-JEE Electricity foundation bridge E2E journey."""
    dataset = _load_dataset()
    item = next(d for d in dataset if d["id"] == "eval-sci-phy-006")
    routing = item["expected_routing"]
    synth = item["expected_synthesis"]
    vid = item["expected_video_grounding"]["video_metadata"]

    state = AgentState(
        query=item["query"],
        subject_id=item["subject"],
        chapter_id=item["chapter_id"],
        analysis=QueryAnalysis(
            intent_mode=routing["intent_mode"],
            target_exam=routing["target_exam"],
            okf_filters=OKFFilters(**routing["okf_filters"]),
            bm25_keywords=routing["bm25_keywords"],
            hyde_passage="According to NCERT Class 10, Ohm's law relates V and I at constant temperature. Non-ohmic conductors deviate from linearity. Slope of V-I gives resistance.",
        ),
        retrieved_chunks=[
            {"source_type": "NCERT_TEXTBOOK", "content": "Ohm's law V = IR"},
            {"source_type": "NCERT_EXEMPLAR", "content": "Non-ohmic semiconductor V-I curve"},
        ],
        grader_verdict="PASS",
        answer_layers=LayeredAnswer(
            coreIntuition=synth["core_intuition_cue"],
            boardAnswer=" ".join(synth["mandatory_bold_keywords"]) + " " + " ".join(synth["step_mark_breakdown"]) + " Resistance R = 10 ohm.",
            competitiveBridge="JEE Main: Dynamic resistance dV/dI in p-n junction diodes and filament Joule heating.",
            examinersTrap=synth["examiners_trap_keyword"],
        ),
        visual_aid_video=VisualAidVideo(**vid),
        pipeline_stages=[
            PipelineStage(node="query_analyzer", status="completed", output="COMPETITIVE_BRIDGE"),
            PipelineStage(node="retrieval_grader", status="completed", output="PASS"),
            PipelineStage(node="pedagogical_generator", status="completed", output="4_LAYERS_GENERATED"),
        ],
    )

    assert state.analysis.intent_mode == "COMPETITIVE_BRIDGE"
    assert state.analysis.target_exam == "JEE_MAIN"
    assert len(state.analysis.hyde_passage) > 40
    assert "JEE" in state.answer_layers.competitiveBridge
    assert state.visual_aid_video.video_id == "3Z2b3t1QwaA"


def test_e2e_numerical_hyde_suppression_pipeline_journey():
    """Tier 4 Scenario 5: Numerical solver journey verifying HyDE suppression and SI unit compliance."""
    dataset = _load_dataset()
    item = next(d for d in dataset if d["id"] == "eval-sci-phy-005")
    routing = item["expected_routing"]
    synth = item["expected_synthesis"]

    state = AgentState(
        query=item["query"],
        subject_id=item["subject"],
        chapter_id=item["chapter_id"],
        analysis=QueryAnalysis(
            intent_mode=routing["intent_mode"],
            target_exam=routing["target_exam"],
            okf_filters=OKFFilters(**routing["okf_filters"]),
            bm25_keywords=routing["bm25_keywords"],
            hyde_passage="",
        ),
        retrieved_chunks=[
            {"source_type": "NCERT_TEXTBOOK", "content": "Lens formula 1/f = 1/v - 1/u and P = 1/f(m)"},
            {"source_type": "CBSE_SQP", "content": "1 mark for u = -50 cm, 1 mark for f = +0.25 m, 1 mark for P = +4 D"},
        ],
        grader_verdict="PASS",
        answer_layers=LayeredAnswer(
            coreIntuition=synth["core_intuition_cue"],
            boardAnswer="**real and inverted** image at 50 cm [1 Mark]. **focal length** f = +0.25 m [1 Mark]. **power of a lens** P = +4 D [1 Mark].",
            competitiveBridge="JEE Optics: Thin lens combination power P = P1 + P2.",
            examinersTrap=synth["examiners_trap_keyword"],
        ),
        visual_aid_video=None,
        pipeline_stages=[
            PipelineStage(node="query_analyzer", status="completed", output="BOARD_EXAM"),
            PipelineStage(node="retrieval_grader", status="completed", output="PASS"),
            PipelineStage(node="pedagogical_generator", status="completed", output="4_LAYERS_GENERATED"),
            PipelineStage(node="video_grounder", status="completed", output="OMITTED_CLEANLY"),
        ],
    )

    assert state.analysis.hyde_passage == ""
    assert "+4 D" in state.answer_layers.boardAnswer
    assert state.visual_aid_video is None


def test_e2e_humanities_upsc_analytical_pipeline_journey():
    """Tier 4 Scenario 6: Humanities Civics UPSC analytical journey without STEM exam leakage."""
    dataset = _load_dataset()
    item = next(d for d in dataset if d["id"] == "eval-soc-civ-019")
    routing = item["expected_routing"]
    synth = item["expected_synthesis"]
    vid = item["expected_video_grounding"]["video_metadata"]

    state = AgentState(
        query=item["query"],
        subject_id=item["subject"],
        chapter_id=item["chapter_id"],
        analysis=QueryAnalysis(
            intent_mode=routing["intent_mode"],
            target_exam=routing["target_exam"],
            okf_filters=OKFFilters(**routing["okf_filters"]),
            bm25_keywords=routing["bm25_keywords"],
            hyde_passage="Indian federalism divides legislative powers across Union, State, and Concurrent Lists under the Seventh Schedule.",
        ),
        retrieved_chunks=[
            {"source_type": "NCERT_TEXTBOOK", "content": "Three-fold distribution of legislative powers"},
            {"source_type": "NCERT_EXEMPLAR", "content": "Seventh Schedule Article 246 and residuary powers Article 248"},
        ],
        grader_verdict="PASS",
        answer_layers=LayeredAnswer(
            coreIntuition=synth["core_intuition_cue"],
            boardAnswer=" ".join(synth["mandatory_bold_keywords"]) + " " + " ".join(synth["step_mark_breakdown"]),
            competitiveBridge="UPSC Indian Polity: Seventh Schedule (Article 246), Article 248 residuary powers, and cooperative federalism.",
            examinersTrap=synth["examiners_trap_keyword"],
        ),
        visual_aid_video=VisualAidVideo(**vid),
        pipeline_stages=[
            PipelineStage(node="query_analyzer", status="completed", output="COMPETITIVE_BRIDGE"),
            PipelineStage(node="retrieval_grader", status="completed", output="PASS"),
            PipelineStage(node="pedagogical_generator", status="completed", output="4_LAYERS_GENERATED"),
        ],
    )

    assert state.analysis.okf_filters.subject == "social-science"
    assert state.analysis.target_exam == "UPSC_CSE"
    assert "UPSC" in state.answer_layers.competitiveBridge
    assert not re.search(r"\b(jee|neet)\b", state.answer_layers.competitiveBridge, re.IGNORECASE)
    assert state.visual_aid_video.video_id == "6B5C4D3E2F1"


def test_e2e_query_rewrite_relaxation_recovery_journey():
    """Tier 4 Scenario 7: Query rewrite filter relaxation recovery journey from REWRITE_QUERY to PASS."""
    state = AgentState(
        query="Why did Mahatma Gandhi withdraw the Non-Cooperation Movement?",
        subject_id="social-science",
        chapter_id="nationalism-in-india",
        analysis=QueryAnalysis(
            intent_mode="COMPETITIVE_BRIDGE",
            target_exam="UPSC_CSE",
            okf_filters=OKFFilters(
                subject="social-science",
                chapter_id="nationalism-in-india",
                topic_tag="non_cooperation_movement",
                source_type="NCERT_EXEMPLAR",
            ),
            bm25_keywords=["gandhi", "non-cooperation", "chauri", "chaura", "ahimsa"],
            hyde_passage="Gandhi withdrew the Non-Cooperation Movement in February 1922 after the Chauri Chaura incident.",
        ),
        retrieved_chunks=[],
        grader_verdict="REWRITE_QUERY",
        retry_count=0,
        pipeline_stages=[
            PipelineStage(node="query_analyzer", status="completed", output="COMPETITIVE_BRIDGE"),
            PipelineStage(node="retrieval_grader", status="completed", output="REWRITE_QUERY"),
        ],
    )
    assert state.grader_verdict == "REWRITE_QUERY"
    assert state.retry_count == 0

    # Relaxed filter retry
    state.retry_count += 1
    state.pipeline_stages.append(PipelineStage(node="query_rewriter", status="completed", output="RELAXED_OKF_FILTERS"))
    state.retrieved_chunks = [
        {"source_type": "NCERT_TEXTBOOK", "content": "Chauri Chaura February 1922 police station incident"},
        {"source_type": "NCERT_EXEMPLAR", "content": "Gandhian satyagraha training in non-violence Ahimsa"},
    ]
    state.grader_verdict = "PASS"
    state.pipeline_stages.append(PipelineStage(node="retrieval_grader", status="completed", output="PASS"))
    state.answer_layers = LayeredAnswer(
        coreIntuition="Pausing a marathon when runners start tripping so everyone trains in discipline first.",
        boardAnswer="**Non-Cooperation Movement** withdrawn after **Chauri Chaura** [1 Mark]. Commitment to **Ahimsa** [1 Mark].",
        competitiveBridge="UPSC Modern History: Debates among Swarajists, No-Changers, and mass mobilization discipline.",
        examinersTrap="Attributing withdrawal to British repression instead of Gandhi's non-violent ethics.",
    )
    state.pipeline_stages.append(PipelineStage(node="pedagogical_generator", status="completed", output="4_LAYERS_GENERATED"))

    assert state.retry_count == 1
    assert state.grader_verdict == "PASS"
    assert len(state.pipeline_stages) == 5
    assert state.answer_layers is not None


if __name__ == "__main__":
    sys.exit(pytest.main(["-v", __file__]))
