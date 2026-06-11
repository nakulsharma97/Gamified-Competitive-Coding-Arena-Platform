"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { connect, subscribe } from "@/lib/stomp";

type PublicEvent = {
  p1Username: string;
  p2Username: string;
  problemTitle: string;
  eloChange: number;
};

type LiveTickerProps = {
  initialEvents?: PublicEvent[];
};

export function LiveTicker({ initialEvents = [] }: LiveTickerProps) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<PublicEvent[]>(initialEvents.slice(0, 8));

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const token = await getToken();
      await connect(token ?? undefined);

      if (!active) {
        return;
      }

      const subscription = subscribe("/topic/public.events", message => {
        try {
          const event = JSON.parse(message) as PublicEvent;
          setEvents(current => [event, ...current].slice(0, 8));
        } catch {
          setEvents(current => [
            {
              p1Username: "Arena",
              p2Username: "Battle",
              problemTitle: message,
              eloChange: 0,
            },
            ...current,
          ].slice(0, 8));
        }
      });

      unsubscribe = () => subscription?.unsubscribe();
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [getToken]);

  const marqueeItems = useMemo(() => [...events, ...events], [events]);

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/25 px-4 py-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/55">
        <span>Live Arena Feed</span>
        <span>Auto-updating</span>
      </div>

      <div className="overflow-hidden">
        <div
          className="flex w-max gap-3 whitespace-nowrap"
          style={{ animation: "codeslam-marquee 28s linear infinite" }}
        >
          {marqueeItems.length === 0 ? (
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              Waiting for the next match finish...
            </div>
          ) : (
            marqueeItems.map((event, index) => (
              <div
                key={`${event.p1Username}-${event.p2Username}-${event.problemTitle}-${index}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
              >
                <span className="font-semibold text-white">{event.p1Username}</span>
                <span className="mx-2 text-white/35">vs</span>
                <span className="font-semibold text-white">{event.p2Username}</span>
                <span className="mx-2 text-white/35">•</span>
                <span className="text-white/70">{event.problemTitle}</span>
                <span className="mx-2 text-white/35">•</span>
                <span className={event.eloChange >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {event.eloChange >= 0 ? "+" : ""}{event.eloChange} ELO
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
