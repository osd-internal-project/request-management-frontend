import { notFound, redirect } from "next/navigation";
import { ContractDetailView } from "@/components/legal/contract-detail";
import {
  getContract,
  getContractInstallments,
  getContractObligations,
  getContractRisk,
  getContractTerms,
  getDraftForRequest,
} from "@/lib/api/contracts";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * CD-161 — one contract. A confidential contract the viewer may not open
 * answers 404, the same as one that does not exist (SCOPE-03).
 */
export default async function ContractPage({ params }: Params) {
  const session = await getSession();
  if (!can(session, "legal.contract.read")) redirect(HOME_PATH);

  const { id } = await params;
  const canManage = can(session, "legal.contract.manage");
  const [result, terms, obligations, installments, risk, users] =
    await Promise.all([
    getContract(id),
    // CD-153..156 — same `legal.contract.read`
    getContractTerms(id),
    // CD-163 — same `legal.contract.read`
    getContractObligations(id),
    // CD-164 — same `legal.contract.read`
    getContractInstallments(id),
    // CD-158 — same `legal.contract.read`
    getContractRisk(id),
    // the access list picker — Legal only
    canManage && can(session, "user.read")
      ? getAllDirectoryUsers()
      : Promise.resolve(null),
  ]);
  if (!result.ok) notFound();
  // CD-146 — the draft it was written from, when it came from a request
  const draft = result.data.requestId
    ? await getDraftForRequest(result.data.requestId)
    : null;

  return (
    <ContractDetailView
      contract={result.data}
      terms={terms.ok ? terms.data : null}
      obligations={obligations.ok ? obligations.data : null}
      installments={installments.ok ? installments.data : null}
      risk={risk.ok ? risk.data : null}
      draft={draft?.ok && draft.data.draft ? draft.data : null}
      currentUserId={session?.user.id ?? null}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
