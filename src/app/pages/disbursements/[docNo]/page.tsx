import { notFound, redirect } from "next/navigation";
import { Alert } from "antd";
import { DisbursementDetailView } from "@/components/disbursement/disbursement-detail";
import { getDisbursement } from "@/lib/api/disbursement";
import { getRequest } from "@/lib/api/requests";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** การเบิก — one disbursement, and the approved request it was created from. */
export default async function DisbursementPage({
  params,
}: {
  params: Promise<{ docNo: string }>;
}) {
  const { docNo } = await params;
  const session = await getSession();
  if (!can(session, "request.read")) redirect(HOME_PATH);

  const result = await getDisbursement(decodeURIComponent(docNo));
  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") notFound();
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={result.error.message}
      />
    );
  }
  const view = result.data;
  // The ticket is read for names and its open approval; unreadable = shown without them.
  const ticket = await getRequest(view.requestId);
  const request = ticket.ok ? ticket.data : null;
  const openCase = request?.approvalCases?.find(
    (approval) => approval.status === "pending",
  );
  const viewerId = session?.user.id ?? "";

  return (
    <DisbursementDetailView
      view={view}
      viewer={{
        viewerId,
        isRequester: view.requesterId === viewerId,
        holdsTicket:
          view.ticket?.assigneeUserId === viewerId ||
          request?.receiverUserId === viewerId,
        canVerify: can(session, "disbursement.verify"),
        canPay: can(session, "disbursement.pay"),
        canDecide: can(session, "approval.decide"),
      }}
      source={{
        requestNo: request?.requestNo ?? null,
        status: request ? (messages.myWork.status[request.status] ?? request.status) : null,
        verifierName: view.verify?.by ?? null,
      }}
      requesterName={request?.requester?.displayName ?? null}
      nextActor={
        request?.assignee?.displayName ?? request?.receiver?.displayName ?? null
      }
      approvalCaseId={openCase?.id ?? null}
    />
  );
}
