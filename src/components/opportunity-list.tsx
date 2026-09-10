"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { SearchSelect } from "@/components/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { CustomerRow, OpportunityRow } from "@/lib/api/types";

const m = messages.sales.opportunities;

export function formatAmount(amount: OpportunityRow["amount"]): string {
  if (amount === null || amount === undefined) return "—";
  return Number(amount).toLocaleString("th-TH");
}

/**
 * ลูกค้า หรือ ผู้มุ่งหวัง ของโอกาสการขาย — PO 10 ก.ย. 2569: การเปิดโอกาสการขาย
 * ยังไม่ถือเป็นลูกค้า จึงมีสองหน้าตา: ลิงก์ไปทะเบียนลูกค้า หรือชื่อผู้มุ่งหวัง
 * พร้อมป้าย "ยังไม่เป็นลูกค้า".
 */
export function OpportunityParty({
  row,
}: {
  row: Pick<OpportunityRow, "customer" | "prospectName">;
}) {
  if (row.customer) {
    return (
      <Link href={ROUTES.customerDetail(row.customer.id)}>
        {row.customer.nameTh}
      </Link>
    );
  }
  return (
    <Space size={6} wrap>
      <span>{row.prospectName ?? "—"}</span>
      <Tag color="orange">{m.prospectTag}</Tag>
    </Space>
  );
}

type PartyMode = "prospect" | "existing";

/** ทะเบียนโอกาสการขาย — ตาราง+ฟิลเตอร์ตามขั้น และเปิดโอกาสการขายใหม่. */
export function OpportunityList({
  rows,
  total,
  page,
  pageSize,
  filters,
  customers,
  canManage,
}: {
  rows: OpportunityRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { search?: string; stage?: string; mineOnly: boolean };
  customers: CustomerRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  // ค่าตั้งต้น = ผู้มุ่งหวัง: ทางปกติของ PO (ลูกค้าเกิดตอนเปิดใบสั่งขาย)
  const [partyMode, setPartyMode] = useState<PartyMode>("prospect");
  const [customerId, setCustomerId] = useState<string>();
  const [prospectName, setProspectName] = useState("");
  const [prospectTaxId, setProspectTaxId] = useState("");
  const [prospectContact, setProspectContact] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [expectedClose, setExpectedClose] = useState<string | null>(null);
  const [productCodes, setProductCodes] = useState<string[]>([]);

  const partyReady =
    partyMode === "existing" ? Boolean(customerId) : Boolean(prospectName.trim());

  function applyFilters(next: Partial<typeof filters>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    if (merged.search) params.set("search", merged.search);
    if (merged.stage) params.set("stage", merged.stage);
    if (merged.mineOnly) params.set("view", "mine");
    router.push(`${ROUTES.opportunities}?${params.toString()}`);
  }

  async function create() {
    if (!partyReady || !title.trim()) return;
    setBusy(true);
    setError(null);

    const party =
      partyMode === "existing"
        ? { customer_id: customerId }
        : {
            prospect_name: prospectName.trim(),
            prospect_tax_id: prospectTaxId.trim() || undefined,
            prospect_contact_name: prospectContact.trim() || undefined,
            prospect_phone: prospectPhone.trim() || undefined,
            prospect_email: prospectEmail.trim() || undefined,
          };

    const result = await appApi<{ id: string; opportunityCode: string }>("opportunities", {
      method: "POST",
      body: JSON.stringify({
        ...party,
        title: title.trim(),
        amount: amount ?? undefined,
        expected_close_at: expectedClose ?? undefined,
        product_codes: productCodes.length ? productCodes : undefined,
      }),
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.form.created(result.data.opportunityCode));
    setCreating(false);
    router.push(ROUTES.opportunityDetail(result.data.id));
  }

  return (
    <div className="space-y-3">
      {error && <Alert type="error" showIcon title={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          className="max-w-xs"
          defaultValue={filters.search}
          placeholder={m.searchPlaceholder}
          allowClear
          onSearch={(value) => applyFilters({ search: value || undefined })}
        />
        <SearchSelect
          className="min-w-40"
          allowClear
          placeholder={m.filterStage}
          value={filters.stage}
          onChange={(value) =>
            applyFilters({ stage: (value as string) || undefined })
          }
          options={Object.entries(m.stage).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Checkbox
          checked={filters.mineOnly}
          onChange={(event) => applyFilters({ mineOnly: event.target.checked })}
        >
          {m.mineOnly}
        </Checkbox>
        <div className="grow" />
        {canManage && (
          <Button type="primary" onClick={() => setCreating(true)}>
            {m.newOpportunity}
          </Button>
        )}
      </div>

      <Table<OpportunityRow>
        size="small"
        rowKey="id"
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: page,
          pageSize,
          total,
          hideOnSinglePage: true,
          onChange: (next) => {
            const params = new URLSearchParams();
            if (filters.search) params.set("search", filters.search);
            if (filters.stage) params.set("stage", filters.stage);
            if (filters.mineOnly) params.set("view", "mine");
            params.set("page", String(next));
            router.push(`${ROUTES.opportunities}?${params.toString()}`);
          },
        }}
        columns={[
          {
            title: m.columns.code,
            dataIndex: "opportunityCode",
            width: 150,
            render: (code: string, row) => (
              <Link href={ROUTES.opportunityDetail(row.id)}>{code}</Link>
            ),
          },
          { title: m.columns.title, dataIndex: "title" },
          {
            title: m.columns.customer,
            key: "party",
            render: (_: unknown, row) => <OpportunityParty row={row} />,
          },
          {
            title: m.columns.stage,
            dataIndex: "stage",
            width: 110,
            render: (stage: string) => (
              <Tag color={m.stageColor[stage]}>{m.stage[stage] ?? stage}</Tag>
            ),
          },
          {
            title: m.columns.amount,
            dataIndex: "amount",
            width: 130,
            align: "right" as const,
            render: (amount: OpportunityRow["amount"]) => formatAmount(amount),
          },
          {
            title: m.columns.expectedClose,
            dataIndex: "expectedCloseAt",
            width: 120,
            render: (at: string | null) =>
              at ? dayjs(at).format("D MMM YY") : "—",
          },
        ]}
      />

      <Modal
        open={creating}
        title={m.newOpportunity}
        okText={m.form.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !partyReady || !title.trim() }}
        onCancel={() => setCreating(false)}
        onOk={() => void create()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Segmented<PartyMode>
            block
            value={partyMode}
            onChange={(value) => setPartyMode(value)}
            options={[
              { value: "prospect", label: m.form.partyMode.prospect },
              { value: "existing", label: m.form.partyMode.existing },
            ]}
          />

          {partyMode === "existing" ? (
            <SearchSelect
              className="w-full"
              placeholder={m.form.customer}
              value={customerId}
              onChange={(value) => setCustomerId(value as string)}
              options={customers.map((customer) => ({
                value: customer.id,
                label: `${customer.customerCode} · ${customer.nameTh}${
                  customer.branchName ? ` (${customer.branchName})` : ""
                }`,
              }))}
            />
          ) : (
            <>
              <Input
                placeholder={m.form.prospectName}
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
              />
              <Space.Compact className="w-full">
                <Input
                  placeholder={m.form.prospectTaxId}
                  value={prospectTaxId}
                  maxLength={20}
                  onChange={(e) => setProspectTaxId(e.target.value)}
                />
                <Input
                  placeholder={m.form.prospectContact}
                  value={prospectContact}
                  onChange={(e) => setProspectContact(e.target.value)}
                />
              </Space.Compact>
              <Space.Compact className="w-full">
                <Input
                  placeholder={m.form.prospectPhone}
                  value={prospectPhone}
                  onChange={(e) => setProspectPhone(e.target.value)}
                />
                <Input
                  placeholder={m.form.prospectEmail}
                  value={prospectEmail}
                  onChange={(e) => setProspectEmail(e.target.value)}
                />
              </Space.Compact>
              <Text type="secondary" className="text-xs">
                {m.form.prospectHint}
              </Text>
            </>
          )}

          <Input
            placeholder={m.form.title}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Space.Compact className="w-full">
            <InputNumber
              className="w-full"
              placeholder={m.form.amount}
              min={0}
              value={amount}
              onChange={(value) => setAmount(value)}
            />
            <DatePicker
              className="w-full"
              placeholder={m.form.expectedClose}
              onChange={(value) =>
                setExpectedClose(value ? value.toISOString() : null)
              }
            />
          </Space.Compact>
          <div>
            <Select
              mode="tags"
              className="w-full"
              placeholder={m.form.products}
              value={productCodes}
              onChange={(values) => setProductCodes(values as string[])}
              open={false}
              suffixIcon={null}
              tokenSeparators={[",", " "]}
            />
            <Text type="secondary" className="text-xs">
              {m.form.productsHint}
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
}
