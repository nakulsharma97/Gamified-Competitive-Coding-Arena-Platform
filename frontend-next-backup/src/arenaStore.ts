import { create } from 'zustand';

export type PowerUpKey = 'blitz' | 'shield' | 'drain';

type MatchUser = {
  id: string;
  username: string;
  eloRating: number;
  rank: string;
};

type MatchProblem = {
  id: string;
  title: string;
  difficulty: string;
  topics: string[];
  battleUseCount: number;
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
};

export type MatchDetails = {
  id: string;
  problem: MatchProblem;
  player1: MatchUser;
  player2: MatchUser;
  winner: MatchUser | null;
  status: string;
  player1Hp: number;
  player2Hp: number;
  startedAt: string | null;
  endedAt: string | null;
};

export type ProblemDetails = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  constraints: string | null;
  visibleTestCases: Array<{ input: string; expectedOutput: string }>;
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
};

export type ArenaPowerUpState = {
  key: PowerUpKey;
  label: string;
  available: boolean;
  usesRemaining: number;
};

export type ArenaStateResponse = {
  match: MatchDetails;
  currentUserId: string;
  serverEpochMs: number;
  roundEndsAtEpochMs: number;
  myPowerUpsApplied: number;
  opponentPowerUpsApplied: number;
  blitz: ArenaPowerUpState;
  shield: ArenaPowerUpState;
  drain: ArenaPowerUpState;
};

export type MatchResultEvent = {
  submissionId: string;
  matchId: string;
  verdict: string;
  runtimeMs?: number;
  memoryMb?: number;
  passedCases?: number;
  totalCases?: number;
  player1Hp: number;
  player2Hp: number;
  winnerId?: string | null;
  damageBreakdown?: Record<string, number>;
};

export type PowerUpUsedEvent = {
  eventType: 'POWER_UP_USED';
  matchId: string;
  userId: string;
  powerUpKey: PowerUpKey;
  player1PowerUpsApplied: number;
  player2PowerUpsApplied: number;
  serverEpochMs: number;
};

export type MatchTimelineEvent = {
  id: string;
  userId: string | null;
  eventType: string;
  payload: string;
  occurredAt: string;
};

export type ActivityItem = {
  id: string;
  tone: 'neutral' | 'success' | 'warning' | 'primary';
  title: string;
  detail: string;
  at: string;
};

export type ChatMessage = {
  id: string;
  author: string;
  body: string;
  at: string;
};

type ArenaStore = {
  matchId: string | null;
  match: MatchDetails | null;
  problem: ProblemDetails | null;
  currentUserId: string | null;
  serverOffsetMs: number;
  roundEndsAtEpochMs: number;
  myPowerUpsApplied: number;
  opponentPowerUpsApplied: number;
  powerUps: Record<PowerUpKey, ArenaPowerUpState>;
  activity: ActivityItem[];
  chat: ChatMessage[];
  code: string;
  language: string;
  submitting: boolean;
  connection: 'connecting' | 'connected' | 'offline';
  error: string | null;
  hydrateArenaState: (state: ArenaStateResponse) => void;
  setProblem: (problem: ProblemDetails) => void;
  setTimelineEvents: (events: MatchTimelineEvent[]) => void;
  applyMatchResult: (event: MatchResultEvent) => void;
  applyPowerUpEvent: (event: PowerUpUsedEvent) => void;
  setConnection: (state: 'connecting' | 'connected' | 'offline') => void;
  setSubmitting: (submitting: boolean) => void;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  addSystemMessage: (body: string) => void;
  setError: (error: string | null) => void;
};

const defaultPowerUps: Record<PowerUpKey, ArenaPowerUpState> = {
  blitz: { key: 'blitz', label: 'Blitz Burst', available: true, usesRemaining: 1 },
  shield: { key: 'shield', label: 'Refactor Shield', available: true, usesRemaining: 1 },
  drain: { key: 'drain', label: 'Stack Drain', available: true, usesRemaining: 1 },
};

function powerUpStateFromApplied(applied: number): Record<PowerUpKey, ArenaPowerUpState> {
  const safeApplied = Math.max(0, Math.min(3, applied));
  return {
    blitz: { key: 'blitz', label: 'Blitz Burst', available: safeApplied <= 0, usesRemaining: Math.max(0, 1 - safeApplied) },
    shield: { key: 'shield', label: 'Refactor Shield', available: safeApplied <= 1, usesRemaining: Math.max(0, 2 - safeApplied) },
    drain: { key: 'drain', label: 'Stack Drain', available: safeApplied <= 2, usesRemaining: Math.max(0, 3 - safeApplied) },
  };
}

function toActivityTone(eventType: string, payload: string): ActivityItem['tone'] {
  const merged = `${eventType} ${payload}`.toLowerCase();
  if (merged.includes('win') || merged.includes('ac')) {
    return 'success';
  }
  if (merged.includes('wa') || merged.includes('tle') || merged.includes('error')) {
    return 'warning';
  }
  if (merged.includes('power')) {
    return 'primary';
  }
  return 'neutral';
}

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const useArenaStore = create<ArenaStore>((set, get) => ({
  matchId: null,
  match: null,
  problem: null,
  currentUserId: null,
  serverOffsetMs: 0,
  roundEndsAtEpochMs: 0,
  myPowerUpsApplied: 0,
  opponentPowerUpsApplied: 0,
  powerUps: defaultPowerUps,
  activity: [],
  chat: [],
  code: '// Write your battle-ready solution here\n',
  language: 'python',
  submitting: false,
  connection: 'offline',
  error: null,

  hydrateArenaState: (nextState) => {
    set({
      matchId: nextState.match.id,
      match: nextState.match,
      currentUserId: nextState.currentUserId,
      serverOffsetMs: nextState.serverEpochMs - Date.now(),
      roundEndsAtEpochMs: nextState.roundEndsAtEpochMs,
      myPowerUpsApplied: nextState.myPowerUpsApplied,
      opponentPowerUpsApplied: nextState.opponentPowerUpsApplied,
      powerUps: {
        blitz: nextState.blitz,
        shield: nextState.shield,
        drain: nextState.drain,
      },
      error: null,
    });
  },

  setProblem: (problem) => set({ problem }),

  setTimelineEvents: (events) => {
    const nextActivity = events
      .slice(-30)
      .reverse()
      .map((event) => ({
        id: event.id,
        tone: toActivityTone(event.eventType, event.payload),
        title: event.eventType.replaceAll('_', ' '),
        detail: event.payload || 'Arena event',
        at: new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));

    set({ activity: nextActivity });
  },

  applyMatchResult: (event) => {
    const state = get();
    if (!state.match) {
      return;
    }

    const nextMatch: MatchDetails = {
      ...state.match,
      player1Hp: event.player1Hp,
      player2Hp: event.player2Hp,
      status: event.winnerId ? 'COMPLETED' : state.match.status,
    };

    const detail = `${event.verdict} · ${event.passedCases ?? 0}/${event.totalCases ?? 0} cases`;
    const nextActivity: ActivityItem = {
      id: `${event.matchId}-${Date.now()}`,
      tone: event.winnerId ? 'success' : event.verdict === 'AC' ? 'success' : 'warning',
      title: `Submission ${event.verdict}`,
      detail,
      at: nowTimeLabel(),
    };

    set({
      match: nextMatch,
      activity: [nextActivity, ...state.activity].slice(0, 40),
      submitting: false,
    });
  },

  applyPowerUpEvent: (event) => {
    const state = get();
    if (!state.match || !state.currentUserId) {
      return;
    }

    const currentUserIsPlayer1 = state.match.player1.id === state.currentUserId;
    const myApplied = currentUserIsPlayer1 ? event.player1PowerUpsApplied : event.player2PowerUpsApplied;
    const opponentApplied = currentUserIsPlayer1 ? event.player2PowerUpsApplied : event.player1PowerUpsApplied;

    const actor = event.userId === state.currentUserId ? 'You' : 'Opponent';
    const nextActivity: ActivityItem = {
      id: `powerup-${Date.now()}`,
      tone: 'primary',
      title: `${actor} used ${event.powerUpKey}`,
      detail: 'Server-authoritative power-up state updated',
      at: nowTimeLabel(),
    };

    set({
      serverOffsetMs: event.serverEpochMs - Date.now(),
      myPowerUpsApplied: myApplied,
      opponentPowerUpsApplied: opponentApplied,
      powerUps: powerUpStateFromApplied(myApplied),
      activity: [nextActivity, ...state.activity].slice(0, 40),
    });
  },

  setConnection: (state) => set({ connection: state }),
  setSubmitting: (submitting) => set({ submitting }),
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  addChatMessage: (message) => set((state) => ({ chat: [message, ...state.chat].slice(0, 60) })),
  addSystemMessage: (body) =>
    set((state) => ({
      chat: [
        {
          id: `system-${Date.now()}`,
          author: 'System',
          body,
          at: nowTimeLabel(),
        },
        ...state.chat,
      ].slice(0, 60),
    })),
  setError: (error) => set({ error }),
}));
