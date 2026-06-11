"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, RefreshCcw, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function BrandMark() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-codeslam-purple via-codeslam-teal to-codeslam-amber text-2xl font-black text-white shadow-[0_0_40px_rgba(83,74,183,0.35)]">
        CS
      </div>
      <h1 className="text-3xl font-black tracking-[0.2em] text-white uppercase">CodeSlam</h1>
      <p className="mt-2 text-sm uppercase tracking-[0.35em] text-white/70">Reset access, regain the arena</p>
    </div>
  );
}

export default function ResetPasswordClient({ initialToken }: Readonly<{ initialToken: string }>) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasResetToken = useMemo(() => initialToken.trim().length > 0, [initialToken]);
  const canSubmitReset = newPassword.length >= 8 && newPassword === confirmPassword;

  async function requestReset() {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Enter the email on your CodeSlam account.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/password/forgot", {
        method: "POST",
        json: { email: email.trim() },
      });

      toast({
        title: "Reset link sent",
        description: "If the address exists, you’ll receive a password reset email shortly.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Unable to request reset",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmReset() {
    if (!canSubmitReset) {
      toast({
        title: "Passwords do not match",
        description: "Use the same password in both fields and make it at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/password/reset", {
        method: "POST",
        json: {
          resetToken: initialToken,
          newPassword,
        },
      });

      toast({
        title: "Password updated",
        description: "Your old sessions were revoked. Sign in again with the new password.",
        variant: "success",
      });

      router.push("/sign-in");
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:grid-cols-[1fr_1.15fr] md:p-10">
        <section className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20 px-6 py-10 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(83,74,183,0.2),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(29,158,117,0.15),transparent_36%)]" />
          <div className="relative flex h-full items-center justify-center">
            <BrandMark />
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-white/10 bg-black/25 px-5 py-6 md:px-8">
          <div className="flex items-center gap-3 text-white/70">
            <ShieldCheck className="h-5 w-5 text-codeslam-teal" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em]">Secure account recovery</span>
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-white">
            {hasResetToken ? "Set a new password" : "Request a reset link"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
            {hasResetToken
              ? "This token is one-time use and short-lived. Updating your password revokes the token chain and invalidates older sessions."
              : "Enter the email attached to your CodeSlam account. If it exists, we’ll send a one-time reset link."}
          </p>

          <div className="mt-8 space-y-5">
            {hasResetToken ? (
              <>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">New password</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-codeslam-teal/60">
                    <KeyRound className="h-4 w-4 text-white/45" />
                    <input
                      value={newPassword}
                      onChange={event => setNewPassword(event.target.value)}
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                      placeholder="Create a new password"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Confirm password</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-codeslam-teal/60">
                    <KeyRound className="h-4 w-4 text-white/45" />
                    <input
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                      placeholder="Repeat the new password"
                    />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => void confirmReset()}
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-codeslam-purple via-codeslam-teal to-codeslam-amber px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className="h-4 w-4" />
                  {isSubmitting ? "Updating password..." : "Update password"}
                </button>
              </>
            ) : (
              <>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Email address</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-codeslam-teal/60">
                    <Mail className="h-4 w-4 text-white/45" />
                    <input
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                      placeholder="you@example.com"
                    />
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => void requestReset()}
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-codeslam-purple via-codeslam-teal to-codeslam-amber px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Mail className="h-4 w-4" />
                  {isSubmitting ? "Sending email..." : "Send reset link"}
                </button>
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-sm text-white/60">
            <span>Need to sign in instead?</span>
            <Link href="/sign-in" className="font-semibold text-codeslam-teal transition hover:text-white">
              Back to sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}