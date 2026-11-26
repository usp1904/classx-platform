import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../api';
import type { YouTubePlayerConfig, YouTubeValidation } from '../types';
import {
  buildEmbedUrl,
  buildWatchUrl,
  describeEmbedError,
  describeValidationFailure,
  isValidVideoId,
  normalizeOrigin,
} from '../lib/youtube';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  start?: number;
  className?: string;
}

interface YouTubePlayerInstance {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

interface YouTubeApi {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayerInstance;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let iframeApiPromise: Promise<void> | null = null;

function loadIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  if (window.YT?.Player) return Promise.resolve();
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('iframe-api-failed'));
    document.head.appendChild(script);
  });

  return iframeApiPromise;
}

export default function YouTubePlayer({ videoId, title, start = 0, className = '' }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const startRef = useRef(start);
  const [config, setConfig] = useState<YouTubePlayerConfig | null>(null);
  const [validation, setValidation] = useState<YouTubeValidation | null>(null);
  const [checking, setChecking] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [apiFailed, setApiFailed] = useState(false);

  startRef.current = start;

  useEffect(() => {
    let active = true;
    setChecking(true);
    setPlayerError(null);
    setApiFailed(false);

    Promise.allSettled([api.youtubeConfig(), api.youtubeValidate(videoId)]).then(([configResult, validationResult]) => {
      if (!active) return;
      if (configResult.status === 'fulfilled' && configResult.value?.ok) {
        setConfig(configResult.value);
      }
      if (validationResult.status === 'fulfilled') {
        setValidation(validationResult.value);
      }
      setChecking(false);
    });

    return () => {
      active = false;
    };
  }, [videoId]);

  const blocked = Boolean(validation && validation.validated && !validation.ok);
  const mode = config?.educationEnabled && config.educationBase ? 'education' : 'standard';
  const origin = normalizeOrigin(config?.origin) || (typeof window !== 'undefined' ? window.location.origin : null);
  const embedUrl = isValidVideoId(videoId)
    ? buildEmbedUrl({
        videoId,
        mode,
        origin,
        start,
        educationBase: config?.educationBase,
        educationToken: config?.educationToken,
      })
    : '';

  useEffect(() => {
    if (checking || blocked || playerError || !isValidVideoId(videoId) || mode === 'education' || apiFailed) return;
    let active = true;
    const container = containerRef.current;
    if (!container) return;

    loadIframeApi()
      .then(() => {
        if (!active || !window.YT?.Player || !containerRef.current) return;
        playerRef.current?.destroy();
        const mount = document.createElement('div');
        mount.style.width = '100%';
        mount.style.height = '100%';
        containerRef.current.appendChild(mount);
        playerRef.current = new window.YT.Player(mount, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: 1,
            iv_load_policy: 3,
            origin,
            start: Math.max(0, Math.floor(startRef.current)),
          },
          events: {
            onError: (event: { data: number }) => {
              if (!active) return;
              setPlayerError(describeEmbedError(event.data));
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
  }, [checking, blocked, playerError, mode, videoId, origin, apiFailed]);

  useEffect(() => {
    if (playerRef.current && start > 0) {
      playerRef.current.seekTo(start, true);
    }
  }, [start]);

  if (!isValidVideoId(videoId)) {
    return <Fallback message="This lesson link is not a valid YouTube video." videoId={videoId} />;
  }

  if (checking) {
    return (
      <div className={`aspect-video w-full rounded-xl bg-[#F3F1EC] border border-[#E4E2DD] flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-2 text-xs text-[#52525B]">
          <Loader2 size={16} className="spin" />
          <span>Checking video safety…</span>
        </div>
      </div>
    );
  }

  if (blocked) {
    return <Fallback message={describeValidationFailure(validation)} videoId={videoId} />;
  }

  if (playerError) {
    return <Fallback message={playerError} videoId={videoId} />;
  }

  return (
    <>
    <div className={`aspect-video w-full rounded-xl overflow-hidden bg-[#18181B] border border-[#E4E2DD] ${className}`}>
      {mode === 'education' ? (
        <iframe
          className="w-full h-full border-0"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : apiFailed ? (
        <iframe
          className="w-full h-full border-0"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div ref={containerRef} className="w-full h-full" aria-label={title} />
      )}
    </div>
    {validation && !validation.validated && (
      <p className="mt-2 px-3 py-2 rounded-lg text-[11px] text-[#92400E] bg-[#FEF08A] border border-[#E4E2DD]">
        Public metadata check is unavailable offline. Playback may still be restricted by the video owner;
        if the player is blocked, use the chapter notes and practice below.
      </p>
    )}
    </>
  );
}

function Fallback({ message, videoId }: { message: string; videoId: string }) {
  const watchUrl = isValidVideoId(videoId) ? buildWatchUrl(videoId) : 'https://www.youtube.com';
  return (
    <div className="aspect-video w-full rounded-xl bg-[#F3F1EC] border border-[#E4E2DD] p-5 flex items-center justify-center">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto text-[#B45309]" size={22} />
        <p className="mt-2 text-sm font-semibold text-[#18181B]">Video cannot play here</p>
        <p className="mt-1 text-xs text-[#52525B] leading-relaxed">{message}</p>
        <a
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline"
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={13} /> Open on YouTube
        </a>
      </div>
    </div>
  );
}
