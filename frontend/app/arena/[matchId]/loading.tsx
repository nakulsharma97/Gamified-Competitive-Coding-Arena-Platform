export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="h-16 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-[48rem] animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
        <div className="h-[48rem] animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
      </div>
    </main>
  );
}
