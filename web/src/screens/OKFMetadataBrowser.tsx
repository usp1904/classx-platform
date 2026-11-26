import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Tag, Search, Layers } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import type { OkfTopic } from '../types';

const TAG_COLORS: Record<string, string> = {
  mathematics: 'text-[#1B4332] border-[#1B4332] bg-[#DCFCE7]',
  science: 'text-[#1B4332] border-[#1B4332] bg-[#DCFCE7]',
  'real_numbers': 'text-[#18181B] border-[#E4E2DD] bg-[#F3F1EC]',
  electricity: 'text-[#92400E] border-[#B45309] bg-[#FEF08A]',
  light: 'text-[#991B1B] border-[#D95D39] bg-[#FEE2E2]',
  life: 'text-[#1B4332] border-[#1B4332] bg-[#DCFCE7]',
  nationalism: 'text-[#92400E] border-[#B45309] bg-[#FEF08A]',
};

export default function OKFMetadataBrowser() {
  const [topics, setTopics] = useState<OkfTopic[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filterTag, setFilterTag] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.okfStats().then((p) => setStats(p)).catch(() => setStats(null)),
      api.okfTopics().then((p) => setTopics(p.topics)).catch(() => setTopics([])),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = filterTag ? topics.filter((t) => t.tags.includes(filterTag)) : topics;
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const t of topics) for (const tag of t.tags) tags.add(tag);
    return [...tags];
  }, [topics]);

  const difficultyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of topics) counts[t.difficulty] = (counts[t.difficulty] || 0) + 1;
    return counts;
  }, [topics]);

  if (loading) return <div className="p-6 text-center text-muted">Loading OKF metadata…</div>;

  return (
    <div className="space-y-4">
      <SectionHeader title="OKF Syllabus Metadata" description="Open Knowledge Format alignment for retrieval and chapter organization"/>
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Topics" value={stats?.topicCount || topics.length} icon={<BookOpen size={20} className="text-[#1B4332]"/>} tone="forest"/>
        <Stat label="Tags" value={stats?.tagCount || allTags.length} icon={<Tag size={20} className="text-[#B45309]"/>} tone="saffron"/>
        <Stat label="Units" value={stats?.unitCount || '—'} icon={<Layers size={20} className="text-[#D95D39]"/>} tone="rose"/>
        <Stat label="OKF Version" value={stats?.okfVersion || 'OKF-v1'} icon={<Search size={20} className="text-[#1B4332]"/>} tone="mint"/>
      </div>
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="eyebrow">Filter by tag</div>
          <Button variant={filterTag === '' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterTag('')}>All topics</Button>
          {allTags.map((tag) => (
            <Button key={tag} variant={filterTag === tag ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterTag(tag)}>
              {tag}
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E4E2DD] text-muted">
                <th className="pb-2">Topic</th><th className="pb-2">Unit</th><th className="pb-2">Difficulty</th><th className="pb-2">Periods</th><th className="pb-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((topic) => (
                <tr key={topic.topicId} className="border-b border-[#E4E2DD] hover:bg-[#F3F1EC] transition-colors">
                  <td className="py-2 font-medium">{topic.topicName}</td>
                  <td className="py-2 text-muted">{topic.parentUnit}</td>
                  <td className="py-2">
                    <Badge tone={topic.difficulty === 'complex' ? 'rose' : topic.difficulty === 'medium' ? 'saffron' : 'mint'} className="text-xs">{topic.difficulty}</Badge>
                  </td>
                  <td className="py-2 text-muted">{topic.estimatedPeriods}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {topic.tags.map((tag) => (
                        <span key={tag} className={`px-1.5 py-0.5 rounded text-xs border ${TAG_COLORS[tag] || 'border-[#E4E2DD] text-[#52525B] bg-[#F3F1EC]'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="py-8 text-center text-muted">No topics match this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card p-4">
        <SectionHeader title="Difficulty distribution" description="OKF-aligned topic difficulty across syllabus"/>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded bg-[#F3F1EC] border border-[#E4E2DD]">
            <div className="text-xs text-muted">Simple</div>
            <div className="text-2xl font-bold text-[#1B4332]">{difficultyCounts.simple || 0}</div>
          </div>
          <div className="p-3 rounded bg-[#F3F1EC] border border-[#E4E2DD]">
            <div className="text-xs text-muted">Medium</div>
            <div className="text-2xl font-bold text-[#B45309]">{difficultyCounts.medium || 0}</div>
          </div>
          <div className="p-3 rounded bg-[#F3F1EC] border border-[#E4E2DD]">
            <div className="text-xs text-muted">Complex</div>
            <div className="text-2xl font-bold text-[#991B1B]">{difficultyCounts.complex || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
