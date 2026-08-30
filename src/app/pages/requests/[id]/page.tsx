import { Alert, Card, Descriptions, Steps, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { getRequest } from "@/lib/api/requests";
import type { RequestDetail, RequestEventRow } from "@/lib/api/types";
import { RequestActions } from "@/components/request-actions";
import { getSession } from "@/lib/session";
import { messages } from "@/lib/messages";

/** Thai date + time as §16 prints it: `23 ส.ค. 16:40 น.` */
function when(iso: string): string {
  const at = new Date(iso);

  return `${at.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  })} ${at.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  })} น.`;
}

function fileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

/** What actually happened at a rung, in the words §16 uses. */
function stepOutcome(status: string, decision: string | null): string {
  if (decision === 'approved') return messages.requestDetail.stepApproved;
  if (decision === 'rejected') return messages.requestDetail.stepRejected;
  if (status === 'pending') return messages.requestDetail.stepPending;

  return messages.requestDetail.stepWaiting;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "default",
  submitted: "blue",
  pending_approval: "gold",
  returned: "orange",
  approved: "green",
  rejected: "red",
  in_progress: "cyan",
  completed: "green",
  cancelled: "default",
  on_hold: "purple",
};

/**
 * Screen §16 หน้าที่ 4 — รายละเอียดคำขอ + ไทม์ไลน์.
 *
 * A server component: everything here is a read, and rendering on the server
 * is also what keeps SCOPE-04 honest — a masked `margin` never reaches the
 * browser at all, rather than being hidden by CSS over data that was sent
 * anyway.
 */
export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, session] = await Promise.all([getRequest(id), getSession()]);

  if (!result.ok) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={result.error.message}
      />
    );
  }

  const request = result.data;
  const approvalCase = request.approvalCases?.[0];
  const events = [...(request.events ?? [])].sort((a, b) => a.seq - b.seq);
  const attachments = (request.attachments ?? []).filter(
    (entry) => !entry.deletedAt,
  );

  return (
    <div className="space-y-4">
      {/*
        The buttons that move the ticket. Rendered above the detail because a
        request open on this page is usually open in order to do something to
        it, not to read it.
      */}
      <RequestActions request={request} viewerId={session?.user.id ?? ""} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Title level={4} className="mb-0!">
          {request.requestNo ?? messages.myWork.status.draft} ·{" "}
          {request.requestType?.name ?? request.typeCode}
        </Title>
        <span className="flex items-center gap-2">
          <Tag color={STATUS_COLOR[request.status]}>
            {messages.myWork.status[request.status] ?? request.status}
          </Tag>
          {approvalCase && (
            <Text type="secondary">
              {messages.myWork.step(
                approvalCase.currentStep,
                approvalCase.steps.length,
              )}
            </Text>
          )}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title={messages.requestDetail.infoTitle} size="small">
            <RequestFacts request={request} />
          </Card>

          <Card
            title={messages.requestDetail.attachments(attachments.length)}
            size="small"
          >
            <ul className="divide-y divide-black/5">
              {attachments.map((entry) => (
                <li key={entry.id} className="py-2 text-sm">
                  {entry.fileName}{" "}
                  <Text type="secondary">· {fileSize(entry.sizeBytes)}</Text>
                </li>
              ))}
            </ul>

            {/*
              Stated rather than offered as a button that could only ever fail:
              nothing was stored, so there is nothing to download (question G).
            */}
            <Paragraph type="secondary" className="mt-2! mb-0! text-xs">
              {messages.requestDetail.noDownload}
            </Paragraph>
          </Card>

          <Card title={messages.requestDetail.timelineTitle} size="small">
            <Timeline events={events} />
          </Card>
        </div>

        <Card title={messages.requestDetail.chainTitle} size="small">
          {approvalCase ? (
            <>
              <Steps
                orientation="vertical"
                size="small"
                current={approvalCase.currentStep - 1}
                items={approvalCase.steps.map((step) => ({
                  title: `${messages.requestDetail.chainStep(step.stepNo)} · ${step.approverRole}`,
                  description: (
                    <span className="text-xs">
                      {step.approver?.displayName ?? "—"}
                      {" · "}
                      {stepOutcome(step.status, step.decision)}
                      {step.decidedAt && ` · ${when(step.decidedAt)}`}
                    </span>
                  ),
                }))}
              />

              {/* The two lines §16 requires under the stepper. */}
              <Paragraph type="secondary" className="mt-3! mb-1! text-xs">
                {messages.requestDetail.chainFrom(
                  approvalCase.amount
                    ? Number(approvalCase.amount).toLocaleString("th-TH")
                    : "—",
                  approvalCase.matrixVersion,
                )}
              </Paragraph>
              <Paragraph type="secondary" className="mb-0! text-xs">
                {messages.requestDetail.voidNote}
              </Paragraph>
            </>
          ) : (
            <Text type="secondary">
              {messages.requestForm.chainNeedsAmount}
            </Text>
          )}
        </Card>
      </div>
    </div>
  );
}

/**
 * The answers, labelled by the schema that collected them.
 *
 * A field the caller may not see is *absent* from the payload — the backend
 * strips it (SCOPE-04) — so a name the schema declares but the data does not
 * carry is printed as `••••••`. That is exactly the `margin` case in the
 * mockup, and it means the mask cannot be lifted by reading the page source.
 */
function RequestFacts({ request }: { request: RequestDetail }) {
  const properties = request.requestType?.formSchema?.properties ?? {};
  const formData = request.formData ?? {};

  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label={messages.requestDetail.submittedAt}>
        {request.submittedAt ? when(request.submittedAt) : "—"}
      </Descriptions.Item>

      <Descriptions.Item label={messages.requestDetail.reference}>
        {request.refId ? `${request.refType ?? "ref"} ${request.refId}` : "—"}
      </Descriptions.Item>

      {Object.entries(properties).map(([name, property]) => {
        const withheld = !(name in formData);

        return (
          <Descriptions.Item key={name} label={property.title ?? name}>
            {withheld ? (
              <Text type="secondary">{messages.requestDetail.masked}</Text>
            ) : (
              String(formData[name] ?? "—")
            )}
          </Descriptions.Item>
        );
      })}
    </Descriptions>
  );
}

/** REQ-07 — append-only, and it shows what the system did as well as people. */
function Timeline({ events }: { events: RequestEventRow[] }) {
  if (!events.length) return <Text type="secondary">—</Text>;

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="text-sm">
          <div>
            <Text strong>
              {messages.requestDetail.events[event.type] ?? event.type}
            </Text>{" "}
            <Text type="secondary">
              —{" "}
              {event.actorLabel === "system"
                ? messages.requestDetail.system
                : (event.actor?.displayName ?? messages.requestDetail.system)}{" "}
              · {when(event.createdAt)}
            </Text>
          </div>

          {event.fromStatus && event.toStatus && (
            <Text type="secondary" className="text-xs">
              {messages.myWork.status[event.fromStatus] ?? event.fromStatus} →{" "}
              {messages.myWork.status[event.toStatus] ?? event.toStatus}
            </Text>
          )}
        </li>
      ))}
    </ol>
  );
}
