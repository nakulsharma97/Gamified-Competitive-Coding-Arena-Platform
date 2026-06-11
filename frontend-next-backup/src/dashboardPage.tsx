import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowRight, Bell, CalendarDays, Flame, Star, Target, Trophy, TrendingUp } from 'lucide-react';
import { Client } from '@stomp/stompjs';

import { Avatar, Badge, Button, Card, HPBar, Pill, Spinner, Timer } from '@codeslam/ui';

import { useApiClient } from './api';
import { navigateTo } from './navigation';

type UserMeResponse = {
  profile: {
    id: string;
    username: string;
    eloRating: number;
    rankTier: string;
    preferredLanguages: string[];
    interests: string[];
  };
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    badgesEarned: number;
    rankPosition: number;
  };
};

type EloHistoryPoint = {
  id: string;
  createdAt: string;
  eloBefore: number;
  eloAfter: number;
  matchId: string | null;
};

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

type MatchSummary = {
  id: string;
  problem?: { title?: string };
  opponentUsername?: string;
  result?: string;
  status?: string;
  player1Hp?: number;
  player2Hp?: number;
  eloChange?: number;
  createdAt?: string;
};

type SubmissionDto = {
  id: string;
  matchId: string | null;
  userId: string | null;
  code: string;
  language: string;
  verdict: string;
  runtimeMs: number | null;
  memoryMb: number | null;
  passedCases: number | null;
  totalCases: number | null;
};

type ProblemDetails = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  constraints: string | null;
  battleUseCount: number;
  visibleTestCases: Array<{ input: string; expectedOutput: string }>;
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
};

type TournamentSummary = {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  maxParticipants: number | null;
  prizeDescription: string | null;
  entryCount: number | null;
};

type StatsSnapshot = {
  onlinePlayers: number;
  matchesToday: number;
  totalProblems: number;
  totalUsers: number;
};

type DashboardData = {
  user: UserMeResponse;
  leaderboard: LeaderboardResponse;
  eloHistory: EloHistoryPoint[];
  recentMatches: MatchSummary[];
  recentSubmissions: SubmissionDto[];
  dailyProblem: ProblemDetails;
  tournaments: TournamentSummary[];
  globalStats: StatsSnapshot;
};

const fallbackTournaments: TournamentSummary[] = [
  {
    id: 't1',
    name: 'Nebula Cup',
    status: 'ACTIVE',
    startDate: null,
    endDate: null,
    maxParticipants: 256,
    prizeDescription: 'Season badge + sponsor credit',
    entryCount: 148,
  },
  {
    id: 't2',
    name: 'Weekend Ladder Sprint',
    status: 'ACTIVE',
    startDate: null,
    endDate: null,
    maxParticipants: 128,
    prizeDescription: 'XP bonus and avatar frame',
    entryCount: 91,
  },
  {
    id: 't3',
    name: 'Open Arena Qualifier',
    status: 'ACTIVE',
    startDate: null,
    endDate: null,
    maxParticipants: 512,
    prizeDescription: 'Grandmaster seeding',
    entryCount: 301,
  },
];

const cachedFetch = new Map<string, unknown>();

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatRuntime(runtimeMs: number | null): string {
  if (runtimeMs == null || Number.isNaN(runtimeMs)) {
    return '—';
  }

  if (runtimeMs >= 1000) {
    return `${(runtimeMs / 1000).toFixed(runtimeMs >= 10000 ? 0 : 2)}s`;
  }

  return `${runtimeMs}ms`;
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta}`;
}

function getTierThresholds(rank: string): { floor: number; ceiling: number; nextTier: string } {
  const tiers = [
    { name: 'Bronze', floor: 0, ceiling: 999 },
    { name: 'Silver', floor: 1000, ceiling: 1299 },
    { name: 'Gold', floor: 1300, ceiling: 1599 },
    { name: 'Platinum', floor: 1600, ceiling: 1899 },
    { name: 'Diamond', floor: 1900, ceiling: 2199 },
    { name: 'Master', floor: 2200, ceiling: 2599 },
    { name: 'Grandmaster', floor: 2600, ceiling: 4000 },
  ];

  const currentIndex = Math.max(
    0,
    tiers.findIndex((tier) => tier.name.toLowerCase() === rank.toLowerCase())
  );
  const currentTier = tiers[currentIndex] ?? tiers[0];
  const nextTier = tiers[Math.min(currentIndex + 1, tiers.length - 1)] ?? currentTier;

  return {
    floor: currentTier.floor,
    ceiling: currentTier.ceiling,
    nextTier: nextTier.name,
  };
}

function computeStreak(matches: MatchSummary[]): number {
  let streak = 0;
  for (const match of matches) {
    if (match.result === 'WIN') {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function averageRuntime(submissions: SubmissionDto[]): number | null {
  const runtimes = submissions.map((submission) => submission.runtimeMs).filter((runtime): runtime is number => typeof runtime === 'number' && runtime > 0);
  if (runtimes.length === 0) {
    return null;
  }

  return Math.round(runtimes.reduce((sum, runtime) => sum + runtime, 0) / runtimes.length);
}

function buildTrendPath(points: EloHistoryPoint[]): { line: string; area: string; lastDelta: number; current: number } {
  if (points.length === 0) {
    return { line: '0,60 320,60', area: 'M 0 60 L 320 60 L 320 60 L 0 60 Z', lastDelta: 0, current: 0 };
  }

  const values = points.map((point) => point.eloAfter);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const width = 320;
  const height = 120;

  const plotPoints = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const normalized = (point.eloAfter - min) / range;
    const y = height - 14 - normalized * 84;
    return { x, y };
  });

  const line = plotPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const area = `M 0 ${height - 8} ${plotPoints.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')} L 320 ${height - 8} Z`;
  const lastDelta = points[points.length - 1].eloAfter - points[0].eloBefore;
  return { line, area, lastDelta, current: points[points.length - 1].eloAfter };
}

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { expiresAt: number; value: T };
    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeCache<T>(key: string, value: T, ttlMs: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify({ expiresAt: Date.now() + ttlMs, value }));
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    signal,
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  return response.json() as Promise<T>;
}

async function cachedJson<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const cached = readCache<T>(key);
  if (cached) {
    return cached;
  }

  const value = await loader();
  writeCache(key, value, ttlMs);
  return value;
}

function EloMiniChart({ points }: { points: EloHistoryPoint[] }) {
  const trend = useMemo(() => buildTrendPath(points), [points]);
  const hasPoints = points.length > 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.95))] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.32em] text-slate-400">ELO trend</div>
          <div className="mt-1 text-lg font-semibold text-white">Last 30 days</div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${trend.lastDelta >= 0 ? 'bg-emerald-400/15 text-emerald-100' : 'bg-rose-400/15 text-rose-100'}`}>
          {formatDelta(trend.lastDelta)} ELO
        </div>
      </div>
      <svg viewBox="0 0 320 120" className="mt-4 h-30 w-full">
        <defs>
          <linearGradient id="eloLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="eloArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {hasPoints ? <path d={trend.area} fill="url(#eloArea)" /> : null}
        {hasPoints ? <polyline points={trend.line} fill="none" stroke="url(#eloLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {hasPoints ? <circle cx={320} cy={Math.max(18, 104 - (trend.current % 84))} r="4" fill="#f8fafc" /> : null}
        {!hasPoints ? <text x="16" y="62" fill="#94a3b8" fontSize="14">No Elo history yet.</text> : null}
      </svg>
    </div>
  );
}

export function DashboardPage() {
  const api = useApiClient();
  const [data, setData] = useState<DashboardData | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'cached'>('cached');
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState<'idle' | 'searching' | 'canceling'>('idle');
  const [matchmakingError, setMatchmakingError] = useState<string | null>(null);
  const refreshTimeout = useRef<number | null>(null);
  const matchmakingClientRef = useRef<Client | null>(null);

  useEffect(() => {
    document.title = 'Dashboard | CodeSlam';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let client: Client | undefined;

    const load = async () => {
      if (!api.token) {
        return;
      }

      const [user, leaderboard, eloHistory, recentMatches, recentSubmissions, dailyProblem, tournaments, globalStats] = await Promise.all([
        cachedJson<UserMeResponse>('dashboard:user', 30000, () => api.get<UserMeResponse>('/api/users/me', { signal: controller.signal })),
        cachedJson<LeaderboardResponse>('dashboard:leaderboard', 60000, () => api.get<LeaderboardResponse>('/api/leaderboard?page=0&size=8', { signal: controller.signal })),
        cachedJson<EloHistoryPoint[]>('dashboard:elo-history', 30000, () => api.get<EloHistoryPoint[]>('/api/users/me/elo-history?days=30', { signal: controller.signal })),
        cachedJson<MatchSummary[]>('dashboard:recent-matches', 30000, () => api.get<MatchSummary[]>('/api/matches/history', { signal: controller.signal })),
        cachedJson<SubmissionDto[]>('dashboard:recent-submissions', 30000, () => api.get<SubmissionDto[]>('/api/submissions/me/recent', { signal: controller.signal })),
        cachedJson<ProblemDetails>('dashboard:daily-problem', 300000, () => api.get<ProblemDetails>('/api/problems/daily', { signal: controller.signal })),
        cachedJson<TournamentSummary[]>('dashboard:tournaments', 60000, () => api.get<TournamentSummary[]>('/api/tournaments/active', { signal: controller.signal })),
        cachedJson<StatsSnapshot>('dashboard:stats', 30000, () => api.get<StatsSnapshot>('/api/stats', { signal: controller.signal })),
      ]);

      if (!active) {
        return;
      }

      setData({
        user,
        leaderboard,
        eloHistory,
        recentMatches,
        recentSubmissions,
        dailyProblem,
        tournaments: tournaments.length > 0 ? tournaments : fallbackTournaments,
        globalStats,
      });
      setLiveCount(globalStats.onlinePlayers);

      const latestMatchId = recentMatches[0]?.id;
      if (!latestMatchId || typeof window === 'undefined') {
        return;
      }

      setConnectionState('connecting');
      client = new Client({
        webSocketFactory: () => new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`),
        connectHeaders: api.token ? { Authorization: `Bearer ${api.token}` } : {},
        reconnectDelay: 4000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          if (!active) {
            return;
          }

          setConnectionState('connected');
          client?.subscribe(`/topic/matches/${latestMatchId}`, () => {
            if (!active) {
              return;
            }

            void api.get<StatsSnapshot>('/api/stats')
              .then((nextStats) => {
                if (!active) {
                  return;
                }

                setLiveCount(nextStats.onlinePlayers);
                writeCache('dashboard:stats', nextStats, 30000);
              })
              .catch(() => undefined);
          });
        },
      });

      client.activate();
    };

    void load().catch(() => {
      if (!active) {
        return;
      }

      setData(null);
      setConnectionState('cached');
    });

    return () => {
      active = false;
      controller.abort();
      if (refreshTimeout.current) {
        window.clearTimeout(refreshTimeout.current);
      }
      void client?.deactivate();
    };
  }, [api]);

  const handleStartMatch = async () => {
    if (!data || !api.token || matchmakingStatus === 'searching') {
      return;
    }

    setMatchmakingError(null);
    setMatchmakingStatus('searching');

    try {
      await api.post('/api/queue/join');
      setMatchmakingOpen(true);

      const client = new Client({
        webSocketFactory: () => new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`),
        connectHeaders: { Authorization: `Bearer ${api.token}` },
        reconnectDelay: 0,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          matchmakingClientRef.current = client;
          client.subscribe(`/topic/user/${data.user.profile.id}/matchFound`, (message) => {
            try {
              const parsed = JSON.parse(message.body) as { matchId: string; opponentUsername: string; problemTitle: string };
              void api.del('/api/queue/leave').catch(() => undefined);
              setMatchmakingOpen(false);
              setMatchmakingStatus('idle');
              void client.deactivate();
              navigateTo(`/arena?matchId=${parsed.matchId}`);
            } catch {
              setMatchmakingError('Received an invalid match payload.');
            }
          });
        },
        onDisconnect: () => {
          setMatchmakingStatus('idle');
        },
        onWebSocketClose: () => {
          setMatchmakingStatus('idle');
        },
        onStompError: () => {
          setMatchmakingError('Matchmaking socket failed to connect.');
          setMatchmakingStatus('idle');
        },
      });

      matchmakingClientRef.current = client;
      client.activate();
    } catch {
      setMatchmakingError('Failed to join the queue.');
      setMatchmakingStatus('idle');
      setMatchmakingOpen(false);
    }
  };

  const handleCancelMatchmaking = async () => {
    setMatchmakingStatus('canceling');
    try {
      await api.del('/api/queue/leave');
    } catch {
      setMatchmakingError('Could not leave the queue cleanly.');
    } finally {
      setMatchmakingOpen(false);
      setMatchmakingStatus('idle');
      await matchmakingClientRef.current?.deactivate();
      matchmakingClientRef.current = null;
    }
  };

  const statsRow = useMemo(() => {
    if (!data) {
      return [];
    }

    const matchesPlayed = data.user.stats.matchesPlayed || 0;
    const winRate = matchesPlayed > 0 ? (data.user.stats.wins / matchesPlayed) * 100 : 0;
    const streak = computeStreak(data.recentMatches);
    const avgRuntime = averageRuntime(data.recentSubmissions);

    return [
      { label: 'Matches', value: `${matchesPlayed}`, tone: 'primary' as const },
      { label: 'Win rate', value: formatPercent(winRate), tone: 'success' as const },
      { label: 'Avg runtime', value: formatRuntime(avgRuntime), tone: 'secondary' as const },
      { label: 'Streak', value: streak > 0 ? `${streak}W` : '—', tone: 'warning' as const },
    ];
  }, [data]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <Spinner label="Loading dashboard" />
        </div>
      </div>
    );
  }

  const rankThresholds = getTierThresholds(data.user.profile.rankTier);
  const currentElo = data.user.profile.eloRating;
  const progress = Math.max(0, Math.min(100, ((currentElo - rankThresholds.floor) / Math.max(1, rankThresholds.ceiling - rankThresholds.floor)) * 100));
  const recentMatches = data.recentMatches.slice(0, 6);
  const notifications = [
    {
      title: 'Daily challenge ready',
      body: `${data.dailyProblem.title} is live in the queue. ${data.dailyProblem.topics.slice(0, 2).join(' · ') || 'Warmup problem'}`,
      icon: CalendarDays,
    },
    {
      title: 'Rank watch',
      body: `You are ${formatPercent(progress)} toward ${rankThresholds.nextTier}.`,
      icon: Trophy,
    },
    {
      title: 'Match momentum',
      body: `Recent activity is ${connectionState === 'connected' ? 'streaming live' : 'cached from the last sync'}.`,
      icon: Activity,
    },
  ];

  const activeTournaments = data.tournaments.length > 0 ? data.tournaments : fallbackTournaments;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,#020617_0%,#050816_45%,#030712_100%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-350 items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" className="flex items-center gap-3 text-left" onClick={() => navigateTo('/')}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-white/5">
              <Target className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-[0.28em] text-white">CODESLAM</div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Dashboard</div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <Badge tone="success" dot>
              {liveCount != null ? `${liveCount.toLocaleString()} live` : 'WS connected'}
            </Badge>
            <Pill tone="neutral">{data.user.profile.rankTier}</Pill>
            <Avatar name={data.user.profile.username} size={44} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card elevated className="overflow-hidden rounded-[2rem] p-0">
            <div className="relative overflow-hidden p-6 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(139,92,246,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(34,211,238,0.16),_transparent_32%)]" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <Badge tone="primary" dot className="w-fit border-violet-400/20 bg-violet-500/10 text-violet-100">
                    Match CTA banner
                  </Badge>
                  <h1 className="mt-4 text-4xl font-black leading-[0.95] text-white sm:text-5xl">You’re in. Start the next ranked fight.</h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                    Your dashboard syncs user stats every 30 seconds, leaderboard data every 60 seconds, and refreshes live activity when websocket match updates arrive.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button size="lg" className="animate-pulse" trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={() => void handleStartMatch()}>
                      Start a match
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => navigateTo('/onboarding')}>
                      Review onboarding
                    </Button>
                  </div>
                </div>

                <div className="grid min-w-72.5 gap-3">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Live count</span>
                      <span className="text-xs uppercase tracking-[0.28em] text-slate-500">WS synced</span>
                    </div>
                    <div className="mt-3 text-4xl font-black text-white">{liveCount != null ? liveCount.toLocaleString() : '—'}</div>
                    <div className="mt-2 text-sm text-slate-400">Current active players across the arena.</div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Next queue window</span>
                      <Flame className="h-4 w-4 text-cyan-300" />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Timer seconds={74} label="Queue" compact />
                      <span className="text-sm text-slate-400">Open a match and join the ladder.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-5">
            <EloMiniChart points={data.eloHistory} />
            <Card elevated className="rounded-3xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Rank progress</div>
                    <div className="mt-1 text-lg font-semibold text-white">{data.user.profile.rankTier}</div>
                </div>
                <Pill tone="primary">#{data.user.stats.rankPosition}</Pill>
              </div>
              <div className="mt-5">
                <HPBar value={progress} max={100} label="Tier progress" />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                <span>{currentElo} ELO</span>
                <span>Next: {rankThresholds.nextTier}</span>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {statsRow.map((stat) => (
            <Card key={stat.label} elevated className="rounded-3xl p-5">
              <div className="text-xs uppercase tracking-[0.28em] text-slate-400">{stat.label}</div>
              <div className="mt-3 text-3xl font-black text-white">{stat.value}</div>
              <div className={`mt-4 h-1.5 rounded-full ${stat.tone === 'primary' ? 'bg-violet-400/80' : stat.tone === 'success' ? 'bg-emerald-400/80' : stat.tone === 'secondary' ? 'bg-cyan-400/80' : 'bg-amber-400/80'}`} />
            </Card>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Card elevated className="rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Recent matches</div>
                <div className="mt-1 text-xl font-semibold text-white">Latest arena results</div>
              </div>
              <Badge tone="neutral">{recentMatches.length} loaded</Badge>
            </div>

            <div className="mt-5 space-y-3">
              {recentMatches.map((match) => {
                const won = match.result === 'WIN';
                const isDraw = match.result === 'DRAW';
                return (
                  <div key={match.id} className="flex items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4">
                    <Avatar name={match.opponentUsername ?? 'Match'} size={48} status={won ? 'online' : 'busy'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="truncate text-sm font-semibold text-white">{match.problem?.title ?? 'Battle match'}</div>
                        <Badge tone={won ? 'success' : isDraw ? 'neutral' : 'warning'}>{match.result ?? 'RESULT'}</Badge>
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-400">vs {match.opponentUsername ?? 'Unknown'} · {match.status ?? 'COMPLETED'} · {formatDelta(match.eloChange ?? 0)} ELO</div>
                    </div>
                    <div className="hidden text-right text-sm text-slate-400 sm:block">
                      <div>{match.player1Hp ?? 0} / {match.player2Hp ?? 0} HP</div>
                      <div>{match.createdAt ? new Date(match.createdAt).toLocaleDateString() : 'Today'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-5">
            <Card elevated className="rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Notifications</div>
                  <div className="mt-1 text-xl font-semibold text-white">What needs attention</div>
                </div>
                <Bell className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-5 space-y-3">
                {notifications.map((notification) => {
                  const Icon = notification.icon;
                  return (
                    <div key={notification.title} className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/60 text-cyan-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{notification.title}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-400">{notification.body}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card elevated className="rounded-[1.75rem] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Daily challenge</div>
                  <div className="mt-1 text-xl font-semibold text-white">{data.dailyProblem.title}</div>
                </div>
                <Badge tone="primary">Today</Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">{data.dailyProblem.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.dailyProblem.topics.slice(0, 4).map((topic) => (
                  <Pill key={topic} tone="neutral">{topic}</Pill>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Time limit</div>
                  <div className="mt-2 text-lg font-semibold text-white">{data.dailyProblem.timeLimitMs ?? 0} ms</div>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                  <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Difficulty</div>
                  <div className="mt-2 text-lg font-semibold text-white">{data.dailyProblem.difficulty}</div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <Card elevated className="rounded-[1.75rem] p-5 sm:p-6">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Leaderboard</div>
            <div className="mt-1 text-xl font-semibold text-white">Your current tier position</div>
            <div className="mt-4 space-y-3">
              {data.leaderboard.entries.slice(0, 5).map((entry) => (
                <div key={entry.userId} className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-semibold text-slate-400">#{entry.rankPosition}</span>
                    <span className="font-medium text-white">{entry.username}</span>
                    <Badge tone="neutral">{entry.rank}</Badge>
                  </div>
                  <span className="font-semibold text-cyan-200">{entry.eloRating}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card elevated className="rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Active tournaments</div>
                <div className="mt-1 text-xl font-semibold text-white">Live strips</div>
              </div>
              <Star className="h-5 w-5 text-violet-300" />
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
              {activeTournaments.map((tournament) => (
                <div key={tournament.id} className="min-w-[18rem] rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{tournament.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-500">{tournament.status}</div>
                    </div>
                    <Badge tone="primary">{tournament.entryCount ?? 0} joined</Badge>
                  </div>
                  <div className="mt-4 text-sm leading-6 text-slate-400">{tournament.prizeDescription ?? 'Prize pool live'}</div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                    <span>{tournament.maxParticipants ?? '—'} max</span>
                    <span>{tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : 'Open now'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-5">
          <Card elevated className="overflow-hidden rounded-[1.75rem] p-0">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
              <div>
                <div className="text-xs uppercase tracking-[0.32em] text-violet-300">Bottom CTA</div>
                <h2 className="mt-3 text-3xl font-black text-white">Ready for the next queue?</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Your progress, streak, and live activity are all in one place. Find a match when you’re ready to step back into ranked play.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="animate-pulse" trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={() => void handleStartMatch()}>
                  Start a match
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigateTo('/login')}>
                  Log out
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {matchmakingOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <Card elevated className="w-full max-w-md rounded-[1.75rem] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Spinner label="Searching for opponent..." />
            </div>
            <div className="mt-4 text-sm leading-7 text-slate-300">
              Your queue request is active. We’ll open the arena as soon as a valid opponent is found.
            </div>
            {matchmakingError ? <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{matchmakingError}</div> : null}
            <div className="mt-6 flex items-center gap-3">
              <Button onClick={() => void handleCancelMatchmaking()} disabled={matchmakingStatus === 'canceling'} variant="secondary">
                {matchmakingStatus === 'canceling' ? 'Canceling...' : 'Cancel'}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardPage;