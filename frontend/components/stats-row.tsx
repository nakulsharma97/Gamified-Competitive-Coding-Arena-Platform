type Stats = {
  onlinePlayers: number;
  matchesToday: number;
  totalProblems: number;
};

type StatsRowProps = {
  stats: Stats;
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
      <div className="text-xs uppercase tracking-[0.28em] text-white/55">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-[-0.04em] text-white">{value.toLocaleString()}</div>
    </div>
  );
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Online Players" value={stats.onlinePlayers} />
      <StatCard label="Matches Today" value={stats.matchesToday} />
      <StatCard label="Total Problems" value={stats.totalProblems} />
    </div>
  );
}