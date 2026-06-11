import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Copy, Share2, Sparkles, Swords, TrendingUp } from 'lucide-react';

import { Badge, Button, Card, HPBar, Pill, Spinner } from '@codeslam/ui';

import { navigateTo } from './navigation';

type UserMeResponse = {
  profile: {
    id: string;
    username: string;
  };
};

type MatchDetails = {
  id: string;
  problem?: { title?: string; difficulty?: string; topics?: string[] };
  player1?: { id: string; username: string; eloRating: number; rank: string };
  player2?: { id: string; username: string; eloRating: number; rank: string };
  winner?: { id: string; username: string } | null;
  status: string;
  player1Hp?: number;
  player2Hp?: number;
  eloChangeP1?: number;
  eloChangeP2?: number;
  startedAt?: string;
  endedAt?: string;
};

type SubmissionDto = {
  id: string;
  userId: string;
  language: string;
  verdict: string;
  runtimeMs?: number | null;
  memoryMb?: number | null;
  passedCases?: number | null;
  totalCases?: number | null;
  firstAc?: boolean;
  submittedAt?: string;
};

type MatchResult = {
  matchId: string;
  winnerId?: string | null;
  eloChangeP1?: number;
  eloChangeP2?: number;
  damageBreakdown: Record<string, number>;
  submissions: SubmissionDto[];
};

type AiCoachResponse = {
  coachSummary: string;
  fallback: boolean;
};

function fmtDelta(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value}`;
}

function fmtTime(input?: string): string {
  if (!input) {
    return 'Unknown';
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function pct(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function parseVercelOgImage(match: MatchDetails, perspectiveUsername: string, outcome: string): string | null {
  const baseUrl = import.meta.env.VITE_VERCEL_OG_BASE_URL as string | undefined;
  if (!baseUrl) {
    return null;
  }

  const title = encodeURIComponent(`${match.problem?.title ?? 'CodeSlam Match'} • ${outcome}`);
  const subtitle = encodeURIComponent(`${perspectiveUsername} • ${match.player1Hp ?? 0}-${match.player2Hp ?? 0} HP`);
  return `${baseUrl.replace(/\/$/, '')}/api/og/match?title=${title}&subtitle=${subtitle}`;
}

export function MatchResultPage({ matchId }: { matchId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [currentUser, setCurrentUser] = useState<UserMeResponse['profile'] | null>(null);
  const [coach, setCoach] = useState<AiCoachResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    document.title = 'Post Match | CodeSlam';
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const [matchRes, resultRes, meRes] = await Promise.all([
          fetch(`/api/matches/${matchId}`, { credentials: 'include', signal: controller.signal }),
          fetch(`/api/matches/${matchId}/result`, { credentials: 'include', signal: controller.signal }),
          fetch('/api/users/me', { credentials: 'include', signal: controller.signal }),
        ]);

        if (!matchRes.ok || !resultRes.ok || !meRes.ok) {
          throw new Error('Unable to load match result.');
        }

        const [matchJson, resultJson, meJson] = await Promise.all([
          matchRes.json() as Promise<MatchDetails>,
          resultRes.json() as Promise<MatchResult>,
          meRes.json() as Promise<UserMeResponse>,
        ]);

        setMatch(matchJson);
        setResult(resultJson);
        setCurrentUser(meJson.profile);
      } catch {
        setError('Could not load post-match data.');
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [matchId]);

  const perspective = useMemo(() => {
    if (!match || !result || !currentUser) {
      return null;
    }

    const isP1 = match.player1?.id === currentUser.id;
    const me = isP1 ? match.player1 : match.player2;
    const opp = isP1 ? match.player2 : match.player1;
    const eloDelta = isP1 ? result.eloChangeP1 ?? 0 : result.eloChangeP2 ?? 0;
    const outcome = result.winnerId == null ? 'DRAW' : result.winnerId === currentUser.id ? 'WIN' : 'LOSS';

    const mySubmissions = result.submissions.filter((submission) => submission.userId === currentUser.id);
    const oppSubmissions = result.submissions.filter((submission) => submission.userId !== currentUser.id);

    const myAccepted = mySubmissions.filter((submission) => submission.verdict === 'AC').length;
    const oppAccepted = oppSubmissions.filter((submission) => submission.verdict === 'AC').length;

    const myAvgRuntime = Math.round(
      mySubmissions.filter((submission) => typeof submission.runtimeMs === 'number').reduce((sum, submission) => sum + (submission.runtimeMs ?? 0), 0) /
        Math.max(1, mySubmissions.filter((submission) => typeof submission.runtimeMs === 'number').length)
    );

    const oppAvgRuntime = Math.round(
      oppSubmissions.filter((submission) => typeof submission.runtimeMs === 'number').reduce((sum, submission) => sum + (submission.runtimeMs ?? 0), 0) /
        Math.max(1, oppSubmissions.filter((submission) => typeof submission.runtimeMs === 'number').length)
    );

    const breakdownRows = [
      {
        label: 'Damage Dealt',
        me: isP1 ? result.damageBreakdown.player1DamageDealt ?? 0 : result.damageBreakdown.player2DamageDealt ?? 0,
        opp: isP1 ? result.damageBreakdown.player2DamageDealt ?? 0 : result.damageBreakdown.player1DamageDealt ?? 0,
      },
      {
        label: 'Total Submissions',
        me: mySubmissions.length,
        opp: oppSubmissions.length,
      },
      {
        label: 'Accepted Submissions',
        me: myAccepted,
        opp: oppAccepted,
      },
      {
        label: 'First AC Bonus',
        me: mySubmissions.some((submission) => submission.firstAc) ? 1 : 0,
        opp: oppSubmissions.some((submission) => submission.firstAc) ? 1 : 0,
      },
    ];

    return {
      me,
      opp,
      eloDelta,
      outcome,
      mySubmissions,
      oppSubmissions,
      myAccepted,
      oppAccepted,
      myAvgRuntime,
      oppAvgRuntime,
      breakdownRows,
      timeline: [...result.submissions].sort((a, b) => {
        const left = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const right = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return left - right;
      }),
    };
  }, [currentUser, match, result]);

  async function loadCoach(): Promise<void> {
    setCoachLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/coach`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('coach failed');
      }

      const data = (await response.json()) as AiCoachResponse;
      setCoach(data);
    } catch {
      setCoach({ coachSummary: 'Unable to fetch coach notes right now. Try again in a moment.', fallback: true });
    } finally {
      setCoachLoading(false);
    }
  }

  async function copyShareLink(): Promise<void> {
    const shareUrl = `${window.location.origin}/match/${matchId}/result`;
    await navigator.clipboard.writeText(shareUrl);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-slate-100">
        <Spinner label="Loading post-match report" />
      </div>
    );
  }

  if (error || !match || !result || !currentUser || !perspective) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] px-4 text-slate-200">
        <Card className="max-w-lg text-center" elevated>
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-300" />
          <h1 className="mt-4 text-2xl font-bold text-white">Post-match data unavailable</h1>
          <p className="mt-3 text-slate-300">{error ?? 'This match could not be loaded.'}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigateTo('/dashboard')}>Back to dashboard</Button>
            <Button variant="secondary" onClick={() => navigateTo('/leaderboard')}>Leaderboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  const winTone = perspective.outcome === 'WIN' ? 'success' : perspective.outcome === 'LOSS' ? 'danger' : 'secondary';
  const ogImage = parseVercelOgImage(match, currentUser.username, perspective.outcome);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_30%),linear-gradient(180deg,#040712_0%,#040b18_50%,#020617_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card elevated className="overflow-hidden border border-white/10 bg-slate-950/70">
          <div className="grid gap-6 px-5 py-6 md:grid-cols-[1.4fr_0.6fr] md:px-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={winTone}>{perspective.outcome}</Badge>
                <Pill tone="primary">Match #{match.id.slice(0, 8)}</Pill>
                <Pill tone="secondary">{match.problem?.difficulty ?? 'Unknown'} </Pill>
              </div>
              <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{match.problem?.title ?? 'Arena battle'}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {perspective.me?.username} vs {perspective.opp?.username} • {match.status}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className={`rounded-full px-3 py-1 font-semibold ${perspective.eloDelta >= 0 ? 'bg-emerald-400/20 text-emerald-100' : 'bg-rose-400/20 text-rose-100'}`}>
                  ELO {fmtDelta(perspective.eloDelta)}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">Started {fmtTime(match.startedAt)}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">Ended {fmtTime(match.endedAt)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Final HP</div>
              <div className="mt-3 space-y-3">
                <HPBar value={match.player1Hp ?? 0} label={match.player1?.username ?? 'P1'} showValue />
                <HPBar value={match.player2Hp ?? 0} label={match.player2?.username ?? 'P2'} showValue />
              </div>
              <div className="mt-5 flex gap-2">
                <Button size="sm" variant="secondary" leadingIcon={<Copy className="h-4 w-4" />} onClick={() => void copyShareLink()}>
                  Copy Link
                </Button>
                <Button size="sm" leadingIcon={<Share2 className="h-4 w-4" />} onClick={() => navigateTo('/leaderboard')}>
                  Share
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card elevated>
            <div className="flex items-center gap-2 text-slate-200">
              <Swords className="h-4 w-4 text-cyan-300" />
              <h2 className="text-lg font-semibold">Damage Breakdown</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  <tr>
                    <th className="py-2">Metric</th>
                    <th className="py-2">You</th>
                    <th className="py-2">Opponent</th>
                  </tr>
                </thead>
                <tbody>
                  {perspective.breakdownRows.map((row) => (
                    <tr key={row.label} className="border-t border-white/10">
                      <td className="py-3 text-slate-200">{row.label}</td>
                      <td className="py-3 font-semibold text-white">{row.me}</td>
                      <td className="py-3 text-slate-300">{row.opp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card elevated>
            <div className="flex items-center gap-2 text-slate-200">
              <BarChart3 className="h-4 w-4 text-violet-300" />
              <h2 className="text-lg font-semibold">Performance Comparison</h2>
            </div>
            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                  <span>AC Rate</span>
                  <span>{pct(perspective.myAccepted, perspective.mySubmissions.length)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${pct(perspective.myAccepted, perspective.mySubmissions.length)}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                  <span>Avg Runtime Advantage</span>
                  <span>{Math.max(0, perspective.oppAvgRuntime - perspective.myAvgRuntime)}ms</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${Math.min(100, Math.max(8, Math.round((Math.max(0, perspective.oppAvgRuntime - perspective.myAvgRuntime) / 200) * 100)))}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                  <span>Pressure Output</span>
                  <span>{perspective.breakdownRows[0]?.me ?? 0} dmg</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-violet-300" style={{ width: `${Math.min(100, (perspective.breakdownRows[0]?.me ?? 0))}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card elevated>
            <div className="flex items-center gap-2 text-slate-200">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              <h2 className="text-lg font-semibold">Submission Timeline</h2>
            </div>
            <div className="mt-4 space-y-3">
              {perspective.timeline.length === 0 ? <div className="text-sm text-slate-400">No submissions recorded.</div> : null}
              {perspective.timeline.map((submission, index) => (
                <div key={submission.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-slate-200">{index + 1}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
                      <span className="font-semibold">{submission.userId === currentUser.id ? 'You' : 'Opponent'}</span>
                      <Badge tone={submission.verdict === 'AC' ? 'success' : 'warning'}>{submission.verdict}</Badge>
                      {submission.firstAc ? <Pill tone="primary">First AC</Pill> : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {fmtTime(submission.submittedAt)} • {submission.language} • {submission.runtimeMs ?? '—'}ms • {submission.passedCases ?? 0}/{submission.totalCases ?? 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card elevated>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-200">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <h2 className="text-lg font-semibold">AI Coach</h2>
              </div>
              <Button size="sm" onClick={() => void loadCoach()} disabled={coachLoading}>
                {coachLoading ? 'Analyzing...' : coach ? 'Refresh Notes' : 'Generate Notes'}
              </Button>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">
              {coachLoading ? <Spinner label="Calling Anthropic" /> : null}
              {!coachLoading && !coach ? 'Generate tactical notes from this match to review mistakes and improvements.' : null}
              {!coachLoading && coach ? coach.coachSummary : null}
            </div>
            {coach?.fallback ? <div className="mt-3 text-xs uppercase tracking-[0.24em] text-amber-300">Fallback analysis active</div> : null}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Shareable Match Card</div>
              <p className="mt-2 text-sm text-slate-300">OG image target is generated via Vercel OG when VITE_VERCEL_OG_BASE_URL is configured.</p>
              {ogImage ? (
                <a href={ogImage} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                  Open generated OG image
                </a>
              ) : (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-400">Set VITE_VERCEL_OG_BASE_URL to your Vercel OG deployment URL.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
