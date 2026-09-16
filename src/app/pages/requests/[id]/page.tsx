import { Alert, Card, Collapse, Descriptions, Steps, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { getRequest, getRequestTree } from "@/lib/api/requests";
import type {
  FormSchema,
  FormSchemaProperty,
  RequestDetail,
  RequestPerson,
} from "@/lib/api/types";
import { fieldOrder } from "@/lib/api/types";
import { RequestActions } from "@/components/request-actions";
import { ReceiverForm } from "@/components/receiver-form";
import { RequestComments } from "@/components/request-comments";
import { RequestTimeline } from "@/components/request-timeline";
import { RequestTreePanel } from "@/components/request-tree";
import { DueBadge } from "@/components/due-badge";
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
  if (decision === "approved") return messages.requestDetail.stepApproved;
  if (decision === "rejected") return messages.requestDetail.stepRejected;
  if (status === "pending") return messages.requestDetail.stepPending;

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
  const [result, session, treeResult] = await Promise.all([
    getRequest(id),
    getSession(),
    getRequestTree(id),
  ]);

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

  // An unreadable tree is not a reason to fail the page: the request itself is
  // what the reader came for, and an empty panel says "nothing under this".
  const tree = treeResult.ok
    ? treeResult.data
    : { parent: null, descendants: [] };

  const request = result.data;
  const approvalCase = request.approvalCases?.[0];
  const events = [...(request.events ?? [])].sort((a, b) => a.seq - b.seq);

  const currentStep = approvalCase?.steps.find(
    (step) => step.stepNo === approvalCase.currentStep,
  );

  const viewerId = session?.user.id ?? "";

  /*
    Anyone the request already involves may comment. The read itself is what
    decided they could open it (SCOPE-03 answers 404, not 403, for anything
    else), so this only keeps somebody who reached it *as a group head* from
    joining a conversation they are not part of.
  */
  /*
    H2.2 ข้อ 3 — the receiver's form, from the snapshot taken at submit so a
    type edited mid-flight cannot change what finishing this request requires
    (REQ-01). Falls back to the live type for a request that has none yet.
  */
  const receiverSchema =
    request.typeSnapshot?.receiverFormSchema ??
    request.requestType?.receiverFormSchema ??
    null;

  /*
    REQ-04 — the bounce causes offered by the "ตีกลับ" dialog.

    Snapshot first, for the same reason and in the same order as
    `returnToRequester` on the server (`requests.service.ts`). Reading the live
    type here instead would let the picker offer a code the server then refuses
    — a failure the person on screen has no way to correct.
  */
  const returnReasons =
    request.typeSnapshot?.returnReasonCodes ??
    request.requestType?.returnReasonCodes ??
    [];

  /** Only the person carrying the request fills it in, and only while open. */
  const showReceiverForm =
    request.status === "in_progress" &&
    (request.assigneeUserId === viewerId ||
      request.receiverUserId === viewerId);

  const involved =
    request.requesterId === viewerId ||
    request.receiverUserId === viewerId ||
    request.assigneeUserId === viewerId ||
    (currentStep?.candidateUserIds ?? []).includes(viewerId);
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
      <RequestActions
        request={{
          ...request,
          approvalCaseId: approvalCase?.id ?? null,
          approverCandidateIds: currentStep?.candidateUserIds ?? [],
          // The plain "ทำเสร็จแล้ว" button steps aside when there is a form:
          // finishing *is* submitting it, and two controls for one action is
          // how a request gets completed with the form still blank.
          hasReceiverForm: Boolean(receiverSchema),
          returnReasons,
        }}
        viewerId={viewerId}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Title level={4} className="mb-0!">
          {request.requestNo ?? messages.myWork.status.draft} ·{" "}
          {request.requestType?.name ?? request.typeCode}
        </Title>
        <span className="flex items-center gap-2">
          <Tag color={STATUS_COLOR[request.status]}>
            {messages.myWork.status[request.status] ?? request.status}
          </Tag>
          {/*
            §16 หน้าที่ 4 puts `เกินกำหนด 3 ชม.` in this header. The same
            component the list column uses, so the row a reader clicked and the
            page it opened cannot report different deadlines.
          */}
          <DueBadge row={request} />
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.5fr)]">
        <div className="space-y-2">
          {/*
            Who is holding this, before what it says. "ใครรับเรื่องนี้" is the
            question a reader arrives with, and until now the screen answered
            it nowhere — the three people were fetched and used only to compare
            against the viewer's own id.
          */}
         
          <div>
            <Card title={messages.requestDetail.infoTitle} size="small">
              <RequestFacts request={request} />
            </Card>
          </div>
          {/*
            What the receiver recorded, once they have. The approver deciding on
            this request is deciding on *the work*, not on the ask — so a
            completed request that shows only what was requested asks them to
            approve something they cannot see.
          */}
          <div>
            {receiverSchema &&
              Object.keys(request.receiverFormData ?? {}).length > 0 && (
                <Card
                  title={messages.requestDetail.receiverFormTitle}
                  size="small"
                >
                  <SchemaAnswers
                    schema={receiverSchema}
                    answers={request.receiverFormData ?? {}}
                  />
                </Card>
              )}
          </div>
          <div>
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
          </div>
          {/*
            H2.2 ข้อ 4 — the chain this request sits in. Above the timeline
            because it is about what the request *is*, and the timeline is
            about what has happened to it.
          */}
          <div>
            {receiverSchema && showReceiverForm && (
              <ReceiverForm
                requestId={request.id}
                schema={receiverSchema}
                initial={request.receiverFormData ?? {}}
              />
            )}
          </div>
          <div>
            <Card title={messages.requestDetail.treeTitle} size="small">
              <RequestTreePanel requestId={request.id} tree={tree} />
            </Card>
          </div>
          <div>
            <Card
              title={messages.requestDetail.commentsTitle(
                (request.comments ?? []).length,
              )}
              size="small"
            >
              <RequestComments
                requestId={request.id}
                comments={request.comments ?? []}
                canComment={involved}
              />
            </Card>
          </div>
        </div>
        <div className=" space-y-2">
           <div>
            <Card title={messages.requestDetail.peopleTitle} size="small">
              <RequestPeople request={request} />
            </Card>
          </div>
          <div>
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
                          {/*
                            The decider's own words, beside their decision.
                            Required on approve, reject and send_back — and
                            until now readable only from the timeline in the
                            other column, so "why was this rejected" meant
                            hunting for it.
                          */}
                          {step.note && (
                            <>
                              <br />
                              <Text type="secondary">{step.note}</Text>
                            </>
                          )}
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
                  {messages.requestForm.chainNoMatrix}
                </Text>
              )}
            </Card>
          </div>

          <div>
            <Card title={messages.requestDetail.timelineTitle} size="small">
              <RequestTimeline events={events} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A field whose answer is rows, not a value — drawn as a table. */
function isTableField(property: FormSchemaProperty): boolean {
  return (
    property.type === "array" &&
    Object.keys(property.items?.properties ?? {}).length > 0
  );
}

/**
 * One answer in the grid, labelled by the field that collected it.
 *
 * A field the caller may not see is *absent* from the payload — the backend
 * strips it (SCOPE-04) — so a name the schema declares but the data does not
 * carry prints as `••••••` rather than as empty. That is the `margin` case in
 * the mockup, and it means the mask cannot be lifted by reading the page
 * source.
 *
 * A table field takes the **whole row** and folds into a `Collapse` whose
 * header is the field's own name. Squeezed into one of three columns, a table
 * of five columns was legible only by scrolling it sideways — and the label
 * above it repeated what the header now says.
 */
function AnswerField({
  name,
  property,
  answers,
}: {
  readonly name: string;
  readonly property: FormSchemaProperty;
  readonly answers: Record<string, unknown>;
}) {
  const withheld = !(name in answers);
  const label = property.title ?? name;
  const value = answers[name];

  if (!withheld && isTableField(property)) {
    const rows = Array.isArray(value) ? value.length : 0;

    return (
      <div className="md:col-span-3">
        <Collapse
          ghost
          size="small"
          /* Open on arrival: this page exists to be read, and an approver
             deciding on a folded table is deciding on what they cannot see. */
          defaultActiveKey={[name]}
          items={[
            {
              key: name,
              label: (
                <span className="text-sm font-medium text-gray-500">
                  {label}
                  {rows > 0 && ` · ${messages.requestDetail.tableRows(rows)}`}
                </span>
              ),
              children: <FormAnswer property={property} value={value} />,
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {withheld ? (
        <Text type="secondary">{messages.requestDetail.masked}</Text>
      ) : (
        <FormAnswer property={property} value={value} />
      )}
    </div>
  );
}

/**
 * A schema's answers, as a labelled list.
 *
 * Shares `AnswerField` with the request's own facts: this used to print its
 * values with `String(...)`, which turned a table field into
 * `[object Object],[object Object]` — the very defect `FormAnswer` was written
 * to fix, fixed in only one of the two places that needed it.
 */
function SchemaAnswers({
  schema,
  answers,
}: {
  schema: FormSchema;
  answers: Record<string, unknown>;
}) {
  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(schema.properties ?? {}).map(([name, property]) => (
        <AnswerField
          key={name}
          name={name}
          property={property}
          answers={answers}
        />
      ))}
    </div>
  );
}

/**
 * One answer, printed the way its field was filled in.
 *
 * A table field holds rows of objects, and `String(value)` turned those into
 * `[object Object],[object Object]` — the answers were stored correctly and
 * unreadable on the one screen that exists to read them.
 */
function FormAnswer({
  property,
  value,
}: {
  readonly property: FormSchemaProperty;
  readonly value: unknown;
}) {
  const columns = Object.entries(property.items?.properties ?? {}).sort(
    ([, a], [, b]) => fieldOrder(a) - fieldOrder(b),
  );

  if (property.type !== "array" || !columns.length || !Array.isArray(value)) {
    return <>{String(value ?? "—")}</>;
  }

  const rows = value.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null && !Array.isArray(row),
  );

  if (!rows.length) return <Text type="secondary">—</Text>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[24rem] text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left">
            {columns.map(([column, spec]) => (
              <th key={column} className="px-2 py-1 font-medium">
                {spec.title ?? column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-black/5">
              {columns.map(([column]) => (
                <td key={column} className="px-2 py-1">
                  {/* A column the reader may not see was deleted by the
                      masking interceptor, so it is absent, not blank. */}
                  {column in row ? (
                    String(row[column] ?? "—")
                  ) : (
                    <Text type="secondary">
                      {messages.requestDetail.masked}
                    </Text>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestFacts({ request }: { request: RequestDetail }) {
  const properties = request.requestType?.formSchema?.properties ?? {};
  const formData = request.formData ?? {};

  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500">
          {messages.requestDetail.submittedAt}
        </p>
        <p className="text-sm">
          {request.submittedAt ? when(request.submittedAt) : "—"}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">
          {messages.requestDetail.createdAt}
        </p>
        <p className="text-sm">
          {request.createdAt ? when(request.createdAt) : "—"}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">
          {messages.requestDetail.reference}
        </p>
        <p className="text-sm">
          {request.refId ? `${request.refType ?? "ref"} ${request.refId}` : "—"}
        </p>
      </div>
      {/*
        Only on a cancelled request, because REQ-05 requires the reason and
        nothing else on this page carried it — a cancelled request explained
        itself only if the reason happened to land in a timeline entry.
      */}
      {request.status === "cancelled" && (
        <div>
          <p className="text-sm font-medium text-gray-500">
            {messages.requestDetail.cancelReasonLabel}
          </p>
          <p className="text-sm">{request.cancelReason || "—"}</p>
        </div>
      )}
      {Object.entries(properties).map(([name, property]) => (
        <AnswerField
          key={name}
          name={name}
          property={property}
          answers={formData}
        />
      ))}
    </div>
  );
}

/**
 * The three people a request passes through, and how to reach them.
 *
 * A row is omitted rather than dashed when the person does not exist yet: a
 * request nobody has been assigned has no assignee, which is a normal state and
 * not a missing value. Dashes here would read as "we lost it".
 *
 * `orgUnit` is the person's current team, not the request's own
 * `receiverOrgUnitId` — that column is a snapshot of where the work sat when it
 * was raised, which answers a reporting question rather than "who do I call".
 */
function RequestPeople({ request }: { request: RequestDetail }) {
  const people: { label: string; person: RequestPerson | null | undefined }[] = [
    { label: messages.requestDetail.requester, person: request.requester },
    { label: messages.requestDetail.receiverLabel, person: request.receiver },
    { label: messages.requestDetail.assigneeLabel, person: request.assignee },
  ];

  const known = people.filter((entry) => entry.person);

  if (!known.length) return <Text type="secondary">—</Text>;

  return (
    <Descriptions
      size="small" labelStyle={{ width: "30%" }}
      column={{ xs: 1, md: known.length > 1 ? 1 : 1 }}
      items={known.map(({ label, person }) => ({
        key: label,
        label,
        children: <PersonCell person={person as RequestPerson} />,
      }))}
    />
  );
}

/** Name first, then the facts that let someone act on it. */
function PersonCell({ person }: { person: RequestPerson }) {
  const contact = [person.extension, person.email].filter(Boolean).join(" · ");
  const role = [person.position, person.orgUnit?.name].filter(Boolean).join(" · ");

  return (
    <div className="text-xs">
      <div>{person.displayName}</div>
      {role && <Text type="secondary">{role}</Text>}
      {role && contact && <br />}
      {contact && <Text type="secondary">{contact}</Text>}
    </div>
  );
}
