export type YouTubeEmbedMode = 'standard' | 'education';

export interface YouTubePlayerConfig {
  ok: boolean;
  educationEnabled: boolean;
  educationBase: string | null;
  educationToken: string | null;
  origin: string | null;
}

export interface YouTubeValidation {
  ok: boolean;
  videoId: string;
  validated: boolean;
  reason: string | null;
  verifiedBy?: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string | null;
  embeddable?: boolean;
  publicVideo?: boolean;
  ageRestricted?: boolean;
  regionBlocked?: boolean;
  regionCode?: string;
}

export interface YouTubeSearchItem {
  videoId: string;
  title: string;
  channel: string;
  publishedAt: string | null;
  thumbnail: string | null;
  duration: string | null;
}

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(value: string | null | undefined): value is string {
  return typeof value === 'string' && VIDEO_ID_PATTERN.test(value);
}

export function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function buildEmbedUrl(options: {
  videoId: string;
  mode?: YouTubeEmbedMode;
  origin?: string | null;
  start?: number;
  educationBase?: string | null;
  educationToken?: string | null;
}): string {
  const { videoId, mode = 'standard', educationBase, educationToken } = options;
  if (!isValidVideoId(videoId)) throw new Error('Invalid YouTube video id');

  const origin = normalizeOrigin(options.origin);
  const start = Math.max(0, Math.floor(Number(options.start) || 0));

  if (mode === 'education' && educationBase) {
    const base = educationBase.replace(/\/+$/, '');
    const url = new URL(`${base}/${videoId}`);
    url.searchParams.set('enablejsapi', '1');
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('controls', '1');
    if (origin) url.searchParams.set('origin', origin);
    if (start > 0) url.searchParams.set('start', String(start));
    if (educationToken) url.searchParams.set('session_token', educationToken);
    return url.toString();
  }

  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.searchParams.set('rel', '0');
  url.searchParams.set('modestbranding', '1');
  url.searchParams.set('iv_load_policy', '3');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('controls', '1');
  url.searchParams.set('enablejsapi', '1');
  if (origin) url.searchParams.set('origin', origin);
  if (start > 0) url.searchParams.set('start', String(start));
  return url.toString();
}

export function buildWatchUrl(videoId: string): string {
  if (!isValidVideoId(videoId)) throw new Error('Invalid YouTube video id');
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildThumbnailUrl(videoId: string): string {
  if (!isValidVideoId(videoId)) throw new Error('Invalid YouTube video id');
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function describeEmbedError(code: number): string {
  if (code === 150 || code === 153) {
    return 'The video owner has not allowed playback on this domain. Add this site to the video allowlist in YouTube Studio, then reload.';
  }
  if (code === 101) return 'The video owner does not allow this video to be embedded on other sites.';
  if (code === 100) return 'This video is private or has been removed.';
  if (code === 2) return 'The video id is invalid.';
  return 'YouTube could not play this lesson here.';
}

export function describeValidationFailure(validation: YouTubeValidation | null): string {
  if (!validation) return 'This video could not be verified before playback.';
  switch (validation.reason) {
    case 'not-embeddable':
      return 'The video owner has disabled embedding. Choose another verified lesson.';
    case 'not-public':
      return 'This video is not public. Choose another verified lesson.';
    case 'age-restricted':
      return 'This video is age-restricted and cannot play inside a school lesson.';
    case 'region-blocked':
      return 'This video is not available in the configured region.';
    case 'not-found':
      return 'This video was removed or is unavailable.';
    case 'processing-failed':
      return 'This video failed processing on YouTube.';
    default:
      return 'This video is not safe to embed for this lesson.';
  }
}
