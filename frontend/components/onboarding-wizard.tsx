"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch, apiJson } from "@/lib/api";

const languages = ["Python", "JavaScript", "C++", "Java"];
const interests = ["Arrays", "DP", "Graphs", "Strings", "Trees", "Design"];

type ProblemDto = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  constraintsText?: string;
};

type PagedResponse<T> = {
  data: T[];
};

type JudgeResult = {
  verdict: string;
  runtimeMs: number;
  memoryMb: number;
  passedCases: number;
  totalCases: number;
};

const starterCode: Record<string, string> = {
  Python: "def solve():\n    pass\n",
  JavaScript: "function solve() {\n  // write code\n}\n",
  "C++": "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  return 0;\n}\n",
  Java: "public class Main {\n  public static void main(String[] args) {\n  }\n}\n",
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [practiceProblem, setPracticeProblem] = useState<ProblemDto | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceLanguage, setPracticeLanguage] = useState("Python");
  const [practiceCode, setPracticeCode] = useState(starterCode.Python);
  const [practiceResult, setPracticeResult] = useState<JudgeResult | null>(null);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!username.trim()) {
      setUsernameState("idle");
      return;
    }

    const timer = window.setTimeout(async () => {
      setUsernameState("checking");

      try {
        const response = await apiFetch(`/api/users/check-username?u=${encodeURIComponent(username.trim())}`);
        const payload = (await response.json()) as { available?: boolean; isAvailable?: boolean; exists?: boolean };
        const available = payload.available ?? payload.isAvailable ?? !payload.exists;
        setUsernameState(available ? "available" : "taken");
      } catch {
        setUsernameState("taken");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (selectedLanguages.length > 0 && !selectedLanguages.includes(practiceLanguage)) {
      const nextLanguage = selectedLanguages[0];
      setPracticeLanguage(nextLanguage);
      setPracticeCode(starterCode[nextLanguage] ?? starterCode.Python);
    }
  }, [practiceLanguage, selectedLanguages]);

  useEffect(() => {
    if (step !== 4 || practiceProblem || practiceLoading) {
      return;
    }

    let active = true;

    const loadPracticeProblem = async () => {
      setPracticeLoading(true);
      try {
        const response = await apiJson<PagedResponse<ProblemDto>>("/api/problems?difficulty=EASY&limit=1&page=0");
        if (!active) {
          return;
        }

        setPracticeProblem(response.data[0] ?? null);
      } finally {
        if (active) {
          setPracticeLoading(false);
        }
      }
    };

    void loadPracticeProblem();

    return () => {
      active = false;
    };
  }, [practiceLoading, practiceProblem, step]);

  const canContinueStep1 = usernameState === "available";
  const canContinueStep2 = selectedLanguages.length >= 1;
  const canContinueStep3 = selectedInterests.length === 3;
  const canFinish = canContinueStep1 && canContinueStep2 && canContinueStep3 && practiceCompleted;

  const stepLabel = useMemo(() => {
    if (step === 1) return "Choose your CodeSlam handle";
    if (step === 2) return "Pick the languages you can battle in";
    if (step === 3) return "Choose exactly 3 topic interests";
    return "Clear the practice challenge";
  }, [step]);

  const pillClass = (selected: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition ${selected
      ? "border-codeslam-teal bg-codeslam-teal/20 text-white"
      : "border-white/10 bg-white/5 text-white/72 hover:border-white/20 hover:bg-white/10"
    }`;

  const toggleItem = (value: string, current: string[], setter: (next: string[]) => void, max?: number) => {
    if (current.includes(value)) {
      setter(current.filter(item => item !== value));
      return;
    }

    if (max !== undefined && current.length >= max) {
      return;
    }

    setter([...current, value]);
  };

  const handlePracticeSubmit = async () => {
    if (!practiceProblem) {
      return;
    }

    setPracticeLoading(true);
    try {
      const response = await apiJson<JudgeResult>("/api/practice/submit", {
        method: "POST",
        json: {
          problemId: practiceProblem.id,
          code: practiceCode,
          language: practiceLanguage,
        },
      });

      setPracticeResult(response);
      setPracticeCompleted(response.verdict === "AC");
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canFinish) {
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        json: {
          username: username.trim(),
          languages: selectedLanguages,
          interests: selectedInterests,
          onboardingComplete: true,
        },
      });
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6">
      <div className="w-full rounded-4xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-white/55">Onboarding</div>
            <h1 className="mt-2 text-3xl font-black text-white">{stepLabel}</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">
            Step {step} / 4
          </div>
        </div>

        <div className="grid gap-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          {step === 1 ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Username</label>
              <input
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder="codeslam_legend"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-codeslam-teal/50"
              />
              <div className="flex items-center gap-2 text-sm">
                {usernameState === "checking" ? (
                  <span className="inline-flex items-center gap-2 text-white/60"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability...</span>
                ) : usernameState === "available" ? (
                  <span className="inline-flex items-center gap-2 text-emerald-300"><Check className="h-4 w-4" /> Available</span>
                ) : usernameState === "taken" ? (
                  <span className="text-rose-300">Taken</span>
                ) : (
                  <span className="text-white/45">Enter a handle to check availability.</span>
                )}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Primary languages</div>
              <div className="flex flex-wrap gap-3">
                {languages.map(language => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleItem(language, selectedLanguages, setSelectedLanguages)}
                    className={pillClass(selectedLanguages.includes(language))}
                  >
                    {language}
                  </button>
                ))}
              </div>
              <div className="text-sm text-white/50">Pick at least one language.</div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Topic interests</div>
              <div className="flex flex-wrap gap-3">
                {interests.map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleItem(topic, selectedInterests, setSelectedInterests, 3)}
                    className={pillClass(selectedInterests.includes(topic))}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <div className="text-sm text-white/50">Pick exactly 3 topics.</div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              {practiceLoading && !practiceProblem ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/65">Loading practice problem...</div>
              ) : practiceProblem ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs uppercase tracking-[0.28em] text-white/55">Practice problem</div>
                    <h2 className="mt-2 text-2xl font-black text-white">{practiceProblem.title}</h2>
                    <div className="mt-2 text-sm text-white/70">{practiceProblem.difficulty}</div>
                    <p className="mt-4 text-sm leading-7 text-white/75">{practiceProblem.description}</p>
                    {practiceProblem.constraintsText ? <p className="mt-3 text-sm text-white/65">Constraints: {practiceProblem.constraintsText}</p> : null}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                      <label className="block text-xs uppercase tracking-[0.24em] text-white/55">Language</label>
                      <select
                        value={practiceLanguage}
                        onChange={event => {
                          const nextLanguage = event.target.value;
                          setPracticeLanguage(nextLanguage);
                          setPracticeCode(starterCode[nextLanguage] ?? starterCode.Python);
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
                      >
                        {languages.map(language => (
                          <option key={language} value={language} className="bg-slate-950 text-white">
                            {language}
                          </option>
                        ))}
                      </select>

                      <div className="space-y-2 text-sm text-white/70">
                        <div><span className="font-semibold text-white">Topics:</span> {practiceProblem.topics.join(", ") || "General"}</div>
                        <div><span className="font-semibold text-white">Goal:</span> Solve it to unlock onboarding.</div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                      <label className="block text-xs uppercase tracking-[0.24em] text-white/55">Code</label>
                      <textarea
                        value={practiceCode}
                        onChange={event => setPracticeCode(event.target.value)}
                        className="min-h-64 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/25"
                        placeholder="Write your solution here"
                      />

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handlePracticeSubmit()}
                          disabled={practiceLoading}
                          className="rounded-full bg-codeslam-teal px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {practiceLoading ? "Running..." : practiceCompleted ? "Run again" : "Submit practice"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPracticeCode(starterCode[practiceLanguage] ?? starterCode.Python)}
                          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                          Reset code
                        </button>
                      </div>
                    </div>
                  </div>

                  {practiceResult ? (
                    <div className={`rounded-2xl border p-5 text-sm ${practiceCompleted ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-100" : "border-rose-300/35 bg-rose-500/10 text-rose-100"}`}>
                      <div className="font-semibold">{practiceResult.verdict}</div>
                      <div className="mt-1">{practiceResult.passedCases}/{practiceResult.totalCases} passed • {practiceResult.runtimeMs} ms • {practiceResult.memoryMb.toFixed(2)} MB</div>
                      {practiceCompleted ? <div className="mt-2 text-sm">Practice cleared. You can finish onboarding now.</div> : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/65">No easy practice problem is available right now.</div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep(current => Math.max(1, current - 1))}
            disabled={step === 1}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <div className="flex gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && canContinueStep1) setStep(2);
                  if (step === 2 && canContinueStep2) setStep(3);
                  if (step === 3 && canContinueStep3) setStep(4);
                }}
                disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || (step === 3 && !canContinueStep3)}
                className="rounded-full bg-codeslam-teal px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canFinish || submitting}
                className="rounded-full bg-codeslam-purple px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Saving..." : practiceCompleted ? "Finish" : "Solve practice to finish"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}