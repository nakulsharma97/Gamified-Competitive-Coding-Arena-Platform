import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ArrowRight, CheckCircle2, Code2, Sparkles, Trophy } from 'lucide-react';

import { Badge, Button, Card, Pill, Spinner, Timer } from '@codeslam/ui';

import { ApiError, checkUsernameAvailability, get, patch, post } from './api';
import { navigateTo } from './navigation';

const languageOptions = [
  { label: 'Python', value: 'PYTHON', starter: 'def solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n' },
  { label: 'JavaScript', value: 'JAVASCRIPT', starter: 'function solve() {\n  // write your solution\n}\n\nsolve();\n' },
  { label: 'C++', value: 'CPP', starter: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n' },
] as const;

const topicOptions = ['Graphs', 'Dynamic Programming', 'Strings', 'Greedy', 'Data Structures', 'Math'] as const;

type OnboardingStep = 'username' | 'languages' | 'topics' | 'practice' | 'placement';

type ProblemDto = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  visibleTestCases: Array<{ input: string; expectedOutput: string }>;
};

type ProblemPageResponse = {
  data: ProblemDto[];
};

type PracticeResult = {
  verdict: string;
  runtimeMs: number;
  memoryMb: number;
  passedCases: number;
  totalCases: number;
};

type UsernameAvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'error';

function StepPill({ active, label, number }: { active: boolean; label: string; number: number }) {
  return (
    <div className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm ${active ? 'border-cyan-300/40 bg-cyan-300/10 text-white' : 'border-white/10 bg-white/5 text-slate-400'}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-white'}`}>{number}</span>
      <span>{label}</span>
    </div>
  );
}

function starterCode(language: (typeof languageOptions)[number]['value']): string {
  return languageOptions.find(option => option.value === language)?.starter ?? '';
}

function verdictTone(verdict: string) {
  const normalized = verdict.toUpperCase();
  if (normalized === 'AC') return 'success' as const;
  if (normalized === 'WA') return 'warning' as const;
  return 'danger' as const;
}

export function OnboardingPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('username');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameAvailabilityState>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>(['Python']);
  const [topics, setTopics] = useState<string[]>(['Graphs', 'Greedy', 'Data Structures']);
  const [problem, setProblem] = useState<ProblemDto | null>(null);
  const [problemLoading, setProblemLoading] = useState(true);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<(typeof languageOptions)[number]['value']>('PYTHON');
  const [code, setCode] = useState(starterCode('PYTHON'));
  const [practiceResult, setPracticeResult] = useState<PracticeResult | null>(null);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadProblem() {
    setProblemLoading(true);
    setProblemError(null);

    try {
      const token = await getToken();
      const response = await get<ProblemPageResponse>('/api/problems?difficulty=EASY&limit=1', { token });
      setProblem(response.data?.[0] ?? null);
      setCode(starterCode(selectedLanguage));
    } catch {
      setProblemError('Failed to load practice problem.');
    } finally {
      setProblemLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'Onboarding | CodeSlam';
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    void loadProblem();

    return () => {
    };
  }, [getToken, isLoaded, isSignedIn, selectedLanguage]);

  useEffect(() => {
    const trimmed = username.trim();

    if (!trimmed) {
      setUsernameStatus('idle');
      setUsernameMessage(null);
      return;
    }

    let active = true;
    setUsernameStatus('checking');
    setUsernameMessage(null);

    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const token = await getToken();
          const result = await checkUsernameAvailability(trimmed, { token });
          if (!active) {
            return;
          }

          if (result.available) {
            setUsernameStatus('available');
            setUsernameMessage('Username is available.');
          } else {
            setUsernameStatus('taken');
            setUsernameMessage('Username is already taken.');
          }
        } catch {
          if (active) {
            setUsernameStatus('error');
            setUsernameMessage('Could not verify username right now.');
          }
        }
      })();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [getToken, username]);

  const stepIndex = useMemo(() => {
    const order: OnboardingStep[] = ['username', 'languages', 'topics', 'practice', 'placement'];
    return order.indexOf(step);
  }, [step]);

  const canContinueUsername = username.trim().length > 0 && usernameStatus === 'available';
  const canContinueTopics = topics.length === 3;
  const canContinuePractice = practiceCompleted;

  function toggleLanguage(language: string) {
    setLanguages(current => (current.includes(language) ? current.filter(item => item !== language) : [...current, language]));
  }

  function toggleTopic(topic: string) {
    setTopics(current => {
      if (current.includes(topic)) {
        return current.filter(item => item !== topic);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, topic];
    });
  }

  async function submitPractice() {
    if (!problem) {
      return;
    }

    setPracticeSubmitting(true);
    setFormError(null);

    try {
      const token = await getToken();
      const result = await post<PracticeResult>('/api/submissions/practice/submit', {
        problemId: problem.id,
        code,
        language: selectedLanguage,
      }, { token });

      setPracticeResult(result);
      if (result.verdict.toUpperCase() === 'AC') {
        setPracticeCompleted(true);
      }
    } catch {
      setFormError('Practice submission failed.');
    } finally {
      setPracticeSubmitting(false);
    }
  }

  async function savePlacement() {
    setSavingProfile(true);
    setFormError(null);

    try {
      const token = await getToken();
      await patch('/api/users/me', {
        username: username.trim(),
        preferredLanguages: languages,
        topicInterests: topics,
        interests: topics,
      }, { token });

      navigateTo('/dashboard');
    } catch {
      setFormError('Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  function goNext() {
    if (step === 'username' && canContinueUsername) {
      setStep('languages');
      return;
    }

    if (step === 'languages') {
      setStep('topics');
      return;
    }

    if (step === 'topics' && canContinueTopics) {
      setStep('practice');
      return;
    }

    if (step === 'practice' && canContinuePractice) {
      setStep('placement');
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,#030712_0%,#050816_55%,#020617_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <button type="button" className="text-sm font-semibold text-white transition hover:text-cyan-200" onClick={() => navigateTo('/')}>
            CodeSlam
          </button>
          <div className="flex flex-wrap gap-2">
            <StepPill number={1} label="Username" active={stepIndex >= 0} />
            <StepPill number={2} label="Languages" active={stepIndex >= 1} />
            <StepPill number={3} label="Topics" active={stepIndex >= 2} />
            <StepPill number={4} label="Practice" active={stepIndex >= 3} />
            <StepPill number={5} label="Placement" active={stepIndex >= 4} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card elevated className="rounded-[2rem] p-6 sm:p-8">
            {formError ? (
              <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{formError}</div>
            ) : null}

            {step === 'username' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge tone="primary" dot>Step 1</Badge>
                  <span className="text-sm text-slate-400">Pick your username</span>
                </div>
                <h1 className="text-3xl font-black text-white sm:text-4xl">Claim a clean competitive identity.</h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-400">Your username appears in battle feeds, ladder results, and match replays. Keep it short and recognizable.</p>
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-lg text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                    placeholder="NovaByte"
                  />
                </label>
                <div className="flex items-center gap-3">
                  {usernameStatus === 'available' ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : null}
                  {usernameStatus === 'taken' ? <span className="text-sm text-rose-300">Taken</span> : null}
                  {usernameStatus === 'checking' ? <span className="text-sm text-slate-400">Checking...</span> : null}
                  {usernameStatus === 'error' ? <span className="text-sm text-amber-200">Verification unavailable</span> : null}
                </div>
                {usernameMessage ? <div className={`text-sm ${usernameStatus === 'available' ? 'text-emerald-300' : usernameStatus === 'taken' ? 'text-rose-300' : 'text-slate-400'}`}>{usernameMessage}</div> : null}
                <div className="flex items-center gap-3">
                  <Button trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={goNext} disabled={!canContinueUsername}>
                    Continue
                  </Button>
                  <Pill tone="neutral">You can edit this later</Pill>
                </div>
              </div>
            ) : null}

            {step === 'languages' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge tone="secondary" dot>Step 2</Badge>
                  <span className="text-sm text-slate-400">Select preferred languages</span>
                </div>
                <h2 className="text-3xl font-black text-white">Choose the languages you want in matchmaking diversity.</h2>
                <div className="flex flex-wrap gap-3">
                  {languageOptions.map(language => {
                    const active = languages.includes(language.label);
                    return (
                      <button
                        key={language.label}
                        type="button"
                        onClick={() => toggleLanguage(language.label)}
                        className={`rounded-full border px-4 py-3 text-sm font-semibold transition ${active ? 'border-cyan-300/40 bg-cyan-300/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'}`}
                      >
                        {language.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <Button trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={goNext}>
                    Continue
                  </Button>
                  <span className="text-sm text-slate-400">Selected {languages.length} language{languages.length === 1 ? '' : 's'}</span>
                </div>
              </div>
            ) : null}

            {step === 'topics' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge tone="success" dot>Step 3</Badge>
                  <span className="text-sm text-slate-400">Pick exactly 3 topic interests</span>
                </div>
                <h2 className="text-3xl font-black text-white">Choose three topics for matchmaking diversity.</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {topicOptions.map(topic => {
                    const active = topics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${active ? 'border-violet-300/40 bg-violet-300/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white'}`}
                      >
                        <div className="text-sm font-semibold">{topic}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">Matchmaking signal</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <Button trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={goNext} disabled={!canContinueTopics}>
                    Continue
                  </Button>
                  <span className="text-sm text-slate-400">Selected {topics.length}/3 topics</span>
                </div>
              </div>
            ) : null}

            {step === 'practice' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge tone="warning" dot>Step 4</Badge>
                  <span className="text-sm text-slate-400">Required unranked practice run</span>
                </div>
                <h2 className="text-3xl font-black text-white">Do the practice run. Do not skip it.</h2>

                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <Card padding="md" className="min-h-[280px]">
                    {problemLoading ? (
                      <div className="flex min-h-[220px] items-center justify-center"><Spinner label="Loading problem" /></div>
                    ) : problemError ? (
                      <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                        <div>{problemError}</div>
                        <Button className="mt-4" variant="secondary" onClick={() => void loadProblem()}>
                          Retry
                        </Button>
                      </div>
                    ) : problem ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Practice problem</div>
                            <div className="mt-2 text-xl font-semibold text-white">{problem.title}</div>
                          </div>
                          <Badge tone="neutral">{problem.difficulty}</Badge>
                        </div>
                        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">{problem.description}</div>
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Timer</div>
                          <div className="mt-2">
                            <Timer seconds={240} />
                          </div>
                        </div>
                      </>
                    ) : null}
                  </Card>

                  <div className="space-y-4">
                    <Card padding="sm">
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>Practice state</span>
                        <Badge tone="primary">Unranked</Badge>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-400">Language</div>
                          <select
                            value={selectedLanguage}
                            onChange={(event) => {
                              const next = event.target.value as (typeof languageOptions)[number]['value'];
                              setSelectedLanguage(next);
                              setCode(starterCode(next));
                            }}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
                          >
                            {languageOptions.map(language => (
                              <option key={language.value} value={language.value}>{language.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                            <Code2 className="h-4 w-4" /> Code
                          </div>
                          <textarea
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            className="min-h-48 w-full rounded-xl border border-white/10 bg-slate-950/80 p-3 font-mono text-sm text-slate-100 outline-none"
                          />
                        </div>
                      </div>
                    </Card>

                    {practiceResult ? (
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge tone={verdictTone(practiceResult.verdict)}>{practiceResult.verdict}</Badge>
                          <span>{practiceResult.runtimeMs}ms</span>
                          <span>{practiceResult.memoryMb.toFixed(2)}MB</span>
                          <span>{practiceResult.passedCases}/{practiceResult.totalCases} cases</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => void submitPractice()} disabled={practiceSubmitting || !problem}>
                    {practiceSubmitting ? 'Running...' : 'Submit practice'}
                  </Button>
                  <Button variant="secondary" onClick={goNext} disabled={!canContinuePractice}>
                    Continue to placement
                  </Button>
                  {practiceCompleted ? <Badge tone="success" dot>Practice finished</Badge> : null}
                </div>
              </div>
            ) : null}

            {step === 'placement' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Badge tone="primary" dot>Step 5</Badge>
                  <span className="text-sm text-slate-400">Rank placement info screen</span>
                </div>
                <h2 className="text-3xl font-black text-white">Your profile is ready for ranked placement.</h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-400">We use your username, language preferences, topic interests, and practice outcome to place you in a balanced starting tier.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card padding="md" elevated>
                    <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Starting tier</div>
                    <div className="mt-3 text-3xl font-black text-white">Balanced</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">A conservative placement based on the practice run and your selected interests.</div>
                  </Card>
                  <Card padding="md" elevated>
                    <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Match diversity</div>
                    <div className="mt-3 text-3xl font-black text-white">Ready</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">Your language and topic choices help widen opponent variety without distorting rank quality.</div>
                  </Card>
                </div>

                <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm leading-7 text-cyan-50">
                  Practice completion confirmed. You’re now ready for your first ranked session.
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => void savePlacement()} disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Enter dashboard'}
                  </Button>
                  <Button variant="secondary" onClick={() => navigateTo('/signup')}>
                    Revisit signup
                  </Button>
                  <Badge tone="success" dot>Onboarding complete</Badge>
                </div>
              </div>
            ) : null}
          </Card>

          <div className="space-y-4">
            <Card elevated className="rounded-[2rem] p-6 sm:p-8">
              <div className="text-xs uppercase tracking-[0.32em] text-slate-400">Progress</div>
              <div className="mt-3 text-2xl font-bold text-white">Finish the mandatory onboarding flow</div>
              <div className="mt-5 grid gap-3">
                <div className="flex items-center justify-between text-sm text-slate-300"><span>Username</span><span>{canContinueUsername ? 'Done' : username.trim() ? 'Checking' : 'Waiting'}</span></div>
                <div className="flex items-center justify-between text-sm text-slate-300"><span>Languages</span><span>{languages.length > 0 ? `${languages.length} selected` : 'Waiting'}</span></div>
                <div className="flex items-center justify-between text-sm text-slate-300"><span>Topics</span><span>{topics.length}/3 selected</span></div>
                <div className="flex items-center justify-between text-sm text-slate-300"><span>Practice run</span><span>{practiceCompleted ? 'Complete' : 'Required'}</span></div>
              </div>
            </Card>

            <Card elevated className="rounded-[2rem] p-6 sm:p-8">
              <div className="text-xs uppercase tracking-[0.32em] text-violet-300">Selected languages</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {languages.map(language => <Pill key={language} tone="primary">{language}</Pill>)}
              </div>
              <div className="mt-6 text-xs uppercase tracking-[0.28em] text-slate-400">Topic set</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {topics.map(topic => <Pill key={topic} tone="secondary">{topic}</Pill>)}
              </div>
            </Card>

            <Card elevated className="rounded-[2rem] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                <div className="text-sm font-semibold text-white">Retention-critical practice step</div>
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-400">The practice run teaches the interface before ranked placement and remains a required step.</div>
            </Card>

            {practiceResult?.verdict.toUpperCase() === 'AC' ? (
              <Card elevated className="rounded-[2rem] p-6 sm:p-8">
                <div className="flex items-center gap-3 text-emerald-300">
                  <Trophy className="h-5 w-5" />
                  <div className="text-sm font-semibold text-white">Practice cleared</div>
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-400">You can continue to placement immediately after saving your profile.</div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}