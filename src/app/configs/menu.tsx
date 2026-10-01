import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { Session } from "@/lib/session";

/** A string, not a component: menus are built on the server and cross to the client. */
export type MenuIconKey =
  | "inbox"
  | "obligation"
  | "newRequest"
  | "allWork"
  | "bottleneck"
  | "slaReport"
  | "decisionLog"
  | "crmDashboard"
  | "customer"
  | "keeper"
  | "targetAccount"
  | "lead"
  | "visitLog"
  | "handover"
  | "opportunity"
  | "quotation"
  | "saleOrder"
  | "campaign"
  | "salesTarget"
  | "salesReport"
  | "contract"
  | "contractTemplate"
  | "requestType"
  | "intakeChannel"
  | "slaSettings"
  | "org"
  | "user"
  | "audit"
  | "notificationLog"
  | "notificationRule"
  | "notificationTemplate"
  | "biSettings"
  | "crmSettings"
  | "apiKey"
  | "erpSync"
  | "runNumber"
  | "dashboard";

export interface MenuEntry {
  label: string;
  href: string;
  icon: MenuIconKey;
  /** Shown only if the session holds at least one of these. */
  permissions?: readonly string[];
  /** Group heading rendered above this entry, e.g. "ผู้ดูแลระบบ". */
  group?: string;
}

/**
 * The navigation from the §16 mockups, each entry tagged with the permission
 * that reveals it.
 */
const MENU_ITEMS: readonly MenuEntry[] = [
  {
    label: messages.nav.myWork,
    href: ROUTES.myWork,
    icon: "inbox",
    permissions: ["request.read"],
    group: messages.nav.requestGroup,
  },
  /** CD-163 — obligations handed to me from contracts (anyone may hold one). */
  {
    label: messages.nav.obligations,
    href: ROUTES.obligations,
    icon: "obligation",
    permissions: ["notification.read"],
    group: messages.nav.requestGroup,
  },
  {
    label: messages.nav.newRequest,
    href: ROUTES.newRequest,
    icon: "newRequest",
    permissions: ["request.create"],
    group: messages.nav.requestGroup,
  },
  /*
    Shown to everybody who can read requests, not only to heads: somebody who
    heads nothing sees the screen say so, which is a better answer than a menu
    item that appears the day they are made a head and is otherwise invisible.
  */
  {
    label: messages.nav.allWork,
    href: ROUTES.allWork,
    icon: "allWork",
    permissions: ["request.read"],
    group: messages.nav.requestGroup,
  },
  {
    label: messages.nav.bottleneckReport,
    href: ROUTES.bottleneckReport,
    icon: "bottleneck",
    permissions: ["report.request.read"],
    group: messages.nav.biGroup,
  },
  /** CD-50 — สัดส่วนงานตรงเวลา และคำขอค้างเกินกำหนด. */
  {
    label: messages.nav.slaReport,
    href: ROUTES.slaReport,
    icon: "slaReport",
    permissions: ["report.request.read"],
    group: messages.nav.biGroup,
  },
  /** APV-06 (CD-45) — ใครอนุมัติอะไร เมื่อไร ในฐานะอะไร + export. */
  {
    label: messages.nav.decisionLog,
    href: ROUTES.decisionLog,
    icon: "decisionLog",
    permissions: ["approval.history.read"],
    group: messages.nav.biGroup,
  },

  /** CD-73 — ภาพรวมลูกค้า Lead โอกาสการขาย กิจกรรม (ตามขอบเขตที่เห็น). */
  {
    label: messages.nav.crmDashboard,
    href: ROUTES.crmDashboard,
    icon: "crmDashboard",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CRM ระยะ 1 (CD-59) — หน้ารายละเอียดลูกค้าจะโตเป็นมุมมอง 360°. */
  {
    label: messages.nav.customers,
    href: ROUTES.customers,
    icon: "customer",
    permissions: ["crm.customer.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-86 — Portfolio ลูกค้าเดิมของแกน Keeper: แผนบัญชี สุขภาพ รอบทบทวน. */
  {
    label: messages.nav.keeper,
    href: ROUTES.keeper,
    icon: "keeper",
    permissions: ["crm.customer.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-85 — บริษัทเป้าหมายของแกน Getter: เล็ง จัดลำดับ แล้วเริ่มเข้าหาเป็น Lead. */
  {
    label: messages.nav.targetAccounts,
    href: ROUTES.targetAccounts,
    icon: "targetAccount",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  {
    label: messages.nav.leads,
    href: ROUTES.leads,
    icon: "lead",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  {
    label: messages.nav.visitLog,
    href: ROUTES.visitLog,
    icon: "visitLog",
    permissions: ["crm.sales.manage"],
    group: messages.nav.crmGroup,
  },
  /** CD-84 — ทีมที่รับงานไม่จำเป็นต้องมีสิทธิ์ CRM; หน้าเองแสดงเฉพาะงานของทีม. */
  {
    label: messages.nav.handovers,
    href: ROUTES.handovers,
    icon: "handover",
    group: messages.nav.crmGroup,
  },
  {
    label: messages.nav.opportunities,
    href: ROUTES.opportunities,
    icon: "opportunity",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-76 — ใบเสนอราคาทุกเวอร์ชัน; สร้างจากหน้ารายละเอียดโอกาสการขาย. */
  {
    label: messages.nav.quotations,
    href: ROUTES.quotations,
    icon: "quotation",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-88 — ใบสั่งขายทุกใบในขอบเขตที่เห็น พร้อมสถานะส่ง SAP; เปิดใบจากหน้าโอกาสการขาย. */
  {
    label: messages.nav.saleOrders,
    href: ROUTES.saleOrders,
    icon: "saleOrder",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-71 — แคมเปญการตลาดและผลถึงยอดขาย. */
  {
    label: messages.nav.campaigns,
    href: ROUTES.campaigns,
    icon: "campaign",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-82 — เป้ารายเดือนเทียบยอดจริงและพยากรณ์. */
  {
    label: messages.nav.salesTargets,
    href: ROUTES.salesTargets,
    icon: "salesTarget",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-83 — ยอดขาย อัตราการปิด เหตุผลที่แพ้ ผลงานรายบุคคล (ตามขอบเขตที่เห็น). */
  {
    label: messages.nav.salesReport,
    href: ROUTES.salesReport,
    icon: "salesReport",
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },

  /** CD-161 — คลังสัญญา: สัญญาทุกฉบับของบริษัท (ลูกค้า NDA MSA คู่สัญญาอื่น). */
  {
    label: messages.nav.contracts,
    href: ROUTES.contracts,
    icon: "contract",
    permissions: ["legal.contract.read"],
    group: messages.nav.legalGroup,
  },
  /** CD-146 — แม่แบบสัญญา: ข้อสัญญาพร้อมตัวแปรที่เติมจากดีลตอนเริ่มร่าง. */
  {
    label: messages.nav.contractTemplates,
    href: ROUTES.contractTemplates,
    icon: "contractTemplate",
    permissions: ["legal.contract.read"],
    group: messages.nav.legalGroup,
  },
  {
    // ตารางอำนาจอนุมัติ (A1) has no entry of its own: it is two tabs of the
    // request type it belongs to, reached from ประเภทคำขอ below.
    label: messages.nav.adminRequestTypes,
    href: ROUTES.adminRequestTypes,
    icon: "requestType",
    permissions: ["admin.request-type.manage"],
    group: messages.nav.adminGroup,
  },
  /** CD-66 — ลูกค้ายื่นคำขอเองผ่านแบบฟอร์มสาธารณะ / LINE / AI CARE. */
  {
    label: messages.nav.adminIntakeChannels,
    href: ROUTES.adminIntakeChannels,
    icon: "intakeChannel",
    permissions: ["admin.request-type.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminSla,
    href: ROUTES.adminSla,
    icon: "slaSettings",
    permissions: ["admin.sla.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminOrg,
    href: ROUTES.adminOrg,
    icon: "org",
    permissions: ["admin.org.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminUsers,
    href: ROUTES.adminUsers,
    icon: "user",
    permissions: ["user.read"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminAudit,
    href: ROUTES.adminAudit,
    icon: "audit",
    permissions: ["audit.read"],
    group: messages.nav.adminGroup,
  },
  /** CD-55 — ส่งถึงใคร เมื่อไร ช่องทางใด อ่านแล้วหรือยัง. */
  {
    label: messages.nav.adminNotificationLog,
    href: ROUTES.adminNotificationLog,
    icon: "notificationLog",
    permissions: ["audit.read"],
    group: messages.nav.adminGroup,
  },
  /** CD-53 — กติกาแจ้งเตือนจากเหตุการณ์ (สัญญา/ใบแจ้งหนี้/KYC/ดีลเงียบ) รวมที่เดียว. */
  {
    label: messages.nav.adminNotificationRules,
    href: ROUTES.adminNotificationRules,
    icon: "notificationRule",
    permissions: ["admin.notification.manage"],
    group: messages.nav.adminGroup,
  },
  /** CD-54 — ถ้อยคำการแจ้งเตือนต่อเหตุการณ์ ของแต่ละบริษัท. */
  {
    label: messages.nav.adminNotificationTemplates,
    href: ROUTES.adminNotificationTemplates,
    icon: "notificationTemplate",
    permissions: ["admin.notification.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminBi,
    href: ROUTES.adminBi,
    icon: "biSettings",
    permissions: ["admin.bi.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminCrm,
    href: ROUTES.adminCrm,
    icon: "crmSettings",
    permissions: ["admin.crm.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminApiKeys,
    href: ROUTES.adminApiKeys,
    icon: "apiKey",
    permissions: ["admin.integration.manage"],
    group: messages.nav.adminGroup,
  },
  /** CM-06 / CD-88 — งานส่ง SAP ที่ไม่สำเร็จ ดูข้อผิดพลาดแล้วกดส่งใหม่. */
  {
    label: messages.nav.adminErpSync,
    href: ROUTES.adminErpSync,
    icon: "erpSync",
    permissions: ["admin.integration.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminRunNumbers,
    href: ROUTES.adminRunNumbers,
    icon: "runNumber",
    permissions: ["admin.run-number.manage"],
    group: messages.nav.adminGroup,
  },
];

/** One BI dashboard as the menu needs it — `key` and `title` from `GET /bi/menu`. */
export interface BiMenuDashboard {
  key: string;
  title: string;
}

/**
 * The menu this session may see (ROLE-06).
 *
 * Filtering here is for usability only — a user who types an admin URL still
 * gets a 403 from the backend, because `PolicyGuard` re-checks the same
 * permission on every call. Never treat a hidden menu item as access control.
 *
 * CD-92 v2: the BI entries are no longer fixed — the layout passes in whatever
 * `GET /bi/menu` answered for this caller (already filtered per team by the
 * backend), and they render under the BI group between reports and admin.
 *
 * Passing no session yields an empty menu rather than the full one, so a
 * failed `/auth/me` degrades closed.
 */
export const accessMenuItems = (
  session?: Session | null,
  biDashboards: readonly BiMenuDashboard[] = [],
): MenuEntry[] => {
  if (!session) return [];

  const biEntries: MenuEntry[] = biDashboards.map((dashboard) => ({
    label: dashboard.title,
    href: ROUTES.biDashboard(dashboard.key),
    icon: "dashboard",
    permissions: ["report.dashboard.read"],
    group: messages.nav.biGroup,
  }));

  const adminStart = MENU_ITEMS.findIndex(
    (item) => item.group === messages.nav.adminGroup,
  );
  const items =
    adminStart === -1
      ? [...MENU_ITEMS, ...biEntries]
      : [
          ...MENU_ITEMS.slice(0, adminStart),
          ...biEntries,
          ...MENU_ITEMS.slice(adminStart),
        ];

  return items.filter(
    (item) =>
      !item.permissions?.length ||
      item.permissions.some((permission) =>
        session.permissions.includes(permission),
      ),
  );
};
