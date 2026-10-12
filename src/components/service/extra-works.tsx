"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.service.assets.extras;

interface ExtraItem {
  id: string;
  label: string;
  description: string;
  reason: string;
  estimate: number;
  status: "proposed" | "agreed" | "declined" | "cancelled";
  ackName: string | null;
  ackOn: string | null;
  declineNote: string | null;
  decidedByName: string | null;
  createdByName: string | null;
}

interface ExtrasView {
  canPropose: boolean;
  canDecide: boolean;
  agreedTotal: number;
  items: ExtraItem[];
}

const baht = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

/**
 * CD-228 — work found outside the contract once the job started: proposed
 * with why and an estimate, the customer's answer recorded; agreed items go
 * on the job's charge. Tells the panel how many were agreed.
 */
export function ExtraWorks({
  workOrderId,
  onAgreed,
}: {
  readonly workOrderId: string;
  readonly onAgreed: (count: number) => void;
}) {
  const { message } = App.useApp();
  const [view, setView] = useState<ExtrasView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{
    description: string;
    reason: string;
    estimate: number | null;
  } | null>(null);
  const [deciding, setDeciding] = useState<{
    item: ExtraItem;
    decision: "agreed" | "declined";
    name: string;
    on: Dayjs | null;
    note: string;
  } | null>(null);
  const base = `service-work-orders/${workOrderId}/extras`;

  useEffect(() => {
    let live = true;
    void appApi<ExtrasView>(base).then((result) => {
      if (!live) return;
      if (result.ok) {
        setView(result.data);
        onAgreed(result.data.items.filter((i) => i.status === "agreed").length);
      } else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [base, onAgreed]);

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const result = await appApi<ExtrasView>(path, {
      method: "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setView(result.data);
    onAgreed(result.data.items.filter((i) => i.status === "agreed").length);
    void message.success(m.saved);
    return true;
  }

  if (!view) {
    return error ? (
      <Alert className="my-2" type="error" showIcon title={error} />
    ) : null;
  }

  return (
    <div className="my-2">
      <Space size={4} wrap>
        <Text strong className="text-xs">
          {m.title}
        </Text>
        {view.canPropose && (
          <Button
            size="small"
            type="link"
            onClick={() => {
              setError(null);
              setDraft({ description: "", reason: "", estimate: null });
            }}
          >
            {m.add}
          </Button>
        )}
      </Space>
      <Text type="secondary" className="block text-xs">
        {m.hint}
      </Text>
      {error && !draft && !deciding && (
        <Alert className="my-1" type="error" showIcon title={error} />
      )}
      {view.items.length === 0 ? (
        <Text type="secondary" className="block text-xs">
          {m.empty}
        </Text>
      ) : (
        <div className="divide-y text-sm">
          {view.items.map((item) => (
            <div key={item.id} className="py-1.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Tag color={m.statusColor[item.status]}>
                    {m.status[item.status]}
                  </Tag>
                  <span className="font-medium">
                    {item.label} · {item.description}
                  </span>{" "}
                  <Text type="secondary">{m.amount(baht(item.estimate))}</Text>
                </div>
                {view.canDecide && item.status === "proposed" && (
                  <Space size={0} wrap>
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        setDeciding({
                          item,
                          decision: "agreed",
                          name: "",
                          on: dayjs(),
                          note: "",
                        })
                      }
                    >
                      {m.agree}
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        setDeciding({
                          item,
                          decision: "declined",
                          name: "",
                          on: null,
                          note: "",
                        })
                      }
                    >
                      {m.decline}
                    </Button>
                    <Popconfirm
                      title={m.cancelConfirm}
                      onConfirm={() =>
                        void call(
                          `service-work-orders/extras/${item.id}/cancel`,
                        )
                      }
                    >
                      <Button size="small" type="link" danger>
                        {m.cancel}
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </div>
              <div className="text-xs whitespace-pre-line text-gray-500">
                {item.reason}
              </div>
              {item.status === "agreed" && item.ackName && item.ackOn && (
                <Text type="success" className="block text-xs">
                  {m.ackBy(item.ackName, dayjs(item.ackOn).format("D MMM YY"))}
                </Text>
              )}
              {item.status === "declined" && item.declineNote && (
                <Text type="secondary" className="block text-xs">
                  {item.declineNote}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}
      {view.agreedTotal > 0 && (
        <Text className="block text-xs">
          {m.agreedTotal(baht(view.agreedTotal))}
        </Text>
      )}

      <Modal
        open={draft !== null}
        title={m.add}
        okText={m.propose}
        cancelText={m.close}
        confirmLoading={busy}
        okButtonProps={{
          disabled:
            !draft?.description.trim() ||
            !draft.reason.trim() ||
            !(draft.estimate && draft.estimate > 0),
        }}
        onCancel={() => setDraft(null)}
        onOk={async () => {
          if (!draft) return;
          const done = await call(base, {
            description: draft.description,
            reason: draft.reason,
            estimate: draft.estimate,
          });
          if (done) setDraft(null);
        }}
        destroyOnHidden
      >
        {error && draft && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        {draft && (
          <Space orientation="vertical" className="w-full">
            <label className="block text-xs">
              {m.description}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.reason}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={draft.reason}
                onChange={(event) =>
                  setDraft({ ...draft, reason: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.estimate}
              <InputNumber
                className="w-full"
                min={0}
                precision={2}
                value={draft.estimate}
                onChange={(value) =>
                  setDraft({ ...draft, estimate: value ?? null })
                }
              />
            </label>
          </Space>
        )}
      </Modal>

      <Modal
        open={deciding !== null}
        title={
          deciding
            ? `${deciding.decision === "agreed" ? m.agree : m.decline}: ${deciding.item.label}`
            : undefined
        }
        okText={m.confirm}
        cancelText={m.close}
        confirmLoading={busy}
        okButtonProps={{
          disabled:
            deciding?.decision === "agreed" &&
            (!deciding.name.trim() || !deciding.on),
        }}
        onCancel={() => setDeciding(null)}
        onOk={async () => {
          if (!deciding) return;
          const done = await call(
            `service-work-orders/extras/${deciding.item.id}/decide`,
            deciding.decision === "agreed"
              ? {
                  decision: "agreed",
                  name: deciding.name,
                  on: deciding.on?.format("YYYY-MM-DD"),
                }
              : {
                  decision: "declined",
                  note: deciding.note.trim() || undefined,
                },
          );
          if (done) setDeciding(null);
        }}
        destroyOnHidden
      >
        {error && deciding && (
          <Alert className="mb-2" type="error" showIcon title={error} />
        )}
        {deciding?.decision === "agreed" ? (
          <Space orientation="vertical" className="w-full">
            <label className="block text-xs">
              {m.ackName}
              <Input
                maxLength={200}
                value={deciding.name}
                onChange={(event) =>
                  setDeciding({ ...deciding, name: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.ackOn}
              <DatePicker
                className="w-full"
                value={deciding.on}
                format="DD/MM/YYYY"
                disabledDate={(date) => date.isAfter(dayjs(), "day")}
                onChange={(on) => setDeciding({ ...deciding, on })}
              />
            </label>
          </Space>
        ) : deciding ? (
          <label className="block text-xs">
            {m.declineNote}
            <Input.TextArea
              rows={2}
              maxLength={2000}
              value={deciding.note}
              onChange={(event) =>
                setDeciding({ ...deciding, note: event.target.value })
              }
            />
          </label>
        ) : null}
      </Modal>
    </div>
  );
}
