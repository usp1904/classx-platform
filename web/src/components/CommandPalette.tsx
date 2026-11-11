import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Calculator, Compass, FileQuestion, Loader2, Search, Sparkles } from 'lucide-react';
import { api } from '../api';
import type { SearchResult } from '../types';

const quick = [
  { label: 'Dashboard', to: '/', icon: <Compass size={16} />, hint: 'Home' },
  { label: 'Course library', to: '/courses', icon: <BookOpen size={16} />, hint: 'All subjects' },
  { label: 'Practice arena', to: '/practice', icon: <FileQuestion size={16} />, hint: 'MCQ drills' },
  { label: 'Mock test studio', to: '/mock-tests', icon: <Calculator size={16} />, hint: 'Full paper' },
  { label: 'Ask the tutor', to: '/tutor', icon: <Sparkles size={16} />, hint: 'RAG grounded' },
];

const tabFor = (type: string) => {
  if (type === 'theorem') return 'theorems';
  if (type === 'example' || type === 'exercise') return 'examples';
  if (type === 'quiz' || type === 'practice') return 'practice';
  if (['mindmap', 'flowchart', 'conceptmap', 'shortcut', 'misconception'].includes(type)) return 'revision';
  return 'learn';
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await api.search(q, undefined, 8);
        if (!cancel) {
          setResults(data.results);
          setActive(0);
        }
      } catch {
        if (!cancel) setResults([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 220);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const total = results.length + (query.trim().length < 2 ? quick.length : 0);
  const go = useCallback(
    (index: number) => {
      if (query.trim().length < 2) {
        const item = quick[index];
        if (item) {
          navigate(item.to);
          onClose();
        }
        return;
      }
      const result = results[index];
      if (!result) return;
      navigate(`/courses/${result.subjectId}/${result.chapterId}?tab=${tabFor(result.type)}&anchor=${encodeURIComponent(result.anchor || '')}`);
      onClose();
    },
    [navigate, onClose, query, results],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (total ? (current + 1) % total : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (total ? (current - 1 + total) % total : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(active);
    }
  };

  if (!open) return null;
  const showingQuick = query.trim().length < 2;
  const list = showingQuick
    ? quick.map((item) => ({ key: item.to, title: item.label, subtitle: item.hint, icon: item.icon }))
    : results.map((item) => ({ key: item.id, title: item.title, subtitle: `${item.subjectName} · ${item.chapterName} · ${item.type}`, icon: <Search size={16} /> }));

  return (
    <div className="palette-backdrop" role="dialog" aria-modal="true" aria-label="Search curriculum" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="palette-input">
          {loading ? <Loader2 size={20} className="spin" /> : <Search size={20} />}
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search chapters, theorems, exercises, concepts…"
            aria-label="Search the curriculum"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-body">
          <div className="palette-label">{showingQuick ? 'Jump to' : loading ? 'Searching curriculum' : `${results.length} grounded results`}</div>
          {list.length === 0 && !loading && <div className="palette-empty">No match. Try “linear equations”, “HCF”, “refraction”, “power sharing”.</div>}
          {list.map((item, index) => (
            <button
              key={item.key}
              className={`palette-item ${index === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(index)}
            >
              <span className="palette-icon">{item.icon}</span>
              <span className="palette-text">
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span>Hybrid tree + lexical + vector retrieval</span>
        </div>
      </div>
    </div>
  );
}
