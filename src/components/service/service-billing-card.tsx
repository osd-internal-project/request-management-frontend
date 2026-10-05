"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import {
  SaleOrderLinesEditor,
  draftLinesTotal,
  newSaleOrderLine,
  toSaleOrderLinePayload,
  type SaleOrderDraftLine,
} from "@/components/crm/sale-orders/sale-order-lines-editor";
import { appApi } from "@/lib/api/client";
import type { ServiceBilling } from "@/lib/api/service";
import { messages } from "@/lib/messages";

const m = messages.service.assets.billing;
const baht = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2 });

export const ERP_COLOR: Record<string, string> = {
  synced: "green",
  pending: "blue",
  failed: "red",
  not_ready: "orange",
};

function toDraft(billing: ServiceBilling): SaleOrderDraftLine[] {
  return billing.lines.map((line) => ({
    ...newSaleOrderLine(),
    productCode: line.productCode ?? "",
    description: line.description,
    quantity: line.quantity,
    unit: line.unit ?? "",
    unitPrice: line.unitPrice,
    discountPct: line.discountPct || null,
  }));
}

/** Where the charge stands in SAP: queued, failed, a draft, an invoice, paid. */
export function ErpBillingState({
  billing,
}: {
  readonly billing: ServiceBilling;
}) {
  const { erp } = billing;
  return (
    <Space size={4} wrap>
      {billing.status !== "draft" && (
        <Tag color={ERP_COLOR[erp.status]}>
          {m.erpStatus[erp.status] ?? erp.status}
        </Tag>
      )}
      {erp.invoiceStatus && (
        <Tag color={erp.invoiceStatus === "paid" ? "green" : undefined}>
          {m.invoiceStatus[erp.invoiceStatus] ?? erp.invoiceStatus}
        </Tag>
      )}
      {erp.invoiceNo && (
        <Text className="text-xs">{m.invoiceNo(erp.invoiceNo)}</Text>
      )}
      {erp.invoiceTotal !== null && (
        <Text className="text-xs">
          {m.paid(baht(erp.paid ?? 0), baht(erp.invoiceTotal))}
        </Text>
      )}
    </Space>
  );
}

/**
 * CD-242 — on a billed, finished job's panel: its charge, prepared from the
 * customer's agreed estimate, edited, confirmed to SAP as a draft invoice,
 * and what SAP says since.
 */
export function ServiceBillingCard({
  workOrderId,
  canManage,
}: {
  readonly workOrderId: string;
  readonly canManage: boolean;
}) {
  const { message } = App.useApp();
  const [billing, setBilling] = useState<ServiceBilling | null | undefined>(
    undefined,
  );
  const [lines, setLines] = useState<SaleOrderDraftLine[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  function take(data: ServiceBilling | null) {
    setBilling(data);
    if (data) {
      setLines(toDraft(data));
      setNote(data.note ?? "");
    }
  }

  useEffect(() => {
    let live = true;
    void appApi<ServiceBilling | null>(
      `service-billings/by-work-order/${workOrderId}`,
    ).then((result) => {
      if (!live) return;
      const data = result.ok ? result.data : null;
      setBilling(data);
      if (data) {
        setLines(toDraft(data));
        setNote(data.note ?? "");
      }
    });
    return () => {
      live = false;
    };
  }, [workOrderId]);

  async function send(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const result = await appApi<ServiceBilling>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(m.saved);
    take(result.data);
    return true;
  }

  if (billing === undefined) return null;

  if (billing === null) {
    if (!canManage) return null;
    return (
      <div className="mt-3">
        {error && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        <Button
          loading={busy}
          onClick={() =>
            void send("service-billings", "POST", {
              work_order_id: workOrderId,
            })
          }
        >
          {m.prepare}
        </Button>
      </div>
    );
  }

  const editable = canManage && billing.status === "draft";

  return (
    <Card
      size="small"
      className="mt-3"
      title={
        <Space wrap>
          {m.title}
          <Tag>{m.status[billing.status]}</Tag>
          <Text type="secondary" className="text-xs">
            {m.reference} {billing.reference}
          </Text>
        </Space>
      }
    >
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {billing.erp.lastError && billing.erp.status !== "synced" && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={billing.erp.lastError}
        />
      )}
      {editable ? (
        <>
          <SaleOrderLinesEditor lines={lines} onChange={setLines} />
          <Input
            className="mt-2"
            placeholder={m.note}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Text strong className="mt-2 block text-sm">
            {m.total(baht(draftLinesTotal(lines)))}
          </Text>
        </>
      ) : (
        <>
          <Table
            size="small"
            rowKey="lineNo"
            pagination={false}
            dataSource={billing.lines}
            scroll={{ x: 600 }}
            columns={[
              { title: "#", dataIndex: "lineNo", width: 40 },
              { title: "", dataIndex: "productCode", width: 110 },
              { title: "", dataIndex: "description" },
              { title: "", dataIndex: "quantity", width: 70, align: "right" },
              {
                title: "",
                dataIndex: "lineTotal",
                width: 120,
                align: "right",
                render: (value: number) => baht(value),
              },
            ]}
            showHeader={false}
          />
          <Text strong className="mt-2 block text-sm">
            {m.total(baht(billing.netTotal))}
          </Text>
          {billing.note && (
            <Text type="secondary" className="block text-xs">
              {billing.note}
            </Text>
          )}
        </>
      )}

      <div className="mt-2">
        <ErpBillingState billing={billing} />
        {billing.erp.checkedAt && (
          <Text type="secondary" className="block text-xs">
            {m.checkedAt(
              dayjs(billing.erp.checkedAt).format("DD/MM/YYYY HH:mm"),
            )}
          </Text>
        )}
        {billing.cancelReason && (
          <Text type="secondary" className="block text-xs">
            {m.cancelReason}: {billing.cancelReason}
          </Text>
        )}
      </div>

      <Space wrap className="mt-3">
        {editable && (
          <>
            <Button
              loading={busy}
              onClick={() =>
                void send(`service-billings/${billing.id}`, "PUT", {
                  lines: lines.map(toSaleOrderLinePayload),
                  note: note.trim() || null,
                })
              }
            >
              {m.save}
            </Button>
            <Popconfirm
              title={messages.service.assets.timeMaterials.pullHint}
              onConfirm={() =>
                void send(`service-billings/${billing.id}/pull`, "POST")
              }
            >
              <Button loading={busy}>
                {messages.service.assets.timeMaterials.pull}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={m.confirmAsk}
              onConfirm={() =>
                void send(`service-billings/${billing.id}/confirm`, "POST")
              }
            >
              <Button type="primary" loading={busy}>
                {m.confirm}
              </Button>
            </Popconfirm>
          </>
        )}
        {billing.erp.draftNo && billing.status === "confirmed" && (
          <Button
            loading={busy}
            onClick={() =>
              void send(`service-billings/${billing.id}/refresh`, "POST")
            }
          >
            {m.refresh}
          </Button>
        )}
        {canManage &&
          billing.status !== "cancelled" &&
          !["open", "paid"].includes(billing.erp.invoiceStatus ?? "") && (
            <Button danger onClick={() => setCancelling("")}>
              {m.cancel}
            </Button>
          )}
      </Space>

      <Modal
        open={cancelling !== null}
        title={m.cancel}
        onCancel={() => setCancelling(null)}
        confirmLoading={busy}
        okButtonProps={{ danger: true, disabled: !cancelling?.trim() }}
        onOk={() =>
          void send(`service-billings/${billing.id}/cancel`, "POST", {
            reason: cancelling ?? "",
          }).then((ok) => ok && setCancelling(null))
        }
        destroyOnHidden
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder={m.cancelReason}
          value={cancelling ?? ""}
          onChange={(event) => setCancelling(event.target.value)}
        />
      </Modal>
    </Card>
  );
}
