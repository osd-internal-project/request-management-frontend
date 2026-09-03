/** Landing route once a session exists; there is no `/` page. */
export const HOME_PATH = "/pages";

/**
 * PKCE leg 1 — the single entry point for signing in (AUTH-01).
 *
 * There is no login page in this application: everything that finds a request
 * unauthenticated sends the browser here, and this route sends it on to
 * Keycloak's own login form.
 */
export const AUTH_LOGIN_PATH = "/api/auth/login";

/**
 * The one page an unauthenticated browser is allowed to render.
 *
 * Reached only when the identity provider cannot be talked to at all — the
 * BFF's `fetch` to the backend threw. Redirecting again would repeat a call
 * that has no way of succeeding, so this page stops the bouncing and offers a
 * retry the user controls.
 */
export const RECONNECT_PATH = "/login/reconnect";

/**
 * Everything that used to live under `/login`.
 *
 * Only `RECONNECT_PATH` is a real page now; the rest of this prefix is old
 * links and bookmarks, which the proxy redirects rather than letting 404.
 */
export const LOGIN_PREFIX = "/login";

/**
 * Clears the session cookies and ends the Keycloak session.
 *
 * Also the only safe destination when a session cannot be resolved — see the
 * comment in `app/pages/layout.tsx` about the redirect loop. The browser comes
 * out of it at Keycloak's login form, not at a page of ours.
 */
export const LOGOUT_PATH = "/api/auth/logout";

/**
 * Where a session that has run out sends the browser (AUTH-02).
 *
 * Always through logout: the cookies have to be cleared and the Keycloak SSO
 * session ended, or the user is signed straight back in without seeing why
 * they were thrown out.
 */
export const SESSION_EXPIRED_PATH = `${LOGOUT_PATH}?reason=session_expired`;

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
  /**
   * งานทั้งหมด — the work of the groups the viewer heads.
   *
   * Still `/approvals` as a path: it replaced that screen rather than sitting
   * beside it, and moving the URL would break every link anyone had kept.
   */
  allWork: `${HOME_PATH}/approvals`,
  /** REQ-09 — รายงานคอขวด */
  bottleneckReport: `${HOME_PATH}/reports/bottleneck`,

  /** CD-92 — แดชบอร์ด Metabase ฝังผ่าน signed embed URL. */
  biDashboard: (key: string) => `${HOME_PATH}/bi/${key}`,
  /** CD-92 — ลิงก์เข้าหน้า setting ของ Metabase (แอดมิน BI). */
  adminBi: `${HOME_PATH}/admin/bi`,

  /** Screen A1 — ตารางอำนาจอนุมัติ */
  adminApprovalMatrix: `${HOME_PATH}/admin/approval-matrix`,
  /** Screen A2 — ประเภทคำขอ */
  adminRequestTypes: `${HOME_PATH}/admin/request-types`,
  /** SUP-01 — เวลาทำการและวันหยุด, what a business-hours SLA is measured against. */
  adminSla: `${HOME_PATH}/admin/sla`,
  /** Screen A3 — ผังทีมและสิทธิ์ */
  adminOrg: `${HOME_PATH}/admin/org`,
  /** Read-only Keycloak user directory. */
  adminUsers: `${HOME_PATH}/admin/users`,
  /** SUP-04 — Audit log */
  adminAudit: `${HOME_PATH}/admin/audit`,
} as const;
