"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Input,
  Modal,
  InputNumber,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { CustomerRow, LeadRow } from "@/lib/api/types";

const m = messages.sales.leads;

const STATUS_COLOR: Record<string, string | undefined> = {
  new: "blue",
  qualified: "green",
  disqualified: "red",
  converted: "purple",
};

interface LeadFormState {
  id?: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  source_code?: string;
  note?: string;
}

/**
 * Lead register — รับเข้า แก้ไข คัดออก (เหตุผลบังคับ ไม่มีการลบ) และแปลงเป็น
 * ดีลโดยข้อมูลไหลต่อ. Mutations call the backend then refresh, like every
 * CRM screen.
 */
export function LeadList({
  rows,
  total,
  page,
  pageSize,
  filters,
  customers,
  canManage,
}: {
  rows: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { search?: string; status?: string; mineOnly: boolean };
  customers: CustomerRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadFormState | null>(null);
  const [disqualifying, setDisqualifying] = useState<LeadRow | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [converting, setConverting] = useState<LeadRow | null>(null);
  const [convertCustomerId, setConvertCustomerId] = useState<string>();
  const [convertTitle, setConvertTitle] = useState("");
  const [convertAmount, setConvertAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function applyFilters(next: Partial<typeof filters>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
    if (merged.mineOnly) params.set("view", "mine");
    router.push(`${ROUTES.leads}?${params.toString()}`);
  }

  async function saveLead() {
    if (!editing?.name.trim()) return;
    setBusy(true);
    setError(null);

    const result = await appApi(
      editing.id ? `leads/${editing.id}` : "leads",
      {
        method: editing.id ? "PATCH" : "POST",
        body: JSON.stringify({
          name: editing.name.trim(),
          contact_name: editing.contact_name || undefined,
          phone: editing.phone || undefined,
          email: editing.email || undefined,
          source_code: editing.source_code || undefined,
          note: editing.note || undefined,
        }),
      },
    );

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(editing.id ? m.form.saved : m.form.created);
    setEditing(null);
    router.refresh();
  }

  async function disqualify() {
    if (!disqualifying || !disqualifyReason.trim()) return;
    setBusy(true);
    setError(null);

    const result = await appApi(`leads/${disqualifying.id}/disqualify`, {
      method: "POST",
      body: JSON.stringify({ reason: disqualifyReason.trim() }),
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.disqualified);
    setDisqualifying(null);
    setDisqualifyReason("");
    router.refresh();
  }

  async function convert() {
    if (!converting || !convertCustomerId) return;
    setBusy(true);
    setError(null);

    const result = await appApi<{ id: string; dealCode: string }>(
      `leads/${converting.id}/convert`,
      {
        method: "POST",
        body: JSON.stringify({
          customer_id: convertCustomerId,
          title: convertTitle.trim() || undefined,
          amount: convertAmount ?? undefined,
        }),
      },
    );

    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.converted(result.data.dealCode));
    setConverting(null);
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
          placeholder={m.filterStatus}
          value={filters.status}
          onChange={(value) =>
            applyFilters({ status: (value as string) || undefined })
          }
          options={Object.entries(m.status).map(([value, label]) => ({
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
          <Button type="primary" onClick={() => setEditing({ name: "" })}>
            {m.newLead}
          </Button>
        )}
      </div>

      <Table<LeadRow>
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
            if (filters.status) params.set("status", filters.status);
            if (filters.mineOnly) params.set("view", "mine");
            params.set("page", String(next));
            router.push(`${ROUTES.leads}?${params.toString()}`);
          },
        }}
        columns={[
          {
            title: m.columns.name,
            dataIndex: "name",
            render: (name: string, row) => (
              <div>
                <div>{name}</div>
                {row.customer && (
                  <Link href={ROUTES.customerDetail(row.customer.id)}>
                    <Text type="secondary" className="text-xs">
                      {row.customer.customerCode} · {row.customer.nameTh}
                    </Text>
                  </Link>
                )}
              </div>
            ),
          },
          {
            title: m.columns.contact,
            dataIndex: "contactName",
            render: (contactName: string | null, row) =>
              [contactName, row.phone, row.email].filter(Boolean).join(" · ") ||
              "—",
          },
          {
            title: m.columns.source,
            dataIndex: "sourceCode",
            width: 140,
            render: (source: string | null) => source ?? "—",
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 150,
            render: (status: string, row) => (
              <Space size={4} direction="vertical">
                <Tag color={STATUS_COLOR[status]}>
                  {m.status[status] ?? status}
                </Tag>
                {row.convertedDeal && (
                  <Link href={ROUTES.dealDetail(row.convertedDeal.id)}>
                    <Text type="secondary" className="text-xs">
                      {row.convertedDeal.dealCode}
                    </Text>
                  </Link>
                )}
              </Space>
            ),
          },
          ...(canManage
            ? [
                {
                  title: "",
                  key: "actions",
                  width: 240,
                  render: (_: unknown, row: LeadRow) =>
                    row.status === "new" || row.status === "qualified" ? (
                      <Space>
                        <Button
                          size="small"
                          onClick={() =>
                            setEditing({
                              id: row.id,
                              name: row.name,
                              contact_name: row.contactName ?? undefined,
                              phone: row.phone ?? undefined,
                              email: row.email ?? undefined,
                              source_code: row.sourceCode ?? undefined,
                              note: row.note ?? undefined,
                            })
                          }
                        >
                          {m.actions.edit}
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => {
                            setConverting(row);
                            setConvertCustomerId(row.customerId ?? undefined);
                            setConvertTitle("");
                            setConvertAmount(null);
                          }}
                        >
                          {m.actions.convert}
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={() => setDisqualifying(row)}
                        >
                          {m.actions.disqualify}
                        </Button>
                      </Space>
                    ) : null,
                },
              ]
            : []),
        ]}
      />

      {/* เพิ่ม/แก้ไข Lead */}
      <Modal
        open={editing !== null}
        title={editing?.id ? m.actions.edit : m.newLead}
        okText={m.form.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !editing?.name.trim() }}
        onCancel={() => setEditing(null)}
        onOk={() => void saveLead()}
        destroyOnHidden
      >
        {editing && (
          <Space direction="vertical" className="w-full">
            <Input
              placeholder={m.form.name}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <Input
              placeholder={m.form.contactName}
              value={editing.contact_name}
              onChange={(e) =>
                setEditing({ ...editing, contact_name: e.target.value })
              }
            />
            <Space.Compact className="w-full">
              <Input
                placeholder={m.form.phone}
                value={editing.phone}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value })
                }
              />
              <Input
                placeholder={m.form.email}
                value={editing.email}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
              />
            </Space.Compact>
            <Input
              placeholder={m.form.source}
              value={editing.source_code}
              onChange={(e) =>
                setEditing({ ...editing, source_code: e.target.value })
              }
            />
            <Input.TextArea
              rows={2}
              placeholder={m.form.note}
              value={editing.note}
              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
            />
          </Space>
        )}
      </Modal>

      {/* คัดออก — เหตุผลบังคับ */}
      <Modal
        open={disqualifying !== null}
        title={m.disqualifyTitle}
        okText={m.actions.disqualify}
        okButtonProps={{ danger: true, disabled: !disqualifyReason.trim() }}
        confirmLoading={busy}
        onCancel={() => setDisqualifying(null)}
        onOk={() => void disqualify()}
        destroyOnHidden
      >
        <Input.TextArea
          rows={2}
          placeholder={m.disqualifyReason}
          value={disqualifyReason}
          onChange={(e) => setDisqualifyReason(e.target.value)}
        />
      </Modal>

      {/* แปลงเป็นดีล — ข้อมูลไหลต่อ */}
      <Modal
        open={converting !== null}
        title={m.convertTitle}
        okText={m.actions.convert}
        confirmLoading={busy}
        okButtonProps={{ disabled: !convertCustomerId }}
        onCancel={() => setConverting(null)}
        onOk={() => void convert()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Text type="secondary" className="text-xs">
            {m.convertHint}
          </Text>
          <SearchSelect
            className="w-full"
            placeholder={m.convertCustomer}
            value={convertCustomerId}
            onChange={(value) => setConvertCustomerId(value as string)}
            options={customers.map((customer) => ({
              value: customer.id,
              label: `${customer.customerCode} · ${customer.nameTh}${
                customer.branchName ? ` (${customer.branchName})` : ""
              }`,
            }))}
          />
          <Input
            placeholder={m.convertTitleField}
            value={convertTitle}
            onChange={(e) => setConvertTitle(e.target.value)}
          />
          <InputNumber
            className="w-full"
            placeholder={m.convertAmount}
            min={0}
            value={convertAmount}
            onChange={(value) => setConvertAmount(value)}
          />
        </Space>
      </Modal>
    </div>
  );
}
