"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="text-xs uppercase tracking-[0.32em] text-white/55">Leaderboard</div>
        <h1 className="mt-3 text-3xl font-black text-white">Failed to load</h1>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-codeslam-teal px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Retry
        </button>
      </section>
    </main>
  );
}