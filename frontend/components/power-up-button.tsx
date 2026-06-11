import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PowerUpButtonProps = {
  icon: ReactNode;
  label: string;
  count: number;
  onClick?: () => void;
  className?: string;
};

export function PowerUpButton({ icon, label, count, onClick, className }: PowerUpButtonProps) {
  const disabled = count <= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:border-codeslam-teal/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      <span className="text-codeslam-teal">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto rounded-full bg-black/30 px-2 py-1 text-xs tabular-nums text-white/80">
        {count}
      </span>
    </button>
  );
}