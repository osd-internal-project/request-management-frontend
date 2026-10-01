"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  chooseDiscount,
  type DiscountGroup,
  type QuotationApprovalImpact,
  type WorkTypeKey,
} from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.pricing.discount;
const workTypes = messages.sales.quotations.detail.workTypes;

type Caps = Partial<Record<WorkTypeKey, number>>;

function labelOf(key: WorkTypeKey) {
  return key === "none" ? m.none : (workTypes[key] ?? key);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function money(value: string | number) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pctText(value: string | number | null | undefined) {
  return value === null || value === undefined
    ? "—"
    : `${Number(value).toFixed(2)}%`;
}

/**
 * The same arithmetic the server does on choose: each line's discount held
 * to its work type's cap, net = gross × (1 − d), rounded per line.
 */
function previewGroups(
  view: QuotationApprovalImpact,
  caps: Caps,
): DiscountGroup[] {
  const sums = new Map<
    WorkTypeKey,
    { gross: number; net: number; cost: number }
  >();
  for (const line of view.lines) {
    const cap = caps[line.workType];
    const discount =
      cap === undefined ? line.discountPct : Math.min(line.discountPct, cap);
    const gross = Number(line.gross);
    const net = round2((gross * (100 - discount)) / 100);
    const sum = sums.get(line.workType) ?? { gross: 0, net: 0, cost: 0 };
    sum.gross += gross;
    sum.net += net;
    sum.cost += Number(line.cost ?? 0);
    sums.set(line.workType, sum);
  }
  return view.groups.map((group) => {
    const sum = sums.get(group.workType) ?? { gross: 0, net: 0, cost: 0 };
    const marginPct =
      sum.net > 0 ? round2(((sum.net - sum.cost) / sum.net) * 100) : null;
    return {
      ...group,
      net: String(sum.net),
      discountPct:
        sum.gross > 0
          ? String(round2(((sum.gross - sum.net) / sum.gross) * 100))
          : null,
      marginPct: marginPct === null ? null : String(marginPct),
      below: marginPct === null || marginPct < group.minMarginPct,
    };
  });
}

/**
 * CD-203 — บริหารส่วนลด on a price approval request: margin before and after
 * the discount per work type against its minimum, and — for the approver
 * deciding now — approving a smaller discount instead of only yes or no.
 */
export function DiscountImpactCard({
  view,
}: {
  view: QuotationApprovalImpact;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [caps, setCaps] = useState<Caps>({});
  const [pending, setPending] = useState<Caps | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const currency = view.quotation.currency;

  const customGroups = useMemo(
    () => (Object.keys(caps).length ? previewGroups(view, caps) : null),
    [view, caps],
  );

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    const result = await chooseDiscount(
      view.requestId,
      pending,
      note.trim() || undefined,
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.chosen);
    setPending(null);
    setCaps({});
    setNote("");
    router.refresh();
  }

  const capsText = (value: Caps) =>
    (Object.entries(value) as [WorkTypeKey, number][])
      .map(([key, cap]) => `${labelOf(key)} ≤ ${cap}%`)
      .join(", ");

  const columns = [
    {
      title: m.workType,
      key: "type",
      render: (_: unknown, row: DiscountGroup) => labelOf(row.workType),
    },
    {
      title: m.gross,
      dataIndex: "gross",
      align: "right" as const,
      render: (value: string) => money(value),
    },
    {
      title: m.discountPct,
      dataIndex: "discountPct",
      align: "right" as const,
      render: (value: string | null) => pctText(value),
    },
    {
      title: m.net,
      dataIndex: "net",
      align: "right" as const,
      render: (value: string) => money(value),
    },
    ...(view.costVisible
      ? [
          {
            title: m.marginBefore,
            dataIndex: "marginBeforePct",
            align: "right" as const,
            render: (value: string | null) => pctText(value),
          },
          {
            title: m.marginAfter,
            key: "after",
            align: "right" as const,
            render: (_: unknown, row: DiscountGroup) => (
              <span className={row.below ? "text-red-600" : undefined}>
                {pctText(row.marginPct)}
              </span>
            ),
          },
          {
            title: m.minMargin,
            dataIndex: "minMarginPct",
            align: "right" as const,
            render: (value: number) => `${value}%`,
          },
          {
            title: m.maxDiscount,
            dataIndex: "maxDiscountPct",
            align: "right" as const,
            render: (value: number | undefined) => pctText(value),
          },
        ]
      : []),
  ];

  return (
    <Card
      title={m.title(view.quotation.quotationNo, view.quotation.version)}
      extra={
        <Link href={ROUTES.quotationDetail(view.quotation.id)}>
          {m.openQuotation}
        </Link>
      }
    >
      <Space orientation="vertical" className="w-full" size="middle">
        {!view.costVisible && (
          <Alert type="info" showIcon title={m.costHidden} />
        )}
        {view.quotation.status !== "pending_approval" && (
          <Alert type="info" showIcon title={m.notPending} />
        )}
        <Table<DiscountGroup>
          rowKey="workType"
          size="small"
          pagination={false}
          scroll={{ x: 760 }}
          dataSource={view.groups}
          columns={columns}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>
                  {m.total} ({currency})
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                {money(view.totals.gross)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                {pctText(view.totals.discountPct)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                {money(view.totals.net)}
              </Table.Summary.Cell>
              {view.costVisible && (
                <>
                  <Table.Summary.Cell index={4} align="right">
                    {pctText(view.totals.marginBeforePct)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    {pctText(view.totals.marginPct)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} colSpan={2} />
                </>
              )}
            </Table.Summary.Row>
          )}
        />

        {view.costVisible &&
          (view.suggestion ? (
            <Card size="small" title={m.suggestionTitle}>
              <Space orientation="vertical" className="w-full">
                <Text>{m.suggestionCaps(capsText(view.suggestion.caps))}</Text>
                <Space wrap>
                  {view.suggestion.groups.map((group) => (
                    <Tag
                      key={group.workType}
                      color={group.below ? "red" : "green"}
                    >
                      {labelOf(group.workType)}: {pctText(group.marginPct)} (
                      {m.minMargin} {group.minMarginPct}%)
                    </Tag>
                  ))}
                </Space>
                <Text type="secondary">
                  {m.net} {money(view.suggestion.totals.net)} {currency} ·{" "}
                  {m.marginAfter} {pctText(view.suggestion.totals.marginPct)}
                </Text>
                {view.canChoose && (
                  <Button
                    type="primary"
                    onClick={() => setPending(view.suggestion!.caps)}
                  >
                    {m.chooseSuggestion}
                  </Button>
                )}
              </Space>
            </Card>
          ) : (
            <Text type="secondary">{m.noSuggestion}</Text>
          ))}

        {view.canChoose && (
          <Card size="small" title={m.customTitle}>
            <Text type="secondary" className="mb-2 block text-xs">
              {m.customHint}
            </Text>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {view.groups.map((group) => (
                <div key={group.workType}>
                  <Text type="secondary" className="block text-xs">
                    {labelOf(group.workType)} · {m.capOf}
                  </Text>
                  <InputNumber
                    className="w-full"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder={pctText(group.discountPct)}
                    value={caps[group.workType] ?? null}
                    onChange={(value) => {
                      const next = { ...caps };
                      if (value === null) delete next[group.workType];
                      else next[group.workType] = value;
                      setCaps(next);
                    }}
                  />
                </div>
              ))}
            </div>
            {customGroups && (
              <div className="mt-3">
                <Text strong className="block">
                  {m.preview}
                </Text>
                <Space wrap className="mt-1">
                  {customGroups.map((group) => (
                    <Tag
                      key={group.workType}
                      color={group.below ? "red" : "green"}
                    >
                      {labelOf(group.workType)}: {m.discountPct}{" "}
                      {pctText(group.discountPct)} · margin{" "}
                      {pctText(group.marginPct)} ({m.minMargin}{" "}
                      {group.minMarginPct}%)
                    </Tag>
                  ))}
                </Space>
                <div className="mt-2">
                  <Button onClick={() => setPending(caps)}>
                    {m.chooseCustom}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </Space>

      <Modal
        open={!!pending}
        title={m.confirmTitle}
        okButtonProps={{ loading: busy }}
        onOk={() => void confirm()}
        onCancel={() => setPending(null)}
        destroyOnHidden
      >
        <Space orientation="vertical" className="w-full">
          <Text>{m.confirmBody}</Text>
          {pending && <Text strong>{capsText(pending)}</Text>}
          <Input.TextArea
            rows={3}
            maxLength={1000}
            placeholder={m.notePlaceholder}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Space>
      </Modal>
    </Card>
  );
}
