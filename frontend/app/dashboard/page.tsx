import { auth } from "@clerk/nextjs/server";
import { apiJson, getServerToken } from "@/lib/api";
import { DashboardShowcase } from "@/components/dashboard-showcase";

// Production revalidation: Refresh data every 60 seconds
export const revalidate = 60;

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

  // Use individual try-catch or catch blocks to ensure one failing API doesn't break the whole dashboard
  const headers = resolvedToken ? { token: resolvedToken } : {};

  const [meResponse, globalStats, history, leaderboard, eloHistory] = await Promise.all([
    apiJson<UserMe>("/api/users/me", headers).catch((err) => {
      console.error("Dashboard: Failed to fetch user profile", err);
      return null;
    }),
    apiJson<GlobalStats>("/api/stats", headers).catch(() => ({
      onlinePlayers: 0,
      matchesToday: 0,
      totalProblems: 0,
      totalUsers: 0,
    })),
    apiJson<{ data: MatchHistoryItem[] }>("/api/matches/history?page=0&size=5", headers).catch(() => ({ data: [] })),
    apiJson<LeaderboardResponse>("/api/leaderboard?page=0&size=5", headers).catch(() => ({ players: [] })),
    apiJson<EloHistoryPoint[]>("/api/users/me/elo-history?days=30", headers).catch(() => []),
  ]);

  return { meResponse, globalStats, history, leaderboard, eloHistory };
}

export default async function DashboardPage() {
  const { meResponse, globalStats, history, leaderboard, eloHistory } = await loadDashboardData();

  // If the user profile call failed, the user likely hasn't finished onboarding 
  // or the database record is missing.
  if (!meResponse?.profile) {
    // Redirect to onboarding if we can't find the user record
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Setting up your profile...</h1>
          <p className="mt-2 text-white/60">If this takes too long, please ensure you completed onboarding.</p>
          <a 
            href="/onboarding" 
            className="mt-6 inline-block rounded-full bg-codeslam-teal px-6 py-2 font-semibold text-white"
          >
            Go to Onboarding
          </a>
        </div>
      </main>
    );
  }

  const me = {
    id: meResponse.profile?.id,
    username: meResponse.profile?.username || "Player",
    eloRating: meResponse.profile?.eloRating ?? 1200,
    onboardingComplete: true,
    avatarUrl: undefined,
    languages: meResponse.profile?.preferredLanguages || [],
    interests: meResponse.profile?.interests || [],
    rank: meResponse.profile?.rank || "Unranked",
  };

  return (
    <DashboardShowcase
      me={me}
      stats={meResponse?.stats || {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        badgesEarned: 0,
        rankPosition: 0
      }}
      history={(history?.data || []).map(match => ({
        id: String(match.id),
        opponentUsername: match.opponentUsername,
        problemTitle: match.problem?.title || "Unknown Problem",
        result: match.result,
        eloChange: match.eloChange ?? 0,
        createdAt: match.createdAt,
      }))}
      leaderboard={leaderboard?.players || []}
      globalStats={globalStats}
      eloHistory={eloHistory || []}
    />
  );
}