import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, BookOpen, Clock, Film, AlertCircle, ExternalLink, ShieldCheck,
  CheckCircle2, RotateCcw, RotateCw, Award, ArrowRight, Brain, Eye,
  Repeat, PenTool, Link2, Compass, GraduationCap, Briefcase, MapPin,
  ListChecks, Lightbulb, ChevronRight,
} from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import YouTubePlayer from '../components/YouTubePlayer';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { HubConcept, HubQuickCheck, KnowledgeHub, VideoCatalog, VideoLesson } from '../types';

function formatDate(value?: string | null) {
  if (!value) return 'verified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'verified';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function durationLabel(seconds?: number) {
  if (!seconds) return 'Lesson';
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function HubSection({
  icon,
  title,
  description,
  children,
  tone = 'forest',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: 'forest' | 'mint' | 'saffron' | 'rose';
}) {
  return (
    <Card className={`p-5 hub-section hub-${tone}`}>
      <SectionHeader
        title={title}
        description={description}
        action={<span className="hub-section-icon">{icon}</span>}
      />
      <div className="mt-4 space-y-3">{children}</div>
    </Card>
  );
}

function BulletList({ items, limit = 6 }: { items: string[]; limit?: number }) {
  if (!items.length) return <p className="text-xs text-[#71717A]">No entries yet.</p>;
  return (
    <ul className="space-y-2">
      {items.slice(0, limit).map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`} className="flex gap-2 text-xs text-[#18181B] leading-relaxed">
          <CheckCircle2 size={14} className="text-[#1B4332] shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ConceptCards({ concepts }: { concepts: HubConcept[] }) {
  if (!concepts.length) return <p className="text-xs text-[#71717A]">Concept notes are being authored.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {concepts.slice(0, 6).map((concept, index) => (
        <div key={`${index}-${concept.name}`} className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
          <strong className="text-xs font-semibold text-[#18181B]">{concept.name}</strong>
          {concept.purpose && <p className="mt-1 text-[11px] text-[#3F3F46] leading-relaxed">{concept.purpose}</p>}
          {concept.realLife && <p className="mt-1 text-[11px] text-[#92400E] leading-relaxed">India connect: {concept.realLife}</p>}
        </div>
      ))}
    </div>
  );
}

function QuickCheck({ items }: { items: HubQuickCheck[] }) {
  if (!items.length) return <p className="text-xs text-[#71717A]">Quick checks will appear here after the question bank is mapped.</p>;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <details key={`${index}-${item.question.slice(0, 20)}`} className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
          <summary className="cursor-pointer text-xs font-medium text-[#18181B]">{item.question}</summary>
          <div className="mt-2 grid gap-1.5">
            {item.options.map((option, optionIndex) => (
              <div key={optionIndex} className={`rounded-lg px-2 py-1 text-[11px] ${optionIndex === item.correct ? 'bg-[#DCFCE7] text-[#1B4332] font-semibold' : 'text-[#3F3F46]'}`}>
                {String.fromCharCode(65 + optionIndex)}. {option}
              </div>
            ))}
            {item.explanation && <p className="mt-1 text-[11px] text-[#52525B]">{item.explanation}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}

function WorkedExamples({ examples }: { examples: KnowledgeHub['apply']['workedExamples'] }) {
  if (!examples.length) return null;
  return (
    <div className="space-y-2">
      {examples.map((example, index) => (
        <details key={`${index}-${example.title}`} className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
          <summary className="cursor-pointer text-xs font-medium text-[#18181B]">{example.title}</summary>
          <p className="mt-2 text-[11px] text-[#3F3F46]">{example.problem}</p>
          {example.steps.length > 0 && (
            <ol className="mt-2 space-y-1 text-[11px] text-[#3F3F46]">
              {example.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="flex gap-2">
                  <span className="text-[#1B4332] font-semibold">{stepIndex + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {example.shortcut && <p className="mt-2 rounded-lg bg-[#FEF08A] border border-[#E4E2DD] p-2 text-[11px] text-[#18181B]">Exam shortcut: {example.shortcut}</p>}
        </details>
      ))}
    </div>
  );
}

export default function VideoLesson() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const navigate = useNavigate();
  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';
  const { progress, curriculum, addXp } = useApp();

  const [payload, setPayload] = useState<VideoCatalog | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCompleted(false);
    api.video(subjectId, chapterId).then((result) => {
      if (!active) return;
      setPayload(result);
      setSelectedVideoId(result.video?.videoId || null);
      const saved = progress.videoProgress?.[chapterId];
      setResume(saved?.positionSec || 0);
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      console.error('Knowledge hub load failed:', err);
      setError(err instanceof Error ? err.message : 'Unable to load this topic.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [subjectId, chapterId, progress.videoProgress]);

  const hub = payload?.hub;
  const videos = useMemo(() => {
    const list = payload?.videos?.length ? payload.videos : payload?.video ? [payload.video] : [];
    return list;
  }, [payload]);
  const selectedVideo = videos.find((video) => video.videoId === selectedVideoId) || videos[0] || null;
  const currentSubject = curriculum?.subjects?.find((subject) => subject.id === subjectId);
  const currentChapter = currentSubject?.chapters?.find((chapter) => chapter.id === chapterId);

  const videoUrlExternal = selectedVideo ? `https://www.youtube.com/watch?v=${selectedVideo.videoId}` : '';

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
    setResume((previous) => Math.max(0, previous + delta));
  };

  if (loading) return <div className="page-loading"><div className="loader-ring" /><span>Loading Student Knowledge Hub…</span></div>;

  if (error) {
    return (
      <div className="page space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-[#D95D39] shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-[#18181B]">This topic could not be loaded</h2>
              <p className="mt-1 text-sm text-[#52525B]">{error}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={() => window.location.reload()}>Try again</Button>
                <Button variant="secondary" onClick={() => navigate(`/courses/${subjectId}/${chapterId}`)}>Open chapter notes</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page space-y-6">
      <div className="page-head">
        <div>
          <div className="eyebrow light flex items-center gap-2">
            <Compass size={14} className="text-[#B45309]" />
            <span>Student Knowledge Hub for India</span>
          </div>
          <h1>{hub?.title || `${currentChapter?.name || chapterId} — Student Knowledge Hub`}</h1>
          <p>
            Understand, visualize, remember, revise, apply and connect this topic to CBSE academics,
            competitive exams, Indian real life and future careers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="mint" className="text-xs font-bold">
            <ShieldCheck size={13} /> Validated video
          </Badge>
          <Badge tone="forest" className="text-xs font-bold">
            {durationLabel(selectedVideo?.durationSec)}
          </Badge>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="select-wrap compact-select">
            <select
              value={subjectId}
              onChange={(event) => {
                const nextSubject = curriculum?.subjects?.find((subject) => subject.id === event.target.value);
                const firstChapter = nextSubject?.chapters?.[0]?.id || 'real-numbers';
                navigate(`/video/${event.target.value}/${firstChapter}`);
              }}
            >
              {curriculum?.subjects?.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          <div className="select-wrap compact-select">
            <select value={chapterId} onChange={(event) => navigate(`/video/${subjectId}/${event.target.value}`)}>
              {currentSubject?.chapters?.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/courses/${subjectId}/${chapterId}`)}>
            <BookOpen size={14} /><span>Read notes</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/practice/${subjectId}/${chapterId}`)}>
            <PenTool size={14} /><span>Practice</span>
          </Button>
          <Button variant="secondary" size="sm" disabled={!selectedVideo} onClick={() => window.open(videoUrlExternal, '_blank')}>
            <ExternalLink size={14} /><span>Open in YouTube</span>
          </Button>
        </div>
      </Card>

      <div className="p-3.5 rounded-xl bg-[#DCFCE7] border border-[#1B4332] flex items-start gap-3">
        <ShieldCheck size={18} className="text-[#1B4332] shrink-0 mt-0.5" />
        <div className="text-xs text-[#18181B] leading-relaxed">
          <strong className="text-[#1B4332] font-semibold block mb-0.5">Verified before students see it:</strong>
          Every video is checked through the YouTube Data API for public, embeddable, age-safe playback in this region,
          matched to this CBSE chapter, and played through the privacy-enhanced YouTube nocookie player. YouTube may still show platform ads;
          we cannot disable ads inside a third-party player. If a video is ever blocked, use the notes and practice sections below — they are the primary lesson.
        </div>
      </div>

      {selectedVideo ? (
        <Card className="p-3 rounded-2xl overflow-hidden bg-[#F3F1EC] border-[#E4E2DD]">
          <YouTubePlayer
            videoId={selectedVideo.videoId}
            title={selectedVideo.title || hub?.chapterName || 'Class X video lesson'}
            start={resume}
          />
          <div className="p-3 flex items-center justify-between gap-4 flex-wrap mt-2">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => skipTime(-10)}><RotateCcw size={14} /><span>-10s</span></Button>
              <Button variant="secondary" size="sm" onClick={() => skipTime(10)}><RotateCw size={14} /><span>+10s</span></Button>
              <span className="text-xs font-mono text-[#52525B] ml-2">
                Position: {Math.floor(resume / 60)}:{String(resume % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {completed ? (
                <Badge tone="mint" className="text-xs font-bold py-1 px-3 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Completed (+50 XP)
                </Badge>
              ) : (
                <Button variant="primary" size="sm" onClick={markComplete}>
                  <Award size={14} /><span>Mark lesson complete (+50 XP)</span>
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-[#B45309] bg-[#FEF08A]">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-[#B45309] shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-[#18181B]">Video is temporarily unavailable</h2>
              <p className="mt-1 text-sm text-[#3F3F46]">
                No validated video is attached to this topic right now. The knowledge hub below still covers the full lesson.
              </p>
            </div>
          </div>
        </Card>
      )}

      {videos.length > 1 && (
        <Card className="p-5">
          <SectionHeader
            title="Choose a verified lesson"
            description="Short concept revision first, then a deeper chapter walkthrough when you need it."
          />
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {videos.map((video: VideoLesson) => (
              <button
                key={video.videoId}
                type="button"
                onClick={() => { setSelectedVideoId(video.videoId); setResume(0); }}
                className={`text-left rounded-xl border p-3 transition-colors ${selectedVideo?.videoId === video.videoId ? 'border-[#1B4332] bg-[#DCFCE7]' : 'border-[#E4E2DD] bg-[#FAF9F6] hover:border-[#1B4332]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="neutral" className="text-[10px]">{durationLabel(video.durationSec)}</Badge>
                  <Play size={14} className="text-[#1B4332]" />
                </div>
                <strong className="mt-2 block text-xs font-semibold text-[#18181B] leading-snug">{video.title}</strong>
                <span className="mt-1 block text-[10px] text-[#52525B]">{video.channel}</span>
                {video.verifiedAt && <span className="mt-2 block text-[10px] text-[#1B4332]">Verified {formatDate(video.verifiedAt)}</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {hub && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="CBSE weightage" value={`${hub.marks || hub.examWeightage || 0} marks`} hint={hub.unitName || 'Syllabus unit'} icon={<GraduationCap size={18} className="text-[#1B4332]" />} tone="forest" />
            <Stat label="Question bank" value={`${hub.revise.questionBank.total}`} hint={`${hub.revise.questionBank.mcq} MCQ · ${hub.revise.questionBank.subjective} written`} icon={<ListChecks size={18} className="text-[#1B4332]" />} tone="mint" />
            <Stat label="Study periods" value={`${hub.periods || '—'}`} hint="Suggested CBSE pacing" icon={<Clock size={18} className="text-[#B45309]" />} tone="saffron" />
            <Stat label="Video check" value="oEmbed" hint={formatDate(payload?.validation?.generatedAt)} icon={<ShieldCheck size={18} className="text-[#D95D39]" />} tone="rose" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <HubSection icon={<Brain size={18} />} title="1. Understand" description="The concept, its purpose and the outcomes you should own.">
              <BulletList items={hub.understand.outcomes} limit={7} />
              <ConceptCards concepts={hub.understand.concepts} />
            </HubSection>

            <HubSection icon={<Eye size={18} />} title="2. Visualize" description="Turn the idea into a picture, map or flow you can redraw from memory." tone="mint">
              {hub.visualize.items.length > 0 ? (
                <div className="grid gap-2">
                  {hub.visualize.items.map((visual, index) => (
                    <div key={`${index}-${visual.title}`} className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                      <strong className="text-xs text-[#18181B]">{visual.title}</strong>
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-[#1B4332]">{visual.type}</span>
                      {visual.description && <p className="mt-1 text-[11px] text-[#52525B]">{visual.description}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[#71717A]">Draw a concept map with the chapter name in the centre and each topic as a branch.</p>}
              {hub.visualize.mindMap && (
                <div className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                  <strong className="text-xs text-[#1B4332]">{hub.visualize.mindMap.title}</strong>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {hub.visualize.mindMap.branches.map((branch, index) => (
                      <span key={`${index}-${branch}`} className="rounded-full bg-[#F3F1EC] border border-[#E4E2DD] px-2 py-1 text-[10px] text-[#18181B]">{branch}</span>
                    ))}
                  </div>
                </div>
              )}
              {hub.visualize.flowcharts.length > 0 && <BulletList items={hub.visualize.flowcharts} limit={4} />}
            </HubSection>

            <HubSection icon={<Repeat size={18} />} title="3. Remember" description="Key points, theorems, misconceptions and exam shortcuts." tone="saffron">
              <BulletList items={hub.remember.keyPoints} limit={8} />
              {hub.remember.theorems.length > 0 && (
                <div className="space-y-2">
                  {hub.remember.theorems.map((theorem, index) => (
                    <div key={`${index}-${theorem.name}`} className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                      <strong className="text-xs text-[#18181B]">{theorem.name}</strong>
                      <p className="mt-1 text-[11px] text-[#3F3F46]">{theorem.statement}</p>
                    </div>
                  ))}
                </div>
              )}
              {hub.remember.misconceptions.length > 0 && (
                <div className="rounded-xl border border-[#D95D39] bg-[#FEE2E2] p-3">
                  <strong className="text-xs text-[#991B1B]">Common traps</strong>
                  <ul className="mt-2 space-y-1.5">
                    {hub.remember.misconceptions.slice(0, 4).map((item, index) => (
                      <li key={index} className="text-[11px] text-[#18181B]">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hub.remember.shortcuts.length > 0 && (
                <div className="space-y-2">
                  {hub.remember.shortcuts.slice(0, 3).map((shortcut, index) => (
                    <div key={`${index}-${shortcut.title}`} className="rounded-xl border border-[#B45309] bg-[#FEF08A] p-3">
                      <strong className="text-xs text-[#92400E]">{shortcut.title}</strong>
                      <p className="mt-1 text-[11px] text-[#18181B]">{shortcut.concept}</p>
                      {shortcut.application && <p className="mt-1 text-[11px] text-[#3F3F46]">{shortcut.application}</p>}
                    </div>
                  ))}
                </div>
              )}
            </HubSection>

            <HubSection icon={<ListChecks size={18} />} title="4. Revise" description="A short revision plan and quick self-check." tone="rose">
              <BulletList items={hub.revise.revisionPlan} limit={5} />
              <QuickCheck items={hub.revise.quickCheck} />
            </HubSection>

            <HubSection icon={<PenTool size={18} />} title="5. Apply" description="Worked examples, board-style steps and practice direction.">
              <WorkedExamples examples={hub.apply.workedExamples} />
              <BulletList items={hub.apply.tips} limit={5} />
              <Button variant="primary" size="sm" onClick={() => navigate(`/practice/${hub.apply.practice.subjectId}/${hub.apply.practice.chapterId}`)}>
                <ArrowRight size={14} /><span>Start {hub.apply.practice.suggestedCount}-question practice</span>
              </Button>
            </HubSection>

            <HubSection icon={<Link2 size={18} />} title="6. Connect" description="Academics, competitive exams, Indian real life and careers." tone="mint">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                  <strong className="text-xs text-[#1B4332] flex items-center gap-1"><GraduationCap size={13} /> Academics</strong>
                  <BulletList items={hub.connect.academics} limit={4} />
                </div>
                <div className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                  <strong className="text-xs text-[#B45309] flex items-center gap-1"><Lightbulb size={13} /> Competitive exams</strong>
                  <BulletList items={hub.connect.competitive} limit={4} />
                </div>
                <div className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                  <strong className="text-xs text-[#1B4332] flex items-center gap-1"><MapPin size={13} /> Indian real life</strong>
                  <BulletList items={hub.connect.realLife} limit={4} />
                </div>
                <div className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                  <strong className="text-xs text-[#D95D39] flex items-center gap-1"><Compass size={13} /> India context</strong>
                  <BulletList items={hub.connect.indianContext} limit={4} />
                </div>
              </div>
              <div className="rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3">
                <strong className="text-xs text-[#1B4332] flex items-center gap-1"><Briefcase size={13} /> Future careers</strong>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hub.connect.careers.map((career, index) => (
                    <span key={`${index}-${career}`} className="rounded-full bg-[#F3F1EC] border border-[#E4E2DD] px-2 py-1 text-[10px] text-[#18181B]">{career}</span>
                  ))}
                </div>
              </div>
            </HubSection>
          </div>

          {hub.sources.length > 0 && (
            <Card className="p-5">
              <SectionHeader title="Sources and further reading" description="Official syllabus and textbook references used to build this hub." />
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {hub.sources.map((source, index) => (
                  <a key={`${index}-${source.title}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#E4E2DD] bg-[#FAF9F6] p-3 text-xs text-[#18181B] hover:border-[#1B4332]">
                    <span>{source.title}</span>
                    <ExternalLink size={13} className="text-[#1B4332]" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {hub.topics.length > 0 && (
            <Card className="p-5">
              <SectionHeader title="Topic checklist" description="Every syllabus topic mapped to this chapter." />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {hub.topics.map((topic, index) => (
                  <div key={`${index}-${topic}`} className="flex items-center gap-2 rounded-lg border border-[#E4E2DD] bg-[#FAF9F6] px-3 py-2 text-xs text-[#18181B]">
                    <ChevronRight size={13} className="text-[#1B4332]" />
                    <span>{topic}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
