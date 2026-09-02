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
  enabled: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  position: string | null;
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
  orgUnitId: string | null;
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
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  /** SCOPE-04 — rendered with the "เห็นเฉพาะสายอนุมัติ" badge. */
  "x-sensitive"?: boolean;
  /** A long answer; rendered as a textarea rather than a single line. */
  "x-multiline"?: boolean;
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

export interface RequestType {
  id?: string;
  code: string;
  name: string;
  /**
   * The team that receives this type — §16 A2's `ทีมผู้รับ`.
   *
   * A **default**, not a routing rule: it preselects the team on the submit
   * screen and the requester may send the request elsewhere.
   */
  receiverOrgUnitId?: string | null;
  /** Joined by `GET /request-types` so the submit screen can name the team. */
  receiverOrgUnit?: { id: string; name: string } | null;
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
  requiredDocs?: CodedLabel[];
  returnReasonCodes?: CodedLabel[];
  slaHours?: number | null;
  /** How much of the clock counts — see `SlaCoverage` on the backend. */
  slaCoverage?: SlaCoverage;
  /**
   * Groups allowed to raise this type, each covering its subtree.
   * **Empty means every group may** — that is the default, not "nobody".
   */
  eligibleUnits?: { orgUnitId: string }[];
  /** REQ-03 — whether ยื่นคำขอ demands an `อ้างอิงดีล` for this type. */
  refRequired?: boolean;
  active?: boolean;
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
  approver: { displayName: string } | null;
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

/** The full request as หน้าที่ 4 needs it. */
export interface RequestDetail extends Omit<RequestRow, "approvalCases"> {
  approvalCases?: {
    /** Needed to decide on the case from the request screen. */
    id: string;
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
    requiredDocs?: CodedLabel[];
    returnReasonCodes?: CodedLabel[];
    /** REQ-01: what finishing this request requires, fixed at submit. */
    receiverFormSchema?: FormSchema | null;
  } | null;
  attachments?: RequestAttachment[];
  events?: RequestEventRow[];
  comments?: RequestComment[];
}

/** REQ-03 — recorded metadata; there is no file behind it yet. */
export interface RequestAttachment {
  id: string;
  docCode: string | null;
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
  refType: string | null;
  refId: string | null;
  status: string;
  dueAt: string | null;
  createdAt: string;
  requestType?: { name: string };
  slaClock?: { state: string; dueAt: string } | null;
  approvalCases?: {
    currentStep: number;
    steps: { stepNo: number; approverRole: string }[];
  }[];
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
export type MatrixLevel =
  | { type: "supervisor"; up: number }
  | { type: "org"; orgUnitIds: string[]; userIds?: string[] };

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
  /** `request` · `approval` · `report` · `user` · `audit` · `admin` · `integration` */
  module: string;
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
