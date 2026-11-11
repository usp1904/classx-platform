import { useEffect, useState } from 'react';
import { Trophy, Badge as BadgeIcon, Flame, Users, Activity, Zap } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import { useApp } from '../lib/store';
import type { Badge as BadgeType, LeaderboardEntry } from '../types';

export default function Gamification() {
  const { progress, addXp } = useApp();
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.gamifyBadges().then((p) => setBadges(p.badges)).catch(() => setBadges([])),
      api.gamifyLeaderboard(10).then((p) => setLeaderboard(p.leaderboard)).catch(() => setLeaderboard([])),
    ]).finally(() => setLoading(false));
  }, []);

  const award = () => {
    api.gamifyXp({ userId: 'guest', amount: 25, reason: 'manual-bonus' }).then((result) => {
      setBadges(result.badges);
      if (addXp) addXp(result.xp - progress.xp);
    });
  };

  if (loading) return <div className="p-6 text-center text-muted">Loading gamification…</div>;

  const earnedIds = new Set((progress.badges || []).map((b) => b.id));

  return (
    <div className="space-y-4">
      <SectionHeader title="Gamification" description="XP, badges, streak — ClassX engagement layer"/>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="XP" value={progress.xp.toLocaleString()} icon={<Zap size={20} className="text-amber-400"/>}/>
        <Stat label="Streak" value={progress.streak} icon={<Flame size={20} className="text-orange-500"/>}/>
        <Stat label="Badges" value={progress.badges?.length || 0} icon={<BadgeIcon size={20} className="text-purple-400"/>}/>
      </div>
      <Card>
        <SectionHeader title="Badges" description="Unlocked by completing lessons, practice, mocks"/>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {badges.map((badge) => {
            const earned = earnedIds.has(badge.id);
            return (
              <Card key={badge.id} className={earned ? 'border-amber-500/30 bg-amber-500/10' : 'border-gray-700/30'} style={{ height: 120 }}>
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <BadgeIcon size={26} className={earned ? 'text-amber-500' : 'text-gray-500'}/>
                  <Badge tone={earned ? 'neutral' : 'neutral'} className="text-xs w-full">{badge.name}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" onClick={award}>+25 XP (demo)</Button>
        </div>
      </Card>
      <Card>
        <SectionHeader title="Leaderboard" description="Top learners this week (class scope, opt-in)"/>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-muted">
              <th className="pb-2">#</th><th className="pb-2">Learner</th><th className="pb-2">XP</th><th className="pb-2">Streak</th><th className="pb-2">Chapters</th><th className="pb-2">Badges</th>
            </tr></thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry.userId} className="border-b hover:bg-gray-800/30">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2 font-medium">{entry.userId}</td>
                  <td className="py-2">{entry.xp.toLocaleString()}</td>
                  <td className="py-2">{entry.streak}</td>
                  <td className="py-2">{entry.completedChapters}</td>
                  <td className="py-2">{entry.badges}</td>
                </tr>
              ))}
              {!leaderboard.length && <tr><td colSpan={6} className="py-4 text-center text-muted">No learners yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
