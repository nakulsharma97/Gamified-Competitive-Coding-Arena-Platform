"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-8 text-white">
        <h2 className="text-2xl font-black">Arena failed to load</h2>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
