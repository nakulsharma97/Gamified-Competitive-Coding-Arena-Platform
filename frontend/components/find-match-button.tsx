"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { connect, subscribe } from "@/lib/stomp";
import { apiFetch } from "@/lib/api";

export function FindMatchButton() {
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "connecting" | "searching">("idle");
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const broadcastSubRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionRef.current?.unsubscribe();
      broadcastSubRef.current?.unsubscribe();
    };
  }, []);

  const handleMatchFound = (matchId: string) => {
    subscriptionRef.current?.unsubscribe();
    broadcastSubRef.current?.unsubscribe();
    subscriptionRef.current = null;
    broadcastSubRef.current = null;
    router.push(`/arena/${matchId}`);
  };

  const handleFindMatch = async () => {
    if (!userId) return;
    setState("connecting");

    try {
      const token = await getToken();
      await connect(token ?? undefined);

      // Subscribe to user-destination (STOMP routes this per-session)
      const sub = subscribe("/user/queue/match-found", (message) => {
        try {
          const payload = JSON.parse(message) as { matchId?: string };
          if (payload.matchId) handleMatchFound(payload.matchId);
        } catch {
          // ignore malformed
        }
      });

      // Also subscribe to broadcast topic as fallback
      // Backend sends to BOTH: convertAndSendToUser + convertAndSend to /topic/user/{userId}/matchFound
      const broadcastSub = subscribe(`/topic/user/${userId}/matchFound`, (message) => {
        try {
          const payload = JSON.parse(message) as { matchId?: string };
          if (payload.matchId) handleMatchFound(payload.matchId);
        } catch {
          // ignore malformed
        }
      });

      subscriptionRef.current = sub;
      broadcastSubRef.current = broadcastSub;
      setState("searching");

      await apiFetch("/api/queue/join", {
        method: "POST",
        token: token ?? undefined,
      });
    } catch {
      setState("idle");
    }
  };

  const handleCancel = async () => {
    subscriptionRef.current?.unsubscribe();
    broadcastSubRef.current?.unsubscribe();
    subscriptionRef.current = null;
    broadcastSubRef.current = null;

    try {
      const token = await getToken();
      await apiFetch("/api/queue/leave", {
        method: "DELETE",
        token: token ?? undefined,
      });
    } catch {
      // best-effort cancel
    }

    setState("idle");
  };

  if (state === "searching" || state === "connecting") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80">
          <Loader2 className="h-4 w-4 animate-spin text-codeslam-teal" />
          {state === "connecting" ? "Connecting..." : "Finding opponent..."}
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFindMatch}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-codeslam-teal px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95"
    >
      Find Match
    </button>
  );
}
