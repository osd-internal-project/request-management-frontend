"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Space, Tag } from "antd";
import { appApi } from "@/lib/api/client";
import type { DisbursementDetail } from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { baht, STATUS_COLOR } from "./format";

const m = messages.disbursement;

/**
 * On an FI05 / FI06 request: the disbursement created from it, or — when the request is approved
 * but the automatic creation failed — the button accounting uses to create it.
 */
export function DisbursementPanel({
  requestNo,
  approved,
  canCreate,
}: {
  readonly requestNo: string;
  readonly approved: boolean;
  readonly canCreate: boolean;
}) {
  const [view, setView] = useState<DisbursementDetail | null | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<DisbursementDetail>(
      `disbursements/by-request/${encodeURIComponent(requestNo)}`,
    ).then((result) => {
      if (live) setView(result.ok ? result.data : null);
    });
    return () => {
      live = false;
    };
  }, [requestNo]);

  async function create() {
    setBusy(true);
    setError(null);
    const result = await appApi<DisbursementDetail>(
      `disbursements/from-request/${encodeURIComponent(requestNo)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: "{}",
      },
    );
    setBusy(false);
    if (result.ok) setView(result.data);
    else setError(result.message);
  }

  if (view === undefined) return null;

  if (!view) {
    // Nothing to show to someone who could not create it anyway.
    if (!approved || !canCreate) return null;
    return (
      <Card size="small" title={m.panel.title}>
        <Space direction="vertical" className="w-full">
          <Alert type="warning" showIcon title={m.panel.none} />
          {error && <Alert type="error" showIcon title={error} />}
          <Button type="primary" size="small" loading={busy} onClick={() => void create()}>
            {m.panel.create}
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Card size="small" title={m.panel.title}>
      <Space wrap>
        <strong>{view.docNo}</strong>
        <Tag color={STATUS_COLOR[view.status]}>{m.statuses[view.status]}</Tag>
        <span>{baht(view.requestedAmount)}</span>
        <Link href={ROUTES.disbursementDetail(view.docNo)}>
          <Button type="primary" size="small">
            {m.panel.open}
          </Button>
        </Link>
      </Space>
    </Card>
  );
}
