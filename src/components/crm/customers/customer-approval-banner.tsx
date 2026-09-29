"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Space } from "antd";
import { appApi } from "@/lib/api/client";
import type { CustomerApprovalView } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.customers.approval;
const requestStatus = messages.myWork.status as Record<string, string>;

/**
 * CD-62 — a new customer waiting for approval (or refused): nothing about
 * them goes to SAP yet. Links to the approval request, or raises a new draft
 * when there is none in flight.
 */
export function CustomerApprovalBanner({
  customerId,
  view,
}: {
  customerId: string;
  view: CustomerApprovalView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);

  if (view.status === "approved") return null;

  async function raise() {
    setBusy(true);
    const result = await appApi<CustomerApprovalView>(
      `customers/${customerId}/approval-request`,
      { method: "POST" },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.raised);
    router.refresh();
  }

  const request = view.request;
  const hint = !request
    ? m.noRequestHint
    : request.status === "draft"
      ? m.draftHint
      : m.inFlightHint(requestStatus[request.status] ?? request.status);

  return (
    <Alert
      type={view.status === "rejected" ? "error" : "warning"}
      showIcon
      title={view.status === "rejected" ? m.rejectedTitle : m.pendingTitle}
      description={hint}
      action={
        <Space orientation="vertical">
          {request && (
            <Link href={ROUTES.requestDetail(request.id)}>
              <Button size="small">{m.openRequest(request.requestNo)}</Button>
            </Link>
          )}
          {view.can_raise && (
            <Button
              size="small"
              type="primary"
              loading={busy}
              onClick={() => void raise()}
            >
              {m.raise}
            </Button>
          )}
        </Space>
      }
    />
  );
}
