import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Activity, AlertCircle, Clock3, Flame, Send, Shield, Swords, TerminalSquare, Zap } from 'lucide-react';
import { Client } from '@stomp/stompjs';

import { Avatar, Badge, Button, Card, Spinner } from '@codeslam/ui';

import { useApiClient } from './api';
import { navigateTo } from './navigation';
import {
  type ArenaStateResponse,
  type MatchResultEvent,
  type MatchTimelineEvent,
  type PowerUpKey,
  type PowerUpUsedEvent,
  useArenaStore,
} from './arenaStore';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const POWER_UPS: Array<{ key: PowerUpKey; icon: ComponentType<{ className?: string }> }> = [
  { key: 'blitz', icon: Zap },
  { key: 'shield', icon: Shield },
  { key: 'drain', icon: Flame },
];

type MatchHistoryItem = {
  id: string;
};

type BackendProblemResponse = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  constraintsText: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
  visibleTestCases: Array<{ input: string; expectedOutput: string; explanation?: string | null; displayOrder?: number }>;
};

function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function AnimatedHpBar({ label, hp, maxHp }: { label: string; hp: number; maxHp: number }) {
  const ratio = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
  const tone = ratio > 55 ? 'from-emerald-400 via-cyan-300 to-sky-400' : ratio > 25 ? 'from-amber-400 via-yellow-300 to-orange-300' : 'from-rose-500 via-rose-400 to-orange-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
        <span>{label}</span>
        <span>{hp} HP</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-linear-to-r ${tone}`}
          style={{ width: `${ratio}%` }}
          role="progressbar"
          aria-valuenow={Math.round(ratio)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} health`}
        />
      </div>
    </div>
  );
}

function safeParseJson(message: string): unknown {
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return null;
  }
}

function ArenaPage() {
  const api = useApiClient();
  const {
    match,
    problem,
    currentUserId,
    powerUps,
    connection,
    activity,
    chat,
    code,
    language,
    submitting,
    roundEndsAtEpochMs,
    serverOffsetMs,
    error,
    hydrateArenaState,
    setProblem,
    setTimelineEvents,
    applyMatchResult,
    applyPowerUpEvent,
    setConnection,
    setSubmitting,
    setCode,
    setLanguage,
    addChatMessage,
    addSystemMessage,
    setError,
  } = useArenaStore();

  const [chatDraft, setChatDraft] = useState('');
  const [powerUpPending, setPowerUpPending] = useState<PowerUpKey | null>(null);
  const [tick, setTick] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  const [resultRedirectAt, setResultRedirectAt] = useState<number | null>(null);
  const isSpectateMode = !isDesktop;

  useEffect(() => {
    document.title = 'Arena | CodeSlam';
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let client: Client | undefined;

    const load = async () => {
      if (!api.token) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const selectedMatchId = params.get('matchId');

      if (!selectedMatchId) {
        throw new Error('Missing matchId in the arena URL.');
      }

      const arenaState = await api.get<ArenaStateResponse>(`/api/arena/${selectedMatchId}/state`, { signal: controller.signal });
      if (!active) {
        return;
      }

      hydrateArenaState(arenaState);

      const problemResponse = await api.get<BackendProblemResponse>(`/api/problems/${arenaState.match.problem.id}`, { signal: controller.signal });
      if (active) {
        setProblem({
          id: problemResponse.id,
          title: problemResponse.title,
          description: problemResponse.description,
          difficulty: problemResponse.difficulty,
          topics: problemResponse.topics,
          constraints: problemResponse.constraintsText,
          visibleTestCases: problemResponse.visibleTestCases.map((testCase) => ({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
          })),
          timeLimitMs: problemResponse.timeLimitMs,
          memoryLimitMb: problemResponse.memoryLimitMb,
          optimalTimeComplexity: problemResponse.optimalTimeComplexity,
          optimalSpaceComplexity: problemResponse.optimalSpaceComplexity,
        });
      }

      setTimelineEvents([]);

      setConnection('connecting');
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

          setConnection('connected');
          client?.subscribe(`/topic/matches/${selectedMatchId}`, (message) => {
            const parsed = safeParseJson(message.body);
            if (!parsed || typeof parsed !== 'object') {
              return;
            }

            const candidate = parsed as Record<string, unknown>;
            if (typeof candidate.verdict === 'string') {
              applyMatchResult(candidate as unknown as MatchResultEvent);
            }
          });
          client?.subscribe(`/topic/matches/${selectedMatchId}/powerups`, (message) => {
            const parsed = safeParseJson(message.body);
            if (parsed && typeof parsed === 'object') {
              applyPowerUpEvent(parsed as unknown as PowerUpUsedEvent);
            }
          });
          client?.subscribe(`/topic/matches/${selectedMatchId}/chat`, (message) => {
            const parsed = safeParseJson(message.body);
            if (parsed && typeof parsed === 'object') {
              const candidate = parsed as Record<string, unknown>;
              if (typeof candidate.username === 'string' && typeof candidate.message === 'string') {
                addChatMessage({
                  id: `${selectedMatchId}-${Date.now()}`,
                  author: candidate.username,
                  body: candidate.message,
                  at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              }
            }
          });
        },
        onDisconnect: () => {
          if (active) {
            setConnection('offline');
          }
        },
        onWebSocketClose: () => {
          if (active) {
            setConnection('offline');
          }
        },
        onWebSocketError: () => {
          if (active) {
            setConnection('offline');
          }
        },
      });

      client.activate();
      addSystemMessage('Realtime stream connected to server match topic.');
    };

    void load().catch((loadError) => {
      if (!active) {
        return;
      }

      const message = loadError instanceof Error ? loadError.message : 'Unable to initialize arena';
      setError(message);
      setConnection('offline');
    });

    return () => {
      active = false;
      controller.abort();
      setConnection('offline');
      void client?.deactivate();
    };
  }, [addChatMessage, addSystemMessage, api, applyMatchResult, applyPowerUpEvent, hydrateArenaState, setConnection, setError, setProblem, setTimelineEvents]);

  useEffect(() => {
    if (!match || match.status !== 'COMPLETED') {
      setResultRedirectAt(null);
      return;
    }

    if (resultRedirectAt != null) {
      return;
    }

    setResultRedirectAt(Date.now());
    const timeout = window.setTimeout(() => {
      navigateTo(`/match/${match.id}/result`);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [match, resultRedirectAt]);

  const currentUserIsPlayer1 = useMemo(() => {
    if (!match || !currentUserId) {
      return true;
    }

    return match.player1.id === currentUserId;
  }, [match, currentUserId]);

  const myPlayer = useMemo(() => {
    if (!match) {
      return null;
    }

    return currentUserIsPlayer1 ? match.player1 : match.player2;
  }, [match, currentUserIsPlayer1]);

  const opponent = useMemo(() => {
    if (!match) {
      return null;
    }

    return currentUserIsPlayer1 ? match.player2 : match.player1;
  }, [match, currentUserIsPlayer1]);

  const myHp = match ? (currentUserIsPlayer1 ? match.player1Hp : match.player2Hp) : 100;
  const opponentHp = match ? (currentUserIsPlayer1 ? match.player2Hp : match.player1Hp) : 100;

  const secondsLeft = Math.max(0, Math.ceil((roundEndsAtEpochMs - (Date.now() + serverOffsetMs)) / 1000));

  const handleUsePowerUp = async (key: PowerUpKey) => {
    if (!match || isSpectateMode) {
      if (isSpectateMode) {
        setError('Play on desktop to use power-ups in ranked matches.');
      }
      return;
    }

    setPowerUpPending(key);
    try {
      const response = await fetch(`/api/matches/${match.id}/power-ups/${key}/use`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || 'Power-up was rejected by server');
      }

      const nextState = (await response.json()) as ArenaStateResponse;
      hydrateArenaState(nextState);
      addSystemMessage(`${key} activated by server.`);
    } catch (useError) {
      const message = useError instanceof Error ? useError.message : 'Failed to apply power-up';
      setError(message);
    } finally {
      setPowerUpPending(null);
    }
  };

  const handleSubmit = async () => {
    if (!match || isSpectateMode) {
      if (isSpectateMode) {
        setError('Play on desktop to submit ranked match code. Mobile is spectate-only.');
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/api/submissions', {
        matchId: match.id,
        code,
        language,
        problemId: problem?.id,
      });

      addSystemMessage('Submission queued. Awaiting judge result and live damage event.');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Submission failed';
      setError(message);
      setSubmitting(false);
    }
  };

  const handleSendChat = () => {
    if (isSpectateMode) {
      setError('Mobile spectate mode is read-only.');
      return;
    }

    const trimmed = chatDraft.trim();
    if (!trimmed) {
      return;
    }

    addChatMessage({
      id: `chat-${Date.now()}`,
      author: myPlayer?.username ?? 'You',
      body: trimmed,
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setChatDraft('');
  };

  if (error && !match) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-200">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Arena error</div>
          <div className="mt-2 text-lg font-semibold text-white">{error}</div>
          <Button className="mt-4" variant="secondary" onClick={() => navigateTo('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!match || !myPlayer || !opponent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-200">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <Spinner label="Loading arena" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#020617_0%,#040b1d_48%,#030712_100%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-350 flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="flex items-center gap-3 text-left" onClick={() => navigateTo('/dashboard')}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-white/5">
                <Swords className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-[0.28em] text-white">ARENA</div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Live battle room</div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <Badge tone={connection === 'connected' ? 'success' : 'warning'} dot>
                {connection === 'connected' ? 'Socket live' : 'Socket reconnecting'}
              </Badge>
              <Badge tone="neutral">{match.status}</Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <Card className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4" padding="sm">
              <div className="flex items-center gap-3">
                <Avatar name={myPlayer.username} size={44} status="online" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{myPlayer.username}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{myPlayer.rank} · {myPlayer.eloRating} ELO</div>
                </div>
              </div>
              <div className="mt-3">
                <AnimatedHpBar label="Your HP" hp={myHp ?? 0} maxHp={100} />
              </div>
            </Card>

            <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 px-5 py-4 text-center">
              <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Server clock</div>
              <div className="mt-2 flex items-center justify-center gap-2 text-3xl font-black text-white">
                <Clock3 className="h-6 w-6 text-cyan-300" />
                {formatSeconds(secondsLeft)}
              </div>
              <div className="mt-2 text-xs text-slate-500">Synced via server epoch offset</div>
            </div>

            <Card className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4" padding="sm">
              <div className="flex items-center gap-3">
                <Avatar name={opponent.username} size={44} status="busy" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{opponent.username}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{opponent.rank} · {opponent.eloRating} ELO</div>
                </div>
              </div>
              <div className="mt-3">
                <AnimatedHpBar label="Opponent HP" hp={opponentHp ?? 0} maxHp={100} />
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSpectateMode ? (
              <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                Play on desktop for ranked controls. This mobile arena is spectate-only.
              </div>
            ) : POWER_UPS.map((powerUp) => {
              const Icon = powerUp.icon;
              const state = powerUps[powerUp.key];
              const disabled = !state?.available || powerUpPending !== null || match.status === 'COMPLETED';

              return (
                  <Button
                  key={powerUp.key}
                  size="sm"
                  variant={state?.available ? 'secondary' : 'ghost'}
                  className="min-w-44"
                  disabled={disabled}
                  onClick={() => handleUsePowerUp(powerUp.key)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {state?.label ?? powerUp.key}
                  </span>
                </Button>
              );
            })}
            <span className="ml-2 text-xs uppercase tracking-[0.22em] text-slate-400">{isSpectateMode ? 'Live telemetry only on mobile' : 'Power-up availability is server authoritative'}</span>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid max-w-350 gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <section className="grid min-w-0 gap-4 xl:grid-cols-[0.94fr_1.06fr]">
          <Card elevated className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-0" padding="sm">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Problem panel</div>
              <div className="mt-2 text-xl font-semibold text-white">{problem?.title ?? match.problem.title}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="primary">{problem?.difficulty ?? match.problem.difficulty}</Badge>
                {(problem?.topics ?? match.problem.topics).slice(0, 4).map((topic) => (
                  <Badge key={topic} tone="neutral">{topic}</Badge>
                ))}
              </div>
            </div>

            <div className="max-h-[56vh] space-y-4 overflow-auto px-5 py-4 text-sm leading-7 text-slate-300">
              <p>{problem?.description ?? 'Loading problem details...'}</p>
              {problem?.constraints ? (
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Constraints</div>
                  <div className="mt-2 whitespace-pre-wrap">{problem.constraints}</div>
                </div>
              ) : null}
              {problem?.visibleTestCases?.length ? (
                <div className="space-y-3">
                  {problem.visibleTestCases.slice(0, 2).map((testCase, index) => (
                    <div key={`${testCase.input}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Sample {index + 1}</div>
                      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                        <div>
                          <div className="text-slate-400">Input</div>
                          <pre className="mt-1 overflow-auto rounded bg-black/30 p-2 text-slate-200">{testCase.input}</pre>
                        </div>
                        <div>
                          <div className="text-slate-400">Output</div>
                          <pre className="mt-1 overflow-auto rounded bg-black/30 p-2 text-slate-200">{testCase.expectedOutput}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card elevated className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-0" padding="sm">
            {isSpectateMode ? (
              <div className="flex h-full min-h-128 flex-col justify-between">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Mobile spectate mode</div>
                  <div className="mt-1 text-sm text-slate-300">Ranked play is desktop-only at 1024px and above.</div>
                </div>
                <div className="px-5 py-4 text-sm text-slate-300">
                  You can still watch HP changes, timer, and opponent activity live on mobile.
                </div>
                <div className="grid gap-2 border-t border-white/10 px-5 py-4 sm:grid-cols-3">
                  <Button size="sm" variant="secondary" onClick={() => navigateTo('/dashboard')}>Dashboard</Button>
                  <Button size="sm" variant="secondary" onClick={() => navigateTo('/leaderboard')}>Leaderboard</Button>
                  <Button size="sm" variant="secondary" onClick={() => navigateTo(`/u/${myPlayer.username}`)}>Profile</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Monaco editor</div>
                    <div className="mt-1 text-sm text-slate-300">Lazy-loaded via dynamic import to avoid SSR crashes</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                    <Button size="sm" onClick={handleSubmit} disabled={submitting || match.status === 'COMPLETED'}>
                      {submitting ? 'Submitting...' : 'Submit'}
                    </Button>
                  </div>
                </div>

                <div className="arena-editor-shell min-w-0 h-[56vh] overflow-hidden p-4">
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-slate-950/70 text-slate-300">
                        <Spinner label="Loading Monaco" />
                      </div>
                    }
                  >
                    <MonacoEditor
                      height="100%"
                      theme="vs-dark"
                      language={language}
                      value={code}
                      onChange={(nextValue) => setCode(nextValue ?? '')}
                      options={{
                        minimap: { enabled: false },
                        smoothScrolling: true,
                        automaticLayout: true,
                        fontSize: 14,
                        padding: { top: 16, bottom: 16 },
                        scrollBeyondLastLine: false,
                        scrollbar: {
                          verticalScrollbarSize: 10,
                          horizontalScrollbarSize: 10,
                        },
                      }}
                    />
                  </Suspense>
                </div>
              </>
            )}
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.74fr_1.26fr]">
          <Card elevated className="rounded-3xl border border-white/10 bg-white/5 p-0" padding="sm">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                <TerminalSquare className="h-4 w-4 text-cyan-300" />
                Team chat
              </div>
              <div className="mt-1 text-sm text-slate-300">Messages are local until backend chat topic is enabled.</div>
            </div>

            <div className="flex h-72 flex-col">
              <div className="flex-1 space-y-2 overflow-auto px-5 py-4">
                {chat.length === 0 ? <div className="text-sm text-slate-500">No chat messages yet.</div> : null}
                {chat.map((message) => (
                  <div key={message.id} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{message.author}</span>
                      <span>{message.at}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-200">{message.body}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t border-white/10 p-3">
                <input
                  className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  placeholder={isSpectateMode ? 'Chat disabled in mobile spectate mode' : 'Type a quick callout...'}
                  value={chatDraft}
                  disabled={isSpectateMode}
                  onChange={(event) => setChatDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSendChat();
                    }
                  }}
                />
                <Button size="sm" onClick={handleSendChat} disabled={isSpectateMode}>
                  <span className="inline-flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send
                  </span>
                </Button>
              </div>
            </div>
          </Card>

          <Card elevated className="rounded-3xl border border-white/10 bg-white/5 p-0" padding="sm">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                <Activity className="h-4 w-4 text-violet-300" />
                Opponent activity
              </div>
              <div className="mt-1 text-sm text-slate-300">All socket events feed this timeline through Zustand store updates.</div>
            </div>

            <div className="h-72 space-y-2 overflow-auto px-5 py-4">
              {activity.length === 0 ? <div className="text-sm text-slate-500">No activity yet.</div> : null}
              {activity.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-sm font-semibold ${item.tone === 'success' ? 'text-emerald-300' : item.tone === 'warning' ? 'text-amber-300' : item.tone === 'primary' ? 'text-cyan-300' : 'text-slate-200'}`}>
                      {item.title}
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.at}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-300">{item.detail}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>

      {match.status === 'COMPLETED' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <Card elevated className="rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-5 text-center">
            <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Match finished</div>
            <div className="mt-3 text-2xl font-black text-white">Redirecting to your result page...</div>
            <div className="mt-2 text-sm text-slate-300">The result screen opens automatically in 3 seconds.</div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default ArenaPage;
