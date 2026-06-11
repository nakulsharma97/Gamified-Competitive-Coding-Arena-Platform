import { cn } from "@/lib/utils";

type MatchTimerProps = {
  seconds: number;
  className?: string;
};

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function MatchTimer({ seconds, className }: MatchTimerProps) {
  const urgent = seconds < 120;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 font-mono text-lg font-semibold tracking-[0.24em] text-white backdrop-blur-md",
        urgent && "border-red-400/40 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.28)] animate-timerPulse",
        className,
      )}
    >
      <span>{formatTime(seconds)}</span>
    </div>
  );
}