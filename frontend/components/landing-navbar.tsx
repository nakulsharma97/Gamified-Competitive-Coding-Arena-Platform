"use client";

import Link from "next/link";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#leaderboard", label: "Leaderboard" },
  { href: "#tournaments", label: "Tournaments" },
  { href: "#college-battles", label: "College Battles" },
  { href: "#ai-coach", label: "AI Coach" },
];

export function LandingNavbar() {

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-[#FAFAFB]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-[#5B5BD6] text-white shadow-glow">
            CS
          </div>
          <div>
            <p className="text-base font-semibold text-[#111827]">CodeSlam</p>
            <p className="text-xs uppercase tracking-[0.32em] text-[#6B7280]">Code. Fight. Win.</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#374151] transition hover:text-[#5B5BD6]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-sm font-semibold text-[#111827] transition hover:border-[#C7D2FE] hover:bg-[#F8FAFF] md:inline-flex"
          >
            Login
          </Link>
          <Link
            href="#cta"
            className="inline-flex items-center justify-center rounded-full bg-[#5B5BD6] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
          >
            Start Battling
          </Link>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 overflow-x-auto pb-3 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-shrink-0 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:border-[#5B5BD6] hover:text-[#5B5BD6]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}