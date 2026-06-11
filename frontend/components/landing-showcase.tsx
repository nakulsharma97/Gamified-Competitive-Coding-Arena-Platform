"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowRight, Bot, Crown, Flame, Gamepad2, Medal, Rocket, Sparkles, Swords, Trophy, Users, Zap } from "lucide-react";
import { LiveTicker } from "@/components/live-ticker";
import { StatsRow } from "@/components/stats-row";

type Stats = {
  onlinePlayers: number;
  matchesToday: number;
  totalProblems: number;
};

type LandingShowcaseProps = {
  stats: Stats;
  navbar: ReactNode;
};

type LeaderboardEntry = {
  rank: number;
  name: string;
  elo: number;
  streak: string;
  badge: string;
};

type Stage = {
  label: string;
  title: string;
  detail: string;
};

const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "AstraByte", elo: 2478, streak: "11-win streak", badge: "Grandmaster" },
  { rank: 2, name: "NullRift", elo: 2396, streak: "8-win streak", badge: "Diamond" },
  { rank: 3, name: "HexNova", elo: 2310, streak: "6-win streak", badge: "Ascendant" },
  { rank: 4, name: "LoopLegend", elo: 2288, streak: "4-win streak", badge: "Immortal" },
  { rank: 5, name: "BinaryBloom", elo: 2214, streak: "3-win streak", badge: "Radiant" },
];

const battleCards = [
  {
    title: "Live duel queue",
    detail: "Queue into ranked 1v1 or squad battles while the arena broadcasts live momentum changes.",
  },
  {
    title: "Damage driven scoring",
    detail: "Every accepted submission chips away at the opponent with visible pressure, tempo, and counters.",
  },
  {
    title: "Power-up economy",
    detail: "Trigger hints, shields, and burst attacks at the perfect moment to swing the battle state.",
  },
];

const tournamentStages: Stage[] = [
  {
    label: "Stage 01",
    title: "Open qualifiers",
    detail: "Daily ladders, lane-based brackets, and entry matches that seed the weekend circuit.",
  },
  {
    label: "Stage 02",
    title: "Bracket clash",
    detail: "Single-elimination knockout rounds with live commentary, spectating, and replayable highlights.",
  },
  {
    label: "Stage 03",
    title: "Championship night",
    detail: "Finalists fight under spotlight conditions for trophies, ranks, and seasonal rewards.",
  },
];

const coachCards = [
  {
    title: "Pattern radar",
    detail: "The AI coach flags repeated mistakes, hidden edge cases, and weak complexity choices in real time.",
  },
  {
    title: "Battle hints",
    detail: "Nudge-based coaching gives just enough direction to keep the duel competitive without killing the thrill.",
  },
  {
    title: "Post-match review",
    detail: "Every fight ends with a clean replay summary: decisions, missed combos, and what to drill next.",
  },
];

const sectionMotion = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const battleAccentLeft = "bg-gradient-to-br from-codeslam-teal to-cyan-300";
const battleAccentRight = "bg-gradient-to-br from-codeslam-amber to-rose-300";

export function LandingShowcase({ stats, navbar }: LandingShowcaseProps) {
  return (
    <main className="relative overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(90,66,255,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(0,245,212,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,84,112,0.14),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-codeslam-teal/60 to-transparent" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6">
        {navbar}

        <section className="grid gap-6 rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,28,0.94),rgba(6,7,18,0.92))] p-5 shadow-[0_35px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.11 } } }}
            className="space-y-6"
          >
            <motion.div
              variants={sectionMotion}
              className="inline-flex items-center gap-2 rounded-full border border-codeslam-teal/30 bg-codeslam-teal/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.34em] text-codeslam-teal"
            >
              <Sparkles className="h-4 w-4" />
              Futuristic multiplayer coding arena
            </motion.div>

            <motion.div variants={sectionMotion} className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
                LeetCode meets Valorant
              </div>
              <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                Code like a legend.
                <span className="block bg-linear-to-r from-codeslam-teal via-white to-codeslam-amber bg-clip-text text-transparent">
                  Fight like a pro.
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                Enter a neon-lit battleground where every submission lands damage, every rank climb feels earned, and every match feels like a live esports showdown.
              </p>
            </motion.div>

            <motion.div variants={sectionMotion} className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-codeslam-teal to-emerald-400 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(29,158,117,0.35)]"
              >
                Start Battle
                <Rocket className="h-4 w-4" />
              </Link>
              <Link
                href="/problems"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
              >
                Explore Arena
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div variants={sectionMotion}>
              <StatsRow stats={stats} />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, rotate: 0.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-codeslam-teal/20 via-transparent to-codeslam-amber/10 blur-3xl" />
            <div className="relative space-y-4 rounded-[1.75rem] border border-white/10 bg-black/25 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_90px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-white/50">Battle preview</div>
                  <div className="mt-1 text-lg font-bold text-white">Ranked duel loading...</div>
                </div>
                <div className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-rose-200">
                  live pressure
                </div>
              </div>

              <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <BattleAvatar name="NovaZero" accentClass={battleAccentLeft} icon={<Users className="h-4 w-4" />} subtitle="Attack lane" />
                <div className="flex items-center justify-center gap-3 text-white/70 sm:flex-col">
                  <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">vs</div>
                  <div className="rounded-full border border-codeslam-amber/30 bg-codeslam-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-codeslam-amber">
                    03:42
                  </div>
                </div>
                <BattleAvatar name="HexPilot" accentClass={battleAccentRight} icon={<Flame className="h-4 w-4" />} subtitle="Defense lane" align="right" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {battleCards.map(card => (
                  <div key={card.title} className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <div className="h-2.5 w-2.5 rounded-full bg-codeslam-teal shadow-[0_0_18px_rgba(29,158,117,0.6)]" />
                      {card.title}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/65">{card.detail}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.3rem] border border-white/10 bg-black/35 p-4 font-mono text-xs leading-6 text-emerald-200/85">
                <div className="flex items-center gap-2 text-white/55">
                  <Gamepad2 className="h-4 w-4" />
                  arena.log
                </div>
                <div className="mt-3 space-y-1.5">
                  <div>&gt; wave_01 launched</div>
                  <div>&gt; hint shield deployed</div>
                  <div>&gt; NovaZero solved in 124s, damage +38</div>
                  <div>&gt; HexPilot responding with counter combo</div>
                </div>
              </div>

              <LiveTicker />
            </div>
          </motion.div>
        </section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <section className="rounded-4xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
              <Swords className="h-4 w-4 text-codeslam-amber" />
              Battle preview
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">Turn every problem into a tactical duel.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
              Fight on a live board where submissions hit harder than hints, and power-ups matter as much as algorithmic precision.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                ["Submission damage", "Real-time penalty and score feedback for every attempt."],
                ["Clutch comeback", "Stack power-ups when the pressure peaks and reverse the momentum."],
                ["Spectator ready", "Friends can watch the duel unfold like a broadcast match."],
              ].map(([title, detail]) => (
                <div key={title} className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-codeslam-teal shadow-[0_0_20px_rgba(29,158,117,0.7)]" />
                  <div>
                    <div className="font-semibold text-white">{title}</div>
                    <div className="text-sm leading-7 text-white/62">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-4xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                  <Crown className="h-4 w-4 text-codeslam-amber" />
                  Leaderboard preview
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">See who rules the circuit.</h2>
              </div>
              <div className="hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55 sm:block">
                Global ladder
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {leaderboard.map(entry => (
                <motion.div
                  key={entry.name}
                  whileHover={{ y: -2 }}
                  className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-black text-white">
                    {entry.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-semibold text-white">{entry.name}</div>
                      <span className="rounded-full border border-codeslam-teal/25 bg-codeslam-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-codeslam-teal">
                        {entry.badge}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-white/60">{entry.streak}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black tracking-[-0.04em] text-white">{entry.elo}</div>
                    <div className="text-xs uppercase tracking-[0.28em] text-white/45">ELO</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </motion.section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="grid gap-4 rounded-4xl border border-white/10 bg-[linear-gradient(135deg,rgba(8,10,20,0.96),rgba(14,18,35,0.92))] p-5 sm:p-6 lg:grid-cols-[0.92fr_1.08fr]"
        >
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
              <Trophy className="h-4 w-4 text-codeslam-amber" />
              Tournament section
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">Seasonal circuits with real stakes.</h2>
            <p className="mt-3 text-sm leading-7 text-white/66 sm:text-base">
              Host themed cups, weekly ladders, and championship nights with brackets built for spectating, rivalry, and replay.
            </p>

            <div className="mt-6 grid gap-3">
              {tournamentStages.map(stage => (
                <div key={stage.label} className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-codeslam-teal">{stage.label}</div>
                  <div className="mt-2 text-lg font-bold text-white">{stage.title}</div>
                  <div className="mt-2 text-sm leading-7 text-white/62">{stage.detail}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                <Bot className="h-4 w-4 text-codeslam-teal" />
                AI coach showcase
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Your tactical sidekick.</h2>
              <p className="mt-3 text-sm leading-7 text-white/66">
                The coach watches every duel, spots gaps instantly, and helps players improve without flattening the competitive edge.
              </p>
            </div>

            <div className="grid gap-4 sm:col-span-1">
              {coachCards.map(card => (
                <div key={card.title} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Zap className="h-4 w-4 text-codeslam-amber" />
                    {card.title}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/64">{card.detail}</div>
                </div>
              ))}
            </div>
          </section>
        </motion.section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55 }}
          className="rounded-4xl border border-white/10 bg-[linear-gradient(135deg,rgba(20,23,39,0.98),rgba(7,8,16,0.96))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
                Better CTA
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tighter text-white sm:text-4xl lg:text-5xl">
                Launch your squad into the next coding season.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                Join the arena, watch the ladder climb in real time, and turn practice problems into highlight reels.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
              >
                Enter dashboard
              </Link>
            </div>
          </div>
        </motion.section>

        <footer className="rounded-[1.75rem] border border-white/10 bg-black/25 px-5 py-6 backdrop-blur-2xl sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-codeslam-teal via-cyan-300 to-codeslam-amber font-black text-slate-950 shadow-[0_0_30px_rgba(29,158,117,0.35)]">
                  CS
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.3em] text-white">CodeSlam</div>
                  <div className="text-xs uppercase tracking-[0.25em] text-white/50">multiplayer coding battles</div>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
                Built for players who want the tension of esports, the sharpness of competitive programming, and the feedback loop of a modern battle platform.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:justify-items-end">
              {[
                ["Arena", "/problems"],
                ["Leaderboard", "/leaderboard"],
                ["Start now", "/sign-up"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="inline-flex w-full items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 sm:w-auto sm:min-w-36"
                >
                  {label}
                  <Medal className="h-4 w-4 text-codeslam-amber" />
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function BattleAvatar({
  name,
  subtitle,
  accentClass,
  icon,
  align = "left",
}: {
  name: string;
  subtitle: string;
  accentClass: string;
  icon: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end text-right" : ""}`}>
      {align === "right" ? null : <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass} text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.12)]`}>{icon}</div>}
      <div>
        <div className="text-sm font-semibold text-white">{name}</div>
        <div className="text-xs uppercase tracking-[0.24em] text-white/45">{subtitle}</div>
      </div>
      {align === "right" ? <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass} text-slate-950 shadow-[0_0_24px_rgba(255,255,255,0.12)]`}>{icon}</div> : null}
    </div>
  );
}
