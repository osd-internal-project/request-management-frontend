import type { Metadata } from "next";
import { Card, Descriptions, Result, Tag } from "antd";
import Title from "antd/es/typography/Title";
import { intakeFetch } from "@/lib/public/intake-client";
import type { IntakeStatusView } from "@/lib/public/intake-types";
import { messages } from "@/lib/messages";

const m = messages.publicForm;

type Params = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: m.statusTitle,
  robots: { index: false, follow: false },
};

const when = (at: string | null) =>
  at
    ? new Date(at).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const STATUS_COLOR: Record<string, string> = {
  completed: "green",
  closed: "default",
  rejected: "red",
  cancelled: "default",
  returned: "orange",
  on_hold: "orange",
};

/**
 * CD-66 — the private status link a customer got on submitting. Shows where
 * the request stands and nothing of its content or who handles it.
 */
export default async function PublicStatusPage({ params }: Params) {
  const { token } = await params;
  const result = await intakeFetch<IntakeStatusView>(
    `status/${encodeURIComponent(token)}`,
  );
  if (!result.ok) {
    return result.status === 404 ? (
      <Result status="404" title={m.statusNotFound} />
    ) : (
      <Result status="warning" title={result.message} />
    );
  }
  const view = result.data;
  return (
    <Card>
      <Title level={4}>{m.statusTitle}</Title>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={m.requestNo}>
          {view.request_no ?? m.pendingNo}
        </Descriptions.Item>
        <Descriptions.Item label={m.requestType}>
          {view.type_name}
        </Descriptions.Item>
        <Descriptions.Item label={m.company}>
          {view.company_name}
        </Descriptions.Item>
        <Descriptions.Item label={m.currentStatus}>
          <Tag color={STATUS_COLOR[view.status] ?? "blue"}>
            {m.status[view.status] ?? view.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={m.submittedAt}>
          {when(view.submitted_at)}
        </Descriptions.Item>
        {view.due_at && !view.completed_at && (
          <Descriptions.Item label={m.dueAt}>
            {when(view.due_at)}
          </Descriptions.Item>
        )}
        {view.completed_at && (
          <Descriptions.Item label={m.completedAt}>
            {when(view.completed_at)}
          </Descriptions.Item>
        )}
        <Descriptions.Item label={m.updatedAt}>
          {when(view.updated_at)}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
