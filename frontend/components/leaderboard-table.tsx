"use client";

import { useRouter } from "next/navigation";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  eloRating: number;
  tier: string;
  winRate: number;
  totalMatches: number;
};

type LeaderboardTableProps = {
  rows: LeaderboardEntry[];
  currentUserId?: string | null;
  currentUserEntry?: LeaderboardEntry | null;
  currentUserRank?: number | null;
};

function AvatarInitials({ username }: { username: string }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function LeaderboardTable({ rows, currentUserId, currentUserEntry, currentUserRank }: LeaderboardTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/55">Rank Table</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-210 text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.24em] text-white/45">
            <tr>
              <th className="py-2">#</th>
              <th className="py-2">Player</th>
              <th className="py-2">ELO</th>
              <th className="py-2">Win Rate</th>
              <th className="py-2">Matches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isMe = Boolean(currentUserId && row.userId === currentUserId);
              return (
                <tr
                  key={row.userId}
                  onClick={() => router.push(`/u/${row.username}`)}
                  className={`cursor-pointer border-t border-white/10 transition hover:bg-white/10 ${isMe ? "bg-codeslam-purple/25" : ""}`}
                >
                  <td className="py-3 font-semibold text-white">#{row.rank}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <AvatarInitials username={row.username} />
                      <div>
                        <div className="font-semibold text-white">{row.username}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-white/45">{row.tier}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-white">{row.eloRating}</td>
                  <td className="py-3 text-white/75">{(row.winRate * 100).toFixed(1)}%</td>
                  <td className="py-3 text-white/75">{row.totalMatches}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentUserEntry ? (
        <div
          onClick={() => router.push(`/u/${currentUserEntry.username}`)}
          className="mt-4 cursor-pointer rounded-2xl border border-codeslam-purple/40 bg-codeslam-purple/25 p-4 transition hover:bg-codeslam-purple/35"
        >
          <div className="text-xs uppercase tracking-[0.22em] text-white/60">Your Position</div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white">
            <span className="font-black">#{currentUserRank ?? currentUserEntry.rank}</span>
            <span>{currentUserEntry.username}</span>
            <span>{currentUserEntry.eloRating} ELO</span>
            <span>{(currentUserEntry.winRate * 100).toFixed(1)}% WR</span>
            <span>{currentUserEntry.totalMatches} matches</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
