"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Spin,
  Table,
  Tag,
  Upload,
} from "antd";
import { PaperClipOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { CampaignPlan, CampaignRow } from "@/lib/api/campaigns";
import { messages } from "@/lib/messages";

const m = messages.campaigns.planDrawer;

const baht = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface LineDraft {
  key: string;
  id?: string;
  channel: string;
  planned: number | null;
  note: string;
}

interface SpendDraft {
  spentOn: Dayjs | null;
  amount: number | null;
  lineId: string | null;
  vendor: string;
  note: string;
}

const emptySpend = (): SpendDraft => ({
  spentOn: dayjs(),
  amount: null,
  lineId: null,
  vendor: "",
  note: "",
});

/**
 * CD-268 — a campaign's plan: budget per channel against actual spend, the
 * spend log with its receipts. Totals come from the server; this only lays
 * them out. Spend is never deleted — it is voided with a reason.
 */
export function CampaignPlanDrawer({
  campaign,
  canManage,
  onClose,
}: {
  campaign: CampaignRow | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [linesDirty, setLinesDirty] = useState(false);
  const [spend, setSpend] = useState<SpendDraft | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = useCallback((next: CampaignPlan) => {
    setPlan(next);
    setLines(
      next.lines.map((line) => ({
        key: line.id,
        id: line.id,
        channel: line.channel,
        planned: line.planned,
        note: line.note ?? "",
      })),
    );
    setLinesDirty(false);
  }, []);

  useEffect(() => {
    if (!campaign) return;
    let live = true;
    void appApi<CampaignPlan>(`macom/campaigns/${campaign.id}/plan`).then(
      (result) => {
        if (!live) return;
        if (result.ok) {
          setError(null);
          show(result.data);
        } else setError(result.message);
      },
    );
    return () => {
      live = false;
    };
  }, [campaign, show]);

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const result = await appApi<
      CampaignPlan | { id: string; plan: CampaignPlan }
    >(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    show("plan" in result.data ? result.data.plan : result.data);
    message.success(m.saved);
    router.refresh();
    return true;
  }

  function saveLines() {
    if (!campaign) return;
    void call(`macom/campaigns/${campaign.id}/budget-lines`, {
      method: "PUT",
      body: JSON.stringify({
        lines: lines.map((line) => ({
          ...(line.id ? { id: line.id } : {}),
          channel: line.channel.trim(),
          planned: line.planned ?? 0,
          ...(line.note.trim() ? { note: line.note.trim() } : {}),
        })),
      }),
    });
  }

  async function addSpend() {
    if (!campaign || !spend) return;
    if (!spend.spentOn || !spend.amount) {
      setError(m.required);
      return;
    }
    const done = await call(`macom/campaigns/${campaign.id}/spends`, {
      method: "POST",
      body: JSON.stringify({
        spent_on: spend.spentOn.format("YYYY-MM-DD"),
        amount: spend.amount,
        ...(spend.lineId ? { budget_line_id: spend.lineId } : {}),
        ...(spend.vendor.trim() ? { vendor: spend.vendor.trim() } : {}),
        ...(spend.note.trim() ? { note: spend.note.trim() } : {}),
      }),
    });
    if (done) setSpend(null);
  }

  function attach(spendId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    void call(`macom/campaign-spends/${spendId}/receipt`, {
      method: "POST",
      body: form,
    });
  }

  function patchLine(key: string, patch: Partial<LineDraft>) {
    setLines((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
    setLinesDirty(true);
  }

  // the last campaign's plan stays in state until this one's arrives
  const current =
    plan && campaign && plan.campaign.id === campaign.id ? plan : null;
  const spentOf = new Map(current?.lines.map((line) => [line.id, line]) ?? []);
  const draftTotal = lines.reduce((sum, line) => sum + (line.planned ?? 0), 0);

  return (
    <Drawer
      open={campaign !== null}
      onClose={onClose}
      size={720}
      title={campaign ? m.title(campaign.code) : undefined}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      {!current ? (
        !error && <Spin />
      ) : (
        <div className="space-y-5">
          <Descriptions size="small" column={{ xs: 1, sm: 3 }} bordered>
            <Descriptions.Item label={m.planned}>
              {current.planned_total === null
                ? m.noPlan
                : baht(current.planned_total)}
            </Descriptions.Item>
            <Descriptions.Item label={m.spent}>
              <Text type={current.over_budget ? "danger" : undefined}>
                {baht(current.spent_total)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={m.remaining}>
              {current.remaining === null ? (
                "—"
              ) : (
                <Text type={current.remaining < 0 ? "danger" : undefined}>
                  {baht(current.remaining)}
                </Text>
              )}
            </Descriptions.Item>
          </Descriptions>
          {current.unassigned_spent > 0 && (
            <Text type="secondary" className="block text-xs">
              {m.unassigned(baht(current.unassigned_spent))}
            </Text>
          )}

          <section>
            <Text strong className="mb-2 block">
              {m.linesTitle}
            </Text>
            {lines.length === 0 && !canManage ? (
              <Empty description={m.noLines} />
            ) : (
              <Table<LineDraft>
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={lines}
                locale={{ emptyText: m.noLines }}
                scroll={{ x: true }}
                columns={[
                  {
                    title: m.channel,
                    dataIndex: "channel",
                    render: (value: string, row) =>
                      canManage ? (
                        <Input
                          value={value}
                          maxLength={100}
                          placeholder={m.channelPlaceholder}
                          onChange={(event) =>
                            patchLine(row.key, { channel: event.target.value })
                          }
                        />
                      ) : (
                        value
                      ),
                  },
                  {
                    title: m.linePlanned,
                    dataIndex: "planned",
                    align: "right",
                    render: (value: number | null, row) =>
                      canManage ? (
                        <InputNumber<number>
                          value={value}
                          min={0}
                          style={{ width: 140 }}
                          onChange={(next) =>
                            patchLine(row.key, { planned: next })
                          }
                        />
                      ) : (
                        baht(value ?? 0)
                      ),
                  },
                  {
                    title: m.lineSpent,
                    key: "spent",
                    align: "right",
                    render: (_: unknown, row) => {
                      const saved = row.id ? spentOf.get(row.id) : undefined;
                      if (!saved) return "—";
                      return (
                        <Text type={saved.over_budget ? "danger" : undefined}>
                          {baht(saved.spent)}
                        </Text>
                      );
                    },
                  },
                  {
                    title: m.lineNote,
                    dataIndex: "note",
                    render: (value: string, row) =>
                      canManage ? (
                        <Input
                          value={value}
                          maxLength={500}
                          onChange={(event) =>
                            patchLine(row.key, { note: event.target.value })
                          }
                        />
                      ) : (
                        value || "—"
                      ),
                  },
                  ...(canManage
                    ? [
                        {
                          key: "remove",
                          render: (_: unknown, row: LineDraft) => (
                            <a
                              onClick={() => {
                                setLines((rows) =>
                                  rows.filter((line) => line.key !== row.key),
                                );
                                setLinesDirty(true);
                              }}
                            >
                              ✕
                            </a>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            )}
            {canManage && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setLines((rows) => [
                      ...rows,
                      {
                        key: `new-${Date.now()}`,
                        channel: "",
                        planned: null,
                        note: "",
                      },
                    ]);
                    setLinesDirty(true);
                  }}
                >
                  {m.addLine}
                </Button>
                <Button
                  size="small"
                  type="primary"
                  disabled={!linesDirty}
                  loading={busy}
                  onClick={saveLines}
                >
                  {m.saveLines}
                </Button>
                {linesDirty && (
                  <Text type="secondary" className="text-xs">
                    {m.planned} {baht(draftTotal)}
                  </Text>
                )}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <Text strong>{m.spendsTitle}</Text>
              {canManage && !spend && (
                <Button size="small" onClick={() => setSpend(emptySpend())}>
                  {m.addSpend}
                </Button>
              )}
            </div>
            {spend && (
              <div className="mb-3 grid grid-cols-1 gap-2 rounded border border-gray-200 p-3 sm:grid-cols-2">
                <DatePicker
                  value={spend.spentOn}
                  placeholder={m.spentOn}
                  disabledDate={(day) => day.isAfter(dayjs(), "day")}
                  onChange={(value) => setSpend({ ...spend, spentOn: value })}
                />
                <InputNumber<number>
                  value={spend.amount}
                  min={0.01}
                  placeholder={m.amount}
                  style={{ width: "100%" }}
                  onChange={(value) => setSpend({ ...spend, amount: value })}
                />
                <Select
                  allowClear
                  value={spend.lineId ?? undefined}
                  placeholder={m.lineNone}
                  options={(current.lines ?? []).map((line) => ({
                    value: line.id,
                    label: line.channel,
                  }))}
                  onChange={(value?: string) =>
                    setSpend({ ...spend, lineId: value ?? null })
                  }
                />
                <Input
                  value={spend.vendor}
                  maxLength={255}
                  placeholder={m.vendor}
                  onChange={(event) =>
                    setSpend({ ...spend, vendor: event.target.value })
                  }
                />
                <Input
                  className="sm:col-span-2"
                  value={spend.note}
                  maxLength={1000}
                  placeholder={m.note}
                  onChange={(event) =>
                    setSpend({ ...spend, note: event.target.value })
                  }
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    type="primary"
                    size="small"
                    loading={busy}
                    onClick={() => void addSpend()}
                  >
                    {m.addSpend}
                  </Button>
                  <Button size="small" onClick={() => setSpend(null)}>
                    {m.cancel}
                  </Button>
                </div>
              </div>
            )}
            <Table<CampaignPlan["spends"][number]>
              rowKey="id"
              size="small"
              dataSource={current.spends}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
              locale={{ emptyText: m.noSpends }}
              scroll={{ x: true }}
              rowClassName={(row) => (row.voided ? "opacity-50" : "")}
              columns={[
                {
                  title: m.spentOn,
                  dataIndex: "spent_on",
                  render: (value: string) => dayjs(value).format("DD/MM/YY"),
                },
                {
                  title: m.amount,
                  dataIndex: "amount",
                  align: "right",
                  render: (value: number, row) =>
                    row.voided ? <s>{baht(value)}</s> : baht(value),
                },
                {
                  title: m.line,
                  key: "line",
                  render: (_: unknown, row) => row.budget_line?.channel ?? "—",
                },
                {
                  title: m.note,
                  key: "note",
                  render: (_: unknown, row) => (
                    <div className="text-xs">
                      {[row.vendor, row.note].filter(Boolean).join(" · ") ||
                        "—"}
                      {row.created_by && (
                        <div>
                          <Text type="secondary">
                            {m.recordedBy(row.created_by)}
                          </Text>
                        </div>
                      )}
                      {row.voided && (
                        <div>
                          <Tag color="default">
                            {m.voided(row.void_reason ?? "")}
                          </Tag>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  title: m.receipt,
                  key: "receipt",
                  render: (_: unknown, row) => (
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      {row.receipt_name && (
                        <a
                          href={`/api/app/macom/campaign-spends/${row.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <PaperClipOutlined /> {row.receipt_name}
                        </a>
                      )}
                      {canManage && !row.voided && (
                        <Upload
                          accept="application/pdf,image/jpeg,image/png"
                          showUploadList={false}
                          beforeUpload={(file) => {
                            attach(row.id, file);
                            return false;
                          }}
                        >
                          <a>
                            {row.receipt_name
                              ? m.replaceReceipt
                              : m.attachReceipt}
                          </a>
                        </Upload>
                      )}
                    </span>
                  ),
                },
                ...(canManage
                  ? [
                      {
                        key: "void",
                        render: (
                          _: unknown,
                          row: CampaignPlan["spends"][number],
                        ) =>
                          row.voided ? null : (
                            <Popconfirm
                              title={
                                <Input
                                  value={voidReason}
                                  maxLength={500}
                                  placeholder={m.voidReason}
                                  onChange={(event) =>
                                    setVoidReason(event.target.value)
                                  }
                                />
                              }
                              okButtonProps={{
                                disabled: !voidReason.trim(),
                              }}
                              onOpenChange={(open) => {
                                if (open) setVoidReason("");
                              }}
                              onConfirm={() =>
                                void call(
                                  `macom/campaign-spends/${row.id}/void`,
                                  {
                                    method: "POST",
                                    body: JSON.stringify({
                                      reason: voidReason.trim(),
                                    }),
                                  },
                                )
                              }
                            >
                              <a className="text-xs">{m.void}</a>
                            </Popconfirm>
                          ),
                      },
                    ]
                  : []),
              ]}
            />
          </section>
        </div>
      )}
    </Drawer>
  );
}
