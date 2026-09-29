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
  /** CD-50 — รายงานการทำตามกำหนด (SLA) */
  slaReport: `${HOME_PATH}/reports/sla-compliance`,
  /** APV-06 (CD-45) — ประวัติการใช้อำนาจอนุมัติ */
  decisionLog: `${HOME_PATH}/reports/approval-decisions`,
  /** CD-73 — แดชบอร์ด CRM */
  crmDashboard: `${HOME_PATH}/crm`,
  /** CD-71 — แคมเปญ */
  campaigns: `${HOME_PATH}/campaigns`,
  /** CD-75 — บันทึกการเข้าพบจากมือถือ */
  visitLog: `${HOME_PATH}/visit`,
  /** CD-84 งานส่งมอบ — กล่องของทีมที่รับ และที่ผู้ขายส่งไป; `?id=` เปิดใบนั้น. */
  handovers: `${HOME_PATH}/handovers`,
  /** CD-82 — เป้าและพยากรณ์ */
  salesTargets: `${HOME_PATH}/sales-targets`,
  /** CD-83 — รายงานยอดขาย */
  salesReport: `${HOME_PATH}/reports/sales`,

  /** CRM ระยะ 1 — ทะเบียนลูกค้า (CM-01, spec artifact 856c08fd). */
  customers: `${HOME_PATH}/customers`,
  newCustomer: `${HOME_PATH}/customers/new`,
  customerImport: `${HOME_PATH}/customers/import`,
  leads: `${HOME_PATH}/leads`,
  leadImport: `${HOME_PATH}/leads/import`,
  /** หน้ารายละเอียด Lead — pipeline, ข้อมูลบริษัท/ที่อยู่, กิจกรรม. */
  leadDetail: (id: string) => `${HOME_PATH}/leads/${id}`,
  opportunities: `${HOME_PATH}/opportunities`,
  opportunityDetail: (id: string) => `${HOME_PATH}/opportunities/${id}`,
  /** SUP-03 กล่องแจ้งเตือน */
  notifications: `${HOME_PATH}/notifications`,
  /** CD-76 ใบเสนอราคา — ทะเบียน และหน้ารายละเอียดต่อเวอร์ชัน (แก้ร่างในหน้าเดียวกัน). */
  quotations: `${HOME_PATH}/quotations`,
  saleOrders: `${HOME_PATH}/sale-orders`,
  quotationDetail: (id: string) => `${HOME_PATH}/quotations/${id}`,
  /** ฉบับพิมพ์ A4 — นอก app shell, พิมพ์ / บันทึก PDF จากเบราว์เซอร์. */
  quotationPrint: (id: string) => `/print/quotations/${id}`,
  /** หน้ารายละเอียดลูกค้า — จะโตเป็นมุมมอง 360° (C360). */
  customerDetail: (id: string) => `${HOME_PATH}/customers/${id}`,
  customerEdit: (id: string) => `${HOME_PATH}/customers/${id}/edit`,
  /** CM-07/CM-02/CM-03 configuration — มิติกลุ่มลูกค้า, รูปแบบรหัส, threshold. */
  adminCrm: `${HOME_PATH}/admin/crm`,

  /** CD-92 — แดชบอร์ด Metabase ฝังผ่าน signed embed URL. */
  biDashboard: (key: string) => `${HOME_PATH}/bi/${key}`,
  /** CD-92 — ลิงก์เข้าหน้า setting ของ Metabase (แอดมิน BI). */
  adminBi: `${HOME_PATH}/admin/bi`,

  /** Screen A2 — ประเภทคำขอ, and Screen A1 — ตารางอำนาจอนุมัติ as its tabs. */
  adminRequestTypes: `${HOME_PATH}/admin/request-types`,
  /** SUP-01 — เวลาทำการและวันหยุด, what a business-hours SLA is measured against. */
  adminSla: `${HOME_PATH}/admin/sla`,
  /** Screen A3 — ผังทีมและสิทธิ์ */
  adminOrg: `${HOME_PATH}/admin/org`,
  /** Read-only Keycloak user directory. */
  adminUsers: `${HOME_PATH}/admin/users`,
  /** SUP-04 — Audit log */
  adminAudit: `${HOME_PATH}/admin/audit`,
  /** CD-55 — บันทึกการแจ้งเตือน */
  adminNotificationLog: `${HOME_PATH}/admin/notification-log`,
  /** CD-54 — ถ้อยคำการแจ้งเตือน */
  adminNotificationTemplates: `${HOME_PATH}/admin/notification-templates`,
  adminNotificationRules: `${HOME_PATH}/admin/notification-rules`,
  /** กุญแจ API ของช่องทางภายนอก — สิทธิ์ `integration.*` ออกที่นี่. */
  adminApiKeys: `${HOME_PATH}/admin/api-keys`,
  adminErpSync: `${HOME_PATH}/admin/erp-sync`,
  /** REQ-02 — รูปแบบเลขรันของทุกชนิดเอกสาร. */
  adminRunNumbers: `${HOME_PATH}/admin/run-numbers`,
} as const;
