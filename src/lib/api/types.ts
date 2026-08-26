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
export interface RequestType {
  code: string;
  name: string;
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
