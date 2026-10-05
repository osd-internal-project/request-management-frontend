"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Input, InputNumber, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import type { LabourRateRow } from "@/lib/api/service";
import { messages } from "@/lib/messages";

const m = messages.service.assets.labourRates;

type Draft = Record<
  string,
  { hourlyRate: number | null; productCode: string; note: string }
>;

/** CD-243 — the service team's selling rate per work type. */
export function LabourRates({ canManage }: { readonly canManage: boolean }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<LabourRateRow[] | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function take(data: LabourRateRow[]) {
    setRows(data);
    setDraft(
      Object.fromEntries(
        data.map((row) => [
          row.workTypeId,
          {
            hourlyRate: row.hourlyRate,
            productCode: row.productCode ?? "",
            note: row.note ?? "",
          },
        ]),
      ),
    );
  }

  useEffect(() => {
    let live = true;
    void appApi<LabourRateRow[]>("service-labour-rates").then((result) => {
      if (!live) return;
      if (result.ok) take(result.data);
      else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, []);

  async function save(workTypeId: string) {
    const row = draft[workTypeId];
    if (row?.hourlyRate === null || row?.hourlyRate === undefined) return;
    setBusy(workTypeId);
    setError(null);
    const result = await appApi<LabourRateRow[]>("service-labour-rates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        work_type_id: workTypeId,
        hourly_rate: row.hourlyRate,
        product_code: row.productCode.trim() || null,
        note: row.note.trim() || null,
      }),
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    take(result.data);
  }

  const patch = (id: string, change: Partial<Draft[string]>) =>
    setDraft({ ...draft, [id]: { ...draft[id], ...change } });

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      <Table<LabourRateRow>
        rowKey="workTypeId"
        size="small"
        loading={rows === null}
        dataSource={rows ?? []}
        pagination={false}
        scroll={{ x: 800 }}
        columns={[
          {
            title: m.workType,
            render: (_: unknown, row) => `${row.code} · ${row.name}`,
          },
          {
            title: m.rate,
            width: 160,
            render: (_: unknown, row) =>
              canManage ? (
                <InputNumber
                  className="w-full"
                  min={0}
                  value={draft[row.workTypeId]?.hourlyRate}
                  onChange={(value) =>
                    patch(row.workTypeId, { hourlyRate: value })
                  }
                />
              ) : row.hourlyRate === null ? (
                <Tag>{m.notSet}</Tag>
              ) : (
                row.hourlyRate.toLocaleString("th-TH")
              ),
          },
          {
            title: m.product,
            width: 220,
            render: (_: unknown, row) =>
              canManage ? (
                <ProductPicker
                  value={draft[row.workTypeId]?.productCode ?? ""}
                  onPick={(product) =>
                    patch(row.workTypeId, { productCode: product.code })
                  }
                  onClear={() => patch(row.workTypeId, { productCode: "" })}
                />
              ) : (
                (row.productCode ?? "")
              ),
          },
          {
            title: m.note,
            render: (_: unknown, row) =>
              canManage ? (
                <Input
                  maxLength={200}
                  value={draft[row.workTypeId]?.note ?? ""}
                  onChange={(event) =>
                    patch(row.workTypeId, { note: event.target.value })
                  }
                />
              ) : (
                (row.note ?? "")
              ),
          },
          ...(canManage
            ? [
                {
                  title: "",
                  width: 90,
                  render: (_: unknown, row: LabourRateRow) => (
                    <Button
                      size="small"
                      type="primary"
                      loading={busy === row.workTypeId}
                      disabled={draft[row.workTypeId]?.hourlyRate == null}
                      onClick={() => void save(row.workTypeId)}
                    >
                      {m.save}
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
