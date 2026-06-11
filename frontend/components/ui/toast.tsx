"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toast as ToastType } from "@/hooks/use-toast";

type ToastProps = ToastType & {
  onClose: () => void;
};

export function Toast({ title, description, variant = "default", onClose }: ToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
        "bg-slate-900/90 text-slate-100 border-slate-700",
        variant === "success" && "border-emerald-500/50 bg-emerald-950/80",
        variant === "destructive" && "border-rose-500/60 bg-rose-950/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          {description ? <p className="text-xs text-slate-300">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Dismiss toast"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
