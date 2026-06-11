"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowRight, Award, Flame, Trophy, Target, TrendingUp, Users, Zap } from "lucide-react";
import { FindMatchButton } from "@/components/find-match-button";
import { ProfileEloChart } from "@/components/profile-elo-chart";
import { RankBadge } from "@/components/rank-badge";
import { RankProgress } from "@/components/rank-progress";
import { StatsRow } from "@/components/stats-row";

type UserMe = {
  id: string;
  username: string;
  eloRating: number;
  rank?: string | null;
  languages?: string[];
  interests?: string[];
};

type UserStats = {
  matchesPlayed: number;
  wins: number;
  losses: number;
  badgesEarned: number;
  rankPosition: number;
};

type MatchHistoryItem = {
  id: string;
  opponentUsername?: string;
  problemTitle: string;
  result: string;
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

type GlobalStats = {
  onlinePlayers: number;
  matchesToday: number;
  totalProblems: number;
  totalUsers: number;
};

type EloHistoryPoint = {
  createdAt: string;
  eloAfter: number;
};

type DashboardShowcaseProps = {
  me: UserMe;
  stats: UserStats;
  history: MatchHistoryItem[];
  leaderboard: LeaderboardEntry[];
  globalStats: GlobalStats;
  eloHistory: EloHistoryPoint[];
};

type Achievement = {
  title: string;
  detail: string;
  icon: ReactNode;
};

const motionFade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function DashboardShowcase({ me, stats, history, leaderboard, globalStats, eloHistory }: DashboardShowcaseProps) {
  const currentStreak = getCurrentStreak(history);
  const rankTier = me.rank ?? getRankTier(me.eloRating);
  const recentMatches = history.slice(0, 5);
  const achievements = buildAchievements(stats, currentStreak);
  const winRate = stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;

  return (
    <main className="relative overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_85%_0,rgba(29,158,117,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(186,117,23,0.14),transparent_30%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <motion.section
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
          className="grid gap-6 rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,24,0.96),rgba(6,7,18,0.94))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:grid-cols-[0.95fr_1.05fr] lg:p-8"
        >
          <motion.div variants={motionFade} className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-codeslam-teal/30 bg-codeslam-teal/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-codeslam-teal">
                  <Zap className="h-3.5 w-3.5" />
                  Player dashboard
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-white/45">Welcome back</div>
                  <div className="mt-2 text-3xl font-black tracking-tighter text-white sm:text-4xl">{me.username}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RankBadge tier={rankTier} />
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                    Rank #{stats.rankPosition}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-3 sm:items-end">
                <FindMatchButton />
                <Link
                  href="/leaderboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  View leaderboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <motion.div variants={motionFade} className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-white/45">XP Bar</div>
                  <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">{me.eloRating} XP</div>
                </div>
                <div className="text-right text-sm text-white/65">
                  <div>{currentStreak.label}</div>
                  <div>{currentStreak.detail}</div>
                </div>
              </div>
              <div className="mt-4">
                <RankProgress eloRating={me.eloRating} />
              </div>
            </motion.div>

            <motion.div variants={motionFade} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Matches" value={stats.matchesPlayed} icon={<Target className="h-4 w-4" />} />
              <MetricCard label="Wins" value={stats.wins} icon={<TrendingUp className="h-4 w-4" />} />
              <MetricCard label="Losses" value={stats.losses} icon={<Flame className="h-4 w-4" />} />
              <MetricCard label="Win rate" value={winRate} suffix="%" icon={<Users className="h-4 w-4" />} />
            </motion.div>
          </motion.div>

          <motion.div variants={motionFade} className="space-y-4 rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <PlayerCard username={me.username} align="left" accent="from-codeslam-teal to-cyan-300" />
              <div className="flex flex-col items-center justify-center gap-2 text-white/70">
                <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em]">vs</div>
                <div className="rounded-full border border-codeslam-amber/30 bg-codeslam-amber/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-codeslam-amber">
                  battle ready
                </div>
              </div>
              <PlayerCard username="The Circuit" align="right" accent="from-codeslam-amber to-rose-300" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Current streak", currentStreak.streak],
                ["Battle stats", `${stats.wins} wins / ${stats.losses} losses`],
                ["Badges earned", `${stats.badgesEarned} achievements`],
                ["ELO position", `#${stats.rankPosition} on the ladder`],
              ].map(([title, value]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.28em] text-white/45">{title}</div>
                  <div className="mt-2 text-base font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-white/45">
                <span>Recent matches</span>
                <span>{recentMatches.length} shown</span>
              </div>
              <div className="mt-4 space-y-3">
                {recentMatches.map(match => {
                  const resultTone = isWin(match.result) ? "text-emerald-300" : "text-rose-300";
                  return (
                    <motion.article
                      key={match.id}
                      whileHover={{ y: -2 }}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{match.problemTitle}</div>
                          <div className="mt-1 text-sm text-white/60">vs {match.opponentUsername ?? "Unknown opponent"}</div>
                          <div className="mt-2 text-xs uppercase tracking-[0.24em] text-white/45">{formatMatchResult(match.result)}</div>
                        </div>
                        <div className={`text-right text-sm font-semibold ${resultTone}`}>
                          {match.eloChange >= 0 ? "+" : ""}{match.eloChange} ELO
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } } }}
          className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <motion.div variants={motionFade} className="rounded-4xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/45">Arena pulse</div>
                <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Live platform stats</div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
                {globalStats.totalUsers.toLocaleString()} users
              </div>
            </div>
            <StatsRow
              stats={{
                onlinePlayers: globalStats.onlinePlayers,
                matchesToday: globalStats.matchesToday,
                totalProblems: globalStats.totalProblems,
              }}
            />
          </motion.div>

          <motion.div variants={motionFade}>
            <ProfileEloChart points={eloHistory} />
          </motion.div>
        </motion.section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } } }}
            className="rounded-4xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl sm:p-6"
          >
            <motion.div variants={motionFade} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/45">Achievements</div>
                <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Unlocked arsenal</div>
              </div>
              <Trophy className="h-5 w-5 text-codeslam-amber" />
            </motion.div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {achievements.map(achievement => (
                <motion.div key={achievement.title} variants={motionFade} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <div className="rounded-full border border-codeslam-teal/30 bg-codeslam-teal/10 p-2 text-codeslam-teal">{achievement.icon}</div>
                    {achievement.title}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/65">{achievement.detail}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } } }}
            className="rounded-4xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl sm:p-6"
          >
            <motion.div variants={motionFade} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/45">Leaderboard preview</div>
                <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Top contenders</div>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
                #{stats.rankPosition}
              </div>
            </motion.div>

            <div className="mt-5 space-y-3">
              {leaderboard.slice(0, 5).map(entry => (
                <motion.div
                  key={entry.userId}
                  variants={motionFade}
                  whileHover={{ y: -2 }}
                  className={`rounded-3xl border p-4 ${entry.userId === me.id ? "border-codeslam-teal/40 bg-codeslam-teal/10" : "border-white/10 bg-black/20"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">#{entry.rank} {entry.username}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{entry.tier}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black tracking-[-0.03em] text-white">{entry.eloRating}</div>
                      <div className="text-xs uppercase tracking-[0.24em] text-white/45">ELO</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="rounded-4xl border border-white/10 bg-[linear-gradient(135deg,rgba(12,15,28,0.98),rgba(6,8,15,0.96))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
                Start Battle
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tighter text-white sm:text-4xl lg:text-5xl">
                Queue into the arena and turn practice into ranked momentum.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Push into a live duel, climb the ladder, and keep your streak alive with a platform designed like a futuristic coding esport.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <FindMatchButton />
              <Link
                href="/problems"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                Browse problems
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, suffix, icon }: { label: string; value: number; suffix?: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.28em] text-white/45">
        <span>{label}</span>
        <span className="text-codeslam-teal">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-black tracking-tighter text-white">
        {value.toLocaleString()}{suffix ?? ""}
      </div>
    </div>
  );
}

function PlayerCard({ username, align, accent }: { username: string; align: "left" | "right"; accent: string }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end text-right" : ""}`}>
      {align === "right" ? null : <div className={`flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br ${accent} text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.12)]`}>{username.slice(0, 2).toUpperCase()}</div>}
      <div>
        <div className="text-sm font-semibold text-white">{align === "left" ? username : "Arena Boss"}</div>
        <div className="text-xs uppercase tracking-[0.24em] text-white/45">{align === "left" ? "Player" : "Final boss"}</div>
      </div>
      {align === "right" ? <div className={`flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br ${accent} text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.12)]`}>{username.slice(0, 2).toUpperCase()}</div> : null}
    </div>
  );
}

function getRankTier(eloRating: number) {
  if (eloRating >= 2600) return "Legend";
  if (eloRating >= 2200) return "Diamond";
  if (eloRating >= 1800) return "Platinum";
  if (eloRating >= 1400) return "Gold";
  if (eloRating >= 1000) return "Silver";
  return "Bronze";
}

function getCurrentStreak(history: MatchHistoryItem[]) {
  const recent = [...history].sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTime - leftTime;
  });

  let streak = 0;
  let streakType: "win" | "loss" | null = null;

  for (const match of recent) {
    const isVictory = isWin(match.result);
    if (streak === 0) {
      streakType = isVictory ? "win" : "loss";
      streak = 1;
      continue;
    }

    if ((streakType === "win" && isVictory) || (streakType === "loss" && !isVictory)) {
      streak += 1;
      continue;
    }

    break;
  }

  if (streakType === "win") {
    return { label: "Current streak", streak: `${streak}-win streak`, detail: "Momentum is on your side" };
  }

  if (streakType === "loss") {
    return { label: "Current streak", streak: `${streak}-loss streak`, detail: "Clutch comeback territory" };
  }

  return { label: "Current streak", streak: "0-win streak", detail: "Ready to start a run" };
}

function isWin(result: string) {
  const normalized = result.trim().toLowerCase();
  return normalized.includes("win") || normalized.includes("victory") || normalized === "w";
}

function formatMatchResult(result: string) {
  const normalized = result.trim();
  if (!normalized) {
    return "Result pending";
  }

  return normalized.replaceAll("_", " ");
}

function buildAchievements(stats: UserStats, currentStreak: { streak: string }) {
  const streakNumber = Number.parseInt(currentStreak.streak, 10) || 0;
  const achievements: Achievement[] = [
    {
      title: "Battle-tested",
      detail: `${stats.matchesPlayed} competitive matches completed across the arena.`,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "Win machine",
      detail: `${stats.wins} wins locked in with a ${stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0}% battle success rate.`,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: "Streak runner",
      detail: `${currentStreak.streak} keeps the pressure high and the climb moving.`,
      icon: <Flame className="h-4 w-4" />,
    },
    {
      title: "Collector",
      detail: `${stats.badgesEarned} achievements unlocked across ranked play and special events.`,
      icon: <Award className="h-4 w-4" />,
    },
  ];

  if (streakNumber >= 3) {
    achievements.unshift({
      title: "Hot streak",
      detail: "Three or more consecutive wins trigger the premium momentum state.",
      icon: <Zap className="h-4 w-4" />,
    });
  }

  return achievements.slice(0, 4);
}
