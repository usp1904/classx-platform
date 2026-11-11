import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookMarked,
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  Compass,
  Cloud,
  Film,
  FileQuestion,
  Flame,
  GraduationCap,
  LibraryBig,
  Lightbulb,
  Menu,
  Network,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
  X,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { CommandPalette } from './CommandPalette';

const nav = [
  { section: 'Learn', items: [
    { to: '/', label: 'Home', icon: Compass, end: true },
    { to: '/courses', label: 'Courses', icon: BookOpen },
    { to: '/video/mathematics/real-numbers', label: 'Video lessons', icon: Film },
    { to: '/practice', label: 'Practice', icon: Target },
    { to: '/adaptive-practice', label: 'Adaptive practice', icon: Zap },
    { to: '/mock-tests', label: 'Mock tests', icon: FileQuestion },
    { to: '/tutor', label: 'AI tutor', icon: Sparkles },
    { to: '/learning-aids/mathematics/real-numbers', label: 'Learning Aids', icon: Lightbulb },
  ] },
  { section: 'Plan', items: [
    { to: '/planner', label: 'Study planner', icon: CalendarDays },
    { to: '/library', label: 'Revision library', icon: LibraryBig },
    { to: '/progress', label: 'Progress', icon: ChartNoAxesColumnIncreasing },
    { to: '/gamification', label: 'Gamification', icon: Trophy },
    { to: '/parent', label: 'Parent dashboard', icon: Users },
  ] },
  { section: 'Data', items: [
    { to: '/concept-map/mathematics/real-numbers', label: 'Concept maps', icon: Network },
    { to: '/okf-metadata', label: 'OKF metadata', icon: BookOpen },
    { to: '/rag-search', label: 'RAG search', icon: Search },
    { to: '/offline-status', label: 'Offline status', icon: Cloud },
  ] },
];

const titleFor = (path: string) => {
  if (path === '/') return 'Home';
  if (path.startsWith('/courses')) return 'Courses';
  if (path.startsWith('/practice')) return 'Practice';
  if (path.startsWith('/adaptive-practice')) return 'Adaptive Practice';
  if (path.startsWith('/mock-tests')) return 'Mock tests';
  if (path.startsWith('/tutor')) return 'AI Tutor';
  if (path.startsWith('/planner')) return 'Study planner';
  if (path.startsWith('/library')) return 'Revision library';
  if (path.startsWith('/progress')) return 'Progress';
  if (path.startsWith('/gamification')) return 'Gamification';
  if (path.startsWith('/parent')) return 'Parent Dashboard';
  if (path.startsWith('/video')) return 'Video Lesson';
  if (path.startsWith('/concept-map')) return 'Concept Map';
  if (path.startsWith('/okf-metadata')) return 'OKF Metadata';
  if (path.startsWith('/rag-search')) return 'RAG Search';
  if (path.startsWith('/offline-status')) return 'Offline Status';
  if (path.startsWith('/learning-aids')) return 'Learning Aids';
  return 'Peak';
};

export function Layout() {
  const { progress, toasts, dismissToast, curriculum } = useApp();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const daysToBoards = Math.max(0, Math.ceil((new Date('2027-02-15').getTime() - Date.now()) / 86400000));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Primary navigation">
        <div className="brand-row">
          <NavLink to="/" className="brand" aria-label="Peak home">
            <span className="brand-mark"><GraduationCap size={22} /></span>
            <span>
              <strong>Peak</strong>
              <small>Class X Mastery</small>
            </span>
          </NavLink>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <div className="board-chip">
          <span className="pulse-dot" />
          <div>
            <strong>CBSE 2026-27</strong>
            <small>{daysToBoards} days to boards</small>
          </div>
        </div>

        <nav className="side-nav">
          {nav.map((group) => (
            <div key={group.section} className="nav-group">
              <div className="nav-section">{group.section}</div>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={(item as { end?: boolean }).end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.to === '/' && progress.streak > 1 && <span className="nav-badge">{progress.streak}d</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="side-subjects">
          <div className="nav-section">Subjects</div>
          {curriculum?.subjects.map((subject) => (
            <button key={subject.id} className="subject-mini" onClick={() => navigate(`/courses?subject=${subject.id}`)}>
              <span className={`subject-dot accent-${subject.accent}`} />
              <span>{subject.shortName}</span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>

        <div className="sidebar-card">
          <div className="sidebar-card-icon"><Flame size={18} /></div>
          <strong>{progress.streak}-day streak</strong>
          <p>Show up for 20 minutes today. Momentum compounds.</p>
          <div className="mini-xp"><span style={{ width: `${Math.min(100, (progress.xp % 200) / 2)}%` }} /></div>
          <small>{progress.xp} XP · {Math.max(0, 200 - (progress.xp % 200))} to next level</small>
        </div>

        <button className="profile-chip" onClick={() => navigate('/progress')}>
          <span className="avatar">AS</span>
          <span>
            <strong>Class X learner</strong>
            <small>Free forever · CBSE</small>
          </span>
          <ChevronRight size={16} />
        </button>
      </aside>

      {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="crumb">
              <span>Class X</span><ChevronRight size={13} /><strong>{titleFor(location.pathname)}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
              <Search size={17} />
              <span>Search curriculum</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button className="icon-btn ghost mobile-search-btn" onClick={() => setPaletteOpen(true)} aria-label="Search curriculum"><Search size={18} /></button>
            <button className="streak-chip" title="Daily streak"><Flame size={16} /><span>{progress.streak}</span></button>
            <button className="icon-btn ghost" aria-label="Notifications"><Bell size={18} /><span className="notif-dot" /></button>
            <button className="avatar avatar-sm" onClick={() => navigate('/progress')} aria-label="Open profile">AS</button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>

        <footer className="site-footer">
          <span><BookMarked size={14} /> Grounded in CBSE 2026-27 syllabus PDFs</span>
          <span>Hybrid RAG · tree + lexical + vector + rerank</span>
          <span>Built for Indian learners · free</span>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <button key={toast.id} className={`toast toast-${toast.tone}`} onClick={() => dismissToast(toast.id)}>
            {toast.message}
          </button>
        ))}
      </div>
    </div>
  );
}
