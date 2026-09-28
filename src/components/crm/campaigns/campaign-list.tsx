"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  Table,
  Tag,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { CampaignRow } from "@/lib/api/campaigns";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.campaigns;

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

interface FormValues {
  code: string;
  name: string;
  channel?: string;
  period?: [Dayjs | null, Dayjs | null] | null;
  budget?: number | null;
  note?: string;
  active: boolean;
}

/**
 * CD-71 — ตารางแคมเปญพร้อมผล และฟอร์มสร้าง/แก้ (สิทธิ์ `crm.campaign.manage`).
 * ตัวเลขผลคำนวณที่ server ทั้งหมด — หน้านี้แค่วาง.
 */
export function CampaignList({
  rows,
  canManage,
}: {
  rows: CampaignRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [editing, setEditing] = useState<CampaignRow | null | "new">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(row: CampaignRow | "new") {
    setError(null);
    setEditing(row);
  }

  // ค่าเริ่มของฟอร์มคำนวณตอนเปิด — Modal ปิดแล้วถูกทิ้ง (destroyOnHidden)
  // จึงไม่ต้อง forceRender ซึ่งทำให้ HTML ฝั่ง server กับ client ไม่ตรงกัน.
  const initialValues: FormValues | undefined =
    editing === null
      ? undefined
      : editing === "new"
        ? { code: "", name: "", active: true, period: null }
        : {
            code: editing.code,
            name: editing.name,
            channel: editing.channel ?? undefined,
            period: [
              editing.start_date ? dayjs(editing.start_date) : null,
              editing.end_date ? dayjs(editing.end_date) : null,
            ],
            budget: editing.budget,
            note: editing.note ?? undefined,
            active: editing.active,
          };

  async function save() {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const isNew = editing === "new";
    const body = {
      ...(isNew ? { code: values.code.trim() } : {}),
      name: values.name.trim(),
      channel: values.channel?.trim() ?? "",
      start_date: values.period?.[0]?.format("YYYY-MM-DD"),
      end_date: values.period?.[1]?.format("YYYY-MM-DD"),
      budget: values.budget ?? undefined,
      note: values.note?.trim() ?? "",
      ...(isNew ? {} : { active: values.active }),
    };

    setBusy(true);
    setError(null);
    const result = await appApi(
      isNew ? "campaigns" : `campaigns/${(editing as CampaignRow).id}`,
      { method: isNew ? "POST" : "PATCH", body: JSON.stringify(body) },
    );
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.form.saved);
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button type="primary" onClick={() => open("new")}>
            {m.create}
          </Button>
        </div>
      )}

      <Card size="small">
        {rows.length ? (
          <Table<CampaignRow>
            rowKey="id"
            size="small"
            dataSource={rows}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            scroll={{ x: true }}
            columns={[
              {
                title: m.columns.campaign,
                dataIndex: "name",
                render: (name: string, row) => (
                  <div>
                    <div>
                      <Text strong>{name}</Text>{" "}
                      <Tag color={row.active ? "green" : "default"}>
                        {row.active ? m.activeTag : m.closedTag}
                      </Tag>
                    </div>
                    <Text type="secondary" className="text-xs">
                      {row.code}
                      {row.channel && ` · ${row.channel}`}
                    </Text>
                  </div>
                ),
              },
              {
                title: m.columns.period,
                key: "period",
                render: (_: unknown, row) =>
                  row.start_date || row.end_date
                    ? `${row.start_date ? dayjs(row.start_date).format("DD/MM/YY") : "…"} – ${row.end_date ? dayjs(row.end_date).format("DD/MM/YY") : "…"}`
                    : "—",
              },
              {
                title: m.columns.budget,
                dataIndex: "budget",
                align: "right",
                render: (value: number | null) =>
                  value === null ? "—" : baht(value),
              },
              {
                title: m.columns.leads,
                key: "leads",
                align: "right",
                render: (_: unknown, row) => row.stats.leads,
              },
              {
                title: m.columns.converted,
                key: "converted",
                align: "right",
                render: (_: unknown, row) => row.stats.converted,
              },
              {
                title: m.columns.won,
                key: "won",
                align: "right",
                render: (_: unknown, row) => row.stats.won,
              },
              {
                title: m.columns.sales,
                key: "sales",
                align: "right",
                render: (_: unknown, row) => baht(row.stats.sales_amount),
              },
              {
                title: m.columns.costPerLead,
                key: "cpl",
                align: "right",
                render: (_: unknown, row) =>
                  row.stats.cost_per_lead === null
                    ? "—"
                    : baht(row.stats.cost_per_lead),
              },
              {
                title: m.columns.salesPerBudget,
                key: "spb",
                align: "right",
                render: (_: unknown, row) =>
                  row.stats.sales_per_budget === null
                    ? "—"
                    : `${row.stats.sales_per_budget}×`,
              },
              {
                key: "actions",
                render: (_: unknown, row) => (
                  <span className="flex gap-2 whitespace-nowrap text-xs">
                    <Link href={`${ROUTES.leads}?campaign_id=${row.id}`}>
                      {m.leads}
                    </Link>
                    {canManage && <a onClick={() => open(row)}>{m.edit}</a>}
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <Empty description={m.empty} />
        )}
        <Text type="secondary" className="mt-3 block text-xs">
          {m.definitions}
        </Text>
      </Card>

      <Modal
        open={editing !== null}
        title={
          editing === "new" || editing === null
            ? m.form.titleNew
            : m.form.titleEdit(editing.code)
        }
        okText={m.form.submit}
        confirmLoading={busy}
        onOk={() => void save()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        {error && (
          <Alert type="error" showIcon title={error} className="mb-3" />
        )}
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={initialValues}
        >
          <Form.Item
            name="code"
            label={m.form.code}
            extra={m.form.codeHint}
            rules={[
              { required: true, message: m.form.required },
              { pattern: /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/ },
            ]}
          >
            <Input
              maxLength={40}
              disabled={editing !== "new"}
              onChange={(e) =>
                form.setFieldValue("code", e.target.value.toUpperCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="name"
            label={m.form.name}
            rules={[
              { required: true, whitespace: true, message: m.form.required },
            ]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="channel" label={m.form.channel}>
            <Input maxLength={100} placeholder={m.form.channelPlaceholder} />
          </Form.Item>
          <Form.Item name="period" label={m.form.period}>
            <DatePicker.RangePicker allowEmpty={[true, true]} />
          </Form.Item>
          <Form.Item name="budget" label={m.form.budget}>
            <InputNumber<number>
              style={{ width: "100%" }}
              min={0}
              step={10000}
              formatter={(value) =>
                `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => Number((value ?? "").replace(/,/g, ""))}
            />
          </Form.Item>
          <Form.Item name="note" label={m.form.note}>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          {editing !== "new" && (
            <Form.Item
              name="active"
              label={m.form.active}
              extra={m.form.activeHint}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
