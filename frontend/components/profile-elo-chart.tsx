"use client";

import { Line, LineChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  createdAt: string;
  eloAfter: number;
};

type ProfileEloChartProps = {
  points: Point[];
};

export function ProfileEloChart({ points }: ProfileEloChartProps) {
  const safePoints =
    points.length > 0
      ? points.map(point => ({
          ...point,
          label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(point.createdAt)),
          fullDate: new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(point.createdAt)),
        }))
      : [
          {
            createdAt: new Date().toISOString(),
            eloAfter: 1000,
            label: "Now",
            fullDate: "Now",
          },
        ];

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">ELO History</div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safePoints}>
            <defs>
              <linearGradient id="profileEloLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1D9E75" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} axisLine={false} tickLine={false} />
            {[1000, 1400, 1800, 2200].map(level => (
              <ReferenceLine key={level} y={level} stroke="rgba(255,255,255,0.2)" strokeDasharray="6 6" />
            ))}
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
              formatter={value => [Number(value ?? 0).toLocaleString(), "ELO"]}
              contentStyle={{
                background: "rgba(8, 10, 24, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                color: "#fff",
              }}
            />
            <Line type="monotone" dataKey="eloAfter" stroke="url(#profileEloLine)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
