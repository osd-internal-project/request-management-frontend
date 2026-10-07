"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { appApi } from "@/lib/api/client";
import type { DisbursementDetail, TicketMove } from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";

const m = messages.disbursement;

/** Posts one action under a fresh `Idempotency-Key`, reports a ticket left behind, refreshes. */
export function useDisbursementAction(docNo: string) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    const result = await appApi<DisbursementDetail & { ticketMove?: TicketMove | null }>(
      `disbursements/${encodeURIComponent(docNo)}/${action}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    const move = result.data.ticketMove;
    if (move && !move.moved && move.message) {
      message.warning(m.ticketNotMoved(move.message));
    } else {
      message.success(m.saved);
    }
    router.refresh();
    return true;
  }

  return { run, busy, error };
}
