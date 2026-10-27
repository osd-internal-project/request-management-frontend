import { notFound, redirect } from "next/navigation";
import { AgentRecordView } from "@/components/agent-records/agent-record-view";
import { getAgentRecord } from "@/lib/api/agent-records";
import { HOME_PATH } from "@/lib/routes";
import { canAny, getSession } from "@/lib/session";

/** The `read` right of every action in the backend's `AGENT_ACTIONS`. */
const READ_PERMISSIONS = ["crm.sales.read"];

/** หนึ่งงานของ agent — Find Lead พาเข้ามาที่นี่ทันทีหลังกดค้นหา. */
export default async function AgentRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!canAny(session, READ_PERMISSIONS)) redirect(HOME_PATH);

  const { id } = await params;
  const result = await getAgentRecord(id);
  // another company's row or an action the viewer cannot read answers 404 — render the same
  if (!result.ok) notFound();

  return <AgentRecordView record={result.data} />;
}
