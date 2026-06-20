"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type HpBarProps = {
  hp: number;
  maxHp?: number;
  label?: string;
  className?: string;
};

export function HpBar({ hp, maxHp = 100, label, className }: HpBarProps) {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  const fillClass = useMemo(() => {
    if (percent <= 20) return "bg-red-500";
    if (percent <= 40) return "bg-amber-400";
    return "bg-emerald-500";
  }, [percent]);

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          <span>{label}</span>
          <span>{Math.round(hp)}/{maxHp}</span>
        </div>
      ) : null}

      <div className="h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            fillClass
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}