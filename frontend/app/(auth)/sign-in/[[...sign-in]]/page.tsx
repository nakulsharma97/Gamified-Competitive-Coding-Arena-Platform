import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 bg-slate-950 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_20%)] text-white">
      <div className="grid w-full max-w-5xl gap-8 rounded-[2rem] border border-white/10 bg-slate-900/85 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.65)] backdrop-blur-2xl md:grid-cols-[1fr_1.1fr] md:p-10">
        <div className="flex items-center justify-center rounded-[1.6rem] border border-white/10 bg-slate-800/80 px-6 py-10">
          <CodeSlamBrand />
        </div>

        <div className="flex items-center justify-center rounded-[1.6rem] border border-white/10 bg-slate-800/85 px-4 py-6 md:px-8">
          <div className="w-full max-w-md">
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl="/dashboard"
            />
            <div className="mt-4 text-center text-sm text-white/65">
              Forgot your password?{" "}
              <Link href="/reset-password" className="font-semibold text-codeslam-teal transition hover:text-white">
                Reset it here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}