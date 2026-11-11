import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Lightbulb, Zap, FileText, Activity, Target, Play, Network, Share2, Sparkles, Menu, ArrowRight } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { LearningAid, LearningAidsData } from '../types';

const GROUP_LABELS: Record<string, { label: string; icon: any }> = {
  overview: { label: 'Overview', icon: BookOpen },
  quickrevise: { label: 'Quick Revise', icon: FileText },
  visual: { label: 'Visual', icon: Share2 },
  practice: { label: 'Practice', icon: Target },
  shortcuts: { label: 'Shortcuts & Traps', icon: Zap },
  deepdive: { label: 'Deep Dive', icon: Lightbulb },
  connect: { label: 'Connect', icon: Network },
  other: { label: 'Other', icon: Menu },
};

export default function LearningAids() {
  const { subjectId: sId, chapterId: cId } = useParams<{ subjectId?: string; chapterId?: string }>();
  const subjectId = sId || 'mathematics';
  const chapterId = cId || 'real-numbers';
  const [data, setData] = useState<LearningAidsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.learningAids(subjectId, chapterId).then((payload) => {
      setData(payload);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [subjectId, chapterId]);

  if (loading) return <div className="p-6 text-center text-muted">Loading learning aids…</div>;
  if (!data) return <div className="p-6 text-center text-muted">No learning aids available.</div>;

  const { aids, aidsWithContent, stats, hasLesson } = data;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Learning Aids"
        description={`30 ways to understand ${data.chapterName || chapterId}`}
        action={
          <div className="flex gap-2">
            <Badge tone="neutral" className="text-xs">{aidsWithContent.length} of {aids.length} available</Badge>
            <Button variant="ghost" size="sm" onClick={() => {}}>Filter</Button>
          </div>
        }
      />

      {Object.entries(data.aidsWithContent.reduce((acc, a) => {
        (acc[a.group] = acc[a.group] || []).push(a);
        return acc;
      }, {} as Record<string, LearningAid[]>)).map(([group, aids]) => {
        const groupInfo = GROUP_LABELS[group] || { label: group, icon: Menu };
        const GroupIcon = groupInfo.icon as any;
        return (
          <Card key={group} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <GroupIcon size={18} className="text-indigo-400" />
                <h3 className="font-semibold">{groupInfo.label}</h3>
              </div>
              <Badge tone="neutral" className="text-xs">{aids.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aids.map((aid) => (
                <Card
                  key={aid.id}
                  className="p-3 cursor-pointer hover:bg-indigo-500/5 border-indigo-500/10 transition group"
                  onClick={() => {}}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-1">
                      <Badge tone="indigo" className="text-[10px] px-2 py-1">{aid.id}</Badge>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold">{aid.label}</h4>
                      <p className="text-xs text-muted line-clamp-2">
                        {aid.data && typeof aid.data === 'object' && !Array.isArray(aid.data)
                          ? aid.data.title || aid.data.summary || aid.data.story || aid.data.problem || ''
                          : Array.isArray(aid.data) && aid.data.length > 0
                            ? aid.data[0].problem || aid.data[0].name || aid.data[0].title || ''
                            : typeof aid.data === 'string'
                              ? aid.data.slice(0, 100)
                              : ''
                        }
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-700/30">
                    <Button variant="ghost" size="sm" className="w-full text-left" onClick={() => {}}>
                      Open {aid.label}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        );
      })}

      {!hasLesson && (
        <Card className="p-4">
          <SectionHeader title="No authored lesson yet" description="This chapter is a syllabus map. Learning aids will appear once the chapter is authored."/>
          <Button variant="ghost" onClick={() => {}}>View syllabus map</Button>
        </Card>
      )}
    </div>
  );
}
