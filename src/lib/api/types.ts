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
  /** REQ-03 — whether ยื่นคำขอ demands an `อ้างอิงโอกาสการขาย` for this type. */
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
  /** C360-02 — cached from Odoo by the hourly sync; null = never synced. */
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
  | "qualifying"
  | "proposing"
  | "negotiating"
  | "won"
  | "lost";

export interface LeadRow {
  id: string;
  name: string;
  contactName: string | null;
  contactPosition: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  sourceCode: string | null;
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
export interface LeadActivity {
  id: string;
  leadId: string;
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
  createdAt: string;
  updatedAt: string;
}

export type SaleOrderStatus = "open" | "cancelled";

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
type Money = string | number;

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
  codePrefix: string;
  codePadding: number;
  dedupThreshold: number;
  /** CD-76 — margin ขั้นต่ำ (%) ก่อนออกใบเสนอราคา. */
  minMarginPct: number;
  quotationValidityDays: number;
  vatPct: number;
  quotationApprovalTypeCode: string;
}

/** CM-07 — one assignable value with its dimension, for pickers and filters. */
export interface SegmentOption {
  id: string;
  code: string;
  nameTh: string;
  sortOrder: number;
  dimension: { id: string; code: string; nameTh: string; sortOrder: number };
}
