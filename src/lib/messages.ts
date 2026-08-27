/**
 * UI copy, Thai first (NFR-06).
 *
 * The requirement is that the *structure* supports adding a language later,
 * not that anything is translated now — so every string lives here rather than
 * inline in a component, and a second locale becomes another object with the
 * same shape plus a lookup. No i18n library is pulled in for that.
 */
export const messages = {
  app: {
    name: "Connect the Dot",
    tagline: "คำขอข้ามทีมทุกใบ มีเจ้าของ มีกำหนดเวลา ตรวจย้อนได้เสมอ",
    version: "Foundation Sprint · v1.2",
  },

  login: {
    title: "เข้าสู่ระบบ",
    subtitle: "ใช้บัญชีองค์กรของคุณ ไม่ต้องสมัครหรือตั้งรหัสผ่านใหม่",
    ssoButton: "เข้าสู่ระบบด้วยบัญชีองค์กร (SSO)",
    ssoHint:
      "ระบบจะพาไปยืนยันตัวตนผ่าน Keycloak ด้วยรหัสผ่านองค์กร (LDAP) — ระบบนี้ไม่เก็บและไม่เห็นรหัสผ่านของคุณ",
    marketingDescription:
      "แพลตฟอร์มคำขอและการอนุมัติกลางของกลุ่มบริษัท เลิกไล่งานในอีเมลและแชท",
    pendingTitle: "เข้าระบบครั้งแรกแล้วยังไม่เห็นเมนู?",
    pendingHint:
      "บัญชีของคุณกำลังรอผู้ดูแลจัดสังกัดทีม ติดต่อผู้ดูแลระบบที่ it-support@company.co.th",
    pendingContactPrefix:
      "บัญชีของคุณกำลังรอผู้ดูแลจัดสังกัดทีม ติดต่อผู้ดูแลระบบที่",
    highlights: [
      "เลขอ้างอิงทุกคำขอ ออกทันทีที่ยื่น",
      "เส้นทางอนุมัติอัตโนมัติตามวงเงิน",
      "นาฬิกา SLA เดินเอง เร่งงานเองเมื่อเกินกำหนด",
    ],
    errors: {
      unreachable: "ไม่สามารถติดต่อระบบยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง",
      authorize_failed: "เริ่มการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      exchange_failed: "ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      state_mismatch:
        "การเข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง กรุณาเริ่มใหม่อีกครั้ง",
      missing_state: "การเข้าสู่ระบบหมดอายุ กรุณาเริ่มใหม่อีกครั้ง",
      access_denied: "การเข้าสู่ระบบถูกยกเลิก",
      session_expired:
        "เซสชันหมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบอีกครั้ง",
      default: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    },
  },

  nav: {
    myWork: "งานค้างของฉัน",
    newRequest: "ยื่นคำขอใหม่",
    approvals: "รออนุมัติของฉัน",
    bottleneckReport: "รายงานคอขวด",
    adminGroup: "ผู้ดูแลระบบ",
    adminApprovalMatrix: "ตารางอำนาจอนุมัติ",
    adminRequestTypes: "ประเภทคำขอ",
    adminOrg: "ผังทีมและสิทธิ์",
    adminUsers: "ผู้ใช้",
    adminAudit: "Audit Log",
    biGroup: "แดชบอร์ดผู้บริหาร",
    adminBi: "ตั้งค่า Dashboard",
    logout: "ออกจากระบบ",
    company: "บริษัท",
    switchFailed: "สลับบริษัทไม่สำเร็จ",
  },

  pending: {
    title: "รอผู้ดูแลจัดสังกัดทีม",
    body: "บัญชีของคุณเข้าสู่ระบบสำเร็จแล้ว แต่ยังไม่ได้ถูกจัดสังกัดทีม — จึงยังยื่นคำขอไม่ได้ เพราะระบบยังไม่ทราบว่าใครคือหัวหน้าผู้อนุมัติชั้นแรกของคุณ",
    action: "กรุณาติดต่อผู้ดูแลระบบเพื่อจัดสังกัด",
  },

  org: {
    title: "ผังทีมและสิทธิ์",
    subtitle: "ดูแลในระบบ (LDAP ใช้ล็อกอินเท่านั้น)",
    treeTitle: "โครงสร้างทีม",
    unassignedTitle: "รอจัดสังกัด",
    unassignedHint:
      "ล็อกอินครั้งแรกแล้วแต่ยังยื่นคำขอไม่ได้จนกว่าจะมีหัวหน้า",
    unassignedEmpty: "ไม่มีผู้ใช้รอจัดสังกัด",
    manager: "หัวหน้า",
    /** §16 A3 shows the unit's own lead as "หัวหน้าทีม", not plain "หัวหน้า". */
    teamLead: "หัวหน้าทีม",
    /** A lead's own supervisor is worded differently from a member's. */
    reportsTo: "รายงานตรงต่อ",
    members: "คน",
    today: "วันนี้",
    yesterday: "เมื่อวาน",
    truthNote:
      "ผังนี้คือแหล่งความจริงของ “หัวหน้าของผู้ยื่น” ที่ใช้ใน Data Scope, เส้นทางอนุมัติชั้นที่ 1 และการเร่งงาน",
    roleNote:
      "role หลักมาจาก Keycloak (แก้ที่ Keycloak) · ผู้ดูแลปรับ scope และผูก role เพิ่มในระบบได้ — ทุกการแก้ไขลง Audit Log",
    firstLogin: "ล็อกอินครั้งแรก",
    addTeam: "+ เพิ่มทีม",
    assign: "จัดสังกัด",
    changeLead: "เปลี่ยนหัวหน้าทีม",
    noMembers: "ยังไม่มีสมาชิกในหน่วยงานนี้",
    saved: "บันทึกแล้ว",
    selectUnit: "เลือกหน่วยงาน",
    unitCode: "รหัสหน่วยงาน",
    unitName: "ชื่อหน่วยงาน",
    parentUnit: "หน่วยงานแม่",
    keycloakRole: "role จาก Keycloak",
    keycloakGroup: "กลุ่ม Keycloak",
    keycloakUnavailable: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Keycloak Admin API",
    scope: "scope",
    editScope: "ปรับ scope",
    scopeIsPerRole: (role: string, holders: number) =>
      `scope กำหนดต่อ (role, ชนิดข้อมูล) ตาม SCOPE-01 — การแก้ตรงนี้มีผลกับทุกคนที่ถือ role "${role}" ในบริษัทนี้ (${holders} คน)`,
    extraRoles: "role เพิ่มเติมในระบบ",
    addRole: "ผูก role เพิ่ม",

    /** §16 — A3 and A4 are tabs of one screen. */
    tabs: {
      tree: "ผังทีม",
      roles: "Role และ Permission",
      scope: "Scope Rules",
      keycloak: "Keycloak Mapping",
    },
  },

  /** Screen §16 A4 — Role และ Permission. */
  roleAdmin: {
    listTitle: (count: number) => `Role ทั้งหมด · ${count}`,
    newRole: "+ สร้าง role",
    active: "เปิดใช้",
    inactive: "ปิดใช้งาน",
    everyone: "ทุกคน · อัตโนมัติ",
    holders: (count: number) => `${count} คน`,
    mappedFrom: (keycloakRole: string) => `map จาก Keycloak: ${keycloakRole}`,
    unmapped: "ยังไม่ได้ map กับ Keycloak",
    edit: (name: string) => `แก้ไข role: ${name}`,
    company: (name: string) => `บริษัท ${name}`,
    undeletable: (count: number) => `ลบไม่ได้ — มีผู้ใช้ ${count} คน`,
    deletableNote: "ลบไม่ได้ — role ปิดใช้งานได้อย่างเดียว (ROLE-02)",
    disable: "ปิดใช้งาน",
    enable: "เปิดใช้งาน",
    save: "บันทึก",
    saved: "บันทึกแล้ว — มีผลทันทีกับ API call ถัดไป",
    selectFirst: "เลือก role ทางซ้ายเพื่อแก้ไข",

    membershipNote: (keycloakRole: string | null) =>
      keycloakRole
        ? `สมาชิก role จัดการที่ Keycloak (map: ${keycloakRole}) — หน้านี้กำหนดเฉพาะว่า role ทำอะไรได้ · แก้แล้วมีผลทันทีกับ API call ถัดไป`
        : "สมาชิก role จัดการที่ Keycloak — หน้านี้กำหนดเฉพาะว่า role ทำอะไรได้ · แก้แล้วมีผลทันทีกับ API call ถัดไป",

    /** §16 A4 groups the catalog into three columns of checkboxes. */
    groups: {
      request: "REQUEST",
      approvalReport: "APPROVAL · REPORT",
      adminAudit: "ADMIN · AUDIT",
    },

    /** Thai next to each permission code, as the mockup prints them. */
    permission: {
      "request.create": "ยื่นคำขอ",
      "request.read": "ดูคำขอ",
      "request.return": "ตีกลับ",
      "request.cancel.own": "ยกเลิกของตน",
      "request.cancel.any": "ยกเลิกแทน",
      "request.complete": "ปิดงาน",
      "request.hold": "พักงาน",
      "request.sensitive.read": "เห็น margin",
      "approval.decide": "อนุมัติ",
      "approval.delegate": "มอบอำนาจ",
      "approval.history.read": "ประวัติอำนาจ",
      "report.request.read": "รายงานทีม",
      "report.dashboard.read": "แดชบอร์ด",
      "user.read": "ค้นผู้ใช้",
      "audit.read": "อ่าน audit log",
      "notification.read": "รับแจ้งเตือน",
    } as Record<string, string>,

    /** §5.4 guardrail 1 — the reason the admin boxes are not tickable here. */
    adminLocked: "admin.* — ขัด guardrail แยกหน้าที่",
    adminLockedHint:
      "§5.4: role ที่มีสิทธิ์ admin.* ถือ approval.decide หรือ request.sensitive.read ไม่ได้ · backend ปฏิเสธการบันทึก ไม่ใช่แค่ปุ่มนี้ที่กดไม่ได้",

    holdersTitle: (count: number) => `ผู้ใช้ใน role นี้ · ${count}`,
    bindManually: "+ ผูกมือ",
    fromKeycloak: "จาก Keycloak",
    manual: "ผูกมือ",
    revoke: "ถอน",
    revoked: "ถอน role แล้ว",
    seeAll: (count: number) => `ดูทั้งหมด ${count} คน`,
    noHolders: "ยังไม่มีใครถือ role นี้ในบริษัทนี้",
    keycloakNotRevocable:
      "grant ที่มาจาก Keycloak ถอนที่นี่ไม่ได้ — ระบบเขียนทับใหม่ทุกครั้งที่ล็อกอิน (ROLE-03) ให้ถอนที่ Keycloak",

    recentTitle: "การเปลี่ยนแปลงล่าสุด",
    recentEmpty: "ยังไม่มีการเปลี่ยนแปลง",
    auditNote: "ทุกรายการอยู่ใน Audit Log",

    newRoleTitle: "สร้าง role ใหม่",
    code: "รหัส role",
    codeHint: "ตัวพิมพ์เล็กและขีดล่าง เช่น sales_support — เปลี่ยนภายหลังไม่ได้",
    name: "ชื่อที่แสดง",
    description: "คำอธิบาย",
  },

  /** SCOPE-01 — no mockup; designed to sit beside A4. */
  scopeRules: {
    title: "Scope Rules",
    subtitle:
      "กำหนดว่า role หนึ่งเห็นข้อมูลได้ไกลแค่ไหน · คู่ (role, ชนิดข้อมูล) ตาม SCOPE-01 — มีผลทันที ไม่ต้อง deploy",
    columns: {
      role: "Role",
      resource: "ชนิดข้อมูล",
      scope: "ขอบเขต",
    },
    scopeLabel: {
      own: "own — เฉพาะของตัวเอง",
      team: "team — ทั้งทีม",
      department: "department — ทั้งฝ่าย",
      company: "company — ทั้งบริษัท",
      all: "all — ข้ามบริษัท",
    } as Record<string, string>,
    resourceLabel: {
      request: "คำขอ",
      approval_case: "งานอนุมัติ",
      user: "ผู้ใช้",
    } as Record<string, string>,
    addRule: "+ เพิ่มกฎ",
    save: "บันทึกทั้งตาราง",
    saved: "บันทึกแล้ว — มีผลทันที",
    replaceNote:
      "บันทึกแล้วระบบแทนที่ทั้งตาราง กฎที่ลบออกจากหน้านี้จะหายไปจริง",
    empty: "ยังไม่มีกฎ scope — ทุก role จะเห็นเฉพาะข้อมูลของตัวเอง",
  },

  /** ROLE-03 — no mockup; designed to sit beside A4. */
  keycloakMapping: {
    title: "Keycloak Mapping",
    subtitle:
      "จับคู่ role ใน Keycloak กับ role ในระบบ ต่อบริษัท — ระบบประเมินใหม่ทุกครั้งที่ล็อกอินหรือ refresh token (ROLE-03)",
    columns: {
      keycloakRole: "Role ใน Keycloak",
      systemRole: "Role ในระบบ",
    },
    addMapping: "+ เพิ่มการจับคู่",
    save: "บันทึกทั้งตาราง",
    saved: "บันทึกแล้ว — มีผลกับการล็อกอินครั้งถัดไป",
    remove: "ลบ",
    effectNote:
      "การแก้ที่นี่ไม่เปลี่ยนสิทธิ์ของคนที่ล็อกอินค้างอยู่ทันที — ระบบเขียน role ที่ map มาใหม่ทั้งชุดตอนล็อกอินครั้งถัดไป (ภายในอายุ access token)",
    replaceNote:
      "บันทึกแล้วระบบแทนที่ทั้งตารางของบริษัทนี้ การจับคู่ที่ลบออกจะหายไปจริง",
    empty:
      "ยังไม่มีการจับคู่ — ผู้ใช้ที่ล็อกอินจะยังไม่ได้ role ใดจนกว่าผู้ดูแลจะผูกมือ",
    keycloakRolePlaceholder: "crm-team-lead",
  },

  users: {
    title: "ผู้ใช้",
    subtitle: "รายชื่อผู้ใช้จาก Keycloak (อ่านอย่างเดียว)",
    searchPlaceholder: "ค้นหาชื่อผู้ใช้ ชื่อ หรืออีเมล",
    search: "ค้นหา",
    empty: "ไม่พบผู้ใช้",
    columns: {
      username: "ชื่อผู้ใช้",
      name: "ชื่อ-นามสกุล",
      email: "อีเมล",
      status: "สถานะ",
    },
    active: "ใช้งาน",
    inactive: "ปิดใช้งาน",
  },

  requestForm: {
    title: "ยื่นคำขอ",
    /** §16 หน้าที่ 3 — the page heading and the left-menu entry agree. */
    pageTitle: "ยื่นคำขอใหม่",
    draftBanner: "สถานะ: ร่าง — เลขคำขอจะออกเมื่อกดยื่น",
    type: "ประเภทคำขอ",
    typeRequired: "เลือกประเภทคำขอก่อน",
    refLabel: "อ้างอิงดีล",
    refRequired: "กรอกเลขอ้างอิงดีลก่อนยื่น",
    requiredDocsTitle: "เอกสารบังคับตามประเภทคำขอ",
    autosaveAt: (time: string) => `บันทึกร่างอัตโนมัติล่าสุด ${time} น.`,
    sensitiveBadge: "เห็นเฉพาะสายอนุมัติ",
    documents: "เอกสารแนบ",
    dropzone: "ลากไฟล์มาวาง หรือกดเพื่อแนบเอกสารเพิ่มเติม",
    remove: "ลบ",
    missingDoc: "ยังขาด",
    noStorageNote:
      "รอบนี้ระบบบันทึกเฉพาะรายการเอกสาร ยังไม่เก็บตัวไฟล์และดาวน์โหลดไม่ได้",
    saveDraft: "บันทึกร่าง",
    submit: "ยื่นคำขอ",
    submitting: "กำลังยื่น…",
    saved: "บันทึกร่างแล้ว",
    submitted: "ยื่นคำขอแล้ว",
    chainTitle: "เส้นทางอนุมัติที่จะใช้",
    chainComputed: (amount: string) =>
      `คำนวณอัตโนมัติจากวงเงิน ${amount} บาท`,
    chainOverTier: (ceiling: string) => `(เกินเพดาน ${ceiling} บาท)`,
    chainNoPick: "ผู้ยื่นเลือกผู้อนุมัติเองไม่ได้",
    chainUnresolved: "ยังไม่มีผู้รับผิดชอบขั้นนี้ในผังทีม",
    chainExcluded: (position: string, ceiling: string) =>
      `${position} ไม่อยู่ในเส้นทาง — วงเงินไม่เกินเพดาน ${ceiling} บาท`,
    /**
     * The position appears nowhere in this ladder, which is a different
     * statement from "below its threshold" — naming a ceiling here would
     * invent one.
     */
    chainExcludedNoTier: (position: string) =>
      `${position} ไม่อยู่ในเส้นทาง — ตารางอำนาจอนุมัติรุ่นที่ใช้อยู่ไม่มีชั้นนี้`,
    chainNeedsAmount: "กรอกวงเงินเพื่อดูเส้นทางอนุมัติ",
    slaTitle: "กำหนดเวลา (SLA)",
    slaHours: (hours: number) => `${hours} ชั่วโมงทำการ`,
    slaNote:
      "นาฬิกาเริ่มเดินเมื่อยื่น หยุดเมื่อถูกตีกลับให้แก้ · เกินกำหนดระบบเร่งงานถึงผู้บังคับบัญชาอัตโนมัติ",
    slaNone: "ประเภทนี้ไม่ได้กำหนด SLA",
    stepReasonFirst: "ตรวจสิทธิ์การยื่นและความสมเหตุสมผล",
    stepReasonOver: (ceiling: string) => `วงเงินเกิน ${ceiling} บาท`,
  },

  requestDetail: {
    cancel: "ยกเลิกคำขอ",
    cancelReason: "เหตุผลการยกเลิก",
    cancelled: "ยกเลิกคำขอแล้ว",
    infoTitle: "ข้อมูลคำขอ",
    requester: "ผู้ยื่น",
    submittedAt: "ยื่นเมื่อ",
    reference: "อ้างอิง",
    attachments: (count: number) => `เอกสารแนบ (${count})`,
    noDownload: "ดาวน์โหลดยังไม่เปิดใช้งาน — รอบนี้เก็บเฉพาะรายการเอกสาร",
    timelineTitle: "ไทม์ไลน์ (บันทึกทุกการเปลี่ยนสถานะ)",
    system: "ระบบ",
    chainTitle: "เส้นทางอนุมัติ",
    chainStep: (n: number) => `ขั้น ${n}`,
    stepPending: "รอพิจารณา",
    stepApproved: "อนุมัติแล้ว",
    stepRejected: "ไม่อนุมัติ",
    stepWaiting: "ยังไม่ถึงคิว",
    voidNote:
      "แก้ไขสาระสำคัญหลังอนุมัติจะทำให้การอนุมัติเป็นโมฆะและต้องเริ่มเส้นทางใหม่",
    chainFrom: (amount: string, version: number) =>
      `เส้นทางคำนวณจากวงเงิน ${amount} บาท · ตารางอำนาจเวอร์ชัน ${version}`,
    masked: "••••••",
    events: {
      "request.submitted": "ยื่นคำขอ",
      "request.resubmitted": "ยื่นใหม่หลังแก้ไข",
      "request.routed": "เข้าคิวผู้อนุมัติ",
      "request.returned": "ตีกลับให้แก้ไข",
      "request.cancelled": "ยกเลิกคำขอ",
      "request.completed": "ปิดงาน",
      "request.held": "พักงานไว้",
      "request.resumed": "กลับมาดำเนินการ",
      "approval.decided": "ผลการอนุมัติ",
      "sla.escalated": "เกินกำหนด — เร่งงานอัตโนมัติ",
    } as Record<string, string>,
  },

  bottleneck: {
    title: "รายงานคอขวด",
    subtitle: "เวลาจริงต่อขั้นอนุมัติ นับเฉพาะขั้นที่ตัดสินแล้ว (REQ-09)",
    empty: "ยังไม่มีข้อมูลมากพอในช่วงที่เลือก",
    columns: {
      type: "ประเภท",
      step: "ขั้น",
      role: "ตำแหน่ง",
      decided: "ตัดสินแล้ว",
      pending: "ค้างอยู่",
      mean: "เฉลี่ย (ชม.)",
      max: "นานสุด (ชม.)",
    },
    pendingNote:
      "ขั้นที่ยังไม่ตัดสินไม่ถูกนำมาเฉลี่ย ",
  },

  requestTypes: {
    title: "ประเภทคำขอ",
    subtitle: "ประเภทคำขอ — ตั้งค่าได้โดยไม่ต้องแก้โปรแกรม",
    listTitle: "ประเภททั้งหมด",
    active: "เปิดใช้",
    inactive: "ยังไม่เปิด",
    edit: (name: string, code: string) => `แก้ไข: ${name} (${code})`,
    name: "ชื่อประเภท",
    receiver: "ทีมผู้รับ",
    sla: "SLA (ชั่วโมงทำการ)",
    fields: "ฟิลด์ฟอร์ม (form schema)",
    docs: "เอกสารบังคับ",
    addDoc: "+ เพิ่มเอกสารบังคับ",
    reasons: "เหตุผลตีกลับมาตรฐาน",
    addReason: "+ เพิ่ม",
    /** REQ-04: the list is the point — free text alone cannot be reported on. */
    reasonsNote:
      "รายการนี้คือสิ่งที่ผู้อนุมัติเลือกตอนตีกลับ — ระบบปฏิเสธเหตุผลนอกรายการ เพื่อให้นับสาเหตุการตีกลับได้",
    addField: "+ เพิ่มฟิลด์",
    fieldName: "ชื่อฟิลด์ (key)",
    fieldTitle: "ป้ายกำกับ",
    fieldType: "ชนิด",
    fieldRequired: "บังคับ",
    fieldSensitive: "ฟิลด์อ่อนไหว",
    save: "บันทึก",
    disable: "ปิดใช้งาน",
    enable: "เปิดใช้งาน",
    saved: "บันทึกแล้ว",
    newType: "+ เพิ่มประเภท",
    newTypeTitle: "เพิ่มประเภทคำขอ",
    code: "รหัสประเภท",
    codeHint: "ตัวพิมพ์ใหญ่ ตัวเลข หรือขีดล่าง · เปลี่ยนภายหลังไม่ได้",
    effectNote:
      "การบันทึกมีผลกับคำขอที่ยื่นใหม่เท่านั้น — คำขอที่เดินอยู่ใช้การตั้งค่า ณ ขณะยื่น · ทุกการแก้ไขลง Audit Log",
    matrixNote: "อ้างตารางอำนาจอนุมัติของบริษัทที่ยื่น",
    selectFirst: "เลือกประเภทจากรายการทางซ้าย",

    entryCode: "รหัส",
    entryLabel: "ชื่อที่แสดง",
    remove: "ลบ",
    noReceiver: "ยังไม่ได้กำหนดทีมผู้รับ",
    businessHours: "นับเฉพาะเวลาทำการ",
    /** §16 A2 list subtitle: `DSC · Sales → Pricing · SLA 24 ชม.ทำการ` */
    listSubtitle: (code: string, receiver: string, sla: string) =>
      `${code} · ${receiver} · ${sla}`,
    slaShort: (hours: number, businessHours: boolean) =>
      businessHours ? `SLA ${hours} ชม.ทำการ` : `SLA ${hours} ชม.`,
    slaUnset: "ยังไม่ได้ตั้ง SLA",

    /** §16 A2 — the approval route block. */
    routeTitle: "เส้นทางอนุมัติ",
    routeStandard: "เส้นทางมาตรฐานตามวงเงิน (หัวหน้าทีม → CFO → CEO)",
    amountField: "ฟิลด์วงเงินที่ใช้คำนวณ",
    amountFieldNote:
      "ฟิลด์วงเงินที่ใช้คำนวณ: เลือกจากฟิลด์ฟอร์มด้านบน · อ้างตารางอำนาจอนุมัติของบริษัทที่ยื่น",
    amountFieldMissing:
      "ยังไม่ได้เลือกฟิลด์วงเงิน — คำขอประเภทนี้จะหาเพดานอนุมัติไม่ได้ตอนยื่น",
  },

  myWork: {
    title: "งานค้างของฉัน",
    newRequest: "ยื่นคำขอใหม่",
    tabMine: "คำขอของฉัน",
    tabApprovals: "รออนุมัติของฉัน",
    search: "ค้นหาเลขที่ / ลูกค้า / ดีล",
    filterStatus: "สถานะ",
    filterType: "ประเภท",
    filterAll: "ทั้งหมด",
    onlyOverdue: "เฉพาะเกินกำหนด",
    columns: {
      requestNo: "เลขที่คำขอ",
      typeRef: "ประเภท · อ้างอิง",
      status: "สถานะ",
      currentStep: "ขั้นปัจจุบัน",
      dueAt: "ครบกำหนด",
    },
    empty: "ยังไม่มีคำขอ",
    emptyApprovals: "ไม่มีรายการรออนุมัติ",
    clockPaused: "นาฬิกาหยุด",
    overdueBy: (text: string) => `เกิน ${text}`,
    dueIn: (text: string) => `เหลือ ${text}`,
    /** A finished request whose clock stopped inside its SLA (`state: met`). */
    onTime: "ทันกำหนด",
    /** REQ-02 issues the number at submit, so a draft has none yet. */
    noNumber: "ยังไม่ออกเลข",
    step: (current: number, total: number) => `ขั้น ${current}/${total}`,
    status: {
      draft: "ร่าง",
      submitted: "ยื่นแล้ว",
      pending_approval: "รออนุมัติ",
      returned: "ตีกลับ",
      approved: "อนุมัติแล้ว",
      rejected: "ไม่อนุมัติ",
      in_progress: "กำลังดำเนินการ",
      completed: "เสร็จสิ้น",
      cancelled: "ยกเลิก",
    } as Record<string, string>,
  },

  approvals: {
    title: "รออนุมัติ",
    subtitle: "รายการที่รอการตัดสินใจของคุณ",
    empty: "ไม่มีรายการรออนุมัติ",
    requester: "ผู้ยื่น",
    amount: "มูลค่า",
    step: "ชั้นที่",
    of: "จาก",
    approver: "ผู้อนุมัติ",
    decidedBy: "ตัดสินโดย",
    onBehalfOf: "แทน",
    approve: "อนุมัติ",
    reject: "ไม่อนุมัติ",
    returnForEdit: "ส่งกลับแก้ไข",
    reason: "เหตุผล",
    reasonRequired: "ต้องระบุเหตุผลเมื่อไม่อนุมัติหรือส่งกลับแก้ไข",
    decided: "บันทึกการตัดสินใจแล้ว",
    margin: "มาร์จิ้นโดยประมาณ",
    marginHidden: "ไม่มีสิทธิ์ดูมาร์จิ้น",
    chain: "สายอนุมัติ",
    viaDelegation: "ผ่านการมอบอำนาจ",
    queueTitle: (count: number) => `คิวรออนุมัติ · ${count} รายการ`,
    batchApprove: "อนุมัติเป็นชุด",
    selected: (count: number) => `เลือก ${count} รายการ`,
    sameDeal: (requestNo: string) => `ดีลเดียวกับ ${requestNo}`,
    submittedBy: "ยื่นโดย",
    detailTitle: "รายละเอียดคำขอ",
    selectFromQueue: "เลือกรายการจากคิวทางซ้าย",
    marginAfter: "margin หลังส่วนลด",
    marginFloor: (floor: string) => `(เกณฑ์ขั้นต่ำ ${floor}%)`,
    previousStep: (step: number) => `ขั้น ${step} หัวหน้าทีมอนุมัติแล้ว`,
    requesterReason: "เหตุผลผู้ยื่น",
    openFull: (count: number) => `เปิดดูคำขอฉบับเต็มและเอกสารแนบ (${count})`,
    snapshotNote:
      "การตัดสินผูกกับข้อมูลเวอร์ชันนี้ — ถ้าผู้ยื่นแก้ข้อมูลระหว่างนี้ ระบบจะให้โหลดใหม่ก่อนตัดสิน",
    commentLabel: "ความเห็นประกอบการตัดสิน (บังคับเมื่อปฏิเสธหรือตีกลับ)",
    commentPlaceholder: "พิมพ์ความเห็น…",
    returnReasonsLabel: "กรณีตีกลับ — เลือกสิ่งที่ต้องแก้ (อย่างน้อย 1 ข้อ)",
    /**
     * The reason list comes from the request type (REQ-04). When it cannot be
     * read, say so instead of offering a guessed list — a guessed list is what
     * made two of these buttons return 400.
     */
    reasonsUnavailable: "อ่านเหตุผลตีกลับของคำขอนี้ไม่ได้ — ตีกลับไม่ได้จนกว่าจะโหลดสำเร็จ",
    reasonsMissing:
      "ประเภทคำขอนี้ยังไม่ได้ตั้งค่าเหตุผลตีกลับมาตรฐาน — ตั้งค่าที่หน้าประเภทคำขอก่อน (REQ-04)",
    delegationBanner: (name: string, window: string) =>
      `คุณกำลังรับมอบอำนาจแทน ${name} ช่วง ${window} — ทุกการอนุมัติจะบันทึกว่า "อนุมัติแทน"`,
    urgencyOverdue: "เกินกำหนด",
    urgencyDueSoon: "ใกล้ครบกำหนด",
  },
  matrix: {
    title: "ตารางอำนาจอนุมัติ",
    subtitle: "เพดานและผู้อนุมัติต่อบริษัทและประเภทงาน (APV-01)",
    empty: "ยังไม่ได้ตั้งค่าตารางอำนาจอนุมัติ",
    version: "เวอร์ชัน",
    effectiveFrom: "มีผลตั้งแต่",
    published: "เผยแพร่แล้ว",
    draft: "ฉบับร่าง",
    inForce: "ใช้งานอยู่",
    upto: "ไม่เกิน",
    noCeiling: "ไม่จำกัด",
    chain: "สายอนุมัติ",
    /**
     * §16 A1's own words.
     *
     * Suggestion: `เผยแพร่` (publish) describes the API more accurately than
     * `สร้าง` (create) — a version is *published*, and the publish is what
     * reaches the audit log. §16 wins here because the mockup is the copy
     * specification; say the word and this becomes `เผยแพร่เวอร์ชันใหม่`.
     */
    publishNew: "สร้างเวอร์ชันใหม่",
    /**
     * §16 splits what used to be one sentence: immutability stays here, while
     * "งานที่เดินอยู่ใช้เวอร์ชัน ณ ขณะยื่น" becomes rule 3 of `alwaysEnforced`.
     */
    immutableNote: "เวอร์ชันที่ประกาศแล้วแก้ทับไม่ได้ — ต้องสร้างเวอร์ชันใหม่",
    placeholderWarning:
      "ตัวเลขเพดานปัจจุบันเป็นค่าตั้งต้นสำหรับพัฒนา ยังไม่ได้รับการยืนยันจากฝ่ายการเงิน (คำถามค้าง A) — ห้ามใช้เป็นตัวเลขจริง",
    saved: "เผยแพร่แล้ว",
    subject: "ประเภทงาน",
    currency: "สกุลเงิน",
    createdBy: "สร้างโดย",
    addTier: "+ เพิ่มระดับ",
    columns: {
      level: "ระดับ",
      band: "ช่วงวงเงิน (THB)",
      chain: "ลำดับชั้นผู้อนุมัติ",
      meaning: "ความหมาย",
    },
    meaningFirst: "ตรวจสิทธิ์การยื่น จบในทีม",
    meaningOver: (level: number, ceiling: string) =>
      `เกินเพดานระดับ ${level} (${ceiling} บาท)`,

    /**
     * §16 A1 — rules the backend enforces whatever this table says.
     *
     * On screen because an administrator would otherwise meet them by
     * surprise: the second especially, since a chain that silently drops a
     * rung looks like a defect rather than the rule it is.
     */
    alwaysEnforcedTitle: "กติกาที่ระบบบังคับเสมอ",
    alwaysEnforced: [
      "ผู้ยื่นเลือกผู้อนุมัติเองไม่ได้ — ระบบคำนวณจากตารางนี้ ณ ขณะยื่น",
      "ผู้อนุมัติเป็นผู้ยื่นเอง → ชั้นนั้นเลื่อนขึ้น/ถูกข้ามอัตโนมัติ",
      "คำขอที่เดินอยู่ใช้เวอร์ชัน ณ ขณะยื่น — เปลี่ยนตารางไม่กระทบงานค้าง",
    ],

    historyTitle: "ประวัติเวอร์ชัน",
    historyNote: "ทุกเวอร์ชันอ่านย้อนหลังได้ · การเผยแพร่ลง Audit Log",
    /** §16: `เวอร์ชัน 3 · ร่าง รอมีผล 1 ก.ย. 2569` */
    historyPending: (on: string) => `ร่าง รอมีผล ${on}`,
    historyEffective: (on: string) => `มีผล ${on}`,
    /** The first version has nothing to compare against. */
    historyInitial: "ชุดตั้งต้น",
    historyCeilingMoved: (level: string, to: string) =>
      `ปรับ ${level} เป็น ${to}`,
    historyTierAdded: (level: string) => `เพิ่มระดับ ${level}`,
    historyTierRemoved: (level: string) => `ตัดระดับ ${level}`,
    historyChainChanged: (level: string) => `ปรับสายอนุมัติ ${level}`,
    historyNoChange: "ไม่เปลี่ยนเพดาน",
  },
  audit: {
    title: "Audit Log",
    subtitle: "บันทึกอย่างเดียว แก้ไขหรือลบไม่ได้ (SUP-04)",
    columns: {
      time: "เวลา",
      actor: "ผู้กระทำ",
      event: "เหตุการณ์",
      resource: "รายการ",
    },
    empty: "ยังไม่มีเหตุการณ์ในช่วงที่เลือก",

    /** §11.7 — only the filters the API actually accepts. */
    filters: {
      actor: "ผู้กระทำ (username)",
      eventType: "ประเภทเหตุการณ์",
      resourceType: "ชนิดรายการ",
      range: "ช่วงเวลา",
      apply: "กรอง",
      clear: "ล้างตัวกรอง",
      anyEvent: "ทุกเหตุการณ์",
      anyResource: "ทุกชนิด",
      actorHint:
        "ค้นด้วย user id — คัดลอกได้จากหน้าผังทีมและสิทธิ์",
    },
    resultCount: (total: number) => `พบ ${total.toLocaleString("th-TH")} รายการ`,
    appendOnly:
      "หน้านี้อ่านอย่างเดียวเพราะ API ไม่มีเส้นทางแก้หรือลบ — log เป็น append-only ตาม SUP-04",
  },

  placeholder: {
    comingSoon: "ยังไม่เปิดใช้งานใน sprint นี้",
    sprintNote: (sprint: string, requirement: string) =>
      `หน้าจอนี้ส่งมอบใน ${sprint} (${requirement}) — เส้นทาง URL และสิทธิ์ถูกกำหนดไว้แล้ว`,
  },

  bi: {
    loadFailed: "โหลดแดชบอร์ดไม่สำเร็จ",
    notConfigured:
      "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Metabase — ผู้ดูแลระบบต้องกำหนด METABASE_SITE_URL และ METABASE_EMBED_SECRET ใน .env ของ core-service",
    notFound: "ไม่พบแดชบอร์ดที่ระบุ",
    settingsTitle: "ตั้งค่า Metabase",
    settingsBody:
      "จัดการ connection, คำถาม (question), และตัวแดชบอร์ดใน Metabase ได้จากหน้าผู้ดูแลของ Metabase — เปิดในแท็บใหม่",
    settingsOpen: "เปิด Metabase",

    // CD-92 v2 — จัดการรายการแดชบอร์ดและทีมที่มองเห็นจากในระบบ
    manageTitle: "ตั้งค่า Dashboard",
    manageSubtitle:
      "กำหนดแดชบอร์ดในเมนูและทีมที่มองเห็นแต่ละแดชบอร์ด — มีผลทันที ไม่ต้อง deploy",
    envFallbackNotice:
      "บริษัทนี้ยังไม่มีแดชบอร์ดที่ตั้งค่าไว้ — เมนูกำลังใช้ค่า fallback จาก .env (ทุกทีมเห็นเหมือนกัน) เพิ่มแดชบอร์ดด้านล่างเพื่อเริ่มจัดการเอง",
    addDashboard: "เพิ่มแดชบอร์ด",
    editDashboard: "แก้ไขแดชบอร์ด",
    columnTitle: "ชื่อแดชบอร์ด",
    columnMetabaseId: "Metabase ID",
    columnAudience: "ทีมที่มองเห็น",
    columnStatus: "สถานะ",
    columnActions: "จัดการ",
    audienceEveryone: "ทั้งบริษัท",
    statusActive: "ใช้งาน",
    statusInactive: "ปิดใช้งาน",
    actionEdit: "แก้ไข",
    actionDeactivate: "ปิดใช้งาน",
    actionReactivate: "เปิดใช้งาน",
    confirmDeactivate: "ปิดใช้งานแดชบอร์ดนี้?",
    confirmDeactivateBody:
      "รายการจะหายจากเมนูของทุกทีม แต่ข้อมูลยังอยู่และเปิดใช้งานใหม่ได้ภายหลัง",
    formTitle: "ชื่อแดชบอร์ด",
    formMetabaseId: "รหัสแดชบอร์ดใน Metabase",
    formMetabaseIdHelp: "ตัวเลขใน URL ของแดชบอร์ด เช่น /dashboard/12",
    formAudience: "ทีมที่มองเห็น",
    formAudienceHelp:
      "ไม่เลือก = ทุกทีมในบริษัทเห็น • เลือกหน่วยงานระดับฝ่าย/บริษัท = ทีมย่อยทั้งหมดใต้หน่วยงานนั้นเห็นด้วย",
    formSortOrder: "ลำดับในเมนู",
    saved: "บันทึกแล้ว",
    deactivated: "ปิดใช้งานแดชบอร์ดแล้ว",
  },

  common: {
    loadError: "โหลดข้อมูลไม่สำเร็จ",
    retry: "ลองใหม่",
    loading: "กำลังโหลด…",
  },
} as const;

/** Maps a callback `?error=` code to Thai copy, with a safe fallback. */
export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;

  const errors = messages.login.errors as Record<string, string>;
  return errors[code] ?? messages.login.errors.default;
}
