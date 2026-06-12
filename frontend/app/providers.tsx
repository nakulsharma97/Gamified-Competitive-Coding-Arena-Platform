"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { connect, subscribe } from "@/lib/stomp";
import { ClerkProvider } from "@clerk/nextjs";

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  const getToken = async () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

const isLoaded = true;

const userId =
  typeof window !== "undefined"
    ? localStorage.getItem("userId")
    : null;
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  useEffect(() => {
    if (!apiKey || posthog.__loaded) {
      return;
    }

    posthog.init(apiKey, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: true,
      loaded: instance => {
        if (process.env.NODE_ENV === "development") {
          instance.debug();
        }
      },
    });
  }, [apiKey, host]);

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const wireNotifications = async () => {
      try {
        const token = await getToken();
        await connect(token ?? undefined);

        if (!active) {
          return;
        }

        subscription = subscribe("/user/queue/notification", message => {
          try {
            const payload = JSON.parse(message) as {
              type?: string;
              badgeName?: string;
              badgeIcon?: string;
              description?: string;
            };

            const type = String(payload.type ?? "").toLowerCase();
            if (type !== "badge_earned") {
              return;
            }

            toast({
              title: payload.badgeName ? `Badge earned: ${payload.badgeName}` : "Badge earned",
              description: payload.description ?? (payload.badgeIcon ? `Icon: ${payload.badgeIcon}` : "A new badge has been added to your profile."),
              variant: "success",
            });
          } catch {
            // Ignore malformed notification payloads.
          }
        });
      } catch {
        // Badge notifications are non-blocking.
      }
    };

    void wireNotifications();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [getToken, isLoaded, userId]);

  return (
  <ClerkProvider>
    <PostHogProvider client={posthog}>
      {children}
      <Toaster />
    </PostHogProvider>
  </ClerkProvider>
);
}