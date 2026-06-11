import { useEffect, useMemo, useState } from 'react';
import { Award, ChevronLeft, ChevronRight, Crown, Gift, Trophy } from 'lucide-react';

import { Avatar, Badge, Button, Card, Pill, Spinner } from '@codeslam/ui';

import { navigateTo } from './navigation';

type LeaderboardEntry = {
  rankPosition: number;
  userId: string;
  username: string;
  eloRating: number;
  rank: string;
};

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  totalUsers: number;
  currentUserRankPosition: number | null;
};

type CurrentUserResponse = {
  profile: {
    id: string;
    username: string;
    eloRating: number;
    rank: string;
  };
};

const pageSize = 15;

const rewardStrip = [
  { title: 'Top 1', reward: 'Champion frame + 1000 gems', tone: 'bg-amber-500/12 border-amber-300/30 text-amber-100' },
  { title: 'Top 10', reward: 'Elite badge + 300 gems', tone: 'bg-cyan-500/12 border-cyan-300/30 text-cyan-100' },
  { title: 'Top 50', reward: 'Season banner + 100 gems', tone: 'bg-violet-500/12 border-violet-300/30 text-violet-100' },
];

function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<LeaderboardResponse | null>(null);
  const [podium, setPodium] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<CurrentUserResponse['profile'] | null>(null);

  useEffect(() => {
    document.title = 'Leaderboard | CodeSlam';
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [tableRes, podiumRes, meRes] = await Promise.all([
          fetch(`/api/leaderboard?page=${page}&size=${pageSize}`, { credentials: 'include', signal: controller.signal }),
          fetch('/api/leaderboard?page=0&size=3', { credentials: 'include', signal: controller.signal }),
          fetch('/api/users/me', { credentials: 'include', signal: controller.signal }),
        ]);

        if (!tableRes.ok || !podiumRes.ok || !meRes.ok) {
          throw new Error('leaderboard load failed');
        }

        const [tableJson, podiumJson, meJson] = await Promise.all([
          tableRes.json() as Promise<LeaderboardResponse>,
          podiumRes.json() as Promise<LeaderboardResponse>,
          meRes.json() as Promise<CurrentUserResponse>,
        ]);

        setTable(tableJson);
        setPodium(podiumJson.entries ?? []);
        setMe(meJson.profile);
      } catch {
        setError('Could not load leaderboard data.');
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [page]);

  const pinnedSelf = useMemo(() => {
    if (!table || !me) {
      return null;
    }

    const inPage = table.entries.find((entry) => entry.userId === me.id);
    if (inPage) {
      return inPage;
    }

    return {
      rankPosition: table.currentUserRankPosition ?? -1,
      userId: me.id,
      username: me.username,
      eloRating: me.eloRating,
      rank: me.rank,
    };
  }, [table, me]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-100">
        <Spinner label="Loading leaderboard" />
      </div>
    );
  }

  if (error || !table || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-4 text-slate-100">
        <Card className="max-w-xl text-center" elevated>
          <h1 className="text-2xl font-bold text-white">Leaderboard unavailable</h1>
          <p className="mt-3 text-slate-300">{error ?? 'Try again shortly.'}</p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => navigateTo('/dashboard')}>Back to dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  const pages = pageCount(table.totalUsers);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_35%),linear-gradient(180deg,#04070f_0%,#050816_52%,#020617_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card elevated>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-amber-300">Season leaderboard</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Climb the podium</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigateTo('/dashboard')}>Dashboard</Button>
              <Button onClick={() => navigateTo(`/u/${me.username}`)}>My Profile</Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {podium.map((entry, index) => (
            <Card key={entry.userId} elevated className={index === 0 ? 'md:order-2' : index === 1 ? 'md:order-1' : 'md:order-3'}>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">#{entry.rankPosition}</div>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={entry.username} size={56} status={index === 0 ? 'online' : 'idle'} />
                <div>
                  <div className="font-semibold text-white">{entry.username}</div>
                  <div className="text-sm text-slate-300">{entry.eloRating} ELO</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge tone={index === 0 ? 'warning' : index === 1 ? 'neutral' : 'primary'}>
                  {index === 0 ? <Crown className="h-3.5 w-3.5" /> : index === 1 ? <Award className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
                  {entry.rank}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <Card elevated>
          <div className="flex items-center gap-2 text-slate-200">
            <Gift className="h-4 w-4 text-violet-300" />
            <h2 className="text-lg font-semibold">Season Rewards</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {rewardStrip.map((reward) => (
              <div key={reward.title} className={`rounded-xl border px-4 py-3 ${reward.tone}`}>
                <div className="text-sm font-semibold">{reward.title}</div>
                <div className="mt-1 text-xs">{reward.reward}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card elevated>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Global Ranking</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" leadingIcon={<ChevronLeft className="h-4 w-4" />} disabled={page <= 0} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
                Prev
              </Button>
              <Pill tone="neutral">Page {page + 1} / {pages}</Pill>
              <Button size="sm" variant="secondary" trailingIcon={<ChevronRight className="h-4 w-4" />} disabled={page + 1 >= pages} onClick={() => setPage((prev) => Math.min(pages - 1, prev + 1))}>
                Next
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.24em] text-slate-400">
                <tr>
                  <th className="py-2">Rank</th>
                  <th className="py-2">Player</th>
                  <th className="py-2">Tier</th>
                  <th className="py-2">ELO</th>
                </tr>
              </thead>
              <tbody>
                {table.entries.map((entry) => {
                  const self = entry.userId === me.id;
                  return (
                    <tr key={entry.userId} className={`border-t border-white/10 ${self ? 'bg-cyan-400/10' : ''}`}>
                      <td className="py-3 font-semibold text-white">#{entry.rankPosition}</td>
                      <td className="py-3 text-slate-200">{entry.username}</td>
                      <td className="py-3"><Badge tone={self ? 'primary' : 'neutral'}>{entry.rank}</Badge></td>
                      <td className="py-3 text-white">{entry.eloRating}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pinnedSelf ? (
            <div className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              <div className="font-semibold">Pinned: {pinnedSelf.username}</div>
              <div className="mt-1">Rank #{pinnedSelf.rankPosition > 0 ? pinnedSelf.rankPosition : 'N/A'} • {pinnedSelf.eloRating} ELO • {pinnedSelf.rank}</div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
