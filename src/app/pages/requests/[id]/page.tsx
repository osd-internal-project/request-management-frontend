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
import {
  booleanLabelsOf,
  fieldKindOf,
  fieldOrder,
  hasStoredFile,
  missingRequiredSubRequests,
} from "@/lib/api/types";
import { attachmentFileUrl } from "@/lib/api/client-requests";
import { RequestActions } from "@/components/requests/request-actions";
import { ReceiverForm } from "@/components/requests/receiver-form";
import { RequestComments } from "@/components/requests/request-comments";
import { RequestTimeline } from "@/components/requests/request-timeline";
import { RequestTreePanel } from "@/components/requests/request-tree";
import { SubRequestChecklist } from "@/components/requests/sub-request-checklist";
import { RequestStepper } from "@/components/requests/request-stepper";
import { CurrentStepCard } from "@/components/requests/current-step-card";
import { DueBadge } from "@/components/requests/due-badge";
import { ResponseClock, SeverityTag } from "@/components/requests/severity";
import { can, getSession, type Session } from "@/lib/session";
import { getSolutionForRequest } from "@/lib/api/presales";
import { getQuotationApproval } from "@/lib/api/pricing";
import { DiscountImpactCard } from "@/components/pricing/discount-impact-card";
import { SolutionStartCard } from "@/components/presales/solution-start-card";
import {
  getContractRequestPackage,
  getDraftForRequest,
} from "@/lib/api/contracts";
import { ContractDraftCard } from "@/components/legal/contract-draft-card";
import { WorkOrderPanel } from "@/components/service/work-order-panel";
import { DisbursementPanel } from "@/components/disbursement/disbursement-panel";
import { ChatRecordContext } from "@/components/layout/chat/chat-record-context";
import { ContractRequestPackageCard } from "@/components/legal/contract-request-package-card";
import { messages } from "@/lib/messages";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { getOrgUnitShapes } from "@/lib/api/org-units";
import { subtreeIds } from "@/lib/org/org-tree";
import { DraftAttachments } from "@/components/requests/draft-attachments";
import { STATUS_COLOR } from "@/components/requests/status";

/**
 * Thai date + time as §16 prints it: `23 ส.ค. 16:40 น.`
 *
 * Pinned to Bangkok: this runs on the server, whose zone is UTC, so the
 * approval chain read seven hours behind the timeline beside it (which the
 * browser formats in local time).
 */
function when(iso: string): string {
  const at = new Date(iso);

  return `${at.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  })} ${at.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })} น.`;
}

/** One non-table answer as text: labelled booleans, Thai dates. Server-rendered, so the zone is pinned. */
/**
 * The answers on this request the viewer is not allowed to see.
 *
 * The masker deletes a withheld field, so absence alone cannot tell "hidden
 * from you" from "never filled in" — and every blank optional field used to
 * print as ••••••. A field is withheld only when it is declared sensitive for
 * this type and the viewer's role does not unmask it. Null when the session
 * predates `sensitive_fields_all`: then every absent field reads as withheld,
 * as before, rather than leaking nothing and printing "—" over a mask.
 */
function withheldFields(
  session: Session | null,
  typeCode: string | null | undefined,
): ReadonlySet<string> | null {
  const declared = session?.sensitive_fields_all;
  if (!declared || !typeCode) return null;

  const prefix = `request:${typeCode}.`;
  const visible = new Set(session.sensitive_fields_visible);

  return new Set(
    declared
      .filter((key) => key.startsWith(prefix) && !visible.has(key))
      .map((key) => key.slice(prefix.length)),
  );
}

function answerText(property: FormSchemaProperty, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";

  const kind = fieldKindOf(property);

  if (kind === "boolean" && typeof value === "boolean") {
    const labels = booleanLabelsOf(property);
    return value ? labels.yes : labels.no;
  }

  if ((kind === "date" || kind === "datetime") && typeof value === "string") {
    // A bare date is a calendar day, not an instant: read it at UTC midnight so no zone shifts it.
    const at = new Date(kind === "date" ? `${value}T00:00:00Z` : value);
    if (Number.isNaN(at.getTime())) return value;

    const day = at.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: kind === "date" ? "UTC" : "Asia/Bangkok",
    });
    if (kind === "date") return day;

    return `${day} ${at.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    })} น.`;
  }

  return String(value);
}

function fileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

/** What happened at a rung, read off the step's status (the stored decision is a verb). */
function stepOutcome(
  stepStatus: string,
  caseStatus: string | undefined,
): string {
  if (stepStatus === "skipped") return "";
  if (stepStatus === "approved") return messages.requestDetail.stepApproved;
  if (stepStatus === "rejected") return messages.requestDetail.stepRejected;
  if (stepStatus === "returned") return messages.requestDetail.stepReturned;
  if (caseStatus && caseStatus !== "pending")
    return messages.requestDetail.stepClosed;
  if (stepStatus === "pending") return messages.requestDetail.stepPending;

  return messages.requestDetail.stepWaiting;
}

/** antd `Steps` state for a rung. */
function stepState(
  stepStatus: string,
): "finish" | "error" | "process" | "wait" {
  if (stepStatus === "approved") return "finish";
  if (stepStatus === "rejected" || stepStatus === "returned") return "error";
  if (stepStatus === "pending") return "process";
  return "wait";
}

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
  // CD-132 — Pre-Sales starts (or reopens) the Solution from its request.
  const solutionResult = can(session, "presales.solution.manage")
    ? await getSolutionForRequest(id)
    : null;
  // CD-146 — Legal drafts the contract on a contract request.
  const [draftResult, packageResult] = can(session, "legal.contract.read")
    ? await Promise.all([
        getDraftForRequest(id),
        // CD-145 — the deal's terms and scope, attached on submit
        getContractRequestPackage(id),
      ])
    : [null, null];

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
  // CD-203 — a price approval shows what its discount does to the margin.
  const discountResult =
    request.refType === "quotation" &&
    (can(session, "approval.decide") || can(session, "crm.sales.read"))
      ? await getQuotationApproval(request.id)
      : null;
  const approvalCase = request.approvalCases?.[0];
  const events = [...(request.events ?? [])].sort((a, b) => a.seq - b.seq);

  const currentStep = approvalCase?.steps.find(
    (step) => step.stepNo === approvalCase.currentStep,
  );

  const viewerId = session?.user.id ?? "";
  const withheldSet = withheldFields(session, request.typeCode);

  /*
    A draft another screen raised for a type with no ผู้รับเรื่องประจำ has
    nobody to go to, and submit answers 400 until somebody is named. Offer the
    receiving team's members — the same branch the new-request form offers.
  */
  const needsReceiver =
    request.status === "draft" &&
    request.requesterId === viewerId &&
    !request.receiverUserId;
  const [people, units] = needsReceiver
    ? await Promise.all([getAllDirectoryUsers(), getOrgUnitShapes()])
    : [null, null];
  const receiverChoices = needsReceiver
    ? (() => {
        const all = people?.ok ? people.data : [];
        const branch =
          request.receiverOrgUnitId && units?.ok
            ? subtreeIds(units.data, request.receiverOrgUnitId)
            : null;
        return all
          .filter(
            (person) =>
              !branch || (person.orgUnitId && branch.has(person.orgUnitId)),
          )
          .map((person) => ({
            id: person.id,
            label: `${person.displayName} · ${person.username}`,
          }));
      })()
    : null;

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

  // Snapshot only: the checklist is fixed at submit, and a draft has none yet.
  const checklist = request.typeSnapshot?.subRequestTypes ?? [];
  // The step flow pinned at submit; empty for a type that runs the fixed lifecycle.
  const flowSteps = request.flowVersion?.steps ?? [];
  const stepNames = Object.fromEntries(
    flowSteps.map((step) => [step.code, step.name]),
  );
  const currentFlowStep =
    flowSteps.find((step) => step.code === request.currentStepCode) ?? null;
  const flowMoves = request.flow_moves ?? null;
  const isFlowV2 = flowMoves?.schema_version === 2;
  // v2: the step's holder acts on it; a requester step after the first is shown here too.
  const holdsStep = isFlowV2
    ? flowMoves?.holder_user_id === viewerId
    : showReceiverForm;
  const showStepCard =
    ["in_progress", "pending_approval"].includes(request.status) ||
    (isFlowV2 &&
      (request.status === "approved" ||
        (request.status === "returned" &&
          currentFlowStep?.code !== flowSteps[0]?.code)));

  const directChildren = tree.descendants.filter(
    (node) => node.parentRequestId === request.id,
  );
  const missingSubRequests = missingRequiredSubRequests(
    checklist,
    directChildren,
  ).length;

  const involved =
    request.requesterId === viewerId ||
    request.receiverUserId === viewerId ||
    request.assigneeUserId === viewerId ||
    (currentStep?.candidateUserIds ?? []).includes(viewerId);
  const attachments = (request.attachments ?? []).filter(
    (entry) => !entry.deletedAt,
  );

  // Only what the header already shows: no form values, prices or comments go to the assistant.
  const chatTitle = messages.chat.context.requestTitle(
    request.requestNo ?? messages.myWork.status.draft,
  );
  const dueAt = request.slaClock?.dueAt ?? request.dueAt;
  const chatLines = [
    chatTitle,
    messages.chat.context.requestType(
      request.requestType?.name ?? request.typeCode,
    ),
    messages.chat.context.status(
      messages.myWork.status[request.status] ?? request.status,
    ),
    currentStep
      ? messages.chat.context.currentStep(
          currentStep.stepNo,
          currentStep.approverRole,
        )
      : null,
    dueAt ? messages.chat.context.dueAt(dueAt) : null,
    request.requester
      ? messages.chat.context.requester(request.requester.displayName)
      : null,
    request.receiver
      ? messages.chat.context.receiver(request.receiver.displayName)
      : null,
    request.assignee
      ? messages.chat.context.assignee(request.assignee.displayName)
      : null,
  ];

  return (
    <div className="space-y-4">
      <ChatRecordContext
        context={{
          id: request.id,
          type: "request",
          title: chatTitle,
          content: chatLines.filter((line) => line !== null).join("\n"),
        }}
      />
      {/*
        The buttons that move the ticket. Rendered above the detail because a
        request open on this page is usually open in order to do something to
        it, not to read it.
      */}
      <RequestActions
        request={{
          ...request,
          approvalCaseId: approvalCase?.id ?? null,
          approvalStage: approvalCase?.subjectType ?? null,
          // The level may let an approval go without a note (B4).
          approveNoteOptional: currentStep?.noteRequired === "reject_or_return",
          // The plain "ทำเสร็จแล้ว" button steps aside when there is a form:
          // finishing *is* submitting it, and two controls for one action is
          // how a request gets completed with the form still blank.
          hasReceiverForm: Boolean(receiverSchema),
          returnReasons,
          missingSubRequests,
          flowMoves,
          stepNames,
          receiverChoices,
        }}
        session={session}
      />

      {/* CD-239 — a case's service side: in contract or billed, cause and fix */}
      {request.severity && can(session, "service.asset.read") && (
        <WorkOrderPanel
          requestId={id}
          status={request.status}
          canManage={can(session, "service.asset.manage")}
        />
      )}

      {/* การเบิก — created once an FI05 / FI06 request is approved */}
      {request.requestNo && ["FI05", "FI06"].includes(request.typeCode) && (
        <DisbursementPanel
          requestNo={request.requestNo}
          approved={["approved", "closed"].includes(request.status)}
          canCreate={can(session, "disbursement.pay")}
        />
      )}

      {discountResult?.ok && <DiscountImpactCard view={discountResult.data} />}

      {solutionResult?.ok && (
        <SolutionStartCard view={{ ...solutionResult.data, requestId: id }} />
      )}

      {packageResult?.ok && (
        <ContractRequestPackageCard
          requestId={id}
          view={packageResult.data}
          canManage={can(session, "legal.contract.manage")}
        />
      )}

      {draftResult?.ok && (
        <ContractDraftCard
          requestId={id}
          view={draftResult.data}
          canManage={can(session, "legal.contract.manage")}
        />
      )}

      {checklist.length > 0 && (
        <SubRequestChecklist
          requestId={request.id}
          items={checklist}
          childRequests={directChildren}
          canCreate={showReceiverForm}
        />
      )}

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
          {/* CD-67 — a case also carries its severity and response clock. */}
          <SeverityTag severity={request.severity} />
          <ResponseClock row={request} />
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

      {flowSteps.length > 0 && (
        <RequestStepper
          steps={flowSteps}
          runs={request.stepRuns ?? []}
          currentStepCode={request.currentStepCode ?? null}
          waitingApproval={request.status === "pending_approval"}
          assigneeName={request.assignee?.displayName ?? null}
        />
      )}

      {/*
        Below `lg` both columns dissolve (`contents`) into one stack ordered by
        what the reader has to do: the step's work, the decision, then the facts.
      */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.5fr)]">
        <div className="space-y-2 max-lg:contents [&>*]:max-lg:order-4">
          {currentFlowStep && flowMoves && showStepCard && (
            <div className="max-lg:order-1!">
              <CurrentStepCard
                requestId={request.id}
                stepName={currentFlowStep.name}
                formSchema={currentFlowStep.formSchema}
                initial={request.stepFormData?.[currentFlowStep.code] ?? {}}
                checklist={flowMoves.checklist}
                childRequests={directChildren.filter(
                  (child) => child.parentStepCode === currentFlowStep.code,
                )}
                requiresApproval={flowMoves.requires_approval}
                isLast={flowMoves.is_last}
                canEdit={holdsStep}
                requiredDocs={currentFlowStep.requiredDocs}
                attachments={attachments}
              />
            </div>
          )}
          {/*
            Who is holding this, before what it says. "ใครรับเรื่องนี้" is the
            question a reader arrives with, and until now the screen answered
            it nowhere — the three people were fetched and used only to compare
            against the viewer's own id.
          */}

          <div>
            <Card title={messages.requestDetail.infoTitle} size="small">
              <RequestFacts
                request={request}
                withheldSet={withheldSet}
              />
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
                    withheldSet={withheldSet}
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
                    {hasStoredFile(entry) ? (
                      <a href={attachmentFileUrl(request.id, entry.id)}>
                        {entry.fileName}
                      </a>
                    ) : (
                      entry.fileName
                    )}{" "}
                    <Text type="secondary">· {fileSize(entry.sizeBytes)}</Text>
                    {!hasStoredFile(entry) && (
                      <Text type="secondary" className="block text-xs">
                        {messages.requestDetail.noFile}
                      </Text>
                    )}
                  </li>
                ))}
              </ul>
              {/* A draft another screen raised has no form to attach its documents from. */}
              {["draft", "returned"].includes(request.status) &&
                request.requesterId === viewerId && (
                  <DraftAttachments
                    requestId={request.id}
                    requiredDocs={
                      (request.status === "returned"
                        ? request.typeSnapshot?.requiredDocs
                        : undefined) ??
                      request.requestType?.requiredDocs ??
                      []
                    }
                    attachedCodes={attachments
                      .map((entry) => entry.docCode)
                      .filter((code): code is string => Boolean(code))}
                  />
                )}
            </Card>
          </div>
          {/*
            H2.2 ข้อ 4 — the chain this request sits in. Above the timeline
            because it is about what the request *is*, and the timeline is
            about what has happened to it.
          */}
          <div className="max-lg:order-2!">
            {receiverSchema &&
              showReceiverForm &&
              (!flowMoves || flowMoves.is_last) && (
                <ReceiverForm
                  requestId={request.id}
                  schema={receiverSchema}
                  initial={request.receiverFormData ?? {}}
                  blocked={missingSubRequests > 0}
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
        <div className="space-y-2 max-lg:contents">
          <div className="max-lg:order-4">
            <Card title={messages.requestDetail.peopleTitle} size="small">
              <RequestPeople request={request} />
            </Card>
          </div>
          <div className="max-lg:order-3">
            <Card title={messages.requestDetail.chainTitle} size="small">
              {approvalCase ? (
                <>
                  <Steps
                    orientation="vertical"
                    size="small"
                    current={approvalCase.currentStep - 1}
                    items={approvalCase.steps.map((step) => ({
                      status: stepState(step.status),
                      title: `${messages.requestDetail.chainStep(step.stepNo)} · ${step.approverRole}`,
                      description: (
                        <span className="text-xs">
                          {step.approver?.displayName ?? "—"}
                          {" · "}
                          {step.status === "skipped"
                            ? messages.requestDetail.stepSkipped(
                                step.skipReason,
                              )
                            : stepOutcome(step.status, approvalCase.status)}
                          {step.mode === "all" &&
                            step.status === "pending" &&
                            ` · ${messages.requestDetail.stepVotes(
                              (step.votes ?? []).filter(
                                (vote) => vote.decision === "approve",
                              ).length,
                              step.candidateUserIds.length,
                            )}`}
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
                  {/*
                    A case a v2 flow step opened has no matrix version; the
                    line printed "ตารางอำนาจเวอร์ชัน null" until it was skipped.
                  */}
                  {approvalCase.matrixVersion !== null && (
                    <Paragraph type="secondary" className="mt-3! mb-1! text-xs">
                      {approvalCase.amount
                        ? messages.requestDetail.chainFrom(
                            Number(approvalCase.amount).toLocaleString("th-TH"),
                            approvalCase.matrixVersion,
                          )
                        : messages.requestDetail.chainVersion(
                            approvalCase.matrixVersion,
                          )}
                    </Paragraph>
                  )}
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

          <div className="max-lg:order-5">
            <Card title={messages.requestDetail.timelineTitle} size="small">
              <RequestTimeline events={events} />
            </Card>
          </div>
        </div>
      </div>
      {/* Room for the action bar pinned to the bottom on phones. */}
      <div className="h-24 md:hidden" aria-hidden />
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
  withheldSet,
}: {
  readonly name: string;
  readonly property: FormSchemaProperty;
  readonly answers: Record<string, unknown>;
  /** From `withheldFields`; null falls back to "absent = withheld". */
  readonly withheldSet: ReadonlySet<string> | null;
}) {
  const withheld =
    !(name in answers) && (withheldSet ? withheldSet.has(name) : true);
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
  withheldSet,
}: {
  schema: FormSchema;
  answers: Record<string, unknown>;
  withheldSet: ReadonlySet<string> | null;
}) {
  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(schema.properties ?? {}).map(([name, property]) => (
        <AnswerField
          key={name}
          name={name}
          property={property}
          answers={answers}
          withheldSet={withheldSet}
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
    return <>{answerText(property, value)}</>;
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
              {columns.map(([column, spec]) => (
                <td key={column} className="px-2 py-1">
                  {/* A column the reader may not see was deleted by the
                      masking interceptor, so it is absent, not blank. */}
                  {column in row ? (
                    answerText(spec, row[column])
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

function RequestFacts({
  request,
  withheldSet,
}: {
  request: RequestDetail;
  withheldSet: ReadonlySet<string> | null;
}) {
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
          withheldSet={withheldSet}
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
  const people: { label: string; person: RequestPerson | null | undefined }[] =
    [
      { label: messages.requestDetail.requester, person: request.requester },
      { label: messages.requestDetail.receiverLabel, person: request.receiver },
      { label: messages.requestDetail.assigneeLabel, person: request.assignee },
    ];

  const known = people.filter((entry) => entry.person);

  if (!known.length) return <Text type="secondary">—</Text>;

  return (
    <Descriptions
      size="small"
      labelStyle={{ width: "30%" }}
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
  const role = [person.position, person.orgUnit?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="text-xs">
      <div>{person.displayName}</div>
      {role && <Text type="secondary">{role}</Text>}
      {role && contact && <br />}
      {contact && <Text type="secondary">{contact}</Text>}
    </div>
  );
}
