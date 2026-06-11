import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleOff, PlayCircle, XCircle } from 'lucide-react';

import { Badge, Button, Card, Pill, Spinner } from '@codeslam/ui';

import { navigateTo } from './navigation';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

type ProblemDetails = {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topics: string[];
  constraints?: string | null;
  battleUseCount: number;
  visibleTestCases: Array<{ input: string; expectedOutput: string; explanation?: string | null }>;
  timeLimitMs?: number | null;
  memoryLimitMb?: number | null;
};

type PracticeResult = {
  verdict: 'PENDING' | 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'ERROR';
  runtimeMs?: number | null;
  memoryMb?: number | null;
  passedCases?: number | null;
  totalCases?: number | null;
};

function starterCode(language: string): string {
  if (language === 'python') {
    return 'def solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n';
  }

  if (language === 'java') {
    return 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n';
  }

  return 'function solve() {\n  // Write your solution here\n}\n\nsolve();\n';
}

function verdictBadge(verdict: PracticeResult['verdict']): JSX.Element {
  if (verdict === 'AC') {
    return <Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" />AC</Badge>;
  }
  if (verdict === 'PENDING') {
    return <Badge tone="neutral"><CircleOff className="h-3.5 w-3.5" />PENDING</Badge>;
  }
  return <Badge tone="danger"><XCircle className="h-3.5 w-3.5" />{verdict}</Badge>;
}

export function ProblemSolvePage({ problemId }: { problemId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [code, setCode] = useState(starterCode('javascript'));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);

  useEffect(() => {
    document.title = 'Solve Problem | CodeSlam';
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/problems/${problemId}`, {
          credentials: 'include',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Problem unavailable');
        }

        const json = (await response.json()) as ProblemDetails;
        setProblem(json);
      } catch {
        setError('Could not load this problem.');
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [problemId]);

  const plainDescription = useMemo(() => {
    const source = problem?.description ?? '';
    return source
      .replace(/^#+\s?/gm, '')
      .replace(/\*\*/g, '')
      .trim();
  }, [problem?.description]);

  async function submitPractice(): Promise<void> {
    if (!problem) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/submissions/practice', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || 'Practice submission failed.');
      }

      const json = (await response.json()) as PracticeResult;
      setResult(json);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Practice submission failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.13),_transparent_32%),linear-gradient(180deg,#020617_0%,#040b1a_56%,#020617_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <Card elevated>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Solo Solve</div>
              <h1 className="mt-2 text-3xl font-black text-white">{problem?.title ?? 'Loading problem...'}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {problem ? <Badge tone={problem.difficulty === 'EASY' ? 'success' : problem.difficulty === 'MEDIUM' ? 'warning' : 'danger'}>{problem.difficulty}</Badge> : null}
                <Pill tone="primary">No timer</Pill>
                <Pill tone="secondary">No opponent</Pill>
                {problem ? <Pill tone="success">Battle Use Count: {problem.battleUseCount}</Pill> : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigateTo('/problems')}>Back to Problems</Button>
              <Button onClick={() => navigateTo('/dashboard')}>Dashboard</Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card elevated>
            <div className="flex min-h-[420px] items-center justify-center">
              <Spinner label="Loading problem" />
            </div>
          </Card>
        ) : error || !problem ? (
          <Card elevated>
            <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error ?? 'Problem unavailable.'}</div>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <Card elevated className="max-h-[78vh] overflow-auto">
              <div className="text-sm leading-7 text-slate-200 whitespace-pre-wrap">{plainDescription}</div>
              {problem.constraints ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Constraints</div>
                  <div className="mt-2 whitespace-pre-wrap">{problem.constraints}</div>
                </div>
              ) : null}

              <div className="mt-5">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Topics</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(problem.topics ?? []).map((topic) => (
                    <Pill key={topic} tone="neutral">{topic}</Pill>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Visible Test Cases</div>
                <div className="mt-3 space-y-3">
                  {(problem.visibleTestCases ?? []).map((testCase, idx) => (
                    <div key={`${idx}-${testCase.input}`} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                      <div><span className="text-slate-400">Input:</span> {testCase.input}</div>
                      <div className="mt-1"><span className="text-slate-400">Expected:</span> {testCase.expectedOutput}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card elevated className="flex min-h-[78vh] flex-col">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <select
                  value={language}
                  onChange={(event) => {
                    const next = event.target.value as 'javascript' | 'python' | 'java';
                    setLanguage(next);
                    setCode(starterCode(next));
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                </select>

                <Button leadingIcon={<PlayCircle className="h-4 w-4" />} onClick={() => void submitPractice()} disabled={submitting}>
                  {submitting ? 'Running...' : 'Run + Submit'}
                </Button>
              </div>

              <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0b1020]">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <Spinner label="Loading editor" />
                    </div>
                  }
                >
                  <MonacoEditor
                    height="100%"
                    theme="vs-dark"
                    language={language === 'javascript' ? 'javascript' : language}
                    value={code}
                    onChange={(value) => setCode(value ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbersMinChars: 3,
                      smoothScrolling: true,
                      automaticLayout: true,
                    }}
                  />
                </Suspense>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                {result ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {verdictBadge(result.verdict)}
                    <span>{result.runtimeMs ?? 0}ms</span>
                    <span>{result.memoryMb?.toFixed(2) ?? '0.00'}MB</span>
                    <span>{result.passedCases ?? 0}/{result.totalCases ?? 0} cases</span>
                  </div>
                ) : (
                  <div className="text-slate-400">Run your solution to get verdict and case stats.</div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
