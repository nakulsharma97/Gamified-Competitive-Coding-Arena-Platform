"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const tiers = ["ALL", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER"];

export function LeaderboardTabs() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tier = (searchParams.get("tier") ?? "ALL").toUpperCase();

  const switchTo = (nextTier: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tier", nextTier);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/25 p-2">
      {tiers.map(item => {
        const selected = tier === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => switchTo(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selected ? "bg-codeslam-purple text-white" : "text-white/70 hover:bg-white/10"}`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
