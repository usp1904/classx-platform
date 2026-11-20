import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Zap, Award, Sparkles, CheckCircle2, Star, ShieldCheck, Target, ArrowUpRight } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat, ProgressRing } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { Badge as BadgeType, LeaderboardEntry } from '../types';

const FALLBACK_BADGES: BadgeType[] = [
  { id: 'first_question', name: 'Curious Mind', xp: 50 },
  { id: 'real_numbers_master', name: 'Real Numbers Master', xp: 200 },
  { id: 'chemical_equations_master', name: 'Reaction Virtuoso', xp: 200 },
  { id: 'streak_3', name: 'Momentum Builder', xp: 150 },
  { id: 'perfect_mock', name: 'Century Club', xp: 500 },
  { id: 'competitive_pro', name: 'DSC & UPSC Pioneer', xp: 300 },
];

const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [
  { userId: 'Ananya Sharma (Rank 1)', xp: 3450, streak: 18, completedChapters: 12, badges: 8, lastActive: 'Today' },
  { userId: 'Rahul Verma (Rank 2)', xp: 3120, streak: 14, completedChapters: 10, badges: 7, lastActive: 'Today' },
  { userId: 'Aditya S. (You)', xp: 2480, streak: 5, completedChapters: 6, badges: 4, lastActive: 'Just now' },
  { userId: 'Sneha Patel', xp: 2310, streak: 9, completedChapters: 5, badges: 4, lastActive: 'Yesterday' },
  { userId: 'Karthik R.', xp: 1980, streak: 7, completedChapters: 4, badges: 3, lastActive: '2d ago' },
  { userId: 'Pooja Iyer', xp: 1720, streak: 4, completedChapters: 3, badges: 2, lastActive: '3d ago' },
];

export default function Gamification() {
  const { progress, addXp } = useApp();
  const [badges, setBadges] = useState<BadgeType[]>(FALLBACK_BADGES);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(FALLBACK_LEADERBOARD);
  const [loading, setLoading] = useState(true);
  const [xpAwardedMsg, setXpAwardedMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.gamifyBadges().then((p) => setBadges(p.badges?.length ? p.badges : FALLBACK_BADGES)).catch(() => setBadges(FALLBACK_BADGES)),
      api.gamifyLeaderboard(20).then((p) => setLeaderboard(p.leaderboard?.length ? p.leaderboard : FALLBACK_LEADERBOARD)).catch(() => setLeaderboard(FALLBACK_LEADERBOARD)),
    ]).finally(() => setLoading(false));
  }, []);

  const award = () => {
    api.gamifyXp({ userId: 'guest', amount: 50, reason: 'study-momentum' }).then((result) => {
      setBadges(result.badges || []);
      if (addXp) addXp(50);
      setXpAwardedMsg('+50 XP study momentum bonus unlocked!');
      setTimeout(() => setXpAwardedMsg(null), 3000);
    }).catch(() => {
      if (addXp) addXp(50);
      setXpAwardedMsg('+50 XP added to session!');
      setTimeout(() => setXpAwardedMsg(null), 3000);
    });
  };

  if (loading) return <div className="page-loading"><div className="loader-ring" /><span>Loading study achievements…</span></div>;

  const earnedIds = new Set((progress.badges || []).map((b) => b.id));
  const currentXp = progress.xp || 150;
  const currentLevel = Math.floor(currentXp / 200) + 1;
  const progressInLevel = (currentXp % 200);
  const percentToNextLevel = Math.round((progressInLevel / 200) * 100);

  return (
    <div className="page space-y-6">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow light flex items-center gap-2">
            <Trophy size={14} className="text-amber-400" />
            <span>Mastery Gamification & Peer Rankings</span>
          </div>
          <h1>Learning Motivation Engine</h1>
          <p>
            Track your cognitive momentum, unlock mastery badges for Board & Competitive exams, and climb the Class X cohort leaderboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="saffron" className="text-xs font-bold flex items-center gap-1">
            <Flame size={12} /> {progress.streak || 1} Day Streak
          </Badge>
          <Badge tone="indigo" className="text-xs font-bold">
            Level {currentLevel} Scholar
          </Badge>
        </div>
      </div>

      {/* Hero Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-[var(--surface)] border-[var(--glass-border)]">
          <ProgressRing value={percentToNextLevel} size={64} stroke={6} color="var(--primary)" />
          <div>
            <span className="text-xs text-[var(--primary)] font-semibold uppercase tracking-wider block">Level {currentLevel}</span>
            <div className="text-xl font-bold text-[var(--ink)]">{currentXp.toLocaleString()} XP</div>
            <small className="text-[var(--muted)] text-[11px] block">{200 - progressInLevel} XP to Level {currentLevel + 1}</small>
          </div>
        </Card>

        <Stat
          label="Active Study Streak"
          value={`${progress.streak || 1} Days`}
          hint="Compounding momentum"
          icon={<Flame size={20} className="text-amber-400" />}
          tone="saffron"
        />

        <Stat
          label="Mastery Badges"
          value={`${(progress.badges || []).length} / ${badges.length || 5}`}
          hint="Unlocked capabilities"
          icon={<Award size={20} className="text-emerald-400" />}
          tone="mint"
        />

        <Stat
          label="Cohort Standing"
          value="#4"
          hint="Top 5% of Class X cohort"
          icon={<Star size={20} className="text-purple-400" />}
          tone="indigo"
        />
      </div>

      {xpAwardedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center justify-between animate-fadeUp">
          <span className="flex items-center gap-2"><Sparkles size={14} />{xpAwardedMsg}</span>
          <span className="text-[10px] text-emerald-600 font-bold">Streak intact</span>
        </div>
      )}

      {/* Badges Grid */}
      <Card className="p-6">
        <SectionHeader
          title="Curriculum & Competitive Badges"
          description="Earn honors by mastering full chapters, conquering mock papers, and answering precision diagnostics"
          action={
            <Button variant="secondary" size="sm" onClick={award}>
              <Zap size={14} className="text-amber-400" />
              <span>Claim +50 XP Bonus</span>
            </Button>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-4">
          {badges.map((badge) => {
            const earned = earnedIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-between gap-3 ${
                  earned
                    ? 'bg-gradient-to-b from-amber-500/15 to-transparent border-amber-500/35 shadow-lg shadow-amber-500/10'
                    : 'bg-[var(--surface-2)] border-[var(--glass-border)] opacity-80 hover:opacity-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${earned ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-md shadow-amber-500/20' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--glass-border)]'}`}>
                  <Award size={28} />
                </div>
                <div>
                  <strong className={`block text-xs font-bold mb-1 ${earned ? 'text-amber-500' : 'text-[var(--ink)]'}`}>{badge.name}</strong>
                  <span className="text-[10px] text-[var(--muted)] block">+{badge.xp} XP</span>
                </div>
                <Badge tone={earned ? 'mint' : 'neutral'} className="text-[10px] w-full justify-center">
                  {earned ? 'Unlocked ✓' : 'In Progress'}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leaderboard Table */}
      <Card className="p-6">
        <SectionHeader
          title="State & Cohort Leaderboard"
          description="Weekly rankings based on verified chapter completions, practice accuracy, and daily consistency"
          action={<Badge tone="indigo" className="text-xs">CBSE & Foundation Cohort</Badge>}
        />

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--glass-border)] text-[var(--muted)] pb-3">
                <th className="pb-3 font-semibold pl-2">Rank</th>
                <th className="pb-3 font-semibold">Scholar</th>
                <th className="pb-3 font-semibold">XP Score</th>
                <th className="pb-3 font-semibold">Streak</th>
                <th className="pb-3 font-semibold">Chapters Mastered</th>
                <th className="pb-3 font-semibold pr-2">Honors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId.includes('You');
                const rankMedal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                return (
                  <tr
                    key={entry.userId || i}
                    className={`transition-colors ${isMe ? 'bg-[var(--primary-soft)] font-semibold text-[var(--primary)]' : 'hover:bg-[var(--surface-2)] text-[var(--ink)]'}`}
                  >
                    <td className="py-3 pl-2 font-mono font-bold">{rankMedal}</td>
                    <td className="py-3 font-medium flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--glass-border)] flex items-center justify-center text-[10px] font-bold text-[var(--ink)]">
                        {entry.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{entry.userId}</span>
                      {isMe && <Badge tone="indigo" className="text-[9px] py-0 px-1.5 ml-1">You</Badge>}
                    </td>
                    <td className="py-3 font-mono font-bold text-[var(--ink)]">{entry.xp.toLocaleString()}</td>
                    <td className="py-3 text-amber-500 font-semibold">{entry.streak}d 🔥</td>
                    <td className="py-3 text-[var(--muted)]">{entry.completedChapters} chapters</td>
                    <td className="py-3 pr-2">
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                        <Award size={13} /> {entry.badges}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
