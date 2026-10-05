"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Checkbox,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tag,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type {
  AcceptanceRoundView,
  ProjectAcceptancesView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.acceptance;
const show = (value: string) => dayjs(value).format("D MMM YY");

interface Booking {
  round: AcceptanceRoundView | null;
  milestoneId: string | null;
  at: Dayjs | null;
  location: string;
  customerPeople: string;
  preparation: string;
}

interface Item {
  text: string;
  dueOn: Dayjs | null;
  ownerUserId: string | null;
}

interface Result {
  round: AcceptanceRoundView;
  result: "accepted" | "conditional" | "rejected";
  decidedOn: Dayjs | null;
  note: string;
  file: File | null;
  /** CD-252 — no certificate now: drawn up and e-signed afterwards. */
  esignLater?: boolean;
  items: Item[];
}

/**
 * CD-189 — acceptance with the customer: booked once the project is ready,
 * the result with the signed certificate, and the open points followed.
 */
export function ProjectAcceptanceCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectAcceptancesView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [closing, setClosing] = useState<{
    round: AcceptanceRoundView;
    itemId: string;
    note: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/acceptances`;
  const planned = view.milestones.filter((row) => row.status === "planned");

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

  async function saveBooking() {
    if (!booking) return;
    const body = JSON.stringify({
      ...(booking.round ? {} : { milestone_id: booking.milestoneId ?? "" }),
      scheduled_at: booking.at?.toISOString(),
      location: booking.location,
      customer_people: booking.customerPeople,
      preparation: booking.preparation,
    });
    const ok = await call(
      booking.round ? `${base}/${booking.round.id}` : base,
      { method: booking.round ? "PATCH" : "POST", body },
    );
    if (ok) setBooking(null);
  }

  async function saveResult() {
    if (!result) return;
    const form = new FormData();
    form.append("result", result.result);
    if (result.decidedOn) {
      form.append("decided_on", result.decidedOn.format("YYYY-MM-DD"));
    }
    if (result.note.trim()) form.append("note", result.note);
    if (result.items.length) {
      form.append(
        "items",
        JSON.stringify(
          result.items.map((item) => ({
            text: item.text,
            due_on: item.dueOn?.format("YYYY-MM-DD"),
            owner_user_id: item.ownerUserId ?? undefined,
          })),
        ),
      );
    }
    if (result.file) form.append("file", result.file);
    else if (result.esignLater) form.append("certificate_via", "esign");
    const ok = await call(`${base}/${result.round.id}/result`, {
      method: "POST",
      body: form,
    });
    if (ok) setResult(null);
  }

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          <Tag color={view.readiness.ready ? "success" : "warning"}>
            {view.readiness.ready ? m.ready : m.notReady}
          </Tag>
        </Space>
      }
      extra={
        view.canEdit ? (
          <Button
            size="small"
            type="primary"
            disabled={!view.readiness.ready}
            onClick={() => {
              setError(null);
              setBooking({
                round: null,
                milestoneId: null,
                at: null,
                location: "",
                customerPeople: "",
                preparation: "",
              });
            }}
          >
            {m.book}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {!view.readiness.ready && view.readiness.blockers.length > 0 && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={view.readiness.blockers.join(" · ")}
        />
      )}
      {error && !booking && !result && !closing && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.rounds.length ? (
        <div className="divide-y">
          {view.rounds.map((round) => (
            <div key={round.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{round.label}</span>{" "}
                  <Tag color={m.statusColor[round.status]}>
                    {m.status[round.status]}
                  </Tag>
                  <Text className="text-xs">
                    {m.when(dayjs(round.scheduledAt).format("D MMM YY HH:mm"))}
                  </Text>
                </div>
                {view.canEdit && round.status === "scheduled" && (
                  <Space size={0} wrap>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setResult({
                          round,
                          result: "accepted",
                          decidedOn: dayjs(),
                          note: "",
                          file: null,
                          items: [],
                        });
                      }}
                    >
                      {m.record}
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setBooking({
                          round,
                          milestoneId: round.milestone?.id ?? null,
                          at: dayjs(round.scheduledAt),
                          location: round.location ?? "",
                          customerPeople: round.customerPeople ?? "",
                          preparation: round.preparation ?? "",
                        });
                      }}
                    >
                      {m.edit}
                    </Button>
                    <Popconfirm
                      title={m.cancelConfirm}
                      onConfirm={() =>
                        void call(`${base}/${round.id}/cancel`, {
                          method: "POST",
                        })
                      }
                    >
                      <Button size="small" type="link" danger>
                        {m.cancel}
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </div>
              <Text type="secondary" className="block text-xs">
                {[
                  round.milestone && m.milestone(round.milestone.title),
                  round.location && m.at(round.location),
                  round.customerPeople && m.customer(round.customerPeople),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {round.preparation && (
                <Text type="secondary" className="block text-xs">
                  {m.preparation(round.preparation)}
                </Text>
              )}
              {round.decidedOn && (
                <div className="text-xs">
                  {m.decided(show(round.decidedOn), round.decidedByName ?? "")}
                  {round.certificateName && (
                    <>
                      {" · "}
                      <a
                        href={`/api/app/projects/${projectId}/acceptances/${round.id}/certificate`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.certificate}
                      </a>
                    </>
                  )}
                </div>
              )}
              {round.outcomeNote && (
                <div className="text-xs whitespace-pre-line">
                  {round.outcomeNote}
                </div>
              )}
              {round.items.length > 0 && (
                <div className="mt-1 rounded border border-gray-200 p-2">
                  <Text
                    type={round.followUp.overdue ? "danger" : undefined}
                    className="block text-xs font-medium"
                  >
                    {round.followUp.closed
                      ? m.allClosed
                      : m.followUp(round.followUp.open, round.followUp.overdue)}
                  </Text>
                  {round.items.map((item) => (
                    <div key={item.id} className="text-xs">
                      <Tag
                        color={
                          item.status === "done"
                            ? "success"
                            : item.overdue
                              ? "red"
                              : "default"
                        }
                      >
                        {item.seq}
                      </Tag>
                      {item.text}
                      <Text type="secondary" className="ml-1 text-xs">
                        {item.dueOn && m.itemDue(show(item.dueOn))}
                        {item.ownerName && ` · ${m.itemOwner(item.ownerName)}`}
                      </Text>
                      {item.overdue && (
                        <Tag className="ml-1" color="red">
                          {m.overdue}
                        </Tag>
                      )}
                      {item.doneNote && (
                        <Text type="success" className="ml-1 text-xs">
                          {m.itemDone(item.doneNote)}
                        </Text>
                      )}
                      {item.mayClose && (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => {
                            setError(null);
                            setClosing({ round, itemId: item.id, note: "" });
                          }}
                        >
                          {m.close}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={booking !== null}
        title={
          booking?.round
            ? m.form.editTitle(booking.round.label)
            : m.form.bookTitle
        }
        onCancel={() => setBooking(null)}
        okText={m.form.save}
        cancelText={m.form.dismiss}
        confirmLoading={busy}
        onOk={() => void saveBooking()}
        destroyOnHidden
      >
        {booking && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            {!booking.round && (
              <label className="block text-xs">
                {m.form.milestone}
                <Select
                  className="w-full"
                  allowClear
                  value={booking.milestoneId ?? undefined}
                  onChange={(value?: string) =>
                    setBooking({ ...booking, milestoneId: value ?? null })
                  }
                  options={planned.map((row) => ({
                    value: row.id,
                    label: row.label,
                  }))}
                />
              </label>
            )}
            <label className="block text-xs">
              {m.form.when}
              <DatePicker
                className="w-full"
                showTime={{ format: "HH:mm" }}
                format="DD/MM/YYYY HH:mm"
                value={booking.at}
                disabledDate={(value) => value.isBefore(dayjs(), "day")}
                onChange={(value) => setBooking({ ...booking, at: value })}
              />
            </label>
            <label className="block text-xs">
              {m.form.location}
              <Input
                value={booking.location}
                maxLength={2000}
                onChange={(event) =>
                  setBooking({ ...booking, location: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.customerPeople}
              <Input
                value={booking.customerPeople}
                maxLength={2000}
                onChange={(event) =>
                  setBooking({ ...booking, customerPeople: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.preparation}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={booking.preparation}
                onChange={(event) =>
                  setBooking({ ...booking, preparation: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={result !== null}
        title={m.form.recordTitle(result?.round.label ?? "")}
        onCancel={() => setResult(null)}
        okText={m.form.save}
        cancelText={m.form.dismiss}
        confirmLoading={busy}
        onOk={() => void saveResult()}
        destroyOnHidden
        width={640}
      >
        {result && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <Radio.Group
              value={result.result}
              onChange={(event) =>
                setResult({
                  ...result,
                  result: event.target.value as Result["result"],
                })
              }
              options={(["accepted", "conditional", "rejected"] as const).map(
                (value) => ({ value, label: m.status[value] }),
              )}
            />
            <label className="block text-xs">
              {m.form.decidedOn}
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY"
                value={result.decidedOn}
                disabledDate={(value) => value.isAfter(dayjs(), "day")}
                onChange={(value) => setResult({ ...result, decidedOn: value })}
              />
            </label>
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={2}
                maxLength={4000}
                value={result.note}
                onChange={(event) =>
                  setResult({ ...result, note: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.file}
              <input
                type="file"
                className="block text-sm"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(event) =>
                  setResult({
                    ...result,
                    file: event.target.files?.[0] ?? null,
                  })
                }
              />
            </label>
            {/* CD-252 — the certificate is drawn up and e-signed afterwards */}
            {result.result !== "rejected" && !result.file ? (
              <Checkbox
                checked={result.esignLater ?? false}
                onChange={(event) =>
                  setResult({ ...result, esignLater: event.target.checked })
                }
              >
                <span className="text-xs">{m.form.esignLater}</span>
              </Checkbox>
            ) : null}
            <div>
              <Text className="block text-xs">{m.form.items}</Text>
              {result.items.map((item, index) => (
                <div
                  key={index}
                  className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-[1fr_130px_150px_32px]"
                >
                  <Input
                    placeholder={m.form.itemText}
                    value={item.text}
                    onChange={(event) => {
                      const items = [...result.items];
                      items[index] = { ...item, text: event.target.value };
                      setResult({ ...result, items });
                    }}
                  />
                  <DatePicker
                    placeholder={m.form.itemDue}
                    format="DD/MM/YYYY"
                    value={item.dueOn}
                    onChange={(value) => {
                      const items = [...result.items];
                      items[index] = { ...item, dueOn: value };
                      setResult({ ...result, items });
                    }}
                  />
                  <SearchSelect
                    placeholder={m.form.itemOwner}
                    allowClear
                    value={item.ownerUserId ?? undefined}
                    onChange={(value?: string) => {
                      const items = [...result.items];
                      items[index] = { ...item, ownerUserId: value ?? null };
                      setResult({ ...result, items });
                    }}
                    options={people.map((person) => ({
                      value: person.id,
                      label: person.name,
                    }))}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setResult({
                        ...result,
                        items: result.items.filter((_, i) => i !== index),
                      })
                    }
                  />
                </div>
              ))}
              <Button
                size="small"
                type="link"
                onClick={() =>
                  setResult({
                    ...result,
                    items: [
                      ...result.items,
                      { text: "", dueOn: null, ownerUserId: null },
                    ],
                  })
                }
              >
                {m.form.addItem}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={closing !== null}
        title={m.form.closeTitle}
        onCancel={() => setClosing(null)}
        okText={m.form.save}
        cancelText={m.form.dismiss}
        confirmLoading={busy}
        onOk={async () => {
          if (!closing) return;
          const ok = await call(
            `${base}/${closing.round.id}/items/${closing.itemId}/done`,
            { method: "POST", body: JSON.stringify({ note: closing.note }) },
          );
          if (ok) setClosing(null);
        }}
        destroyOnHidden
      >
        {closing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.closeNote}
              <Input.TextArea
                rows={3}
                maxLength={2000}
                value={closing.note}
                onChange={(event) =>
                  setClosing({ ...closing, note: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
