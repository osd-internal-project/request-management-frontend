import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { Session } from "@/lib/session";

export interface MenuEntry {
  label: string;
  href: string;
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
    permissions: ["request.read"],
    group: messages.nav.requestGroup,
  },
  /** CD-163 — obligations handed to me from contracts (anyone may hold one). */
  {
    label: messages.nav.obligations,
    href: ROUTES.obligations,
    permissions: ["notification.read"],
    group: messages.nav.requestGroup,
  },
  {
    label: messages.nav.newRequest,
    href: ROUTES.newRequest,
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
    permissions: ["request.read"],
    group: messages.nav.requestGroup,
  },
  {
    label: messages.nav.bottleneckReport,
    href: ROUTES.bottleneckReport,
    permissions: ["report.request.read"],
    group: messages.nav.biGroup,
  },
  /** CD-50 — สัดส่วนงานตรงเวลา และคำขอค้างเกินกำหนด. */
  {
    label: messages.nav.slaReport,
    href: ROUTES.slaReport,
    permissions: ["report.request.read"],
    group: messages.nav.biGroup,
  },
  /** APV-06 (CD-45) — ใครอนุมัติอะไร เมื่อไร ในฐานะอะไร + export. */
  {
    label: messages.nav.decisionLog,
    href: ROUTES.decisionLog,
    permissions: ["approval.history.read"],
    group: messages.nav.biGroup,
  },

  /** CD-73 — ภาพรวมลูกค้า Lead โอกาสการขาย กิจกรรม (ตามขอบเขตที่เห็น). */
  {
    label: messages.nav.crmDashboard,
    href: ROUTES.crmDashboard,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CRM ระยะ 1 (CD-59) — หน้ารายละเอียดลูกค้าจะโตเป็นมุมมอง 360°. */
  {
    label: messages.nav.customers,
    href: ROUTES.customers,
    permissions: ["crm.customer.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-86 — Portfolio ลูกค้าเดิมของแกน Keeper: แผนบัญชี สุขภาพ รอบทบทวน. */
  {
    label: messages.nav.keeper,
    href: ROUTES.keeper,
    permissions: ["crm.customer.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-85 — บริษัทเป้าหมายของแกน Getter: เล็ง จัดลำดับ แล้วเริ่มเข้าหาเป็น Lead. */
  {
    label: messages.nav.targetAccounts,
    href: ROUTES.targetAccounts,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  {
    label: messages.nav.leads,
    href: ROUTES.leads,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  {
    label: messages.nav.visitLog,
    href: ROUTES.visitLog,
    permissions: ["crm.sales.manage"],
    group: messages.nav.crmGroup,
  },
  /** CD-84 — ทีมที่รับงานไม่จำเป็นต้องมีสิทธิ์ CRM; หน้าเองแสดงเฉพาะงานของทีม. */
  {
    label: messages.nav.handovers,
    href: ROUTES.handovers,
    group: messages.nav.crmGroup,
  },
  {
    label: messages.nav.opportunities,
    href: ROUTES.opportunities,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-76 — ใบเสนอราคาทุกเวอร์ชัน; สร้างจากหน้ารายละเอียดโอกาสการขาย. */
  {
    label: messages.nav.quotations,
    href: ROUTES.quotations,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-88 — ใบสั่งขายทุกใบในขอบเขตที่เห็น พร้อมสถานะส่ง SAP; เปิดใบจากหน้าโอกาสการขาย. */
  {
    label: messages.nav.saleOrders,
    href: ROUTES.saleOrders,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-71 — แคมเปญการตลาดและผลถึงยอดขาย. */
  {
    label: messages.nav.campaigns,
    href: ROUTES.campaigns,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-82 — เป้ารายเดือนเทียบยอดจริงและพยากรณ์. */
  {
    label: messages.nav.salesTargets,
    href: ROUTES.salesTargets,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },
  /** CD-83 — ยอดขาย อัตราการปิด เหตุผลที่แพ้ ผลงานรายบุคคล (ตามขอบเขตที่เห็น). */
  {
    label: messages.nav.salesReport,
    href: ROUTES.salesReport,
    permissions: ["crm.sales.read"],
    group: messages.nav.crmGroup,
  },

  /** CD-161 — คลังสัญญา: สัญญาทุกฉบับของบริษัท (ลูกค้า NDA MSA คู่สัญญาอื่น). */
  {
    label: messages.nav.contracts,
    href: ROUTES.contracts,
    permissions: ["legal.contract.read"],
    group: messages.nav.legalGroup,
  },
  {
    // ตารางอำนาจอนุมัติ (A1) has no entry of its own: it is two tabs of the
    // request type it belongs to, reached from ประเภทคำขอ below.
    label: messages.nav.adminRequestTypes,
    href: ROUTES.adminRequestTypes,
    permissions: ["admin.request-type.manage"],
    group: messages.nav.adminGroup,
  },
  /** CD-66 — ลูกค้ายื่นคำขอเองผ่านแบบฟอร์มสาธารณะ / LINE / AI CARE. */
  {
    label: messages.nav.adminIntakeChannels,
    href: ROUTES.adminIntakeChannels,
    permissions: ["admin.request-type.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminSla,
    href: ROUTES.adminSla,
    permissions: ["admin.sla.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminOrg,
    href: ROUTES.adminOrg,
    permissions: ["admin.org.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminUsers,
    href: ROUTES.adminUsers,
    permissions: ["user.read"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminAudit,
    href: ROUTES.adminAudit,
    permissions: ["audit.read"],
    group: messages.nav.adminGroup,
  },
  /** CD-55 — ส่งถึงใคร เมื่อไร ช่องทางใด อ่านแล้วหรือยัง. */
  {
    label: messages.nav.adminNotificationLog,
    href: ROUTES.adminNotificationLog,
    permissions: ["audit.read"],
    group: messages.nav.adminGroup,
  },
  /** CD-53 — กติกาแจ้งเตือนจากเหตุการณ์ (สัญญา/ใบแจ้งหนี้/KYC/ดีลเงียบ) รวมที่เดียว. */
  {
    label: messages.nav.adminNotificationRules,
    href: ROUTES.adminNotificationRules,
    permissions: ["admin.notification.manage"],
    group: messages.nav.adminGroup,
  },
  /** CD-54 — ถ้อยคำการแจ้งเตือนต่อเหตุการณ์ ของแต่ละบริษัท. */
  {
    label: messages.nav.adminNotificationTemplates,
    href: ROUTES.adminNotificationTemplates,
    permissions: ["admin.notification.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminBi,
    href: ROUTES.adminBi,
    permissions: ["admin.bi.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminCrm,
    href: ROUTES.adminCrm,
    permissions: ["admin.crm.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminApiKeys,
    href: ROUTES.adminApiKeys,
    permissions: ["admin.integration.manage"],
    group: messages.nav.adminGroup,
  },
  /** CM-06 / CD-88 — งานส่ง SAP ที่ไม่สำเร็จ ดูข้อผิดพลาดแล้วกดส่งใหม่. */
  {
    label: messages.nav.adminErpSync,
    href: ROUTES.adminErpSync,
    permissions: ["admin.integration.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminRunNumbers,
    href: ROUTES.adminRunNumbers,
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
