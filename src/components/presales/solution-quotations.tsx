"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Space, Tag } from "antd";
import { FileAddOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { SolutionQuotation } from "@/lib/api/presales";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const mp = messages.presales.quotation;

/**
 * CD-198 — handoff 3: from a version "พร้อมส่ง Pricing", Pricing or the
 * deal's salesperson opens a draft quotation with the BOQ's costs and where
 * they came from. Asking again while one stands opens that one.
 */
export function SolutionQuotations({
  solutionId,
  readyVersionNo,
  quotations,
  canQuote,
}: {
  solutionId: string;
  /** The approved version whose estimate is complete, if any. */
  readyVersionNo: number | null;
  quotations: SolutionQuotation[];
  canQuote: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);

  if (!quotations.length && (!readyVersionNo || !canQuote)) return null;

  async function create() {
    if (!readyVersionNo) return;
    setBusy(true);
    const result = await appApi<{ id: string; existing: boolean }>(
      `presales/solutions/${solutionId}/versions/${readyVersionNo}/quotation`,
      { method: "POST" },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(result.data.existing ? mp.opened : mp.created);
    router.push(ROUTES.quotationDetail(result.data.id));
  }

  return (
    <Card size="small" title={mp.title}>
      <Space orientation="vertical" className="w-full">
        {readyVersionNo && canQuote && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              loading={busy}
              onClick={() => void create()}
            >
              {mp.create(readyVersionNo)}
            </Button>
            <Text type="secondary" className="text-xs">
              {mp.hint}
            </Text>
          </div>
        )}
        {!readyVersionNo && canQuote && (
          <Alert type="info" showIcon title={mp.notReady} />
        )}
        {quotations.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-2">
            <Link href={ROUTES.quotationDetail(row.id)}>
              {row.quotationNo} v{row.version}
            </Link>
            <Tag>{mp.fromVersion(row.solutionVersionNo ?? 0)}</Tag>
            <Tag>
              {(messages.sales.quotations.status as Record<string, string>)[
                row.status
              ] ?? row.status}
            </Tag>
          </div>
        ))}
      </Space>
    </Card>
  );
}
