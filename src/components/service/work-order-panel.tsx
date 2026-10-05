"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type { OnCallDispatch, WorkOrder } from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { EntitlementFacts } from "./entitlements";
import { ServiceBillingCard } from "./service-billing-card";
import { TimeMaterialsCard } from "./time-materials-card";
import { Claims, ReplaceUnitButton } from "./claims";
import { ProblemBanner } from "./problems";
import { SurveyCard } from "./surveys";

const m = messages.service.assets.workOrders;

const STARTED = [
  "in_progress",
  "on_hold",
  "pending_approval",
  "completed",
  "closed",
  "cancelled",
  "rejected",
  "approved",
];

/**
 * CD-239 — on a case's page: its service side, decided before work starts
 * (in contract or billed, and a billed job's consent), and its cause and fix
 * before it closes. A case with none yet may be made one (`canManage`).
 */
export function WorkOrderPanel({
  requestId,
  status,
  canManage,
}: {
  readonly requestId: string;
  readonly status: string;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [order, setOrder] = useState<WorkOrder | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  const [onCall, setOnCall] = useState<OnCallDispatch | null>(null);
  const [billing, setBilling] = useState<string | null>(null);
  const [entitlementId, setEntitlementId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [ack, setAck] = useState<{
    name: string;
    on: Dayjs | null;
    estimate: number | null;
  }>({ name: "", on: dayjs(), estimate: null });
  const [outcome, setOutcome] = useState({ cause: "", resolution: "" });
  const [kind, setKind] = useState("corrective");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<WorkOrder | null>(
      `service-work-orders/by-request/${requestId}`,
    ).then((result) => {
      if (!live) return;
      const data = result.ok ? result.data : null;
      setOrder(data);
      if (data) {
        setBilling(data.billing ?? data.suggestedBilling);
        setEntitlementId(
          data.entitlement?.id ?? data.suggestedEntitlement?.id ?? null,
        );
        setOutcome({
          cause: data.cause ?? "",
          resolution: data.resolution ?? "",
        });
      }
    });
    // CD-241 — sent to the out-of-hours rota
    void appApi<OnCallDispatch | null>(
      `service-on-call/by-request/${requestId}`,
    ).then((result) => {
      if (live && result.ok) setOnCall(result.data);
    });
    return () => {
      live = false;
    };
  }, [requestId, version]);

  async function send(path: string, method: string, body: unknown) {
    setBusy(true);
    setError(null);
    const result = await appApi<WorkOrder>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setOrder(result.data);
    router.refresh();
  }

  if (order === undefined) return null;
  const started = STARTED.includes(status);

  if (order === null) {
    if (!canManage || started) return null;
    return (
      <Card size="small" title={m.title}>
        {error && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        <Space wrap>
          <Select
            value={kind}
            style={{ width: 160 }}
            options={Object.entries(m.kinds).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={setKind}
          />
          <Button
            loading={busy}
            onClick={() =>
              void send(`service-work-orders/attach/${requestId}`, "POST", {
                work_kind: kind,
              })
            }
          >
            {m.attach}
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <span>
          {m.title} <Tag>{m.kinds[order.workKind]}</Tag>
          {order.asset && (
            <Text type="secondary" className="text-xs">
              {[order.asset.name, order.asset.serialNo, order.asset.location]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          {/* CD-245 — swap the unit, the faulty one onto a claim */}
          {order.asset && canManage && (
            <span className="ml-2">
              <ReplaceUnitButton
                assetId={order.asset.id}
                oldSerial={order.asset.serialNo}
                workOrderId={order.id}
                onDone={() => setVersion((n) => n + 1)}
              />
            </span>
          )}
        </span>
      }
    >
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {/* CD-246 — the problem it is under, or open ones it matches */}
      <ProblemBanner workOrderId={order.id} canManage={canManage} />
      {onCall && (
        <Text type="secondary" className="mb-2 block text-xs">
          {m.onCallSent(
            onCall.name,
            messages.service.assets.onCall.levels[onCall.level],
            dayjs(onCall.sentAt).format("DD/MM/YYYY HH:mm"),
          )}
          {onCall.escalatedAt &&
            ` · ${m.onCallEscalated(
              onCall.escalatedFromName ?? "",
              dayjs(onCall.escalatedAt).format("DD/MM/YYYY HH:mm"),
            )}`}
        </Text>
      )}
      {order.startBlocker && !started && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={m.startBlocked}
          description={order.startBlocker}
        />
      )}

      <Text className="block text-sm">
        {m.suggested(m.billing[order.suggestedBilling])}
        {order.suggestionNote && (
          <Text type="secondary" className="text-xs">
            {" "}
            · {order.suggestionNote}
          </Text>
        )}
      </Text>
      <Text strong className="mb-2 block text-sm">
        {order.billing ? m.decided(m.billing[order.billing]) : m.notDecided}
        {order.entitlement?.title && ` · ${order.entitlement.title}`}
        {order.billingReason && (
          <Text type="secondary" className="text-xs">
            {" "}
            ({order.billingReason})
          </Text>
        )}
      </Text>

      {/* CD-240 — the levels the case's clock runs on */}
      {(() => {
        const used =
          order.billing === "billable"
            ? null
            : (order.cover ?? []).find(
                (row) =>
                  row.id ===
                  (order.entitlement?.id ?? order.suggestedEntitlement?.id),
              );
        return (
          <div className="mb-3">
            <Text type="secondary" className="block text-xs">
              {used ? m.clockLevels : m.clockType}
            </Text>
            {used && <EntitlementFacts row={used} />}
          </div>
        );
      })()}

      {canManage && !started && (
        <div className="mb-3 space-y-2">
          <Radio.Group
            value={billing}
            onChange={(event) => setBilling(event.target.value as string)}
            options={Object.entries(m.billing).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          {billing === "in_contract" && (order.cover?.length ?? 0) > 0 && (
            <Select
              className="w-full"
              value={entitlementId ?? undefined}
              placeholder={m.entitlement}
              options={(order.cover ?? []).map((row) => ({
                value: row.id,
                label: row.title,
              }))}
              onChange={(value: string) => setEntitlementId(value)}
            />
          )}
          {billing !== order.suggestedBilling && (
            <Input
              placeholder={m.reasonNeeded}
              value={reason}
              maxLength={1000}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() =>
              void send(`service-work-orders/${order.id}/billing`, "POST", {
                billing,
                ...(billing === "in_contract" && entitlementId
                  ? { entitlement_id: entitlementId }
                  : {}),
                ...(reason.trim() ? { reason } : {}),
              })
            }
          >
            {m.confirm}
          </Button>
        </div>
      )}

      {order.billing === "billable" &&
        (order.ack ? (
          <Text className="mb-2 block text-sm">
            {m.ackDone(
              order.ack.name ?? "",
              order.ack.on ?? "",
              order.ack.estimate === null
                ? ""
                : order.ack.estimate.toLocaleString("th-TH"),
            )}
          </Text>
        ) : (
          canManage &&
          !started && (
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <Input
                placeholder={m.ackName}
                value={ack.name}
                maxLength={200}
                onChange={(event) =>
                  setAck({ ...ack, name: event.target.value })
                }
              />
              <DatePicker
                format="DD/MM/YYYY"
                value={ack.on}
                disabledDate={(value) => value.isAfter(dayjs(), "day")}
                onChange={(value) => setAck({ ...ack, on: value })}
              />
              <InputNumber
                className="w-full"
                min={0}
                placeholder={m.ackEstimate}
                value={ack.estimate}
                onChange={(value) => setAck({ ...ack, estimate: value })}
              />
              <Button
                loading={busy}
                onClick={() =>
                  void send(
                    `service-work-orders/${order.id}/customer-ack`,
                    "POST",
                    {
                      name: ack.name,
                      on: ack.on?.format("YYYY-MM-DD") ?? "",
                      estimate: ack.estimate,
                    },
                  )
                }
              >
                {m.ack}
              </Button>
            </div>
          )
        ))}

      <Text strong className="block text-xs">
        {m.outcome}
      </Text>
      {order.closeBlocker && started && (
        <Text type="warning" className="block text-xs">
          {m.closeBlocked}: {order.closeBlocker}
        </Text>
      )}
      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input.TextArea
          rows={2}
          placeholder={m.cause}
          maxLength={4000}
          value={outcome.cause}
          onChange={(event) =>
            setOutcome({ ...outcome, cause: event.target.value })
          }
        />
        <Input.TextArea
          rows={2}
          placeholder={m.resolution}
          maxLength={4000}
          value={outcome.resolution}
          onChange={(event) =>
            setOutcome({ ...outcome, resolution: event.target.value })
          }
        />
      </div>
      <Button
        className="mt-2"
        size="small"
        loading={busy}
        onClick={() =>
          void send(`service-work-orders/${order.id}/outcome`, "PUT", outcome)
        }
      >
        {m.saveOutcome}
      </Button>

      {/* CD-245 — this job's claims to suppliers */}
      <Claims canManage={canManage} workOrderId={order.id} reload={version} />

      {/* CD-243 — the job's time (timesheets) and materials */}
      <TimeMaterialsCard
        workOrderId={order.id}
        billable={order.billing === "billable"}
      />

      {/* CD-248 — the customer's rating, once the job is done */}
      {["completed", "approved", "closed"].includes(status) && (
        <SurveyCard workOrderId={order.id} canManage={canManage} />
      )}

      {/* CD-242 — a billed job, once done: its charge to SAP */}
      {order.billing === "billable" &&
        ["completed", "approved", "closed"].includes(status) && (
          <ServiceBillingCard workOrderId={order.id} canManage={canManage} />
        )}
    </Card>
  );
}
