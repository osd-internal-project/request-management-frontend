"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Select } from "antd";
import { appApi } from "@/lib/api/client";
import type { ContractDraftView, DraftForRequest } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.drafts;

/**
 * CD-146 — on a contract request (and on the contract it became): open the
 * draft, or — for Legal, while the request is open — start it from a
 * template.
 */
export function ContractDraftCard({
  requestId,
  view,
  canManage,
}: {
  readonly requestId: string;
  readonly view: DraftForRequest;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [templateId, setTemplateId] = useState<string | undefined>(
    view.templates[0]?.id,
  );
  const [busy, setBusy] = useState(false);

  if (!view.eligible) return null;

  if (view.draft) {
    return (
      <Alert
        type="info"
        showIcon
        title={m.cardTitle}
        description={m.fromTemplate(
          view.draft.template.code,
          view.draft.template.name,
        )}
        action={
          <Link href={ROUTES.contractDraft(view.draft.id)}>
            <Button size="small" type="primary">
              {m.open(view.draft.latestVersionNo)}
            </Button>
          </Link>
        }
      />
    );
  }

  if (!canManage || !view.editable) return null;

  async function start() {
    if (!templateId) return;
    setBusy(true);
    const result = await appApi<ContractDraftView>("contract-drafts", {
      method: "POST",
      body: JSON.stringify({ request_id: requestId, template_id: templateId }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    router.push(ROUTES.contractDraft(result.data.id));
  }

  return (
    <Alert
      type="info"
      showIcon
      title={m.cardTitle}
      description={
        view.templates.length ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs">{m.startHint}</span>
            <Select
              className="min-w-60"
              size="small"
              aria-label={m.template}
              value={templateId}
              onChange={setTemplateId}
              options={view.templates.map((template) => ({
                value: template.id,
                label: `${template.code} · ${template.name}`,
              }))}
            />
            <Button
              size="small"
              type="primary"
              loading={busy}
              disabled={!templateId}
              onClick={() => void start()}
            >
              {m.start}
            </Button>
          </div>
        ) : (
          <Link href={ROUTES.contractTemplates}>{m.noTemplates}</Link>
        )
      }
    />
  );
}
