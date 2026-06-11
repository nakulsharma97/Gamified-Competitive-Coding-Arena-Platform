import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ArenaEntryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;

  if (!matchId) {
    redirect("/dashboard");
  }

  redirect(`/arena/${matchId}`);
}
