"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { DraftApproval } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.approval;
const levels = messages.contracts.risk.levels;

/**
 * CD-159 — อนุมัติสัญญา: ask for the latest version to be approved (the
 * approval matrix routes it on value and risk), see where it stands, and
 * which approvals a later version voided.
 */
export function ContractApprovalCard({
  draftId,
  view,
  canManage,
}: {
  readonly draftId: string;
  readonly view: DraftApproval;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const current = view.current;

  async function ask() {
    setBusy(true);
    const result = await appApi(`contract-drafts/${draftId}/approval`, {
      method: "POST",
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.requested);
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={
        <span>
          {m.title}
          {view.approvedVersionNo !== null && (
            <Tag color="green" className="ml-2!">
              {m.approvedTag(view.approvedVersionNo)}
            </Tag>
          )}
        </span>
      }
      extra={
        canManage && view.canRequest ? (
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() => void ask()}
          >
            {current && current.versionNo === view.latestVersionNo
              ? m.requestAgain(view.latestVersionNo)
              : m.request(view.latestVersionNo)}
          </Button>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {!view.typeConfigured && (
        <Alert type="warning" showIcon className="mb-2" title={m.notConfigured} />
      )}
      {view.blockers.length > 0 && (
        <Alert
          type="info"
          showIcon
          className="mb-2"
          title={m.blockers}
          description={
            <ul className="list-disc pl-4">
              {view.blockers.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          }
        />
      )}

      {current && current.state && (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Text strong>{m.version(current.versionNo)}</Text>
            <Tag color={m.stateColor[current.state]}>
              {m.state[current.state]}
            </Tag>
            {current.riskLevel && (
              <Text type="secondary" className="text-xs">
                {m.risk(levels[current.riskLevel] ?? current.riskLevel)}
              </Text>
            )}
            {current.request && (
              <Link href={ROUTES.requestDetail(current.request.id)}>
                {current.request.requestNo ?? m.openRequest}
              </Link>
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {m.requestedBy(
              current.requestedByName,
              dayjs(current.requestedAt).format("D MMM YY HH:mm"),
            )}
          </Text>
          {current.error && (
            <Text type="danger" className="text-xs">
              {current.error}
            </Text>
          )}
        </div>
      )}

      {view.voided.length > 0 && (
        <div className="mt-3">
          <Text className="block text-xs">{m.voidedTitle}</Text>
          {view.voided.map((row) => (
            <Text key={row.id} type="secondary" delete className="block text-xs">
              {m.voided(row.versionNo, row.voidReason ?? "")}
            </Text>
          ))}
        </div>
      )}
    </Card>
  );
}
