import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

function CodeSlamBrand() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-codeslam-purple via-codeslam-teal to-codeslam-amber text-2xl font-black text-white shadow-[0_0_40px_rgba(83,74,183,0.35)]">
        CS
      </div>
      <h1 className="text-3xl font-black tracking-[0.2em] text-white uppercase">CodeSlam</h1>
      <p className="mt-2 text-sm uppercase tracking-[0.35em] text-white/70">Code. Fight. Win.</p>
    </div>
  );
}

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:grid-cols-[1fr_1.1fr] md:p-10">
        <div className="flex items-center justify-center rounded-[1.6rem] border border-white/10 bg-black/20 px-6 py-10">
          <CodeSlamBrand />
        </div>

        <div className="flex items-center justify-center rounded-[1.6rem] border border-white/10 bg-black/25 px-4 py-6 md:px-8">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </main>
  );
}