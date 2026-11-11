import { useEffect, useState, useRef } from 'react';
import { Send, Mic, MicOff, Copy, Link, BookOpen, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge, Button, Card, ProgressBar, SectionHeader } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { TutorResponse, Citation } from '../types';

export default function DoubtTutor() {
  const { progress } = useApp();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Citation[]>([]);
  const [provider, setProvider] = useState<{ mode: string; model: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [mode, setMode] = useState<'socratic' | 'board' | 'competitive' | 'eli5'>('socratic');
  const inputRef = useRef<HTMLInputElement>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const payload = await api.tutor({
        question: q,
        mode,
        subjectId: undefined,
        chapterId: undefined,
        history: [],
      });
      setAnswer(payload.answer);
      setSources(payload.sources || []);
      setProvider(payload.provider ?? null);
    } catch {
      setAnswer('Unable to reach the tutor right now. Try again.');
      setSources([]);
      setProvider({ mode: 'grounded-fallback', model: 'curriculum-ranker' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(question);
    setQuestion('');
  };

  const copyAnswer = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer).then(() => {});
  };

  const fallbackDisclosed = provider?.mode === 'grounded-fallback';

  return (
    <div className="space-y-4">
      <SectionHeader title="Doubt Tutor" description="Grounded in CBSE curriculum · citations shown · AI-free fallback disclosed"/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <SectionHeader eyebrow="Ask a question" title="Your doubt" action={
              <div className="flex gap-2">
                <Badge tone={mode === 'socratic' ? 'indigo' : mode === 'board' ? 'mint' : mode === 'eli5' ? 'rose' : 'saffron'} className="text-xs">{mode.toUpperCase()}</Badge>
                <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="bg-gray-900 border border-gray-700 text-white px-2 py-1 rounded text-xs">
                  <option value="socratic">Socratic</option>
                  <option value="board">Board</option>
                  <option value="eli5">Explain like I'm 5</option>
                  <option value="competitive">Competitive</option>
                </select>
              </div>
            } />
            <form onSubmit={handleSubmit} className="mt-4 space-y-2">
              <div className="relative">
                <input
                  ref={inputRef}
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-900 text-white focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                  placeholder="e.g. How do I prove the Pythagorean theorem?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                  aria-label="Ask the tutor"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="absolute right-2 top-2"
                  loading={loading}
                  disabled={loading || !question.trim()}
                >
                  <Send size={16} />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <button type="button" onClick={() => setMicOn(!micOn)} className="flex items-center gap-1 hover:text-indigo-400 transition">
                  {micOn ? <MicOff size={14} className="text-rose-400" /> : <Mic size={14} />}
                  <span>{micOn ? 'Listening…' : 'Voice input'}</span>
                </button>
                <span>·</span>
                <span>Ctrl+K to search curriculum</span>
              </div>
            </form>
          </Card>

          {answer && (
            <div className="chat-message tutor">
              <Card className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-indigo-400" />
                      <h3 className="text-sm font-semibold">Tutor response</h3>
                    </div>
                    {fallbackDisclosed && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs mb-2">
                        <AlertTriangle size={14} />
                        <span>Grounded-fallback mode — no AI key. Curriculum-only answer.</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={copyAnswer} title="Copy answer">
                      <Copy size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" title="Share citation">
                      <Link size={16} />
                    </Button>
                  </div>
                </div>
                <div className="chat-bubble prose text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {answer}
                </div>
              {provider && (
                <div className="chat-meta-row flex items-center justify-between px-2 py-2 rounded bg-gray-800/50 text-xs text-muted border border-gray-700/50">
                  <span>Provider: {provider.mode === 'grounded-fallback' ? 'grounded fallback' : provider.mode} · {provider.model}</span>
                  <span className="flex items-center gap-1"><BookOpen size={12} /> {sources.length} citation(s)</span>
                </div>
              )}
              {sources.length && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted mb-1">Sources</div>
                  {sources.map((src, i) => (
                    <div key={i} className="citation-card flex items-start gap-2 px-3 py-1 rounded border border-gray-700/50 text-xs bg-gray-900/30">
                      <span className="text-indigo-400">[S{i + 1}]</span>
                      <div>
                        <div className="font-medium">{src.title}</div>
                        <div className="text-muted">{src.subject} · {src.chapter}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <SectionHeader title="How it works" description="Four modes, one contract"/>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Badge tone="indigo" className="text-xs flex-shrink-0">Socratic</Badge>
                <p className="text-sm text-muted">Asks one reasoning question before each step. You do the thinking.</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge tone="mint" className="text-xs flex-shrink-0">Board</Badge>
                <p className="text-sm text-muted">CBSE examiner style: definition, given, formula, steps, final answer.</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge tone="rose" className="text-xs flex-shrink-0">Explain like I'm 5</Badge>
                <p className="text-sm text-muted">Tiny words, short sentences, real-life examples — like a bedtime story.</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge tone="saffron" className="text-xs flex-shrink-0">Competitive</Badge>
                <p className="text-sm text-muted">JEE/NEET foundation: fastest path, 20-second shortcut, common trap.</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Honesty contract" description="No fabricated answers"/>
            <div className="space-y-2 text-sm text-muted">
              <p>• Answers cite retrieved curriculum material only.</p>
              <p>• Out-of-syllabus questions return a boundary message.</p>
              <p>• Fallback never presents your question as the answer.</p>
              <p>• Add an AI provider key for full generated answers.</p>
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Your XP" description="Engagement layer"/>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Current XP</span>
              <span className="font-semibold">{progress.xp.toLocaleString()}</span>
            </div>
            <ProgressBar value={Math.min(100, (progress.xp % 200) / 2)} tone="indigo" />
            <span className="text-xs text-muted">{Math.max(0, 200 - (progress.xp % 200))} XP to next level</span>
          </Card>
        </div>
      </div>
    </div>
  );
}
