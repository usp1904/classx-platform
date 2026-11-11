import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Tag, Filter, Search, Sparkles } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import type { OkfTopic } from '../types';

const TAG_COLORS: Record<string, string> = {
  mathematics: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10',
  science: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  'real_numbers': 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  electricity: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  light: 'text-rose-400 border-rose-500/20 bg-rose-500/10',
  life: 'text-green-400 border-green-500/20 bg-green-500/10',
  nationalism: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
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
        <Stat label="Topics" value={stats?.topicCount || topics.length} icon={<BookOpen size={20} className="text-indigo-400"/>}/>
        <Stat label="Tags" value={stats?.tagCount || allTags.length} icon={<Tag size={20} className="text-amber-400"/>}/>
        <Stat label="Units" value={stats?.unitCount || '—'} icon={<Sparkles size={20} className="text-purple-400"/>}/>
        <Stat label="OKF Version" value={stats?.okfVersion || 'OKF-v1'} icon={<Search size={20} className="text-blue-400"/>}/>
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
              <tr className="border-b text-muted">
                <th className="pb-2">Topic</th><th className="pb-2">Unit</th><th className="pb-2">Difficulty</th><th className="pb-2">Periods</th><th className="pb-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((topic) => (
                <tr key={topic.topicId} className="border-b hover:bg-gray-800/30 group">
                  <td className="py-2 font-medium">{topic.topicName}</td>
                  <td className="py-2 text-muted">{topic.parentUnit}</td>
                  <td className="py-2">
                    <Badge tone={topic.difficulty === 'complex' ? 'rose' : topic.difficulty === 'medium' ? 'saffron' : 'mint'} className="text-xs">{topic.difficulty}</Badge>
                  </td>
                  <td className="py-2 text-muted">{topic.estimatedPeriods}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {topic.tags.map((tag) => (
                        <span key={tag} className={`px-1.5 py-0.5 rounded text-xs border ${TAG_COLORS[tag] || 'border-gray-700/30 text-gray-400'}`}>
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
          <div className="p-3 rounded bg-gray-900/50 border border-gray-700/50">
            <div className="text-xs text-muted">Simple</div>
            <div className="text-2xl font-bold text-mint-400">{difficultyCounts.simple || 0}</div>
          </div>
          <div className="p-3 rounded bg-gray-900/50 border border-gray-700/50">
            <div className="text-xs text-muted">Medium</div>
            <div className="text-2xl font-bold text-amber-400">{difficultyCounts.medium || 0}</div>
          </div>
          <div className="p-3 rounded bg-gray-900/50 border border-gray-700/50">
            <div className="text-xs text-muted">Complex</div>
            <div className="text-2xl font-bold text-rose-400">{difficultyCounts.complex || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
