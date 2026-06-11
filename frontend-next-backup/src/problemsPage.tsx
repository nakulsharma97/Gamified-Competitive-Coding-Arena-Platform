import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, XCircle } from 'lucide-react';

import { Badge, Button, Card, Pill, Spinner } from '@codeslam/ui';

import { navigateTo } from './navigation';

type ProblemSummary = {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topics: string[];
  battleUseCount: number;
  acceptanceRate: number;
  attemptedByCurrentUser: boolean;
  solvedByCurrentUser: boolean;
};

type ProblemPageResponse = {
  content: ProblemSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

const PAGE_SIZE = 20;

function normalizeQuery(value: string): string {
  return value.trim();
}

function formatPct(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function statusCell(problem: ProblemSummary): JSX.Element {
  if (problem.solvedByCurrentUser) {
    return <CheckCircle2 className="h-5 w-5 text-emerald-300" />;
  }

  if (problem.attemptedByCurrentUser) {
    return <XCircle className="h-5 w-5 text-rose-300" />;
  }

  return <span className="text-slate-500">-</span>;
}

export function ProblemsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [response, setResponse] = useState<ProblemPageResponse | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [topicFilter, setTopicFilter] = useState<string>('ALL');

  useEffect(() => {
    document.title = 'Problems | CodeSlam';
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchTerm(normalizeQuery(query));
      setPage(0);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('size', String(PAGE_SIZE));
        if (searchTerm) {
          params.set('search', searchTerm);
        }

        const response = await fetch(`/api/problems?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Could not load problems.');
        }

        const json = (await response.json()) as ProblemPageResponse;
        setResponse(json);
      } catch {
        setError('Could not load problems.');
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [page, searchTerm]);

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    for (const problem of response?.content ?? []) {
      for (const topic of problem.topics ?? []) {
        set.add(topic);
      }
    }
    return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [response]);

  const filteredRows = useMemo(() => {
    const rows = response?.content ?? [];
    return rows.filter((problem) => {
      if (difficultyFilter !== 'ALL' && problem.difficulty !== difficultyFilter) {
        return false;
      }

      if (topicFilter !== 'ALL' && !(problem.topics ?? []).includes(topicFilter)) {
        return false;
      }

      return true;
    });
  }, [difficultyFilter, response, topicFilter]);

  const totalPages = response?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_34%),linear-gradient(180deg,#020617_0%,#040b1a_58%,#020617_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <Card elevated>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Problem Bank</div>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">CodeSlam Problems</h1>
              <p className="mt-2 text-sm text-slate-300">Battle use count is a first-class signal in this list. Sort defaults to most battle-tested problems.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigateTo('/dashboard')}>Dashboard</Button>
              <Button onClick={() => navigateTo('/leaderboard')}>Leaderboard</Button>
            </div>
          </div>
        </Card>

        <Card elevated>
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.6fr]">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles/descriptions (MySQL full-text)"
                className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>

            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value as 'ALL' | 'EASY' | 'MEDIUM' | 'HARD')}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              <option value="ALL">All difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>

            <select
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              {topicOptions.map((topic) => (
                <option key={topic} value={topic}>{topic === 'ALL' ? 'All topics' : topic}</option>
              ))}
            </select>
          </div>
        </Card>

        <Card elevated>
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Spinner label="Loading problems" />
            </div>
          ) : error ? (
            <div className="min-h-[300px] rounded-xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    <tr>
                      <th className="py-3">#</th>
                      <th className="py-3">Title</th>
                      <th className="py-3">Topic Tags</th>
                      <th className="py-3">Difficulty</th>
                      <th className="py-3">Acceptance</th>
                      <th className="py-3">Battle Use Count</th>
                      <th className="py-3">Your Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((problem, idx) => (
                      <tr
                        key={problem.id}
                        className="cursor-pointer border-t border-white/10 transition-colors hover:bg-cyan-500/8"
                        onClick={() => navigateTo(`/problems/${problem.id}/solve`)}
                      >
                        <td className="py-3 text-slate-300">{page * PAGE_SIZE + idx + 1}</td>
                        <td className="py-3 font-semibold text-white">{problem.title}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(problem.topics ?? []).map((topic) => (
                              <Pill key={topic} tone="neutral">{topic}</Pill>
                            ))}
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge tone={problem.difficulty === 'EASY' ? 'success' : problem.difficulty === 'MEDIUM' ? 'warning' : 'danger'}>
                            {problem.difficulty}
                          </Badge>
                        </td>
                        <td className="py-3 text-slate-200">{formatPct(problem.acceptanceRate ?? 0)}</td>
                        <td className="py-3">
                          <span className="rounded-full border border-cyan-300/25 bg-cyan-400/15 px-3 py-1 text-sm font-bold text-cyan-100">
                            {problem.battleUseCount ?? 0}
                          </span>
                        </td>
                        <td className="py-3">{statusCell(problem)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-300">{response?.totalElements ?? 0} problems • 20 per page</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page <= 0}>
                    Prev
                  </Button>
                  <Pill tone="primary">Page {page + 1} / {Math.max(1, totalPages)}</Pill>
                  <Button size="sm" variant="secondary" onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))} disabled={page + 1 >= totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
