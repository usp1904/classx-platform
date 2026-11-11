import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, BookOpen, Clock, Maximize2, Film, AlertCircle, RefreshCw, ExternalLink, ShieldCheck, TrendingUp, Clock as ClockIcon } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { VideoCatalog } from '../types';

export default function VideoLesson() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';
  const { progress } = useApp();
  const [video, setVideo] = useState<VideoCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [resume, setResume] = useState(0);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    api.video(subjectId, chapterId).then((payload) => {
      setVideo(payload);
      const saved = progress.videoProgress?.[chapterId];
      if (saved) setResume(saved.positionSec || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [subjectId, chapterId, progress]);

  const videoUrl = video?.video?.provider === 'youtube' && video.video.videoId
    ? `https://www.youtube-nocookie.com/embed/${video.video.videoId}?start=${resume}&rel=0&modestbranding=1`
    : '';

  const handleVideoError = () => {
    setVideoError(true);
  };

  const markComplete = () => {
    api.gamifyXp({ userId: 'guest', amount: 50, reason: `video:${chapterId}` }).catch(() => {});
  };

  const videoUrlExternal = video?.video?.videoId
    ? `https://www.youtube.com/watch?v=${video.video.videoId}`
    : '';

  if (loading) return <div className="p-6 text-center text-muted">Loading video lesson…</div>;
  if (!video) return <div className="p-6 text-center"><AlertCircle size={24} className="mx-auto mb-2 text-error"/><p>No video lesson for this chapter yet.</p></div>;

  return (
    <div className="space-y-4">
      <SectionHeader title={video.video.title} description={`Chapter · ${video.gating.requiredMastery}% mastery to unlock next`}/>

      {/* Educational disclaimer banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">Educational Purpose Only</h4>
            <p className="text-xs text-amber-700 mt-1">
              This video is shared for educational purposes only. No monetary benefit is derived. Content is sourced from YouTube and verified for educational suitability.
            </p>
          </div>
        </div>
      </div>

      {/* Video player card */}
      <Card className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden">
        {videoUrl && !videoError ? (
          <>
            <iframe
              className="w-full h-full"
              src={videoUrl}
              title={video.video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={() => setVideoError(true)}
              onLoad={() => setVideoError(false)}
            />
            <Button onClick={() => setPlaying((p) => !p)} className="absolute left-3 top-3 bg-black/60 text-white hover:bg-black/80 transition">
              {playing ? <Pause size={18}/> : <Play size={18}/>}
            </Button>
          </>
        ) : videoError ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-rose-400"/>
            <h3 className="text-lg font-semibold text-white mb-2">Video Unavailable</h3>
            <p className="text-gray-400 text-sm mb-4">The video for this chapter is not available on YouTube.</p>
            <Button variant="ghost" size="sm" onClick={() => window.open(videoUrlExternal, '_blank')}>
              Search on YouTube
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Film size={48} className="mx-auto mb-2 text-muted"/><p className="text-muted">Video source not configured — placeholder.</p>
          </div>
        )}
        <div className="absolute right-3 bottom-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
          {Math.floor(resume / 60)}:{String(resume % 60).padStart(2,'0')} / {Math.floor(video.video.durationSec / 60)}:{String(video.video.durationSec % 60).padStart(2,'0')}
        </div>
      </Card>

      {/* Video info cards */}
      <div className="flex gap-2">
        <Button onClick={() => setResume(Math.max(0, resume - 10))}>← 10s</Button>
        <Button onClick={() => setResume(resume + 10)}>10s →</Button>
        <Button variant="ghost" onClick={markComplete}>Mark complete +50 XP</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Duration" value={`${Math.floor(video.video.durationSec / 60)} min`}/>
        <Stat label="Provider" value={video.video.provider}/>
        <Stat label="Gating" value={`${video.gating.requiredMastery}% mastery`}/>
        <Stat label="Rating" value={(video.video.rating ?? 0).toFixed(1)} icon={<TrendingUp size={16} className="text-green-400"/>}/>
        <Stat label="Validity" value={`${(video.video.validityScore ?? 0) * 100}%`}/>
      </div>

      {/* Video summary */}
      {video.video.summary && (
        <Card className="p-4">
          <SectionHeader title="Video Summary" description="Quick overview of what you'll learn"/>
          <p className="text-sm text-gray-300">{video.video.summary}</p>
          </Card>
        )}

      {/* Short reels section */}
      <div className="mt-6">
        <SectionHeader title="Quick Review Reels" description="Short 30-60 second revision clips" action={<Badge tone="neutral" className="text-xs">60s max</Badge>} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-3 cursor-pointer hover:bg-indigo-500/5 border-indigo-500/10 transition group" onClick={() => {}}>
              <div className="aspect-[9/16] bg-gray-900 rounded-lg flex items-center justify-center mb-3">
                <Play size={24} className="text-indigo-400 opacity-70 group-hover:opacity-100 transition-opacity"/>
              </div>
              <h4 className="text-sm font-semibold text-gray-200 mb-1">Quick Revision {i}</h4>
              <p className="text-xs text-gray-400">60 seconds</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}