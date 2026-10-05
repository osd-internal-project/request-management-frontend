"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  EntitlementListRow,
  ServiceReportPreview,
  ServiceReportRow,
  SeverityFigures,
} from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.service.assets.reports;
const baht = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2 });
const OUTCOME_COLOR: Record<string, string> = { met: "green", missed: "red" };

function presetRange(key: string): [Dayjs, Dayjs] {
  const now = dayjs();
  if (key === "lastMonth") {
    const last = now.subtract(1, "month");
    return [last.startOf("month"), last.endOf("month")];
  }
  if (key === "lastQuarter") {
    const q = Math.floor(now.month() / 3) - 1;
    const start = (
      q < 0 ? now.subtract(1, "year").month(9) : now.month(q * 3)
    ).startOf("month");
    return [start, start.add(2, "month").endOf("month")];
  }
  return [now.startOf("month"), now.endOf("month")];
}

/**
 * CD-247 — a cover's results over a period, live; issued with a PDF and
 * marked when sent to the customer.
 */
export function ServiceReports({ canManage }: { readonly canManage: boolean }) {
  const { message } = App.useApp();
  const [covers, setCovers] = useState<EntitlementListRow[]>([]);
  const [cover, setCover] = useState<string | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(presetRange("lastMonth"));
  const [basis, setBasis] = useState<number | null>(null);
  const [preview, setPreview] = useState<ServiceReportPreview | null>(null);
  const [issued, setIssued] = useState<ServiceReportRow[]>([]);
  const [penalty, setPenalty] = useState<number | null>(null);
  const [penaltyNote, setPenaltyNote] = useState("");
  const [sending, setSending] = useState<{
    row: ServiceReportRow;
    on: Dayjs | null;
    to: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void appApi<EntitlementListRow[]>("service-entitlements?state=all").then(
      (result) => {
        if (live && result.ok) setCovers(result.data);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void appApi<ServiceReportRow[]>(
      `service-reports${cover ? `?entitlement_id=${cover}` : ""}`,
    ).then((result) => {
      if (live && result.ok) setIssued(result.data);
    });
    return () => {
      live = false;
    };
  }, [cover, reload]);

  const query = () => {
    const params = new URLSearchParams({
      entitlement_id: cover ?? "",
      from: range[0].format("YYYY-MM-DD"),
      to: range[1].format("YYYY-MM-DD"),
    });
    if (basis !== null) params.set("basis_amount", String(basis));
    return params;
  };

  async function show() {
    if (!cover) return;
    setBusy(true);
    setError(null);
    const result = await appApi<ServiceReportPreview>(
      `service-reports/preview?${query().toString()}`,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPreview(result.data);
    setPenalty(result.data.penalty.estimate.amount);
  }

  async function issue() {
    if (!cover) return;
    setBusy(true);
    setError(null);
    const result = await appApi<ServiceReportRow>("service-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entitlement_id: cover,
        from: range[0].format("YYYY-MM-DD"),
        to: range[1].format("YYYY-MM-DD"),
        ...(basis !== null ? { basis_amount: basis } : {}),
        ...(penalty !== null ? { penalty_amount: penalty } : {}),
        ...(penaltyNote.trim() ? { penalty_note: penaltyNote.trim() } : {}),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setReload((n) => n + 1);
  }

  async function markSent() {
    if (!sending?.on) return;
    setBusy(true);
    const result = await appApi<ServiceReportRow>(
      `service-reports/${sending.row.id}/sent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sent_on: sending.on.format("YYYY-MM-DD"),
          sent_to: sending.to,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.saved);
    setSending(null);
    setReload((n) => n + 1);
  }

  const rate = (row: SeverityFigures, which: "response" | "resolution") =>
    which === "response"
      ? m.rate(
          row.responseMet,
          row.responseMet + row.responseMissed,
          row.responsePct,
        )
      : m.rate(
          row.resolutionMet,
          row.resolutionMet + row.resolutionMissed,
          row.resolutionPct,
        );
  const terms = preview?.penalty.terms;

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[2fr_2fr_1fr_auto]">
        <label className="block text-xs">
          {m.cover}
          <Select
            className="w-full"
            showSearch={{ optionFilterProp: "label" }}
            value={cover ?? undefined}
            options={covers.map((row) => ({
              value: row.id,
              label: [row.customer?.name, row.title]
                .filter(Boolean)
                .join(" · "),
            }))}
            onChange={(value: string) => {
              setCover(value);
              setPreview(null);
            }}
          />
        </label>
        <label className="block text-xs">
          {m.period}
          <DatePicker.RangePicker
            className="w-full"
            format="DD/MM/YYYY"
            value={range}
            onChange={(value) => {
              if (value?.[0] && value[1]) setRange([value[0], value[1]]);
            }}
            presets={(["thisMonth", "lastMonth", "lastQuarter"] as const).map(
              (key) => ({ label: m.presets[key], value: presetRange(key) }),
            )}
          />
        </label>
        <label className="block text-xs">
          {m.basis}
          <InputNumber
            className="w-full"
            min={0}
            value={basis}
            onChange={(value) => setBasis(value)}
          />
        </label>
        <Button
          type="primary"
          className="self-end"
          loading={busy}
          disabled={!cover}
          onClick={() => void show()}
        >
          {m.show}
        </Button>
      </div>

      {preview && (
        <div className="mb-4 space-y-3">
          <Table<SeverityFigures>
            size="small"
            rowKey="severity"
            pagination={false}
            dataSource={preview.figures}
            columns={[
              {
                title: m.columns.severity,
                render: (_: unknown, row) => (
                  <Text strong={row.severity === "all"}>
                    {m.severities[row.severity] ?? row.severity}
                  </Text>
                ),
              },
              { title: m.columns.jobs, dataIndex: "jobs", width: 70 },
              {
                title: m.columns.response,
                render: (_: unknown, row) => rate(row, "response"),
              },
              {
                title: m.columns.resolution,
                render: (_: unknown, row) => rate(row, "resolution"),
              },
              { title: m.columns.open, dataIndex: "open", width: 90 },
            ]}
          />
          <Text strong className="block text-sm">
            {m.missed}
          </Text>
          <Table
            size="small"
            rowKey="requestId"
            pagination={false}
            dataSource={preview.jobs.filter(
              (job) => job.resolution === "missed" || job.response === "missed",
            )}
            scroll={{ x: 700 }}
            columns={[
              {
                title: m.columns.request,
                width: 150,
                render: (_: unknown, row) => (
                  <Link href={ROUTES.requestDetail(row.requestId)}>
                    {row.requestNo ?? row.requestId.slice(0, 8)}
                  </Link>
                ),
              },
              { title: m.columns.subject, dataIndex: "subject" },
              {
                title: m.columns.severity,
                width: 90,
                render: (_: unknown, row) =>
                  m.severities[row.severity ?? ""] ?? row.severity,
              },
              {
                title: m.columns.response,
                width: 110,
                render: (_: unknown, row) => (
                  <Tag color={OUTCOME_COLOR[row.response]}>
                    {m.outcome[row.response]}
                  </Tag>
                ),
              },
              {
                title: m.columns.resolution,
                width: 110,
                render: (_: unknown, row) => (
                  <Tag color={OUTCOME_COLOR[row.resolution]}>
                    {m.outcome[row.resolution]}
                  </Tag>
                ),
              },
              { title: m.columns.late, dataIndex: "lateHours", width: 90 },
            ]}
          />
          <Text className="block text-sm">
            {m.pm(
              preview.pm.due,
              preview.pm.done,
              preview.pm.skipped,
              preview.pm.overdue,
            )}
          </Text>

          <Card size="small" title={m.penaltyTitle}>
            {terms?.ratePct && terms.period ? (
              <Text className="block text-xs">
                {m.terms(
                  terms.ratePct,
                  m.periods[terms.period] ?? terms.period,
                )}
                {" · "}
                {preview.penalty.estimate.amount === null
                  ? m.needBasis
                  : m.estimate(
                      baht(preview.penalty.estimate.amount),
                      preview.penalty.estimate.units,
                      preview.penalty.estimate.capped,
                    )}
              </Text>
            ) : (
              <Text type="secondary" className="block text-xs">
                {m.noTerms}
              </Text>
            )}
            {canManage && (
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_2fr_auto]">
                <InputNumber
                  className="w-full"
                  min={0}
                  placeholder={m.confirmPenalty}
                  value={penalty}
                  onChange={(value) => setPenalty(value)}
                />
                <Input
                  placeholder={m.penaltyNote}
                  maxLength={1000}
                  value={penaltyNote}
                  onChange={(event) => setPenaltyNote(event.target.value)}
                />
                <Popconfirm title={m.issueAsk} onConfirm={() => void issue()}>
                  <Button type="primary" loading={busy}>
                    {m.issue}
                  </Button>
                </Popconfirm>
              </div>
            )}
          </Card>
        </div>
      )}

      <Text strong className="mb-1 block">
        {m.issued}
      </Text>
      <Table<ServiceReportRow>
        size="small"
        rowKey="id"
        pagination={issued.length > 20 ? { pageSize: 20 } : false}
        dataSource={issued}
        locale={{ emptyText: m.noIssued }}
        scroll={{ x: 900 }}
        columns={[
          { title: m.columns.reportNo, dataIndex: "reportNo", width: 130 },
          {
            title: m.cover,
            render: (_: unknown, row) =>
              [row.customer?.name, row.entitlementTitle]
                .filter(Boolean)
                .join(" · "),
          },
          {
            title: m.columns.period,
            width: 190,
            render: (_: unknown, row) =>
              `${dayjs(row.periodFrom).format("DD/MM/YY")} – ${dayjs(row.periodTo).format("DD/MM/YY")}`,
          },
          {
            title: m.columns.resolution,
            width: 120,
            render: (_: unknown, row) =>
              row.resolutionPct === null ? "—" : `${row.resolutionPct}%`,
          },
          {
            title: m.columns.penalty,
            width: 120,
            render: (_: unknown, row) =>
              row.penaltyAmount === null ? "—" : baht(row.penaltyAmount),
          },
          {
            title: m.columns.sent,
            width: 220,
            render: (_: unknown, row) =>
              row.sentOn ? (
                <span>
                  {dayjs(row.sentOn).format("DD/MM/YYYY")}
                  <Text type="secondary" className="block text-xs">
                    {row.sentTo}
                  </Text>
                </span>
              ) : (
                <Space>
                  <Tag>{m.notSent}</Tag>
                  {canManage && (
                    <Button
                      size="small"
                      onClick={() => setSending({ row, on: dayjs(), to: "" })}
                    >
                      {m.markSent}
                    </Button>
                  )}
                </Space>
              ),
          },
          {
            title: "",
            width: 70,
            render: (_: unknown, row) => (
              <a
                href={`/api/app/service-reports/${row.id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                {m.pdf}
              </a>
            ),
          },
        ]}
      />

      <Modal
        open={sending !== null}
        title={m.markSent}
        onCancel={() => setSending(null)}
        confirmLoading={busy}
        okButtonProps={{ disabled: !sending?.on || !sending.to.trim() }}
        onOk={() => void markSent()}
        destroyOnHidden
      >
        {sending && (
          <div className="space-y-3">
            <label className="block text-xs">
              {m.sentOn}
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY"
                value={sending.on}
                onChange={(value) => setSending({ ...sending, on: value })}
              />
            </label>
            <label className="block text-xs">
              {m.sentTo}
              <Input
                maxLength={255}
                value={sending.to}
                onChange={(event) =>
                  setSending({ ...sending, to: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
