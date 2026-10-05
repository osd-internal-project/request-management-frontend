"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
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
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ErpVendorRow, ServiceClaim } from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.service.assets.claims;

const STATUS_COLOR: Record<string, string> = {
  sent: "blue",
  replaced: "green",
  credited: "green",
  rejected: "red",
};

/** The steps each status may take next. */
const NEXT: Record<string, string[]> = {
  pending: ["sent", "cancelled"],
  sent: ["replaced", "credited", "rejected", "cancelled"],
};

/** Suppliers from SAP, loaded once per open. */
function useVendors(open: boolean) {
  const [vendors, setVendors] = useState<ErpVendorRow[]>([]);
  useEffect(() => {
    if (!open) return;
    let live = true;
    void appApi<ErpVendorRow[]>("service-claims/vendors").then((result) => {
      if (live && result.ok) setVendors(result.data);
    });
    return () => {
      live = false;
    };
  }, [open]);
  return vendors;
}

interface Stepping {
  claim: ServiceClaim;
  to: string;
  rma: string;
  sentOn: Dayjs | null;
  expectedOn: Dayjs | null;
  resolvedOn: Dayjs | null;
  replacementSerial: string;
  creditAmount: number | null;
  note: string;
}

const fmt = (value: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "—";
const iso = (value: Dayjs | null) => value?.format("YYYY-MM-DD");

/**
 * CD-245 — claims to suppliers: the register (or one job's), each moved on
 * a step at a time.
 */
export function Claims({
  canManage,
  workOrderId,
  reload: outerReload = 0,
}: {
  readonly canManage: boolean;
  /** One job's claims, compact, inside its panel. */
  readonly workOrderId?: string;
  readonly reload?: number;
}) {
  const { message } = App.useApp();
  const [state, setState] = useState(workOrderId ? "all" : "open");
  const [reload, setReload] = useState(0);
  const key = `${state}|${workOrderId ?? ""}|${reload}|${outerReload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: ServiceClaim[];
    error: string | null;
  } | null>(null);
  const [stepping, setStepping] = useState<Stepping | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const [current, order] = key.split("|");
    const params = new URLSearchParams({ state: current });
    if (order) params.set("work_order_id", order);
    void appApi<ServiceClaim[]>(`service-claims?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { key, rows: result.data, error: null }
            : { key, rows: [], error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  async function save() {
    if (!stepping) return;
    setBusy(true);
    setError(null);
    const result = await appApi<ServiceClaim>(
      `service-claims/${stepping.claim.id}/step`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: stepping.to,
          ...(stepping.to === "sent"
            ? {
                rma_no: stepping.rma.trim() || null,
                sent_on: iso(stepping.sentOn),
                expected_on: iso(stepping.expectedOn) ?? null,
              }
            : {}),
          ...(["replaced", "credited", "rejected"].includes(stepping.to)
            ? { resolved_on: iso(stepping.resolvedOn) }
            : {}),
          ...(stepping.to === "replaced"
            ? { replacement_serial: stepping.replacementSerial.trim() || null }
            : {}),
          ...(stepping.to === "credited"
            ? { credit_amount: stepping.creditAmount }
            : {}),
          outcome_note: stepping.note.trim() || null,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setStepping(null);
    setReload((n) => n + 1);
  }

  const rows = loaded?.key === key ? loaded.rows : [];

  const table = (
    <>
      {loaded?.key === key && loaded.error && (
        <Alert className="mb-2" type="error" showIcon title={loaded.error} />
      )}
      <Table<ServiceClaim>
        rowKey="id"
        size="small"
        loading={!loaded || loaded.key !== key}
        dataSource={rows}
        pagination={rows.length > 30 ? { pageSize: 30 } : false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 900 }}
        columns={[
          {
            title: m.columns.item,
            render: (_: unknown, row) =>
              [row.productCode, row.description].filter(Boolean).join(" · "),
          },
          {
            title: m.columns.serial,
            width: 130,
            render: (_: unknown, row) => row.serialNo ?? "",
          },
          {
            title: m.columns.vendor,
            width: 180,
            render: (_: unknown, row) => (
              <span>
                {row.vendorName}
                {row.rmaNo && (
                  <Text type="secondary" className="block text-xs">
                    {m.rma} {row.rmaNo}
                  </Text>
                )}
              </span>
            ),
          },
          {
            title: m.columns.dates,
            width: 170,
            render: (_: unknown, row) =>
              `${fmt(row.sentOn)} / ${fmt(row.expectedOn)}`,
          },
          {
            title: m.columns.status,
            width: 160,
            render: (_: unknown, row) => (
              <Space size={4} wrap>
                <Tag color={STATUS_COLOR[row.status]}>
                  {m.status[row.status]}
                </Tag>
                {row.overdue && <Tag color="red">{m.overdue}</Tag>}
              </Space>
            ),
          },
          ...(workOrderId
            ? []
            : [
                {
                  title: m.columns.request,
                  width: 150,
                  render: (_: unknown, row: ServiceClaim) =>
                    row.requestId ? (
                      <Link href={ROUTES.requestDetail(row.requestId)}>
                        {row.requestNo ?? row.requestId.slice(0, 8)}
                      </Link>
                    ) : null,
                },
              ]),
          ...(canManage
            ? [
                {
                  title: "",
                  width: 150,
                  render: (_: unknown, row: ServiceClaim) =>
                    NEXT[row.status] ? (
                      <Select
                        size="small"
                        className="w-full"
                        placeholder="…"
                        value={null}
                        options={NEXT[row.status].map((to) => ({
                          value: to,
                          label: m.steps[to],
                        }))}
                        onChange={(to: string) => {
                          setError(null);
                          setStepping({
                            claim: row,
                            to,
                            rma: row.rmaNo ?? "",
                            sentOn: dayjs(),
                            expectedOn: null,
                            resolvedOn: dayjs(),
                            replacementSerial: "",
                            creditAmount: null,
                            note: "",
                          });
                        }}
                      />
                    ) : null,
                },
              ]
            : []),
        ]}
      />
      <Modal
        open={stepping !== null}
        title={stepping ? m.steps[stepping.to] : ""}
        onCancel={() => setStepping(null)}
        okText={m.save}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {stepping && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            {stepping.to === "sent" && (
              <>
                <label className="block text-xs">
                  {m.rma}
                  <Input
                    maxLength={100}
                    value={stepping.rma}
                    onChange={(event) =>
                      setStepping({ ...stepping, rma: event.target.value })
                    }
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs">
                    {m.sentOn}
                    <DatePicker
                      className="w-full"
                      format="DD/MM/YYYY"
                      value={stepping.sentOn}
                      onChange={(value) =>
                        setStepping({ ...stepping, sentOn: value })
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    {m.expectedOn}
                    <DatePicker
                      className="w-full"
                      format="DD/MM/YYYY"
                      value={stepping.expectedOn}
                      onChange={(value) =>
                        setStepping({ ...stepping, expectedOn: value })
                      }
                    />
                  </label>
                </div>
              </>
            )}
            {["replaced", "credited", "rejected"].includes(stepping.to) && (
              <label className="block text-xs">
                {m.resolvedOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={stepping.resolvedOn}
                  onChange={(value) =>
                    setStepping({ ...stepping, resolvedOn: value })
                  }
                />
              </label>
            )}
            {stepping.to === "replaced" && (
              <label className="block text-xs">
                {m.replacementSerial}
                <Input
                  maxLength={100}
                  value={stepping.replacementSerial}
                  onChange={(event) =>
                    setStepping({
                      ...stepping,
                      replacementSerial: event.target.value,
                    })
                  }
                />
              </label>
            )}
            {stepping.to === "credited" && (
              <label className="block text-xs">
                {m.creditAmount}
                <InputNumber
                  className="w-full"
                  min={0}
                  value={stepping.creditAmount}
                  onChange={(value) =>
                    setStepping({ ...stepping, creditAmount: value })
                  }
                />
              </label>
            )}
            <label className="block text-xs">
              {m.outcomeNote}
              <Input.TextArea
                rows={2}
                maxLength={1000}
                value={stepping.note}
                onChange={(event) =>
                  setStepping({ ...stepping, note: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </>
  );

  if (workOrderId) {
    return rows.length ? (
      <div className="mt-3">
        <Text strong className="mb-1 block text-xs">
          {m.title}
        </Text>
        {table}
      </div>
    ) : null;
  }

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      <Select
        className="mb-3"
        style={{ width: 200 }}
        value={state}
        onChange={setState}
        options={Object.entries(m.states).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      {table}
    </Card>
  );
}

/**
 * CD-245 — on a job's panel: swap the customer's unit (same asset, new
 * serial) and, optionally, put the faulty one onto a claim.
 */
export function ReplaceUnitButton({
  assetId,
  oldSerial,
  workOrderId,
  onDone,
}: {
  readonly assetId: string;
  readonly oldSerial: string | null;
  readonly workOrderId: string;
  readonly onDone: () => void;
}) {
  const r = m.replace;
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [serial, setSerial] = useState("");
  const [reason, setReason] = useState("");
  const [claim, setClaim] = useState(true);
  const [vendor, setVendor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vendors = useVendors(open);

  async function save() {
    setBusy(true);
    setError(null);
    const picked = vendors.find((row) => row.code === vendor);
    const result = await appApi<{
      oldSerial: string | null;
      newSerial: string;
    }>(`service-claims/replace/${assetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_serial: serial,
        reason,
        work_order_id: workOrderId,
        ...(claim && picked
          ? { claim: { vendor_code: picked.code, vendor_name: picked.name } }
          : {}),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(
      r.done(result.data.oldSerial ?? "—", result.data.newSerial),
    );
    setOpen(false);
    onDone();
  }

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        {r.button}
      </Button>
      <Modal
        open={open}
        title={r.title}
        onCancel={() => setOpen(false)}
        okText={r.save}
        confirmLoading={busy}
        okButtonProps={{
          disabled: !serial.trim() || !reason.trim() || (claim && !vendor),
        }}
        onOk={() => void save()}
        destroyOnHidden
      >
        <div className="space-y-3">
          {error && <Alert type="error" showIcon title={error} />}
          <Text type="secondary" className="block text-xs">
            {r.hint} ({oldSerial ?? "—"})
          </Text>
          <label className="block text-xs">
            {r.newSerial}
            <Input
              maxLength={100}
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
            />
          </label>
          <label className="block text-xs">
            {r.reason}
            <Input
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <Checkbox
            checked={claim}
            onChange={(event) => setClaim(event.target.checked)}
          >
            {r.claim}
          </Checkbox>
          {claim && (
            <label className="block text-xs">
              {r.vendor}
              <Select
                className="w-full"
                showSearch={{ optionFilterProp: "label" }}
                value={vendor ?? undefined}
                options={vendors.map((row) => ({
                  value: row.code,
                  label: `${row.code} · ${row.name}`,
                }))}
                onChange={(value: string) => setVendor(value)}
              />
            </label>
          )}
        </div>
      </Modal>
    </>
  );
}
