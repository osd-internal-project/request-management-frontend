"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { formatMargin, QuotationStatusTags } from "@/components/crm/quotations/quotation-list";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { QuotationDetail, QuotationStatus } from "@/lib/api/types";

const mq = messages.sales.quotations;
const md = mq.detail;

/** One editable row — numbers as the inputs hold them, `key` for React only. */
interface DraftLine {
  key: string;
  productCode: string;
  description: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  unitCost: number | null;
  discountPct: number | null;
}

type ActionKind = "submit" | "accept" | "decline" | "cancel";

let lineSeq = 0;
function newKey(): string {
  lineSeq += 1;
  return `line-${lineSeq}`;
}

function toDraftLines(quotation: QuotationDetail): DraftLine[] {
  return quotation.lines.map((line) => ({
    key: line.id,
    productCode: line.productCode ?? "",
    description: line.description,
    quantity: Number(line.quantity),
    unit: line.unit ?? "",
    unitPrice: Number(line.unitPrice),
    unitCost: line.unitCost === undefined ? null : Number(line.unitCost),
    discountPct: Number(line.discountPct),
  }));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Preview only — the server recomputes in decimals on save and its numbers are
 * the ones stored. Shown so the person pricing sees the margin move as they type.
 */
function previewTotals(lines: DraftLine[], vatPct: number) {
  let subtotal = 0;
  let net = 0;
  let cost = 0;
  const lineTotals = lines.map((line) => {
    const quantity = line.quantity ?? 0;
    const gross = round2(quantity * (line.unitPrice ?? 0));
    const total = round2((gross * (100 - (line.discountPct ?? 0))) / 100);
    subtotal += gross;
    net += total;
    cost += round2(quantity * (line.unitCost ?? 0));
    return total;
  });
  const vat = round2((net * vatPct) / 100);
  const margin = net - cost;
  return {
    lineTotals,
    subtotal,
    discount: subtotal - net,
    net,
    vat,
    grand: net + vat,
    cost,
    margin,
    marginPct: net > 0 ? round2((margin / net) * 100) : null,
  };
}

const money = (value: number | string | null | undefined, currency: string) =>
  `${formatAmount(value ?? null)} ${currency}`;

/**
 * รายละเอียดใบเสนอราคา (CD-76) — แก้ร่างในหน้าเดียวกัน; ยื่นแล้วล็อก ต้องออกเวอร์ชันใหม่.
 *
 * ต้นทุน/margin มาจาก API เฉพาะผู้มีสิทธิ์ (SCOPE-04 ลบทิ้งที่ server). ถ้าไม่มีมา
 * คอลัมน์ต้นทุนหายไป **และแก้รายการไม่ได้** — การบันทึกรายการคือการแทนที่ทั้งชุด
 * และจะเขียนต้นทุนเป็นศูนย์ทับของเดิมที่คนแก้มองไม่เห็น.
 */
export function QuotationDetailView({
  quotation,
  canManage,
}: {
  quotation: QuotationDetail;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const status: QuotationStatus = quotation.status;
  const currency = quotation.currency;
  const costVisible = quotation.costTotal !== undefined;
  const isDraft = status === "draft";
  const canEditHeader = canManage && isDraft;
  const canEditLines = canEditHeader && costVisible;

  // --- draft state ---------------------------------------------------------
  const initial = useMemo(
    () => ({
      title: quotation.title,
      validUntil: quotation.validUntil,
      paymentTerms: quotation.paymentTerms ?? "",
      note: quotation.note ?? "",
      lines: toDraftLines(quotation),
    }),
    [quotation],
  );
  const [title, setTitle] = useState(initial.title);
  const [validUntil, setValidUntil] = useState<Dayjs | null>(
    initial.validUntil ? dayjs(initial.validUntil) : null,
  );
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms);
  const [note, setNote] = useState(initial.note);
  const [lines, setLines] = useState<DraftLine[]>(initial.lines);

  const dirty =
    canEditHeader &&
    (title !== initial.title ||
      (validUntil?.format("YYYY-MM-DD") ?? null) !==
        (initial.validUntil ? dayjs(initial.validUntil).format("YYYY-MM-DD") : null) ||
      paymentTerms !== initial.paymentTerms ||
      note !== initial.note ||
      JSON.stringify(lines) !== JSON.stringify(initial.lines));

  const preview = previewTotals(lines, Number(quotation.vatPct));

  // --- actions -------------------------------------------------------------
  const [action, setAction] = useState<ActionKind | null>(null);
  const [actionText, setActionText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function call<T>(path: string, body?: unknown) {
    setError(null);
    setBusy(true);
    const result = await appApi<T>(`quotations/${quotation.id}${path}`, {
      method: path ? "POST" : "PATCH",
      body: JSON.stringify(body ?? {}),
    });
    setBusy(false);
    return result;
  }

  async function save() {
    const linesInvalid = lines.some(
      (line) => !line.description.trim() || !line.quantity || line.unitPrice === null,
    );
    if (canEditLines && linesInvalid) {
      setError(md.noLines);
      return;
    }
    const result = await call("", {
      title: title.trim() || undefined,
      valid_until: validUntil ? validUntil.format("YYYY-MM-DD") : undefined,
      payment_terms: paymentTerms,
      note,
      ...(canEditLines
        ? {
            lines: lines.map((line) => ({
              product_code: line.productCode.trim() || undefined,
              description: line.description.trim(),
              quantity: line.quantity,
              unit: line.unit.trim() || undefined,
              unit_price: line.unitPrice,
              unit_cost: line.unitCost ?? 0,
              discount_pct: line.discountPct ?? 0,
            })),
          }
        : {}),
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.saved);
    router.refresh();
  }

  async function runAction() {
    if (!action) return;
    setActionError(null);
    const text = actionText.trim();
    const result = await call<QuotationDetail>(
      `/${action}`,
      action === "submit"
        ? { reason: text || undefined }
        : action === "accept"
          ? { note: text || undefined }
          : { reason: text },
    );
    if (!result.ok) {
      // In the dialog, not behind it — "margin below minimum, give a reason"
      // is answered right where the reason is typed.
      setActionError(result.message);
      return;
    }
    setAction(null);
    setActionText("");
    if (action === "submit") {
      message.success(
        result.data.status === "pending_approval" ? md.requestDrafted : md.approvedNow,
      );
    } else {
      message.success(
        action === "accept" ? md.accepted : action === "decline" ? md.declined : md.cancelled,
      );
    }
    router.refresh();
  }

  async function send() {
    const result = await call("/send");
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.sent);
    router.refresh();
  }

  async function revise() {
    const result = await call<QuotationDetail>("/revise");
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.revised(result.data.version));
    router.push(ROUTES.quotationDetail(result.data.id));
  }

  function openAction(kind: ActionKind) {
    setAction(kind);
    setActionText("");
    setActionError(null);
  }

  function patchLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  const revisable = ["pending_approval", "approved", "sent", "declined"].includes(status);
  const cancellable = ["draft", "pending_approval", "approved", "sent"].includes(status);

  const actionMeta: Record<
    ActionKind,
    { title: string; ok: string; placeholder: string; required: boolean; hint?: string }
  > = {
    submit: {
      title: md.submit,
      ok: md.submit,
      placeholder: md.reasonPlaceholder,
      required: false,
      hint: `${md.submitHint} · ${md.reasonHint}`,
    },
    accept: { title: md.acceptTitle, ok: md.accept, placeholder: md.acceptNote, required: false },
    decline: { title: md.declineTitle, ok: md.decline, placeholder: md.declineReason, required: true },
    cancel: { title: md.cancelTitle, ok: md.cancel, placeholder: md.cancelReason, required: true },
  };

  // --- render --------------------------------------------------------------
  const shown = canEditHeader
    ? preview
    : {
        lineTotals: quotation.lines.map((line) => Number(line.lineTotal)),
        subtotal: quotation.subtotal,
        discount: quotation.discountTotal,
        net: quotation.netTotal,
        vat: quotation.vatAmount,
        grand: quotation.grandTotal,
        cost: quotation.costTotal,
        margin: quotation.marginAmount,
        marginPct: quotation.marginPct,
      };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      {quotation.expired && <Alert type="error" showIcon title={md.expiredBanner} />}
      {status === "pending_approval" && (
        <Alert
          type="warning"
          showIcon
          title={md.pendingBanner}
          action={
            quotation.approvalRequest ? (
              <Link href={ROUTES.requestDetail(quotation.approvalRequest.id)}>
                <Button size="small" type="primary">
                  {md.openRequest(
                    quotation.approvalRequest.requestNo ?? md.requestDraftNo,
                  )}
                </Button>
              </Link>
            ) : undefined
          }
          description={
            quotation.approvalRequest
              ? md.requestStatus(
                  messages.myWork.status[quotation.approvalRequest.status] ??
                    quotation.approvalRequest.status,
                )
              : undefined
          }
        />
      )}
      {["approved", "sent", "declined"].includes(status) && (
        <Alert type="info" showIcon title={md.lockedBanner} />
      )}
      {status === "superseded" && <Alert type="info" showIcon title={md.supersededBanner} />}
      {status === "cancelled" && (
        <Alert type="warning" showIcon title={md.cancelledBanner(quotation.cancelReason ?? "")} />
      )}
      {status === "accepted" && (
        <Alert
          type="success"
          showIcon
          title={md.openSaleOrderHint}
          action={
            <Link href={ROUTES.opportunityDetail(quotation.opportunity.id)}>
              <Button size="small" type="primary">
                {md.goOpportunity}
              </Button>
            </Link>
          }
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={4} className="mb-1!">
            {quotation.quotationNo} {mq.version(quotation.version)} · {quotation.title}
          </Title>
          <QuotationStatusTags row={quotation} />
        </div>

        <Space wrap>
          {/* ฉบับพิมพ์ — ทุกคนที่อ่านได้; พิมพ์ของที่บันทึกแล้วเท่านั้น */}
          {dirty ? (
            // A disabled button inside a Link still follows the link.
            <Button icon={<PrinterOutlined />} disabled>
              {md.print}
            </Button>
          ) : (
            <Link href={ROUTES.quotationPrint(quotation.id)} target="_blank">
              <Button icon={<PrinterOutlined />}>{md.print}</Button>
            </Link>
          )}
          {canManage && (
          <>
            {isDraft && (
              <>
                <Button loading={busy} disabled={!dirty} onClick={() => void save()}>
                  {md.save}
                </Button>
                <Button
                  type="primary"
                  loading={busy}
                  onClick={() =>
                    dirty ? setError(md.submitDirtyFirst) : openAction("submit")
                  }
                >
                  {md.submit}
                </Button>
              </>
            )}
            {status === "approved" && (
              <Button type="primary" loading={busy} onClick={() => void send()}>
                {md.send}
              </Button>
            )}
            {status === "sent" && (
              <>
                <Button type="primary" onClick={() => openAction("accept")}>
                  {md.accept}
                </Button>
                <Button onClick={() => openAction("decline")}>{md.decline}</Button>
              </>
            )}
            {revisable && (
              <Popconfirm title={md.reviseConfirm} onConfirm={() => void revise()}>
                <Button loading={busy}>{md.revise}</Button>
              </Popconfirm>
            )}
            {cancellable && (
              <Button danger onClick={() => openAction("cancel")}>
                {md.cancel}
              </Button>
            )}
          </>
          )}
        </Space>
      </div>

      <Card size="small">
        <Descriptions
          size="small"
          column={{ xs: 1, md: 2 }}
          items={[
            {
              key: "opportunity",
              label: md.fromOpportunity,
              children: (
                <Link href={ROUTES.opportunityDetail(quotation.opportunity.id)}>
                  {quotation.opportunity.opportunityCode} · {quotation.opportunity.title}
                </Link>
              ),
            },
            {
              key: "party",
              label: md.party,
              children: quotation.customer ? (
                <Link href={ROUTES.customerDetail(quotation.customer.id)}>
                  {quotation.customer.customerCode} · {quotation.partyName}
                </Link>
              ) : (
                quotation.partyName
              ),
            },
            ...(quotation.partyTaxId
              ? [{ key: "tax", label: md.taxId, children: quotation.partyTaxId }]
              : []),
            ...(quotation.contactName
              ? [{ key: "contact", label: md.contact, children: quotation.contactName }]
              : []),
            {
              key: "title",
              label: md.title,
              children: canEditHeader ? (
                <Input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} />
              ) : (
                quotation.title
              ),
            },
            {
              key: "validUntil",
              label: md.validUntil,
              children: canEditHeader ? (
                <DatePicker
                  value={validUntil}
                  format="D MMM YYYY"
                  onChange={(value) => setValidUntil(value)}
                />
              ) : quotation.validUntil ? (
                dayjs(quotation.validUntil).format("D MMM YYYY")
              ) : (
                "—"
              ),
            },
            {
              key: "paymentTerms",
              label: md.paymentTerms,
              children: canEditHeader ? (
                <Input
                  value={paymentTerms}
                  maxLength={500}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              ) : (
                quotation.paymentTerms ?? "—"
              ),
            },
            {
              key: "note",
              label: md.note,
              children: canEditHeader ? (
                <Input.TextArea
                  rows={2}
                  value={note}
                  maxLength={4000}
                  onChange={(e) => setNote(e.target.value)}
                />
              ) : (
                quotation.note ?? "—"
              ),
            },
            ...(quotation.responseNote
              ? [{ key: "response", label: md.responseNote, children: quotation.responseNote }]
              : []),
          ]}
        />
      </Card>

      <Card
        size="small"
        title={`${md.linesTitle} · ${canEditHeader ? lines.length : quotation.lines.length}`}
        extra={
          canEditLines ? (
            <Button
              size="small"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  {
                    key: newKey(),
                    productCode: "",
                    description: "",
                    quantity: 1,
                    unit: "",
                    unitPrice: null,
                    unitCost: null,
                    discountPct: 0,
                  },
                ])
              }
            >
              {md.addLine}
            </Button>
          ) : undefined
        }
      >
        {canEditLines && (
          <Text type="secondary" className="mb-2 block text-xs">
            {md.costHint}
          </Text>
        )}
        <Table<DraftLine>
          size="small"
          rowKey="key"
          pagination={false}
          scroll={{ x: 1050 }}
          locale={{ emptyText: md.noLines }}
          dataSource={canEditHeader ? lines : toDraftLines(quotation)}
          columns={[
            {
              title: md.line.productCode,
              dataIndex: "productCode",
              width: 200,
              render: (value: string, row) =>
                canEditLines ? (
                  <ProductPicker
                    value={value}
                    onPick={(product) =>
                      patchLine(row.key, {
                        productCode: product.code,
                        // Fill only what the user has not written yet.
                        description: row.description || product.name,
                        unit: row.unit || (product.unit ?? ""),
                      })
                    }
                    onClear={() => patchLine(row.key, { productCode: "" })}
                  />
                ) : (
                  value || "—"
                ),
            },
            {
              title: md.line.description,
              dataIndex: "description",
              render: (value: string, row) =>
                canEditLines ? (
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    value={value}
                    maxLength={1000}
                    onChange={(e) => patchLine(row.key, { description: e.target.value })}
                  />
                ) : (
                  value
                ),
            },
            {
              title: md.line.quantity,
              dataIndex: "quantity",
              width: 100,
              align: "right" as const,
              render: (value: number | null, row) =>
                canEditLines ? (
                  <InputNumber
                    className="w-full"
                    min={0.001}
                    value={value}
                    onChange={(next) => patchLine(row.key, { quantity: next })}
                  />
                ) : (
                  formatAmount(value)
                ),
            },
            {
              title: md.line.unit,
              dataIndex: "unit",
              width: 90,
              render: (value: string, row) =>
                canEditLines ? (
                  <Input
                    value={value}
                    maxLength={30}
                    onChange={(e) => patchLine(row.key, { unit: e.target.value })}
                  />
                ) : (
                  value || "—"
                ),
            },
            {
              title: md.line.unitPrice,
              dataIndex: "unitPrice",
              width: 130,
              align: "right" as const,
              render: (value: number | null, row) =>
                canEditLines ? (
                  <InputNumber
                    className="w-full"
                    min={0}
                    value={value}
                    onChange={(next) => patchLine(row.key, { unitPrice: next })}
                  />
                ) : (
                  formatAmount(value)
                ),
            },
            ...(costVisible
              ? [
                  {
                    title: md.line.unitCost,
                    dataIndex: "unitCost",
                    width: 130,
                    align: "right" as const,
                    render: (value: number | null, row: DraftLine) =>
                      canEditLines ? (
                        <InputNumber
                          className="w-full"
                          min={0}
                          value={value}
                          onChange={(next) => patchLine(row.key, { unitCost: next })}
                        />
                      ) : (
                        formatAmount(value)
                      ),
                  },
                ]
              : []),
            {
              title: md.line.discountPct,
              dataIndex: "discountPct",
              width: 90,
              align: "right" as const,
              render: (value: number | null, row) =>
                canEditLines ? (
                  <InputNumber
                    className="w-full"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(next) => patchLine(row.key, { discountPct: next })}
                  />
                ) : (
                  formatAmount(value)
                ),
            },
            {
              title: md.line.lineTotal,
              key: "lineTotal",
              width: 130,
              align: "right" as const,
              render: (_: unknown, __: DraftLine, index: number) =>
                formatAmount(shown.lineTotals[index] ?? null),
            },
            ...(canEditLines
              ? [
                  {
                    title: "",
                    key: "remove",
                    width: 60,
                    render: (_: unknown, row: DraftLine) => (
                      <Button
                        size="small"
                        type="text"
                        danger
                        onClick={() =>
                          setLines((current) => current.filter((line) => line.key !== row.key))
                        }
                      >
                        {md.removeLine}
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
        />

        <div className="mt-3 flex justify-end">
          <div className="w-full max-w-sm space-y-1 text-sm">
            {dirty && (
              <Text type="secondary" className="block text-xs">
                {md.unsavedPreview}
              </Text>
            )}
            <Row label={md.totals.subtotal} value={money(shown.subtotal, currency)} />
            <Row label={md.totals.discount} value={money(shown.discount, currency)} />
            <Row label={md.totals.net} value={money(shown.net, currency)} strong />
            <Row
              label={md.totals.vat(String(Number(quotation.vatPct)))}
              value={money(shown.vat, currency)}
            />
            <Row label={md.totals.grand} value={money(shown.grand, currency)} strong />
            {costVisible && (
              <>
                <Row label={md.totals.cost} value={money(shown.cost, currency)} />
                <Row
                  label={md.totals.margin}
                  value={`${money(shown.margin, currency)} · ${formatMargin(shown.marginPct)}`}
                  strong
                />
                {quotation.minMarginPct !== null && (
                  <Text type="secondary" className="block text-right text-xs">
                    {md.totals.minMargin(String(Number(quotation.minMarginPct)))}
                  </Text>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {quotation.versions.length > 1 && (
        <Card size="small" title={md.versionsTitle}>
          <Space wrap>
            {quotation.versions.map((version) =>
              version.id === quotation.id ? (
                <Tag key={version.id} color="blue">
                  {mq.version(version.version)} · {mq.status[version.status]} · {md.current}
                </Tag>
              ) : (
                <Link key={version.id} href={ROUTES.quotationDetail(version.id)}>
                  <Tag>
                    {mq.version(version.version)} · {mq.status[version.status]} ·{" "}
                    {money(version.netTotal, currency)}
                  </Tag>
                </Link>
              ),
            )}
          </Space>
        </Card>
      )}

      {quotation.saleOrders.length > 0 && (
        <Card size="small" title={md.saleOrdersTitle}>
          <Space wrap>
            {quotation.saleOrders.map((order) => (
              <Tag key={order.id} color={order.status === "open" ? "green" : "red"}>
                {order.saleOrderCode}
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      <Modal
        open={action !== null}
        title={action ? actionMeta[action].title : ""}
        okText={action ? actionMeta[action].ok : ""}
        okButtonProps={{
          danger: action === "cancel",
          disabled: action ? actionMeta[action].required && !actionText.trim() : true,
        }}
        confirmLoading={busy}
        onCancel={() => setAction(null)}
        onOk={() => void runAction()}
        destroyOnHidden
      >
        {action && (
          <div className="space-y-2">
            {actionError && <Alert type="error" showIcon title={actionError} />}
            {actionMeta[action].hint && (
              <Text type="secondary" className="block text-xs">
                {actionMeta[action].hint}
              </Text>
            )}
            <Input.TextArea
              rows={3}
              placeholder={actionMeta[action].placeholder}
              value={actionText}
              maxLength={action === "cancel" ? 500 : 2000}
              onChange={(e) => setActionText(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <Text type="secondary">{label}</Text>
      <Text strong={strong}>{value}</Text>
    </div>
  );
}
