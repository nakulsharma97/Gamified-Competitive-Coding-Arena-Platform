"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Bug, EyeOff, Flame, Keyboard, Loader2, MessageCircle, MoonStar, Play, Send, ShieldAlert, Swords, Zap } from "lucide-react";
import type { EditorProps } from "@monaco-editor/react";
import { apiFetch, apiJson } from "@/lib/api";
import { connect, disconnect, publish, subscribe } from "@/lib/stomp";
import { DamagePopup, type DamagePopupHandle } from "@/components/damage-popup";
import { HpBar } from "@/components/hp-bar";
import { MatchTimer } from "@/components/match-timer";
import { PowerUpButton } from "@/components/power-up-button";
import { RankBadge } from "@/components/rank-badge";
import { useMatchStore, type PowerUpType, type VisibleTestCase } from "@/store/match.store";

type MatchDto = {
  id: string;
  status: string;
  problem: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    topics?: string[];
    constraintsText?: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
    optimalTimeComplexity?: string;
    battleUseCount?: number;
    visibleTestCases?: VisibleTestCase[];
  };
  player1: {
    id: string;
    username: string;
    eloRating?: number;
    rankTier?: string;
    preferredLanguages?: string[];
  };
  player2: {
    id: string;
    username: string;
    eloRating?: number;
    rankTier?: string;
    preferredLanguages?: string[];
  };
  player1Hp: number;
  player2Hp: number;
};

type ArenaStateDto = {
  match: {
    id: string;
    problem: {
      id: string;
      title: string;
      difficulty?: string;
    };
    player1: {
      id: string;
      username: string;
      eloRating?: number;
      rank?: string;
      preferredLanguages?: string[];
    };
    player2: {
      id: string;
      username: string;
      eloRating?: number;
      rank?: string;
      preferredLanguages?: string[];
    };
    winner?: {
      id: string;
      username: string;
    } | null;
    status: string;
    player1Hp: number;
    player2Hp: number;
  };
  currentUserId: string;
  spectator: boolean;
  serverEpochMs: number;
  roundEndsAtEpochMs: number;
  myPowerUpsApplied: number;
  opponentPowerUpsApplied: number;
};

type MeProfile = {
  id: string;
  username: string;
  preferredLanguages?: string[];
  rankTier?: string;
};

type JudgeResult = {
  verdict: string;
  runtimeMs: number;
  memoryMb: number;
  passedCases: number;
  totalCases: number;
  caseResults: Array<{
    caseIndex: number;
    verdict: string;
    passed: boolean;
    stdout: string;
    stderr: string;
    runtimeMs: number;
    memoryMb: number;
  }>;
};

type MatchEventPayload = Record<string, unknown> & {
  type?: string;
  eventType?: string;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

type MonacoPosition = {
  lineNumber: number;
  column: number;
};

type MonacoRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

type MonacoKeyboardEvent = {
  browserEvent: KeyboardEvent;
  preventDefault: () => void;
};

type MonacoDisposable = {
  dispose: () => void;
};

type MonacoEditorLike = {
  getValue: () => string;
  getSelection: () => MonacoRange | null;
  getPosition: () => MonacoPosition | null;
  executeEdits: (source: string, edits: Array<{ range: MonacoRange; text: string; forceMoveMarkers?: boolean }>) => void;
  setPosition: (position: MonacoPosition) => void;
  onKeyDown: (listener: (event: MonacoKeyboardEvent) => void) => MonacoDisposable;
};

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-120 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white/60">
      Loading editor...
    </div>
  ),
});

const defaultEditorOptions: NonNullable<EditorProps["options"]> = {
  fontSize: 14,
  minimap: { enabled: false },
  fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  wordWrap: "on",
  automaticLayout: true,
  formatOnPaste: true,
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
};

const languageOptions = ["Python", "JavaScript", "C++", "Java"];
const powerUpTypes: PowerUpType[] = ["BLUR", "LOCK_KEYWORD", "REVERSE_KEYBOARD", "HIDE_TESTCASES", "FORCE_THEME_SWAP", "DISABLE_AUTOCOMPLETE"];

function readFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeEventType(event: MatchEventPayload) {
  return String(event.type ?? event.eventType ?? "").trim().toLowerCase();
}

function inferEventType(event: MatchEventPayload) {
  const normalizedType = normalizeEventType(event);
  const payload = asPayload(event);

  if (normalizedType === "submission_result" || normalizedType === "submission" || normalizedType === "timer_tick"
    || normalizedType === "powerup_received" || normalizedType === "powerup_used" || normalizedType === "chat_message"
    || normalizedType === "match_end" || normalizedType === "match_void" || normalizedType === "judge_error"
    || normalizedType === "badge_earned") {
    return normalizedType;
  }

  if (normalizedType === "powerup" || typeof payload.durationMs === "number" || payload.keyword !== undefined
    || payload.powerUpType !== undefined || payload.powerupType !== undefined) {
    return "powerup_received";
  }

  if (typeof payload.secondsRemaining === "number") {
    return "timer_tick";
  }

  if (payload.submissionId !== undefined || payload.player1Hp !== undefined || payload.player2Hp !== undefined || payload.verdict !== undefined) {
    return "submission_result";
  }

  if (payload.winnerId !== undefined || payload.finalP1Hp !== undefined || payload.finalP2Hp !== undefined) {
    return "match_end";
  }

  return normalizedType;
}

function asPayload(event: MatchEventPayload) {
  return (event.data ?? event.payload ?? event) as Record<string, unknown>;
}

function isPowerUpType(value: string): value is PowerUpType {
  return powerUpTypes.includes(value as PowerUpType);
}

export default function ArenaPage() {
  const params = useParams<{ matchId: string | string[] }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const matchId = readFirstValue(params.matchId);

  const match = useMatchStore(state => ({
    matchId: state.matchId,
    status: state.status,
    problem: state.problem,
    visibleTestCases: state.visibleTestCases,
    p1: state.p1,
    p2: state.p2,
    timer: state.timer,
    powerups: state.powerups,
    chatMessages: state.chatMessages,
    matchEvents: state.matchEvents,
  }));
  const initMatch = useMatchStore(state => state.initMatch);
  const updateHp = useMatchStore(state => state.updateHp);
  const addChat = useMatchStore(state => state.addChat);
  const setTimer = useMatchStore(state => state.setTimer);
  const consumePowerUp = useMatchStore(state => state.consumePowerUp);
  const addMatchEvent = useMatchStore(state => state.addMatchEvent);
  const endMatch = useMatchStore(state => state.endMatch);
  const setVisibleTestCases = useMatchStore(state => state.setVisibleTestCases);

  const damagePopupRef = useRef<DamagePopupHandle | null>(null);
  const editorRef = useRef<MonacoEditorLike | null>(null);
  const editorKeydownDisposableRef = useRef<MonacoDisposable | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRestoreTimerRef = useRef<number | null>(null);
  const reverseTimerRef = useRef<number | null>(null);
  const lockedKeywordTimerRef = useRef<number | null>(null);
  const tempBlurTimerRef = useRef<number | null>(null);
  const reverseKeyboardRef = useRef(false);
  const idCounterRef = useRef(0);

  const [loading, setLoading] = useState(Boolean(matchId));
  const [initializing, setInitializing] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("Python");
  const [code, setCode] = useState("function solve() {\n  // write your solution here\n}\n");
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [editorOptions, setEditorOptions] = useState<NonNullable<EditorProps["options"]>>(defaultEditorOptions);
  const [lockedKeywordBanner, setLockedKeywordBanner] = useState<string | null>(null);
  const [reverseKeyboard, setReverseKeyboard] = useState(false);
  const [runResult, setRunResult] = useState<JudgeResult | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [myRankTier, setMyRankTier] = useState("Bronze");
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; tone: string; title: string; detail?: string; icon?: string }>>([]);

  const problem = match.problem;
  const visibleTestCases = match.visibleTestCases;
  const myPlayer = currentUserId === match.p1.id ? match.p1 : currentUserId === match.p2.id ? match.p2 : match.p1;
  const opponentPlayer = myPlayer.id === match.p1.id ? match.p2 : match.p1;
  const isSpectator = Boolean(currentUserId && currentUserId !== match.p1.id && currentUserId !== match.p2.id);

  const nextLocalId = useCallback((prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }, []);

  const addToast = useCallback((tone: string, title: string, detail?: string, icon?: string) => {
    const id = nextLocalId("toast");
    setToasts(current => [{ id, tone, title, detail, icon }, ...current].slice(0, 6));
    window.setTimeout(() => {
      setToasts(current => current.filter(item => item.id !== id));
    }, 4500);
  }, [nextLocalId]);

  const applyPowerUpEffect = useCallback((event: MatchEventPayload, payload: Record<string, unknown>) => {
    const rawPowerUp = String(payload.powerUpType ?? payload.powerupType ?? payload.powerUpKey ?? payload.effect ?? payload.name ?? payload.type ?? event.type ?? "").toUpperCase();
    const durationMs = Number(payload.durationMs ?? payload.duration ?? 0);

    switch (rawPowerUp) {
      case "BLUR": {
        if (editorWrapperRef.current) {
          editorWrapperRef.current.style.filter = "blur(5px)";
          if (tempBlurTimerRef.current) {
            window.clearTimeout(tempBlurTimerRef.current);
          }
          tempBlurTimerRef.current = window.setTimeout(() => {
            if (editorWrapperRef.current) {
              editorWrapperRef.current.style.filter = "";
            }
          }, durationMs || 5000);
        }
        break;
      }
      case "LOCK_KEYWORD": {
        const keyword = String(payload.keyword ?? payload.lockedKeyword ?? "keyword");
        setLockedKeywordBanner(keyword);
        if (lockedKeywordTimerRef.current) {
          window.clearTimeout(lockedKeywordTimerRef.current);
        }
        lockedKeywordTimerRef.current = window.setTimeout(() => setLockedKeywordBanner(null), durationMs || 5000);
        break;
      }
      case "REVERSE_KEYBOARD": {
        setReverseKeyboard(true);
        if (reverseTimerRef.current) {
          window.clearTimeout(reverseTimerRef.current);
        }
        reverseTimerRef.current = window.setTimeout(() => setReverseKeyboard(false), durationMs || 5000);
        break;
      }
      case "HIDE_TESTCASES": {
        setVisibleTestCases([]);
        break;
      }
      case "FORCE_THEME_SWAP": {
        setEditorTheme(current => (current === "vs-dark" ? "light" : "vs-dark"));
        break;
      }
      case "DISABLE_AUTOCOMPLETE": {
        setEditorOptions(prev => ({
          ...prev,
          suggestOnTriggerCharacters: false,
          quickSuggestions: false,
        }));
        if (autocompleteRestoreTimerRef.current) {
          window.clearTimeout(autocompleteRestoreTimerRef.current);
        }
        autocompleteRestoreTimerRef.current = window.setTimeout(() => {
          setEditorOptions(prev => ({
            ...prev,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
          }));
        }, durationMs || 5000);
        break;
      }
      default:
        break;
    }

    if (isPowerUpType(rawPowerUp)) {
      consumePowerUp(rawPowerUp);
    }
  }, [consumePowerUp, setVisibleTestCases]);

  const handleMatchEvent = useCallback((event: MatchEventPayload) => {
    const eventType = inferEventType(event);
    const payload = asPayload(event);

    switch (eventType) {
      case "submission_result":
      case "submission": {
        const playerId = String(payload.playerId ?? payload.userId ?? payload.submissionUserId ?? "");
        const player1Hp = Number(payload.player1Hp ?? Number.NaN);
        const player2Hp = Number(payload.player2Hp ?? Number.NaN);
        const newHp = Number(payload.hp ?? payload.newHp ?? payload.playerHp ?? payload.remainingHp ?? Number.NaN);
        const damage = Number(payload.damage ?? payload.damageDealt ?? payload.amount ?? 0);
        const winnerId = payload.winnerId ? String(payload.winnerId) : null;

        if (match.p1.id && Number.isFinite(player1Hp)) {
          updateHp(match.p1.id, player1Hp);
        }

        if (match.p2.id && Number.isFinite(player2Hp)) {
          updateHp(match.p2.id, player2Hp);
        }

        if (playerId && Number.isFinite(newHp)) {
          updateHp(playerId, newHp);
        }

        if (winnerId) {
          endMatch({
            winnerId,
            winnerUsername: winnerId === match.p1.id ? match.p1.username : match.p2.username,
            reason: "Match completed",
          });
          if (matchId) {
            router.push(`/match/${matchId}/result`);
          }
        }

        if (Number.isFinite(damage) && damage !== 0) {
          damagePopupRef.current?.show(damage);
        }
        break;
      }
      case "timer_tick": {
        const seconds = Number(payload.seconds ?? payload.remainingSeconds ?? 0);
        setTimer(seconds);
        break;
      }
      case "powerup_received": {
        applyPowerUpEffect(event, payload);
        break;
      }
      case "powerup_used": {
        addToast(
          "teal",
          `${String(payload.username ?? payload.userName ?? "A player")} used ${String(payload.powerUpType ?? payload.powerUpKey ?? payload.type ?? "a power-up")}`,
          undefined,
          "Zap",
        );
        break;
      }
      case "chat_message": {
        addChat({
          id: String(payload.id ?? nextLocalId("chat")),
          senderId: String(payload.senderId ?? payload.userId ?? ""),
          senderUsername: String(payload.senderUsername ?? payload.username ?? "Player"),
          message: String(payload.message ?? payload.text ?? ""),
          createdAt: String(payload.createdAt ?? new Date().toISOString()),
        });
        break;
      }
      case "match_end": {
        endMatch({
          winnerId: payload.winnerId ? String(payload.winnerId) : null,
          winnerUsername: payload.winnerUsername ? String(payload.winnerUsername) : null,
          reason: String(payload.reason ?? "Match completed"),
        });
        if (matchId) {
          router.push(`/match/${matchId}/result`);
        }
        break;
      }
      case "match_void": {
        endMatch({
          winnerId: null,
          winnerUsername: null,
          reason: String(payload.reason ?? "Match voided"),
        });
        if (matchId) {
          router.push(`/match/${matchId}/result`);
        }
        break;
      }
      case "judge_error": {
        addToast("rose", "Execution failed — you may resubmit", String(payload.message ?? "Judge error"), "Bug");
        break;
      }
      case "badge_earned": {
        addToast(
          "amber",
          `Badge earned: ${String(payload.badgeName ?? payload.name ?? "Untitled")}`,
          String(payload.message ?? "Nice work"),
          "BadgeCheck",
        );
        break;
      }
      default:
        addMatchEvent({
          id: String(payload.id ?? nextLocalId("event")),
          type: eventType || String(payload.type ?? "event"),
          message: String(payload.message ?? payload.title ?? (eventType || "Event received")),
          createdAt: new Date().toISOString(),
        });
        break;
    }
  }, [addChat, addMatchEvent, addToast, applyPowerUpEffect, endMatch, matchId, nextLocalId, router, setTimer, updateHp]);

  useEffect(() => {
    reverseKeyboardRef.current = reverseKeyboard;
  }, [reverseKeyboard]);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const loadArena = async () => {
      try {
        const token = await getToken();
        const arenaState = await apiJson<ArenaStateDto>(`/api/arena/${matchId}/state`, {
          token: token ?? undefined,
        });

        if (!active) {
          return;
        }

        const participant = arenaState.currentUserId === arenaState.match.player1.id
          || arenaState.currentUserId === arenaState.match.player2.id;
        const currentPlayer = participant
          ? (arenaState.currentUserId === arenaState.match.player1.id ? arenaState.match.player1 : arenaState.match.player2)
          : arenaState.match.player1;
        const opponentPlayer = participant
          ? (arenaState.currentUserId === arenaState.match.player1.id ? arenaState.match.player2 : arenaState.match.player1)
          : arenaState.match.player2;

        setCurrentUserId(arenaState.currentUserId);
        setMyRankTier(currentPlayer.rank ?? "Bronze");
        setSelectedLanguage(currentPlayer.preferredLanguages?.[0] ?? opponentPlayer.preferredLanguages?.[0] ?? "Python");
        setSpectatorCount(0);

        const problemData = await apiJson<{ visibleTestCases?: VisibleTestCase[] }>(
          `/api/problems/${arenaState.match.problem.id}`,
          { token: token ?? undefined },
        );

        if (!active) {
          return;
        }

        const resolvedStatus = String(arenaState.match.status).toLowerCase();

        initMatch({
          matchId: arenaState.match.id,
          status: resolvedStatus === "completed" || resolvedStatus === "ended"
            ? "ended"
            : resolvedStatus === "loading"
              ? "loading"
              : resolvedStatus === "idle"
                ? "idle"
                : "active",
          problem: {
            id: arenaState.match.problem.id,
            title: arenaState.match.problem.title,
            difficulty: arenaState.match.problem.difficulty,
          },
          visibleTestCases: problemData.visibleTestCases ?? [],
          p1: {
            id: arenaState.match.player1.id,
            username: arenaState.match.player1.username,
            rankTier: arenaState.match.player1.rank,
            hp: arenaState.match.player1Hp,
            submissions: [],
          },
          p2: {
            id: arenaState.match.player2.id,
            username: arenaState.match.player2.username,
            rankTier: arenaState.match.player2.rank,
            hp: arenaState.match.player2Hp,
            submissions: [],
          },
          timer: Math.max(0, Math.ceil((arenaState.roundEndsAtEpochMs - arenaState.serverEpochMs) / 1000)),
        });

        setVisibleTestCases(problemData.visibleTestCases ?? []);

        await connect(token ?? undefined);

        if (!active) {
          return;
        }

        const spectatorSubscription = subscribe(`/topic/matches/${matchId}/spectators`, message => {
          try {
            const payload = JSON.parse(message) as { count?: number };
            setSpectatorCount(Number(payload.count ?? 0));
          } catch {
            // Ignore malformed spectator payloads.
          }
        });

        const matchSubscription = subscribe(`/topic/matches/${matchId}`, message => {
          try {
            const event = JSON.parse(message) as MatchEventPayload;
            handleMatchEvent(event);
          } catch (error) {
            addToast("rose", "Malformed match event", String(error));
          }
        });

        const powerUpSubscription = subscribe(`/topic/matches/${matchId}/powerups`, message => {
          try {
            const event = JSON.parse(message) as MatchEventPayload;
            handleMatchEvent(event);
          } catch (error) {
            addToast("rose", "Malformed power-up event", String(error));
          }
        });

        const legacySubscription = subscribe(`/topic/match.${matchId}`, message => {
          try {
            const event = JSON.parse(message) as MatchEventPayload;
            handleMatchEvent(event);
          } catch (error) {
            addToast("rose", "Malformed match event", String(error));
          }
        });

        subscription = {
          unsubscribe: () => {
            spectatorSubscription?.unsubscribe();
            matchSubscription?.unsubscribe();
            powerUpSubscription?.unsubscribe();
            legacySubscription?.unsubscribe();
          },
        };
      } catch (error) {
        addToast("rose", "Arena failed to load", error instanceof Error ? error.message : "Unknown error");
      } finally {
        if (active) {
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    void loadArena();

    return () => {
      active = false;
      subscription?.unsubscribe();
      editorKeydownDisposableRef.current?.dispose();
      void disconnect();
      [autocompleteRestoreTimerRef, reverseTimerRef, lockedKeywordTimerRef, tempBlurTimerRef].forEach(ref => {
        if (ref.current) {
          window.clearTimeout(ref.current);
        }
      });
    };
  }, [addToast, getToken, handleMatchEvent, initMatch, matchId, setVisibleTestCases]);

  async function submitCode() {
    if (!matchId || !editorRef.current) {
      return;
    }

    const codeToSend = editorRef.current.getValue?.() ?? code;
    publish("/app/match.submit", {
      matchId,
      code: codeToSend,
      language: selectedLanguage,
    });

    addToast("teal", "Submission sent", `${selectedLanguage} code submitted to the match queue.`, "Send");
  }

  async function runVisibleTests() {
    if (!matchId || !problem) {
      return;
    }

    try {
      setRunLoading(true);
      const token = await getToken();
      const judgeResult = await apiJson<JudgeResult>("/api/submissions/run", {
        token: token ?? undefined,
        method: "POST",
        json: {
          problemId: problem.id,
          code: editorRef.current?.getValue?.() ?? code,
          language: selectedLanguage,
          visibleTestCases: visibleTestCases.map(testCase => ({
            id: testCase.id,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
          })),
        },
      });
      setRunResult(judgeResult);
    } catch (error) {
      addToast("rose", "Run tests failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setRunLoading(false);
    }
  }

  async function surrender() {
    if (!matchId) {
      return;
    }

    if (!window.confirm("Surrender this match?")) {
      return;
    }

    try {
      const token = await getToken();
      await apiFetch(`/api/matches/${matchId}/surrender`, {
        method: "POST",
        token: token ?? undefined,
      });
      addToast("rose", "You surrendered", "Match surrender submitted.");
    } catch (error) {
      addToast("rose", "Surrender failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function sendChat() {
    if (!matchId || !chatInput.trim()) {
      return;
    }

    publish("/app/match.chat", {
      matchId,
      message: chatInput.trim(),
    });
    setChatInput("");
  }

  function handleEditorMount(editor: MonacoEditorLike) {
    editorRef.current = editor;

    editorKeydownDisposableRef.current?.dispose();
    editorKeydownDisposableRef.current = editor.onKeyDown(event => {
      if (!reverseKeyboardRef.current) {
        return;
      }

      const key = event.browserEvent.key;
      const printable = key.length === 1 && !event.browserEvent.metaKey && !event.browserEvent.ctrlKey && !event.browserEvent.altKey;

      if (!printable) {
        return;
      }

      event.preventDefault();

      const selection = editor.getSelection();
      const position = editor.getPosition();

      if (selection) {
        editor.executeEdits("reverse-keyboard", [{ range: selection, text: key, forceMoveMarkers: true }]);
        editor.setPosition({ lineNumber: selection.startLineNumber, column: selection.startColumn });
        return;
      }

      if (!position) {
        return;
      }

      const insertRange: MonacoRange = {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };

      editor.executeEdits("reverse-keyboard", [{ range: insertRange, text: key, forceMoveMarkers: true }]);
      editor.setPosition(position);
    });
  }

  const powerUpCounts = useMemo(() => {
    return match.powerups.reduce<Record<string, number>>((counts, powerUp) => {
      counts[powerUp] = (counts[powerUp] ?? 0) + 1;
      return counts;
    }, {});
  }, [match.powerups]);

  const testCasesVisible = visibleTestCases.length > 0;

  if (loading || initializing) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading arena...
        </div>
      </main>
    );
  }

  if (!matchId) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-full border border-rose-400/25 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-100">
          Invalid match id.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-2xl">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-white/55">Arena</div>
          <h1 className="mt-1 text-xl font-black text-white">{problem?.title ?? "Match Arena"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isSpectator ? <span className="rounded-full border border-codeslam-teal/30 bg-codeslam-teal/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">Spectating</span> : null}
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{spectatorCount} spectators</span>
          <RankBadge tier={myRankTier} />
          <MatchTimer seconds={match.timer} />
          {!isSpectator ? (
            <button
              type="button"
              onClick={surrender}
              className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Surrender
            </button>
          ) : null}
        </div>
      </div>

      {lockedKeywordBanner ? (
        <div className="rounded-[1.2rem] border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
          Locked keyword: {lockedKeywordBanner}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-white/55">Player 1</div>
                    <div className="mt-1 text-lg font-black text-white">{match.p1.username}</div>
                  </div>
                  <RankBadge tier={match.p1.id === myPlayer.id ? myPlayer.rankTier ?? "Bronze" : opponentPlayer.rankTier ?? "Bronze"} />
                </div>
                <div className="mt-4">
                  <HpBar hp={match.p1.hp} label="HP" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-white/55">Player 2</div>
                    <div className="mt-1 text-lg font-black text-white">{match.p2.username}</div>
                  </div>
                  <RankBadge tier={match.p2.id === myPlayer.id ? myPlayer.rankTier ?? "Bronze" : opponentPlayer.rankTier ?? "Bronze"} />
                </div>
                <div className="mt-4">
                  <HpBar hp={match.p2.hp} label="HP" />
                </div>
              </div>
            </div>
          </div>

          <div ref={editorWrapperRef} className={`relative rounded-3xl border border-white/10 bg-black/25 p-4 transition duration-300 ${isSpectator ? "hidden" : ""}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs uppercase tracking-[0.28em] text-white/55">Code Editor</div>
                {reverseKeyboard ? <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">Reverse keyboard active</span> : null}
                {editorTheme === "light" ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">Light theme</span> : null}
              </div>
              <select
                value={selectedLanguage}
                onChange={event => setSelectedLanguage(event.target.value)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none"
              >
                {languageOptions.map(language => (
                  <option key={language} value={language} className="bg-slate-950 text-white">
                    {language}
                  </option>
                ))}
              </select>
            </div>

            <MonacoEditor
              height="520px"
              theme={editorTheme}
              defaultLanguage="javascript"
              language={selectedLanguage.toLowerCase()}
              value={code}
              onChange={value => setCode(value ?? "")}
              onMount={handleEditorMount}
              options={editorOptions}
            />

            <DamagePopup ref={damagePopupRef} />
          </div>

          <div className={`grid gap-3 sm:grid-cols-3 ${isSpectator ? "hidden" : ""}`}>
            <button
              type="button"
              onClick={submitCode}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-codeslam-teal px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <Send className="h-4 w-4" /> Submit
            </button>
            <button
              type="button"
              onClick={runVisibleTests}
              disabled={runLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run Tests
            </button>
            <button
              type="button"
              onClick={() => addToast("teal", "Match state refreshed", "Using the latest websocket data.")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Swords className="h-4 w-4" /> Sync
            </button>
          </div>

          {runResult ? (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/55">Run Results</div>
                  <div className="mt-1 text-lg font-black text-white">{runResult.verdict}</div>
                </div>
                <div className="text-right text-sm text-white/70">
                  <div>{runResult.passedCases}/{runResult.totalCases} passed</div>
                  <div>{runResult.runtimeMs} ms • {runResult.memoryMb.toFixed(2)} MB</div>
                </div>
              </div>

              <div className="grid gap-3">
                {runResult.caseResults.map(testCase => (
                  <div key={testCase.caseIndex} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">Case {testCase.caseIndex}</div>
                      <div className={testCase.passed ? "text-emerald-300" : "text-rose-300"}>{testCase.verdict}</div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-2">
                      <div>stdout: {testCase.stdout || "—"}</div>
                      <div>stderr: {testCase.stderr || "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className={`rounded-3xl border border-white/10 bg-black/20 p-5 ${isSpectator ? "hidden" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/55">Problem</div>
                <div className="mt-1 text-2xl font-black text-white">{problem?.title}</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
                {problem?.difficulty}
              </div>
            </div>

            <div className="mt-4 space-y-4 text-sm leading-7 text-white/72">
              <p>{problem?.description}</p>
              {problem?.constraintsText ? <p><span className="font-semibold text-white">Constraints:</span> {problem.constraintsText}</p> : null}
              {problem?.topics?.length ? <p><span className="font-semibold text-white">Topics:</span> {problem.topics.join(", ")}</p> : null}
            </div>
          </div>

          <div className={`rounded-3xl border border-white/10 bg-black/20 p-5 ${isSpectator ? "hidden" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.28em] text-white/55">Visible Test Cases</div>
              <button
                type="button"
                onClick={() => setVisibleTestCases(problem?.visibleTestCases ?? [])}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {testCasesVisible ? visibleTestCases.map(testCase => (
                <div key={testCase.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-white">Case {testCase.displayOrder ?? testCase.id}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/55">Visible</div>
                  </div>
                  <div className="mt-3 grid gap-3 text-xs text-white/65">
                    <div><span className="font-semibold text-white">Input:</span> {testCase.input}</div>
                    <div><span className="font-semibold text-white">Expected:</span> {testCase.expectedOutput}</div>
                    {testCase.explanation ? <div><span className="font-semibold text-white">Note:</span> {testCase.explanation}</div> : null}
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/55">
                  Hidden by power-up.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.28em] text-white/55">Power-ups</div>
              <div className="text-xs text-white/45">Inventory</div>
            </div>
            <div className="mt-4 grid gap-3">
              <PowerUpButton icon={<EyeOff className="h-4 w-4" />} label="BLUR" count={powerUpCounts.BLUR ?? 0} onClick={() => publish("/app/match.powerup", { matchId, type: "BLUR" })} />
              <PowerUpButton icon={<Keyboard className="h-4 w-4" />} label="LOCK KEYWORD" count={powerUpCounts.LOCK_KEYWORD ?? 0} onClick={() => publish("/app/match.powerup", { matchId, type: "LOCK_KEYWORD" })} />
              <PowerUpButton icon={<Flame className="h-4 w-4" />} label="REVERSE KEYBOARD" count={powerUpCounts.REVERSE_KEYBOARD ?? 0} onClick={() => publish("/app/match.powerup", { matchId, type: "REVERSE_KEYBOARD" })} />
              <PowerUpButton icon={<EyeOff className="h-4 w-4" />} label="HIDE TESTCASES" count={powerUpCounts.HIDE_TESTCASES ?? 0} onClick={() => publish("/app/match.powerup", { matchId, type: "HIDE_TESTCASES" })} />
              <PowerUpButton icon={<MoonStar className="h-4 w-4" />} label="FORCE THEME SWAP" count={powerUpCounts.FORCE_THEME_SWAP ?? 0} onClick={() => publish("/app/match.powerup", { matchId, type: "FORCE_THEME_SWAP" })} />
              <PowerUpButton icon={<Bug className="h-4 w-4" />} label="DISABLE AUTOCOMPLETE" count={powerUpCounts.DISABLE_AUTOCOMPLETE ?? 0} onClick={() => publish("/app/match.powerup", { matchId, type: "DISABLE_AUTOCOMPLETE" })} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.28em] text-white/55">Chat</div>
              <MessageCircle className="h-4 w-4 text-white/45" />
            </div>

            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {match.chatMessages.length ? match.chatMessages.map(message => (
                <div key={message.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/72">
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/45">{message.senderUsername}</div>
                  <div>{message.message}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/55">
                  No messages yet.
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={chatInput}
                onChange={event => setChatInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendChat();
                  }
                }}
                placeholder="Send a message"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => void sendChat()}
                className="rounded-2xl bg-codeslam-teal px-4 py-3 text-sm font-semibold text-white"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map(toast => (
          <div key={toast.id} className="rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl border border-white/10 bg-white/5 p-2 text-white">
                {toast.icon === "BadgeCheck" ? <BadgeCheck className="h-4 w-4" /> : toast.icon === "Bug" ? <Bug className="h-4 w-4" /> : toast.icon === "MoonStar" ? <MoonStar className="h-4 w-4" /> : toast.icon === "Keyboard" ? <Keyboard className="h-4 w-4" /> : toast.icon === "Zap" ? <Zap className="h-4 w-4" /> : toast.icon === "Send" ? <Send className="h-4 w-4" /> : toast.icon === "ShieldAlert" ? <ShieldAlert className="h-4 w-4" /> : toast.icon === "Play" ? <Play className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{toast.title}</div>
                {toast.detail ? <div className="mt-1 text-sm text-white/60">{toast.detail}</div> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
