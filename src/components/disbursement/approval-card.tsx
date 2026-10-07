"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Space } from "antd";
import { decideCase } from "@/lib/api/client-requests";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ReasonDialog, type ReasonAction } from "@/components/requests/reason-dialog";

const m = messages.disbursement.approval;

/**
 * Screens 2–3 and 4b: the head's and the executive's decision. Both live on
 * the request (the ticket); this card only lets the approver decide from here.
 */
export function ApprovalCard({
  title,
  requestId,
  caseId,
  waitingOn,
  canDecide,
}: {
  readonly title: string;
  readonly requestId: string;
  readonly caseId: string | null;
  readonly waitingOn: string | null;
  readonly canDecide: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [action, setAction] = useState<ReasonAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(note: string): Promise<boolean> {
    if (!caseId || !action) return false;
    setBusy(true);
    setError(null);
    const result = await decideCase(caseId, {
      decision: action as "approve" | "reject" | "return",
      note,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(m.decided);
    setAction(null);
    router.refresh();
    return true;
  }

  return (
    <Card title={title}>
      <Space direction="vertical" className="w-full">
        <Alert type="info" showIcon title={m.onRequest} />
        {waitingOn && (
          <div>
            {m.waitingOn}: <strong>{waitingOn}</strong>
          </div>
        )}
        {error && <Alert type="error" showIcon title={error} />}
        <Space wrap>
          {canDecide && caseId && (
            <>
              <Button type="primary" onClick={() => setAction("approve")}>
                {m.approve}
              </Button>
              <Button danger onClick={() => setAction("reject")}>
                {m.reject}
              </Button>
              <Button onClick={() => setAction("return")}>{m.sendBack}</Button>
            </>
          )}
          <Link href={ROUTES.requestDetail(requestId)}>
            {messages.disbursement.summary.openRequest}
          </Link>
        </Space>
      </Space>
      <ReasonDialog
        action={action}
        busy={busy}
        reasons={[]}
        returnToRequester={false}
        onCancel={() => setAction(null)}
        onConfirm={(note) => decide(note)}
      />
    </Card>
  );
}
