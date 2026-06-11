"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { apiJson } from "@/lib/api";

type EloPoint = {
  day: string;
  elo: number;
};

type EloChartProps = {
  initialElo?: number;
};

export function EloChart({ initialElo = 0 }: EloChartProps) {
  const { getToken } = useAuth();
  const [points, setPoints] = useState<EloPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const token = await getToken();
        const history = await apiJson<EloPoint[]>("/api/users/me/elo-history?days=30", { token: token ?? undefined });
        if (active) {
          setPoints(history);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [getToken]);

  const data = points.length > 0 ? points : [{ day: "Today", elo: initialElo }];

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-white/55">ELO History</div>
          <div className="mt-2 text-2xl font-black text-white">30-day trend</div>
        </div>
        <div className="text-sm text-white/65">{loading ? "Loading..." : `${data.at(-1)?.elo ?? initialElo} current ELO`}</div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="codeslamEloFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#534AB7" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#1D9E75" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(8, 10, 24, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                color: "#fff",
              }}
            />
            {[1000, 1400, 1800, 2200].map(level => (
              <ReferenceLine key={level} y={level} stroke="rgba(255,255,255,0.18)" strokeDasharray="6 6" />
            ))}
            <Area type="monotone" dataKey="elo" stroke="#1D9E75" strokeWidth={3} fill="url(#codeslamEloFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}