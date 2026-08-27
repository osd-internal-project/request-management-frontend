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

/** A realm account from `GET /users/keycloak`. */
export interface KeycloakUser {
  id: string;
  username: string;
  enabled: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** A node of the A3 org tree from `GET /admin/org-units`. */
export interface OrgUnitNode {
  id: string;
  code: string;
  name: string;
  kind: "COMPANY" | "DEPARTMENT" | "TEAM";
  parentId: string | null;
  active: boolean;
  managerUserId: string | null;
  managerDisplayName: string | null;
  memberCount: number;
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
  scope: string;
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
  code: string;
  name: string;
  /** The form is data, not code — §16 หน้าที่ 3 renders straight from this. */
  formSchema?: FormSchema;
  requiredDocs?: CodedLabel[];
  returnReasonCodes?: CodedLabel[];
  slaHours?: number | null;
  slaBusinessHours?: boolean;
  active?: boolean;
}

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
  status: string;
  decision: string | null;
  decidedAt: string | null;
  approver: { displayName: string } | null;
}

/** The full request as หน้าที่ 4 needs it. */
export interface RequestDetail extends Omit<RequestRow, "approvalCases"> {
  approvalCases?: {
    currentStep: number;
    matrixVersion: number;
    amount: string | null;
    steps: RequestDetailStep[];
  }[];
  formData?: Record<string, unknown>;
  companyId?: string;
  requesterId?: string;
  submittedAt?: string | null;
  cancelReason?: string | null;
  requestType?: { name: string; formSchema?: FormSchema };
  attachments?: RequestAttachment[];
  events?: RequestEventRow[];
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
 * Amounts stay strings: they are money, and rounding them into JavaScript
 * numbers on the way to the screen is how a displayed ceiling starts
 * disagreeing with the one the engine routed under.
 */
export interface ChainPreview {
  amount: string | null;
  currency: string;
  tier_index: number;
  tier_upto: string | null;
  exceeded_upto: string | null;
  steps: {
    step_no: number;
    position: string;
    user_id: string | null;
    display_name: string | null;
  }[];
  excluded: { position: string; appears_above: string | null }[];
}

/**
 * A row of §16 หน้าที่ 2. The clock drives the `ครบกำหนด` badge and the chain
 * drives `ขั้นปัจจุบัน`, so both arrive with the row rather than per-row.
 */
export interface RequestRow {
  id: string;
  requestNo: string | null;
  typeCode: string;
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

/** One band of the A1 ladder. `upto: null` is the open-ended top tier. */
export interface MatrixTier {
  upto: string | null;
  chain: string[];
}

export interface ApprovalMatrixVersion {
  /** Who published it — a userId; A1 resolves it to a name for display. */
  createdBy?: string | null;
  id: string;
  subjectType: string;
  currency: string;
  version: number;
  tiers: MatrixTier[];
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
