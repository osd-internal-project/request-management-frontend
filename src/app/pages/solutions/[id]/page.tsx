import { notFound } from "next/navigation";
import { SolutionWorkspace } from "@/components/presales/solution-workspace";
import { getSolution, getSolutionQuotations } from "@/lib/api/presales";
import { canAny, getSession } from "@/lib/session";

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
  // CD-198 — the quotations started from it, and whether this viewer may.
  const [quotations, session] = await Promise.all([
    getSolutionQuotations(id),
    getSession(),
  ]);
  return (
    <SolutionWorkspace
      // Reset the editor to the stored draft after every save or version switch.
      key={`${solution.version.id}:${solution.version.updatedAt}`}
      solution={solution}
      quotations={quotations.ok ? quotations.data : []}
      canQuote={canAny(session, ["pricing.price.manage", "crm.sales.manage"])}
    />
  );
}
