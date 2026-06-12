import { auth } from "@clerk/nextjs/server";
import { apiJson, getServerToken, type ApiError } from "@/lib/api";
import { MatchResultActions } from "@/components/match-result-actions";

type PageProps = {
  params: Promise<{ matchId: string }>;
};

type UserProfile = {
  id: string;
  username: string;
};

type ProblemDto = {
  id: string;
  title: string;
  difficulty: string;
};

type MatchDto = {
  id: string;
  problem: ProblemDto;
  player1: UserProfile;
  player2: UserProfile;
  status: string;
  player1Hp: number;
  player2Hp: number;
};

type MatchEventDto = {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
};

type EloHistoryPoint = {
  eloBefore: number;
  eloAfter: number;
  matchId?: string | null;
};

type SubmissionTimelineItem = {
  id: string;
  time: string;
  verdict: string;
  runtime: number;
};

type DamageRow = {
  reason: string;
  damage: number;
};

function safeObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function parseEventPayload(payload: Record<string, unknown>) {
  if (typeof payload.json === "string") {
    try {
      const parsed = JSON.parse(payload.json) as Record<string, unknown>;
      return safeObject(parsed);
    } catch {
      return payload;
    }
  }

  return payload;
}

function inferWinnerId(match: MatchDto, events: MatchEventDto[]) {
  const matchEnd = [...events].reverse().find(event => event.eventType?.toLowerCase() === "match_end");
  const payload = matchEnd ? parseEventPayload(safeObject(matchEnd.payload)) : {};
  const winnerFromPayload = payload.winnerId;

  if (typeof winnerFromPayload === "string" && winnerFromPayload.length > 0) {
    return winnerFromPayload;
  }

  if (match.player1Hp <= 0 && match.player2Hp > 0) {
    return match.player2.id;
  }

  if (match.player2Hp <= 0 && match.player1Hp > 0) {
    return match.player1.id;
  }

  return null;
}

function buildDamageRows(events: MatchEventDto[]) {
  const rows: DamageRow[] = [];

  events
    .filter(event => event.eventType?.toLowerCase() === "submission")
    .forEach(event => {
      const payload = parseEventPayload(safeObject(event.payload));
      const damage = safeObject(payload.damage);
      const damageDealt = Number(damage.damageDealt ?? payload.damageDealt ?? 0);
      const selfDamage = Number(damage.selfDamage ?? payload.selfDamage ?? 0);

      if (Number.isFinite(damageDealt) && damageDealt !== 0) {
        rows.push({ reason: "Damage dealt", damage: damageDealt });
      }

      if (Number.isFinite(selfDamage) && selfDamage !== 0) {
        rows.push({ reason: "Self damage", damage: selfDamage });
      }

      const breakdown = Array.isArray(damage.breakdown) ? damage.breakdown : [];
      breakdown.forEach((item, index) => {
        if (typeof item !== "string") {
          return;
        }

        const signed = item.match(/([+-]?\d+)/);
        const value = signed ? Number(signed[1]) : 0;
        rows.push({ reason: item || `Rule ${index + 1}`, damage: Number.isFinite(value) ? value : 0 });
      });
    });

  return rows;
}

function buildTimeline(events: MatchEventDto[]) {
  return events
    .filter(event => event.eventType?.toLowerCase() === "submission")
    .map(event => {
      const payload = parseEventPayload(safeObject(event.payload));
      const runtime = Number(payload.runtimeMs ?? 0);

      return {
        id: event.id,
        time: new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        verdict: String(payload.verdict ?? "PENDING"),
        runtime: Number.isFinite(runtime) ? runtime : 0,
      } satisfies SubmissionTimelineItem;
    });
}

export default async function MatchResultPage({ params }: PageProps) {
  const { matchId } = await params;
  const session = await auth();
  const token = (await session.getToken(process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE ? { template: process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE } : undefined)) ?? (await getServerToken());

  const [me, match, events, eloHistory] = await Promise.all([
    apiJson<UserProfile>("/api/users/me", { token: token ?? undefined }),
    apiJson<MatchDto>(`/api/matches/${matchId}`, { token: token ?? undefined }),
    apiJson<MatchEventDto[]>(`/api/matches/${matchId}/events`, { token: token ?? undefined }).catch(() => []),
    apiJson<EloHistoryPoint[]>("/api/users/me/elo-history?days=120", { token: token ?? undefined }).catch(
      (error: unknown) => {
        const apiError = error as ApiError;
        if (apiError?.status === 404) {
          return [];
        }

        return [];
      },
    ),
  ]);

  const winnerId = inferWinnerId(match, events);
  const didWin = winnerId === me.id;
  const didLose = winnerId !== null && winnerId !== me.id;

  const eloPoint = eloHistory.find(point => point.matchId === match.id) ?? null;
  const eloDelta = eloPoint ? eloPoint.eloAfter - eloPoint.eloBefore : 0;

  const damageRows = buildDamageRows(events);
  const timeline = buildTimeline(events);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <section className={`rounded-4xl border p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${didWin ? "border-emerald-300/30 bg-emerald-500/15" : didLose ? "border-rose-300/30 bg-rose-500/15" : "border-white/10 bg-white/5"}`}>
        <div className="text-xs uppercase tracking-[0.32em] text-white/60">Post Match</div>
        <h1 className="mt-3 text-4xl font-black text-white">{didWin ? "Victory" : didLose ? "Defeat" : "Match Complete"}</h1>
        <div className="mt-3 text-sm text-white/70">{me.username} vs {me.id === match.player1.id ? match.player2.username : match.player1.username}</div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-white/50">ELO Delta</div>
            <div className={`mt-3 text-3xl font-black ${eloDelta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
              {eloDelta >= 0 ? "↑" : "↓"} {eloDelta >= 0 ? "+" : ""}{eloDelta}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-white/50">Problem</div>
            <div className="mt-3 text-xl font-black text-white">{match.problem.title}</div>
            <div className="mt-1 text-sm text-white/70">{match.problem.difficulty}</div>
          </div>
        </div>

        <MatchResultActions username={me.username} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">Damage Breakdown</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-90 text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-white/45">
                <tr>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Damage</th>
                </tr>
              </thead>
              <tbody>
                {damageRows.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td className="py-3 text-white/60" colSpan={2}>No damage events available.</td>
                  </tr>
                ) : (
                  damageRows.map((row, index) => (
                    <tr key={`${row.reason}-${index}`} className="border-t border-white/10">
                      <td className="py-3 text-white/75">{row.reason}</td>
                      <td className="py-3 font-semibold text-white">{row.damage}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">Submission Timeline</div>
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No submission timeline available.
              </div>
            ) : (
              timeline.map(item => (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{item.time}</div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.verdict === "AC" ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>
                      {item.verdict}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-white/70">Runtime: {item.runtime} ms</div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
