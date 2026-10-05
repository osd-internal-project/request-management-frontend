"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Popconfirm,
  Progress,
  Radio,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import type { Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import {
  period,
  type Leave,
  type LeavePart,
  type LeaveType,
  type MyLeaves,
} from "./leave-types";

const m = messages.hr.leave;

export const LEAVE_STATUS_COLOR: Record<string, string> = {
  pending: "processing",
  approved: "success",
  rejected: "error",
  cancelled: "default",
};

type FormValues = {
  leave_type_id: string;
  part: LeavePart;
  range?: [Dayjs, Dayjs];
  day?: Dayjs;
  reason?: string;
};

/** CD-232 — my leave: what is left this year, ask for more, see the answers. */
export function MyLeave({ thisYear }: { thisYear: number }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const part = Form.useWatch("part", form) ?? "full";
  const [year, setYear] = useState(thisYear);
  const [version, setVersion] = useState(0);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loaded, setLoaded] = useState<{
    key: string;
    data: MyLeaves | null;
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = `${year}|${version}`;

  useEffect(() => {
    void appApi<{ items: LeaveType[] }>("hr/leave-types").then((result) => {
      if (result.ok) setTypes(result.data.items);
    });
  }, []);

  useEffect(() => {
    let live = true;
    const [y] = key.split("|");
    void appApi<MyLeaves>(`hr/leaves/me?year=${y}`).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { key, data: result.data, error: null }
          : { key, data: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [key]);

  const data = loaded?.key === key ? loaded.data : null;

  const submit = async (values: FormValues) => {
    const [start, end] =
      values.part === "full" && values.range
        ? [values.range[0], values.range[1]]
        : [values.day, values.day];
    if (!start || !end) return;
    setBusy(true);
    const result = await appApi<Leave>("hr/leaves", {
      method: "POST",
      body: JSON.stringify({
        leave_type_id: values.leave_type_id,
        start_date: start.format("YYYY-MM-DD"),
        end_date: end.format("YYYY-MM-DD"),
        part: values.part,
        reason: values.reason ?? "",
      }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.requested);
    form.resetFields();
    setYear(Number(result.data.startDate.slice(0, 4)));
    setVersion((value) => value + 1);
  };

  const cancel = async (id: string) => {
    const result = await appApi<Leave>(`hr/leaves/${id}/cancel`, {
      method: "POST",
    });
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.cancelled);
    setVersion((value) => value + 1);
  };

  if (loaded?.error && loaded.key === key)
    return <Alert type="error" showIcon title={loaded.error} />;

  return (
    <div className="space-y-3">
      <Card
        title={m.balanceTitle}
        extra={
          <Select
            size="small"
            value={year}
            onChange={setYear}
            options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({
              value: y,
              label: `${y + 543}`,
            }))}
          />
        }
      >
        {!data ? (
          <Skeleton active />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.balances.map((balance) => (
              <div
                key={balance.leaveTypeId}
                className="rounded-md border border-solid border-black/10 p-3 dark:border-white/15"
              >
                <div className="flex items-baseline justify-between">
                  <Text strong>{balance.name}</Text>
                  <Text type="secondary" className="text-xs">
                    {balance.quota === null
                      ? m.unlimited
                      : `${m.quota} ${balance.quota} ${m.days}`}
                  </Text>
                </div>
                {balance.quota !== null ? (
                  <Progress
                    size="small"
                    percent={
                      balance.quota
                        ? Math.round(
                            ((balance.used + balance.pending) / balance.quota) *
                              100,
                          )
                        : 100
                    }
                    success={{
                      percent: balance.quota
                        ? Math.round((balance.used / balance.quota) * 100)
                        : 0,
                    }}
                    showInfo={false}
                  />
                ) : null}
                <Text type="secondary" className="text-xs">
                  {m.used} {balance.used} · {m.pending} {balance.pending}
                  {balance.remaining !== null
                    ? ` · ${m.remaining} ${balance.remaining}`
                    : ""}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={m.requestTitle}>
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={{ part: "full" }}
          onFinish={(values) => void submit(values)}
          className="grid grid-cols-1 gap-x-3 md:grid-cols-4"
        >
          <Form.Item
            name="leave_type_id"
            label={m.type}
            rules={[{ required: true, message: m.pickType }]}
          >
            <Select
              placeholder={m.pickType}
              options={types.map((type) => ({
                value: type.id,
                label: type.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="part" label={m.part}>
            <Radio.Group
              optionType="button"
              options={[
                { value: "full", label: m.parts.full },
                { value: "am", label: m.parts.am },
                { value: "pm", label: m.parts.pm },
              ]}
            />
          </Form.Item>
          {part === "full" ? (
            <Form.Item
              name="range"
              label={m.dates}
              rules={[{ required: true, message: m.pickDates }]}
            >
              <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          ) : (
            <Form.Item
              name="day"
              label={m.date}
              rules={[{ required: true, message: m.pickDates }]}
            >
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          )}
          <Form.Item name="reason" label={m.reason}>
            <Input maxLength={1000} />
          </Form.Item>
          <div className="md:col-span-4">
            <Space>
              <Button type="primary" htmlType="submit" loading={busy}>
                {m.submit}
              </Button>
              <Text type="secondary" className="text-xs">
                {m.requestHint}
              </Text>
            </Space>
          </div>
        </Form>
      </Card>

      <Card title={m.historyTitle}>
        <Table<Leave>
          rowKey="id"
          size="small"
          loading={!data}
          dataSource={data?.items ?? []}
          pagination={false}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 720 }}
          columns={[
            { title: m.type, dataIndex: "leaveType" },
            {
              title: m.dates,
              key: "dates",
              render: (_, row) =>
                `${period(row.startDate, row.endDate)}${row.part === "full" ? "" : ` (${m.parts[row.part]})`}`,
            },
            { title: m.daysCol, dataIndex: "days", align: "right" },
            {
              title: m.status,
              key: "status",
              render: (_, row) => (
                <Space orientation="vertical" size={0}>
                  <Tag color={LEAVE_STATUS_COLOR[row.status]}>
                    {m.statuses[row.status]}
                  </Tag>
                  {row.decisionNote ? (
                    <Text type="secondary" className="text-xs">
                      {row.decidedByName ? `${row.decidedByName}: ` : ""}
                      {row.decisionNote}
                    </Text>
                  ) : null}
                </Space>
              ),
            },
            { title: m.reason, dataIndex: "reason" },
            {
              key: "cancel",
              align: "right",
              render: (_, row) =>
                row.status === "pending" ||
                (row.status === "approved" &&
                  data &&
                  row.startDate > data.today) ? (
                  <Popconfirm
                    title={m.cancelConfirm}
                    onConfirm={() => void cancel(row.id)}
                  >
                    <Button size="small" danger>
                      {m.cancel}
                    </Button>
                  </Popconfirm>
                ) : null,
            },
          ]}
        />
      </Card>
    </div>
  );
}
