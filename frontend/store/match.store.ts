import { create } from "zustand";

export type PowerUpType = "BLUR" | "LOCK_KEYWORD" | "REVERSE_KEYBOARD" | "HIDE_TESTCASES" | "FORCE_THEME_SWAP" | "DISABLE_AUTOCOMPLETE";

export type MatchStatus = "idle" | "active" | "ended" | "loading";

export type SubmissionEntry = {
  id: string;
  verdict?: string;
  language?: string;
  createdAt?: string;
};

export type MatchPlayer = {
  id: string | null;
  username: string;
  rankTier?: string;
  hp: number;
  submissions: SubmissionEntry[];
};

export type MatchChatMessage = {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  createdAt: string;
};

export type MatchEvent = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

export type MatchResult = {
  winnerId?: string | null;
  winnerUsername?: string | null;
  reason?: string;
};

type MatchProblem = {
  id: string;
  title: string;
  difficulty?: string;
  description?: string;
  constraintsText?: string;
  topics?: string[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  optimalTimeComplexity?: string;
  battleUseCount?: number;
  visibleTestCases?: VisibleTestCase[];
};

export type VisibleTestCase = {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
  displayOrder?: number;
};

type MatchState = {
  matchId: string | null;
  status: MatchStatus;
  problem: MatchProblem | null;
  visibleTestCases: VisibleTestCase[];
  p1: MatchPlayer;
  p2: MatchPlayer;
  timer: number;
  powerups: PowerUpType[];
  chatMessages: MatchChatMessage[];
  matchEvents: MatchEvent[];
  result: MatchResult | null;
  initMatch: (payload: {
    matchId: string;
    status?: MatchStatus;
    problem: MatchProblem | null;
    visibleTestCases?: VisibleTestCase[];
    p1: Omit<MatchPlayer, "submissions"> & { submissions?: SubmissionEntry[] };
    p2: Omit<MatchPlayer, "submissions"> & { submissions?: SubmissionEntry[] };
    timer?: number;
    powerups?: PowerUpType[];
  }) => void;
  updateHp: (playerId: string, hp: number) => void;
  addSubmission: (playerId: string, submission: SubmissionEntry) => void;
  addChat: (message: MatchChatMessage) => void;
  setTimer: (timer: number) => void;
  setVisibleTestCases: (cases: VisibleTestCase[]) => void;
  consumePowerUp: (powerUp: PowerUpType) => void;
  addMatchEvent: (event: MatchEvent) => void;
  endMatch: (result: MatchResult) => void;
};

const emptyPlayer = (): MatchPlayer => ({
  id: null,
  username: "",
  hp: 100,
  submissions: [],
});

export const useMatchStore = create<MatchState>(set => ({
  matchId: null,
  status: "idle",
  problem: null,
  visibleTestCases: [],
  p1: emptyPlayer(),
  p2: emptyPlayer(),
  timer: 0,
  powerups: ["BLUR", "LOCK_KEYWORD", "REVERSE_KEYBOARD"],
  chatMessages: [],
  matchEvents: [],
  result: null,
  initMatch: payload =>
    set({
      matchId: payload.matchId,
      status: payload.status ?? "active",
      problem: payload.problem,
      visibleTestCases: payload.visibleTestCases ?? [],
      p1: {
        ...payload.p1,
        submissions: payload.p1.submissions ?? [],
      },
      p2: {
        ...payload.p2,
        submissions: payload.p2.submissions ?? [],
      },
      timer: payload.timer ?? 0,
      powerups: payload.powerups ?? ["BLUR", "LOCK_KEYWORD", "REVERSE_KEYBOARD"],
      chatMessages: [],
      matchEvents: [],
      result: null,
    }),
  updateHp: (playerId, hp) =>
    set(state => ({
      p1: state.p1.id === playerId ? { ...state.p1, hp } : state.p1,
      p2: state.p2.id === playerId ? { ...state.p2, hp } : state.p2,
    })),
  addSubmission: (playerId, submission) =>
    set(state => ({
      p1: state.p1.id === playerId
        ? { ...state.p1, submissions: [submission, ...state.p1.submissions] }
        : state.p1,
      p2: state.p2.id === playerId
        ? { ...state.p2, submissions: [submission, ...state.p2.submissions] }
        : state.p2,
    })),
  addChat: message =>
    set(state => ({ chatMessages: [...state.chatMessages, message] })),
  setTimer: timer => set({ timer }),
  setVisibleTestCases: cases => set({ visibleTestCases: cases }),
  consumePowerUp: powerUp =>
    set(state => {
      const index = state.powerups.indexOf(powerUp);

      if (index === -1) {
        return state;
      }

      return {
        powerups: [...state.powerups.slice(0, index), ...state.powerups.slice(index + 1)],
      };
    }),
  addMatchEvent: event =>
    set(state => ({ matchEvents: [...state.matchEvents, event] })),
  endMatch: result =>
    set({
      status: "ended",
      result,
    }),
}));

export const matchStore = useMatchStore;