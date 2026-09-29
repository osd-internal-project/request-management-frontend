import { redirect } from "next/navigation";
import { ContractTemplatesAdmin } from "@/components/legal/contract-templates-admin";
import {
  getContractTemplates,
  getTemplateVariables,
} from "@/lib/api/contracts";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-146 — แม่แบบสัญญา. Legal sees the ones switched off too. */
export default async function ContractTemplatesPage() {
  const session = await getSession();
  if (!can(session, "legal.contract.read")) redirect(HOME_PATH);

  const canManage = can(session, "legal.contract.manage");
  const [templates, variables] = await Promise.all([
    getContractTemplates(canManage),
    getTemplateVariables(),
  ]);

  return (
    <ContractTemplatesAdmin
      templates={templates.ok ? templates.data : []}
      variables={variables.ok ? variables.data : null}
      canManage={canManage}
    />
  );
}
