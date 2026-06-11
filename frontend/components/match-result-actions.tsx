"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MatchResultActionsProps = {
  username: string;
};

export function MatchResultActions({ username }: MatchResultActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="rounded-full bg-codeslam-teal px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Play again
      </button>
      <button
        type="button"
        onClick={() => router.push(`/u/${username}`)}
        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        View your profile
      </button>
    </div>
  );
}
