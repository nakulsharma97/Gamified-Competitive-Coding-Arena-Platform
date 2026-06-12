import { auth } from "@clerk/nextjs/server";
import { apiJson, getServerToken } from "@/lib/api";
import { DashboardShowcase } from "@/components/dashboard-showcase";

type UserMe = {
  profile: {
    id: string;
    username: string;
    eloRating: number;
    rank?: string | null;
    preferredLanguages?: string[];
    interests?: string[];
  };
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    badgesEarned: number;
    rankPosition: number;
  };
};

type GlobalStats = {
  onlinePlayers: number;
  matchesToday: number;
  totalProblems: number;
  totalUsers: number;
};

type MatchHistoryItem = {
  id: string;
  opponentUsername?: string;
  problem: { title: string };
  result: string;
  status: string;
  player1Hp: number;
  player2Hp: number;
  eloChange: number;
  createdAt?: string;
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
  currentUserEntry?: LeaderboardEntry | null;
};

type EloHistoryPoint = {
  createdAt: string;
  eloAfter: number;
};

async function loadDashboardData() {
  const session = await auth();
  const token = await session.getToken(process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE ? { template: process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE } : undefined);
  const resolvedToken = token ?? (await getServerToken());

  return Promise.all([
    apiJson<UserMe>("/api/users/me", { token: resolvedToken ?? undefined }),
    apiJson<GlobalStats>("/api/stats", { token: resolvedToken ?? undefined }),
    apiJson<{ data: MatchHistoryItem[] }>("/api/matches/history?page=0&size=5", { token: resolvedToken ?? undefined }),
    apiJson<LeaderboardResponse>("/api/leaderboard?page=0&size=5", { token: resolvedToken ?? undefined }),
    apiJson<EloHistoryPoint[]>("/api/users/me/elo-history?days=30", { token: resolvedToken ?? undefined }),
  ]);
}

export default async function DashboardPage() {
  const [meResponse, globalStats, history, leaderboard, eloHistory] = await loadDashboardData();

  const me = {
    id: meResponse.profile.id,
    username: meResponse.profile.username,
    eloRating: meResponse.profile.eloRating,
    onboardingComplete: true,
    avatarUrl: undefined,
    languages: meResponse.profile.preferredLanguages,
    interests: meResponse.profile.interests,
    rank: meResponse.profile.rank,
  };

  return (
    <DashboardShowcase
      me={me}
      stats={meResponse.stats}
      history={history.data.map(match => ({
        id: String(match.id),
        opponentUsername: match.opponentUsername,
        problemTitle: match.problem.title,
        result: match.result,
        eloChange: match.eloChange ?? 0,
        createdAt: match.createdAt,
      }))}
      leaderboard={leaderboard.players}
      globalStats={globalStats}
      eloHistory={eloHistory}
    />
  );
}