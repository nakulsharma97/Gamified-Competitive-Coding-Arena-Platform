import { useEffect, useMemo, useState } from 'react';
import { Calendar, Medal, Shield, Swords, TrendingUp } from 'lucide-react';

import { Avatar, Badge, Button, Card, Pill, Spinner } from '@codeslam/ui';

import { navigateTo } from './navigation';

type PublicProfileResponse = {
  profile: {
    id: string;
    username: string;
    eloRating: number;
    rank: string;
    preferredLanguages: string[];
    interests: string[];
  };
  badges: Array<{ id: string; name: string; description?: string; icon?: string | null }>;
  topicStrengths: Record<string, number>;
  eloHistory: Array<{ id: string; createdAt: string; eloBefore: number; eloAfter: number; matchId?: string | null }>;
  recentMatches: Array<{
    id: string;
    opponentUsername?: string;
    result?: string;
    status?: string;
    eloChange?: number;
    createdAt?: string;
    problem?: { title?: string; difficulty?: string };
  }>;
};

function compactDate(input?: string): string {
  if (!input) {
    return '—';
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function buildActivityCalendar(matches: PublicProfileResponse['recentMatches']): Array<{ date: string; count: number }> {
  const byDay = new Map<string, number>();
  for (const match of matches) {
    if (!match.createdAt) {
      continue;
    }
    const key = new Date(match.createdAt).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const days: Array<{ date: string; count: number }> = [];
  for (let i = 139; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: byDay.get(key) ?? 0 });
  }

  return days;
}

function eloPath(points: PublicProfileResponse['eloHistory']): string {
  if (points.length === 0) {
    return '0,76 300,76';
  }
  const width = 300;
  const height = 88;
  const values = points.map((point) => point.eloAfter);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.eloAfter - min) / range) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function ProfilePage({ username }: { username: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);

  useEffect(() => {
    document.title = `${username} | CodeSlam Profile`;
  }, [username]);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          credentials: 'include',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('profile unavailable');
        }

        const json = (await response.json()) as PublicProfileResponse;
        setProfile(json);
      } catch {
        setError('Could not load this public profile.');
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [username]);

  const topicTiles = useMemo(() => {
    if (!profile) {
      return [] as Array<{ topic: string; score: number; intensity: number }>;
    }

    const entries = Object.entries(profile.topicStrengths ?? {}).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, score]) => score));
    return entries.map(([topic, score]) => ({ topic, score, intensity: Math.round((score / max) * 100) }));
  }, [profile]);

  const activity = useMemo(() => buildActivityCalendar(profile?.recentMatches ?? []), [profile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-100">
        <Spinner label="Loading profile" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] p-4 text-slate-100">
        <Card className="max-w-xl text-center" elevated>
          <h1 className="text-2xl font-bold">Profile unavailable</h1>
          <p className="mt-3 text-slate-300">{error ?? 'This profile does not exist.'}</p>
          <div className="mt-6">
            <Button onClick={() => navigateTo('/leaderboard')}>Go to leaderboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  const line = eloPath(profile.eloHistory);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.14),_transparent_30%),linear-gradient(180deg,#030712_0%,#050816_55%,#020617_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card elevated>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <Avatar name={profile.profile.username} size={72} status="online" />
              <div>
                <h1 className="text-3xl font-black text-white">{profile.profile.username}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{profile.profile.rank}</Badge>
                  <Pill tone="success">{profile.profile.eloRating} ELO</Pill>
                  <Pill tone="secondary">Public Profile</Pill>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigateTo('/leaderboard')}>Leaderboard</Button>
              <Button onClick={() => navigateTo('/dashboard')}>Dashboard</Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card elevated>
            <div className="flex items-center gap-2 text-slate-200">
              <Medal className="h-4 w-4 text-amber-300" />
              <h2 className="text-lg font-semibold">Badges</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {profile.badges.length === 0 ? <div className="text-sm text-slate-400">No badges unlocked yet.</div> : null}
              {profile.badges.map((badge) => (
                <div key={badge.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-sm font-semibold text-white">{badge.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{badge.description ?? 'Achievement unlocked'}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card elevated>
            <div className="flex items-center gap-2 text-slate-200">
              <Shield className="h-4 w-4 text-cyan-300" />
              <h2 className="text-lg font-semibold">Topic Heatmap</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {topicTiles.length === 0 ? <div className="text-sm text-slate-400">No topic data yet.</div> : null}
              {topicTiles.map((tile) => (
                <div key={tile.topic} className="rounded-xl border border-white/10 p-3" style={{ background: `linear-gradient(180deg, rgba(34,211,238,${Math.max(0.12, tile.intensity / 120)}), rgba(15,23,42,0.6))` }}>
                  <div className="text-sm font-semibold text-white">{tile.topic}</div>
                  <div className="mt-1 text-xs text-slate-200">Strength {tile.score}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card elevated>
            <div className="flex items-center gap-2 text-slate-200">
              <TrendingUp className="h-4 w-4 text-violet-300" />
              <h2 className="text-lg font-semibold">ELO History</h2>
            </div>
            <svg viewBox="0 0 300 92" className="mt-4 h-[120px] w-full">
              <polyline points={line} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Card>

          <Card elevated>
            <div className="flex items-center gap-2 text-slate-200">
              <Calendar className="h-4 w-4 text-emerald-300" />
              <h2 className="text-lg font-semibold">Activity Calendar</h2>
            </div>
            <div className="mt-4 grid grid-cols-20 gap-1">
              {activity.map((cell) => {
                const alpha = Math.min(0.95, 0.12 + cell.count * 0.16);
                return <div key={cell.date} title={`${cell.date}: ${cell.count} matches`} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: `rgba(52,211,153,${cell.count === 0 ? 0.08 : alpha})` }} />;
              })}
            </div>
          </Card>
        </div>

        <Card elevated>
          <div className="flex items-center gap-2 text-slate-200">
            <Swords className="h-4 w-4 text-rose-300" />
            <h2 className="text-lg font-semibold">Match History</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.24em] text-slate-400">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Problem</th>
                  <th className="py-2">Opponent</th>
                  <th className="py-2">Result</th>
                  <th className="py-2">ELO</th>
                </tr>
              </thead>
              <tbody>
                {profile.recentMatches.map((match) => (
                  <tr key={match.id} className="border-t border-white/10">
                    <td className="py-3 text-slate-300">{compactDate(match.createdAt)}</td>
                    <td className="py-3 text-white">{match.problem?.title ?? 'Arena Problem'}</td>
                    <td className="py-3 text-slate-200">{match.opponentUsername ?? '—'}</td>
                    <td className="py-3">
                      <Badge tone={match.result === 'WIN' ? 'success' : match.result === 'LOSS' ? 'danger' : 'warning'}>{match.result ?? 'DRAW'}</Badge>
                    </td>
                    <td className="py-3 font-semibold text-white">{match.eloChange == null ? '—' : `${match.eloChange >= 0 ? '+' : ''}${match.eloChange}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
