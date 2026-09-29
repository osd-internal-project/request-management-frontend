import { notFound } from "next/navigation";
import { SolutionWorkspace } from "@/components/presales/solution-workspace";
import { getSolution } from "@/lib/api/presales";

/**
 * CD-132 ออกแบบ Solution — open to any signed-in user: the API decides
 * (Pre-Sales sees every Solution, a salesperson only the one on a deal they
 * can see) and answers 404 otherwise (SCOPE-03).
 */
export default async function SolutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const { v } = await searchParams;
  const versionNo = Number(v) > 0 ? Number(v) : undefined;

  const result = await getSolution(id, versionNo);
  if (!result.ok) notFound();

  const solution = result.data;
  return (
    <SolutionWorkspace
      // Reset the editor to the stored draft after every save or version switch.
      key={`${solution.version.id}:${solution.version.updatedAt}`}
      solution={solution}
    />
  );
}
