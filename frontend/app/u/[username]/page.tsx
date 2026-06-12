import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { apiJson, getServerToken, ApiError } from "@/lib/api";
import { ProfileEloChart } from "@/components/profile-elo-chart";
import { RankBadge } from "@/components/rank-badge";

type PageProps = {
  params: Promise<{ username: string }>;
};

type BadgeDto = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  criteriaKey?: string;
};

type UserStatsDto = {
  matchesPlayed: number;
  wins: number;
  losses: number;
  badgesEarned: number;
  rankPosition: number;
};

type EloHistoryPoint = {
  createdAt: string;
  eloBefore: number;
  eloAfter: number;
};

type MatchHistoryItem = {
  id: string;
  problem: { title: string };
  opponentUsername?: string;
  result: string;
  status: string;
  player1Hp: number;
  player2Hp: number;
  eloChange: number;
  createdAt?: string;
};

type PublicProfileResponse = {
  profile: {
    id: string;
    username: string;
    eloRating: number;
    rankTier?: string | null;
    badges: string[];
    topicStrengths: Record<string, number>;
    preferredLanguages?: string[];
    interests?: string[];
  };
  badges: BadgeDto[];
  topicStrengths: Record<string, number>;
  eloHistory: EloHistoryPoint[];
  recentMatches: MatchHistoryItem[];
};

type CurrentUserResponse = {
  profile: {
    id: string;
    username: string;
  };
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "PL";
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();
  const token = (await session.getToken(process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE ? { template: process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE } : undefined)) ?? (await getServerToken());

  let publicProfile: PublicProfileResponse;
  try {
    publicProfile = await apiJson<PublicProfileResponse>(`/api/users/${encodeURIComponent(username)}`, {
      token: token ?? undefined,
      cache: "no-store",
    });
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError?.status === 404) {
      notFound();
    }
    throw error;
  }

  const me = token
    ? await apiJson<CurrentUserResponse>("/api/users/me", { token, cache: "no-store" }).catch(() => null)
    : null;

  const isOwnProfile = Boolean(me && me.profile.id === publicProfile.profile.id);

  const profile = publicProfile.profile;
  const topicStrengths = publicProfile.topicStrengths ?? profile.topicStrengths ?? {};
  const recentMatches = publicProfile.recentMatches ?? [];
  const stats = await apiJson<UserStatsDto>(`/api/users/${encodeURIComponent(username)}/stats`, {
    token: token ?? undefined,
    cache: "no-store",
  });
  const chartPoints =
    publicProfile.eloHistory.length > 0
      ? publicProfile.eloHistory
      : [{ createdAt: new Date().toISOString(), eloBefore: profile.eloRating, eloAfter: profile.eloRating }];

  const topicEntries = Object.entries(topicStrengths).sort((a, b) => b[1] - a[1]);
  const maxTopicScore = Math.max(1, ...topicEntries.map(([, score]) => score), 1);
  const earnedBadges = new Set(profile.badges ?? []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/30 text-xl font-black text-white">
              {initials(profile.username)}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">{profile.username}</h1>
              <div className="mt-2 flex items-center gap-3">
                <RankBadge tier={profile.rankTier ?? "Bronze"} />
                <span className="text-sm font-semibold text-white/80">{profile.eloRating} ELO</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(profile.preferredLanguages ?? []).map(language => (
                  <span key={language} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                    {language}
                  </span>
                ))}
                {(profile.interests ?? []).map(interest => (
                  <span key={interest} className="rounded-full border border-codeslam-teal/20 bg-codeslam-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-codeslam-teal">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {isOwnProfile ? (
            <Link
              href="/settings/profile"
              className="rounded-full bg-codeslam-teal px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Edit Profile
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/50">Matches</div>
          <div className="mt-2 text-3xl font-black text-white">{stats.matchesPlayed}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/50">Wins</div>
          <div className="mt-2 text-3xl font-black text-white">{stats.wins}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/50">Losses</div>
          <div className="mt-2 text-3xl font-black text-white">{stats.losses}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-white/50">Badges</div>
          <div className="mt-2 text-3xl font-black text-white">{stats.badgesEarned}</div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">Badges</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {publicProfile.badges.map(badge => {
              const earned = earnedBadges.has(badge.name);
              return (
                <div
                  key={badge.id}
                  className={`rounded-2xl border p-4 text-sm ${earned ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/5 text-white/45"}`}
                >
                  <div className="font-semibold">{badge.name}</div>
                  {badge.description ? <div className="mt-1 text-xs text-current/70">{badge.description}</div> : null}
                  {!earned ? <div className="mt-1 text-xs">Locked</div> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">Topic Strength</div>
          <div className="space-y-4">
            {topicEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/55">
                No topic strength data yet.
              </div>
            ) : (
              topicEntries.map(([topic, score]) => {
                const percent = Math.max(2, Math.round((score / maxTopicScore) * 100));
                return (
                  <div key={topic}>
                    <div className="mb-2 flex items-center justify-between text-sm text-white/80">
                      <span>{topic}</span>
                      <span>{score}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-codeslam-teal" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <ProfileEloChart points={chartPoints} />

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">Match History</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-white/45">
              <tr>
                <th className="py-2">Match</th>
                <th className="py-2">Problem</th>
                <th className="py-2">Opponent</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentMatches.length === 0 ? (
                <tr className="border-t border-white/10">
                  <td className="py-3 text-white/60" colSpan={4}>No recent matches available.</td>
                </tr>
              ) : (
                recentMatches.map(match => {
                  const opponent = match.opponentUsername ?? "Unknown opponent";
                  return (
                    <tr key={match.id} className="border-t border-white/10">
                      <td className="py-3 text-white/75">{String(match.id).slice(0, 8)}</td>
                      <td className="py-3 font-semibold text-white">{match.problem?.title ?? "Arena Problem"}</td>
                      <td className="py-3 text-white/75">{opponent}</td>
                      <td className="py-3 text-white/75">{match.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
