"use client";

import { useState } from "react";
import { App, Button, Card, DatePicker, Input, Select, Space } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import type { Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { PricingExceptionsTable } from "./pricing-exceptions-table";

const m = messages.pricing.exceptions;

/** CD-205 — ทะเบียนข้อยกเว้นด้านราคา, filtered by kind, text and date. */
export function PricingExceptionsRegister({
  canManage,
}: {
  canManage: boolean;
}) {
  const { message } = App.useApp();
  const [kind, setKind] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);

  async function backfill() {
    setBusy(true);
    const result = await appApi<{ requests: number; rows: number }>(
      "pricing/exceptions/backfill",
      { method: "POST" },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.backfilled(result.data.requests, result.data.rows));
    setReloadKey(reloadKey + 1);
  }

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            {m.title}
          </Title>
          <Text type="secondary">{m.hint}</Text>
        </div>
        {canManage && (
          <Button loading={busy} onClick={() => void backfill()}>
            {m.backfill}
          </Button>
        )}
      </div>
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <Select<string>
            allowClear
            className="w-48"
            placeholder={m.allKinds}
            value={kind}
            onChange={setKind}
            options={Object.entries(m.kinds).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Input.Search
            allowClear
            className="w-80 max-w-full"
            placeholder={m.search}
            onSearch={(value) => setQ(value.trim())}
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(value) =>
              setRange(value as [Dayjs | null, Dayjs | null] | null)
            }
          />
        </div>
        <PricingExceptionsTable
          reloadKey={reloadKey}
          query={{
            kind,
            q: q || undefined,
            from: range?.[0]?.format("YYYY-MM-DD"),
            to: range?.[1]?.format("YYYY-MM-DD"),
          }}
        />
      </Card>
    </Space>
  );
}
