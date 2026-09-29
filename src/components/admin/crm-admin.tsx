"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { LetterheadSettings } from "@/components/admin/letterhead-settings";
import { adminApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ProductPicker } from "@/components/crm/quotations/product-picker";
import type {
  CrmConfig,
  KycProductRule,
  SegmentDimension,
  SegmentValue,
  TradeTermStandard,
  KycWatchlistEntry,
} from "@/lib/api/types";

const m = messages.customers.admin;

/**
 * ตั้งค่า CRM — the client half. Writes go to `/admin/crm/*`; every save is
 * followed by `router.refresh()` so the tables show what the database holds.
 */
export function CrmAdmin({
  dimensions,
  config,
  kycProducts,
  tradeTerms = [],
  kycWatchlist = [],
}: {
  dimensions: SegmentDimension[];
  config: CrmConfig;
  kycProducts: KycProductRule[];
  /** CD-79 — every standard term, inactive included. */
  tradeTerms?: TradeTermStandard[];
  /** CD-61 — the company's prohibited list (active entries). */
  kycWatchlist?: KycWatchlistEntry[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    setError(null);
    const result = await adminApi(`crm/${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    message.success(m.saved);
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      <SegmentSection dimensions={dimensions} onCall={call} />
      <KycProductSection rows={kycProducts} onCall={call} />
      <ConfigSection config={config} onCall={call} />
      <TradeTermsSection terms={tradeTerms} onCall={call} />
      <KycSection config={config} entries={kycWatchlist} onCall={call} />
      <LetterheadSettings config={config} onCall={call} />
    </div>
  );
}

function SegmentSection({
  dimensions,
  onCall,
}: {
  dimensions: SegmentDimension[];
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [newDimension, setNewDimension] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [newValue, setNewValue] = useState<{
    dimensionId: string;
    code: string;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveDimension() {
    if (!newDimension) return;
    setBusy(true);
    const done = await onCall("segment-dimensions", "POST", {
      code: newDimension.code.trim(),
      name_th: newDimension.name.trim(),
    });
    setBusy(false);
    if (done) setNewDimension(null);
  }

  async function saveValue() {
    if (!newValue) return;
    setBusy(true);
    const done = await onCall(
      `segment-dimensions/${newValue.dimensionId}/values`,
      "POST",
      { code: newValue.code.trim(), name_th: newValue.name.trim() },
    );
    setBusy(false);
    if (done) setNewValue(null);
  }

  return (
    <Card
      size="small"
      title={m.sectionSegments}
      extra={
        <Button
          size="small"
          onClick={() => setNewDimension({ code: "", name: "" })}
        >
          {m.addDimension}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {dimensions.map((dimension) => (
          <Card
            key={dimension.id}
            size="small"
            title={
              <Space size={6}>
                {dimension.nameTh}
                <Tag>{dimension.code}</Tag>
                {!dimension.active && <Tag color="red">{m.inactiveTag}</Tag>}
              </Space>
            }
            extra={
              <Space>
                <Switch
                  size="small"
                  checked={dimension.active}
                  onChange={(checked) =>
                    void onCall(`segment-dimensions/${dimension.id}`, "PATCH", {
                      active: checked,
                    })
                  }
                />
                <Button
                  size="small"
                  onClick={() =>
                    setNewValue({
                      dimensionId: dimension.id,
                      code: "",
                      name: "",
                    })
                  }
                >
                  {m.addValue}
                </Button>
              </Space>
            }
          >
            <Table<SegmentValue>
              rowKey="id"
              size="small"
              dataSource={dimension.values}
              pagination={false}
              showHeader={false}
              columns={[
                {
                  dataIndex: "nameTh",
                  render: (nameTh: string, value) => (
                    <Space size={4}>
                      {nameTh}
                      <Tag>{value.code}</Tag>
                      {!value.active && <Tag color="red">{m.inactiveTag}</Tag>}
                    </Space>
                  ),
                },
                {
                  key: "actions",
                  align: "right" as const,
                  render: (_: unknown, value) => (
                    <Space>
                      <Switch
                        size="small"
                        checked={value.active}
                        onChange={(checked) =>
                          void onCall(`segment-values/${value.id}`, "PATCH", {
                            active: checked,
                          })
                        }
                      />
                      <Popconfirm
                        title={m.deleteValueConfirm}
                        onConfirm={() =>
                          void onCall(`segment-values/${value.id}`, "DELETE")
                        }
                      >
                        <Button size="small" danger>
                          {messages.customers.form.removeLocation}
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        ))}
      </div>

      <Modal
        open={newDimension !== null}
        title={m.addDimension}
        okText={m.save}
        cancelText={messages.customers.form.cancel}
        confirmLoading={busy}
        okButtonProps={{
          disabled: !newDimension?.code.trim() || !newDimension?.name.trim(),
        }}
        onCancel={() => setNewDimension(null)}
        onOk={() => void saveDimension()}
        destroyOnHidden
      >
        <Space orientation="vertical" className="w-full">
          <Input
            placeholder={m.dimensionCode}
            value={newDimension?.code}
            onChange={(e) =>
              setNewDimension(
                (prev) => prev && { ...prev, code: e.target.value },
              )
            }
          />
          <Input
            placeholder={m.dimensionName}
            value={newDimension?.name}
            onChange={(e) =>
              setNewDimension(
                (prev) => prev && { ...prev, name: e.target.value },
              )
            }
          />
        </Space>
      </Modal>

      <Modal
        open={newValue !== null}
        title={m.addValue}
        okText={m.save}
        cancelText={messages.customers.form.cancel}
        confirmLoading={busy}
        okButtonProps={{
          disabled: !newValue?.code.trim() || !newValue?.name.trim(),
        }}
        onCancel={() => setNewValue(null)}
        onOk={() => void saveValue()}
        destroyOnHidden
      >
        <Space orientation="vertical" className="w-full">
          <Input
            placeholder={m.valueCode}
            value={newValue?.code}
            onChange={(e) =>
              setNewValue((prev) => prev && { ...prev, code: e.target.value })
            }
          />
          <Input
            placeholder={m.valueName}
            value={newValue?.name}
            onChange={(e) =>
              setNewValue((prev) => prev && { ...prev, name: e.target.value })
            }
          />
        </Space>
      </Modal>
    </Card>
  );
}

function ConfigSection({
  config,
  onCall,
}: {
  config: CrmConfig;
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [threshold, setThreshold] = useState(config.dedupThreshold);
  const [minMargin, setMinMargin] = useState(config.minMarginPct);
  const [validityDays, setValidityDays] = useState(
    config.quotationValidityDays,
  );
  const [vat, setVat] = useState(config.vatPct);
  const [approvalType, setApprovalType] = useState(
    config.quotationApprovalTypeCode,
  );
  const [targetType, setTargetType] = useState(
    config.targetApprovalTypeCode ?? "",
  );
  const [contractType, setContractType] = useState(
    config.contractRequestTypeCode ?? "",
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await onCall("config", "PATCH", {
      target_approval_type_code: targetType,
      contract_request_type_code: contractType,
      dedup_threshold: threshold,
      min_margin_pct: minMargin,
      quotation_validity_days: validityDays,
      vat_pct: vat,
      quotation_approval_type_code: approvalType || undefined,
    });
    setBusy(false);
  }

  return (
    <Card size="small" title={m.sectionConfig}>
      <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Text className="mb-1 block text-xs">{m.dedupThreshold}</Text>
          <InputNumber
            min={0.5}
            max={1}
            step={0.05}
            value={threshold}
            onChange={(value) => setThreshold(value ?? 0.85)}
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {/* CM-02 — รูปแบบรหัสลูกค้าย้ายไปอยู่ที่ run-number-service แล้ว */}
        <Text type="secondary" className="block text-xs">
          {m.codeFormatMoved}{" "}
          <Link href={ROUTES.adminRunNumbers}>{m.codeFormatLink}</Link>
        </Text>
        <Text type="secondary" className="block text-xs">
          {m.dedupThresholdHint}
        </Text>
      </div>

      {/* CD-76 — เกณฑ์ margin และค่าตั้งต้นของใบเสนอราคา */}
      <Text strong className="mt-5 block">
        {m.sectionQuotation}
      </Text>
      <div className="mt-2 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <Text className="mb-1 block text-xs">{m.minMarginPct}</Text>
          <InputNumber
            min={0}
            max={100}
            step={0.5}
            value={minMargin}
            onChange={(value) => setMinMargin(value ?? 15)}
            className="w-full"
          />
        </div>
        <div>
          <Text className="mb-1 block text-xs">{m.quotationValidityDays}</Text>
          <InputNumber
            min={1}
            max={365}
            value={validityDays}
            onChange={(value) => setValidityDays(value ?? 30)}
            className="w-full"
          />
        </div>
        <div>
          <Text className="mb-1 block text-xs">{m.vatPct}</Text>
          <InputNumber
            min={0}
            max={30}
            step={0.5}
            value={vat}
            onChange={(value) => setVat(value ?? 7)}
            className="w-full"
          />
        </div>
        <div>
          <Text className="mb-1 block text-xs">
            {m.quotationApprovalTypeCode}
          </Text>
          <Input
            value={approvalType}
            maxLength={20}
            onChange={(e) => setApprovalType(e.target.value.toUpperCase())}
          />
        </div>
      </div>
      <Text type="secondary" className="mt-2 block text-xs">
        {m.quotationHint}
      </Text>

      {/* CD-65 — เกณฑ์ดีลเงียบ ย้ายไปอยู่กับกติกาแจ้งเตือนอื่น (CD-53) */}
      <Text strong className="mt-5 block">
        {m.sectionFollowUp}
      </Text>
      <Text type="secondary" className="mt-2 block text-xs">
        {m.staleMoved}{" "}
        <Link href={ROUTES.adminNotificationRules}>{m.staleMovedLink}</Link>
      </Text>

      {/* CD-82 — ปรับเป้าของงวดที่เริ่มแล้วผ่านคำขออนุมัติ */}
      <Text strong className="mt-5 block">
        {m.sectionTargets}
      </Text>
      <div className="mt-2 max-w-xs">
        <Text className="mb-1 block text-xs">{m.targetApprovalTypeCode}</Text>
        <Input
          value={targetType}
          maxLength={20}
          allowClear
          onChange={(e) => setTargetType(e.target.value.toUpperCase())}
        />
      </div>
      <Text type="secondary" className="mt-2 block text-xs">
        {m.targetHint}
      </Text>

      {/* CD-81 — ประเภทคำขอที่ฝ่ายกฎหมายรับทำ/แก้สัญญา */}
      <Text strong className="mt-5 block">
        {m.sectionContracts}
      </Text>
      <div className="mt-2 max-w-xs">
        <Text className="mb-1 block text-xs">{m.contractRequestTypeCode}</Text>
        <Input
          value={contractType}
          maxLength={20}
          allowClear
          onChange={(e) => setContractType(e.target.value.toUpperCase())}
        />
      </div>
      <Text type="secondary" className="mt-2 block text-xs">
        {m.contractHint}
      </Text>

      <Button
        type="primary"
        className="mt-3"
        loading={busy}
        onClick={() => void save()}
      >
        {m.save}
      </Button>
    </Card>
  );
}

/**
 * CM-04 ชุดงาน B — product ที่ต้องยืนยันตัวตน. โครงพร้อมรับรายการจริงจาก
 * PO/การเงิน; ปิดใช้ด้วยสวิตช์ ไม่ลบ (ประวัติอยู่ครบ).
 */
function KycProductSection({
  rows,
  onCall,
}: {
  rows: KycProductRule[];
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function add() {
    if (!code.trim() || !name.trim()) return;
    const done = await onCall("kyc-products", "POST", {
      product_code: code.trim(),
      name: name.trim(),
    });
    if (done) {
      setCode("");
      setName("");
    }
  }

  return (
    <Card size="small" title={m.sectionKycProducts}>
      <Space orientation="vertical" size={10} className="w-full">
        <Text type="secondary" className="text-xs">
          {m.kycProductsHint}
        </Text>

        <Space.Compact className="w-full max-w-xl">
          <div className="min-w-56">
            <ProductPicker
              value={code}
              onPick={(product) => {
                setCode(product.code);
                // The rule's label defaults to the SAP name — still editable.
                if (!name.trim()) setName(product.name);
              }}
              onClear={() => setCode("")}
            />
          </div>
          <Input
            placeholder={m.kycProductName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="primary"
            disabled={!code.trim() || !name.trim()}
            onClick={() => void add()}
          >
            {m.addKycProduct}
          </Button>
        </Space.Compact>

        <Table<KycProductRule>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={rows}
          columns={[
            {
              title: m.kycColumns.code,
              dataIndex: "productCode",
              width: 220,
            },
            { title: m.kycColumns.name, dataIndex: "name" },
            {
              title: m.kycColumns.active,
              dataIndex: "active",
              width: 100,
              render: (active: boolean, row) => (
                <Switch
                  checked={active}
                  onChange={(next) =>
                    void onCall(`kyc-products/${row.id}`, "PATCH", {
                      active: next,
                    })
                  }
                />
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
}

/**
 * CD-79 — the company's standard trade terms. Saved as a whole list: a row
 * removed here is deactivated on the server, never deleted, because rounds
 * recorded against it keep their own copy of the standard.
 */
function TradeTermsSection({
  terms,
  onCall,
}: {
  terms: TradeTermStandard[];
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [rows, setRows] = useState(
    terms
      .filter((term) => term.active !== false)
      .map((term) => ({
        code: term.code,
        name: term.name,
        standard: term.standardValue,
      })),
  );
  const [busy, setBusy] = useState(false);

  function update(index: number, patch: Partial<(typeof rows)[number]>) {
    setRows((list) =>
      list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function save() {
    setBusy(true);
    await onCall("trade-terms", "PUT", {
      terms: rows
        .filter((row) => row.code.trim())
        .map((row) => ({
          code: row.code.trim(),
          name: row.name.trim(),
          standard_value: row.standard.trim(),
        })),
    });
    setBusy(false);
  }

  return (
    <Card size="small" title={m.sectionTradeTerms}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.tradeTermsHint}
      </Text>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <Input
              style={{ width: 130 }}
              placeholder={m.tradeTermCode}
              maxLength={40}
              value={row.code}
              onChange={(e) =>
                update(index, { code: e.target.value.toUpperCase() })
              }
            />
            <Input
              style={{ width: 220 }}
              placeholder={m.tradeTermName}
              maxLength={200}
              value={row.name}
              onChange={(e) => update(index, { name: e.target.value })}
            />
            <Input
              style={{ width: 200 }}
              placeholder={m.tradeTermStandard}
              maxLength={500}
              value={row.standard}
              onChange={(e) => update(index, { standard: e.target.value })}
            />
            <Button
              type="text"
              danger
              onClick={() =>
                setRows((list) => list.filter((_, i) => i !== index))
              }
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
      <Space className="mt-3">
        <Button
          size="small"
          onClick={() =>
            setRows((list) => [...list, { code: "", name: "", standard: "" }])
          }
        >
          {m.tradeTermAdd}
        </Button>
        <Button
          type="primary"
          size="small"
          loading={busy}
          onClick={() => void save()}
        >
          {m.tradeTermSave}
        </Button>
      </Space>
    </Card>
  );
}

/**
 * CD-61 — how long a KYC holds by risk, and the prohibited list screened at
 * every KYC. Entries are added by pasting lines (one per company) and removed
 * by deactivation — a KYC record keeps the entry it matched.
 */
function KycSection({
  config,
  entries,
  onCall,
}: {
  config: CrmConfig;
  entries: KycWatchlistEntry[];
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [months, setMonths] = useState({
    high: config.kycReviewMonthsHigh ?? 12,
    medium: config.kycReviewMonthsMedium ?? 24,
    low: config.kycReviewMonthsLow ?? 36,
  });
  const [pasted, setPasted] = useState("");
  const [lineError, setLineError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveMonths() {
    setBusy(true);
    await onCall("config", "PATCH", {
      kyc_review_months_high: months.high,
      kyc_review_months_medium: months.medium,
      kyc_review_months_low: months.low,
    });
    setBusy(false);
  }

  async function addPasted() {
    const lines = pasted
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const parsed: {
      name: string;
      tax_id?: string;
      reason: string;
      source?: string;
    }[] = [];
    for (const [index, line] of lines.entries()) {
      const [name, taxId, reason, source] = line
        .split("|")
        .map((part) => part.trim());
      if (!name || !reason) {
        setLineError(m.watchlistBadLine(index + 1));
        return;
      }
      parsed.push({
        name,
        ...(taxId ? { tax_id: taxId } : {}),
        reason,
        ...(source ? { source } : {}),
      });
    }
    if (!parsed.length) return;
    setLineError(null);
    setBusy(true);
    const done = await onCall("kyc-watchlist", "POST", { entries: parsed });
    setBusy(false);
    if (done) setPasted("");
  }

  return (
    <Card size="small" title={m.sectionKyc}>
      <Text strong className="block">
        {m.kycReviewMonths}
      </Text>
      <Space wrap className="mt-2">
        {(["high", "medium", "low"] as const).map((level) => (
          <span key={level} className="flex items-center gap-1">
            <Text className="text-xs">
              {messages.customers.kyc.riskLevels[level]}
            </Text>
            <InputNumber
              min={1}
              max={120}
              value={months[level]}
              onChange={(value) =>
                setMonths((current) => ({
                  ...current,
                  [level]: value ?? current[level],
                }))
              }
            />
          </span>
        ))}
        <Button size="small" loading={busy} onClick={() => void saveMonths()}>
          {m.kycSaveMonths}
        </Button>
      </Space>
      <Text type="secondary" className="mt-1 mb-4 block text-xs">
        {m.kycReviewHint}
      </Text>

      <Text strong className="block">
        {m.watchlistTitle} · {entries.length}
      </Text>
      <Text type="secondary" className="mb-2 block text-xs">
        {m.watchlistHint}
      </Text>
      {entries.length ? (
        <Table<KycWatchlistEntry>
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          dataSource={entries}
          columns={[
            { title: m.watchlistColumns.name, dataIndex: "name" },
            {
              title: m.watchlistColumns.taxId,
              dataIndex: "taxId",
              render: (v: string | null) => v ?? "—",
            },
            { title: m.watchlistColumns.reason, dataIndex: "reason" },
            {
              title: m.watchlistColumns.source,
              dataIndex: "source",
              render: (v: string | null) => v ?? "—",
            },
            {
              key: "actions",
              render: (_: unknown, row) => (
                <Popconfirm
                  title={m.watchlistDeactivate}
                  onConfirm={() =>
                    void onCall(`kyc-watchlist/${row.id}/deactivate`, "PATCH")
                  }
                >
                  <a>{m.watchlistDeactivate}</a>
                </Popconfirm>
              ),
            },
          ]}
        />
      ) : (
        <Text type="secondary" className="block text-xs">
          {m.watchlistEmpty}
        </Text>
      )}

      <Text className="mt-3 mb-1 block text-xs">{m.watchlistPaste}</Text>
      {lineError && (
        <Alert type="error" showIcon title={lineError} className="mb-2" />
      )}
      <Input.TextArea
        rows={3}
        value={pasted}
        placeholder={m.watchlistPastePlaceholder}
        onChange={(event) => setPasted(event.target.value)}
      />
      <Button
        className="mt-2"
        type="primary"
        size="small"
        loading={busy}
        disabled={!pasted.trim()}
        onClick={() => void addPasted()}
      >
        {m.watchlistAdd}
      </Button>
    </Card>
  );
}
