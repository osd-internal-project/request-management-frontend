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
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Progress,
  Segmented,
  Space,
  Table,
  Tag,
} from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type {
  SalesTargetList,
  SalesTargetRevision,
  SalesTargetRow,
  SalesTargetScope,
  SetSalesTargetResult,
} from "@/lib/api/sales-targets";
import type { DirectoryUser, OrgUnitShape } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.salesTargets;

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

function Pct({ value }: { value: number | null }) {
  if (value === null) return <Text type="secondary">—</Text>;
  return (
    <Progress
      size="small"
      percent={Math.min(value, 100)}
      format={() => `${value}%`}
      status={value >= 100 ? "success" : "normal"}
    />
  );
}

interface FormState {
  scope: SalesTargetScope;
  subjectId?: string;
  amount?: number;
  reason: string;
  /** Adjusting an existing row: scope/subject fixed. */
  existing?: SalesTargetRow;
}

/**
 * CD-82 — ตาราง เป้า / ยอดจริง / พยากรณ์ ของเดือนหนึ่ง พร้อมฟอร์มตั้ง/ปรับเป้าสำหรับ
 * ผู้มี `crm.target.manage`. เดือนที่เริ่มแล้ว การปรับเป้าที่มีอยู่จะกลายเป็นร่าง
 * คำขออนุมัติ — หน้านี้แค่บอกให้ชัดก่อนกด.
 */
export function SalesTargetsView({
  list,
  users,
  units,
}: {
  list: SalesTargetList;
  users: DirectoryUser[];
  units: OrgUnitShape[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{
    row: SalesTargetRow;
    rows: SalesTargetRevision[] | null;
  } | null>(null);

  const goTo = (period: string) =>
    router.push(`${ROUTES.salesTargets}?period=${period}`);

  // A started month asks for approval only when the row already has a target.
  const needsApproval = Boolean(form?.existing) && list.started;

  async function save() {
    if (!form?.subjectId || form.amount === undefined) return;
    setBusy(true);
    setError(null);
    const result = await appApi<SetSalesTargetResult>("sales-targets", {
      method: "POST",
      body: JSON.stringify({
        scope: form.scope,
        subject_id: form.subjectId,
        period: list.period,
        amount: form.amount,
        reason: form.reason.trim() || undefined,
      }),
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setForm(null);
    if (result.data.applied) {
      message.success(m.form.saved);
    } else {
      message.success(m.form.drafted);
      if (result.data.approval_request_id) {
        router.push(ROUTES.requestDetail(result.data.approval_request_id));
        return;
      }
    }
    router.refresh();
  }

  async function openHistory(row: SalesTargetRow) {
    setHistory({ row, rows: null });
    const result = await appApi<SalesTargetRevision[]>(
      `sales-targets/${row.id}/revisions`,
    );
    setHistory({ row, rows: result.ok ? result.data : [] });
  }

  const note = list.closed ? m.closed : list.started ? m.started : m.future;

  return (
    <div className="space-y-4">
      <Card size="small">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Text type="secondary" className="text-xs">
              {m.month}
            </Text>
            <DatePicker
              picker="month"
              allowClear={false}
              value={dayjs(`${list.period}-01`)}
              onChange={(value) => value && goTo(value.format("YYYY-MM"))}
            />
            <Text type="secondary" className="text-xs">
              {note}
            </Text>
          </Space>
          {list.can_manage && (
            <Button
              type="primary"
              onClick={() => setForm({ scope: "user", reason: "" })}
            >
              {m.setTarget}
            </Button>
          )}
        </div>
      </Card>

      {list.can_manage && list.started && !list.adjustment_configured && (
        <Alert type="info" showIcon title={m.notConfigured} />
      )}

      <Card size="small">
        {list.targets.length ? (
          <Table<SalesTargetRow>
            rowKey="id"
            size="small"
            dataSource={list.targets}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            scroll={{ x: true }}
            columns={[
              {
                title: m.columns.subject,
                dataIndex: "subject_name",
                render: (name: string, row) => (
                  <Space size={4} wrap>
                    <Tag>
                      {row.scope === "user" ? m.scopeUser : m.scopeUnit}
                    </Tag>
                    <span>{name}</span>
                    {row.pending && (
                      <Tag color="gold">
                        {m.pendingTag(baht(row.pending.new_amount))}
                      </Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: m.columns.target,
                dataIndex: "amount",
                align: "right",
                render: baht,
              },
              {
                title: m.columns.actual,
                dataIndex: "actual",
                align: "right",
                render: baht,
              },
              {
                title: m.columns.attainment,
                dataIndex: "attainment_pct",
                width: 160,
                render: (value: number | null) => <Pct value={value} />,
              },
              {
                title: m.columns.forecast,
                dataIndex: "forecast",
                align: "right",
                render: baht,
              },
              {
                title: m.columns.forecastPct,
                dataIndex: "forecast_pct",
                width: 160,
                render: (value: number | null) => <Pct value={value} />,
              },
              {
                key: "actions",
                render: (_: unknown, row) => (
                  <Space size={0}>
                    {list.can_manage && !row.pending && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          setForm({
                            scope: row.scope,
                            subjectId: row.subject_id,
                            amount: row.amount,
                            reason: "",
                            existing: row,
                          })
                        }
                      >
                        {m.adjust}
                      </Button>
                    )}
                    {row.pending?.approval_request_id && (
                      <Link
                        href={ROUTES.requestDetail(
                          row.pending.approval_request_id,
                        )}
                        className="px-2 text-xs"
                      >
                        {m.openRequest}
                      </Link>
                    )}
                    <Button
                      type="link"
                      size="small"
                      onClick={() => void openHistory(row)}
                    >
                      {m.history}
                    </Button>
                  </Space>
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
        open={Boolean(form)}
        title={
          form?.existing
            ? m.form.titleAdjust(form.existing.subject_name)
            : `${m.form.titleNew} · ${list.period}`
        }
        okText={m.form.submit}
        confirmLoading={busy}
        okButtonProps={{
          disabled:
            !form?.subjectId ||
            form.amount === undefined ||
            (needsApproval && !form.reason.trim()),
        }}
        onOk={() => void save()}
        onCancel={() => {
          setForm(null);
          setError(null);
        }}
        destroyOnHidden
      >
        {form && (
          <div className="space-y-4">
            {error && <Alert type="error" showIcon title={error} />}
            {!form.existing && (
              <>
                <div>
                  <Text className="mb-1 block text-xs">{m.form.scope}</Text>
                  <Segmented
                    value={form.scope}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        scope: value as SalesTargetScope,
                        subjectId: undefined,
                      })
                    }
                    options={[
                      { value: "user", label: m.scopeUser },
                      { value: "org_unit", label: m.scopeUnit },
                    ]}
                  />
                </div>
                <div>
                  <Text className="mb-1 block text-xs">{m.form.subject}</Text>
                  <SearchSelect
                    className="w-full"
                    placeholder={m.form.subjectPlaceholder}
                    value={form.subjectId}
                    onChange={(value?: string) =>
                      setForm({ ...form, subjectId: value })
                    }
                    options={
                      form.scope === "user"
                        ? users.map((user) => ({
                            value: user.id,
                            label: user.position
                              ? `${user.displayName} · ${user.position}`
                              : user.displayName,
                          }))
                        : units.map((unit) => ({
                            value: unit.id,
                            label: unit.name,
                          }))
                    }
                  />
                </div>
              </>
            )}
            <div>
              <Text className="mb-1 block text-xs">{m.form.amount}</Text>
              <InputNumber<number>
                style={{ width: "100%" }}
                min={0}
                step={10000}
                value={form.amount}
                formatter={(value) =>
                  `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => Number((value ?? "").replace(/,/g, ""))}
                onChange={(value) =>
                  setForm({ ...form, amount: value ?? undefined })
                }
              />
            </div>
            {needsApproval && (
              <>
                <Alert type="warning" showIcon title={m.form.approvalNote} />
                <div>
                  <Text className="mb-1 block text-xs">{m.form.reason}</Text>
                  <Input.TextArea
                    rows={3}
                    maxLength={1000}
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                  />
                  <Text type="secondary" className="text-xs">
                    {m.form.reasonRequired}
                  </Text>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Drawer
        open={Boolean(history)}
        size={640}
        title={history ? m.historyTitle(history.row.subject_name) : ""}
        onClose={() => setHistory(null)}
      >
        <Table<SalesTargetRevision>
          rowKey="id"
          size="small"
          loading={history?.rows === null}
          dataSource={history?.rows ?? []}
          pagination={false}
          scroll={{ x: true }}
          columns={[
            {
              title: m.historyColumns.when,
              dataIndex: "created_at",
              render: (value: string) =>
                dayjs(value).format("DD/MM/YYYY HH:mm"),
            },
            { title: m.historyColumns.who, dataIndex: "created_by_name" },
            {
              title: m.historyColumns.from,
              dataIndex: "previous_amount",
              align: "right",
              render: (value: number | null) =>
                value === null ? "—" : baht(value),
            },
            {
              title: m.historyColumns.to,
              dataIndex: "new_amount",
              align: "right",
              render: baht,
            },
            {
              title: m.historyColumns.status,
              dataIndex: "status",
              render: (status: string) => (
                <Tag color={m.revisionColor[status]}>
                  {m.revisionStatus[status] ?? status}
                </Tag>
              ),
            },
            { title: m.historyColumns.reason, dataIndex: "reason" },
          ]}
        />
      </Drawer>
    </div>
  );
}
