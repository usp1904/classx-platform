"""Zero-hallucination verified visual video grounding for OKF v0.2 topic tags."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

from pydantic import ValidationError

from .schema import AgentState, PipelineStage, VisualAidVideo

DEFAULT_CATALOG_PATH = Path(__file__).resolve().parent / "visual_aid_videos.json"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def normalize_tag(tag: Any) -> str:
    if not isinstance(tag, str):
        return ""
    stripped = tag.strip().lower()
    if not stripped:
        return ""
    return re.sub(r"[_\s-]+", "_", stripped)


def is_valid_video_metadata(meta: Any) -> bool:
    if not isinstance(meta, dict):
        return False
    video_id = meta.get("video_id")
    if not isinstance(video_id, str) or not VIDEO_ID_RE.fullmatch(video_id):
        return False
    start_sec = meta.get("start_sec")
    end_sec = meta.get("end_sec")
    if isinstance(start_sec, bool) or isinstance(end_sec, bool):
        return False
    if not isinstance(start_sec, int) or not isinstance(end_sec, int):
        return False
    if start_sec < 0 or start_sec >= end_sec:
        return False
    concept_title = meta.get("concept_title")
    observation_cue = meta.get("observation_cue")
    if not isinstance(concept_title, str) or not concept_title.strip():
        return False
    if not isinstance(observation_cue, str) or not observation_cue.strip():
        return False
    return True


def build_embed_url(video: Optional[VisualAidVideo | Dict[str, Any]]) -> str:
    if video is None:
        return ""
    if isinstance(video, VisualAidVideo):
        meta = video.model_dump()
    elif isinstance(video, dict):
        meta = video
    else:
        return ""
    if not is_valid_video_metadata(meta):
        return ""
    return (
        f"https://www.youtube-nocookie.com/embed/{meta['video_id']}"
        f"?rel=0&modestbranding=1&iv_load_policy=3&controls=1"
        f"&start={meta['start_sec']}&end={meta['end_sec']}&enablejsapi=1"
    )


class VideoGroundingCatalog:
    """Curated topic-tag video catalog enforcing strict zero-hallucination omission."""

    def __init__(
        self,
        entries: Optional[Iterable[Dict[str, Any]]] = None,
        catalog_path: Optional[Path] = None,
    ) -> None:
        self._catalog: Dict[str, Dict[str, Any]] = {}
        raw_entries: Iterable[Dict[str, Any]]
        if entries is not None:
            raw_entries = entries
        else:
            path = catalog_path or DEFAULT_CATALOG_PATH
            if path.exists():
                with path.open("r", encoding="utf-8") as fh:
                    loaded = json.load(fh)
                if isinstance(loaded, dict):
                    raw_entries = [
                        {"topic_tag": k, "video_metadata": v}
                        for k, v in loaded.items()
                    ]
                elif isinstance(loaded, list):
                    raw_entries = loaded
                else:
                    raw_entries = []
            else:
                raw_entries = []

        for entry in raw_entries:
            if not isinstance(entry, dict):
                continue
            tag = normalize_tag(entry.get("topic_tag", ""))
            meta = entry.get("video_metadata")
            if tag and is_valid_video_metadata(meta):
                self._catalog[tag] = dict(meta)

    def ground_topic(self, topic_tag: Any) -> Optional[VisualAidVideo]:
        key = normalize_tag(topic_tag)
        if not key or key not in self._catalog:
            return None
        meta = self._catalog[key]
        if not is_valid_video_metadata(meta):
            return None
        try:
            return VisualAidVideo(**meta)
        except ValidationError:
            return None

    def build_embed_url(self, video: Optional[VisualAidVideo | Dict[str, Any]]) -> str:
        return build_embed_url(video)


_DEFAULT_CATALOG: Optional[VideoGroundingCatalog] = None


def get_default_catalog() -> VideoGroundingCatalog:
    global _DEFAULT_CATALOG
    if _DEFAULT_CATALOG is None:
        _DEFAULT_CATALOG = VideoGroundingCatalog()
    return _DEFAULT_CATALOG


def ground_topic(topic_tag: Any, catalog: Optional[VideoGroundingCatalog] = None) -> Optional[VisualAidVideo]:
    active_catalog = catalog or get_default_catalog()
    return active_catalog.ground_topic(topic_tag)


def video_grounder(state: AgentState) -> Dict[str, Any]:
    """LangGraph node: attaches verified video metadata or cleanly omits it."""
    topic_tag = ""
    if state.analysis and state.analysis.okf_filters:
        topic_tag = state.analysis.okf_filters.topic_tag
    video = ground_topic(topic_tag)
    stages = list(state.pipeline_stages)
    stages.append(
        PipelineStage(
            node="video_grounder",
            status="completed",
            output="ATTACHED" if video is not None else "OMITTED_CLEANLY",
        )
    )
    return {
        "visual_aid_video": video,
        "pipeline_stages": stages,
    }
