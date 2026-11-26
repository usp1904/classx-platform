import { useEffect, useRef, useState } from 'react';
import { BookOpenCheck, RotateCcw } from 'lucide-react';
import {
  buildConceptEmbedUrl,
  renderConceptVideoPlayerModel,
  validateVisualAidVideo,
} from '../lib/conceptPlayer.ts';
import { normalizeOrigin } from '../lib/youtube.ts';
import type { VisualAidVideo } from '../types.ts';

export { buildConceptEmbedUrl, validateVisualAidVideo, renderConceptVideoPlayerModel };

interface YTPlayerInstance {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
}

interface YTGlobal {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayerInstance;
}

let conceptIframeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  const w = window as unknown as { YT?: YTGlobal; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve();
  if (conceptIframeApiPromise) return conceptIframeApiPromise;

  conceptIframeApiPromise = new Promise<void>((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('iframe-api-failed'));
    document.head.appendChild(script);
  });

  return conceptIframeApiPromise;
}

export interface ConceptVideoPlayerProps {
  video?: VisualAidVideo | null;
  onTestYourself?: (video: VisualAidVideo) => void;
  className?: string;
}

export function ConceptVideoPlayer({
  video = null,
  onTestYourself,
  className = '',
}: ConceptVideoPlayerProps) {
  const [isEnded, setIsEnded] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);

  const validation = validateVisualAidVideo(video);
  const origin =
    typeof window !== 'undefined' ? normalizeOrigin(window.location.origin) : null;

  const model = validation.ok && video
    ? renderConceptVideoPlayerModel({ ...video, origin }, { isEnded })
    : renderConceptVideoPlayerModel(null);

  useEffect(() => {
    setIsEnded(false);
    setApiFailed(false);
  }, [video?.video_id, video?.start_sec, video?.end_sec]);

  useEffect(() => {
    if (!validation.ok || !video || apiFailed) return;
    let active = true;
    const container = containerRef.current;
    if (!container) return;

    const startSec = Math.max(0, Math.floor(video.start_sec));
    const endSec = Math.floor(video.end_sec) > startSec ? Math.floor(video.end_sec) : startSec + 1;

    loadYouTubeIframeApi()
      .then(() => {
        const w = window as unknown as { YT?: YTGlobal };
        if (!active || !w.YT?.Player || !containerRef.current) return;
        playerRef.current?.destroy();
        const mount = document.createElement('div');
        mount.style.width = '100%';
        mount.style.height = '100%';
        containerRef.current.replaceChildren(mount);

        playerRef.current = new w.YT.Player(mount, {
          videoId: video.video_id,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            controls: 1,
            enablejsapi: 1,
            start: startSec,
            end: endSec,
            ...(origin ? { origin } : {}),
          },
          events: {
            onStateChange: (event: { data: number }) => {
              if (!active) return;
              if (event.data === 0) {
                setIsEnded(true);
              }
            },
            onError: () => {
              if (active) setApiFailed(true);
            },
          },
        });
      })
      .catch(() => {
        if (active) setApiFailed(true);
      });

    return () => {
      active = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      if (container) container.replaceChildren();
    };
  }, [validation.ok, video?.video_id, video?.start_sec, video?.end_sec, origin, apiFailed]);

  if (!model.mounted || !model.container || !model.iframe || !model.headerMask || !video) {
    return null;
  }

  const handleReplay = () => {
    setIsEnded(false);
    const startSec = Math.max(0, Math.floor(video.start_sec));
    if (playerRef.current) {
      playerRef.current.seekTo(startSec, true);
      playerRef.current.playVideo();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`${model.container.className} rounded-lg border border-[#E4E2DD]`}>
        {/* 60px Top Header Mask blocking YouTube title/share click-outs */}
        <div
          className={model.headerMask.className}
          style={model.headerMask.style}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs font-semibold truncate">{model.headerMask.title}</span>
          <span className="font-mono text-[11px] shrink-0 px-2 py-0.5 rounded bg-[#FAF9F6] text-[#18181B]">
            {model.headerMask.timeRangeText}
          </span>
        </div>

        {/* Embedded nocookie player */}
        {apiFailed ? (
          <iframe
            className="w-full h-full border-0"
            src={model.iframe.src}
            title={model.iframe.title}
            allow={model.iframe.allow}
            allowFullScreen={model.iframe.allowFullScreen}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div ref={containerRef} className="w-full h-full" aria-label={model.iframe.title} />
        )}

        {/* ENDED (0) distraction-locked study card */}
        {model.studyCard && (
          <div className={model.studyCard.className} style={model.studyCard.style}>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#1B4332] mb-1">
              {model.studyCard.title}
            </p>
            <h4 className="text-base font-semibold text-[#18181B] mb-4">
              {model.studyCard.subtitle}
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleReplay}
              >
                <RotateCcw size={14} />
                Replay Concept Clip
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onTestYourself?.(video)}
              >
                <BookOpenCheck size={14} />
                Test Yourself (2 Board Questions)
              </button>
            </div>
          </div>
        )}
      </div>

      {model.observationCue && (
        <p className={model.observationCue.className}>{model.observationCue.caption}</p>
      )}
    </div>
  );
}

export default ConceptVideoPlayer;
