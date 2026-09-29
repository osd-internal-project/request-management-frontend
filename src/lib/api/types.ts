/**
 * The shapes the backend actually returns.
 *
 * This file is the **single** definition of each payload: the API modules
 * return these, and the components that render them import from here. When a
 * component kept its own copy the two drifted, and every page that passed one
 * to the other stopped type-checking — which is what happened here.
 *
 * No index signatures. `{ id: string; [key: string]: unknown }` type-checks
 * against anything and therefore proves nothing; it also hides the fields the
 * screens actually read, so a rename in the backend fails silently at runtime
 * instead of loudly at build time.
 */

/** The §11.1 envelope every list endpoint returns. */
export interface Paginated<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
}

/* -------------------------------------------------------------------------- */
/* Identity                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A realm account from `GET /users/keycloak`, enriched with the two facts this
 * system owns rather than Keycloak: job title and team (D-07/D-08).
 *
 * Both are null for an account that exists in the realm but has never signed
 * in here, so it has no local profile yet.
 */
export interface KeycloakUser {
  id: string;
  username: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  /**
   * This system's status, not the realm's `enabled` flag — the two are
   * different facts and this screen now reports the former.
   */
  status: "ACTIVE" | "SUSPENDED";
  position: string | null;
  /** HR's staff number, e.g. `EMP-094`. Format varies — never a key. */
  employeeId: string | null;
  /** Desk extension. Shared between people in several cases. */
  extension: string | null;
  /** ISO string; only the date part means anything. */
  startWork: string | null;
  phone: string | null;
  orgUnitName: string | null;
  /** Groups this person heads, in the company the viewer is looking at. */
  managedUnitNames: string[];
  /** System role names held in that company (ROLE-04). */
  roles: string[];
}

/**
 * A colleague from `GET /users` — the picker used when a screen has to name a
 * person (§11.2).
 *
 * `orgUnitId` travels with the row so a form can narrow the list to one team
 * without reaching for `GET /admin/org-units`, which needs `admin.org.manage`
 * and would 403 for every ordinary requester.
 */
export interface DirectoryUser {
  id: string;
  displayName: string;
  username: string;
  email: string | null;
  /** The HR job title, free text. */
  position: string | null;
  /** HR's staff number, e.g. `EMP-094`. Format varies — never a key. */
  employeeId: string | null;
  /** Desk extension. Shared between people in several cases. */
  extension: string | null;
  /** Start date as an ISO string; only the date part means anything. */
  startWork: string | null;
  /** Contact number exactly as the previous system recorded it. */
  phone: string | null;
  orgUnitId: string | null;
  orgUnitName: string | null;
}

/** A node of the A3 org tree from `GET /admin/org-units`. */
export interface OrgUnitNode {
  id: string;
  code: string;
  name: string;
  kind: "COMPANY" | "DIVISION" | "DEPARTMENT" | "POSITION" | "TEAM";
  parentId: string | null;
  active: boolean;
  managerUserId: string | null;
  managerDisplayName: string | null;
  memberCount: number;
}

/**
 * One grant on screen A4: this group may see that group's work.
 *
 * The level an administrator picks (บริษัท / ฝ่าย / แผนก / ตำแหน่ง) is the
 * viewer's `kind`, so it is not a field of its own — a group's level is
 * already a property of the group.
 */
export interface OrgUnitScopeRow {
  id: string;
  /**
   * Exactly one of each pair is set — a group grant or a person grant.
   *
   * Two nullable columns rather than a kind discriminator, because that is
   * what the database stores under its CHECK constraint; a third shape in
   * between would be a third thing to keep in step.
   */
  viewerOrgUnitId: string | null;
  viewerUserId: string | null;
  targetOrgUnitId: string | null;
  targetUserId: string | null;
  /** Whether the grant reaches the groups beneath the target. */
  includeDescendants: boolean;
  /**
   * What the viewer may *do* with those requests, beyond reading them
   * (7 ก.ย. 2569).
   *
   * Codes from the backend's `SCOPE_PERMISSIONS`. Empty means read-only. The
   * grant is always intersected with what the holder's roles carry, so a code
   * here is a ceiling, never a grant of its own.
   */
  permissions: string[];
  /**
   * The single switch this replaced, still returned so an older client keeps
   * working. Derived from `permissions`; nothing on this screen reads it.
   */
  canAct: boolean;
  viewer: { id: string; name: string; kind: OrgUnitNode["kind"] } | null;
  viewerUser: ScopePerson | null;
  target: { id: string; name: string; kind: OrgUnitNode["kind"] } | null;
  targetUser: ScopePerson | null;
}

/** One end of a grant that names a person rather than a group. */
export interface ScopePerson {
  id: string;
  displayName: string;
  username: string;
}

/**
 * The chart as a requester sees it — shape only, no manager, no member count.
 *
 * Declared separately from `OrgUnitNode` rather than derived from it, to match
 * the backend: a field added for the admin screen must not become readable by
 * everybody just because the two types were linked.
 */
export interface OrgUnitShape {
  id: string;
  code: string;
  name: string;
  kind: OrgUnitNode["kind"];
  parentId: string | null;
  /** A switched-off team: drawn in the tree, but not choosable. */
  active: boolean;
}

/** AUTH-04: signed in, but not yet placed in the org chart. */
export interface UnassignedUser {
  id: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  firstLoginAt: string | null;
  keycloakRoles: string[];
}

/** A row of the A3 member panel, with the role and scope it renders. */
export interface OrgMember {
  id: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  roles: { id: string; code: string; name: string; source: string }[];
  supervisor: { id: string; displayName: string } | null;
  keycloakRoles: string[];
}

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

/** A configured request type from `GET /request-types` (REQ-01). */
/** One field declared by a type's `formSchema` (REQ-01). */
/**
 * One field of a type's form.
 *
 * `formSchema` reaches the browser exactly as it sits in the database — the API
 * passes the Prisma JSON column straight through — so the `x-` extension keys
 * a type is authored with arrive verbatim. Read them through the helpers below
 * rather than in components: the bare `sensitive` / `multiline` spellings were
 * what the UI checked for a while, and since nothing ever wrote them, the
 * sensitive badge and every textarea silently never rendered.
 */
export interface FormSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  enum?: string[];
  /** `date` (`YYYY-MM-DD`) or `date-time` (ISO 8601 with offset). */
  format?: string;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  /** Boolean only: what to call `true` / `false`. Read through `booleanLabelsOf`. */
  "x-true-label"?: string;
  "x-false-label"?: string;
  /** SCOPE-04 — rendered with the "เห็นเฉพาะสายอนุมัติ" badge. */
  "x-sensitive"?: boolean;
  /** A long answer; rendered as a textarea rather than a single line. */
  "x-multiline"?: boolean;
  /**
   * CD-80 — worked out by the system, never typed: shown read-only and
   * recomputed by the server on save. See `src/lib/computed-fields.ts`.
   */
  "x-computed"?: {
    kind: "margin_pct";
    value: string;
    discount_pct?: string;
    cost: string;
  };
  /**
   * Display position, ascending.
   *
   * Required because `formSchema` is a `jsonb` column and Postgres does not
   * preserve key order — it returns keys sorted by length, which is how the
   * screen ended up showing เหตุผล first. JSON Schema has no ordering of its
   * own, so the order has to be carried as data.
   */
  "x-order"?: number;
  /**
   * A table: `items` carries the columns as a schema of its own.
   *
   * Plain JSON Schema, like `maxLength` and `minimum` above — the system's own
   * concerns are the keys spelled `x-`. One level only: the backend refuses a
   * table inside a table, and so does the grid that draws it.
   */
  items?: FormSchema;
  /** How many rows the person filling it in may add. Absent = no cap. */
  maxItems?: number;
  /** Pre-`x-` spellings, still accepted so an older type keeps working. */
  sensitive?: boolean;
  multiline?: boolean;
}

/** SCOPE-04: does this field carry the "เห็นเฉพาะสายอนุมัติ" badge? */
export function isSensitiveField(property: FormSchemaProperty): boolean {
  return property["x-sensitive"] ?? property.sensitive ?? false;
}

export function isMultilineField(property: FormSchemaProperty): boolean {
  return property["x-multiline"] ?? property.multiline ?? false;
}

/** What a field is, for editing and rendering. Mirrors `typeOf` in core-service `form-schema.ts`. */
export type FieldKind =
  "text" | "number" | "boolean" | "date" | "datetime" | "select" | "table";

export function fieldKindOf(property: FormSchemaProperty): FieldKind {
  if (property.enum?.length) return "select";
  if (property.type === "array") return "table";
  if (property.type === "number" || property.type === "integer")
    return "number";
  if (property.type === "boolean") return "boolean";
  if (property.format === "date") return "date";
  if (property.format === "date-time") return "datetime";
  return "text";
}

export function booleanLabelsOf(property: FormSchemaProperty): {
  readonly yes: string;
  readonly no: string;
} {
  return {
    yes: property["x-true-label"]?.trim() || "ใช่",
    no: property["x-false-label"]?.trim() || "ไม่ใช่",
  };
}

/** Unordered fields sink below ordered ones instead of jumping to the top. */
export function fieldOrder(property: FormSchemaProperty): number {
  return property["x-order"] ?? Number.MAX_SAFE_INTEGER;
}

export interface FormSchema {
  required?: string[];
  properties?: Record<string, FormSchemaProperty>;
}

/** One entry of `requiredDocs` / `returnReasonCodes`. */
export interface CodedLabel {
  code: string;
  name: string;
}

/** One entry of `requiredDocs`; `required` absent means required. */
export interface RequiredDoc extends CodedLabel {
  required?: boolean;
}

/** True when the attachment has stored bytes behind it. */
export function hasStoredFile(attachment: RequestAttachment): boolean {
  return !attachment.storageKey.startsWith("pending://");
}

/** Older rows have no flag and stay required, matching the backend. */
export function isRequiredDoc(doc: RequiredDoc): boolean {
  return doc.required !== false;
}

/** CD-67 — ระดับความรุนแรงของเคส, worst first. */
export type RequestSeverity = "critical" | "high" | "medium" | "low";
export const REQUEST_SEVERITIES: RequestSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
];
export type SeverityTargets = Record<
  RequestSeverity,
  { responseHours: number; resolutionHours: number }
>;

/** CD-67 — what A2 offers when a type is first made a case (same as the backend). */
export const DEFAULT_SEVERITY_TARGETS: SeverityTargets = {
  critical: { responseHours: 1, resolutionHours: 4 },
  high: { responseHours: 4, resolutionHours: 24 },
  medium: { responseHours: 8, resolutionHours: 72 },
  low: { responseHours: 24, resolutionHours: 120 },
};

export interface RequestType {
  id?: string;
  code: string;
  name: string;
  /** CD-67 — set = a case type: severity required, clocks from these targets. */
  severityTargets?: SeverityTargets | null;
  /**
   * The team that receives this type — §16 A2's `ทีมผู้รับ`.
   *
   * A **default**, not a routing rule: it preselects the team on the submit
   * screen and the requester may send the request elsewhere.
   */
  receiverOrgUnitId?: string | null;
  /** Joined by `GET /request-types` so the submit screen can name the team. */
  receiverOrgUnit?: { id: string; name: string } | null;
  /** ผู้รับเรื่องประจำ type. Set → every request goes to this person; null → requester picks. */
  receiverUserId?: string | null;
  receiverUser?: { id: string; displayName: string } | null;
  /**
   * How the chain is chosen at submit. Seed shape:
   * `{ mode: 'standard_chain', amount_field: 'deal_value' }` — `amount_field`
   * names the form field APV-02 measures against the matrix ceilings, so a
   * type without one cannot be routed.
   */
  approvalPolicy?: { mode?: string; amount_field?: string } | null;
  /** The form is data, not code — §16 หน้าที่ 3 renders straight from this. */
  formSchema?: FormSchema;
  /**
   * The form the receiver fills in before completing. Null for a type where
   * accepting and finishing is the whole of the receiver's part.
   */
  receiverFormSchema?: FormSchema | null;
  requiredDocs?: RequiredDoc[];
  returnReasonCodes?: CodedLabel[];
  slaHours?: number | null;
  /** How much of the clock counts — see `SlaCoverage` on the backend. */
  slaCoverage?: SlaCoverage;
  /**
   * Groups allowed to raise this type, each covering its subtree.
   * **Empty means every group may** — that is the default, not "nobody".
   */
  eligibleUnits?: { orgUnitId: string }[];
  /** REQ-03 — whether ยื่นคำขอ demands an `อ้างอิงโอกาสการขาย` for this type. */
  refRequired?: boolean;
  /** Child types the receiver raises under a request of this type. */
  subRequestTypes?: SubRequestTypeRule[];
  active?: boolean;
}

/** One checklist entry; a required one blocks `complete` until raised. */
export interface SubRequestTypeRule {
  code: string;
  required: boolean;
}

export const FLOW_CONDITION_OPS = ["gt", "gte", "lt", "lte", "eq", "neq", "in"] as const;
export type FlowConditionOp = (typeof FLOW_CONDITION_OPS)[number];

/** `{ field, op, value }` over the request's answers; see `request-flow.ts`. */
export interface FlowCondition {
  field: string;
  op: FlowConditionOp;
  value: unknown;
}

/** Who carries the work on entering a step. */
export type FlowAssigneeRule =
  | { type: "keep" }
  | { type: "requester" }
  | { type: "user"; userId: string };

/** v2: the status a step sits under; who holds it follows from it. */
export type FlowStepScope =
  | "draft"
  | "returned"
  | "submitted"
  | "in_progress"
  | "pending_approval"
  | "approved";

/** v2: who receives a `submitted` or `in_progress` step on entry. */
export type FlowReceiverRule =
  | { type: "keep" }
  | { type: "receiver" }
  | { type: "user"; userId: string }
  | { type: "step"; stepCode: string };

export interface RequestFlowStep {
  code: string;
  name: string;
  sortOrder: number;
  formSchema: FormSchema | null;
  subRequestTypes: SubRequestTypeRule[];
  requiresApproval: boolean;
  assigneeRule: FlowAssigneeRule | null;
  slaHours: number | null;
  /** v2 only; v1 steps all sit under `in_progress`. */
  scopeStatus?: FlowStepScope;
  approvalLevels?: MatrixLevel[] | null;
  returnToStepCode?: string | null;
  requiredDocs?: RequiredDoc[];
  receiverRule?: FlowReceiverRule | null;
}

export interface RequestFlowTransition {
  fromStepCode: string;
  toStepCode: string;
  sortOrder: number;
  condition: FlowCondition | null;
  backward: boolean;
}

/** A step as `GET :code/flows/suggested` returns it (the publish body's shape). */
export interface SuggestedStep {
  code: string;
  name: string;
  scope_status: FlowStepScope;
  form_schema?: Record<string, unknown>;
  required_docs?: RequiredDoc[];
  sub_request_types?: SubRequestTypeRule[];
  approval_levels?: MatrixLevel[];
  return_to_step?: string;
}

export interface SuggestedFlow {
  steps: SuggestedStep[];
  transitions: { from_step: string; to_step: string }[];
}

/** One published, immutable version of a type's step flow. */
export interface RequestFlowVersion {
  id: string;
  version: number;
  publishedAt: string;
  publishedBy: string | null;
  /** 1: steps inside in_progress; 2: steps cover the whole path. */
  schemaVersion?: number;
  steps: RequestFlowStep[];
  transitions: RequestFlowTransition[];
}

/** One stay of a request in one flow step. */
export interface RequestStepRun {
  id: string;
  stepCode: string;
  enteredAt: string;
  leftAt: string | null;
  outcome: string | null;
}

/** The detail endpoint's answer to "where can the work go from here". */
export interface FlowMoves {
  schema_version?: number;
  /** v2: the current step's status scope; null on v1. */
  scope?: FlowStepScope | null;
  /** v2: who acts on the current step; null while it awaits approval. */
  holder_user_id?: string | null;
  current: string;
  forward: string | null;
  backward: string[];
  is_last: boolean;
  requires_approval: boolean;
  checklist: NamedSubRequestType[];
}

/** A checklist entry as the submit snapshot keeps it. */
export interface NamedSubRequestType extends SubRequestTypeRule {
  name: string;
}

/** Required codes with no child other than a cancelled one — mirrors the server. */
export function missingRequiredSubRequests(
  items: readonly SubRequestTypeRule[],
  children: readonly { typeCode: string; status: string }[],
): string[] {
  return items
    .filter((item) => item.required)
    .filter(
      (item) =>
        !children.some(
          (child) =>
            child.typeCode === item.code && child.status !== "cancelled",
        ),
    )
    .map((item) => item.code);
}

/**
 * SUP-01 — the working window a business-hours SLA is measured against.
 *
 * One per company. Minutes from midnight rather than a time string because
 * that is what the arithmetic wants, and the screen renders them back.
 */
export interface HolidayCalendarRow {
  id: string;
  companyId: string;
  name: string;
  workdayStartMinute: number;
  workdayEndMinute: number;
  workingWeekdays: number[];
  holidays: string[];
}

/** `H24X7` elapsed · `H8X7` office hours daily · `H8X5` office hours, Mon–Fri. */
export const SLA_COVERAGES = ["H24X7", "H8X7", "H8X5"] as const;

export type SlaCoverage = (typeof SLA_COVERAGES)[number];

/**
 * REQ-07 — one line of the append-only timeline.
 *
 * `actorLabel` is set instead of `actorId` when the system acted (an
 * escalation, an auto-transition): §16 หน้าที่ 4 prints those rows as `ระบบ`,
 * and putting a person's name on them would credit somebody who did nothing.
 */
export interface RequestEventRow {
  id: string;
  seq: number;
  type: string;
  actorId: string | null;
  actorLabel: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  /** Joined so the timeline can print a name instead of an id. */
  actor?: { displayName: string } | null;
}

/** One rung as หน้าที่ 4 draws it, with the decision already made or not. */
export interface RequestDetailStep {
  stepNo: number;
  approverRole: string;
  approverUserId: string | null;
  /** Everyone who may decide this step; any one of them is enough. */
  candidateUserIds: string[];
  status: string;
  decision: string | null;
  decidedAt: string | null;
  /**
   * The decider's own words, required on approve / reject / send_back.
   *
   * Shown beside the step rather than only in the timeline: the stepper is
   * where a reader looks to find out what happened at a level, and a decision
   * without its reason sends them hunting in the other column.
   */
  note: string | null;
  approver: { displayName: string } | null;
  /** `any`: one candidate decides; `all`: every candidate approves. */
  mode?: "any" | "all";
  /** `reject_or_return` lets an approval go without a note. */
  noteRequired?: "always" | "reject_or_return";
  /** Why a `skipped` step was never asked. */
  skipReason?: "condition" | "same_approver" | null;
  votes?: { userId: string; decision: string }[];
}

/** H2.2 — one note somebody left on a request. */
export interface RequestComment {
  id: string;
  body: string;
  createdAt: string;
  author: { displayName: string } | null;
}

/** One node of the สายคำขอ panel. */
export interface RequestTreeNode {
  id: string;
  requestNo: string | null;
  typeCode: string;
  status: string;
  parentRequestId: string | null;
  ancestorIds: string[];
  /** The parent's flow step this child was raised in, if any. */
  parentStepCode?: string | null;
  requester: { displayName: string } | null;
  assignee: { displayName: string } | null;
  receiver: { displayName: string } | null;
}

/** What `GET /requests/:id/tree` answers. */
export interface RequestTree {
  /** Shallow on purpose: a child shows who it came from, not their contents. */
  parent: {
    id: string;
    requestNo: string | null;
    typeCode: string;
    status: string;
  } | null;
  descendants: RequestTreeNode[];
}

/**
 * A person the detail screen introduces, not merely names.
 *
 * `orgUnit` is their current team, which is not the same fact as the request's
 * own `receiverOrgUnitId` — that one is a snapshot of where the work sat when
 * it was raised and deliberately carries no name.
 *
 * These endpoints return raw Prisma rows with no response DTO on the server
 * (there is no `ResponseDto` anywhere under `requests/`), so this interface is
 * the only contract there is. Widening or narrowing a `select` in
 * `request.repository.ts` changes the payload with nothing to catch it —
 * change the two together.
 */
export interface RequestPerson {
  id: string;
  displayName: string;
  position: string | null;
  email: string | null;
  extension: string | null;
  phone: string | null;
  orgUnit?: { name: string } | null;
}

/** The full request as หน้าที่ 4 needs it. */
export interface RequestDetail extends Omit<
  RequestRow,
  "approvalCases" | "requester" | "receiver" | "assignee"
> {
  /** Richer than the list's two columns — see {@link RequestPerson}. */
  requester?: RequestPerson | null;
  receiver?: RequestPerson | null;
  assignee?: RequestPerson | null;
  approvalCases?: {
    /** Needed to decide on the case from the request screen. */
    id: string;
    status?: string;
    subjectType?: string;
    currentStep: number;
    matrixVersion: number;
    amount: string | null;
    steps: RequestDetailStep[];
  }[];
  formData?: Record<string, unknown>;
  /** H2.2 ข้อ 3 — what the receiver filled in, if the type asks for anything. */
  receiverFormData?: Record<string, unknown>;
  companyId?: string;
  requesterId?: string;
  /** Who the ticket was handed to, and who is carrying it now. */
  receiverUserId?: string | null;
  assigneeUserId?: string | null;
  /** The team it was sent to — seeded from the type, changeable by the requester. */
  receiverOrgUnitId?: string | null;
  parentRequestId?: string | null;
  submittedAt?: string | null;
  cancelReason?: string | null;
  requestType?: RequestType;
  /**
   * The type's configuration **as it stood at submit** (REQ-01).
   *
   * The server validates a return reason against this before falling back to
   * the live type (`requests.service.ts:706`), so anything offering the user a
   * choice must read it the same way round. A request in flight is judged by
   * the rules it was raised under, not by whatever an admin saved since.
   */
  typeSnapshot?: {
    requiredDocs?: RequiredDoc[];
    returnReasonCodes?: CodedLabel[];
    /** REQ-01: what finishing this request requires, fixed at submit. */
    receiverFormSchema?: FormSchema | null;
    /** The sub-request checklist as it stood at submit, names attached. */
    subRequestTypes?: NamedSubRequestType[];
  } | null;
  /** The step flow pinned at submit; null runs the fixed lifecycle. */
  flowVersionId?: string | null;
  currentStepCode?: string | null;
  /** Answers to each step's form, keyed by step code. */
  stepFormData?: Record<string, Record<string, unknown>>;
  flowVersion?: {
    id: string;
    version: number;
    steps: Pick<
      RequestFlowStep,
      | "code"
      | "name"
      | "sortOrder"
      | "formSchema"
      | "subRequestTypes"
      | "requiresApproval"
      | "scopeStatus"
      | "requiredDocs"
    >[];
  } | null;
  stepRuns?: RequestStepRun[];
  /** Where `advance` may go from the current step; null without a flow. */
  flow_moves?: FlowMoves | null;
  attachments?: RequestAttachment[];
  events?: RequestEventRow[];
  comments?: RequestComment[];
}

/** REQ-03 — a stored document; download via `attachmentFileUrl`. */
export interface RequestAttachment {
  id: string;
  requestId: string;
  docCode: string | null;
  /** `pending://…` marks a row saved before file storage; it has no file. */
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  deletedAt: string | null;
}

/**
 * APV-02 — the route a request would take, computed before it is submitted.
 *
 * The ceilings are gone (31 ส.ค. 2569): a ladder is a list of levels, so there
 * is no tier to report and no approver "excluded by amount" to explain. What
 * is left is the steps and who can decide each one.
 */
export interface ChainPreview {
  amount: string | null;
  currency: string;
  steps: {
    step_no: number;
    /** What the ladder said: `supervisor:N` or `org`. */
    position: string;
    /** The first candidate — who the step is shown as waiting on. */
    user_id: string | null;
    display_name: string | null;
    /** Everyone who could decide it; any one of them is enough. */
    candidate_user_ids: string[];
  }[];
}

/**
 * A row of §16 หน้าที่ 2. The clock drives the `ครบกำหนด` badge and the chain
 * drives `ขั้นปัจจุบัน`, so both arrive with the row rather than per-row.
 */
export interface RequestRow {
  id: string;
  requestNo: string | null;
  typeCode: string;
  /** Who raised it — only the scope-wide list has a use for this. */
  requester?: { id: string; displayName: string };
  /**
   * Who the ticket was handed to, and who is carrying it now.
   *
   * Both have travelled with every list row since 9 ก.ย. 2569 and were simply
   * not declared here, so the column that should have shown them read `—`
   * while the answer sat unread in the response.
   */
  receiver?: { id: string; displayName: string } | null;
  assignee?: { id: string; displayName: string } | null;
  refType: string | null;
  refId: string | null;
  status: string;
  dueAt: string | null;
  createdAt: string;
  requestType?: { name: string };
  /**
   * `breachedAt` travels so the badge and the `overdue=true` filter agree —
   * the server narrows on the clock, not on `dueAt`.
   */
  slaClock?: {
    state: string;
    dueAt: string | null;
    breachedAt?: string | null;
    /** CD-67 — the response clock, cases only. */
    responseDueAt?: string | null;
    respondedAt?: string | null;
    responseBreachedAt?: string | null;
  } | null;
  /** CD-67 — ระดับความรุนแรง (เฉพาะเคส). */
  severity?: RequestSeverity | null;
  approvalCases?: {
    /** The decision endpoint addresses the case, not the request. */
    id?: string;
    currentStep: number;
    steps: { stepNo: number; approverRole: string }[];
  }[];
  /**
   * What this viewer may do with this row, decided by the backend.
   *
   * The same table `assertMayAct` consults, so a button offered here is one the
   * handler behind it will honour. Never recomputed on the client: the row does
   * not carry the org-chart facts the answer depends on, and a second rule
   * would drift from the one that is enforced.
   *
   * Optional because a page rendered against an older backend simply gets no
   * buttons, which is the behaviour every list had before 4 ก.ย. 2569.
   */
  available_actions?: string[];
}

/* -------------------------------------------------------------------------- */
/* Approvals                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One rung of a chain. `approverUserId` is who the matrix named and
 * `decidedByUserId` is who actually acted — they differ under a delegation,
 * and APV-06 requires the history to keep both.
 */
export interface ApprovalStep {
  id: string;
  stepNo: number;
  approverRole: string;
  approverUserId: string | null;
  status: string;
  decision: string | null;
  note: string | null;
  decidedByUserId: string | null;
  delegationId: string | null;
}

export interface ApprovalCase {
  id: string;
  subjectType: string;
  subjectId: string;
  /** Null for a subject with no amount — not every case is money. */
  amount: string | null;
  currency: string | null;
  status: string;
  currentStep: number;
  createdBy: string | null;
  createdAt: string;
  payload: Record<string, unknown> | null;
  steps: ApprovalStep[];
  /** Set when the case was opened for a Platform Request (APV-07). */
  requestId?: string | null;
}

/**
 * One band of the A1 ladder as it was published **before 31 Aug 2026**.
 *
 * Still read so an older version can be displayed and the cases routed under
 * it explained; nothing writes this shape any more.
 */
export interface MatrixTier {
  upto: string | null;
  chain: string[];
}

/**
 * One level of the ladder.
 *
 * `supervisor` follows the requester's own line of management — `up: 1` is the
 * head of the group they sit in, `2` the department above it. `org` names
 * groups; with `userIds` those people approve, without it the groups' heads do.
 */
/** Per-level rules; absent keys keep the default (any / always / no condition). */
export interface MatrixLevelOptions {
  /** Flow v2 approval steps: whose chart a `supervisor` level climbs. */
  chartOf?: "requester" | "worker";
  mode?: "any" | "all";
  noteRequired?: "always" | "reject_or_return";
  condition?: FlowCondition;
  slaHours?: number;
}

export type MatrixLevel = MatrixLevelOptions &
  (
    | { type: "supervisor"; up: number }
    | { type: "org"; orgUnitIds: string[]; userIds?: string[] }
  );

export interface ApprovalMatrixVersion {
  /** Who published it — a userId; A1 resolves it to a name for display. */
  createdBy?: string | null;
  id: string;
  subjectType: string;
  currency: string;
  version: number;
  tiers: MatrixTier[];
  /** Null on a version published before the amounts were withdrawn. */
  levels: MatrixLevel[] | null;
  effectiveFrom: string;
  publishedAt: string | null;
  /** CD-80 — this version ends the ladder: from it on, no approval stage. */
  retired?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                       */
/* -------------------------------------------------------------------------- */

/** SUP-04: append-only. `actorUsername` is null for a service account. */
export interface AuditLogRow {
  id: string;
  createdAt: string;
  actorUsername: string | null;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
}

/** SUP-01 / D-09 — one request type's clock in one company. */
export interface SlaConfigRow {
  id: string;
  companyId: string;
  requestTypeCode: string;
  hours: number;
  businessHours: boolean;
  warnBeforeHours: number;
}

/** §5.4 — one entry of the code-declared permission catalog. */
export interface PermissionRow {
  code: string;
  /** `request` · `approval` · `crm` · `report` · `user` · `audit` · `admin` · `integration` */
  module: string;
  /** `human` = สิทธิ์ของคนใน role · `service` = scope ของบัญชีบริการ (AUTH-06) */
  type: string;
}

export interface RolePermissionRow {
  permissionCode: string;
}

/** Screen A4's left-hand list. `_count.users` is scoped to the active company. */
export interface RoleRow {
  id: string;
  companyId: string | null;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  active: boolean;
  /**
   * How far up the holder's **own** branch this role's view starts, `null` for
   * none.
   *
   * A level of the chart, not a unit: it resolves against whoever holds the
   * role, so `DEPARTMENT` reaches RND for somebody in RND and Sale for
   * somebody in Sale. Read-only — it opens rows, never buttons.
   */
  visibilityLevel: OrgUnitNode["kind"] | null;
  updatedAt: string;
  permissions: RolePermissionRow[];
  _count: { users: number };
}

/**
 * Screen A4's right-hand panel.
 *
 * `KEYCLOAK_MAPPING` earns the `จาก Keycloak` badge and cannot be revoked
 * here — that grant is replaced wholesale on every login (ROLE-03), so undoing
 * it belongs in Keycloak. `MANUAL` is the emergency binding an admin made, and
 * the only one this screen offers to withdraw.
 */
export interface RoleHolder {
  userId: string;
  username: string;
  displayName: string;
  source: "KEYCLOAK_MAPPING" | "MANUAL";
  grantedAt: string;
  grantedByDisplayName: string | null;
}

/** SCOPE-01 — (role, resource) → how far that role sees. */
export interface ScopeRuleRow {
  id: string;
  roleId: string;
  resource: string;
  scope: "own" | "team" | "department" | "company" | "all";
}

/** ROLE-03 — a Keycloak realm role bound to a system role, per company. */
export interface KeycloakRoleMappingRow {
  id: string;
  companyId: string;
  keycloakRole: string;
  roleId: string;
}

/* -------------------------------------------------------------------------- */
/* CRM — Customer Master (CM-xx, spec artifact 856c08fd)                       */
/* -------------------------------------------------------------------------- */

/**
 * One row of the register (`GET /customers`).
 *
 * `taxId` is optional twice over: a customer may not have one, and the
 * SensitiveFieldInterceptor deletes the field entirely for callers without
 * `crm.customer.sensitive.read` (CM-08) — absent, not null, so the screen
 * cannot tell "withheld" from "none" and must not try.
 */
export interface CustomerRow {
  id: string;
  customerCode: string;
  type: "corporate" | "individual" | "government";
  nameTh: string;
  nameEn: string | null;
  taxId?: string | null;
  branchCode: string;
  branchName: string | null;
  headOfficeId: string | null;
  status: "draft" | "active" | "suspended" | "inactive";
  kycVerified: boolean;
  /** CD-61 — from the latest verified KYC; null = never verified. */
  kycRiskLevel?: KycRiskLevel | null;
  /** CD-61 — the KYC runs out on this day (review date or first document expiry). */
  kycExpiresOn?: string | null;
  accountOwnerUserId: string | null;
  accountOwner: { id: string; displayName: string } | null;
  segments: {
    value: {
      id: string;
      code: string;
      nameTh: string;
      dimension: { id: string; code: string; nameTh: string };
    };
  }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * CM-01 (redesign #2, 8 ก.ย. 2569) — ที่อยู่/ไซต์ของลูกค้ารายนั้น. Branches
 * are customer rows now; this holds one branch-customer's addresses/sites.
 */
export interface CustomerLocation {
  id: string;
  name: string | null;
  line1: string;
  line2: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  isBilling: boolean;
  isSite: boolean;
  isPrimary: boolean;
}

export interface CustomerContact {
  id: string;
  name: string;
  role: "decision_maker" | "user" | "procurement" | "finance" | "other";
  position: string | null;
  phone: string | null;
  email: string | null;
  lineId: string | null;
  note: string | null;
  isPrimary: boolean;
}

/** `GET /customers/:id` — the detail page, and later the 360° header card. */
/** CD-70 — one contract in the customer's register. */
export interface CustomerContract {
  id: string;
  contractNo: string;
  title: string;
  startOn: string | null;
  endOn: string;
  /** Decimal as a string. */
  value: string | null;
  currency: string;
  status: "active" | "renewed" | "ended" | "cancelled";
  opportunityId: string | null;
  requestId: string | null;
  renewalOpportunityId: string | null;
  note: string | null;
}

/** CD-61 — ระดับความเสี่ยงลูกค้า. */
export type KycRiskLevel = "low" | "medium" | "high";

/** CD-61 — one KYC verification on record. */
export interface CustomerKycRecord {
  id: string;
  requestId: string | null;
  status: "verified" | "screening_hit" | "superseded" | "expired";
  riskLevel: KycRiskLevel;
  suggestedRisk: KycRiskLevel;
  clearanceNote: string | null;
  documentsExpireOn: string | null;
  signatories: string | null;
  reviewDueOn: string;
  expiresOn: string;
  recordedAt: string;
}

/** CD-61 — a possible match on the prohibited list. */
export interface KycScreeningMatch {
  entryId: string;
  name: string;
  taxId: string | null;
  reason: string;
  score: number;
  byTaxId: boolean;
}

/** CD-61 — `GET /customers/:id/kyc`. */
export interface CustomerKyc {
  verified: boolean;
  verifiedAt: string | null;
  riskLevel: KycRiskLevel | null;
  expiresOn: string | null;
  screening: { matches: KycScreeningMatch[]; suggestedRisk: KycRiskLevel };
  records: CustomerKycRecord[];
}

/** CD-61 — an entry of the company's prohibited list. */
export interface KycWatchlistEntry {
  id: string;
  name: string;
  taxId: string | null;
  reason: string;
  source: string | null;
  active: boolean;
  createdAt: string;
}

export interface CustomerDetail extends CustomerRow {
  deactivateReason: string | null;
  suspendReason: string | null;
  mergedIntoCustomerId: string | null;
  mergedInto: { id: string; customerCode: string; nameTh: string } | null;
  locations: CustomerLocation[];
  headOffice: {
    id: string;
    customerCode: string;
    nameTh: string;
    branchCode: string;
  } | null;
  branchCustomers: {
    id: string;
    customerCode: string;
    nameTh: string;
    branchCode: string;
    branchName: string | null;
    status: "draft" | "active" | "suspended" | "inactive";
  }[];
  contacts: CustomerContact[];
  createdBy: string | null;
}

/** C360-01 — ตัวเลขการ์ดหน้า 360° (GET /customers/:id/summary). */
export interface CustomerSummary {
  contacts: number;
  locations: number;
  branchCustomers: number;
  /** null = viewer has no crm.sales.read — hide the card (C360-04). */
  opportunities: { open: number; openAmount: number } | null;
  /** null = viewer has no request.read — hide the card (C360-04). */
  requests: { total: number; open: number | null } | null;
  /** C360-02 — cached from SAP by the hourly sync; null = never synced. */
  financials: {
    outstanding: number;
    invoiceCount: number;
    asOf: string;
  } | null;
}

/* -------------------------------------------------------------------------- */
/* CRM — Lead + โอกาสการขาย (Opportunity)                                              */
/* -------------------------------------------------------------------------- */

export type LeadStatus =
  | "new"
  | "cannot_contact"
  | "contacted"
  | "qualified"
  | "disqualified"
  | "converted";
export type LeadActivityType = "call" | "email" | "meeting" | "task" | "note";
export type OpportunityStage =
  "qualifying" | "proposing" | "negotiating" | "won" | "lost";

export interface LeadRow {
  id: string;
  name: string;
  contactName: string | null;
  contactPosition: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  sourceCode: string | null;
  /** CD-71 — แคมเปญที่ Lead นี้มาจาก. */
  campaign?: { id: string; code: string; name: string } | null;
  /** ข้อมูลบริษัท/ลูกค้าเป้าหมาย — free text ระหว่างคัดกรอง (หน้ารายละเอียด Lead). */
  nameEn: string | null;
  taxId: string | null;
  industry: string | null;
  companySize: string | null;
  employeeCount: number | null;
  productGroup: string | null;
  subProduct: string | null;
  projectRevenue: string | number | null;
  addressLine: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  status: LeadStatus;
  disqualifyReason: string | null;
  customerId: string | null;
  customer: { id: string; customerCode: string; nameTh: string } | null;
  convertedOpportunity: { id: string; opportunityCode: string } | null;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * กิจกรรมบน Lead — ไม่มี `dueAt` = บันทึกสิ่งที่ทำไปแล้ว (ปิดตั้งแต่สร้าง),
 * มี `dueAt` = นัด/งานที่ต้องตามต่อ จน `completedAt` ถูกติ๊ก.
 */
export interface SalesActivity {
  id: string;
  type: LeadActivityType;
  subject: string;
  detail: string | null;
  dueAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  completedByName: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface LeadActivity extends SalesActivity {
  leadId: string;
}

/** CD-75 — one visit photo on a deal's activity (the bytes come separately). */
export interface ActivityPhoto {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

/** CD-65 — `GET /opportunities/:id/activities`, รูปเดียวกับกิจกรรมของ Lead. */
export interface OpportunityActivity extends SalesActivity {
  opportunityId: string;
  /** CD-75 — photos taken at the visit. */
  photos?: ActivityPhoto[];
}

/** `GET /leads/:id` — หน้ารายละเอียด Lead. */
export interface LeadDetail extends LeadRow {
  customer: {
    id: string;
    customerCode: string;
    nameTh: string;
    branchName: string | null;
  } | null;
  convertedOpportunity: {
    id: string;
    opportunityCode: string;
    title: string;
    stage: OpportunityStage;
  } | null;
  owner: { id: string; displayName: string };
  activities: LeadActivity[];
}

export interface OpportunityRow {
  id: string;
  opportunityCode: string;
  title: string;
  stage: OpportunityStage;
  amount: string | number | null;
  currency: string;
  probability: number | null;
  expectedCloseAt: string | null;
  /**
   * PO 10 ก.ย. 2569: null = ผู้มุ่งหวัง — การเปิดโอกาสการขายยังไม่ถือเป็นลูกค้า;
   * ทะเบียนลูกค้าเกิดเมื่อเปิดใบสั่งขาย แล้วค่านี้ถูกผูกกลับ.
   */
  customerId: string | null;
  customer: { id: string; customerCode: string; nameTh: string } | null;
  /** ชื่อผู้มุ่งหวัง — แสดงแทนลูกค้าระหว่างที่ `customerId` ยังว่าง. */
  prospectName: string | null;
  prospectTaxId: string | null;
  ownerUserId: string;
  /** CD-65 — กิจกรรมที่ทำเสร็จล่าสุด (null = ยังไม่เคยมี). */
  lastActivityAt: string | null;
  /** นัดติดตามที่ใกล้ที่สุดที่ยังไม่เสร็จ. */
  nextFollowUpAt: string | null;
  /** ไม่ว่าง = ระบบแจ้งหัวหน้าแล้วว่าดีลเงียบเกินเกณฑ์ และยังไม่มีกิจกรรมใหม่. */
  staleAlertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SaleOrderStatus = "open" | "cancelled";

/** CD-88 — การส่งใบสั่งขายเข้า SAP (แยกจากสถานะของใบเอง). */
export type ErpSyncStatus =
  "not_ready" | "pending" | "synced" | "failed" | "skipped";

/** CD-88 — รายการสินค้าของใบสั่งขาย: snapshot จากใบเสนอราคาตอนเปิดใบ. */
export interface SaleOrderLine {
  id: string;
  lineNo: number;
  productCode: string | null;
  description: string;
  quantity: string | number;
  unit: string | null;
  unitPrice: string | number;
  discountPct: string | number;
  lineTotal: string | number;
}

/** ใบสั่งขาย (CD-77 โครงระยะ 1) — จุดที่ผู้มุ่งหวังกลายเป็นลูกค้า. */
export interface SaleOrderRow {
  id: string;
  saleOrderCode: string;
  status: SaleOrderStatus;
  amount: string | number | null;
  currency: string;
  note: string | null;
  orderedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  opportunityId: string;
  opportunity: { id: string; opportunityCode: string; title: string } | null;
  customerId: string;
  customer: { id: string; customerCode: string; nameTh: string } | null;
  /** CD-77: ใบเสนอราคาที่ลูกค้ายอมรับซึ่งใบสั่งขายนี้เปิดตาม. */
  quotationId: string | null;
  quotation: { id: string; quotationNo: string; version: number } | null;
  lines: SaleOrderLine[];
  erpStatus: ErpSyncStatus;
  /** เลขใบสั่งขายที่ SAP ตอบกลับ. */
  erpOrderNo: string | null;
  erpSyncedAt: string | null;
  erpLastError: string | null;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "accepted"
  | "declined"
  | "superseded"
  | "cancelled";

/** Decimal columns arrive as strings. */
export type Money = string | number;

/**
 * ใบเสนอราคา (CD-76) — หนึ่งแถวต่อเวอร์ชัน. `costTotal`/`marginAmount`/`marginPct`
 * **ไม่มากับ response** สำหรับผู้ที่ไม่มีสิทธิ์เห็นต้นทุน (SCOPE-04 ลบทิ้งที่ API) —
 * หน้าจอต้องถือว่า undefined = ถูกปกปิด ไม่ใช่ศูนย์.
 */
export interface QuotationRow {
  id: string;
  quotationNo: string;
  version: number;
  title: string;
  status: QuotationStatus;
  currency: string;
  validUntil: string | null;
  /** คำนวณที่ server — ใบที่ยังไม่ปิดและเลยวันหมดอายุ (เวลาไทย). */
  expired: boolean;
  netTotal: Money;
  vatAmount: Money;
  grandTotal: Money;
  costTotal?: Money;
  marginAmount?: Money;
  marginPct?: Money | null;
  approvalRequired: boolean;
  approvalRequestId: string | null;
  opportunityId: string;
  opportunity: { id: string; opportunityCode: string; title: string } | null;
  customerId: string | null;
  partyName: string;
  ownerUserId: string;
  submittedAt: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationLine {
  id: string;
  lineNo: number;
  productCode: string | null;
  description: string;
  quantity: Money;
  unit: string | null;
  unitPrice: Money;
  /** ถูกปกปิดสำหรับผู้ไม่มีสิทธิ์เห็นต้นทุน. */
  unitCost?: Money;
  discountPct: Money;
  lineTotal: Money;
  lineCost?: Money;
}

export interface QuotationDetail extends QuotationRow {
  companyId: string;
  partyTaxId: string | null;
  contactName: string | null;
  paymentTerms: string | null;
  note: string | null;
  subtotal: Money;
  discountTotal: Money;
  vatPct: Money;
  minMarginPct: Money | null;
  approvedAt: string | null;
  responseNote: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  lines: QuotationLine[];
  opportunity: {
    id: string;
    opportunityCode: string;
    title: string;
    stage: OpportunityStage;
    customerId: string | null;
  };
  customer: { id: string; customerCode: string; nameTh: string } | null;
  saleOrders: { id: string; saleOrderCode: string; status: SaleOrderStatus }[];
  versions: {
    id: string;
    version: number;
    status: QuotationStatus;
    netTotal: Money;
    createdAt: string;
  }[];
  approvalRequest: {
    id: string;
    requestNo: string | null;
    status: string;
    typeCode: string;
  } | null;
}

export interface OpportunityDetail extends OpportunityRow {
  companyId: string;
  wonAt: string | null;
  lostAt: string | null;
  lostReasonCode: string | null;
  lostReasonText: string | null;
  customer: {
    id: string;
    customerCode: string;
    nameTh: string;
    branchCode: string;
    branchName: string | null;
    kycVerified: boolean;
  } | null;
  prospectContactName: string | null;
  prospectPhone: string | null;
  prospectEmail: string | null;
  products: { productCode: string; name: string | null }[];
  fromLead: { id: string; name: string; sourceCode: string | null } | null;
  saleOrders: SaleOrderRow[];
  /** CM-04 ชุดงาน B — เตือน ไม่ block. */
  kycWarning: { required: boolean; products: string[] };
  /** CD-81 — the company's contract request type; null = no contract card. */
  contractRequestTypeCode?: string | null;
}

/** CD-79 — a company's standard trade term (CRM settings). */
export interface TradeTermStandard {
  code: string;
  name: string;
  standardValue: string;
  active?: boolean;
  sortOrder?: number;
}

/** CD-79 — one agreed term, with the standard as it stood that day. */
export interface NegotiationTerm {
  code: string | null;
  name: string;
  agreed: string;
  standard: string | null;
  nonStandard: boolean;
  note: string | null;
}

/** CD-79 — one negotiation round on a deal. */
export interface NegotiationRound {
  id: string;
  roundNo: number;
  occurredOn: string;
  summary: string | null;
  terms: NegotiationTerm[];
  nonStandardCount: number;
  /** The contract-review request sent to Legal, when there was one. */
  legalRequestId: string | null;
  /** Why it did not reach Legal (or reached only as a draft). */
  legalSendError: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface OpportunityLostReason {
  code: string;
  name: string;
}

/** CM-04 ชุดงาน B — product ที่ต้องยืนยันตัวตน (KYC), configuration ล้วน. */
export interface KycProductRule {
  id: string;
  productCode: string;
  name: string;
  active: boolean;
}

/** CM-05 — consent badge ต่อผู้ติดต่อ อ่านสดจากระบบ PDPA กลาง (ไม่เก็บซ้ำ). */
export type ConsentState = "granted" | "none" | "withdrawn" | "unknown";

export interface ContactConsentStatus {
  contactId: string;
  email: ConsentState | null;
  phone: ConsentState | null;
  doNotCall: boolean;
}

/** CM-10 — one file row's fate from POST /customers/import. */
export interface ImportRowResult {
  rowNo: number;
  action: "create" | "skip_duplicate" | "error";
  reasons: string[];
  customerCode?: string;
  headOfficeCode?: string;
  /** Head office is an earlier row of the same file (dry run). */
  headOfficeRow?: number;
  /** Skipped: an earlier row of this file has the same ภาษี+สาขา. */
  duplicateOfRow?: number;
  /** No tax id, name matches — warning only; the row is still created. */
  possibleDuplicateOf?: string;
  possibleDuplicateOfRow?: number;
}

export interface ImportResult {
  importId: string;
  mode: "dry_run" | "commit";
  summary: { create: number; skip: number; error: number };
  results: ImportRowResult[];
}

/** CM-01 — one field change: who, when, before/after. */
export interface CustomerFieldChange {
  id: string;
  field: string;
  before: unknown;
  after: unknown;
  changedBy: string | null;
  /** Resolved display name; falls back to the raw id for a departed user. */
  changedByName: string | null;
  changedAt: string;
}

/** C360-03 — one timeline event, already permission-filtered by the backend. */
export interface CustomerTimelineEvent {
  id: string;
  refType: string;
  refId: string | null;
  eventType: string;
  summary: string;
  actorName: string | null;
  occurredAt: string;
}

/** CM-03 — what `POST /customers/check-duplicate` answers. */
export interface CustomerDuplicateCheck {
  duplicate: SimilarCustomer | null;
  /** Same tax id, different branch — the head office the new row links to. */
  headOffice: SimilarCustomer | null;
  similar: SimilarCustomer[];
  threshold: number;
}

export interface SimilarCustomer {
  id: string;
  customerCode: string;
  nameTh: string;
  nameEn: string | null;
  taxId: string | null;
  branchCode: string;
  branchName: string | null;
  status: string;
  similarity: number;
}

/** CM-07 — a segmentation dimension with its values, as the admin screen edits it. */
export interface SegmentDimension {
  id: string;
  code: string;
  nameTh: string;
  active: boolean;
  sortOrder: number;
  values: SegmentValue[];
}

export interface SegmentValue {
  id: string;
  code: string;
  nameTh: string;
  active: boolean;
  sortOrder: number;
}

/** CM-02/03 per-company configuration. */
export interface CrmConfig {
  dedupThreshold: number;
  /** CD-76 — margin ขั้นต่ำ (%) ก่อนออกใบเสนอราคา. */
  minMarginPct: number;
  quotationValidityDays: number;
  vatPct: number;
  quotationApprovalTypeCode: string;
  /** CD-82 — ประเภทคำขอสำหรับอนุมัติการปรับเป้าระหว่างงวด; null = ยังไม่ตั้ง. */
  targetApprovalTypeCode?: string | null;
  /** CD-81 — ประเภทคำขอที่ฝ่ายกฎหมายรับทำสัญญา; null = ไม่แสดงการ์ดสัญญา. */
  contractRequestTypeCode?: string | null;
  /** CD-61 — KYC ใช้ได้กี่เดือนก่อนต้องทบทวน ตามความเสี่ยง. */
  kycReviewMonthsHigh?: number;
  kycReviewMonthsMedium?: number;
  kycReviewMonthsLow?: number;
  /** CD-65 — ไม่มีใครอ่านแล้ว: ย้ายไปเป็นกติกา `opportunity.stale` (CD-53). */
  staleOpportunityDays: number;
  /** หัวกระดาษใบเสนอราคา — null = ไม่ได้ตั้ง. */
  letterheadNameTh: string | null;
  letterheadNameEn: string | null;
  letterheadTaxId: string | null;
  letterheadBranch: string | null;
  letterheadAddress: string | null;
  letterheadPhone: string | null;
  letterheadEmail: string | null;
  letterheadWebsite: string | null;
  /** data URL (png/jpeg/webp). */
  letterheadLogo: string | null;
  quotationTerms: string | null;
}

/** CM-07 — one assignable value with its dimension, for pickers and filters. */
export interface SegmentOption {
  id: string;
  code: string;
  nameTh: string;
  sortOrder: number;
  dimension: { id: string; code: string; nameTh: string; sortOrder: number };
}

/** SUP-03 — one in-app notification (`GET /notifications`). */
export interface AppNotification {
  id: string;
  eventType: string;
  title: string;
  body: string;
  /** `request` · `approval_case` · `opportunity` — what the row points at. */
  resourceType: string | null;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

export type NotificationFrequency = "immediate" | "daily";

export interface NotificationPreferences {
  in_app: true;
  in_app_locked: true;
  email: boolean;
  /** false until SMTP exists (open question B) — the screen says so. */
  email_delivery_available: boolean;
  /** CD-52 — Bangkok hour the daily digest goes out, working days. */
  digest_hour: number;
  categories: {
    key: string;
    /** false = urgent (SLA): immediate only. */
    digestible: boolean;
    email: boolean;
    frequency: NotificationFrequency;
  }[];
}

/** `GET /quotations/:id/print` — the customer's copy; never carries cost or margin. */
export interface QuotationPrintView {
  quotation: {
    id: string;
    quotationNo: string;
    version: number;
    status: QuotationStatus;
    title: string;
    currency: string;
    validUntil: string | null;
    paymentTerms: string | null;
    note: string | null;
    partyName: string;
    partyTaxId: string | null;
    contactName: string | null;
    subtotal: Money;
    discountTotal: Money;
    netTotal: Money;
    vatPct: Money;
    vatAmount: Money;
    grandTotal: Money;
    createdAt: string;
    sentAt: string | null;
    lines: {
      lineNo: number;
      productCode: string | null;
      description: string;
      quantity: Money;
      unit: string | null;
      unitPrice: Money;
      discountPct: Money;
      lineTotal: Money;
    }[];
  };
  billTo: {
    name: string;
    customerCode: string | null;
    taxId: string | null;
    branch: string | null;
    address: string | null;
    contactName: string | null;
  };
  seller: { name: string; email: string | null } | null;
  letterhead: {
    nameTh: string;
    nameEn: string | null;
    taxId: string | null;
    branch: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo: string | null;
    terms: string | null;
  };
  /** false = draft / awaiting approval — the page watermarks it. */
  isFinal: boolean;
}
