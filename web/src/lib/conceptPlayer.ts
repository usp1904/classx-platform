import { isValidVideoId, normalizeOrigin } from './youtube.ts';
import type { VisualAidVideo } from '../types.ts';

export interface ConceptVideoInput extends VisualAidVideo {
  origin?: string | null;
}

export interface ConceptVideoValidationResult {
  ok: boolean;
  video?: VisualAidVideo;
  reason?: string;
}

export interface ConceptPlayerState {
  isEnded?: boolean;
  currentTime?: number;
}

export interface ConceptVideoPlayerModel {
  mounted: boolean;
  container: {
    className: string;
    style: {
      position: 'relative';
      aspectRatio: '16 / 9';
      width: '100%';
    };
  } | null;
  iframe: {
    src: string;
    title: string;
    allow: string;
    allowFullScreen: boolean;
  } | null;
  headerMask: {
    height: number;
    className: string;
    style: {
      position: 'absolute';
      top: number;
      left: number;
      right: number;
      height: string;
      zIndex: number;
      pointerEvents: 'auto';
    };
    title: string;
    timeRangeText: string;
    blocksExternalClicks: boolean;
  } | null;
  observationCue: {
    className: string;
    text: string;
    caption: string;
  } | null;
  studyCard: {
    className: string;
    mounted: boolean;
    style: {
      position: 'absolute';
      inset: number;
      zIndex: number;
      backgroundColor: string;
    };
    title: string;
    subtitle: string;
    actions: { id: 'replay' | 'test_yourself'; label: string }[];
    blocksSuggestedVideos: boolean;
  } | null;
}

export function buildConceptEmbedUrl(video: Partial<ConceptVideoInput> | null | undefined): string {
  if (!video || !video.video_id || !isValidVideoId(video.video_id)) {
    throw new Error(`Invalid YouTube video ID: ${video?.video_id}`);
  }

  const rawStart = Number(video.start_sec);
  const startSec = Number.isFinite(rawStart) ? Math.max(0, Math.floor(rawStart)) : 0;
  const rawEndNum = Number(video.end_sec);
  const rawEndSec = Number.isFinite(rawEndNum) ? Math.floor(rawEndNum) : 0;
  const endSec = rawEndSec > startSec ? rawEndSec : startSec + 1;

  const url = new URL(`https://www.youtube-nocookie.com/embed/${video.video_id}`);
  url.searchParams.set('rel', '0');
  url.searchParams.set('modestbranding', '1');
  url.searchParams.set('iv_load_policy', '3');
  url.searchParams.set('controls', '1');
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('start', String(startSec));
  url.searchParams.set('end', String(endSec));

  const origin = normalizeOrigin(video.origin);
  if (origin) {
    url.searchParams.set('origin', origin);
  }

  return url.toString();
}

export function validateVisualAidVideo(video: unknown): ConceptVideoValidationResult {
  if (!video || typeof video !== 'object') {
    return { ok: false, reason: 'missing-or-null-video' };
  }
  const candidate = video as Partial<VisualAidVideo>;
  if (!isValidVideoId(candidate.video_id)) {
    return { ok: false, reason: 'invalid-video-id' };
  }
  if (typeof candidate.start_sec !== 'number' || !Number.isFinite(candidate.start_sec) || candidate.start_sec < 0) {
    return { ok: false, reason: 'invalid-start-sec' };
  }
  if (
    typeof candidate.end_sec !== 'number' ||
    !Number.isFinite(candidate.end_sec) ||
    candidate.end_sec < candidate.start_sec
  ) {
    return { ok: false, reason: 'invalid-end-sec' };
  }
  if (typeof candidate.concept_title !== 'string') {
    return { ok: false, reason: 'missing-concept-title' };
  }
  if (typeof candidate.observation_cue !== 'string') {
    return { ok: false, reason: 'missing-observation-cue' };
  }
  return { ok: true, video: candidate as VisualAidVideo };
}

export function renderConceptVideoPlayerModel(
  video: Partial<ConceptVideoInput> | null | undefined,
  state: ConceptPlayerState = { isEnded: false, currentTime: 0 },
  embedBuilder: (v: Partial<ConceptVideoInput>) => string = buildConceptEmbedUrl,
  validator: (v: unknown) => ConceptVideoValidationResult = validateVisualAidVideo,
): ConceptVideoPlayerModel {
  if (!video) {
    return {
      mounted: false,
      container: null,
      iframe: null,
      headerMask: null,
      observationCue: null,
      studyCard: null,
    };
  }

  const validated = validator(video);
  if (!validated.ok) {
    if (validated.reason === 'invalid-video-id') {
      throw new Error(`Invalid video ID: ${video.video_id}`);
    }
    return {
      mounted: false,
      container: null,
      iframe: null,
      headerMask: null,
      observationCue: null,
      studyCard: null,
    };
  }

  const embedUrl = embedBuilder(video);
  const rawStart = Number(video.start_sec);
  const start = Number.isFinite(rawStart) ? Math.max(0, Math.floor(rawStart)) : 0;
  const rawEndNum = Number(video.end_sec);
  const rawEnd = Number.isFinite(rawEndNum) ? Math.floor(rawEndNum) : start;
  const end = rawEnd > start ? rawEnd : start + 1;
  const conceptTitle = (video.concept_title && video.concept_title.trim()) || 'Concept Demonstration';

  const headerMask = {
    height: 60,
    className: 'concept-player-header-mask',
    style: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      zIndex: 20,
      pointerEvents: 'auto' as const,
    },
    title: conceptTitle,
    timeRangeText: `${start}s–${end}s`,
    blocksExternalClicks: true,
  };

  const observationCue =
    video.observation_cue && video.observation_cue.trim()
      ? {
          className: 'concept-player-observation-cue',
          text: video.observation_cue,
          caption: `Observation Cue: ${video.observation_cue}`,
        }
      : null;

  const isEnded = state?.isEnded === true;
  const studyCard = isEnded
    ? {
        className: 'concept-player-study-card',
        mounted: true,
        style: {
          position: 'absolute' as const,
          inset: 0,
          zIndex: 30,
          backgroundColor: '#FAF9F6',
        },
        title: 'Concept Complete',
        subtitle: conceptTitle,
        actions: [
          { id: 'replay' as const, label: 'Replay Concept Clip' },
          { id: 'test_yourself' as const, label: 'Test Yourself (2 Board Questions)' },
        ],
        blocksSuggestedVideos: true,
      }
    : null;

  return {
    mounted: true,
    container: {
      className: 'concept-player-frame relative aspect-video w-full overflow-hidden',
      style: {
        position: 'relative',
        aspectRatio: '16 / 9',
        width: '100%',
      },
    },
    iframe: {
      src: embedUrl,
      title: conceptTitle,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      allowFullScreen: true,
    },
    headerMask,
    observationCue,
    studyCard,
  };
}
