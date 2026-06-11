import { cn } from "@/lib/utils";

type RankBadgeProps = {
  tier: string;
  className?: string;
};

const tierStyles: Record<string, string> = {
  bronze: "border-[#BA7517]/40 bg-[#BA7517]/15 text-[#F2B36B]",
  silver: "border-slate-300/30 bg-slate-200/10 text-slate-200",
  gold: "border-amber-300/40 bg-amber-400/15 text-amber-200",
  platinum: "border-cyan-300/40 bg-cyan-400/15 text-cyan-200",
  diamond: "border-sky-300/40 bg-sky-400/15 text-sky-200",
  legend: "border-fuchsia-300/40 bg-fuchsia-400/15 text-fuchsia-200",
};

export function RankBadge({ tier, className }: RankBadgeProps) {
  const normalizedTier = tier.trim().toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] backdrop-blur-md",
        tierStyles[normalizedTier] ?? "border-white/10 bg-white/5 text-white/80",
        className,
      )}
    >
      {tier}
    </span>
  );
}