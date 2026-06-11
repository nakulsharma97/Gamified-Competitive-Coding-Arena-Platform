export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
        <div className="flex animate-pulse flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/10" />
            <div className="space-y-3">
              <div className="h-4 w-48 rounded-full bg-white/10" />
              <div className="h-3 w-40 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="h-12 w-36 rounded-full bg-white/10" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-20 rounded-full bg-white/10" />
              <div className="h-10 rounded-2xl bg-white/10" />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {[0, 1].map(index => (
          <div key={index} className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="animate-pulse space-y-4">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map(card => (
                  <div key={card} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="h-3 w-20 rounded-full bg-white/10" />
                    <div className="mt-3 h-3 w-32 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="h-72 rounded-3xl bg-white/10" />
        </div>
      </section>
    </main>
  );
}