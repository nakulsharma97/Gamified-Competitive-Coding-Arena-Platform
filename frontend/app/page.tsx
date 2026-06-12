"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api";

type ProblemDto = {
  id: string;
  title: string;
  difficulty: string;
  topics: string[];
  battleUseCount: number;
  acceptanceRate?: number;
  acceptancePercent?: number;
  acceptedSubmissions?: number;
  totalSubmissions?: number;
  yourStatus?: string;
  attemptedByCurrentUser?: boolean;
  solvedByCurrentUser?: boolean;
};

type PagedResponse<T> = {
  data: T[];
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
};

const difficultyOrder = ["Easy", "Medium", "Hard"];

function statusFor(problem: ProblemDto) {
  if (problem.yourStatus) {
    return problem.yourStatus;
  }

  if (problem.solvedByCurrentUser) {
    return "Solved";
  }

  if (problem.attemptedByCurrentUser) {
    return "Attempted";
  }

  return "Unseen";
}

function acceptanceFor(problem: ProblemDto) {
  if (typeof problem.acceptancePercent === "number") {
    return problem.acceptancePercent;
  }

  if (typeof problem.acceptanceRate === "number") {
    return problem.acceptanceRate;
  }

  if (typeof problem.acceptedSubmissions === "number" && typeof problem.totalSubmissions === "number") {
    if (problem.totalSubmissions === 0) {
      return 0;
    }

    return (problem.acceptedSubmissions / problem.totalSubmissions) * 100;
  }

  return 0;
}

export default function ProblemsPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [rows, setRows] = useState<ProblemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", "0");
        params.set("size", "50");

        if (debouncedQuery) {
          params.set("search", debouncedQuery);
        }

        if (selectedDifficulties.length === 1) {
          params.set("difficulty", selectedDifficulties[0].toUpperCase());
        }

        if (selectedTopic !== "All") {
          params.set("topic", selectedTopic);
        }

        const response = await apiJson<PagedResponse<ProblemDto>>(`/api/problems?${params.toString()}`);

        if (!active) {
          return;
        }

        const filtered = response.data.filter(problem => {
          if (selectedDifficulties.length > 1 && !selectedDifficulties.includes(problem.difficulty)) {
            return false;
          }

          if (selectedTopic !== "All" && !(problem.topics ?? []).includes(selectedTopic)) {
            return false;
          }

          return true;
        });

        setRows(
          filtered.sort((a, b) => Number(b.battleUseCount ?? 0) - Number(a.battleUseCount ?? 0)),
        );
      } catch {
        if (active) {
          setRows([]);
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
  }, [debouncedQuery, selectedDifficulties, selectedTopic]);

  const topics = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(problem => {
      (problem.topics ?? []).forEach(topic => set.add(topic));
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties(current =>
      current.includes(difficulty) ? current.filter(item => item !== difficulty) : [...current, difficulty],
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-4xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="text-xs uppercase tracking-[0.32em] text-white/55">Problems</div>
        <h1 className="mt-2 text-4xl font-black text-white">Battle Problem Set</h1>

        <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_1fr_0.8fr]">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search problems"
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
          />

          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/25 p-2">
            {difficultyOrder.map(difficulty => {
              const selected = selectedDifficulties.includes(difficulty);
              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => toggleDifficulty(difficulty)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${selected ? "bg-codeslam-teal text-white" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                >
                  {difficulty}
                </button>
              );
            })}
          </div>

          <select
            value={selectedTopic}
            onChange={event => setSelectedTopic(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none"
          >
            {topics.map(topic => (
              <option key={topic} value={topic} className="bg-slate-950">
                {topic}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-white/45">
              <tr>
                <th className="py-2">#</th>
                <th className="py-2">Title</th>
                <th className="py-2">Difficulty</th>
                <th className="py-2">Acceptance %</th>
                <th className="py-2">Battle Uses</th>
                <th className="py-2">Your Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="border-t border-white/10">
                  <td className="py-4 text-white/60" colSpan={6}>Loading problems...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr className="border-t border-white/10">
                  <td className="py-4 text-white/60" colSpan={6}>No problems found.</td>
                </tr>
              ) : (
                rows.map((problem, index) => (
                  <tr
                    key={problem.id}
                    onClick={() => router.push(`/problems/${problem.id}`)}
                    className="cursor-pointer border-t border-white/10 transition hover:bg-white/10"
                  >
                    <td className="py-3 text-white/75">{index + 1}</td>
                    <td className="py-3">
                      <div className="font-semibold text-white">{problem.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(problem.topics ?? []).map(topic => (
                          <span key={topic} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-white/80">{problem.difficulty}</td>
                    <td className="py-3 text-white/80">{acceptanceFor(problem).toFixed(1)}%</td>
                    <td className="py-3 font-semibold text-white">{problem.battleUseCount}</td>
                    <td className="py-3 text-white/80">{statusFor(problem)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
