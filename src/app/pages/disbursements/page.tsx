import { redirect } from "next/navigation";
import { DisbursementList } from "@/components/disbursement/disbursement-list";
import { HOME_PATH } from "@/lib/routes";
import { can, canAny, getSession } from "@/lib/session";

/** การเบิก — one list (`request.read`); the queues are filters kept in the URL. */
export default async function DisbursementsPage() {
  const session = await getSession();
  if (!can(session, "request.read")) redirect(HOME_PATH);
  return (
    <DisbursementList
      canSeeAll={canAny(session, ["disbursement.read.any", "disbursement.pay"])}
    />
  );
}
