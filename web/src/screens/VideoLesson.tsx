import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pause, BookOpen, Clock, Maximize2, Film, AlertCircle, RefreshCw,
  ExternalLink, ShieldCheck, TrendingUp, Sparkles, CheckCircle2, RotateCcw,
  RotateCw, Award, ArrowRight
} from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { VideoCatalog } from '../types';

export default function VideoLesson() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const navigate = useNavigate();
  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';
  const { progress, curriculum, addXp } = useApp();

  const [video, setVideo] = useState<VideoCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setCompleted(false);
    api.video(subjectId, chapterId).then((payload) => {
      setVideo(payload);
      const saved = progress.videoProgress?.[chapterId];
      if (saved) setResume(saved.positionSec || 0);
      setLoading(false);
    }).catch((err) => {
      console.error('Video load failed:', err);
      setLoading(false);
    });
  }, [subjectId, chapterId, progress.videoProgress]);

  const currentSubject = curriculum?.subjects?.find((s) => s.id === subjectId);
  const currentChapter = currentSubject?.chapters?.find((c) => c.id === chapterId);

  const videoId = video?.video?.videoId || 'L6lAZ7gHQ7c';
  const videoUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${resume}&rel=0&modestbranding=1`;
  const videoUrlExternal = `https://www.youtube.com/watch?v=${videoId}`;

  const markComplete = () => {
    api.gamifyXp({ userId: 'guest', amount: 50, reason: `video:${chapterId}` }).then(() => {
      if (addXp) addXp(50);
      setCompleted(true);
    }).catch(() => {
      if (addXp) addXp(50);
      setCompleted(true);
    });
  };

  const skipTime = (delta: number) => {
    setResume((prev) => Math.max(0, prev + delta));
  };

  if (loading) return <div className="page-loading"><div className="loader-ring" /><span>Loading Video Masterclass…</span></div>;

  return (
    <div className="page space-y-6">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow light flex items-center gap-2">
            <Film size={14} className="text-amber-400" />
            <span>Interactive Multi-Modal Video Lessons</span>
          </div>
          <h1>{video?.video?.title || `${currentChapter?.name || chapterId} Masterclass`}</h1>
          <p>
            CBSE Class 10 & Foundation exam masterclass delivered by premier educators with diagram walkthroughs and step-by-step problem derivations.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="mint" className="text-xs font-bold">
            {video?.video?.rating?.toFixed(1) || '4.8'} ★ Premier Quality
          </Badge>
          <Badge tone="indigo" className="text-xs font-bold">
            {Math.floor((video?.video?.durationSec || 720) / 60)} min Duration
          </Badge>
        </div>
      </div>

      {/* Chapter & Subject Selector Toolbar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="select-wrap compact-select">
            <select
              value={subjectId}
              onChange={(e) => {
                const newSub = curriculum?.subjects?.find((s) => s.id === e.target.value);
                const firstCh = newSub?.chapters?.[0]?.id || 'real-numbers';
                navigate(`/video/${e.target.value}/${firstCh}`);
              }}
            >
              {curriculum?.subjects?.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div className="select-wrap compact-select">
            <select
              value={chapterId}
              onChange={(e) => navigate(`/video/${subjectId}/${e.target.value}`)}
            >
              {currentSubject?.chapters?.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/courses/${subjectId}/${chapterId}`)}>
            <BookOpen size={14} />
            <span>Read Chapter Notes</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open(videoUrlExternal, '_blank')}>
            <ExternalLink size={14} />
            <span>Open in YouTube</span>
          </Button>
        </div>
      </Card>

      {/* Educational Notice Banner */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
        <ShieldCheck size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300 font-semibold block mb-0.5">Verified Educational Content:</strong>
          Curated solely for non-monetary academic reference under CBSE 2026-27 guidelines. High-yield video lectures focused on conceptual clarity, visual diagrams, and NCERT exemplars.
        </div>
      </div>

      {/* Theater Video Player Card */}
      <Card className="p-3 rounded-2xl overflow-hidden bg-black/80 border-indigo-500/30 shadow-2xl relative">
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-950 relative">
          <iframe
            className="w-full h-full border-0"
            src={videoUrl}
            title={video?.video?.title || 'Class X Video Lesson'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Player Controls Bar */}
        <div className="p-3 flex items-center justify-between gap-4 flex-wrap mt-2">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => skipTime(-10)}>
              <RotateCcw size={14} />
              <span>-10s</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => skipTime(10)}>
              <RotateCw size={14} />
              <span>+10s</span>
            </Button>
            <span className="text-xs font-mono text-gray-400 ml-2">
              Position: {Math.floor(resume / 60)}:{String(resume % 60).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {completed ? (
              <Badge tone="mint" className="text-xs font-bold py-1 px-3 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Completed (+50 XP Claimed)
              </Badge>
            ) : (
              <Button variant="primary" size="sm" onClick={markComplete}>
                <Award size={14} />
                <span>Mark Lesson Complete (+50 XP)</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Video Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Total Duration"
          value={`${Math.floor((video?.video?.durationSec || 720) / 60)} Minutes`}
          hint="Full chapter syllabus"
          icon={<Clock size={18} className="text-indigo-400" />}
          tone="indigo"
        />
        <Stat
          label="Curator Channel"
          value={video?.video?.channel || 'NCERT / Khan Academy'}
          hint="Certified educational publisher"
          icon={<Film size={18} className="text-amber-400" />}
          tone="saffron"
        />
        <Stat
          label="Concept Rating"
          value={`${(video?.video?.rating || 4.8).toFixed(1)} / 5.0`}
          hint="Based on student retention"
          icon={<TrendingUp size={18} className="text-emerald-400" />}
          tone="mint"
        />
        <Stat
          label="Syllabus Gating"
          value="80% Mastery"
          hint="Recommended before mock exam"
          icon={<Sparkles size={18} className="text-purple-400" />}
          tone="rose"
        />
      </div>

      {/* Video Summary */}
      {video?.video?.summary && (
        <Card className="p-5">
          <SectionHeader
            title="Core Conceptual Takeaways"
            description="High-level roadmap of what this masterclass demonstrates"
          />
          <p className="text-xs text-gray-200 leading-relaxed mt-2">{video.video.summary}</p>
        </Card>
      )}

      {/* Micro-Reels Quick Revision */}
      <Card className="p-5">
        <SectionHeader
          title="60-Second Concept Micro-Clips"
          description="High-speed visual reviews designed for rapid recall before school tests or competitive exams"
          action={<Badge tone="neutral" className="text-xs">Quick Bytes</Badge>}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {[
            { title: 'Core Definition & Lemma', time: '45s', tone: 'indigo' },
            { title: 'Step-by-Step Proof Trick', time: '60s', tone: 'mint' },
            { title: 'Top 3 Examiner Traps', time: '55s', tone: 'saffron' },
            { title: 'Solved Board Question', time: '60s', tone: 'rose' },
          ].map((reel, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/40 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between h-36"
              onClick={() => skipTime(idx * 120)}
            >
              <div className="flex justify-between items-start">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                  <Play size={14} />
                </span>
                <span className="text-[10px] font-mono text-gray-400">{reel.time}</span>
              </div>
              <div>
                <strong className="text-xs font-semibold text-gray-200 block mb-0.5">{reel.title}</strong>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">Jump to segment <ArrowRight size={10} /></span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
