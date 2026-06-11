"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { connect, subscribe } from "@/lib/stomp";

export function LeaderboardLiveSync() {
  const { getToken, isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const wire = async () => {
      try {
        const token = await getToken();
        await connect(token ?? undefined);

        if (!active) {
          return;
        }

        subscription = subscribe("/topic/leaderboard", () => {
          router.refresh();
        });
      } catch {
        // Live leaderboard refresh is best-effort.
      }
    };

    void wire();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [getToken, isLoaded, router, userId]);

  return null;
}