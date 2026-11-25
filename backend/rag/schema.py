"""Pydantic v2 schemas and LangGraph state definitions for the ClassX Academic Agentic RAG Pipeline (OKF v0.2)."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class OKFFilters(BaseModel):
    subject: str = Field(..., min_length=1, description="Subject identifier (science | mathematics | social-science)")
    chapter_id: str = Field(..., min_length=1, description="Chapter slug/ID")
    topic_tag: str = Field(..., min_length=1, description="OKF v0.2 topic tag")
    content_block_type: str = Field(default="concept", description="concept | activity | exercise | theorem | reaction")
    source_type: str = Field(default="NCERT_TEXTBOOK", description="NCERT_TEXTBOOK | CBSE_SQP | NCERT_EXEMPLAR")


class QueryAnalysis(BaseModel):
    intent_mode: Literal["BOARD_EXAM", "COMPETITIVE_BRIDGE"] = Field(..., description="Target exam preparation mode")
    target_exam: Optional[Literal["CBSE_BOARD", "JEE_MAIN", "NEET_UG", "UPSC_CSE", "DSC_STATE"]] = None
    okf_filters: OKFFilters = Field(..., description="Resolved OKF metadata filters")
    bm25_keywords: List[str] = Field(default_factory=list, description="Lowercase non-stopword tokens for sparse search")
    hyde_passage: str = Field(
        default="",
        description="3-sentence NCERT prose for dense search; empty for exercise/activity/numerical",
    )
    is_valid: bool = Field(default=True, description="False if sanitized query was empty/punctuation-only")

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

    @field_validator("start_sec", "end_sec", mode="before")
    @classmethod
    def reject_boolean_timestamps(cls, v: Any) -> Any:
        if isinstance(v, bool):
            raise ValueError("Timestamp must be an integer, not a boolean.")
        return v

    @field_validator("video_id")
    @classmethod
    def validate_video_id(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]{11}$", v):
            raise ValueError(f"Invalid video_id: '{v}'. Must be an 11-character alphanumeric identifier.")
        return v

    @field_validator("concept_title", "observation_cue")
    @classmethod
    def validate_non_empty_text(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field must not be blank.")
        return stripped

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


class GraderResult(BaseModel):
    verdict: Literal["PASS", "REWRITE_QUERY"]
    passed_chunks: List[Dict[str, Any]] = Field(default_factory=list)
    pruned_chunks: List[Dict[str, Any]] = Field(default_factory=list)
    reason: str
    source_summary: Dict[str, bool]
    relaxed_filters: bool = False


class AgentState(BaseModel):
    query: str = Field(..., min_length=1)
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    intent_mode: Optional[Literal["BOARD_EXAM", "COMPETITIVE_BRIDGE"]] = None
    analysis: Optional[QueryAnalysis] = None
    retrieved_chunks: List[Dict[str, Any]] = Field(default_factory=list)
    pruned_chunks: List[Dict[str, Any]] = Field(default_factory=list)
    grader_verdict: Optional[Literal["PASS", "REWRITE_QUERY"]] = None
    grader_reason: Optional[str] = None
    answer_layers: Optional[LayeredAnswer] = None
    visual_aid_video: Optional[VisualAidVideo] = None
    pipeline_stages: List[PipelineStage] = Field(default_factory=list)
    retry_count: int = Field(default=0, ge=0)
    max_retries: int = Field(default=2, ge=0)
    relaxed_filters: bool = Field(default=False)
