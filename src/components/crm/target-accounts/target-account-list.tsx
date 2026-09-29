"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { TargetAccountPriority, TargetAccountRow } from "@/lib/api/types";

const m = messages.targetAccounts;
const PRIORITIES: TargetAccountPriority[] = ["high", "medium", "low"];

interface Filters {
  search?: string;
  status?: string;
  priority?: string;
  view?: "mine" | "unassigned";
}

/**
 * CD-85 — the Getter's list of companies to open: add, prioritise, start the
 * approach (a Lead is made and the work goes on there), or drop with a reason.
 * Everything the list shows lives in the URL, so a filtered view is a link.
 */
export function TargetAccountList({
  rows,
  total,
  page,
  pageSize,
  filters,
  canManage,
}: {
  rows: TargetAccountRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<TargetAccountRow | "new" | null>(null);
  const [approaching, setApproaching] = useState<TargetAccountRow | null>(null);
  const [dropping, setDropping] = useState<TargetAccountRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  function navigate(next: Partial<Filters> & { page?: number }) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
    if (merged.priority) params.set("priority", merged.priority);
    if (merged.view) params.set("view", merged.view);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`${ROUTES.targetAccounts}?${params.toString()}`);
  }

  async function reopen(row: TargetAccountRow) {
    setError(null);
    const result = await appApi(`target-accounts/${row.id}/reopen`, {
      method: "POST",
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.reopened);
    router.refresh();
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
          onSearch={(value) => navigate({ search: value || undefined })}
        />
        <SearchSelect
          className="min-w-36"
          allowClear
          placeholder={m.allPriority}
          value={filters.priority}
          onChange={(value) =>
            navigate({ priority: (value as string) || undefined })
          }
          options={PRIORITIES.map((value) => ({
            value,
            label: m.priority[value],
          }))}
        />
        <SearchSelect
          className="min-w-36"
          allowClear
          placeholder={m.allStatus}
          value={filters.status}
          onChange={(value) =>
            navigate({ status: (value as string) || undefined })
          }
          options={Object.entries(m.status).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Segmented<string>
          value={filters.view ?? "all"}
          onChange={(value) =>
            navigate({
              view:
                value === "mine" || value === "unassigned" ? value : undefined,
            })
          }
          options={[
            { value: "all", label: m.all },
            { value: "mine", label: m.mineOnly },
            { value: "unassigned", label: m.unassigned },
          ]}
        />
        <div className="grow" />
        {canManage && (
          <Button type="primary" onClick={() => setEditing("new")}>
            {m.add}
          </Button>
        )}
      </div>

      <Table<TargetAccountRow>
        size="small"
        rowKey="id"
        dataSource={rows}
        scroll={{ x: 900 }}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: page,
          pageSize,
          total,
          hideOnSinglePage: true,
          onChange: (next) => navigate({ page: next }),
        }}
        columns={[
          {
            title: m.columns.priority,
            dataIndex: "priority",
            width: 80,
            render: (priority: TargetAccountPriority) => (
              <Tag color={m.priorityColor[priority]}>
                {m.priority[priority]}
              </Tag>
            ),
          },
          {
            title: m.columns.name,
            dataIndex: "name",
            width: 260,
            render: (name: string, row) => (
              <div>
                <span className="font-medium">{name}</span>
                {row.taxId && (
                  <Text type="secondary" className="block text-xs">
                    {row.taxId}
                  </Text>
                )}
                {row.note && (
                  <Text type="secondary" className="block text-xs">
                    {row.note}
                  </Text>
                )}
              </div>
            ),
          },
          {
            title: m.columns.industry,
            key: "industry",
            width: 180,
            render: (_: unknown, row) =>
              [row.industry, row.province].filter(Boolean).join(" · ") || "—",
          },
          {
            title: m.columns.owner,
            key: "owner",
            width: 150,
            render: (_: unknown, row) =>
              row.owner?.displayName ?? (
                <Text type="secondary" className="text-xs">
                  {m.noOwner}
                </Text>
              ),
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 170,
            render: (status: string, row) => (
              <Space size={2} orientation="vertical">
                <Tag color={m.statusColor[status]}>{m.status[status]}</Tag>
                {row.lead && (
                  <Link href={ROUTES.leadDetail(row.lead.id)}>
                    <Text type="secondary" className="text-xs">
                      {m.openLead} →
                    </Text>
                  </Link>
                )}
                {status === "dropped" && row.dropReason && (
                  <Text type="secondary" className="text-xs">
                    {row.dropReason}
                  </Text>
                )}
              </Space>
            ),
          },
          ...(canManage
            ? [
                {
                  title: "",
                  key: "actions",
                  width: 250,
                  render: (_: unknown, row: TargetAccountRow) => (
                    <Space wrap>
                      {row.status === "targeting" && (
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => setApproaching(row)}
                        >
                          {m.approach}
                        </Button>
                      )}
                      {row.status !== "converted" && (
                        <Button size="small" onClick={() => setEditing(row)}>
                          {m.edit}
                        </Button>
                      )}
                      {(row.status === "targeting" ||
                        row.status === "approaching") && (
                        <Button
                          size="small"
                          danger
                          onClick={() => setDropping(row)}
                        >
                          {m.drop}
                        </Button>
                      )}
                      {row.status === "dropped" && (
                        <Button size="small" onClick={() => void reopen(row)}>
                          {m.reopen}
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <TargetAccountFormModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
      <ApproachModal
        target={approaching}
        onClose={() => setApproaching(null)}
        onDone={(leadId) => {
          setApproaching(null);
          router.push(ROUTES.leadDetail(leadId));
        }}
      />
      <DropModal
        target={dropping}
        onClose={() => setDropping(null)}
        onDone={() => {
          setDropping(null);
          router.refresh();
        }}
      />
    </div>
  );
}

interface FormValues {
  name: string;
  name_en?: string;
  tax_id?: string;
  industry?: string;
  company_size?: string;
  province?: string;
  website?: string;
  note?: string;
  priority: TargetAccountPriority;
  /** Create only — nobody owns it yet. */
  pool?: boolean;
}

function TargetAccountFormModal({
  target,
  onClose,
  onSaved,
}: {
  /** "new" = create, a row = edit, null = closed. */
  target: TargetAccountRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creating = target === "new";
  const row = target && target !== "new" ? target : null;

  async function submit() {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const { pool, ...fields } = values;
    setBusy(true);
    setError(null);
    const result = await appApi(
      creating ? "target-accounts" : `target-accounts/${row!.id}`,
      {
        method: creating ? "POST" : "PATCH",
        body: JSON.stringify({
          ...fields,
          ...(creating && pool ? { owner_user_id: "" } : {}),
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    onSaved();
  }

  return (
    <Modal
      open={target !== null}
      title={creating ? m.add : row?.name}
      okText={m.save}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      mask={{ closable: false }}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={
          row
            ? {
                name: row.name,
                name_en: row.nameEn ?? "",
                tax_id: row.taxId ?? "",
                industry: row.industry ?? "",
                company_size: row.companySize ?? "",
                province: row.province ?? "",
                website: row.website ?? "",
                note: row.note ?? "",
                priority: row.priority,
              }
            : { priority: "medium" }
        }
      >
        <Form.Item
          name="name"
          label={m.form.name}
          rules={[
            { required: true, whitespace: true, message: m.form.nameRequired },
          ]}
        >
          <Input maxLength={255} />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
          <Form.Item name="priority" label={m.form.priority}>
            <Select
              options={PRIORITIES.map((value) => ({
                value,
                label: m.priority[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="tax_id" label={m.form.taxId}>
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="industry" label={m.form.industry}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="province" label={m.form.province}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="company_size" label={m.form.companySize}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="name_en" label={m.form.nameEn}>
            <Input maxLength={255} />
          </Form.Item>
        </div>
        <Form.Item name="website" label={m.form.website}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name="note" label={m.form.note}>
          <Input.TextArea rows={2} maxLength={4000} />
        </Form.Item>
        {creating && (
          <Form.Item name="pool" valuePropName="checked" className="mb-0">
            <Checkbox>{m.unassigned}</Checkbox>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

function ApproachModal({
  target,
  onClose,
  onDone,
}: {
  target: TargetAccountRow | null;
  onClose: () => void;
  onDone: (leadId: string) => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{
    contact_name?: string;
    phone?: string;
    email?: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!target) return;
    let values: { contact_name?: string; phone?: string; email?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi<{ lead_id: string }>(
      `target-accounts/${target.id}/approach`,
      {
        method: "POST",
        body: JSON.stringify({
          contact_name: values.contact_name?.trim() || undefined,
          phone: values.phone?.trim() || undefined,
          email: values.email?.trim() || undefined,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.approached);
    onDone(result.data.lead_id);
  }

  return (
    <Modal
      open={target !== null}
      title={target ? m.approachTitle(target.name) : ""}
      okText={m.approach}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Text type="secondary" className="mb-3 block text-xs">
        {m.approachHint}
      </Text>
      <Form form={form} layout="vertical">
        <Form.Item name="contact_name" label={m.form.contactName}>
          <Input maxLength={255} />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
          <Form.Item name="phone" label={m.form.phone}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item
            name="email"
            label={m.form.email}
            rules={[
              {
                type: "email",
                message: messages.sales.leads.form.emailInvalid,
              },
            ]}
          >
            <Input maxLength={255} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

function DropModal({
  target,
  onClose,
  onDone,
}: {
  target: TargetAccountRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!target || !reason.trim()) return;
    setBusy(true);
    setError(null);
    const result = await appApi(`target-accounts/${target.id}/drop`, {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim() }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.dropped);
    setReason("");
    onDone();
  }

  return (
    <Modal
      open={target !== null}
      title={m.dropTitle}
      okText={m.drop}
      okButtonProps={{ danger: true, disabled: !reason.trim() }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Text strong className="mb-1 block">
        {target?.name}
      </Text>
      <Input.TextArea
        rows={3}
        maxLength={500}
        placeholder={m.dropReason}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
}
