"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import {
  period,
  type Availability,
  type AvailabilityDay,
  type AvailabilityPerson,
  type ProjectOption,
} from "./leave-types";

const m = messages.hr.availability;

type BookingForm = {
  user_id: string;
  project_id: string;
  range: [Dayjs, Dayjs];
  hours_per_day: number;
  note?: string;
};

function shift(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mondayOf(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return shift(day, -((weekday + 6) % 7));
}

function head(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return {
    weekday: date.toLocaleDateString("th-TH", {
      weekday: "narrow",
      timeZone: "UTC",
    }),
    date: date.getUTCDate(),
  };
}

/** A day's cell: grey off-days, leave, and free hours coloured by load. */
function cellStyle(day: AvailabilityDay) {
  if (!day.working) return "bg-black/5 text-black/30 dark:bg-white/5";
  if (day.free < 0) return "bg-red-500/20 text-red-700 dark:text-red-300";
  if (day.leaveHours >= day.capacity)
    return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
  if (day.free === 0) return "bg-orange-500/20 text-orange-700";
  if (day.bookedHours || day.leaveHours) return "bg-sky-500/15";
  return "bg-emerald-500/10";
}

/**
 * CD-232 — who is free when: 8 hours a working day less leave and project
 * bookings, person by person. Project managers, PM and HR book people here;
 * going past someone's free hours is allowed and reported.
 */
export function AvailabilityBoard({
  today,
  projects,
  userId,
  canBookAny,
}: {
  today: string;
  projects: ProjectOption[];
  userId: string;
  canBookAny: boolean;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<BookingForm>();
  const [from, setFrom] = useState(mondayOf(today));
  const [weeks, setWeeks] = useState(2);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    data: Availability | null;
    error: string | null;
  } | null>(null);
  const [booking, setBooking] = useState(false);
  const [cell, setCell] = useState<{
    person: AvailabilityPerson;
    day: AvailabilityDay;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const to = shift(from, weeks * 7 - 1);
  const key = `${from}|${to}|${projectId ?? ""}|${version}`;
  const bookable = projects.filter(
    (project) => canBookAny || project.managerUserId === userId,
  );

  useEffect(() => {
    let live = true;
    const [f, t, p] = key.split("|");
    const params = new URLSearchParams({ from: f, to: t });
    if (p) params.set("project_id", p);
    void appApi<Availability>(`hr/availability?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { key, data: result.data, error: null }
            : { key, data: null, error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  const data = loaded?.key === key ? loaded.data : null;

  const book = async (values: BookingForm) => {
    setBusy(true);
    const result = await appApi<{
      overbooked: { day: string; free: number }[];
    }>("hr/bookings", {
      method: "POST",
      body: JSON.stringify({
        user_id: values.user_id,
        project_id: values.project_id,
        start_date: values.range[0].format("YYYY-MM-DD"),
        end_date: values.range[1].format("YYYY-MM-DD"),
        hours_per_day: values.hours_per_day,
        note: values.note ?? "",
      }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    if (result.data.overbooked.length) {
      void message.warning(
        m.overbooked.replace("{n}", String(result.data.overbooked.length)),
        6,
      );
    } else {
      void message.success(m.booked);
    }
    setBooking(false);
    form.resetFields();
    setVersion((value) => value + 1);
  };

  const cancelBooking = async (id: string) => {
    const result = await appApi<unknown>(`hr/bookings/${id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.bookingCancelled);
    setCell(null);
    setVersion((value) => value + 1);
  };

  const canCancel = (projectOf: string) =>
    bookable.some((project) => project.id === projectOf);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setFrom(shift(from, -7))}>{m.prev}</Button>
        <DatePicker
          allowClear={false}
          format="DD/MM/YYYY"
          value={dayjs(from)}
          onChange={(value: Dayjs | null) =>
            value && setFrom(mondayOf(value.format("YYYY-MM-DD")))
          }
        />
        <Button onClick={() => setFrom(shift(from, 7))}>{m.next}</Button>
        <Select
          value={weeks}
          onChange={setWeeks}
          options={[1, 2, 4, 8].map((w) => ({
            value: w,
            label: m.weeks.replace("{n}", String(w)),
          }))}
        />
        <Select
          allowClear
          showSearch={{ optionFilterProp: "label" }}
          className="w-72 max-w-full"
          placeholder={m.allPeople}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((project) => ({
            value: project.id,
            label: project.label,
          }))}
        />
        {bookable.length ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.setFieldsValue({
                project_id: projectId ?? bookable[0]?.id,
                hours_per_day: 8,
              });
              setBooking(true);
            }}
          >
            {m.book}
          </Button>
        ) : null}
      </div>

      <Space wrap size={4}>
        <Tag className="!bg-emerald-500/10">{m.legend.free}</Tag>
        <Tag className="!bg-sky-500/15">{m.legend.partly}</Tag>
        <Tag className="!bg-orange-500/20">{m.legend.full}</Tag>
        <Tag className="!bg-red-500/20">{m.legend.over}</Tag>
        <Tag className="!bg-violet-500/15">{m.legend.leave}</Tag>
        <Text type="secondary" className="text-xs">
          {m.legend.hint}
        </Text>
      </Space>

      {loaded?.error && loaded.key === key ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : (
        <Table<AvailabilityPerson>
          rowKey="userId"
          size="small"
          bordered
          loading={!data}
          dataSource={data?.people ?? []}
          pagination={false}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 220 + (data?.days.length ?? 14) * 40 + 90 }}
          columns={[
            {
              title: m.person,
              key: "person",
              fixed: "left",
              width: 220,
              render: (_, person) => (
                <div>
                  <div>{person.displayName}</div>
                  <Text type="secondary" className="text-xs">
                    {[person.level?.name, person.orgUnit?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </div>
              ),
            },
            ...(data?.days ?? []).map((day, index) => {
              const label = head(day);
              return {
                title: (
                  <div
                    className={`text-center text-xs leading-tight ${day === today ? "font-bold" : ""}`}
                  >
                    <div>{label.weekday}</div>
                    <div>{label.date}</div>
                  </div>
                ),
                key: day,
                width: 40,
                align: "center" as const,
                onCell: () => ({ className: "!p-0" }),
                render: (_: unknown, person: AvailabilityPerson) => {
                  const cellDay = person.days[index];
                  if (!cellDay) return null;
                  const tip = [
                    period(cellDay.day, cellDay.day),
                    cellDay.leaveHours
                      ? `${cellDay.leaveType ?? m.away}${cellDay.pendingLeave ? ` (${m.pendingLeave})` : ""} ${cellDay.leaveHours} ${m.hours}`
                      : null,
                    ...cellDay.booked.map(
                      (b) =>
                        `${data?.projects[b.projectId] ?? b.projectId}: ${b.hours} ${m.hours}`,
                    ),
                    cellDay.working
                      ? `${m.freeHours} ${cellDay.free} ${m.hours}`
                      : m.offDay,
                  ].filter(Boolean);
                  return (
                    <Tooltip
                      title={
                        <div>
                          {tip.map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      }
                    >
                      <button
                        type="button"
                        className={`block h-9 w-full cursor-pointer border-0 text-xs ${cellStyle(cellDay)} ${cellDay.pendingLeave ? "border-b-2 border-dashed border-violet-500" : ""}`}
                        onClick={() =>
                          cellDay.booked.length &&
                          setCell({ person, day: cellDay })
                        }
                      >
                        {cellDay.working
                          ? cellDay.leaveHours >= cellDay.capacity
                            ? m.leaveShort
                            : cellDay.free
                          : ""}
                      </button>
                    </Tooltip>
                  );
                },
              };
            }),
            {
              title: m.totalFree,
              key: "total",
              width: 90,
              align: "right",
              fixed: "right",
              render: (_, person) => (
                <Tooltip
                  title={`${m.capacity} ${person.totals.capacity} · ${m.leaveCol} ${person.totals.leave} · ${m.bookedCol} ${person.totals.booked}`}
                >
                  <Text
                    strong
                    type={person.totals.free < 0 ? "danger" : undefined}
                  >
                    {person.totals.free}
                  </Text>
                </Tooltip>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={booking}
        title={m.bookTitle}
        okText={m.book}
        confirmLoading={busy}
        onOk={() => form.submit()}
        onCancel={() => setBooking(false)}
        destroyOnHidden
      >
        <Form<BookingForm>
          form={form}
          layout="vertical"
          onFinish={(values) => void book(values)}
        >
          <Form.Item
            name="project_id"
            label={m.project}
            rules={[{ required: true }]}
          >
            <Select
              showSearch={{ optionFilterProp: "label" }}
              options={bookable.map((project) => ({
                value: project.id,
                label: project.label,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="user_id"
            label={m.person}
            rules={[{ required: true, message: m.pickPerson }]}
          >
            <Select
              showSearch={{ optionFilterProp: "label" }}
              placeholder={m.pickPerson}
              options={(data?.people ?? []).map((person) => ({
                value: person.userId,
                label: `${person.displayName} — ${m.freeHours} ${person.totals.free} ${m.hours}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="range"
            label={m.range}
            rules={[{ required: true, message: m.pickRange }]}
          >
            <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="hours_per_day"
            label={m.hoursPerDay}
            rules={[{ required: true }]}
          >
            <InputNumber min={0.5} max={8} step={0.5} />
          </Form.Item>
          <Form.Item name="note" label={m.note}>
            <Input maxLength={500} />
          </Form.Item>
          <Text type="secondary" className="text-xs">
            {m.bookHint}
          </Text>
        </Form>
      </Modal>

      <Modal
        open={!!cell}
        title={
          cell
            ? `${cell.person.displayName} · ${period(cell.day.day, cell.day.day)}`
            : ""
        }
        footer={null}
        onCancel={() => setCell(null)}
      >
        <div className="space-y-2">
          {cell?.day.booked.map((b) => (
            <div
              key={b.bookingId}
              className="flex items-center justify-between gap-2"
            >
              <span>
                {data?.projects[b.projectId] ?? b.projectId} · {b.hours}{" "}
                {m.hours}
              </span>
              {canCancel(b.projectId) ? (
                <Popconfirm
                  title={m.cancelBookingConfirm}
                  onConfirm={() => void cancelBooking(b.bookingId)}
                >
                  <Button size="small" danger>
                    {m.cancelBooking}
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
