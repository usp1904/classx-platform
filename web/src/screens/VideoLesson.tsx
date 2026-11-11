import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, BookOpen, Clock, Maximize2, Film, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
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
      <div className="flex gap-2">
        <Button onClick={() => setResume(Math.max(0, resume - 10))}>← 10s</Button>
        <Button onClick={() => setResume(resume + 10)}>10s →</Button>
        <Button variant="ghost" onClick={markComplete}>Mark complete +50 XP</Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Duration" value={`${Math.floor(video.video.durationSec / 60)} min`}/>
        <Stat label="Provider" value={video.video.provider}/>
        <Stat label="Gating" value={`${video.gating.requiredMastery}% mastery`}/>
      </div>
    </div>
  );
}
