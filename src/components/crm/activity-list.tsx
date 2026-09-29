"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  App,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Tag,
} from "antd";
import {
  CheckSquareOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { LeadActivityType, SalesActivity } from "@/lib/api/types";

/**
 * กิจกรรมของงานขาย — ใช้ร่วมระหว่าง Lead และโอกาสการขาย (CD-65). รูปข้อมูล
 * เดียวกันทั้งสองฝั่ง: ไม่มีกำหนด = ทำไปแล้ว, มีกำหนด = นัดติดตาม.
 */
const ma = messages.sales.leads.detail.activities;

export const ACTIVITY_ICON: Record<LeadActivityType, React.ReactNode> = {
  call: <PhoneOutlined />,
  email: <MailOutlined />,
  meeting: <VideoCameraOutlined />,
  task: <CheckSquareOutlined />,
  note: <FileTextOutlined />,
};

export function formatWhen(iso: string): string {
  return dayjs(iso).format("D MMM YY HH:mm");
}

/** ค้างก่อน เรียงตามกำหนด (ไม่มีกำหนดไว้ท้าย) / เสร็จแล้ว ตามลำดับเดิม. */
export function splitActivities<T extends SalesActivity>(activities: T[]) {
  const pending = activities
    .filter((activity) => !activity.completedAt)
    .sort((a, b) => {
      if (!a.dueAt) return b.dueAt ? 1 : 0;
      if (!b.dueAt) return -1;
      return a.dueAt.localeCompare(b.dueAt);
    });
  const done = activities.filter((activity) => activity.completedAt);
  return { pending, done };
}

export function ActivityList({
  activities,
  editable,
  onToggle,
  emptyText,
  compact,
  renderExtra,
}: {
  activities: SalesActivity[];
  editable: boolean;
  onToggle: (activity: SalesActivity, completed: boolean) => Promise<void>;
  emptyText: string;
  compact?: boolean;
  /** CD-75 — what a caller hangs under each activity (the deal's photos). */
  renderExtra?: (activity: SalesActivity) => ReactNode;
}) {
  if (!activities.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  }

  const now = dayjs();

  return (
    <div className="divide-y divide-gray-100">
      {activities.map((activity) => {
        const isDone = Boolean(activity.completedAt);
        const overdue =
          !isDone && activity.dueAt !== null && dayjs(activity.dueAt).isBefore(now);

        return (
          <div key={activity.id} className="flex items-start gap-2 py-2">
            {editable ? (
              <Checkbox
                checked={isDone}
                onChange={(e) => void onToggle(activity, e.target.checked)}
              />
            ) : (
              <span className="text-gray-400">{ACTIVITY_ICON[activity.type]}</span>
            )}
            <div className="min-w-0 grow text-xs">
              <div className={isDone ? "text-gray-400 line-through" : "font-medium"}>
                <Tag className="mr-1!">{ma.type[activity.type]}</Tag>
                {activity.subject}
              </div>
              {!compact && activity.detail && (
                <div className="mt-0.5 whitespace-pre-wrap text-gray-600">
                  {activity.detail}
                </div>
              )}
              <div className="mt-0.5 text-gray-500">
                {activity.dueAt && (
                  <span className={overdue ? "text-red-500" : undefined}>
                    {ma.due(formatWhen(activity.dueAt))}
                    {overdue ? ` · ${ma.overdue}` : ""}
                    {" · "}
                  </span>
                )}
                {isDone && activity.completedAt && (
                  <span>
                    {ma.doneAt(formatWhen(activity.completedAt))}
                    {" · "}
                  </span>
                )}
                {ma.by(activity.createdByName, formatWhen(activity.createdAt))}
              </div>
              {!compact && renderExtra?.(activity)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ActivityFormValues {
  type: LeadActivityType;
  subject: string;
  detail?: string;
  due_at?: Dayjs | null;
}

/** ลงกิจกรรม — เว้นกำหนด = ทำไปแล้ว, ใส่กำหนด = ต้องตามต่อ. */
export function ActivityModal({
  endpoint,
  type,
  onClose,
  onSaved,
}: {
  /** e.g. `leads/<id>/activities` or `opportunities/<id>/activities`. */
  endpoint: string;
  /** null = closed. */
  type: LeadActivityType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ActivityFormValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    let values: ActivityFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await appApi(endpoint, {
      method: "POST",
      body: JSON.stringify({
        type: values.type,
        subject: values.subject.trim(),
        detail: values.detail?.trim() || undefined,
        due_at: values.due_at ? values.due_at.toISOString() : undefined,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(ma.form.saved);
    onSaved();
  }

  return (
    <Modal
      open={type !== null}
      title={ma.form.title}
      okText={ma.form.save}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      mask={{ closable: false }}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Form<ActivityFormValues>
        form={form}
        layout="vertical"
        initialValues={{ type: type ?? "note" }}
      >
        <Form.Item name="type" label={ma.form.type}>
          <Select
            options={Object.entries(ma.type).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="subject"
          label={ma.form.subject}
          rules={[{ required: true, whitespace: true, message: ma.form.subjectRequired }]}
        >
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name="detail" label={ma.form.detail}>
          <Input.TextArea rows={3} maxLength={4000} />
        </Form.Item>
        <Form.Item name="due_at" label={ma.form.dueAt}>
          <DatePicker
            className="w-full"
            showTime
            needConfirm={false}
            format="D MMM YYYY HH:mm"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
