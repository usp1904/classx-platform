import { useEffect, useState } from 'react';
import { Search, BookOpen, FileText, Sparkles, Activity } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import type { OkfSearchResult } from '../types';

export default function RAGSearchViewer() {
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [results, setResults] = useState<OkfSearchResult[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const subjects = ['mathematics', 'science', 'social-science', 'english'];

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const payload = await api.multimodelSearch(query, { subjectId: subjectId || undefined, limit: 10 });
      setResults(payload.results);
      setDiagnostics(payload.diagnostics);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Multimodel RAG Search" description="Hybrid lexical + vector + OKF metadata alignment + rerank"/>
      <div className="card p-4 space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-muted" />
          <input
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white focus:ring-2 focus:ring-indigo-500"
            placeholder="Search curriculum (e.g. quadratic formula, photosynthesis, French Revolution)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading || !query.trim()} loading={loading} className="absolute right-3 top-2 size-8">
            <Sparkles size={16} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant={!subjectId ? 'primary' : 'ghost'} size="sm" onClick={() => setSubjectId('')}>All subjects</Button>
          {subjects.map((s) => (
            <Button key={s} variant={subjectId === s ? 'primary' : 'ghost'} size="sm" onClick={() => setSubjectId(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading && <div className="p-6 text-center text-muted">Searching curriculum…</div>}

      {!loading && query && (
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{results.length} result(s)</h3>
              <p className="text-xs text-muted">{diagnostics?.strategy || 'multimodel search'} · {diagnostics?.latencyMs}ms</p>
            </div>
            <Badge tone="neutral">{diagnostics?.okfVersion || 'OKF-v1'} aligned</Badge>
          </div>
          {results.length ? (
            <div className="space-y-2">
              {results.map((r, i) => (
                <Card key={r.id} className="p-3 group hover:bg-gray-800/30">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold">{r.type}</span>
                    <Badge tone={r.okf?.topic?.difficulty === 'complex' ? 'rose' : r.okf?.topic?.difficulty === 'medium' ? 'saffron' : 'mint'} className="text-xs">{r.okf?.topic?.difficulty || '—'}</Badge>
                  </div>
                  <h4 className="text-sm font-medium mb-1">{r.title}</h4>
                  <p className="text-xs text-muted line-clamp-2">{r.text?.slice(0, 200)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted">{r.subjectName} · {r.chapterName}</span>
                    {r.okf?.topic && (
                      <span className="text-[10px] text-muted">· {r.okf.topic.name}</span>
                    )}
                    <span className="ml-auto text-[10px] text-muted">score {r.score}</span>
                  </div>
                  {r.okf?.tags.length && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.okf.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] border border-gray-700/30 text-gray-400 bg-gray-900/30">{tag}</span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted">No grounded results found. Try rephrasing your query.</div>
          )}
        </div>
      )}
    </div>
  );
}
