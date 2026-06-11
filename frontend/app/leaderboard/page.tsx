import { auth } from "@clerk/nextjs/server";
import { apiJson, getServerToken } from "@/lib/api";
import { LeaderboardTabs } from "@/components/leaderboard-tabs";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { LeaderboardLiveSync } from "@/components/leaderboard-live-sync";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  eloRating: number;
  tier: string;
  winRate: number;
  totalMatches: number;
};

type LeaderboardResponse = {
  players: LeaderboardEntry[];
  currentUserRank?: number | null;
  currentUserEntry?: LeaderboardEntry | null;
};

function podiumClass(position: number) {
  if (position === 1) {
    return "border-amber-300/40 bg-amber-400/15";
  }

  if (position === 2) {
    return "border-slate-300/40 bg-slate-300/10";
  }

  return "border-orange-400/40 bg-orange-400/10";
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tier = typeof params.tier === "string" && params.tier.trim() ? params.tier.toUpperCase() : "ALL";

  const session = await auth();
  const token = (await session.getToken()) ?? (await getServerToken());

  const leaderboard = await apiJson<LeaderboardResponse>(`/api/leaderboard?tier=${encodeURIComponent(tier)}&page=0&size=50`, {
    token: token ?? undefined,
    cache: "no-store",
  });

  const top3 = leaderboard.players.slice(0, 3);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <LeaderboardLiveSync />
      <section className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-white/55">Leaderboard</div>
            <h1 className="mt-2 text-4xl font-black text-white">Competitive Ladder</h1>
            <div className="mt-2 text-sm text-white/60">Tier: {tier === "ALL" ? "All tiers" : tier}</div>
          </div>
          <LeaderboardTabs />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {top3.map((entry, index) => (
          <article
            key={entry.userId}
            className={`rounded-3xl border p-5 ${podiumClass(index + 1)} ${index === 0 ? "md:-translate-y-3" : ""}`}
          >
            <div className="text-xs uppercase tracking-[0.22em] text-white/60">#{index + 1}</div>
            <div className="mt-3 text-xl font-black text-white">{entry.username}</div>
            <div className="mt-2 text-sm text-white/75">{entry.tier}</div>
            <div className="mt-3 text-2xl font-black text-white">{entry.eloRating} ELO</div>
            <div className="mt-2 text-xs text-white/65">{(entry.winRate * 100).toFixed(1)}% win rate</div>
          </article>
        ))}
      </section>

      <LeaderboardTable
        rows={leaderboard.players}
        currentUserId={leaderboard.currentUserEntry?.userId ?? null}
        currentUserEntry={leaderboard.currentUserEntry ?? null}
        currentUserRank={leaderboard.currentUserRank ?? null}
      />
    </main>
  );
}
