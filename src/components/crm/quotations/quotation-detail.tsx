"use client";

import { useEffect, useMemo, useState } from "react";
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
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import { PrinterOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import {
  formatMargin,
  QuotationStatusTags,
} from "@/components/crm/quotations/quotation-list";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import { lookupPrices, suggestMarkup } from "@/lib/api/pricing/client";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  DealMargin,
  QuotationDetail,
  QuotationStatus,
} from "@/lib/api/types";
import { DealMarginLine } from "@/components/crm/quotations/deal-margin";

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
  /** CD-195 — the standard price the unit price came from; null = typed. */
  priceId: string | null;
  /** CD-196 — unit · lump_sum (quantity is 1) · monthly (× termMonths). */
  priceModel: PriceModel;
  termMonths: number | null;
  /** CD-198 — display only; the server keeps it while product and cost stand. */
  costSource: string | null;
  /** CD-200 — equipment · material · software · service. */
  workType: WorkType | null;
  /** CD-200 — the markup that priced the line; cleared by a hand edit. */
  markupPct: number | null;
}

type WorkType = "equipment" | "material" | "software" | "service";
const WORK_TYPES: WorkType[] = ["equipment", "material", "software", "service"];

type PriceModel = "unit" | "lump_sum" | "monthly";
const PRICE_MODELS: PriceModel[] = ["unit", "lump_sum", "monthly"];
/** A monthly line starts at a year — the usual service term. */
const DEFAULT_TERM_MONTHS = 12;

/** CD-196 — what the unit price is multiplied by (the server does the same). */
function billedQuantity(line: DraftLine): number {
  if (line.priceModel === "lump_sum") return 1;
  const quantity = line.quantity ?? 0;
  return line.priceModel === "monthly"
    ? quantity * (line.termMonths ?? 0)
    : quantity;
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
    priceId: line.priceId ?? null,
    priceModel: (line.priceModel ?? "unit") as PriceModel,
    termMonths: line.termMonths ?? null,
    costSource: line.costSource ?? null,
    workType: (line.workType ?? null) as WorkType | null,
    markupPct:
      line.markupPct === null || line.markupPct === undefined
        ? null
        : Number(line.markupPct),
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
  let monthly = 0;
  const lineCosts: number[] = [];
  const lineTotals = lines.map((line) => {
    const quantity = billedQuantity(line);
    const gross = round2(quantity * (line.unitPrice ?? 0));
    const total = round2((gross * (100 - (line.discountPct ?? 0))) / 100);
    subtotal += gross;
    net += total;
    const lineCost = round2(quantity * (line.unitCost ?? 0));
    lineCosts.push(lineCost);
    cost += lineCost;
    if (line.priceModel === "monthly" && line.termMonths) {
      monthly += round2(total / line.termMonths);
    }
    return total;
  });
  const vat = round2((net * vatPct) / 100);
  const margin = net - cost;
  return {
    lineTotals,
    lineCosts,
    subtotal,
    discount: subtotal - net,
    net,
    vat,
    grand: net + vat,
    cost,
    margin,
    marginPct: net > 0 ? round2((margin / net) * 100) : null,
    monthly,
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
  // CD-199 — the deal's margin and the company minimum (cost viewers only).
  const [dealMargin, setDealMargin] = useState<DealMargin | null>(null);
  useEffect(() => {
    if (!costVisible) return;
    void appApi<DealMargin>(
      `opportunities/${quotation.opportunityId}/margin`,
    ).then((result) => {
      if (result.ok) setDealMargin(result.data);
    });
  }, [costVisible, quotation.opportunityId, quotation.netTotal]);
  const minMargin = Number(
    quotation.minMarginPct ?? dealMargin?.minMarginPct ?? 0,
  );
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
        (initial.validUntil
          ? dayjs(initial.validUntil).format("YYYY-MM-DD")
          : null) ||
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
      (line) =>
        !line.description.trim() || !line.quantity || line.unitPrice === null,
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
              price_id: line.priceId ?? undefined,
              price_model: line.priceModel,
              work_type: line.workType ?? undefined,
              markup_pct: line.markupPct ?? undefined,
              term_months:
                line.priceModel === "monthly"
                  ? (line.termMonths ?? undefined)
                  : undefined,
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
      // CD-201 — the system files the request; one it could not submit is
      // left as a draft for the salesperson to finish.
      if (result.data.approvalRequest?.status === "draft") {
        message.warning(md.requestDrafted);
      } else {
        message.success(md.requestSubmitted);
      }
    } else {
      message.success(
        action === "accept"
          ? md.accepted
          : action === "decline"
            ? md.declined
            : md.cancelled,
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

  /**
   * CD-194 — the standard price in effect today, in this quotation's
   * currency, becomes the line's unit price. No price, no change.
   */
  /**
   * CD-200 — no standard or special price: offer cost × (1 + markup) from the
   * rule that applies to this product, work type and deal.
   */
  async function fillMarkupPrice(key: string, code: string) {
    const line = lines.find((row) => row.key === key);
    const cost = line?.unitCost ?? 0;
    if (!cost) return;
    const result = await suggestMarkup(
      [{ product_code: code, work_type: line?.workType ?? undefined }],
      quotation.opportunityId,
    );
    const markup = result.ok ? result.data[0] : null;
    if (!markup) return;
    const price = round2(cost * (1 + markup.markup_pct / 100));
    patchLine(key, {
      unitPrice: price,
      priceId: null,
      markupPct: markup.markup_pct,
    });
    void message.info(
      md.markupFilled(code, money(price, currency), markup.markup_pct),
    );
  }

  async function fillStandardPrice(key: string, code: string) {
    const result = await lookupPrices(
      [code],
      currency,
      quotation.opportunityId,
    );
    const found = result.ok ? result.data[code] : undefined;
    if (!found) {
      await fillMarkupPrice(key, code);
      return;
    }
    const model = (found.price_model ?? "unit") as PriceModel;
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              unitPrice: found.unit_price,
              priceId: found.price_id,
              priceModel: model,
              termMonths:
                model === "monthly"
                  ? (line.termMonths ?? DEFAULT_TERM_MONTHS)
                  : null,
            }
          : line,
      ),
    );
    void message.info(
      md.priceFilled(
        code,
        money(found.unit_price, found.currency),
        md.priceSources[found.scope] ?? "",
      ),
    );
  }

  function patchLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  const revisable = [
    "pending_approval",
    "approved",
    "sent",
    "declined",
  ].includes(status);
  const cancellable = [
    "draft",
    "pending_approval",
    "approved",
    "sent",
  ].includes(status);

  const actionMeta: Record<
    ActionKind,
    {
      title: string;
      ok: string;
      placeholder: string;
      required: boolean;
      hint?: string;
    }
  > = {
    submit: {
      title: md.submit,
      ok: md.submit,
      placeholder: md.reasonPlaceholder,
      required: false,
      hint: `${md.submitHint} · ${md.reasonHint}`,
    },
    accept: {
      title: md.acceptTitle,
      ok: md.accept,
      placeholder: md.acceptNote,
      required: false,
    },
    decline: {
      title: md.declineTitle,
      ok: md.decline,
      placeholder: md.declineReason,
      required: true,
    },
    cancel: {
      title: md.cancelTitle,
      ok: md.cancel,
      placeholder: md.cancelReason,
      required: true,
    },
  };

  // --- render --------------------------------------------------------------
  const shown = canEditHeader
    ? preview
    : {
        lineTotals: quotation.lines.map((line) => Number(line.lineTotal)),
        lineCosts: quotation.lines.map((line) => Number(line.lineCost ?? 0)),
        subtotal: quotation.subtotal,
        discount: quotation.discountTotal,
        net: quotation.netTotal,
        vat: quotation.vatAmount,
        grand: quotation.grandTotal,
        cost: quotation.costTotal,
        margin: quotation.marginAmount,
        marginPct: quotation.marginPct,
        monthly: Number(quotation.monthlyRecurring ?? 0),
      };

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      {quotation.expired && (
        <Alert type="error" showIcon title={md.expiredBanner} />
      )}
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
      {status === "superseded" && (
        <Alert type="info" showIcon title={md.supersededBanner} />
      )}
      {status === "cancelled" && (
        <Alert
          type="warning"
          showIcon
          title={md.cancelledBanner(quotation.cancelReason ?? "")}
        />
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
            {quotation.quotationNo} {mq.version(quotation.version)} ·{" "}
            {quotation.title}
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
                  <Button
                    loading={busy}
                    disabled={!dirty}
                    onClick={() => void save()}
                  >
                    {md.save}
                  </Button>
                  <Button
                    type="primary"
                    loading={busy}
                    onClick={() =>
                      dirty
                        ? setError(md.submitDirtyFirst)
                        : openAction("submit")
                    }
                  >
                    {md.submit}
                  </Button>
                </>
              )}
              {status === "approved" && (
                <Button
                  type="primary"
                  loading={busy}
                  onClick={() => void send()}
                >
                  {md.send}
                </Button>
              )}
              {status === "sent" && (
                <>
                  <Button type="primary" onClick={() => openAction("accept")}>
                    {md.accept}
                  </Button>
                  <Button onClick={() => openAction("decline")}>
                    {md.decline}
                  </Button>
                </>
              )}
              {revisable && (
                <Popconfirm
                  title={md.reviseConfirm}
                  onConfirm={() => void revise()}
                >
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
                  {quotation.opportunity.opportunityCode} ·{" "}
                  {quotation.opportunity.title}
                </Link>
              ),
            },
            // CD-198 — started from a Solution version (handoff 3).
            ...(quotation.solutionId
              ? [
                  {
                    key: "solution",
                    label: md.fromSolution,
                    children: (
                      <Link
                        href={`${ROUTES.solutionDetail(quotation.solutionId)}?v=${quotation.solutionVersionNo ?? ""}`}
                      >
                        {md.solutionVersion(quotation.solutionVersionNo ?? 0)}
                      </Link>
                    ),
                  },
                ]
              : []),
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
              ? [
                  {
                    key: "tax",
                    label: md.taxId,
                    children: quotation.partyTaxId,
                  },
                ]
              : []),
            ...(quotation.contactName
              ? [
                  {
                    key: "contact",
                    label: md.contact,
                    children: quotation.contactName,
                  },
                ]
              : []),
            {
              key: "title",
              label: md.title,
              children: canEditHeader ? (
                <Input
                  value={title}
                  maxLength={255}
                  onChange={(e) => setTitle(e.target.value)}
                />
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
                (quotation.paymentTerms ?? "—")
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
                (quotation.note ?? "—")
              ),
            },
            ...(quotation.responseNote
              ? [
                  {
                    key: "response",
                    label: md.responseNote,
                    children: quotation.responseNote,
                  },
                ]
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
                    priceId: null,
                    priceModel: "unit",
                    termMonths: null,
                    costSource: null,
                    workType: null,
                    markupPct: null,
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
          // Fixed: a long picked product name must not squeeze the description.
          tableLayout="fixed"
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
                    onPick={(product) => {
                      patchLine(row.key, {
                        productCode: product.code,
                        // Fill only what the user has not written yet.
                        description: row.description || product.name,
                        unit: row.unit || (product.unit ?? ""),
                        priceId: null,
                      });
                      void fillStandardPrice(row.key, product.code);
                    }}
                    onClear={() =>
                      patchLine(row.key, { productCode: "", priceId: null })
                    }
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
                    onChange={(e) =>
                      patchLine(row.key, { description: e.target.value })
                    }
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
                    // CD-196 — a lump sum is one job.
                    disabled={row.priceModel === "lump_sum"}
                    value={row.priceModel === "lump_sum" ? 1 : value}
                    onChange={(next) => patchLine(row.key, { quantity: next })}
                  />
                ) : (
                  formatAmount(value)
                ),
            },
            {
              title: md.line.priceModel,
              dataIndex: "priceModel",
              width: 250,
              render: (value: PriceModel, row) =>
                canEditLines ? (
                  <div className="flex flex-wrap gap-1">
                    <Select<PriceModel>
                      className="min-w-24 flex-1"
                      value={value}
                      onChange={(model) =>
                        patchLine(row.key, {
                          priceModel: model,
                          priceId: null,
                          quantity: model === "lump_sum" ? 1 : row.quantity,
                          termMonths:
                            model === "monthly"
                              ? (row.termMonths ?? DEFAULT_TERM_MONTHS)
                              : null,
                        })
                      }
                      options={PRICE_MODELS.map((model) => ({
                        value: model,
                        label: md.priceModels[model],
                      }))}
                    />
                    {value === "monthly" && (
                      <InputNumber
                        className="w-16"
                        min={1}
                        max={120}
                        precision={0}
                        aria-label={md.line.termMonths}
                        title={md.line.termMonths}
                        value={row.termMonths}
                        onChange={(next) =>
                          patchLine(row.key, { termMonths: next })
                        }
                      />
                    )}
                    <Select<WorkType>
                      className="min-w-24"
                      allowClear
                      placeholder={md.line.workType}
                      value={row.workType ?? undefined}
                      onChange={(type) =>
                        patchLine(row.key, { workType: type ?? null })
                      }
                      options={WORK_TYPES.map((type) => ({
                        value: type,
                        label: md.workTypes[type],
                      }))}
                    />
                  </div>
                ) : value === "monthly" ? (
                  md.monthlyTerm(row.termMonths ?? 0)
                ) : (
                  md.priceModels[value]
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
                    onChange={(e) =>
                      patchLine(row.key, { unit: e.target.value })
                    }
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
                    onChange={(next) =>
                      // A price typed by hand no longer is the standard one.
                      patchLine(row.key, {
                        unitPrice: next,
                        priceId: null,
                        markupPct: null,
                      })
                    }
                  />
                ) : (
                  <>
                    {formatAmount(value)}
                    {row.markupPct !== null && (
                      <div className="text-[11px] text-gray-500">
                        {md.fromMarkup(row.markupPct)}
                      </div>
                    )}
                  </>
                ),
            },
            ...(costVisible
              ? [
                  {
                    title: md.line.unitCost,
                    dataIndex: "unitCost",
                    width: 130,
                    align: "right" as const,
                    render: (value: number | null, row: DraftLine) => (
                      <>
                        {canEditLines ? (
                          <InputNumber
                            className="w-full"
                            min={0}
                            value={value}
                            onChange={(next) =>
                              // CD-200 — a new cost no longer is what the markup priced.
                              patchLine(row.key, {
                                unitCost: next,
                                markupPct: null,
                              })
                            }
                          />
                        ) : (
                          formatAmount(value)
                        )}
                        {/* CD-198 — where the cost came from (from a Solution). */}
                        {row.costSource && (
                          <div className="text-[11px] text-gray-500">
                            {row.costSource}
                          </div>
                        )}
                      </>
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
                    onChange={(next) =>
                      patchLine(row.key, { discountPct: next })
                    }
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
            // CD-199 — each line's margin, live, red under the minimum.
            ...(costVisible
              ? [
                  {
                    title: md.line.margin,
                    key: "margin",
                    width: 130,
                    align: "right" as const,
                    render: (_: unknown, __: DraftLine, index: number) => {
                      const total = shown.lineTotals[index] ?? 0;
                      const amount = round2(
                        total - (shown.lineCosts[index] ?? 0),
                      );
                      const pct =
                        total > 0 ? round2((amount / total) * 100) : null;
                      const low = pct === null || pct < minMargin;
                      return (
                        <div className={low ? "text-red-600" : undefined}>
                          <div>{formatAmount(amount)}</div>
                          <div className="text-[11px]">
                            {pct === null ? "—" : `${pct.toFixed(2)}%`}
                          </div>
                        </div>
                      );
                    },
                  },
                ]
              : []),
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
                          setLines((current) =>
                            current.filter((line) => line.key !== row.key),
                          )
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
            <Row
              label={md.totals.subtotal}
              value={money(shown.subtotal, currency)}
            />
            <Row
              label={md.totals.discount}
              value={money(shown.discount, currency)}
            />
            <Row
              label={md.totals.net}
              value={money(shown.net, currency)}
              strong
            />
            <Row
              label={md.totals.vat(String(Number(quotation.vatPct)))}
              value={money(shown.vat, currency)}
            />
            <Row
              label={md.totals.grand}
              value={money(shown.grand, currency)}
              strong
            />
            {shown.monthly > 0 && (
              <Row
                label={md.totals.monthly}
                value={money(shown.monthly, currency)}
              />
            )}
            {costVisible && (
              <>
                <Row
                  label={md.totals.cost}
                  value={money(shown.cost, currency)}
                />
                <Row
                  label={md.totals.margin}
                  value={`${money(shown.margin, currency)} · ${formatMargin(shown.marginPct)}`}
                  strong
                />
                {quotation.minMarginPct !== null && (
                  <Text type="secondary" className="block text-right text-xs">
                    {md.totals.minMargin(
                      String(Number(quotation.minMarginPct)),
                    )}
                  </Text>
                )}
                {/* CD-199 — the deal as a whole, saved versions only. */}
                {dealMargin && dealMargin.quotations.length > 0 && (
                  <div className="mt-2">
                    <DealMarginLine margin={dealMargin} />
                  </div>
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
                  {mq.version(version.version)} · {mq.status[version.status]} ·{" "}
                  {md.current}
                </Tag>
              ) : (
                <Link
                  key={version.id}
                  href={ROUTES.quotationDetail(version.id)}
                >
                  <Tag>
                    {mq.version(version.version)} · {mq.status[version.status]}{" "}
                    · {money(version.netTotal, currency)}
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
              <Tag
                key={order.id}
                color={order.status === "open" ? "green" : "red"}
              >
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
          disabled: action
            ? actionMeta[action].required && !actionText.trim()
            : true,
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

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <Text type="secondary">{label}</Text>
      <Text strong={strong}>{value}</Text>
    </div>
  );
}
