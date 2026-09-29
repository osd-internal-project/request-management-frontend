"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button } from "antd";
import { appApi } from "@/lib/api/client";
import type { SolutionDetail, SolutionForRequest } from "@/lib/api/presales";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const mp = messages.presales;

/**
 * CD-132 — on a "ขอ Solution" request, for Pre-Sales: start the design once
 * the request is accepted, or jump to the one already started.
 */
export function SolutionStartCard({
  view,
}: {
  view: SolutionForRequest & { requestId: string };
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);

  if (!view.is_solution_request) return null;

  async function start() {
    setBusy(true);
    const result = await appApi<SolutionDetail>("presales/solutions", {
      method: "POST",
      body: JSON.stringify({ request_id: view.requestId }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    router.push(ROUTES.solutionDetail(result.data.id));
  }

  if (view.solution) {
    return (
      <Alert
        type="info"
        showIcon
        title={mp.cardTitle}
        action={
          <Link href={ROUTES.solutionDetail(view.solution.id)}>
            <Button size="small" type="primary">
              {mp.open(view.solution.currentVersionNo)}
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      title={mp.startHint}
      action={
        view.can_start ? (
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() => void start()}
          >
            {mp.start}
          </Button>
        ) : null
      }
    />
  );
}
