"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Skeleton,
  Table,
  Tag,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { CustomerContract } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.customers.contracts;

const STATUS_COLOR: Record<CustomerContract["status"], string> = {
  active: "blue",
  renewed: "green",
  ended: "default",
  cancelled: "red",
};

const day = (value: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "—";
const baht = (value: string | number | null) =>
  value === null ? "—" : Number(value).toLocaleString("th-TH");

interface FormValues {
  contract_no: string;
  title: string;
  period: [Dayjs | null, Dayjs];
  value?: number | null;
  note?: string;
}

/**
 * CD-70 — the customer's contract register: what is in force, until when,
 * and the renewal deal the system opened 90 days before the end. Contracts
 * made before the system are entered here by hand; the contract requests
 * sent to Legal (CD-81) follow underneath.
 */
export function CustomerContractsTab({
  customerId,
  editable,
  children,
}: {
  readonly customerId: string;
  readonly editable: boolean;
  /** The contract requests sent to Legal, when the viewer may read requests. */
  readonly children?: ReactNode;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [rows, setRows] = useState<CustomerContract[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerContract | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    void appApi<CustomerContract[]>(`customers/${customerId}/contracts`).then(
      (result) => {
        if (result.ok) setRows(result.data);
        else setError(result.message);
      },
    );
  }, [customerId]);

  useEffect(load, [load]);

  async function save() {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const isNew = editing === "new";
    const body = {
      ...(isNew ? { contract_no: values.contract_no.trim() } : {}),
      title: values.title.trim(),
      start_on: values.period[0]?.format("YYYY-MM-DD") ?? null,
      end_on: values.period[1].format("YYYY-MM-DD"),
      value: values.value ?? null,
      note: values.note?.trim() || null,
    };
    setBusy(true);
    setFormError(null);
    const result = await appApi(
      isNew
        ? `customers/${customerId}/contracts`
        : `customers/${customerId}/contracts/${(editing as CustomerContract).id}`,
      { method: isNew ? "POST" : "PATCH", body: JSON.stringify(body) },
    );
    setBusy(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    message.success(m.saved);
    setEditing(null);
    load();
  }

  async function cancel(row: CustomerContract) {
    const result = await appApi(`customers/${customerId}/contracts/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    load();
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!rows) return <Skeleton active paragraph={{ rows: 3 }} />;

  const initialValues: Partial<FormValues> | undefined =
    editing && editing !== "new"
      ? {
          contract_no: editing.contractNo,
          title: editing.title,
          period: [
            editing.startOn ? dayjs(editing.startOn) : null,
            dayjs(editing.endOn),
          ],
          value: editing.value === null ? null : Number(editing.value),
          note: editing.note ?? undefined,
        }
      : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Text type="secondary" className="text-xs">
          {m.hint}
        </Text>
        {editable && (
          <Button size="small" type="primary" onClick={() => setEditing("new")}>
            {m.add}
          </Button>
        )}
      </div>

      {rows.length ? (
        <Table<CustomerContract>
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: true }}
          dataSource={rows}
          columns={[
            {
              title: m.columns.contract,
              key: "contract",
              render: (_: unknown, row) => (
                <div>
                  <Text strong>{row.title}</Text>
                  <div className="text-xs text-gray-500">{row.contractNo}</div>
                </div>
              ),
            },
            {
              title: m.columns.period,
              key: "period",
              render: (_: unknown, row) =>
                `${day(row.startOn)} – ${day(row.endOn)}`,
            },
            {
              title: m.columns.value,
              dataIndex: "value",
              align: "right",
              render: (value: string | null) => baht(value),
            },
            {
              title: m.columns.status,
              dataIndex: "status",
              render: (status: CustomerContract["status"]) => (
                <Tag color={STATUS_COLOR[status]}>{m.status[status]}</Tag>
              ),
            },
            {
              title: m.columns.renewal,
              key: "renewal",
              render: (_: unknown, row) =>
                row.renewalOpportunityId ? (
                  <Link
                    href={ROUTES.opportunityDetail(row.renewalOpportunityId)}
                  >
                    {m.openRenewal}
                  </Link>
                ) : row.status === "active" ? (
                  <Text type="secondary" className="text-xs">
                    {m.renewalFrom(
                      dayjs(row.endOn).subtract(90, "day").format("DD/MM/YYYY"),
                    )}
                  </Text>
                ) : (
                  "—"
                ),
            },
            ...(editable
              ? [
                  {
                    key: "actions",
                    render: (_: unknown, row: CustomerContract) =>
                      row.status === "active" ? (
                        <span className="flex gap-2 text-xs whitespace-nowrap">
                          {/* CD-67 — a case raised against this contract */}
                          <Link
                            href={`${ROUTES.newRequest}?ref_type=contract&ref_id=${encodeURIComponent(row.contractNo)}`}
                          >
                            {m.openCase}
                          </Link>
                          <a onClick={() => setEditing(row)}>{m.edit}</a>
                          <a onClick={() => void cancel(row)}>{m.cancel}</a>
                        </span>
                      ) : null,
                  },
                ]
              : []),
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      {children && (
        <div>
          <Text strong className="mb-2 block">
            {m.requestsTitle}
          </Text>
          {children}
        </div>
      )}

      <Modal
        open={editing !== null}
        title={editing === "new" ? m.addTitle : m.editTitle}
        okText={m.save}
        confirmLoading={busy}
        onOk={() => void save()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        {formError && (
          <Alert type="error" showIcon title={formError} className="mb-3" />
        )}
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={initialValues}
        >
          <Form.Item
            name="contract_no"
            label={m.form.contractNo}
            rules={[
              { required: true, whitespace: true, message: m.form.required },
            ]}
          >
            <Input maxLength={60} disabled={editing !== "new"} />
          </Form.Item>
          <Form.Item
            name="title"
            label={m.form.title}
            rules={[
              { required: true, whitespace: true, message: m.form.required },
            ]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item
            name="period"
            label={m.form.period}
            extra={m.form.periodHint}
            rules={[
              {
                validator: (_, value?: [Dayjs | null, Dayjs | null]) =>
                  value?.[1]
                    ? Promise.resolve()
                    : Promise.reject(new Error(m.form.endRequired)),
              },
            ]}
          >
            <DatePicker.RangePicker
              allowEmpty={[true, false]}
              className="w-full"
            />
          </Form.Item>
          <Form.Item name="value" label={m.form.value}>
            <InputNumber<number> min={0} step={10000} className="w-full" />
          </Form.Item>
          <Form.Item name="note" label={m.form.note}>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
