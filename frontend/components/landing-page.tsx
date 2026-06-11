"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Cpu,
  Globe2,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { LandingNavbar } from "./landing-navbar";

type HeroStat = {
  value: string;
  label: string;
};

type LeaderboardRow = {
  rank: number;
  name: string;
  elo: number;
  wins: number;
  winRate: string;
};

const defaultHeroStats: HeroStat[] = [
  { value: "10,000+", label: "Matches Played" },
  { value: "5,000+", label: "Active Developers" },
  { value: "100+", label: "Coding Challenges" },
];

const defaultLeaderboardData: LeaderboardRow[] = [
  { rank: 1, name: "Ananya Sethi", elo: 2554, wins: 34, winRate: "82%" },
  { rank: 2, name: "Rahul Narayan", elo: 2488, wins: 29, winRate: "79%" },
  { rank: 3, name: "Meera Iyer", elo: 2430, wins: 27, winRate: "77%" },
  { rank: 4, name: "Arjun Desai", elo: 2372, wins: 24, winRate: "74%" },
  { rank: 5, name: "Sanya Gupta", elo: 2318, wins: 22, winRate: "71%" },
];

const trustCards = [
  {
    icon: Zap,
    title: "Real-Time Battles",
    description: "Ranked 1v1 matchups with instant status updates, match pressure, and score momentum built for competition.",
  },
  {
    icon: Cpu,
    title: "AI-Powered Coaching",
    description: "Personalized analysis, weakness tracking, and targeted practice suggestions after every live duel.",
  },
  {
    icon: TrendingUp,
    title: "ELO Rankings",
    description: "A transparent rating ladder that rewards consistent execution, speed, and smart decision-making.",
  },
  {
    icon: Globe2,
    title: "Global Leaderboards",
    description: "Discover top performers, rival schools, and elite coding crews across the platform.",
  },
];

const workflowSteps = [
  {
    title: "Find Match",
    description: "Queue instantly and connect with a live opponent based on rating, role, and preferred format.",
  },
  {
    title: "Battle Live",
    description: "Solve problems under pressure while metrics, timing, and momentum reflect every decision.",
  },
  {
    title: "Earn ELO",
    description: "Win ranked duels, climb your rating, and unlock better tournaments and prestige rewards.",
  },
];

const featureList = [
  {
    icon: ShieldCheck,
    title: "Battle-Ready Matchmaking",
    description: "Smart pairing, live queue feedback, and adaptive opponent skill matching for fair contests.",
  },
  {
    icon: BarChart3,
    title: "Match Analytics",
    description: "Review performance trends, problem breakdowns, and post-match decisions in a concise dashboard.",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Seasonal ranks, division tables, and performance summaries that spotlight top coding talent.",
  },
  {
    icon: Star,
    title: "Achievements & Badges",
    description: "Earn milestones for precision, resilience, streaks, and standout competitive achievements.",
  },
  {
    icon: Users,
    title: "College Rankings",
    description: "Represent your campus, score points for your college, and climb the university leaderboard.",
  },
  {
    icon: CalendarDays,
    title: "Tournament System",
    description: "Regular cups, college battles, and championship brackets with real-time scoreboard updates.",
  },
];

const collegeBattles = [
  { college: "IIT", points: 7240, wins: 108, rank: 1 },
  { college: "NIT", points: 6890, wins: 95, rank: 2 },
  { college: "BITS", points: 6530, wins: 88, rank: 3 },
  { college: "VIT", points: 6140, wins: 80, rank: 4 },
  { college: "SRM", points: 5920, wins: 74, rank: 5 },
  { college: "Chandigarh University", points: 5580, wins: 67, rank: 6 },
];

const tournaments = [
  {
    name: "Weekend Arena",
    prize: "$15k",
    players: "256",
    date: "Jun 28",
    status: "Open",
  },
  {
    name: "Monthly Championship",
    prize: "$65k",
    players: "1,024",
    date: "Jul 18",
    status: "Registering",
  },
  {
    name: "College Cup",
    prize: "$35k",
    players: "512",
    date: "Aug 05",
    status: "Locked",
  },
];

const testimonials = [
  {
    name: "Aakash Mehta",
    role: "Lead Software Engineer",
    quote: "CodeSlam transformed how I train for code competitions. The realtime battle format and ELO metrics make every session feel like professional practice.",
  },
  {
    name: "Nisha Kapoor",
    role: "Campus Tech Organizer",
    quote: "The college leaderboard gave our teams a clean, high-quality platform to compete and showcase results in a way students trust.",
  },
  {
    name: "Pranav Jalan",
    role: "Product Manager",
    quote: "The AI coach insights are polished and actionable. It turns post-match review into a fast, premium experience.",
  },
];

const stagger = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { staggerChildren: 0.12 } },
};

const itemMotion = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">{title}</p>
      <p className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
        {description}
      </p>
    </div>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white px-5 py-4 text-center shadow-soft">
      <p className="text-3xl font-semibold text-[#111827]">{value}</p>
      <p className="mt-2 text-sm text-[#6B7280]">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      className="rounded-[1.75rem] border border-[#E5E7EB] bg-white p-6 shadow-soft transition-shadow hover:shadow-[0_24px_90px_rgba(17,24,39,0.1)]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#5B5BD6]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-6 text-xl font-semibold text-[#111827]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#6B7280]">{description}</p>
    </motion.article>
  );
}

function DashboardTile({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[#111827]">{value}</p>
      <p className="mt-2 text-sm text-[#6B7280]">{caption}</p>
    </div>
  );
}

function LandingPage() {
  const [heroStats, setHeroStats] = useState<HeroStat[]>(defaultHeroStats);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[]>(defaultLeaderboardData);

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      return;
    }

    const fetchLandingData = async () => {
      try {
        const [statsResponse, leaderboardResponse] = await Promise.all([
          fetch(`${apiUrl}/api/stats`, { signal: controller.signal }),
          fetch(`${apiUrl}/api/leaderboard?size=5`, { signal: controller.signal }),
        ]);

        if (statsResponse.ok) {
          const stats = (await statsResponse.json()) as {
            onlinePlayers?: number;
            matchesToday?: number;
            totalProblems?: number;
          };

          setHeroStats([
            {
              value: stats.matchesToday?.toLocaleString() ?? defaultHeroStats[0].value,
              label: "Matches Today",
            },
            {
              value: stats.onlinePlayers?.toLocaleString() ?? defaultHeroStats[1].value,
              label: "Active Developers",
            },
            {
              value: stats.totalProblems?.toLocaleString() ?? defaultHeroStats[2].value,
              label: "Challenges",
            },
          ]);
        }

        if (leaderboardResponse.ok) {
          const leaderboard = (await leaderboardResponse.json()) as {
            players?: Array<{
              rank: number;
              username: string;
              eloRating: number;
              totalMatches: number;
              winRate: number;
            }>;
          };

          if (Array.isArray(leaderboard.players) && leaderboard.players.length > 0) {
            setLeaderboardData(
              leaderboard.players.slice(0, 5).map((player) => ({
                rank: player.rank,
                name: player.username,
                elo: player.eloRating,
                wins: player.totalMatches,
                winRate: `${Math.round(
                  player.winRate > 1 ? player.winRate : player.winRate * 100,
                )}%`,
              })),
            );
          }
        }
      } catch {
        // Keep fallback content if the API is unavailable.
      }
    };

    void fetchLandingData();
    return () => controller.abort();
  }, []);

  return (
    <div className="relative overflow-hidden bg-[#FAFAFB] text-[#111827]">
      <LandingNavbar />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
        >
          <div className="space-y-8">
            <div className="max-w-xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eff2ff] px-4 py-2 text-sm font-semibold text-[#4F46E5]">
                <Sparkles className="h-4 w-4" />
                Live coding competition for modern engineers
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#6B7280]">The Competitive Coding Arena</p>
                <h1 className="text-5xl font-extrabold tracking-[-0.04em] text-[#111827] sm:text-6xl">
                  Challenge real developers.
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#5B5BD6] via-[#7C3AED] to-[#4F46E5]">
                    Solve problems under pressure.
                  </span>
                  <span className="block">Climb the leaderboard.</span>
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#6B7280] sm:text-lg">
                  CodeSlam transforms coding practice into real-time competitive battles where performance, speed and strategy determine the winner.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="#tournaments"
                className="inline-flex items-center justify-center rounded-full bg-[#5B5BD6] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#4F46E5]"
              >
                Start Battling
              </Link>
              <Link
                href="#leaderboard"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-6 py-4 text-base font-semibold text-[#111827] transition hover:border-[#C7D2FE]"
              >
                View Leaderboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <StatChip key={stat.label} value={stat.value} label={stat.label} />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-soft sm:p-8">
            <div className="pointer-events-none absolute -left-8 top-10 h-36 w-36 rounded-full bg-[#5B5BD6]/10 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#E5E7EB] bg-[#F5F7FA] p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">Live Match</p>
                  <p className="mt-2 text-lg font-semibold text-[#111827]">Player A vs Player B</p>
                </div>
                <div className="rounded-full bg-[#F5F7FA] px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#5B5BD6]">
                  Ranked duel
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="space-y-4 rounded-[1.75rem] border border-[#E5E7EB] bg-[#FAFAFB] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">Player A</p>
                      <p className="mt-2 text-lg font-semibold text-[#111827]">Aashni</p>
                    </div>
                    <div className="rounded-2xl bg-[#EDE9FE] px-3 py-2 text-xs font-semibold text-[#5B5BD6]">ELO 1624</div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-[#111827]">Runtime</div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div className="h-full w-3/4 rounded-full bg-[#5B5BD6]" />
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-2 text-sm text-[#6B7280]">
                      <span>Performance</span>
                      <span className="text-right">75ms</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.75rem] border border-[#E5E7EB] bg-[#FAFAFB] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">Player B</p>
                      <p className="mt-2 text-lg font-semibold text-[#111827]">Rhea</p>
                    </div>
                    <div className="rounded-2xl bg-[#FDE8E8] px-3 py-2 text-xs font-semibold text-[#CA2E2E]">ELO 1587</div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-[#111827]">Memory</div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div className="h-full w-2/5 rounded-full bg-[#7C3AED]" />
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-2 text-sm text-[#6B7280]">
                      <span>Usage</span>
                      <span className="text-right">128 MB</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[#E5E7EB] bg-[#111827] bg-[radial-gradient(circle_at_top_left,rgba(91,91,214,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_40%)] p-5 text-white shadow-glow">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-100/70">Live scoreboard</p>
                    <p className="mt-2 text-lg font-semibold">Match performance</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.28em] text-white/80">
                    3m 12s left
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Live score</p>
                    <p className="mt-3 text-3xl font-semibold">76</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Damage uptime</p>
                    <p className="mt-3 text-3xl font-semibold">84%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[#E5E7EB] bg-[#F5F7FA] p-5">
                <div className="text-sm font-semibold text-[#111827]">Problem preview</div>
                <div className="mt-4 rounded-3xl bg-white p-4 text-sm leading-7 text-[#374151] shadow-sm">
                  <p className="font-semibold text-[#111827]">Array path optimization</p>
                  <p className="mt-2 text-[#6B7280]">Choose the fastest traversal pattern while keeping memory stable under burst traffic.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="trust"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-24 grid gap-10 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <div className="rounded-[2rem] bg-white p-10 shadow-soft">
            <SectionHeading
              title="Built for Competitive Developers"
              description="A premium environment for battle-ready coding, fast review, and high-stakes ranking." 
            />
            <p className="mt-6 max-w-xl text-base leading-8 text-[#6B7280]">
              CodeSlam is built to feel like a real professional competition platform, with polished analytics, clear match states, and premium coaching workflows.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {trustCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.article
                  key={card.title}
                  variants={itemMotion}
                  whileHover={{ y: -6 }}
                  className="rounded-[1.75rem] border border-[#E5E7EB] bg-white p-7 shadow-soft transition-shadow hover:shadow-[0_24px_90px_rgba(17,24,39,0.12)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[#F5F7FA] text-[#5B5BD6]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-[#111827]">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#6B7280]">{card.description}</p>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          id="how-it-works"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemMotion}
          className="mt-24 rounded-[2rem] bg-[#F5F7FA] p-10 shadow-soft"
        >
          <SectionHeading
            title="How it works"
            description="Three simple steps to enter the arena, compete with confidence, and grow your rating."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="rounded-[1.75rem] border border-[#E5E7EB] bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff2ff] text-[#4F46E5]">
                  <span className="text-sm font-semibold">{`0${index + 1}`}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[#111827]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6B7280]">{step.description}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="features"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-24"
        >
          <SectionHeading
            title="Premium features"
            description="Everything a competitive developer needs to train, compete, and lead the leaderboard." 
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureList.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </motion.section>

        <motion.section
          id="ai-coach"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemMotion}
          className="mt-24 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="rounded-[2rem] bg-white p-10 shadow-soft">
            <SectionHeading
              title="AI Coding Coach"
              description="A modern coaching layer that guides your development path with precision and clarity."
            />
            <p className="mt-6 max-w-xl text-base leading-8 text-[#6B7280]">
              The coach surfaces weak areas, suggests the next best problems, and highlights trends so every match improves your long-term performance.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <DashboardTile label="Weak Areas" value="3" caption="Critical topics to practice" />
              <DashboardTile label="Recommended Problems" value="12" caption="Curated by difficulty" />
              <DashboardTile label="Performance Trends" value="+24%" caption="Accuracy vs speed improvement" />
              <DashboardTile label="Match Analysis" value="Instant" caption="Automated post-match review" />
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#eef2ff] p-8 shadow-soft">
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-[#E5E7EB] bg-white p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">AI score</p>
                <p className="mt-2 text-3xl font-semibold text-[#111827]">8.8 / 10</p>
              </div>
              <div className="rounded-3xl bg-[#5B5BD6] px-4 py-2 text-sm font-semibold text-white">Coach mode</div>
            </div>
            <div className="mt-8 space-y-6">
              {[
                { label: "Weak area", value: "Dynamic programming" },
                { label: "Recommendation", value: "Optimize recursion depth" },
                { label: "Trend", value: "Speed improved 18%" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-[#E5E7EB] bg-white p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#6B7280]">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-[#111827]">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-[1.75rem] bg-[#5B5BD6] p-6 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/75">Insight</p>
                  <p className="mt-2 text-xl font-semibold">Match pacing prediction</p>
                </div>
                <Star className="h-6 w-6 text-[#F8FAFC]" />
              </div>
              <p className="mt-4 text-sm leading-7 text-white/80">
                The coach predicts tension points in the next 5 minutes and recommends an aggressive or safe strategy based on your opponent.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="leaderboard"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemMotion}
          className="mt-24"
        >
          <SectionHeading
            title="Leaderboard"
            description="Top performers competing for the highest rating, wins, and streak prestige."
          />
          <div className="mt-10 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white shadow-soft">
            <div className="hidden grid-cols-[80px_1.2fr_1fr_1fr_1fr] gap-4 border-b border-[#E5E7EB] bg-[#F5F7FA] px-6 py-4 text-xs uppercase tracking-[0.35em] text-[#6B7280] sm:grid">
              <span>Rank</span>
              <span>Player</span>
              <span>ELO</span>
              <span>Wins</span>
              <span>Win Rate</span>
            </div>
            <div className="divide-y divide-[#E5E7EB]">
              {leaderboardData.map((row) => (
                <div key={row.rank} className="grid gap-4 px-6 py-5 text-sm text-[#374151] sm:grid-cols-[80px_1.2fr_1fr_1fr_1fr]">
                  <span className="font-semibold text-[#111827]">#{row.rank}</span>
                  <span className="font-semibold text-[#111827]">{row.name}</span>
                  <span>{row.elo}</span>
                  <span>{row.wins}</span>
                  <span>{row.winRate}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          id="college-battles"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-24"
        >
          <SectionHeading
            title="Battle For Your College"
            description="Campus rivalries, leaderboard battles, and team pride displayed with polished scorecards." 
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {collegeBattles.map((college) => (
              <motion.div
                key={college.college}
                variants={itemMotion}
                whileHover={{ y: -6 }}
                className="rounded-[1.75rem] border border-[#E5E7EB] bg-white p-6 shadow-soft"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{college.college}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[#6B7280]">University rank</p>
                  </div>
                  <div className="rounded-3xl bg-[#F5F7FA] px-3 py-2 text-sm font-semibold text-[#5B5BD6]">Rank {college.rank}</div>
                </div>
                <div className="mt-6 grid gap-3 text-sm text-[#6B7280]">
                  <p>Points: <span className="font-semibold text-[#111827]">{college.points}</span></p>
                  <p>Wins: <span className="font-semibold text-[#111827]">{college.wins}</span></p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="tournaments"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-24"
        >
          <SectionHeading
            title="Tournaments"
            description="Curated competition cards for weekend battles, championship circuits, and college cups."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {tournaments.map((event) => (
              <motion.div
                key={event.name}
                variants={itemMotion}
                whileHover={{ y: -6 }}
                className="rounded-[1.75rem] border border-[#E5E7EB] bg-white p-7 shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{event.name}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.28em] text-[#6B7280]">Prize pool</p>
                  </div>
                  <div className="rounded-3xl bg-[#eff2ff] px-3 py-2 text-sm font-semibold text-[#4F46E5]">{event.status}</div>
                </div>
                <div className="mt-6 space-y-4 text-sm text-[#6B7280]">
                  <div className="rounded-3xl bg-[#F5F7FA] p-4">
                    <p className="font-semibold text-[#111827]">{event.prize}</p>
                    <p className="mt-1">Reward</p>
                  </div>
                  <div className="rounded-3xl bg-[#F5F7FA] p-4">
                    <p className="font-semibold text-[#111827]">{event.players}</p>
                    <p className="mt-1">Players</p>
                  </div>
                  <div className="rounded-3xl bg-[#F5F7FA] p-4">
                    <p className="font-semibold text-[#111827]">{event.date}</p>
                    <p className="mt-1">Start date</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="testimonials"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-24"
        >
          <SectionHeading
            title="Testimonials"
            description="What competitive developers and campus leaders say about CodeSlam."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {testimonials.map((item) => (
              <motion.div
                key={item.name}
                variants={itemMotion}
                whileHover={{ y: -6 }}
                className="rounded-[1.75rem] border border-[#E5E7EB] bg-white p-8 shadow-soft"
              >
                <p className="text-base leading-8 text-[#374151]">“{item.quote}”</p>
                <div className="mt-8 space-y-1">
                  <p className="font-semibold text-[#111827]">{item.name}</p>
                  <p className="text-sm text-[#6B7280]">{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="cta"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={itemMotion}
          className="mt-24 rounded-[2rem] bg-[#5B5BD6] px-8 py-14 text-white shadow-soft"
        >
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#C7D2FE]">Ready To Enter The Arena?</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Start your first coding battle today and climb the ranks.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#E0E7FF]">
              Launch your next competitive coding session with premium match analytics, rank progression, and instant coaching feedback.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="#tournaments"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-[#5B5BD6] transition hover:bg-slate-50"
              >
                Start Battling
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#testimonials"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-4 text-base font-semibold text-white transition hover:border-white"
              >
                Join Community
              </Link>
            </div>
          </div>
        </motion.section>

        <footer className="mt-24 border-t border-[#E5E7EB] pt-14 pb-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <p className="text-lg font-semibold text-[#111827]">CodeSlam</p>
              <p className="max-w-xl text-sm leading-7 text-[#6B7280]">
                Real-time competitive coding designed for serious developers, campus teams, and tournament organizers.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-[#6B7280]">
                <span>Twitter</span>
                <span>LinkedIn</span>
                <span>GitHub</span>
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#111827]">Product</p>
                <ul className="space-y-2 text-sm text-[#6B7280]">
                  <li>Features</li>
                  <li>Leaderboards</li>
                  <li>Tournaments</li>
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#111827]">Resources</p>
                <ul className="space-y-2 text-sm text-[#6B7280]">
                  <li>Docs</li>
                  <li>Community</li>
                  <li>Support</li>
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#111827]">Company</p>
                <ul className="space-y-2 text-sm text-[#6B7280]">
                  <li>About</li>
                  <li>Careers</li>
                  <li>Contact</li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default LandingPage;
