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
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type { BookingPreview, ProjectResourcesView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.resources;

const requestColor: Record<string, string> = {
  draft: "default",
  submitted: "processing",
  approved: "success",
  rejected: "error",
  fulfilled: "success",
};

interface Booking {
  userId: string | null;
  range: [Dayjs, Dayjs] | null;
  hours: number | null;
  note: string;
  priority: string | null;
  reason: string;
  preview: BookingPreview | null;
}

interface Asking {
  role: string;
  headcount: number | null;
  range: [Dayjs, Dayjs] | null;
  hours: number | null;
  note: string;
}

/**
 * CD-180 — who is booked on the project and when; overbookings carry their
 * priority and reason; more people asked through the request engine.
 */
export function ProjectResourcesCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectResourcesView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/resources`;

  async function send(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return false;
    }
    message.success(m.saved);
    router.refresh();
    return true;
  }

  const bookingBody = (row: Booking) => ({
    user_id: row.userId ?? "",
    start_date: row.range?.[0].format("YYYY-MM-DD") ?? "",
    end_date: row.range?.[1].format("YYYY-MM-DD") ?? "",
    hours_per_day: row.hours ?? 0,
    note: row.note,
  });

  async function check(row: Booking) {
    setBusy(true);
    setError(null);
    const response = await appApi<BookingPreview>(`${base}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingBody(row)),
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    setBooking({ ...row, preview: response.data });
  }

  async function book() {
    if (!booking) return;
    const ok = await send(`${base}/bookings`, "POST", {
      ...bookingBody(booking),
      ...(booking.priority ? { priority: booking.priority } : {}),
      ...(booking.reason.trim() ? { reason: booking.reason } : {}),
    });
    if (ok) setBooking(null);
  }

  async function ask() {
    if (!asking) return;
    const ok = await send(`${base}/requests`, "POST", {
      role: asking.role,
      headcount: asking.headcount ?? 0,
      start_date: asking.range?.[0].format("YYYY-MM-DD") ?? "",
      end_date: asking.range?.[1].format("YYYY-MM-DD") ?? "",
      hours_per_day: asking.hours ?? 0,
      note: asking.note,
    });
    if (ok) setAsking(null);
  }

  const overbooked = booking?.preview?.overbooked ?? [];

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        <Space size={4} wrap>
          <Link href={ROUTES.projectWorkload} className="text-xs">
            {m.workloadLink}
          </Link>
          {view.canEdit && (
            <>
              <Button
                size="small"
                onClick={() => {
                  setError(null);
                  setAsking({
                    role: "",
                    headcount: 1,
                    range: null,
                    hours: 8,
                    note: "",
                  });
                }}
              >
                {m.ask}
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={() => {
                  setError(null);
                  setBooking({
                    userId: null,
                    range: null,
                    hours: 8,
                    note: "",
                    priority: null,
                    reason: "",
                    preview: null,
                  });
                }}
              >
                {m.book}
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {!view.typeSet && view.canEdit && (
        <Alert className="mb-2" type="warning" showIcon title={m.noType} />
      )}
      {error && !booking && !asking && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.bookings.length ? (
        <div className="divide-y">
          {view.bookings.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 py-1 text-sm"
            >
              <div>
                <span className="font-medium">{row.name}</span>{" "}
                <Text type="secondary" className="text-xs">
                  {dayjs(row.startDate).format("D MMM")} –{" "}
                  {dayjs(row.endDate).format("D MMM YY")} ·{" "}
                  {m.perDay(row.hoursPerDay)}
                </Text>{" "}
                {row.past && <Tag>{m.past}</Tag>}
                {row.overbookedDays > 0 && (
                  <Tag color="error">{m.overbooked(row.overbookedDays)}</Tag>
                )}
                {row.priority && (
                  <Text type="secondary" className="block text-xs">
                    {m.priority[row.priority.priority]} · {row.priority.reason}
                    {row.priority.conflicts.length > 0 &&
                      ` · ${m.clashWith(row.priority.conflicts.join(", "))}`}
                  </Text>
                )}
                {row.note && (
                  <Text type="secondary" className="block text-xs">
                    {row.note}
                  </Text>
                )}
              </div>
              {view.canEdit && !row.past && (
                <Popconfirm
                  title={m.cancelConfirm}
                  onConfirm={() =>
                    void send(`${base}/bookings/${row.id}`, "DELETE")
                  }
                >
                  <Button size="small" type="link" danger>
                    {m.cancel}
                  </Button>
                </Popconfirm>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={m.noBookings}
        />
      )}

      {view.requests.length > 0 && (
        <>
          <Text strong className="mt-3 block text-xs">
            {m.requests}
          </Text>
          <div className="divide-y">
            {view.requests.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-2 py-1 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {row.label} · {row.role} · {m.headcount(row.headcount)}
                  </span>{" "}
                  <Tag color={requestColor[row.status]}>
                    {m.requestStatus[row.status] ?? row.status}
                  </Tag>
                  <Text type="secondary" className="block text-xs">
                    {dayjs(row.startDate).format("D MMM")} –{" "}
                    {dayjs(row.endDate).format("D MMM YY")} ·{" "}
                    {m.perDay(row.hoursPerDay)}
                    {row.requestNo ? ` · ${row.requestNo}` : ""}
                  </Text>
                  {row.error && (
                    <Text type="danger" className="block text-xs">
                      {row.error}
                    </Text>
                  )}
                </div>
                {view.canEdit && (
                  <Space size={0}>
                    {row.status === "draft" && (
                      <>
                        <Button
                          size="small"
                          type="link"
                          loading={busy}
                          onClick={() =>
                            void send(
                              `${base}/requests/${row.id}/submit`,
                              "POST",
                            )
                          }
                        >
                          {m.resubmit}
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          danger
                          onClick={() =>
                            void send(
                              `${base}/requests/${row.id}/cancel`,
                              "POST",
                            )
                          }
                        >
                          {m.withdraw}
                        </Button>
                      </>
                    )}
                    {row.status === "approved" && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() =>
                          void send(`${base}/requests/${row.id}/fulfil`, "POST")
                        }
                      >
                        {m.fulfil}
                      </Button>
                    )}
                  </Space>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={booking !== null}
        title={m.book}
        onCancel={() => setBooking(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        okButtonProps={{ disabled: !booking?.preview }}
        onOk={() => void book()}
        destroyOnHidden
      >
        {booking && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.person}
              <Select
                className="w-full"
                showSearch={{ optionFilterProp: "label" }}
                value={booking.userId ?? undefined}
                options={people.map((row) => ({
                  value: row.id,
                  label: row.name,
                }))}
                onChange={(value: string) =>
                  setBooking({ ...booking, userId: value, preview: null })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
              <label className="block text-xs">
                {m.form.from} – {m.form.to}
                <DatePicker.RangePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={booking.range}
                  onChange={(value) =>
                    setBooking({
                      ...booking,
                      range:
                        value?.[0] && value[1] ? [value[0], value[1]] : null,
                      preview: null,
                    })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.hours}
                <InputNumber
                  className="w-full"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={booking.hours}
                  onChange={(value) =>
                    setBooking({ ...booking, hours: value, preview: null })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.note}
              <Input
                value={booking.note}
                maxLength={500}
                onChange={(event) =>
                  setBooking({ ...booking, note: event.target.value })
                }
              />
            </label>
            <Button
              size="small"
              loading={busy}
              disabled={!booking.userId || !booking.range || !booking.hours}
              onClick={() => void check(booking)}
            >
              {m.check}
            </Button>
            {booking.preview &&
              (overbooked.length ? (
                <Alert
                  type="warning"
                  showIcon
                  title={m.shortDays(overbooked.length)}
                  description={
                    <div className="text-xs">
                      {overbooked.slice(0, 10).map((row) => (
                        <div key={row.day}>
                          {m.shortLine(row.day, row.short, row.onLeave)}
                        </div>
                      ))}
                      {booking.preview.conflicts.map((row) => (
                        <div key={row.projectId}>
                          {m.conflictLine(row.label, row.managerName ?? "")}
                        </div>
                      ))}
                    </div>
                  }
                />
              ) : (
                <Alert type="success" showIcon title={m.fits} />
              ))}
            {overbooked.length > 0 && (
              <>
                <div className="text-xs">
                  {m.form.priority}
                  <Radio.Group
                    className="block"
                    value={booking.priority}
                    onChange={(event) =>
                      setBooking({
                        ...booking,
                        priority: event.target.value as string,
                      })
                    }
                    options={Object.entries(m.priority).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </div>
                <label className="block text-xs">
                  {m.form.reason}
                  <Input.TextArea
                    rows={2}
                    maxLength={2000}
                    value={booking.reason}
                    onChange={(event) =>
                      setBooking({ ...booking, reason: event.target.value })
                    }
                  />
                </label>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={asking !== null}
        title={m.ask}
        onCancel={() => setAsking(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void ask()}
        destroyOnHidden
      >
        {asking && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
              <label className="block text-xs">
                {m.form.role}
                <Input
                  value={asking.role}
                  maxLength={200}
                  onChange={(event) =>
                    setAsking({ ...asking, role: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.headcount}
                <InputNumber
                  className="w-full"
                  min={1}
                  max={50}
                  value={asking.headcount}
                  onChange={(value) =>
                    setAsking({ ...asking, headcount: value })
                  }
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
              <label className="block text-xs">
                {m.form.from} – {m.form.to}
                <DatePicker.RangePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={asking.range}
                  onChange={(value) =>
                    setAsking({
                      ...asking,
                      range:
                        value?.[0] && value[1] ? [value[0], value[1]] : null,
                    })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.hours}
                <InputNumber
                  className="w-full"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={asking.hours}
                  onChange={(value) => setAsking({ ...asking, hours: value })}
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={asking.note}
                onChange={(event) =>
                  setAsking({ ...asking, note: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
