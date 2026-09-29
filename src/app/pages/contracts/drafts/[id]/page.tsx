import { notFound, redirect } from "next/navigation";
import { ContractDraftEditor } from "@/components/legal/contract-draft-editor";
import { getContractDraft } from "@/lib/api/contracts";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
};

/** CD-146 — one version of a contract draft (the latest unless `?version=`). */
export default async function ContractDraftPage({
  params,
  searchParams,
}: Props) {
  const session = await getSession();
  if (!can(session, "legal.contract.read")) redirect(HOME_PATH);

  const { id } = await params;
  const { version } = await searchParams;
  const no = Number(version);
  const result = await getContractDraft(
    id,
    Number.isInteger(no) && no > 0 ? no : undefined,
  );
  if (!result.ok) notFound();

  return (
    <ContractDraftEditor
      view={result.data}
      canManage={can(session, "legal.contract.manage")}
    />
  );
}
