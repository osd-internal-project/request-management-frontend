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
  | "dashboard"
  | "myTask"
  | "esign"
  | "partner"
  | "project"
  | "pricingPrice"
  | "pricingMarkup"
  | "pricingException"
  | "pricingAnalytics"
  | "hrLaborRate"
  | "hrEmployee"
  | "hrMe"
  | "hrTeam"
  | "hrStaff"
  | "hrTimesheet"
  | "hrTimesheetApproval"
  | "hrLeave"
  | "hrLeaveApproval"
  | "hrLeaveSettings"
  | "hrAvailability"
  | "hrMandays"
  | "hrLaborCost"
  | "pricingVendorCost"
  | "projectPortfolio"
  | "projectRisk"
  | "projectConfig"
  | "projectWorkload"
  | "serviceAsset"
  | "esignLayout"
  | "esignAuthority";

export interface MenuEntry {
  label: string;
  href: string;
  /** Optional: an entry without one shows the generic icon. */
  icon?: MenuIconKey;
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
  /** CD-181 — project tasks handed to me (anyone may be given one). */
  {
    label: messages.nav.myTasks,
    href: ROUTES.myTasks,
    icon: "myTask",
    permissions: ["notification.read"],
    group: messages.nav.requestGroup,
  },
  /** CD-14 — documents I am asked to sign (anyone may be a signer). */
  {
    label: messages.nav.esignMine,
    href: ROUTES.esignMine,
    icon: "esign",
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

  /** CD-142 — คู่ค้า: ผู้ขายจาก SAP + ข้อมูลทางเทคนิคที่ Pre-Sales เก็บ. */
  {
    label: messages.nav.partners,
    href: ROUTES.partners,
    icon: "partner",
    permissions: ["presales.solution.read", "presales.solution.manage"],
    group: messages.nav.presalesGroup,
  },

  /** CD-175 — โครงการ: ทั้งบริษัท (pm.project.read) หรือที่ฉันอยู่ในทีม. */
  {
    label: messages.nav.projects,
    href: ROUTES.projects,
    icon: "project",
    permissions: ["notification.read"],
    group: messages.nav.pmGroup,
  },

  /** CD-194 — ราคาขายมาตรฐาน: Pricing เป็นเจ้าของราคาอ้างอิงแหล่งเดียว. */
  {
    label: messages.nav.pricingPrices,
    href: ROUTES.pricingPrices,
    icon: "pricingPrice",
    permissions: ["pricing.price.read", "pricing.price.manage"],
    group: messages.nav.pricingGroup,
  } /** CD-200 — markup by work type, SAP item group and customer group. */,
  {
    label: messages.nav.pricingMarkup,
    href: ROUTES.pricingMarkup,
    icon: "pricingMarkup",
    permissions: ["pricing.price.read", "pricing.price.manage"],
    group: messages.nav.pricingGroup,
  },
  /** CD-229 — the employee register (HR's facts on top of the directory). */
  {
    label: messages.nav.hrEmployees,
    href: ROUTES.hrEmployees,
    icon: "hrEmployee",
    permissions: ["hr.employee.read", "hr.employee.manage"],
    group: messages.nav.hrGroup,
  },
  /** CD-229 — everyone's own profile. */
  {
    label: messages.nav.hrMe,
    href: ROUTES.hrMe,
    icon: "hrMe",
    group: messages.nav.hrGroup,
  },
  /** CD-230 — the people below me (supervisors). */
  {
    label: messages.nav.hrTeam,
    href: ROUTES.hrTeam,
    icon: "hrTeam",
    group: messages.nav.hrGroup,
  },
  /** CD-231 — everyone logs their week. */
  {
    label: messages.nav.hrTimesheet,
    href: ROUTES.hrTimesheet,
    icon: "hrTimesheet",
    group: messages.nav.hrGroup,
  },
  /** CD-231 — supervisors (and HR) approve or return submitted weeks. */
  {
    label: messages.nav.hrTimesheetApprovals,
    href: ROUTES.hrTimesheetApprovals,
    icon: "hrTimesheetApproval",
    group: messages.nav.hrGroup,
  },
  /** CD-232 — everyone asks for leave and sees what is left. */
  {
    label: messages.nav.hrLeave,
    href: ROUTES.hrLeave,
    icon: "hrLeave",
    group: messages.nav.hrGroup,
  },
  /** CD-232 — supervisors (and HR) decide on leave. */
  {
    label: messages.nav.hrLeaveApprovals,
    href: ROUTES.hrLeaveApprovals,
    icon: "hrLeaveApproval",
    group: messages.nav.hrGroup,
  },
  /** CD-232 — who is free when (the backend decides whom one sees). */
  {
    label: messages.nav.hrAvailability,
    href: ROUTES.hrAvailability,
    icon: "hrAvailability",
    group: messages.nav.hrGroup,
  },
  /** CD-233 — manday plan against actual (PM, Pricing, HR). */
  {
    label: messages.nav.hrMandays,
    href: ROUTES.hrMandays,
    icon: "hrMandays",
    permissions: [
      "pm.project.read",
      "pm.project.manage",
      "pricing.price.read",
      "pricing.price.manage",
      "hr.employee.read",
      "hr.employee.manage",
    ],
    group: messages.nav.hrGroup,
  },
  /** CD-234 — service labour cost (pay-derived). */
  {
    label: messages.nav.hrLaborCosts,
    href: ROUTES.hrLaborCosts,
    icon: "hrLaborCost",
    permissions: ["hr.rate.read"],
    group: messages.nav.hrGroup,
  },
  /** CD-232 — kinds of leave and allowances (HR). */
  {
    label: messages.nav.hrLeaveSettings,
    href: ROUTES.hrLeaveSettings,
    icon: "hrLeaveSettings",
    permissions: ["hr.employee.read", "hr.employee.manage"],
    group: messages.nav.hrGroup,
  },
  /** CD-230 — who is here, at what level, with which skills (staffing). */
  {
    label: messages.nav.hrStaff,
    href: ROUTES.hrStaff,
    icon: "hrStaff",
    permissions: [
      "hr.employee.read",
      "hr.employee.manage",
      "pm.project.manage",
      "presales.solution.manage",
    ],
    group: messages.nav.hrGroup,
  },
  /** CD-207 — people's cost per manday by level × work type (HR). */
  {
    label: messages.nav.hrLaborRates,
    href: ROUTES.hrLaborRates,
    icon: "hrLaborRate",
    permissions: ["hr.rate.read", "hr.rate.manage"],
    group: messages.nav.hrGroup,
  },
  /** CD-208 — margin and discount by customer, work type, salesperson, vendor. */
  {
    label: messages.nav.pricingAnalytics,
    href: ROUTES.pricingAnalytics,
    icon: "pricingAnalytics",
    permissions: ["pricing.price.read"],
    group: messages.nav.pricingGroup,
  },
  /** CD-205 — every case outside the pricing policy, with reason and approver. */
  {
    label: messages.nav.pricingExceptions,
    href: ROUTES.pricingExceptions,
    icon: "pricingException",
    permissions: ["pricing.price.read"],
    group: messages.nav.pricingGroup,
  },
  /** CD-206 — suppliers' costs from SAP, with their date. */
  {
    label: messages.nav.pricingVendorCosts,
    href: ROUTES.pricingVendorCosts,
    icon: "pricingVendorCost",
    permissions: ["pricing.price.read"],
    group: messages.nav.pricingGroup,
  },

  /** CD-192 — ภาพรวมโครงการ เรียงโครงการที่เสี่ยงเกินเกณฑ์ขึ้นก่อน. */
  {
    label: messages.nav.projectPortfolio,
    href: ROUTES.projectPortfolio,
    icon: "projectPortfolio",
    permissions: ["pm.project.read"],
    group: messages.nav.pmGroup,
  },

  /** CD-183 — ความเสี่ยงที่ผู้บริหารต้องเห็น ข้ามทุกโครงการ. */
  {
    label: messages.nav.projectRisks,
    href: ROUTES.projectRisks,
    icon: "projectRisk",
    permissions: ["pm.project.read"],
    group: messages.nav.pmGroup,
  },

  /** CD-236 — ทะเบียนอุปกรณ์ที่ติดตั้งของลูกค้า. */
  {
    label: messages.nav.serviceAssets,
    href: ROUTES.serviceAssets,
    icon: "serviceAsset",
    permissions: ["service.asset.read"],
    group: messages.nav.serviceGroup,
  },

  /** CD-180 — ภาระงานทีมรายสัปดาห์ข้ามโครงการ (ผู้จัดคน / หัวหน้าทีม). */
  {
    label: messages.nav.projectWorkload,
    href: ROUTES.projectWorkload,
    icon: "projectWorkload",
    permissions: ["notification.read"],
    group: messages.nav.pmGroup,
  },

  /** CD-217 — ค้นหาค่าตั้งค่าข้ามโครงการที่ผู้ใช้เห็น (ไม่ค้นในค่าลับ). */
  {
    label: messages.nav.projectConfigs,
    href: ROUTES.projectConfigs,
    icon: "projectConfig",
    permissions: ["notification.read"],
    group: messages.nav.pmGroup,
  },

  /** CD-161 — คลังสัญญา: สัญญาทุกฉบับของบริษัท (ลูกค้า NDA MSA คู่สัญญาอื่น). */
  {
    label: messages.nav.contracts,
    href: ROUTES.contracts,
    icon: "contract",
    permissions: ["legal.contract.read"],
    group: messages.nav.legalGroup,
  },
  /** CD-165 — แม่แบบช่องลงนาม: ใครลงนาม หน้าใด ตำแหน่งใด ลำดับใด. */
  {
    label: messages.nav.esignLayouts,
    href: ROUTES.esignLayouts,
    icon: "esignLayout",
    permissions: ["esign.manage"],
    group: messages.nav.legalGroup,
  },
  /** CD-172 — who may sign for the company, up to what amount. */
  {
    label: messages.nav.esignAuthorities,
    href: ROUTES.esignAuthorities,
    icon: "esignAuthority",
    permissions: ["esign.manage"],
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
