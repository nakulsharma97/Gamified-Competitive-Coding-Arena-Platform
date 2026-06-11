"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

type ProblemDto = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  constraintsText?: string;
  visibleTestCases: Array<{ id: string; input: string; expectedOutput: string; explanation?: string }>;
};

type JudgeResult = {
  verdict: string;
  runtimeMs: number;
  memoryMb: number;
  passedCases: number;
  totalCases: number;
  caseResults: Array<{
    caseIndex: number;
    verdict: string;
    passed: boolean;
    stdout: string;
    stderr: string;
    runtimeMs: number;
    memoryMb: number;
  }>;
};

type MonacoEditorLike = {
  getValue: () => string;
};

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-120 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white/60">
      Loading editor...
    </div>
  ),
});

const starterCode = {
  Python: "def solve():\n    pass\n",
  JavaScript: "function solve() {\n  // write code\n}\n",
  "C++": "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  return 0;\n}\n",
  Java: "public class Main {\n  public static void main(String[] args) {\n  }\n}\n",
};

export default function ProblemPracticePage() {
  const params = useParams<{ id: string | string[] }>();
  const problemId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [problem, setProblem] = useState<ProblemDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [language, setLanguage] = useState<keyof typeof starterCode>("Python");
  const [code, setCode] = useState(starterCode.Python);
  const [editor, setEditor] = useState<MonacoEditorLike | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!problemId) {
        return;
      }

      try {
        const response = await apiJson<ProblemDto>(`/api/problems/${problemId}`);
        if (active) {
          setProblem(response);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [problemId]);

  const runPractice = async () => {
    if (!problem) {
      return;
    }

    setRunning(true);
    try {
      const response = await apiJson<JudgeResult>("/api/practice/submit", {
        method: "POST",
        json: {
          problemId: problem.id,
          code: editor?.getValue?.() ?? code,
          language,
        },
      });
      setResult(response);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-white/70">Loading practice problem...</div>
      ) : problem ? (
        <>
          <section className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="text-xs uppercase tracking-[0.32em] text-white/55">Solo Practice</div>
            <h1 className="mt-2 text-4xl font-black text-white">{problem.title}</h1>
            <div className="mt-3 text-sm text-white/75">{problem.difficulty}</div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 text-xs uppercase tracking-[0.28em] text-white/55">Description</div>
              <p className="text-sm leading-7 text-white/75">{problem.description}</p>
              {problem.constraintsText ? <p className="mt-4 text-sm text-white/70">Constraints: {problem.constraintsText}</p> : null}

              <div className="mt-5 space-y-3">
                {problem.visibleTestCases.map(testCase => (
                  <div key={testCase.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/75">
                    <div><span className="font-semibold text-white">Input:</span> {testCase.input}</div>
                    <div className="mt-1"><span className="font-semibold text-white">Expected:</span> {testCase.expectedOutput}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <select
                  value={language}
                  onChange={event => {
                    const next = event.target.value as keyof typeof starterCode;
                    setLanguage(next);
                    setCode(starterCode[next]);
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                >
                  {Object.keys(starterCode).map(item => (
                    <option key={item} value={item} className="bg-slate-950 text-white">
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={runPractice}
                  disabled={running}
                  className="rounded-full bg-codeslam-teal px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {running ? "Running..." : "Run Tests"}
                </button>
              </div>

              <MonacoEditor
                height="520px"
                theme="vs-dark"
                language={language === "C++" ? "cpp" : language.toLowerCase()}
                value={code}
                onChange={value => setCode(value ?? "")}
                onMount={editorInstance => setEditor(editorInstance as MonacoEditorLike)}
                options={{
                  minimap: { enabled: false },
                  automaticLayout: true,
                  fontSize: 14,
                  wordWrap: "on",
                }}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">Case Results</div>
            {!result ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/60">
                Run tests to see case-by-case output.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                  <div className="font-semibold text-white">{result.verdict}</div>
                  <div className="mt-1">{result.passedCases}/{result.totalCases} passed • {result.runtimeMs} ms • {result.memoryMb.toFixed(2)} MB</div>
                </div>

                {result.caseResults.map(testCase => (
                  <article key={testCase.caseIndex} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">Case {testCase.caseIndex}</div>
                      <span className={testCase.passed ? "text-emerald-300" : "text-rose-300"}>{testCase.verdict}</span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-white/70 sm:grid-cols-2">
                      <div>stdout: {testCase.stdout || "—"}</div>
                      <div>stderr: {testCase.stderr || "—"}</div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-3xl border border-rose-300/25 bg-rose-500/10 p-6 text-rose-100">Problem unavailable.</div>
      )}
    </main>
  );
}
