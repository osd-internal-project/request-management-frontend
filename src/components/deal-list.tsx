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
import type { CustomerRow, DealRow } from "@/lib/api/types";

const m = messages.sales.deals;

export function formatAmount(amount: DealRow["amount"]): string {
  if (amount === null || amount === undefined) return "—";
  return Number(amount).toLocaleString("th-TH");
}

/** ทะเบียนดีล — ตาราง+ฟิลเตอร์ตามขั้น และเปิดดีลใหม่. */
export function DealList({
  rows,
  total,
  page,
  pageSize,
  filters,
  customers,
  canManage,
}: {
  rows: DealRow[];
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
  const [customerId, setCustomerId] = useState<string>();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [expectedClose, setExpectedClose] = useState<string | null>(null);
  const [productCodes, setProductCodes] = useState<string[]>([]);

  function applyFilters(next: Partial<typeof filters>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    if (merged.search) params.set("search", merged.search);
    if (merged.stage) params.set("stage", merged.stage);
    if (merged.mineOnly) params.set("view", "mine");
    router.push(`${ROUTES.deals}?${params.toString()}`);
  }

  async function create() {
    if (!customerId || !title.trim()) return;
    setBusy(true);
    setError(null);

    const result = await appApi<{ id: string; dealCode: string }>("deals", {
      method: "POST",
      body: JSON.stringify({
        customer_id: customerId,
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
    message.success(m.form.created(result.data.dealCode));
    setCreating(false);
    router.push(ROUTES.dealDetail(result.data.id));
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
            {m.newDeal}
          </Button>
        )}
      </div>

      <Table<DealRow>
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
            router.push(`${ROUTES.deals}?${params.toString()}`);
          },
        }}
        columns={[
          {
            title: m.columns.code,
            dataIndex: "dealCode",
            width: 150,
            render: (code: string, row) => (
              <Link href={ROUTES.dealDetail(row.id)}>{code}</Link>
            ),
          },
          { title: m.columns.title, dataIndex: "title" },
          {
            title: m.columns.customer,
            dataIndex: "customer",
            render: (customer: DealRow["customer"]) =>
              customer ? (
                <Link href={ROUTES.customerDetail(customer.id)}>
                  {customer.nameTh}
                </Link>
              ) : (
                "—"
              ),
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
            render: (amount: DealRow["amount"]) => formatAmount(amount),
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
        title={m.newDeal}
        okText={m.form.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !customerId || !title.trim() }}
        onCancel={() => setCreating(false)}
        onOk={() => void create()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
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
