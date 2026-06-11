"use client";

type RankProgressProps = {
  eloRating: number;
};

const segments = [
  { label: "Bronze", min: 0, max: 1000 },
  { label: "Silver", min: 1000, max: 1400 },
  { label: "Gold", min: 1400, max: 1800 },
  { label: "Platinum", min: 1800, max: 2200 },
  { label: "Diamond", min: 2200, max: 2600 },
  { label: "Legend", min: 2600, max: 3200 },
];

export function RankProgress({ eloRating }: RankProgressProps) {
  const segment = [...segments].reverse().find(entry => eloRating >= entry.min) ?? segments[0];
  const span = Math.max(1, segment.max - segment.min);
  const progress = Math.max(0, Math.min(100, ((eloRating - segment.min) / span) * 100));

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-white/55">Rank Progress</div>
          <div className="mt-2 text-2xl font-black text-white">{segment.label}</div>
        </div>
        <div className="text-right text-sm text-white/70">
          <div>{eloRating} ELO</div>
          <div>{Math.round(progress)}% to next tier</div>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-codeslam-purple via-codeslam-teal to-codeslam-amber transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}