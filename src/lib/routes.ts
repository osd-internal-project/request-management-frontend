/** Landing route once a session exists; there is no `/` page. */
export const HOME_PATH = "/pages";

export const LOGIN_PATH = "/login";

/**
 * Clears the session cookies and ends the Keycloak session.
 *
 * Also the only safe destination when a session cannot be resolved — see the
 * comment in `app/pages/layout.tsx` about the redirect loop.
 */
export const LOGOUT_PATH = "/api/auth/logout";

/**
 * The full CTD screen map (spec §16 mockups).
 *
 * S1 builds out the org and audit screens; the rest are routed placeholders so
 * the navigation, permissions, and URLs are settled before S2/S3 fill them in.
 */
export const ROUTES = {
  home: HOME_PATH,

  /** Screen 2 — งานค้างของฉัน */
  // §16 หน้าที่ 2 is the landing page itself, not a sub-route — logging in
  // should put you straight into your work queue.
  myWork: HOME_PATH,
  /** Screen 3 — ยื่นคำขอใหม่ */
  newRequest: `${HOME_PATH}/requests/new`,
  /** Screen 4 — รายละเอียดคำขอ */
  requestDetail: (id: string) => `${HOME_PATH}/requests/${id}`,
  /** Screen 5 — รออนุมัติของฉัน */
  approvals: `${HOME_PATH}/approvals`,
  /** REQ-09 — รายงานคอขวด */
  bottleneckReport: `${HOME_PATH}/reports/bottleneck`,

  /** Screen A1 — ตารางอำนาจอนุมัติ */
  adminApprovalMatrix: `${HOME_PATH}/admin/approval-matrix`,
  /** Screen A2 — ประเภทคำขอ */
  adminRequestTypes: `${HOME_PATH}/admin/request-types`,
  /** Screen A3 — ผังทีมและสิทธิ์ */
  adminOrg: `${HOME_PATH}/admin/org`,
  /** Read-only Keycloak user directory. */
  adminUsers: `${HOME_PATH}/admin/users`,
  /** SUP-04 — Audit log */
  adminAudit: `${HOME_PATH}/admin/audit`,
} as const;
