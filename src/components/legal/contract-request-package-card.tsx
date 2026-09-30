"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ContractRequestPackage } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.requestPackage;

/**
 * CD-145 — on a contract request, for Legal: the terms agreed in the deal
 * and the approved Solution's scope of work, as captured when the request
 * was submitted — with a way to capture them again.
 */
export function ContractRequestPackageCard({
  requestId,
  view,
  canManage,
}: {
  readonly requestId: string;
  readonly view: ContractRequestPackage;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  if (!view.eligible) return null;
  const pack = view.package;

  async function refresh() {
    setBusy(true);
    const result = await appApi(
      `contract-requests/${requestId}/package/refresh`,
      { method: "POST" },
    );
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.refreshed);
    router.refresh();
  }

  const list = (title: string, items: string[]) =>
    items.length > 0 && (
      <div>
        <Text strong className="block text-sm">
          {title}
        </Text>
        <ol className="list-decimal pl-5 text-sm">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      </div>
    );

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        canManage && view.editable ? (
          <Button size="small" loading={busy} onClick={() => void refresh()}>
            {m.refresh}
          </Button>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {!pack ? (
        <Text type="secondary">{m.notCaptured}</Text>
      ) : (
        <div className="flex flex-col gap-3">
          <Text type="secondary" className="text-xs">
            {(pack.capturedOnSubmit ? m.capturedOnSubmit : m.capturedAgain)(
              dayjs(pack.capturedAt).format("D MMM YY HH:mm"),
            )}
          </Text>
          {pack.missing.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title={pack.missing.join(" · ")}
            />
          )}

          {pack.negotiationRoundNo !== null && (
            <div>
              <Text strong className="block text-sm">
                {m.terms(pack.negotiationRoundNo)}
              </Text>
              <div className="divide-y text-sm">
                {pack.tradeTerms.map((term, index) => (
                  <div key={index} className="flex flex-wrap gap-2 py-1">
                    <span className="min-w-32 font-medium">{term.name}</span>
                    <span>{term.agreed}</span>
                    {term.nonStandard && (
                      <Tag color="orange">{m.nonStandard}</Tag>
                    )}
                    {term.nonStandard && term.standard && (
                      <Text type="secondary" className="text-xs">
                        {m.standard(term.standard)}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pack.solution && (
            <div className="flex flex-col gap-2">
              <Link href={ROUTES.solutionDetail(pack.solution.id)}>
                {m.solution(
                  pack.solution.title ?? "",
                  pack.solution.versionNo ?? 0,
                )}
              </Link>
              {list(m.inScope, pack.inScope)}
              {list(m.outOfScope, pack.outOfScope)}
              {list(
                m.deliverables,
                pack.deliverables.map(
                  (item) =>
                    item.title +
                    (item.criteria?.length
                      ? ` — ${item.criteria.join("; ")}`
                      : ""),
                ),
              )}
              {pack.assumptionsText && (
                <div>
                  <Text strong className="block text-sm">
                    {m.assumptions}
                  </Text>
                  <Text className="text-sm whitespace-pre-line">
                    {pack.assumptionsText}
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
