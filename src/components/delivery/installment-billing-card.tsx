"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { CheckCircleFilled, StopOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.delivery.billing;

interface Installment {
  seq: number;
  kind: string;
  kindLabel: string;
  label: string;
  amount: number;
  dueOn: string | null;
  milestone: { id: string; title: string; status: string } | null;
  reference: string;
  blockers: string[];
  exceptionable: boolean;
  invoice: {
    status: string;
    confirmedAt: string | null;
    cancelReason: string | null;
    exceptionStatus: string;
    exceptionReason: string | null;
    exceptionRequestId: string | null;
    erpStatus: string;
    erpLastError: string | null;
    erpInvoiceStatus: string | null;
    erpInvoiceNo: string | null;
    erpPaid: number | null;
  } | null;
}

interface View {
  contract: {
    id: string;
    contractNo: string;
    currency: string;
    signedOn: string | null;
  };
  canBill: boolean;
  exceptionTypeSet: boolean;
  installments: Installment[];
}

const money = (value: number) =>
  value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * CD-253 — the contract's installments: what still blocks billing each,
 * sending it to SAP as a draft invoice once nothing does, and what finance
 * did with it (posted, paid). Open points of a conditional acceptance can be
 * lifted by an executive's exception.
 */
export function InstallmentBillingCard({ projectId }: { projectId: string }) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    view: View | null;
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<{
    inst: Installment;
    mode: "send" | "cancel" | "exception";
    text: string;
  } | null>(null);
  const base = `delivery/projects/${projectId}/billing`;

  useEffect(() => {
    let live = true;
    void appApi<View>(base).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { view: result.data, error: null }
          : { view: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [base, version]);

  const view = loaded?.view ?? null;

  async function submit() {
    if (!action) return;
    setBusy(true);
    const result = await appApi<View>(
      `${base}/${action.inst.seq}/${action.mode}`,
      {
        method: "POST",
        body: JSON.stringify(
          action.mode === "send"
            ? { note: action.text.trim() }
            : { reason: action.text.trim() },
        ),
      },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.done[action.mode]);
    setAction(null);
    setLoaded({ view: result.data, error: null });
    setVersion((value) => value + 1);
  }

  const sapTag = (inst: Installment) => {
    const invoice = inst.invoice;
    if (!invoice || invoice.status === "none") return null;
    if (invoice.status === "cancelled") return <Tag>{m.cancelled}</Tag>;
    if (invoice.erpInvoiceStatus === "paid")
      return (
        <Tag color="success">
          {m.paid.replace("{n}", invoice.erpInvoiceNo ?? "")}
        </Tag>
      );
    if (invoice.erpInvoiceStatus === "open")
      return (
        <Tag color="processing">
          {m.posted.replace("{n}", invoice.erpInvoiceNo ?? "")}
        </Tag>
      );
    if (invoice.erpStatus === "synced")
      return <Tag color="blue">{m.draftInSap}</Tag>;
    if (invoice.erpStatus === "failed" || invoice.erpStatus === "not_ready")
      return (
        <Tooltip title={invoice.erpLastError}>
          <Tag color="error">{m.sapProblem}</Tag>
        </Tooltip>
      );
    return (
      <Tooltip title={invoice.erpLastError}>
        <Tag color="warning">{m.sapPending}</Tag>
      </Tooltip>
    );
  };

  return (
    <Card size="small" title={m.title}>
      {loaded?.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !view ? (
        <Skeleton active />
      ) : (
        <Table<Installment>
          rowKey="seq"
          size="small"
          pagination={false}
          dataSource={view.installments}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 900 }}
          columns={[
            { title: "#", dataIndex: "seq", width: 40 },
            {
              title: m.installment,
              key: "label",
              render: (_, inst) => (
                <Space orientation="vertical" size={0}>
                  <Text>{inst.label}</Text>
                  <Text type="secondary" className="text-xs">
                    {inst.kindLabel}
                    {inst.milestone
                      ? ` · ${m.milestone}: ${inst.milestone.title}`
                      : ""}
                  </Text>
                </Space>
              ),
            },
            {
              title: m.amount,
              dataIndex: "amount",
              align: "right",
              width: 140,
              render: (v: number) => `${money(v)} ${view.contract.currency}`,
            },
            {
              title: m.state,
              key: "state",
              render: (_, inst) => (
                <Space orientation="vertical" size={2}>
                  {sapTag(inst) ??
                    (inst.blockers.length ? (
                      <Tooltip
                        title={
                          <ul className="m-0 pl-4">
                            {inst.blockers.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        }
                      >
                        <Tag icon={<StopOutlined />} color="default">
                          {m.blocked.replace(
                            "{n}",
                            String(inst.blockers.length),
                          )}
                        </Tag>
                      </Tooltip>
                    ) : (
                      <Tag icon={<CheckCircleFilled />} color="success">
                        {m.ready}
                      </Tag>
                    ))}
                  {inst.blockers.length && !sapTag(inst) ? (
                    <Text type="secondary" className="text-xs">
                      {inst.blockers[0]}
                    </Text>
                  ) : null}
                  {inst.invoice?.exceptionStatus &&
                  inst.invoice.exceptionStatus !== "none" ? (
                    <Text type="secondary" className="text-xs">
                      {m.exceptionStatus[inst.invoice.exceptionStatus]}
                    </Text>
                  ) : null}
                </Space>
              ),
            },
            ...(view.canBill
              ? [
                  {
                    key: "actions",
                    width: 200,
                    align: "right" as const,
                    render: (_: unknown, inst: Installment) => {
                      const sent = inst.invoice?.status === "sent";
                      const posted =
                        inst.invoice?.erpInvoiceStatus === "open" ||
                        inst.invoice?.erpInvoiceStatus === "paid";
                      if (sent && !posted)
                        return (
                          <Button
                            size="small"
                            danger
                            onClick={() =>
                              setAction({ inst, mode: "cancel", text: "" })
                            }
                          >
                            {m.cancel}
                          </Button>
                        );
                      if (sent) return null;
                      return (
                        <Space wrap>
                          {inst.exceptionable &&
                          view.exceptionTypeSet &&
                          inst.invoice?.exceptionStatus !== "submitted" ? (
                            <Button
                              size="small"
                              onClick={() =>
                                setAction({ inst, mode: "exception", text: "" })
                              }
                            >
                              {m.requestException}
                            </Button>
                          ) : null}
                          <Button
                            size="small"
                            type="primary"
                            disabled={inst.blockers.length > 0}
                            onClick={() =>
                              setAction({ inst, mode: "send", text: "" })
                            }
                          >
                            {m.send}
                          </Button>
                        </Space>
                      );
                    },
                  },
                ]
              : []),
          ]}
        />
      )}
      {view && view.canBill && !view.exceptionTypeSet ? (
        <Text type="secondary" className="mt-2 block text-xs">
          {m.noExceptionType}
        </Text>
      ) : null}
      <Modal
        open={!!action}
        title={
          action
            ? `${m.titles[action.mode]} — ${action.inst.seq}. ${action.inst.label}`
            : ""
        }
        okText={action ? m.titles[action.mode] : ""}
        okButtonProps={{
          loading: busy,
          danger: action?.mode === "cancel",
          disabled: !action || (action.mode !== "send" && !action.text.trim()),
        }}
        onOk={() => void submit()}
        onCancel={() => setAction(null)}
        destroyOnHidden
      >
        {action ? (
          <div className="space-y-2">
            {action.mode === "send" ? (
              <Alert
                type="info"
                showIcon
                title={m.sendInfo
                  .replace(
                    "{a}",
                    `${money(action.inst.amount)} ${view?.contract.currency ?? ""}`,
                  )
                  .replace("{r}", action.inst.reference)}
              />
            ) : null}
            <Input.TextArea
              rows={2}
              maxLength={1000}
              placeholder={m.placeholders[action.mode]}
              value={action.text}
              onChange={(ev) => setAction({ ...action, text: ev.target.value })}
            />
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
