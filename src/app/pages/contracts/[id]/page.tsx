import { notFound, redirect } from "next/navigation";
import { ContractDetailView } from "@/components/legal/contract-detail";
import { getContract } from "@/lib/api/contracts";
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
  const [result, users] = await Promise.all([
    getContract(id),
    // the access list picker — Legal only
    canManage && can(session, "user.read")
      ? getAllDirectoryUsers()
      : Promise.resolve(null),
  ]);
  if (!result.ok) notFound();

  return (
    <ContractDetailView
      contract={result.data}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
