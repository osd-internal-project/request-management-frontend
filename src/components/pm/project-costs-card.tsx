"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
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
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ProjectCostEntry,
  ProjectCostRow,
  ProjectCostsView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.costs;

const levelColor: Record<string, string> = {
  ok: "success",
  warn: "warning",
  over: "error",
};

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

interface Adding {
  category: string;
  description: string;
  amount: number | null;
  incurredOn: Dayjs | null;
  vendor: string;
  docNo: string;
  file: File | null;
}

/**
 * CD-190 — actual cost against the locked reference budget: labour from
 * approved timesheets, material and other from the ERP and manual entries.
 */
export function ProjectCostsCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectCostsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [adding, setAdding] = useState<Adding | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/costs`;

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, init);
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return false;
    }
    message.success(m.saved);
    router.refresh();
    return true;
  }

  async function add() {
    if (!adding) return;
    const form = new FormData();
    form.append("category", adding.category);
    form.append("description", adding.description);
    form.append("amount", String(adding.amount ?? ""));
    form.append(
      "incurred_on",
      adding.incurredOn ? adding.incurredOn.format("YYYY-MM-DD") : "",
    );
    if (adding.vendor.trim()) form.append("vendor_name", adding.vendor);
    if (adding.docNo.trim()) form.append("doc_no", adding.docNo);
    if (adding.file) form.append("file", adding.file);
    if (await call(base, { method: "POST", body: form })) setAdding(null);
  }

  return (
    <Card
      size="small"
      title={
        <span>
          {m.title}{" "}
          {view.budget && (
            <Text type="secondary" className="text-xs">
              {m.budgetVersion(view.budget.versionNo)}
            </Text>
          )}
        </span>
      }
      extra={
        view.canEdit ? (
          <Space size={4}>
            <Button
              size="small"
              loading={busy}
              onClick={() => void call(`${base}/sync`, { method: "POST" })}
            >
              {m.sync}
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setError(null);
                setAdding({
                  category: "material",
                  description: "",
                  amount: null,
                  incurredOn: dayjs(),
                  vendor: "",
                  docNo: "",
                  file: null,
                });
              }}
            >
              {m.add}
            </Button>
          </Space>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint} ·{" "}
        {m.thresholds(view.thresholds.warnPct, view.thresholds.alertPct)}
      </Text>
      {error && !adding && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}
      {!view.budget && (
        <Alert className="mb-2" type="info" showIcon title={m.noBudget} />
      )}

      <Table<ProjectCostRow>
        rowKey="category"
        size="small"
        pagination={false}
        dataSource={view.rows}
        scroll={{ x: 560 }}
        columns={[
          {
            title: m.columns.category,
            dataIndex: "category",
            render: (value: string) =>
              value === "total" ? (
                <Text strong>{m.category[value]}</Text>
              ) : (
                m.category[value]
              ),
          },
          {
            title: m.columns.budget,
            dataIndex: "budget",
            align: "right",
            render: (value: number) => baht(value),
          },
          {
            title: m.columns.actual,
            dataIndex: "actual",
            align: "right",
            render: (value: number) => baht(value),
          },
          {
            title: m.columns.pct,
            dataIndex: "pct",
            align: "right",
            render: (value: number | null) =>
              value === null ? m.noBudgetLine : `${value}%`,
          },
          {
            title: m.columns.level,
            dataIndex: "level",
            render: (value: string) => (
              <Tag color={levelColor[value]}>{m.level[value]}</Tag>
            ),
          },
        ]}
      />

      <Text type="secondary" className="mt-2 block text-xs">
        {m.labor(baht(view.labor.mandays), baht(view.labor.hours))}
        {" · "}
        {view.lastErpSyncAt
          ? m.lastSync(dayjs(view.lastErpSyncAt).format("D MMM YY HH:mm"))
          : m.neverSynced}
      </Text>
      {view.labor.unpricedHours > 0 && (
        <Text type="warning" className="block text-xs">
          {m.unpriced(baht(view.labor.unpricedHours))}
        </Text>
      )}

      <Text strong className="mt-3 block text-xs">
        {m.entries}
      </Text>
      <Table<ProjectCostEntry>
        rowKey="id"
        size="small"
        dataSource={view.entries}
        pagination={view.entries.length > 10 ? { pageSize: 10 } : false}
        locale={{ emptyText: m.noEntries }}
        scroll={{ x: 760 }}
        columns={[
          {
            title: m.form.incurredOn,
            dataIndex: "incurredOn",
            width: 100,
            render: (value: string) => dayjs(value).format("DD/MM/YY"),
          },
          {
            title: m.columns.category,
            dataIndex: "category",
            width: 110,
            render: (value: string) => m.category[value] ?? value,
          },
          {
            title: m.form.description,
            render: (_: unknown, row) => (
              <span>
                {row.description}
                <Text type="secondary" className="block text-xs">
                  {[row.docNo, row.vendorName, row.createdByName]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </span>
            ),
          },
          {
            title: m.form.amount,
            dataIndex: "amount",
            align: "right",
            width: 120,
            render: (value: number) => baht(value),
          },
          {
            title: "",
            width: 170,
            render: (_: unknown, row) => (
              <Space size={0}>
                <Tag>{m.source[row.source]}</Tag>
                {row.evidenceName && (
                  <a
                    href={`/api/app/${base}/${row.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs"
                  >
                    {m.evidence}
                  </a>
                )}
                {view.canEdit && row.source === "manual" && (
                  <Popconfirm
                    title={m.removeConfirm}
                    onConfirm={() =>
                      void call(`${base}/${row.id}`, { method: "DELETE" })
                    }
                  >
                    <Button size="small" type="link" danger>
                      {m.remove}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={adding !== null}
        title={m.add}
        onCancel={() => setAdding(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void add()}
        destroyOnHidden
      >
        {adding && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.category}
                <Select
                  className="w-full"
                  value={adding.category}
                  options={["material", "other"].map((value) => ({
                    value,
                    label: m.category[value],
                  }))}
                  onChange={(value: string) =>
                    setAdding({ ...adding, category: value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.incurredOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={adding.incurredOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    setAdding({ ...adding, incurredOn: value })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.description}
              <Input
                value={adding.description}
                maxLength={500}
                onChange={(event) =>
                  setAdding({ ...adding, description: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block text-xs">
                {m.form.amount}
                <InputNumber
                  className="w-full"
                  value={adding.amount}
                  onChange={(value) => setAdding({ ...adding, amount: value })}
                />
              </label>
              <label className="block text-xs">
                {m.form.vendor}
                <Input
                  value={adding.vendor}
                  maxLength={255}
                  onChange={(event) =>
                    setAdding({ ...adding, vendor: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.docNo}
                <Input
                  value={adding.docNo}
                  maxLength={100}
                  onChange={(event) =>
                    setAdding({ ...adding, docNo: event.target.value })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.file}
              <input
                type="file"
                className="block text-sm"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(event) =>
                  setAdding({
                    ...adding,
                    file: event.target.files?.[0] ?? null,
                  })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
