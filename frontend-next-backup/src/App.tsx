import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Crown, Flame, Globe2, Medal, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Client } from '@stomp/stompjs';

import { Avatar, Badge, Button, Card, HPBar, Pill, Timer } from '@codeslam/ui';

import { AuthCallbackPage } from './AuthCallbackPage';
import { LoginPage, SignupPage } from './authPages';
import { navigateTo } from './navigation';

const OnboardingPage = lazy(() => import('./OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const DashboardPage = lazy(() => import('./dashboardPage'));
const ArenaPage = lazy(() => import('./ArenaPage'));
const MatchResultPage = lazy(() => import('./matchResultPage').then((module) => ({ default: module.MatchResultPage })));
const ProfilePage = lazy(() => import('./profilePage').then((module) => ({ default: module.ProfilePage })));
const LeaderboardPage = lazy(() => import('./leaderboardPage').then((module) => ({ default: module.LeaderboardPage })));
const ProblemsPage = lazy(() => import('./problemsPage').then((module) => ({ default: module.ProblemsPage })));
const ProblemSolvePage = lazy(() => import('./problemSolvePage').then((module) => ({ default: module.ProblemSolvePage })));

type StatsSnapshot = {
  onlinePlayers: number;
  matchesToday: number;
  totalProblems: number;
  totalUsers: number;
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

type MatchResult = {
  matchId: string;
  verdict: string;
  runtimeMs?: number;
  memoryMb?: number;
  passedCases?: number;
  totalCases?: number;
  player1Hp?: number;
  player2Hp?: number;
  winnerId?: string | null;
};

type BattleFeedItem = {
  id: string;
  matchId: string;
  title: string;
  detail: string;
  result: string;
  hp1: number;
  hp2: number;
  tone: 'success' | 'warning' | 'primary' | 'neutral';
  stamp: string;
};

const defaultStats: StatsSnapshot = {
  onlinePlayers: 1240,
  matchesToday: 184,
  totalProblems: 320,
  totalUsers: 18240,
};

const howItWorks = [
  {
    title: 'Queue into a tiered match',
    text: 'Pick a rank lane, enter matchmaking, and land in a mirrored battle room with balanced constraints.',
    icon: Crown,
  },
  {
    title: 'Solve under pressure',
    text: 'Code, test, and submit while the timer burns. Power-ups and live feedback keep the fight moving.',
    icon: Zap,
  },
  {
    title: 'Earn rating and rank',
    text: 'Every match changes your ladder position, unlocks tiers, and updates your streak and season stats.',
    icon: Medal,
  },
];

const featureHighlights = [
  {
    title: 'Sandboxed execution',
    text: 'Deterministic judging with isolated runtime limits, memory caps, and secure code execution.',
    icon: ShieldCheck,
  },
  {
    title: 'Real-time battle telemetry',
    text: 'Submission outcomes, HP changes, and win states stream live into the match view.',
    icon: Flame,
  },
  {
    title: 'Rank-aware matchmaking',
    text: 'Tier bands reduce stomp matches and keep the competition tight across every queue.',
    icon: Globe2,
  },
  {
    title: 'Fast feedback loops',
    text: 'Low-latency stats, immutable results, and concise post-match summaries help players improve.',
    icon: Sparkles,
  },
];

const tierLadder = [
  { name: 'Bronze', gate: '0-999 ELO', color: 'bg-stone-500/20 text-stone-200' },
  { name: 'Silver', gate: '1000-1299 ELO', color: 'bg-slate-400/20 text-slate-100' },
  { name: 'Gold', gate: '1300-1599 ELO', color: 'bg-amber-400/20 text-amber-100' },
  { name: 'Platinum', gate: '1600-1899 ELO', color: 'bg-cyan-400/20 text-cyan-100' },
  { name: 'Diamond', gate: '1900-2199 ELO', color: 'bg-sky-400/20 text-sky-100' },
  { name: 'Master', gate: '2200-2599 ELO', color: 'bg-violet-400/20 text-violet-100' },
  { name: 'Grandmaster', gate: '2600+ ELO', color: 'bg-fuchsia-400/20 text-fuchsia-100' },
];

const testimonials = [
  {
    quote:
      'The page feels like a tournament broadcast from the first frame. The live stats and battle feed make it feel active, not static.',
    name: 'Riya Sharma',
    role: 'Competitive developer',
  },
  {
    quote:
      'The rank ladder and battle telemetry are simple, readable, and fast. That balance is hard to get right.',
    name: 'Arjun Mehta',
    role: 'Team captain',
  },
  {
    quote:
      'It has the right energy for spectators: clear hierarchy, strong CTA, and enough motion to feel alive without visual noise.',
    name: 'Mina Patel',
    role: 'Creator and coach',
  },
];

const companyLogos = ['Vercel', 'Linear', 'Stripe', 'GitHub', 'OpenAI', 'Cloudflare'];

const fallbackBattleFeed: BattleFeedItem[] = [
  {
    id: 'match-1',
    matchId: 'match-1',
    title: 'NovaByte vs HexPulse',
    detail: 'Diamond arena duel · 3 solved in 01:42',
    result: 'NovaByte secured AC',
    hp1: 76,
    hp2: 18,
    tone: 'success',
    stamp: '2m ago',
  },
  {
    id: 'match-2',
    matchId: 'match-2',
    title: 'CipherRush vs QuantumFang',
    detail: 'Master bracket · runtime edge by 114ms',
    result: 'CipherRush won on tiebreak',
    hp1: 61,
    hp2: 29,
    tone: 'primary',
    stamp: '5m ago',
  },
  {
    id: 'match-3',
    matchId: 'match-3',
    title: 'EchoNova vs RiftRunner',
    detail: 'Silver ladder · close submission race',
    result: 'RiftRunner clutched last submit',
    hp1: 44,
    hp2: 12,
    tone: 'warning',
    stamp: '8m ago',
  },
];

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function getApiUrl(path: string): string {
  return path;
}

function getWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost/ws';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws`;
}

function toBattleFeedItem(match: MatchSummary): BattleFeedItem {
  const title = `${match.problem?.title ?? 'Arena match'} vs ${match.opponentUsername ?? 'Challenger'}`;
  const eloChange = match.eloChange ?? 0;
  const detail = `${match.status ?? 'COMPLETED'} · ${eloChange >= 0 ? '+' : ''}${eloChange} ELO`;
  const result = match.result ?? 'Result recorded';
  const hp1 = match.player1Hp ?? 50;
  const hp2 = match.player2Hp ?? 50;
  const tone = match.result?.toLowerCase().includes('win') ? 'success' : 'primary';

  return {
    id: match.id,
    matchId: match.id,
    title,
    detail,
    result,
    hp1,
    hp2,
    tone,
    stamp: match.createdAt ? new Date(match.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Live',
  };
}

function toLiveUpdate(result: MatchResult, existing?: BattleFeedItem): BattleFeedItem {
  const title = existing?.title ?? `Match ${result.matchId.slice(0, 8)}`;
  const detail = `${result.verdict} · ${result.passedCases ?? 0}/${result.totalCases ?? 0} cases`;
  const tone = result.winnerId ? 'success' : result.verdict === 'AC' ? 'success' : 'warning';

  return {
    id: `${result.matchId}-${Date.now()}`,
    matchId: result.matchId,
    title,
    detail,
    result: result.winnerId ? 'Winner locked' : `Verdict ${result.verdict}`,
    hp1: result.player1Hp ?? existing?.hp1 ?? 50,
    hp2: result.player2Hp ?? existing?.hp2 ?? 50,
    tone,
    stamp: 'just now',
  };
}

function LandingPage() {
  const [stats, setStats] = useState<StatsSnapshot>(defaultStats);
  const [battleFeed, setBattleFeed] = useState<BattleFeedItem[]>(fallbackBattleFeed);
  const [isScrolled, setIsScrolled] = useState(false);
  const [feedState, setFeedState] = useState<'idle' | 'live' | 'fallback'>('idle');

  const navItems = useMemo(
    () => [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Features', href: '#features' },
      { label: 'Rank ladder', href: '#ladder' },
      { label: 'Proof', href: '#proof' },
    ],
    []
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let client: Client | undefined;
    let active = true;

    fetch(getApiUrl('/api/stats'), {
      signal: controller.signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => (response.ok ? (response.json() as Promise<StatsSnapshot>) : null))
      .then((data) => {
        if (!active || !data) {
          return;
        }

        setStats({
          onlinePlayers: Number(data.onlinePlayers ?? defaultStats.onlinePlayers),
          matchesToday: Number(data.matchesToday ?? defaultStats.matchesToday),
          totalProblems: Number(data.totalProblems ?? defaultStats.totalProblems),
          totalUsers: Number(data.totalUsers ?? defaultStats.totalUsers),
        });
      })
      .catch(() => undefined);

    fetch(getApiUrl('/api/matches/history'), {
      signal: controller.signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => (response.ok ? (response.json() as Promise<MatchSummary[]>) : null))
      .then((history) => {
        if (!active || !history?.length) {
          setFeedState('fallback');
          return;
        }

        const mapped = history.slice(0, 6).map(toBattleFeedItem);
        setBattleFeed(mapped.length ? mapped : fallbackBattleFeed);
        setFeedState('live');

        const latest = history[0];
        if (!latest?.id || typeof window === 'undefined') {
          return;
        }

        client = new Client({
          webSocketFactory: () => new WebSocket(getWebSocketUrl()),
          reconnectDelay: 4000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: () => {
            client?.subscribe(`/topic/matches/${latest.id}`, (message) => {
              try {
                const result = JSON.parse(message.body) as MatchResult;
                setBattleFeed((current) => {
                  const existing = current.find((item) => item.matchId === result.matchId);
                  const next = toLiveUpdate(result, existing);
                  return [next, ...current.filter((item) => item.matchId !== result.matchId)].slice(0, 6);
                });
                setFeedState('live');
              } catch {
                setFeedState('fallback');
              }
            });
          },
        });

        client.activate();
      })
      .catch(() => {
        if (active) {
          setFeedState('fallback');
        }
      });

    return () => {
      active = false;
      controller.abort();
      void client?.deactivate();
    };
  }, []);

  const statCards = [
    { label: 'Online players', value: formatCompactNumber(stats.onlinePlayers), tone: 'primary' as const },
    { label: 'Matches today', value: formatCompactNumber(stats.matchesToday), tone: 'secondary' as const },
    { label: 'Problems', value: formatCompactNumber(stats.totalProblems), tone: 'neutral' as const },
    { label: 'Total users', value: formatCompactNumber(stats.totalUsers), tone: 'primary' as const },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_28%),linear-gradient(180deg,#030712_0%,#050816_45%,#020617_100%)] text-slate-100">
      <header className={`sticky top-0 z-50 border-b border-white/8 ${isScrolled ? 'bg-slate-950/82 backdrop-blur-xl' : 'bg-slate-950/60 backdrop-blur-lg'}`}>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-white/5 shadow-[0_0_32px_rgba(34,211,238,0.12)]">
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-[0.28em] text-white">CODESLAM</div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Battle arena platform</div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigateTo('/login')}>
              Login
            </Button>
            <Button size="sm" trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={() => navigateTo('/signup')}>
              Join arena
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pt-20">
          <div className="flex max-w-3xl flex-col justify-center">
            <Badge tone="primary" dot className="w-fit border-violet-400/20 bg-violet-500/10 text-violet-100">
              Live coding arena
            </Badge>
            <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Build faster.
              <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                Battle live.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              A static, high-performance landing page for the competitive coding arena. See live player counts, recent match results, and the ladder before you even log in.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" trailingIcon={<ArrowRight className="h-4 w-4" />}>
                Start a match
              </Button>
              <Button variant="secondary" size="lg">
                Watch live battles
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <Pill tone="primary">LCP-friendly</Pill>
              <Pill tone="secondary">No layout shift</Pill>
              <Pill tone="success">WebSocket feed</Pill>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.label} padding="sm" elevated className="min-h-[108px]">
                  <div className="text-xs uppercase tracking-[0.28em] text-slate-400">{stat.label}</div>
                  <div className="mt-3 text-3xl font-bold text-white">{stat.value}</div>
                  <div className={`mt-4 h-1.5 rounded-full ${stat.tone === 'primary' ? 'bg-violet-400/80' : stat.tone === 'secondary' ? 'bg-cyan-400/80' : 'bg-white/20'}`} />
                </Card>
              ))}
            </div>
          </div>

          <Card elevated className="min-h-[640px] p-0">
            <div className="flex h-full flex-col gap-5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Live status</div>
                  <div className="mt-1 text-lg font-semibold text-white">Arena control panel</div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.28em] text-slate-200">
                  <span className={`h-2 w-2 rounded-full ${feedState === 'live' ? 'bg-emerald-400' : 'bg-amber-300'}`} />
                  {feedState === 'live' ? 'Connected' : 'Cached'}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card padding="sm" className="min-h-[126px]">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Match clock</span>
                    <Timer seconds={92} compact label="Round" />
                  </div>
                  <div className="mt-4 text-2xl font-semibold text-white">Head-to-head ranked fight</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">Quick submissions, live HP updates, and secure judging inside each battle room.</div>
                </Card>

                <Card padding="sm" className="min-h-[126px]">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Current HP</span>
                    <Badge tone="success" dot>
                      Live
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-4">
                    <HPBar value={78} label="NovaByte" />
                    <HPBar value={34} label="HexPulse" />
                  </div>
                </Card>
              </div>

              <div className="flex-1 rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Battle readout</div>
                    <div className="mt-1 text-lg font-semibold text-white">NovaByte vs HexPulse</div>
                  </div>
                  <Badge tone="primary">Ranked final</Badge>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name="NovaByte" size={52} />
                      <div>
                        <div className="font-semibold text-white">NovaByte</div>
                        <div className="text-sm text-slate-400">Grandmaster · 9,842 ELO</div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm uppercase tracking-[0.28em] text-slate-400">Solved fast</div>
                    <div className="mt-2 text-3xl font-black text-emerald-300">WIN</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name="HexPulse" size={52} status="busy" />
                      <div>
                        <div className="font-semibold text-white">HexPulse</div>
                        <div className="text-sm text-slate-400">Master · 9,112 ELO</div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm uppercase tracking-[0.28em] text-slate-400">HP remaining</div>
                    <div className="mt-2 text-3xl font-black text-rose-300">34</div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  The primary content is static, so the first render stays lightweight. Live stats and websocket updates hydrate the panel after paint without moving the layout.
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
            <div className="flex items-center gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-[0.34em] text-slate-400">
              <Flame className="h-4 w-4 text-cyan-300" />
              Live battle ticker
              <span className="text-slate-500">Recent results stream from `/api/matches/history` and `/topic/matches/{id}`</span>
            </div>
            <div className="ticker-mask relative overflow-hidden py-4">
              <div className="ticker-track flex w-max gap-4 px-4">
                {[...battleFeed, ...battleFeed].map((item, index) => (
                  <div key={`${item.id}-${index}`} className="battle-chip min-w-[19rem] rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-400">{item.detail}</div>
                      </div>
                      <Badge tone={item.tone === 'success' ? 'success' : item.tone === 'warning' ? 'warning' : 'primary'}>
                        {item.stamp}
                      </Badge>
                    </div>
                    <div className="mt-4 text-sm text-slate-300">{item.result}</div>
                    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <HPBar value={item.hp1} label="P1" showValue />
                      <div className="text-xs uppercase tracking-[0.28em] text-slate-500">vs</div>
                      <HPBar value={item.hp2} label="P2" showValue />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-cyan-300">How it works</div>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Three steps from queue to podium</h2>
            </div>
            <Pill tone="secondary">Fast setup</Pill>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} elevated className="min-h-[250px]" padding="lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-5 text-[11px] uppercase tracking-[0.34em] text-slate-500">Step 0{index + 1}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{step.title}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{step.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="features" className="landing-section mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-xs uppercase tracking-[0.32em] text-violet-300">Feature highlights</div>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Designed for match speed and clarity</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureHighlights.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} elevated className="min-h-[220px]" padding="lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-violet-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-5 text-xl font-semibold text-white">{feature.title}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{feature.text}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="ladder" className="landing-section mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-emerald-300">Rank tier ladder</div>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Climb through the season tiers</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
                The ladder is intentionally legible. Every tier has a clear gate, a visible reward band, and a stable layout so players can scan progression quickly.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Current rank</span>
                  <span className="font-semibold text-white">Diamond II</span>
                </div>
                <div className="mt-4">
                  <HPBar value={82} label="Season progress" />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {tierLadder.map((tier, index) => (
                <div key={tier.name} className="flex items-center gap-4 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/30 text-lg font-bold text-white">{index + 1}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-lg font-semibold text-white">{tier.name}</div>
                      <Badge className={tier.color}>{tier.gate}</Badge>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/5">
                      <div className={`h-2 rounded-full ${index < 4 ? 'bg-gradient-to-r from-cyan-300 to-violet-300' : 'bg-gradient-to-r from-violet-300 to-fuchsia-300'}`} style={{ width: `${Math.min(100, 20 + index * 12)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="proof" className="landing-section mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-amber-300">Social proof</div>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Trusted by players and product teams</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {companyLogos.map((logo) => (
                <span key={logo} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300">
                  {logo}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-5 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} elevated className="min-h-[240px]" padding="lg">
                  <div className="flex items-center gap-3">
                    <Avatar name={testimonial.name} size={52} />
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-slate-400">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-slate-300">“{testimonial.quote}”</p>
                </Card>
              ))}
            </div>

            <Card elevated className="min-h-[240px]" padding="lg">
              <div className="text-xs uppercase tracking-[0.32em] text-cyan-300">Community snapshot</div>
              <div className="mt-3 text-2xl font-bold text-white">Battle-ready audiences are waiting</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Badge tone="success" dot>
                  24/7 matchmaking
                </Badge>
                <Badge tone="primary" dot>
                  Ranked seasons
                </Badge>
                <Badge tone="secondary" dot>
                  Spectator mode
                </Badge>
              </div>
              <div className="mt-6 flex items-center gap-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                <Avatar name="Arena Host" size={56} status="online" />
                <div>
                  <div className="font-semibold text-white">Live ops are ready</div>
                  <div className="mt-1 text-sm leading-6 text-slate-400">The landing page stays static and predictable. Live data fills in after mount without shifting the page.</div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Card elevated className="overflow-hidden rounded-[2rem] p-0">
            <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
              <div>
                <div className="text-xs uppercase tracking-[0.32em] text-violet-300">Bottom CTA</div>
                <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Ready to enter the arena?</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Jump into a match, inspect the ladder, and start the next fight. The page is optimized to stay stable, readable, and quick on first load.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={() => navigateTo('/signup')}>
                  Create your arena
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigateTo('/login')}>
                  View ladder
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>CodeSlam · Competitive coding arena</div>
          <div className="flex flex-wrap gap-5">
            <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#proof" className="transition-colors hover:text-white">Proof</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => (typeof window === 'undefined' ? '/' : window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const matchResultRoute = normalizedPath.match(/^\/match\/([^/]+)\/result$/);
  const profileRoute = normalizedPath.match(/^\/u\/([^/]+)$/);
  const problemSolveRoute = normalizedPath.match(/^\/problems\/([^/]+)\/solve$/);

  if (normalizedPath === '/auth/callback') {
    return <AuthCallbackPage />;
  }

  if (normalizedPath === '/login') {
    return <LoginPage />;
  }

  if (normalizedPath === '/signup') {
    return <SignupPage />;
  }

  if (normalizedPath === '/onboarding') {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading onboarding...
          </div>
        }
      >
        <OnboardingPage />
      </Suspense>
    );
  }

  if (normalizedPath === '/dashboard') {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading dashboard...
          </div>
        }
      >
        <DashboardPage />
      </Suspense>
    );
  }

  if (normalizedPath === '/arena') {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading arena...
          </div>
        }
      >
        <ArenaPage />
      </Suspense>
    );
  }

  if (normalizedPath === '/leaderboard') {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading leaderboard...
          </div>
        }
      >
        <LeaderboardPage />
      </Suspense>
    );
  }

  if (normalizedPath === '/problems') {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading problems...
          </div>
        }
      >
        <ProblemsPage />
      </Suspense>
    );
  }

  if (problemSolveRoute) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading solve page...
          </div>
        }
      >
        <ProblemSolvePage problemId={problemSolveRoute[1]} />
      </Suspense>
    );
  }

  if (matchResultRoute) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading match report...
          </div>
        }
      >
        <MatchResultPage matchId={matchResultRoute[1]} />
      </Suspense>
    );
  }

  if (profileRoute) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-200">
            Loading profile...
          </div>
        }
      >
        <ProfilePage username={decodeURIComponent(profileRoute[1])} />
      </Suspense>
    );
  }

  return <LandingPage />;
}

export default App;