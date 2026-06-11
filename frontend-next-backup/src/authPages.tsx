import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Compass, Lock, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';

import { Badge, Button, Card, Pill } from '@codeslam/ui';

import { navigateTo } from './navigation';

function AuthShell({
  eyebrow,
  title,
  copy,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,#030712_0%,#050816_55%,#020617_100%)] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-8">
        <aside className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:p-8">
          <div>
            <button type="button" onClick={() => navigateTo('/')} className="flex items-center gap-3 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-white/5">
                <ShieldCheck className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-[0.28em] text-white">CODESLAM</div>
                <div className="text-[10px] uppercase tracking-[0.34em] text-slate-400">Battle arena platform</div>
              </div>
            </button>

            <Badge tone="primary" dot className="mt-8 w-fit border-violet-400/20 bg-violet-500/10 text-violet-100">
              {eyebrow}
            </Badge>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">{copy}</p>
          </div>

          <div className="mt-10 grid gap-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Compass className="h-4 w-4 text-cyan-300" />
                Unranked practice is mandatory for new users.
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-400">
                The onboarding flow includes a full practice run so users understand the interface before their first ranked placement.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Retention note</div>
                <div className="mt-2 text-2xl font-bold text-white">3x D7</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">Users who complete the practice run retain better.</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Flow</div>
                <div className="mt-2 text-2xl font-bold text-white">5 steps</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">Username, languages, interests, practice, placement.</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center">
          <div className="w-full max-w-lg">{children}</div>
        </main>
      </div>
      {aside}
    </div>
  );
}

export function LoginPage() {
  useEffect(() => {
    document.title = 'Login | CodeSlam';
  }, []);

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Return to the arena and keep your streak alive."
      copy="Pick up where you left off, check your match history, and jump back into competitive play with your saved profile."
      aside={null}
    >
      <Card elevated className="rounded-[2rem] p-6 sm:p-8">
        <div className="text-xs uppercase tracking-[0.32em] text-cyan-300">Login</div>
        <h2 className="mt-3 text-2xl font-bold text-white">Welcome back</h2>
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
          <SignIn
            afterSignInUrl="/auth/callback"
            signUpUrl="/signup"
            routing="path"
            path="/login"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <button type="button" className="transition hover:text-white" onClick={() => navigateTo('/signup')}>
            Need an account? Sign up
          </button>
          <button type="button" className="transition hover:text-white" onClick={() => navigateTo('/onboarding')}>
            Start onboarding
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            <Lock className="mr-2 inline h-4 w-4 text-violet-300" />
            Secure login keeps your ranked history, season stats, and unranked practice data synchronized.
          </div>
        </div>
      </Card>
    </AuthShell>
  );
}

export function SignupPage() {
  useEffect(() => {
    document.title = 'Sign up | CodeSlam';
  }, []);

  return (
    <AuthShell
      eyebrow="Create account"
      title="Create your profile before you enter the bracket."
      copy="Sign up once, choose your competitive identity, and then complete the onboarding practice run so your first ranked placement is accurate."
      aside={null}
    >
      <Card elevated className="rounded-[2rem] p-6 sm:p-8">
        <div className="text-xs uppercase tracking-[0.32em] text-violet-300">Sign up</div>
        <h2 className="mt-3 text-2xl font-bold text-white">Start with a clean profile</h2>
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
          <SignUp
            afterSignUpUrl="/auth/callback"
            signInUrl="/login"
            routing="path"
            path="/signup"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <button type="button" className="transition hover:text-white" onClick={() => navigateTo('/login')}>
            Already have an account? Login
          </button>
          <button type="button" className="transition hover:text-white" onClick={() => navigateTo('/onboarding')}>
            Continue to onboarding
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Pill tone="secondary">Pick a username</Pill>
          <Pill tone="primary">Practice first</Pill>
          <Pill tone="success">Rank safely</Pill>
        </div>
      </Card>
    </AuthShell>
  );
}
