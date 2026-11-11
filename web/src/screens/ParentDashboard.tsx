import { useEffect, useState } from 'react';
import { Users, ShieldCheck, Clock, Activity } from 'lucide-react';
import { Badge, Button, Card, SectionHeader, Stat } from '../components/ui';
import { api } from '../api';
import type { ParentView } from '../types';

export default function ParentDashboard() {
  const [childId, setChildId] = useState('guest');
  const [parent, setParent] = useState<ParentView | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.parentView(childId).then((p) => { setParent(p.parent); setLoading(false); }).catch(() => { setLoading(false); });
  };

  useEffect(() => { load(); }, [childId]);

  return (
    <div className="space-y-4">
      <SectionHeader title="Parent Dashboard" description="Read-only view of your child's ClassX progress"/>
      <div className="flex gap-2 items-end">
        <input
          className="border border-gray-700 rounded px-3 py-2 bg-gray-900 text-white focus:ring-2 focus:ring-blue-500"
          placeholder="Child user id (default: guest)"
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
        />
        <Button onClick={load}>View progress</Button>
        <Button variant="ghost" onClick={() => api.parentLink(childId).then(() => {})}>Link parent</Button>
      </div>
      {loading ? (
        <div className="p-6 text-center text-muted">Loading…</div>
      ) : parent ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Child XP" value={parent.xp.toLocaleString()} icon={<Activity size={20} className="text-blue-400"/>}/>
            <Stat label="Streak" value={parent.streak} icon={<Clock size={20} className="text-orange-500"/>}/>
            <Stat label="Chapters" value={parent.completedChapters} icon={<BookIcon size={20} className="text-green-400"/>}/>
          </div>
          <Card>
            <SectionHeader title="Recent exams" description="Last 10 attempts"/>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-muted"><th className="pb-2">Subject</th><th className="pb-2">Score</th><th className="pb-2">Total</th><th className="pb-2">At</th></tr></thead>
                <tbody>
                  {parent.exams.map((exam, i) => (
                    <tr key={i} className="border-b hover:bg-gray-800/30">
                      <td className="py-2">{exam.subjectId}</td>
                      <td className="py-2 font-medium">{exam.score}</td>
                      <td className="py-2">{exam.total}</td>
                      <td className="py-2 text-muted text-xs">{new Date(exam.at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {!parent.exams.length && <tr><td colSpan={4} className="py-4 text-center text-muted">No exams yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <SectionHeader title="Badges earned" description={parent.badges.length ? `${parent.badges.length} badge(s)` : 'No badges yet'}/>
            <div className="flex gap-2 flex-wrap">
              {parent.badges.map((b) => (
                <Badge key={b.id} tone="neutral" className="bg-amber-500/10 border-amber-500/30 text-amber-400">{b.name}</Badge>
              ))}
              {!parent.badges.length && <span className="text-muted">None yet.</span>}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function BookIcon(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} className="w-5 h-5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor"/>
  </svg>;
}
