import { notFound, redirect } from "next/navigation";
import { ContractDraftEditor } from "@/components/legal/contract-draft-editor";
import { ContractReviewPanel } from "@/components/legal/contract-review-panel";
import { ContractRiskCard } from "@/components/legal/contract-risk-card";
import { ContractApprovalCard } from "@/components/legal/contract-approval-card";
import {
  compareDraftVersions,
  getContractDraft,
  getDraftApproval,
  getDraftReviews,
  getDraftRisk,
} from "@/lib/api/contracts";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; compare?: string }>;
};

/** CD-146 — one version of a contract draft (the latest unless `?version=`). */
export default async function ContractDraftPage({
  params,
  searchParams,
}: Props) {
  const session = await getSession();
  if (!can(session, "legal.contract.read")) redirect(HOME_PATH);

  const { id } = await params;
  const { version, compare } = await searchParams;
  const no = Number(version);
  const against = Number(compare);
  const result = await getContractDraft(
    id,
    Number.isInteger(no) && no > 0 ? no : undefined,
  );
  if (!result.ok) notFound();
  const view = result.data;
  const canManage = can(session, "legal.contract.manage");

  // CD-147 — the review rounds, the version asked to compare with, and the
  // clauses of the open round's version (what a comment can point at)
  const [reviews, comparison, risk, approval] = await Promise.all([
    getDraftReviews(id),
    Number.isInteger(against) && against > 0
      ? compareDraftVersions(id, against, view.version.versionNo)
      : Promise.resolve(null),
    // CD-159 — risk on the draft, and the approval of a version
    getDraftRisk(id),
    getDraftApproval(id),
  ]);
  const openRound = reviews.ok
    ? reviews.data.rounds.find((round) => round.status === "open")
    : undefined;
  const roundView =
    openRound && openRound.versionNo !== view.version.versionNo
      ? await getContractDraft(id, openRound.versionNo)
      : null;
  const roundClauses = roundView?.ok ? roundView.data.clauses : view.clauses;

  return (
    <div className="flex flex-col gap-3">
      <ContractDraftEditor
        view={view}
        canManage={canManage}
        comparison={comparison?.ok ? comparison.data : null}
      />
      {approval.ok && (
        <ContractApprovalCard
          draftId={id}
          view={approval.data}
          canManage={canManage}
        />
      )}
      {risk.ok && (
        <ContractRiskCard
          basePath={`contract-drafts/${id}`}
          view={risk.data}
          canManage={canManage && view.editable}
        />
      )}
      {reviews.ok && (
        <ContractReviewPanel
          draftId={id}
          reviews={reviews.data}
          roundClauses={roundClauses}
          canManage={canManage}
          editable={view.editable}
        />
      )}
    </div>
  );
}
