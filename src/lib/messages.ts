import type { FieldKind } from "@/lib/api/types";

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
    /**
     * No longer rendered anywhere: logout now ends at Keycloak's own login
     * form, with the SSO session already killed, so there is no page of ours
     * left to say this on. Kept for `app/login/page.tsx.bak`.
     */
    signedOut: "ออกจากระบบเรียบร้อยแล้ว",
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
      session_expired: "เซสชันหมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบอีกครั้ง",
      default: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    },

    /** `/login/reconnect` — the only screen shown instead of Keycloak's. */
    reconnect: {
      title: "เชื่อมต่อระบบยืนยันตัวตนไม่ได้",
      subtitle:
        "ยังไปต่อที่หน้าเข้าสู่ระบบไม่ได้ในตอนนี้ ระบบไม่ได้พาคุณวนกลับไปซ้ำ เพราะจะไม่สำเร็จจนกว่าการเชื่อมต่อจะกลับมา",
      retryButton: "ลองเชื่อมต่ออีกครั้ง",
      hint: "มักเกิดจากระบบหลังบ้านหรือ Keycloak กำลังปิดปรับปรุงหรือเครือข่ายภายในขัดข้อง หากกดลองใหม่แล้วยังไม่ได้ ให้แจ้งผู้ดูแลระบบ",
      contactPrefix:
        "ยังเชื่อมต่อไม่ได้หลังลองใหม่หลายครั้ง แจ้งผู้ดูแลระบบที่",
    },
  },

  nav: {
    /** H2.1 — the group heading above the request screens. */
    requestGroup: "Request",
    myWork: "งานค้างของฉัน",
    obligations: "ข้อผูกพันของฉัน",
    newRequest: "ยื่นคำขอใหม่",
    allWork: "งานทั้งหมด",
    bottleneckReport: "รายงานคอขวด",
    slaReport: "รายงานการทำตามกำหนด (SLA)",
    decisionLog: "ประวัติการใช้อำนาจอนุมัติ",
    crmGroup: "ลูกค้า (CRM)",
    crmDashboard: "ภาพรวม CRM",
    customers: "ทะเบียนลูกค้า",
    leads: "Lead",
    opportunities: "โอกาสการขาย",
    quotations: "ใบเสนอราคา",
    saleOrders: "ใบสั่งขาย",
    salesReport: "รายงานยอดขาย",
    salesTargets: "เป้าและพยากรณ์",
    campaigns: "แคมเปญ",
    targetAccounts: "บริษัทเป้าหมาย",
    keeper: "Portfolio ลูกค้าเดิม",
    visitLog: "บันทึกการเข้าพบ",
    handovers: "งานส่งมอบ",
    adminGroup: "ผู้ดูแลระบบ",
    legalGroup: "ฝ่ายกฎหมาย",
    contracts: "คลังสัญญา",
    contractTemplates: "แม่แบบสัญญา",
    esignLayouts: "แม่แบบช่องลงนาม",
    esignMine: "เอกสารรอลงนาม",
    esignAuthorities: "ทะเบียนผู้มีอำนาจลงนาม",
    adminCrm: "ตั้งค่า CRM",
    adminApiKeys: "กุญแจ API",
    adminErpSync: "คิวส่ง SAP",
    adminRunNumbers: "เลขรันเอกสาร",
    adminRequestTypes: "ประเภทคำขอ",
    adminSla: "เวลาทำการและวันหยุด",
    adminOrg: "ผังทีมและสิทธิ์",
    adminUsers: "ผู้ใช้",
    adminAudit: "Audit Log",
    adminNotificationLog: "บันทึกการแจ้งเตือน",
    adminNotificationTemplates: "ข้อความแจ้งเตือน",
    adminNotificationRules: "กติกาแจ้งเตือน",
    adminIntakeChannels: "ช่องทางรับคำขอจากลูกค้า",
    biGroup: "แดชบอร์ดผู้บริหาร",
    adminBi: "ตั้งค่า Dashboard",
    openMenu: "เปิดเมนู",
    logout: "ออกจากระบบ",
    company: "บริษัท",
    switchFailed: "สลับบริษัทไม่สำเร็จ",
  },

  chat: {
    title: "ผู้ช่วย AI",
    toggle: "เปิด/ปิดผู้ช่วย AI",
    close: "ปิด",
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
    unassignedHint: "ล็อกอินครั้งแรกแล้วแต่ยังยื่นคำขอไม่ได้จนกว่าจะมีหัวหน้า",
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
    editTeam: "แก้ไขทีม",
    searchTeam: "ค้นหาหน่วยงาน ชื่อ รหัส หรือหัวหน้า",
    searchNoMatch: "ไม่พบหน่วยงานที่ตรงกับคำค้น",
    deleteTeam: "ลบหน่วยงาน",
    deleteConfirm: (name: string) => `ลบหน่วยงาน ${name}?`,
    deleteConfirmBody:
      "ลบแล้วเอากลับไม่ได้ — ถ้าต้องการเก็บประวัติไว้ ให้ปิดใช้งานแทน",
    addMember: "เพิ่มสมาชิก",
    addMemberHint:
      "เลือกได้จากคนทั้งบริษัท คนที่ถูกเลือกจะย้ายมาสังกัดหน่วยงานนี้",
    selectUser: "ค้นหาชื่อหรือชื่อผู้ใช้",
    editRoles: "แก้ role",
    editRolesTitle: (name: string) => `role ของ ${name}`,
    editRolesHint:
      "role ที่มาจาก Keycloak ถอนที่นี่ไม่ได้ — ต้องแก้ที่ Keycloak · ที่ผูกมือไว้ถอนได้",
    fromKeycloak: "จาก Keycloak",
    manualGrant: "ผูกมือ",
    leadFromCompany:
      "เลือกหัวหน้าได้จากคนทั้งบริษัท ไม่จำเป็นต้องเป็นสมาชิกหน่วยงานนี้",
    unitKind: "ประเภทหน่วยงาน",
    /**
     * `OrgUnitKind`. The chart order is บริษัท → ฝ่าย → แผนก → ทีม → ตำแหน่ง and
     * lives in `@/lib/org-levels`, not in this object nor in the enum's own
     * declaration order — both put ทีม last for historical reasons.
     */
    unitKinds: {
      COMPANY: "บริษัท",
      DIVISION: "ฝ่าย",
      DEPARTMENT: "แผนก",
      POSITION: "ตำแหน่ง",
      TEAM: "ทีม",
    },
    moveMember: "ย้ายทีม",
    targetUnit: "ทีมปลายทาง",
    /**
     * The supervisor a move writes. Defaults to the destination unit's lead,
     * because that is what approval step 1 and team scope read.
     */
    newSupervisor: "หัวหน้าใหม่",
    supervisorFromLead: "ค่าตั้งต้นคือหัวหน้าของทีมปลายทาง",
    removeFromTeam: "ถอดออกจากทีม",
    removeConfirm: (name: string) => `ถอด ${name} ออกจากทีม?`,
    removeConfirmBody:
      "คนนี้จะกลับไปอยู่คิว “รอจัดสังกัด” และยื่นคำขอที่ต้องอนุมัติไม่ได้จนกว่าจะมีสังกัดใหม่",
    confirmOk: "ยืนยัน",
    confirmCancel: "ยกเลิก",
    deactivateTeam: "ปิดใช้งานทีม",
    activateTeam: "เปิดใช้งานทีม",
    inactive: "ปิดใช้งาน",
    deactivateConfirm: (name: string) => `ปิดใช้งาน ${name}?`,
    deactivateBlockedMembers:
      "ยังมีสมาชิกอยู่ในหน่วยงานนี้ — ย้ายคนออกให้หมดก่อนจึงจะปิดใช้งานได้",
    deactivateBlockedChildren:
      "ยังมีหน่วยงานลูกที่เปิดใช้งานอยู่ — ปิดใช้งานหน่วยงานลูกก่อน",
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
    extraRoles: "role เพิ่มเติมในระบบ",
    addRole: "ผูก role เพิ่ม",

    /** §16 — A3 and A4 are tabs of one screen. */
    tabs: {
      tree: "ผังทีม",
      roles: "Role และ Permission",
      scope: "การมองเห็นข้อมูล",
      keycloak: "Keycloak Mapping",
    },
  },

  /** Screen §16 A4 — Role และ Permission. */
  /** The A3 "การมองเห็นข้อมูล" pane — an explanation, not a setting. */
  /** The editable half of the pane — which group sees which group's work. */
  groupScope: {
    title: "ขอบเขตข้อมูล",
    intro:
      "เลือกกลุ่มหรือบุคคลจากผังทางซ้าย แล้วระบุว่าเห็นงานของกลุ่มหรือบุคคลใดได้บ้าง นอกเหนือจากงานที่ตนเกี่ยวข้องและงานของกลุ่มที่ตนเป็นหัวหน้า",
    viewerPanel: "ผู้รับสิทธิ์",
    targetPanel: "เห็นงานของ",
    searchViewer: "ค้นหากลุ่มหรือบุคคล",
    pickViewer: "เลือกกลุ่มหรือบุคคลจากผังทางซ้าย",
    noMatch: "ไม่พบกลุ่มหรือบุคคลที่ค้นหา",
    addTitle: "เพิ่มสิทธิ์",
    kindUnit: "กลุ่ม",
    kindUser: "บุคคล",
    level: "ระดับ",
    noUnitsAtLevel: "ยังไม่มีกลุ่มที่ระดับนี้",
    pickTarget: "เลือกกลุ่มปลายทาง",
    pickTargetUser: "เลือกบุคคลปลายทาง",
    columnTarget: "ปลายทาง",
    columnDescendants: "รวมกลุ่มย่อย",
    columnAct: "ทำอะไรได้บ้าง",
    /**
     * The closed set the backend's `SCOPE_PERMISSIONS` declares, in the order
     * an administrator thinks about them: work on it, hand it back, drop it,
     * decide it.
     */
    permissions: {
      "request.complete": "รับงาน · มอบหมาย · ปิดงาน",
      "request.hold": "พักงาน · ทำต่อ",
      "request.return": "ตีกลับ",
      "request.cancel.any": "ยกเลิก",
      "approval.decide": "อนุมัติ",
    },
    permissionsPlaceholder: "อ่านอย่างเดียว",
    columnRemove: "",
    remove: "ลบ",
    /* A person has no subtree, so the checkbox has nothing to reach. */
    descendantsNotForUser:
      "ใช้ได้เฉพาะปลายทางที่เป็นกลุ่ม — บุคคลไม่มีกลุ่มย่อย",
    empty: "ยังไม่ได้ให้สิทธิ์เห็นงานของกลุ่มหรือบุคคลใด",
    save: "บันทึก",
    saved: "บันทึกแล้ว",
    grantCount: "สิทธิ์",
    /* Said on the screen because it is not obvious and it is asked every time. */
    inheritNote:
      "สิทธิ์ที่ตั้งให้กลุ่มถ่ายทอดลงล่าง — ตั้งที่ระดับบริษัทจะมีผลกับทุกคนในบริษัท ตั้งที่ฝ่ายจะมีผลกับแผนกใต้ฝ่ายนั้น · สิทธิ์ที่ตั้งให้บุคคลมีผลกับคนนั้นคนเดียว",
    actWarning:
      "สิทธิ์ที่เลือกในคอลัมน์ “ทำอะไรได้บ้าง” ทำให้ผู้รับสิทธิ์ลงมือกับงานของปลายทางได้จริง ไม่ใช่แค่เปิดอ่าน · ว่างไว้ = อ่านอย่างเดียว",
    /*
      The intersection, said on the screen because an administrator ticking a
      box that then does nothing has no way to tell why.
    */
    intersectionNote:
      "สิทธิ์ที่ติ๊กไว้จะมีผลก็ต่อเมื่อ role ของผู้รับสิทธิ์มีสิทธิ์นั้นอยู่แล้ว — ขอบเขตจำกัดให้แคบลงได้ แต่ให้สิทธิ์ใหม่ไม่ได้",
    approveNote:
      "ติ๊ก “อนุมัติ” แล้วผู้รับสิทธิ์จะอนุมัติชั้นที่ค้างอยู่ของงานปลายทางได้ เพิ่มจากผู้อนุมัติที่ตารางอำนาจกำหนดไว้ — ไม่ได้แทนที่ใคร",
    /*
      core-service caches the principal for the access token's lifetime, so a
      grant saved here does not reach a session already open. Said plainly
      rather than left for an admin to discover by testing.
    */
    reloginNote:
      "การเปลี่ยนแปลงจะมีผลกับผู้ใช้หลังเข้าสู่ระบบใหม่ (สิทธิ์ถูก cache ไว้ตามอายุ token)",
  },

  scopeInfo: {
    sourceTitle: "กฎที่แก้ไม่ได้จากหน้านี้",
    sourceBody:
      "ด้านบนตั้งได้ว่า Group ไหนเห็นงานของ Group ไหน · ส่วนกฎด้านล่างอยู่ในโค้ด (access-rules.ts) ปรับจากหน้าจอไม่ได้ · ระดับ scope แบบเดิม (own/team/department/company/all) ถูกยกเลิกเมื่อ 31 ส.ค. 2569 ตาราง scope_rules ยังอยู่แต่ไม่มีผลกับการอนุญาตใดๆ แล้ว",
    everyoneTitle: "กฎที่ใช้กับทุกคน",
    everyoneRules: [
      "เห็นได้เฉพาะข้อมูลของบริษัทที่กำลังเปิดอยู่ ไม่มีข้อยกเว้น",
      "เห็นคำขอที่ตนเกี่ยวข้อง 4 ทาง — ผู้ยื่น · ผู้รับเรื่อง · ผู้ดำเนินการ · ถูกเสนอชื่อเป็นผู้อนุมัติ",
      "หัวหน้า Group เห็นคำขอของ Group ตนเอง รวมทุก Group ที่อยู่ใต้ลงไปทุกชั้น",
      "ผู้รับมอบอำนาจอนุมัติ (delegation) เห็นและอนุมัติงานของผู้มอบได้ตลอดช่วงที่ได้รับมอบ",
      "Group ที่ได้รับสิทธิ์ตามตารางด้านบน เห็นงานของ Group ปลายทางเพิ่มจากกฎเหล่านี้",
      "role ที่ตั้ง “ระดับการมองเห็นข้อมูล” ไว้ เห็นงานทั้งหมดใต้หน่วยงานของผู้ถือเองที่ระดับนั้น — เห็นอย่างเดียว ไม่ได้สิทธิ์ดำเนินการ",
      "สิทธิ์ในการ *กระทำ* กับคำขอมาจากความเกี่ยวข้องและผังองค์กร ไม่ได้มาจาก role",
    ],
    rolesTitle: "role ที่มีสิทธิ์ขยายการมองเห็น",
    columnRole: "role",
    columnWidening: "เห็นได้กว้างกว่าปกติเพราะ",
    columnLevel: "ระดับการมองเห็น",
    /** Read from `Role.visibilityLevel`; the branch differs per holder. */
    levelOf: (label: string) => `ทั้ง${label}ของผู้ถือ`,
    noLevel: "—",
    columnHolders: "ผู้ถือ",
    involvedOnly: "เฉพาะที่ตนเกี่ยวข้องและที่ตนเป็นหัวหน้า",
    readAll: "เห็นทุกคำขอในบริษัท",
    sensitive: "เห็นฟิลด์ที่ปิดบัง",
    reports: "เห็นรายงาน",
    audit: "เห็น Audit Log",
  },

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

    /**
     * `Role.visibilityLevel` — a level of the chart, resolved against whoever
     * holds the role. The hint says "ของตัวเอง" because that is the whole
     * difference from the levels withdrawn on 31 ส.ค. 2569: it is not a rank
     * everybody shares, it is each holder's own branch.
     */
    visibilityLevel: "ระดับการมองเห็นข้อมูล",
    visibilityLevelNone: "ไม่กำหนด — เห็นเฉพาะงานที่เกี่ยวข้อง",
    visibilityLevelHint:
      "เห็นงานทั้งหมดใต้หน่วยงานของ *ตัวผู้ถือ role เอง* ที่ระดับนี้ เช่น เลือก “แผนก” คนใน RND เห็นทั้ง RND คนใน Sale เห็นทั้ง Sale · เห็นอย่างเดียว ไม่ได้สิทธิ์ดำเนินการ",
    visibilityLevelUnreachable:
      "ผู้ถือ role ที่ไม่มีหน่วยงานระดับนี้อยู่เหนือขึ้นไป จะไม่ได้เห็นอะไรเพิ่ม",
    visibilityLevelOf: (label: string) => `เห็นทั้ง${label}ของตน`,

    membershipNote: (keycloakRole: string | null) =>
      keycloakRole
        ? `สมาชิก role จัดการที่ Keycloak (map: ${keycloakRole}) — หน้านี้กำหนดเฉพาะว่า role ทำอะไรได้ · แก้แล้วมีผลทันทีกับ API call ถัดไป`
        : "สมาชิก role จัดการที่ Keycloak — หน้านี้กำหนดเฉพาะว่า role ทำอะไรได้ · แก้แล้วมีผลทันทีกับ API call ถัดไป",

    /** §16 A4 groups the catalog into columns of checkboxes, by module. */
    groups: {
      request: "REQUEST",
      approvalReport: "APPROVAL · REPORT · NOTIFICATION",
      crm: "CRM",
      presales: "PRE-SALES",
      adminAudit: "ADMIN · AUDIT",
      integration: "INTEGRATION",
      other: "อื่น ๆ",
    },

    /**
     * AUTH-06 — ตอนนี้เป็นการปิดกั้นจริง ไม่ใช่คำอธิบายแล้ว: หน้านี้ไม่แสดงสิทธิ์ของ
     * บัญชีบริการอีก และ backend ก็ปฏิเสธ role ที่ถือมัน.
     */
    serviceScopeHint:
      "สิทธิ์ของบัญชีบริการ (integration.*) ไม่อยู่ในหน้านี้ — ออกให้กุญแจที่หน้า “กุญแจ API”",

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

      "crm.customer.read": "ดูลูกค้า",
      "crm.customer.read.all": "ดูลูกค้าทั้งบริษัท",
      "crm.customer.manage": "สร้าง/แก้ทะเบียนลูกค้า",
      "crm.customer.sensitive.read": "เห็นเลขผู้เสียภาษี",
      "crm.customer.dedup.override": "ยืนยันสร้างทั้งที่ชื่อซ้ำ",
      "crm.customer.financial.read": "เห็นยอดค้างชำระ/AR",
      "crm.sales.read": "ดู Lead และโอกาสการขาย",
      "crm.sales.read.all": "ดูงานขายทั้งบริษัท",
      "crm.sales.manage": "สร้าง/แก้/ปิดดีล",

      "presales.solution.read": "ดู Solution ทุกดีล",
      "presales.solution.manage": "ออกแบบ Solution",

      "admin.role.manage": "จัดการ role และสิทธิ์",
      "admin.org.manage": "จัดการผังองค์กร",
      "admin.request-type.manage": "จัดการประเภทคำขอ",
      "admin.approval-matrix.manage": "จัดการตารางอำนาจอนุมัติ",
      "admin.sla.manage": "จัดการ SLA และวันหยุด",
      "admin.bi.manage": "ตั้งค่าแดชบอร์ด",
      "admin.identity.manage": "จัดการผู้ใช้ใน Keycloak",
      "admin.crm.manage": "ตั้งค่า CRM",
      "admin.customer.merge": "รวมลูกค้าซ้ำ",
      "legal.contract.read": "ค้นดูคลังสัญญา",
      "legal.contract.manage": "บันทึกสัญญา แนบไฟล์ และกำหนดสัญญาลับพิเศษ",
      "esign.manage": "ส่งเอกสารลงนามอิเล็กทรอนิกส์ และตั้งแม่แบบช่องลงนาม",
      "admin.integration.manage": "ออก/เพิกถอนกุญแจ API",

      "integration.request.create": "ยื่นคำขอแทนระบบภายนอก",
      "integration.request.intake": "รับคำขอจากลูกค้า (แบบฟอร์มสาธารณะ/LINE/AI CARE)",
      "integration.approval.create": "สร้างเคสอนุมัติจากระบบภายนอก",
      "integration.crm.lead.read": "อ่าน Lead (workflow engine)",
      "integration.crm.lead.stage": "เลื่อนขั้น Lead (workflow engine)",
      "integration.crm.lead.create": "รับ Lead จากช่องทางภายนอก",
      "integration.crm.customer.read": "อ่านลูกค้าผ่าน API ภายนอก",
      "integration.crm.customer.manage": "เขียนลูกค้าผ่าน API ภายนอก",
      "integration.crm.sales.read": "อ่านงานขายผ่าน API ภายนอก",
      "integration.crm.sales.manage": "เขียนงานขายผ่าน API ภายนอก",
      "integration.crm.admin.manage": "แก้ตั้งค่า CRM ผ่าน API ภายนอก",
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
    codeHint:
      "ตัวพิมพ์เล็กและขีดล่าง เช่น sales_support — เปลี่ยนภายหลังไม่ได้",
    name: "ชื่อที่แสดง",
    description: "คำอธิบาย",
  },

  /** SCOPE-01 — no mockup; designed to sit beside A4. */
  scopeRules: {
    holders: (count: number) => `${count} คน`,
    cancel: "ยกเลิก",
    confirmTitle: "ยืนยันการบันทึก scope",
    /**
     * SCOPE-01 keys a rule on `(role, resource)`, so a save moves everyone
     * holding that role at once. The count is shown before the click because
     * this is the change people expected to be per person and it is not.
     */
    confirmBody: (roles: number, people: number) =>
      `กติกาที่แก้ครอบคลุม ${roles} role · มีผลกับผู้ใช้ ${people} คนทันทีที่บันทึก`,
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
    /* ROLE-03 — the realm owns the names; this system owns the permissions. */
    syncNames: "ดึงชื่อจาก Keycloak",
    syncDone: "ซิงก์ชื่อเรียบร้อย",
    syncSummary: (renamed: number, linked: number, checked: number) =>
      `ตรวจ ${checked} รายการ · เปลี่ยนชื่อตาม Keycloak ${renamed} · ผูกรหัสครั้งแรก ${linked}`,
    syncMissing: (names: string) =>
      `ไม่พบใน Keycloak แล้ว: ${names} — ยังไม่ลบให้ ตรวจสอบก่อนว่าตั้งใจถอดออกจริง`,
    title: "Keycloak Mapping",
    disabledNote:
      "ปิดใช้งาน — Keycloak ใช้สำหรับ login เท่านั้น การ map ในหน้านี้ไม่มีผลกับสิทธิ์ สิทธิ์ทั้งหมดต้องผูกมือ",
    subtitle:
      "จับคู่ role ใน Keycloak กับ role ในระบบ ต่อบริษัท — ระบบประเมินใหม่ทุกครั้งที่ล็อกอินหรือ refresh token (ROLE-03)",
    columns: {
      keycloakRole: "Role ใน Keycloak (client request-form)",
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
    subtitle:
      "รายชื่อผู้ใช้จากฐานข้อมูลระบบนี้ (อ่านอย่างเดียว) · แสดงเฉพาะคนที่มีโปรไฟล์แล้ว บัญชีใน Keycloak ที่ยังไม่เคยเข้าระบบจะไม่อยู่ในรายการนี้ · role กับหน่วยงานที่เป็นหัวหน้าเป็นของบริษัทที่เลือกอยู่",
    searchPlaceholder: "ค้นหาชื่อผู้ใช้ ชื่อ อีเมล รหัสพนักงาน หรือเบอร์ภายใน",
    search: "ค้นหา",
    empty: "ไม่พบผู้ใช้",
    columns: {
      username: "ชื่อผู้ใช้",
      name: "ชื่อ-นามสกุล",
      employeeId: "รหัสพนักงาน",
      position: "ตำแหน่ง",
      team: "สังกัด",
      leads: "เป็นหัวหน้า",
      roles: "role",
      email: "อีเมล",
      extension: "เบอร์ภายใน",
      phone: "เบอร์ติดต่อ",
      startWork: "วันเริ่มงาน",
      status: "สถานะ",
    },
    active: "ใช้งาน",
    inactive: "ระงับการใช้งาน",
    page: (from: number, to: number, total: number) =>
      `${from}–${to} จาก ${total} คน`,
    prev: "ก่อนหน้า",
    next: "ถัดไป",
  },

  /** CD-67 — ระดับความรุนแรงของเคส และนาฬิกาเวลาตอบกลับ. */
  severity: {
    label: "ระดับความรุนแรง",
    levels: {
      critical: "วิกฤต",
      high: "สูง",
      medium: "ปานกลาง",
      low: "ต่ำ",
    } as Record<string, string>,
    placeholder: "เลือกระดับความรุนแรง",
    required: "ประเภทคำขอนี้เป็นเคส — เลือกระดับความรุนแรงก่อนยื่น",
    hint: "เวลาตอบกลับและเวลาแก้ไขนับตามระดับที่เลือก (ชั่วโมงตามเวลาที่ประเภทนี้นับ)",
    option: (level: string, response: number, resolution: number) =>
      `${level} — ตอบกลับใน ${response} ชม. · แก้ไขใน ${resolution} ชม.`,
    responseDue: (when: string) => `ต้องตอบกลับภายใน ${when}`,
    respondedOnTime: (when: string) => `ตอบกลับแล้ว ${when}`,
    respondedLate: (when: string) => `ตอบกลับช้า — ${when}`,
    responseOverdue: "เลยเวลาตอบกลับ",
    /* A2 — the per-type editor. */
    caseToggle:
      "ประเภทนี้เป็นเคส/ข้อร้องเรียน — ผู้ยื่นต้องเลือกระดับความรุนแรง",
    caseHint:
      "เวลาตอบกลับ = ผู้รับเรื่องต้องรับเรื่อง มอบหมาย หรือตอบความเห็นแรกภายในเวลานี้ · เวลาแก้ไขแทนที่ SLA ด้านบนสำหรับเคส · ใช้กับบริษัทที่กำลังแก้อยู่",
    columnLevel: "ระดับ",
    columnResponse: "ตอบกลับ (ชม.)",
    columnResolution: "แก้ไข (ชม.)",
  },

  requestForm: {
    receiver: "ผู้รับเรื่อง",
    receiverTeam: "ทีมผู้รับ",
    receiverTeamHint: "ค่าตั้งต้นมาจากประเภทคำขอ — เปลี่ยนได้",
    receiverTeamPlaceholder: "เลือกทีมผู้รับ",
    receiverTeamEmpty:
      "ทีมนี้ยังไม่มีสมาชิก — เลือกทีมอื่นหรือล้างช่องทีมผู้รับ",
    receiverPlaceholder: "เลือกผู้รับเรื่อง — คำขอจะไปอยู่ในคิวของคนนี้",
    receiverFixedHint: "ประเภทคำขอนี้กำหนดผู้รับเรื่องไว้แล้ว",
    receiverRequired: "ต้องระบุผู้รับเรื่องก่อนยื่นคำขอ",
    title: "ยื่นคำขอ",
    /** §16 หน้าที่ 3 — the page heading and the left-menu entry agree. */
    pageTitle: "ยื่นคำขอใหม่",
    draftBanner: "สถานะ: ร่าง — เลขคำขอจะออกเมื่อกดยื่น",
    type: "ประเภทคำขอ",
    typeRequired: "เลือกประเภทคำขอก่อน",
    /* CD-80 — a field the system computes (e.g. margin after discount). */
    computedPending: "กรอกมูลค่า ส่วนลด และต้นทุน เพื่อคำนวณ",
    computedHint: "ระบบคำนวณให้ — คำนวณซ้ำอีกครั้งเมื่อบันทึก",
    refLabel: "อ้างอิงโอกาสการขาย",
    refRequired: "กรอกเลขอ้างอิงโอกาสการขายก่อนยื่น",
    requiredDocsTitle: "เอกสารบังคับตามประเภทคำขอ",
    autosaveAt: (time: string) => `บันทึกร่างอัตโนมัติล่าสุด ${time} น.`,
    /* A `type: "array"` field — the grid a requester adds rows to. */
    /* A read that failed is a different thing from a list that is empty. */
    loadPartial: "โหลดข้อมูลบางส่วนไม่สำเร็จ",
    peopleUnavailable:
      "อ่านรายชื่อผู้ใช้ไม่ได้ — อาจไม่มีสิทธิ์ ติดต่อผู้ดูแลระบบ",
    unitsUnavailable:
      "อ่านผังทีมไม่ได้ — อาจไม่มีสิทธิ์ ช่องทีมผู้รับจึงเลือกไม่ได้",
    tableEmpty: "ยังไม่มีแถว",
    tableAddRow: "+ เพิ่มแถว",
    tableRowCap: (used: number, cap: number) => `${used}/${cap} แถว`,
    sensitiveBadge: "เห็นเฉพาะสายอนุมัติ",
    documents: "เอกสารแนบ",
    dropzone: "ลากไฟล์มาวาง หรือกดเพื่อแนบเอกสารเพิ่มเติม",
    remove: "ลบ",
    missingDoc: "ยังขาด",
    docRequired: "บังคับ",
    docOptional: "ไม่บังคับ",
    attachFile: "แนบไฟล์",
    uploading: "กำลังอัปโหลด…",
    saveDraft: "บันทึกร่าง",
    submit: "ยื่นคำขอ",
    submitting: "กำลังยื่น…",
    saved: "บันทึกร่างแล้ว",
    submitted: "ยื่นคำขอแล้ว",
    chainTitle: "เส้นทางอนุมัติที่จะใช้",
    chainComputed: "คำนวณอัตโนมัติจากตารางอำนาจอนุมัติของประเภทคำขอนี้",
    chainNoPick: "ผู้ยื่นเลือกผู้อนุมัติเองไม่ได้",
    chainUnresolved: "ยังไม่มีผู้รับผิดชอบขั้นนี้ในผังทีม",
    /** A level naming several people: any one of them is enough. */
    chainAnyOf: (count: number) => `อนุมัติได้ ${count} คน ใครอนุมัติก็ผ่าน`,
    /**
     * Only for a type with **neither** ladder.
     *
     * It used to print whenever the one subject this screen asked about came
     * back missing — which said "no approval at all" about a type whose
     * before-work ladder then routed the submit to somebody. Each stage now
     * says its own absence: `flowNoBeforeWork` / `flowNoAfterWork`.
     */
    chainNoMatrix: "ประเภทคำขอนี้ไม่มีชั้นอนุมัติ — ทำเสร็จแล้วจบเลย",
    /* The three states that used to be collapsed into chainNoMatrix. Saying
       "ไม่มีชั้นอนุมัติ" before the server has been asked is a claim, not a
       status — and it is the claim that hid this panel never loading at all. */
    chainPickType: "เลือกประเภทคำขอก่อน ระบบจะคำนวณเส้นทางอนุมัติให้",
    chainLoading: "กำลังคำนวณเส้นทางอนุมัติ…",
    chainLoadError: "ดูเส้นทางอนุมัติไม่ได้",
    /*
      The four bands of the route, in the order the work travels. The two
      approval stages are the same two an admin configures on the request
      type's อำนาจอนุมัติ tabs — same words, so the screen that sets them and
      the screen that shows them read as one thing.
    */
    flowRequester: "ผู้ยื่นคำขอ",
    flowBeforeWork: "อำนาจอนุมัติ (ผู้ยื่น) — ก่อนส่งให้ผู้รับ",
    flowNoBeforeWork: "ไม่ต้องอนุมัติก่อนส่ง — ยื่นแล้วถึงผู้รับทันที",
    flowReceiver: "ผู้รับเรื่องและผู้ทำงาน",
    flowReceiverUnset: "ยังไม่ได้เลือกผู้รับ",
    flowAfterWork: "อำนาจอนุมัติ (ผู้รับ) — ตรวจผลงาน",
    flowNoAfterWork: "ไม่มีการตรวจผลงาน — ทำเสร็จแล้วจบเลย",
    flowAfterWorkHint:
      "คำนวณจากผังของผู้รับที่เลือกไว้ · ถ้างานถูกส่งต่อ ระบบจะใช้ผังของคนที่ทำจริงตอนปิดงาน",
    slaTitle: "กำหนดเวลา (SLA)",
    slaHours: (hours: number) => `${hours} ชั่วโมงทำการ`,
    slaNote:
      "นาฬิกาเริ่มเดินเมื่อยื่น หยุดเมื่อถูกตีกลับให้แก้ · เกินกำหนดระบบเร่งงานถึงผู้บังคับบัญชาอัตโนมัติ",
    slaNone: "ประเภทนี้ไม่ได้กำหนด SLA",
    stepReasonFirst: "ตรวจสิทธิ์การยื่นและความสมเหตุสมผล",
  },

  requestDetail: {
    receive: "รับเรื่อง",
    /* H2.2 ข้อ 3 — the second form, filled in by whoever did the work. */
    receiverFormTitle: "ฟอร์มผู้รับคำขอ",
    receiverFormHint:
      "กรอกผลการดำเนินการก่อนกดทำเสร็จ — ระบบใช้แบบฟอร์มตามที่ตั้งไว้ ณ ตอนยื่นคำขอ",
    /* H2.2 ข้อ 6 — the moves that go backwards, each with its reason. */
    reject: "ไม่อนุมัติ",
    approve: "อนุมัติ",
    returnToRequester: "ส่งกลับให้แก้",
    sendBackToRequester: "ส่งกลับให้ผู้ขอแก้",
    sendBackToTeam: "ส่งกลับให้ทีมแก้งาน",
    hold: "พักไว้",
    resume: "ทำต่อ",
    reasonLabel: "เหตุผล",
    reasonRequired: "ต้องระบุเหตุผล",
    noteLabel: "คำอธิบาย",
    noteOptional: "คำอธิบาย (ไม่บังคับ)",
    approveNoteRequired: "ต้องระบุคำอธิบายประกอบการอนุมัติ",
    /* REQ-04 — the standard bounce cause, which is what makes returns countable. */
    returnReasonLabel: "เหตุผลการตีกลับ",
    returnReasonPlaceholder: "เลือกเหตุผล",
    returnReasonMissing:
      "ประเภทคำขอนี้ยังไม่ได้ตั้งเหตุผลตีกลับ — ให้ผู้ดูแลตั้งที่หน้าประเภทคำขอก่อน",
    /* H2.2 — comments, in their own card above the timeline. */
    commentsTitle: (count: number) => `ความเห็น (${count})`,
    commentPlaceholder: "เขียนความเห็น…",
    commentSend: "ส่ง",
    commentEmpty: "ยังไม่มีความเห็น",
    commentReadOnly: "คุณไม่ได้เกี่ยวข้องกับคำขอนี้ จึงแสดงความเห็นไม่ได้",
    /* H2.2 ข้อ 4 — the request chain. */
    treeTitle: "สายคำขอ",
    /* Written when the panel was first planned; it exists now. */
    treeOpenedFrom: (requestNo: string) => `เปิดจาก ${requestNo}`,
    treeEmpty: "ยังไม่มีคำขอย่อยภายใต้คำขอนี้",
    treeOpenBold: "คำขอที่ยังไม่ปิด — คำขอแม่จะปิดไม่ได้จนกว่าจะปิดครบ",
    /* H2.2 ข้อ 4 — who a waiting step is waiting on. */
    waitingOn: (names: string) => `รออนุมัติจาก ${names}`,
    anyOf: (count: number) => `${count} คน ใครอนุมัติก็ผ่าน`,
    complete: "ทำเสร็จแล้ว",
    close: "ปิดคำขอ",
    assign: "มอบหมายงาน",
    assignPlaceholder: "เลือกผู้รับผิดชอบ",
    addChild: "+ สร้างคำขอย่อย",
    actionDone: "บันทึกแล้ว",
    treeNote: "คำขอแม่จะกด “ทำเสร็จแล้ว” ไม่ได้จนกว่าคำขอย่อยทุกใบจะปิด",
    /* The type's sub-request checklist, shown above the title. */
    subRequestsMissing: (count: number) =>
      `ต้องสร้างคำขอย่อยที่บังคับอีก ${count} รายการ ก่อนกด “ทำเสร็จแล้ว”`,
    subRequestsDone:
      "สร้างคำขอย่อยที่บังคับครบแล้ว — กด “ทำเสร็จแล้ว” ได้เมื่อคำขอย่อยทุกใบปิด",
    subRequestRequired: "บังคับ",
    subRequestOptional: "ไม่บังคับ",
    subRequestNotYet: "ยังไม่ได้สร้าง",
    subRequestCreate: "สร้าง",
    subRequestCreateAnother: "+ สร้างอีกใบ",
    completeBlockedBySubRequests: "ยังสร้างคำขอย่อยที่บังคับไม่ครบ",
    /* The type's step flow on the detail page. */
    flow: {
      compact: (index: number, total: number, name: string) =>
        `ขั้น ${index}/${total} · ${name}`,
      currentStep: (name: string) => `งานในขั้นนี้: ${name}`,
      stepForm: "ฟอร์มของขั้น",
      saveDraft: "บันทึกร่าง",
      draftSaved: "บันทึกร่างแล้ว",
      needsApproval: "ขั้นนี้ต้องอนุมัติก่อนไปขั้นถัดไป",
      waitingApproval: "รออนุมัติเพื่อออกจากขั้นนี้",
      lastStep: "ขั้นสุดท้าย — กด “ทำเสร็จแล้ว” เมื่องานเสร็จ",
      advance: (name: string) => `ไปขั้นถัดไป: ${name}`,
      advanceForApproval: (name: string) => `ส่งอนุมัติ แล้วไป: ${name}`,
      back: (name: string) => `ย้อนกลับไป: ${name}`,
      backConfirm: (name: string) => `ส่งงานย้อนกลับไปขั้น “${name}”?`,
      backConfirmBody: "ฟอร์มของขั้นนี้ยังเก็บไว้ ไม่ถูกลบ",
      stepDone: "ผ่านแล้ว",
      stepNow: "กำลังทำ",
      stepLater: "ยังไม่ถึง",
      noForm: "ขั้นนี้ไม่มีฟอร์ม",
      docMissing: "ยังไม่ได้แนบ",
      confirmClose: "ยืนยันปิดงาน",
      confirmCloseTitle: "ยืนยันปิดงานคำขอนี้?",
      confirmCloseBody: "ตรวจแล้วว่าได้รับผลงานครบและแนบเอกสารที่ต้องใช้แล้ว",
    },
    cancel: "ยกเลิกคำขอ",
    cancelReason: "เหตุผลการยกเลิก",
    cancelled: "ยกเลิกคำขอแล้ว",
    /** §16 หน้าที่ 4 — who the request passes through. */
    peopleTitle: "ผู้เกี่ยวข้อง",
    receiverLabel: "ผู้รับเรื่อง",
    assigneeLabel: "ผู้ดำเนินการ",
    createdAt: "สร้างเมื่อ",
    cancelReasonLabel: "เหตุผลการยกเลิก",
    infoTitle: "ข้อมูลคำขอ",
    requester: "ผู้ยื่น",
    submittedAt: "ยื่นเมื่อ",
    reference: "อ้างอิง",
    attachments: (count: number) => `เอกสารแนบ (${count})`,
    noFile: "ไม่มีไฟล์ — บันทึกไว้ก่อนเปิดใช้การเก็บไฟล์",
    timelineTitle: "ไทม์ไลน์ (บันทึกทุกการเปลี่ยนสถานะ)",
    timelineEmpty: "ยังไม่มีการเปลี่ยนสถานะ",
    system: "ระบบ",
    chainTitle: "เส้นทางอนุมัติ",
    chainStep: (n: number) => `ขั้น ${n}`,
    stepPending: "รอพิจารณา",
    stepApproved: "อนุมัติแล้ว",
    stepRejected: "ไม่อนุมัติ",
    stepWaiting: "ยังไม่ถึงคิว",
    stepReturned: "ส่งกลับ",
    stepSkipped: (reason: string | null | undefined) =>
      reason === "same_approver"
        ? "ข้าม — ผู้อนุมัติซ้ำกับขั้นก่อน"
        : "ข้าม — ไม่เข้าเงื่อนไขของชั้นนี้",
    stepVotes: (approved: number, total: number) => `อนุมัติแล้ว ${approved}/${total} คน`,
    stepClosed: "ปิดโดยไม่ได้ตัดสิน",
    voidNote:
      "แก้ไขสาระสำคัญหลังอนุมัติจะทำให้การอนุมัติเป็นโมฆะและต้องเริ่มเส้นทางใหม่",
    chainFrom: (amount: string, version: number) =>
      `เส้นทางคำนวณจากวงเงิน ${amount} บาท · ตารางอำนาจเวอร์ชัน ${version}`,
    /* A request's route does not depend on an amount, so there is none to name. */
    chainVersion: (version: number) => `ตารางอำนาจเวอร์ชัน ${version}`,
    masked: "••••••",
    /** Beside a table field's name, so its size is known before it is read. */
    tableRows: (count: number) => `${count} แถว`,
    /*
      Every event type the backend can write, because the fallback prints the
      raw type: a timeline reading `RECEIVED` beside `ยื่นคำขอ` is the tell that
      one was added without its label. Walking a request end to end on 1 ก.ย.
      2569 turned up five of them.

      `request.completed` is the doing team finishing, `request.closed` is the
      requester accepting — two different moments, so they cannot share "ปิดงาน".
    */
    events: {
      "request.submitted": "ยื่นคำขอ",
      "request.resubmitted": "ยื่นใหม่หลังแก้ไข",
      RECEIVED: "รับเรื่อง",
      ASSIGNED: "มอบหมายผู้ดำเนินการ",
      HANDOVER: "ส่งต่อผู้ดำเนินการ",
      "request.completed": "แจ้งงานเสร็จ",
      "request.routed": "เข้าคิวผู้อนุมัติ",
      "request.review.step": "อนุมัติผ่านหนึ่งชั้น",
      "request.review.approve": "อนุมัติ",
      "request.review.reject": "ไม่อนุมัติ",
      "request.review.return": "ส่งกลับให้แก้ไขงาน",
      "request.accepted": "รับมอบงาน",
      "request.closed": "ปิดคำขอ",
      "request.returned": "ตีกลับให้แก้ไข",
      "request.cancelled": "ยกเลิกคำขอ",
      "request.held": "พักงานไว้",
      "request.resumed": "กลับมาดำเนินการ",
      "approval.decided": "ผลการอนุมัติ",
      "sla.escalated": "เกินกำหนด — เร่งงานอัตโนมัติ",
    } as Record<string, string>,
  },

  /** APV-06 (CD-45) */
  decisionLog: {
    title: "ประวัติการใช้อำนาจอนุมัติ",
    subtitle:
      "ใครอนุมัติอะไร เมื่อไร ในฐานะอะไร และด้วยข้อมูลชุดใด — รวมการอนุมัติแทนและการตัดสินนอกสายปกติ",
    period: "ช่วงเวลา",
    basis: "ในฐานะ",
    allBases: "ทั้งหมด",
    export: "ดาวน์โหลด CSV",
    exportHint:
      "ไม่เกิน 10,000 แถวต่อไฟล์ · ทุกการดาวน์โหลดถูกบันทึกใน Audit Log",
    empty: "ไม่มีการตัดสินในช่วงนี้",
    periodLabel: (from: string, to: string) => `ข้อมูลวันที่ ${from} ถึง ${to}`,
    bases: {
      chain: "ตามสายอนุมัติ",
      delegate: "แทน (มอบอำนาจ)",
      scope_grant: "สิทธิ์ขอบเขต (นอกสาย)",
    } as Record<string, string>,
    basisColor: {
      chain: "default",
      delegate: "blue",
      scope_grant: "orange",
    } as Record<string, string>,
    decisions: {
      approve: "อนุมัติ",
      reject: "ไม่อนุมัติ",
      return: "ตีกลับ",
    } as Record<string, string>,
    decisionColor: {
      approve: "green",
      reject: "red",
      return: "gold",
    } as Record<string, string>,
    columns: {
      when: "เมื่อ",
      request: "คำขอ",
      amount: "มูลค่า",
      step: "ขั้น",
      named: "ผู้อนุมัติตามสาย",
      decidedBy: "ผู้ตัดสิน",
      basis: "ในฐานะ",
      decision: "ผล",
      note: "หมายเหตุ",
      data: "ข้อมูลที่ใช้ตัดสิน",
    },
    dataCell: (matrix: number | null, snapshot: number, hash: string) =>
      `ตาราง v${matrix ?? "—"} · snapshot v${snapshot} ${hash.slice(0, 8)}`,
    basisNote:
      '"สิทธิ์ขอบเขต (นอกสาย)" = ผู้ตัดสินไม่ใช่ผู้อนุมัติที่สายระบุ และไม่ได้รับมอบอำนาจ — ตัดสินด้วยสิทธิ์ที่ผู้ดูแลให้ไว้ในหน้าผังทีมและสิทธิ์',
  },

  /** CD-50 — SLA compliance. */
  slaReport: {
    title: "รายงานการทำตามกำหนด (SLA)",
    subtitle:
      "สัดส่วนงานที่ปิดทันกำหนด แยกตามทีมผู้รับ ประเภทคำขอ หรือเดือน และคำขอที่ค้างเกินกำหนดอยู่ตอนนี้",
    scopeNote: "นับเฉพาะคำขอที่คุณเปิดดูได้ — คนละคนอาจเห็นตัวเลขไม่เท่ากัน",
    groupBy: { team: "ทีมผู้รับ", type: "ประเภทคำขอ", month: "เดือนที่ปิดงาน" },
    filterType: "ทุกประเภทคำขอ",
    defaultPeriod: "ค่าเริ่มต้น: 30 วันล่าสุด",
    period: (from: string, to: string) => `งานที่ปิดระหว่าง ${from} – ${to}`,
    clearFilters: "ล้างตัวกรอง",
    compliance: "ปิดทันกำหนด",
    finishedOf: (onTime: number, finished: number) =>
      `${onTime} จาก ${finished} งานที่ปิด`,
    openOverdue: "ค้างเกินกำหนดตอนนี้",
    openOnTrack: (count: number) => `ยังไม่เลยกำหนด ${count} งาน`,
    response: "เคสตอบกลับทันเวลา",
    responseOf: (onTime: number, total: number) =>
      total ? `${onTime} จาก ${total} เคส` : "ยังไม่มีเคสที่ตอบกลับในช่วงนี้",
    none: "—",
    empty: "ยังไม่มีงานในช่วงที่เลือก",
    columns: {
      finished: "ปิดแล้ว",
      onTime: "ทันกำหนด",
      late: "เกินกำหนด",
      compliance: "% ทันกำหนด",
      openOverdue: "ค้างเกินกำหนด",
      openOnTrack: "ค้าง (ยังทัน)",
      response: "% ตอบกลับทัน (เคส)",
    },
    definitions:
      "ปิดทันกำหนด = งานที่ปิดในช่วงที่เลือกและเสร็จก่อนครบกำหนด SLA (ไม่นับงานที่ยกเลิก) · ค้างเกินกำหนด = งานที่ยังไม่ปิดและเลยกำหนดแล้ว ณ ตอนนี้ ไม่ขึ้นกับช่วงที่เลือก — งานที่พักนาฬิกาอยู่ไม่นับว่าเกินเพียงเพราะพัก · นิยามเดียวกับแดชบอร์ด SLA บน Metabase",
  },

  bottleneck: {
    filterType: "ประเภทคำขอ",
    filterPeriod: "ช่วงเวลา",
    filterFrom: "ตั้งแต่",
    filterTo: "ถึง",
    clearFilters: "ล้างตัวกรอง",
    /**
     * SCOPE-02 — the report aggregates only the requests this viewer may see,
     * so two people can open it and get different totals. Said on the page
     * because a smaller table looks like missing data otherwise.
     */
    scopeNote:
      "รายงานนี้นับเฉพาะคำขอที่คุณเกี่ยวข้อง และคำขอของทีมที่คุณเป็นหัวหน้า",
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
    pendingNote: "ขั้นที่ยังไม่ตัดสินไม่ถูกนำมาเฉลี่ย ",
  },

  /** CD-73 */
  crmDashboard: {
    title: "ภาพรวม CRM",
    subtitle: "ลูกค้า Lead โอกาสการขาย และกิจกรรมในหน้าเดียว",
    viewTeam: "ทั้งหมดที่เห็นได้",
    viewMine: "ของฉัน",
    scopeNote:
      '"ทั้งหมดที่เห็นได้" = ของตัวเอง และของทีมถ้าคุณเป็นหัวหน้า · "ของฉัน" = เฉพาะที่คุณเป็นเจ้าของ',
    monthNote: (from: string) => `ตัวเลข "เดือนนี้" นับตั้งแต่ ${from}`,
    customersActive: "ลูกค้าที่ใช้งานอยู่",
    customersNew: (n: number) =>
      `ใหม่เดือนนี้ ${n.toLocaleString("th-TH")} ราย`,
    leadsOpen: "Lead ที่ยังเปิด",
    leadsNew: (n: number) =>
      `เข้าใหม่เดือนนี้ ${n.toLocaleString("th-TH")} ราย`,
    pipeline: "มูลค่าใน pipeline",
    pipelineHint: (count: number, weighted: string) =>
      `${count.toLocaleString("th-TH")} โอกาส · ถ่วงความน่าจะเป็น ${weighted}`,
    wonThisMonth: "ชนะเดือนนี้",
    wonHint: (n: number) => `${n.toLocaleString("th-TH")} ดีล`,
    leadsByStatus: "Lead ตามสถานะ",
    leadsEmpty: "ไม่มี Lead ที่ยังเปิด",
    pipelineByStage: "โอกาสการขายตามขั้น",
    stageColumns: {
      stage: "ขั้น",
      count: "จำนวน",
      amount: "มูลค่า (บาท)",
      weighted: "ถ่วงความน่าจะเป็น (บาท)",
    },
    activitiesTitle: "กิจกรรมติดตาม",
    overdue: "เลยกำหนด",
    dueSoon: "ถึงกำหนดใน 7 วัน",
    completed: "ทำเสร็จเดือนนี้",
    stale: "ดีลเงียบเกินเกณฑ์",
    openList: "ดูรายการ",
  },

  /** CD-71 */
  /** CD-86 — แกน Keeper: portfolio, แผนบัญชี, สุขภาพลูกค้า, รอบทบทวน. */
  keeper: {
    title: "Portfolio ลูกค้าเดิม",
    subtitle:
      "ลูกค้าที่ดูแล จัดลำดับด้วยแผนบัญชี ดูสุขภาพจากเคส การชำระเงิน สัญญา และการติดต่อ — แดงอยู่บนสุด",
    mine: "ของฉัน",
    team: "ทั้งทีม",
    allTiers: "ระดับ: ทั้งหมด",
    noPlanFilter: "ยังไม่มีแผน",
    allHealth: "สุขภาพ: ทั้งหมด",
    searchPlaceholder: "ค้นหารหัส / ชื่อลูกค้า",
    truncated: "แสดง 300 บัญชีแรก — ใช้ตัวกรองให้แคบลง",
    empty: "ไม่มีลูกค้าตามเงื่อนไขนี้",
    tiles: {
      red: "ต้องรีบดูแล",
      amber: "เฝ้าระวัง",
      green: "ปกติ",
      reviewsDue: "ถึงรอบทบทวนใน 7 วัน",
      withoutPlan: "ยังไม่มีแผนบัญชี",
      noExpansion: "ไม่มีดีลขยาย",
    },
    columns: {
      health: "สุขภาพ",
      customer: "ลูกค้า",
      tier: "ระดับ",
      nextReview: "ทบทวนครั้งถัดไป",
      lastContact: "ติดต่อล่าสุด",
      deals: "ดีลที่เปิด",
      revenue: "ยอดขาย 12 เดือน",
      owner: "ผู้ดูแล",
    },
    tier: { a: "A", b: "B", c: "C" } as Record<string, string>,
    tierColor: { a: "red", b: "gold", c: "default" } as Record<string, string>,
    tierHint: "(A = ดูแลใกล้ชิดที่สุด)",
    health: { green: "ปกติ", amber: "เฝ้าระวัง", red: "เสี่ยง" } as Record<
      string,
      string
    >,
    healthColor: { green: "green", amber: "orange", red: "red" } as Record<
      string,
      string
    >,
    signal: {
      case_breached: (v: Record<string, number | string>) =>
        `เคสเกิน SLA ${v.count} เคส`,
      case_serious: (v: Record<string, number | string>) =>
        `เคสร้ายแรงเปิดอยู่ ${v.count} เคส`,
      invoice_overdue: (v: Record<string, number | string>) =>
        `ใบแจ้งหนี้เลยกำหนด ${v.days}+ วัน`,
      contract_ending: (v: Record<string, number | string>) =>
        `สัญญาหมดใน ${v.days} วัน ยังไม่มีดีลต่ออายุ`,
      renewal_lost: () => "ดีลต่ออายุสัญญาแพ้",
      low_satisfaction: (v: Record<string, number | string>) =>
        `ความพึงพอใจ ${v.score}/5`,
      no_contact: (v: Record<string, number | string>) =>
        v.never ? `ยังไม่เคยติดต่อ (${v.days} วัน)` : `ไม่ได้ติดต่อ ${v.days} วัน`,
    } as Record<string, (v: Record<string, number | string>) => string>,
    overdueReview: "เลยรอบ",
    never: "ยังไม่เคย",
    noPlan: "ยังไม่มีแผน",
    expansion: (n: number) => `ดีลขยาย ${n}`,
    noExpansionTag: "ไม่มีดีลขยาย",
    openAccount: "เปิดแผนบัญชี",
    account: {
      healthTitle: "สุขภาพลูกค้า",
      allGood: "ไม่มีสัญญาณความเสี่ยง",
      healthNote:
        "คำนวณจากเคส (เกิน SLA / ร้ายแรง) · ใบแจ้งหนี้เลยกำหนด · สัญญาใกล้หมด · ความพึงพอใจจากการทบทวนล่าสุด · ระยะเวลาที่ไม่ได้ติดต่อ — สัญญาณที่คุณไม่มีสิทธิ์ดูจะไม่ถูกนับ",
      planTitle: "แผนบัญชี",
      noPlan: "ยังไม่ได้วางแผนบัญชีสำหรับลูกค้ารายนี้",
      createPlan: "วางแผนบัญชี",
      editPlan: "แก้แผน",
      tier: "ระดับ",
      goals: "แผนเติบโต / เป้าหมาย",
      targetRevenue: "เป้ายอดขายต่อปี (บาท)",
      reviewEvery: "ทบทวนทุก (เดือน)",
      nextReview: "ทบทวนครั้งถัดไป",
      planSaved: "บันทึกแผนบัญชีแล้ว",
      touchTitle: "การทบทวนและการติดต่อ",
      logReview: "ลงผลการทบทวน",
      logContact: "ลงการติดต่อ",
      noTouches: "ยังไม่มีการทบทวนหรือการติดต่อ",
      touchType: {
        review: "ทบทวน",
        call: "โทร",
        email: "อีเมล",
        meeting: "ประชุม",
        visit: "เข้าพบ",
        line: "LINE",
        social: "โซเชียล",
      } as Record<string, string>,
      touchForm: {
        type: "ประเภท",
        summary: "สรุป",
        summaryRequired: "ต้องสรุปสิ่งที่คุย",
        occurredAt: "เมื่อ",
        satisfaction: "ความพึงพอใจของลูกค้า (1–5)",
        nextSteps: "สิ่งที่จะทำต่อ",
        save: "บันทึก",
        saved: "บันทึกแล้ว",
        reviewNext: (on: string) => `บันทึกแล้ว — ทบทวนครั้งถัดไป ${on}`,
      },
      productsTitle: "สิ่งที่ลูกค้าซื้ออยู่ (24 เดือน)",
      noProducts: "ยังไม่มีใบสั่งขายใน 24 เดือน",
      productColumns: {
        product: "สินค้า/บริการ",
        quantity: "จำนวน",
        amount: "ยอด",
        last: "สั่งล่าสุด",
      },
      contractsTitle: "สัญญาที่มีผล",
      dealsTitle: "ดีลที่เปิดอยู่",
      noDeals: "ไม่มีดีลที่เปิดอยู่",
      openExpansion: "เปิดดีลขยาย",
      expansionTitle: "เปิดดีลขยาย (Upgrade / Upsell / Cross-sell)",
      expansionName: "ชื่อดีล",
      expansionNameRequired: "ต้องระบุชื่อดีล",
      expansionAmount: "มูลค่าที่คาด (บาท)",
      expansionCreated: "เปิดดีลแล้ว",
      satisfaction: (n: number) => `พึงพอใจ ${n}/5`,
      lastSatisfaction: "ความพึงพอใจล่าสุด",
      revenue: "ยอดขาย 12 เดือน",
      target: "เป้า",
    },
  },

  /** CD-85 — บริษัทเป้าหมาย (Target Account) ของแกน Getter. */
  targetAccounts: {
    title: "บริษัทเป้าหมาย",
    subtitle:
      "รายชื่อบริษัทที่จะเปิดตลาด จัดลำดับก่อนหลังก่อนเริ่มติดต่อ — กด \"เริ่มเข้าหา\" แล้วงานเดินต่อบน Lead",
    add: "เพิ่มบริษัทเป้าหมาย",
    edit: "แก้ไข",
    searchPlaceholder: "ค้นหาชื่อ / เลขภาษี",
    allStatus: "สถานะ: ทั้งหมด",
    allPriority: "ลำดับ: ทั้งหมด",
    all: "ทั้งหมด",
    mineOnly: "เฉพาะของฉัน",
    unassigned: "ยังไม่มีคนรับ",
    empty: "ยังไม่มีบริษัทเป้าหมาย",
    columns: {
      priority: "ลำดับ",
      name: "บริษัท",
      industry: "อุตสาหกรรม / จังหวัด",
      owner: "ผู้รับผิดชอบ",
      status: "สถานะ",
      lead: "Lead",
    },
    priority: { high: "สูง", medium: "กลาง", low: "ต่ำ" } as Record<
      string,
      string
    >,
    priorityColor: { high: "red", medium: "gold", low: "default" } as Record<
      string,
      string
    >,
    status: {
      targeting: "เล็งไว้",
      approaching: "กำลังเข้าหา",
      converted: "เปิดดีลแล้ว",
      dropped: "ตัดออก",
    } as Record<string, string>,
    statusColor: {
      targeting: "default",
      approaching: "blue",
      converted: "green",
      dropped: "red",
    } as Record<string, string>,
    noOwner: "— ยังไม่มีคนรับ —",
    approach: "เริ่มเข้าหา",
    approachTitle: (name: string) => `เริ่มเข้าหา ${name}`,
    approachHint:
      "ระบบจะสร้าง Lead จากข้อมูลบริษัทนี้ (สถานะตั้งต้น) — ใส่ผู้ติดต่อได้ถ้ารู้แล้ว",
    approached: "สร้าง Lead แล้ว",
    openLead: "เปิด Lead",
    drop: "ตัดออก",
    dropTitle: "ตัดบริษัทเป้าหมายออก",
    dropReason: "เหตุผลที่ตัดออก",
    dropped: "ตัดออกแล้ว",
    reopen: "นำกลับมาเล็ง",
    reopened: "นำกลับมาแล้ว",
    save: "บันทึก",
    saved: "บันทึกแล้ว",
    form: {
      name: "ชื่อบริษัท",
      nameRequired: "ต้องระบุชื่อบริษัท",
      nameEn: "ชื่อ (ภาษาอังกฤษ)",
      taxId: "เลขทะเบียนนิติบุคคล",
      industry: "อุตสาหกรรม",
      companySize: "ขนาด",
      province: "จังหวัด",
      website: "เว็บไซต์",
      note: "ทำไมเล็งรายนี้ / ใครแนะนำ",
      priority: "ลำดับความสำคัญ",
      owner: "ผู้รับผิดชอบ",
      contactName: "ผู้ติดต่อ",
      phone: "โทรศัพท์",
      email: "อีเมล",
    },
  },

  campaigns: {
    title: "แคมเปญ",
    subtitle: "ผูก Lead กับกิจกรรมการตลาด แล้ววัดผลถึงยอดขาย",
    scopeNote: "ผลนับเฉพาะ Lead ที่คุณมองเห็น",
    create: "สร้างแคมเปญ",
    edit: "แก้ไข",
    leads: "ดู Lead",
    empty: "ยังไม่มีแคมเปญ",
    activeTag: "เปิด",
    closedTag: "ปิดแล้ว",
    columns: {
      campaign: "แคมเปญ",
      period: "ช่วงเวลา",
      budget: "งบ (บาท)",
      leads: "Lead",
      converted: "เป็นโอกาส",
      won: "ชนะ",
      sales: "ยอดขาย (บาท)",
      costPerLead: "ต้นทุน/Lead",
      salesPerBudget: "ยอดขาย/งบ",
    },
    form: {
      titleNew: "สร้างแคมเปญ",
      titleEdit: (code: string) => `แก้ไขแคมเปญ ${code}`,
      code: "รหัส",
      codeHint:
        "ใช้ในเว็บฟอร์มและไฟล์นำเข้า (A-Z, 0-9, -, _) — ตั้งแล้วแก้ไม่ได้",
      name: "ชื่อแคมเปญ",
      channel: "ช่องทาง",
      channelPlaceholder: "เช่น อีเวนต์, Facebook Ads, อีเมล",
      period: "ช่วงเวลา",
      budget: "งบประมาณ (บาท)",
      note: "หมายเหตุ",
      active: "เปิดรับ Lead",
      activeHint: "ปิดแล้ว = ผูก Lead ใหม่ไม่ได้ แต่ผลเดิมยังอยู่",
      submit: "บันทึก",
      saved: "บันทึกแคมเปญแล้ว",
      required: "จำเป็น",
    },
    definitions:
      "เป็นโอกาส = Lead ที่แปลงเป็นโอกาสการขายแล้ว · ยอดขาย = ใบสั่งขายที่ไม่ยกเลิกจากโอกาสเหล่านั้น · ต้นทุน/Lead = งบ ÷ จำนวน Lead",
    leadField: "แคมเปญ",
    leadFieldPlaceholder: "ไม่ผูกแคมเปญ",
  },

  /** CD-82 */
  salesTargets: {
    title: "เป้าและพยากรณ์",
    subtitle: "เป้ายอดขายรายเดือนเทียบยอดจริงและพยากรณ์",
    scopeNote:
      "เห็นเป้าของตัวเองและของทีมที่คุณดูแล · ผู้ตั้งเป้าเห็นทั้งบริษัท",
    month: "เดือน",
    started: "เดือนนี้เริ่มแล้ว — ปรับเป้าที่ตั้งไว้ต้องขออนุมัติ",
    closed: "เดือนนี้จบแล้ว — พยากรณ์ = ยอดจริง",
    future: "เดือนนี้ยังไม่เริ่ม — ตั้งและแก้เป้าได้ทันที",
    notConfigured:
      "ยังไม่ได้ตั้งประเภทคำขอสำหรับอนุมัติการปรับเป้า — ปรับเป้าของเดือนที่เริ่มแล้วไม่ได้จนกว่าผู้ดูแลจะตั้งที่ ตั้งค่า CRM",
    setTarget: "ตั้งเป้า",
    adjust: "ปรับเป้า",
    history: "ประวัติ",
    empty: "ยังไม่มีเป้าของเดือนนี้",
    pendingTag: (amount: string) => `รออนุมัติ → ${amount}`,
    openRequest: "เปิดคำขอ",
    columns: {
      subject: "พนักงาน / กลุ่ม",
      target: "เป้า (บาท)",
      actual: "ยอดจริง (บาท)",
      attainment: "ทำได้",
      forecast: "พยากรณ์ (บาท)",
      forecastPct: "พยากรณ์เทียบเป้า",
    },
    scopeUser: "พนักงาน",
    scopeUnit: "ทีม / ฝ่าย",
    form: {
      titleNew: "ตั้งเป้า",
      titleAdjust: (name: string) => `ปรับเป้า — ${name}`,
      scope: "ตั้งให้",
      subject: "เลือก",
      subjectPlaceholder: "ค้นหาชื่อ",
      amount: "เป้า (บาท)",
      reason: "เหตุผล",
      reasonRequired:
        "จำเป็นเมื่อปรับเป้าของเดือนที่เริ่มแล้ว — ไปอยู่ในคำขออนุมัติ",
      approvalNote:
        "เดือนนี้เริ่มแล้ว: ระบบจะสร้างร่างคำขออนุมัติให้ เป้าใหม่มีผลเมื่ออนุมัติ — คุณต้องเปิดคำขอเพื่อยื่นเอง",
      submit: "บันทึก",
      saved: "บันทึกเป้าแล้ว",
      drafted: "สร้างร่างคำขออนุมัติแล้ว — เปิดคำขอเพื่อยื่น",
    },
    historyTitle: (name: string) => `ประวัติเป้า — ${name}`,
    historyColumns: {
      when: "เมื่อ",
      who: "โดย",
      from: "จาก",
      to: "เป็น",
      status: "สถานะ",
      reason: "เหตุผล",
    },
    revisionStatus: {
      applied: "มีผล",
      pending_approval: "รออนุมัติ",
      rejected: "ไม่อนุมัติ",
      cancelled: "ยกเลิก",
    } as Record<string, string>,
    revisionColor: {
      applied: "green",
      pending_approval: "gold",
      rejected: "red",
      cancelled: "default",
    } as Record<string, string>,
    definitions:
      "ยอดจริง = ใบสั่งขายที่เปิดในเดือน (ไม่นับที่ยกเลิก) · พยากรณ์ = ยอดจริง + มูลค่า × ความน่าจะเป็น ของโอกาสที่ยังเปิดและคาดว่าจะปิดในเดือน · เป้าของทีม/ฝ่ายนับยอดของทุกกลุ่มใต้มัน",
  },

  /** CD-83 */
  salesReport: {
    title: "รายงานยอดขาย",
    subtitle: "ยอดขาย อัตราการปิด เหตุผลที่แพ้ และผลงานรายบุคคล",
    scopeNote:
      "นับเฉพาะโอกาสการขายและใบสั่งขายที่คุณเห็นได้ — พนักงานเห็นของตัวเอง หัวหน้าเห็นของทีม",
    filterPeriod: "ช่วงเวลา",
    thisMonth: "เดือนนี้",
    lastMonth: "เดือนที่แล้ว",
    thisYear: "ปีนี้",
    periodLabel: (from: string, to: string) => `ข้อมูลวันที่ ${from} ถึง ${to}`,
    salesAmount: "ยอดขาย",
    salesAmountHint: (count: number) =>
      `ใบสั่งขาย ${count.toLocaleString("th-TH")} ใบ (ไม่นับที่ยกเลิก)`,
    winRate: "อัตราการปิด",
    winRateHint: (won: number, lost: number) =>
      `ชนะ ${won.toLocaleString("th-TH")} · แพ้ ${lost.toLocaleString("th-TH")}`,
    winRateNone: "ยังไม่มีดีลที่ปิดในช่วงนี้",
    wonAmount: "มูลค่าที่ชนะ",
    lostAmount: "มูลค่าที่แพ้",
    openPipeline: "ค้างใน pipeline ตอนนี้",
    openPipelineHint: (count: number) =>
      `${count.toLocaleString("th-TH")} โอกาส · ไม่ขึ้นกับช่วงที่เลือก`,
    lostReasonsTitle: "เหตุผลที่แพ้",
    lostReasonsEmpty: "ไม่มีดีลที่แพ้ในช่วงนี้",
    byOwnerTitle: "ผลงานรายบุคคล",
    byOwnerEmpty: "ไม่มีข้อมูลในช่วงนี้",
    columns: {
      reason: "เหตุผล",
      count: "จำนวน",
      share: "สัดส่วน",
      amount: "มูลค่า (บาท)",
      owner: "พนักงานขาย",
      sales: "ยอดขาย (บาท)",
      saleOrders: "ใบสั่งขาย",
      won: "ชนะ",
      lost: "แพ้",
      winRate: "อัตราการปิด",
      open: "ค้างใน pipeline (บาท)",
    },
    definitions:
      "ยอดขาย = ใบสั่งขายที่เปิดในช่วง · ชนะ/แพ้ = โอกาสที่ปิดในช่วง · อัตราการปิด = ชนะ ÷ (ชนะ + แพ้)",
  },

  requestTypes: {
    title: "ประเภทคำขอ",
    subtitle: "ประเภทคำขอ — ตั้งค่าได้โดยไม่ต้องแก้โปรแกรม",
    listTitle: "ประเภททั้งหมด",
    /** §16 A2 heads the list with the company whose types these are. */
    listTitleFor: (company: string) => `ประเภททั้งหมด · ${company}`,
    searchPlaceholder: "ค้นหาชื่อหรือรหัสประเภทคำขอ",
    searchNoMatch: "ไม่พบประเภทคำขอที่ค้นหา",
    active: "เปิดใช้",
    inactive: "ยังไม่เปิด",
    edit: (name: string, code: string) => `แก้ไข: ${name} (${code})`,
    /*
      The detail pane's three tabs. The two approval ones are §16 A1's two
      stages (`approval-stage.ts`): the ผู้ยื่น ladder climbs the requester's
      chart before the work is handed over, the ผู้รับ one climbs the
      assignee's when the work is checked.
    */
    tabDetail: "รายละเอียด",
    tabFlow: "ขั้นตอน",
    tabApproval: "อำนาจอนุมัติ",
    approvalBefore: "ก่อนทำงาน (สายผู้ยื่น)",
    approvalAfter: "หลังทำงาน (สายผู้รับ)",
    approvalStepHint: "สายอนุมัติรายขั้นตั้งในแท็บ \"ขั้นตอน\"",
    /* The step flow tab — steps inside "กำลังดำเนินการ". */
    flow: {
      intro:
        "แบ่งงานของประเภทนี้เป็นขั้น ๆ ระหว่าง \"กำลังดำเนินการ\" แต่ละขั้นมีฟอร์ม คำขอย่อย และการอนุมัติของตัวเองได้ ถ้ายังไม่ publish คำขอประเภทนี้ทำงานแบบเดิม",
      current: (version: number) => `v${version} ใช้งานอยู่`,
      none: "ยังไม่มี flow — คำขอประเภทนี้ทำงานแบบเดิม",
      publish: (version: number) => `Publish v${version}`,
      publishTitle: (version: number) => `Publish flow v${version}`,
      publishNote:
        "มีผลกับคำขอที่ยื่นหลังจากนี้เท่านั้น คำขอที่ยื่นไปแล้วใช้ flow ที่ผูกไว้ตอนยื่น",
      published: "Publish flow แล้ว",
      publishErrors: "Publish ไม่ได้ — แก้รายการต่อไปนี้ก่อน",
      summaryAdded: (count: number) => `เพิ่ม ${count} ขั้น`,
      summaryRemoved: (count: number) => `ลบ ${count} ขั้น`,
      summaryChanged: (count: number) => `แก้ไข ${count} ขั้น`,
      summaryNone: "ไม่มีการเปลี่ยนแปลงจาก version ปัจจุบัน",
      unsaved: "มีการแก้ไขที่ยังไม่ publish",
      reset: "ยกเลิกการแก้ไข",
      history: "ประวัติ",
      historyItem: (version: number, at: string, by: string) =>
        `v${version} · ${at} · ${by}`,
      addStep: "+ เพิ่มขั้น",
      newStepName: (index: number) => `ขั้นที่ ${index}`,
      start: "ยื่นคำขอ → รับเรื่อง",
      end: "ทำเสร็จ → ตรวจรับ",
      selectStep: "เลือกขั้นทางซ้ายเพื่อแก้ไข",
      emptySteps: "ยังไม่มีขั้น — กด \"เพิ่มขั้น\" เพื่อเริ่ม",
      lastStep: "ขั้นสุดท้าย",
      backTo: (name: string) => `↩ ${name}`,
      exitIf: (field: string, op: string, value: string) => `ถ้า ${field} ${op} ${value}`,
      exitOtherwise: "ปกติ",
      badgeApproval: "อนุมัติ",
      badgeForm: "ฟอร์ม",
      badgeSubRequests: "คำขอย่อย",
      badgeDocs: "เอกสาร",
      moveUp: "เลื่อนขึ้น",
      moveDown: "เลื่อนลง",
      removeStep: "ลบขั้น",
      editStep: "แก้ไขขั้น",
      done: "เสร็จ",
      stepName: "ชื่อขั้น",
      stepCode: "รหัสขั้น",
      stepCodeHint:
        "A-Z 0-9 _ ห้ามซ้ำ — สายอนุมัติของขั้นผูกกับรหัสนี้ เปลี่ยนรหัสแล้วต้อง publish สายอนุมัติใหม่",
      assignee: "ผู้รับผิดชอบเมื่อเข้าขั้นนี้",
      assigneeKeep: "คนเดิม",
      assigneeRequester: "ผู้ขอ",
      assigneeUser: "ระบุคน",
      assigneeUserPlaceholder: "เลือกผู้รับผิดชอบ",
      sla: "เวลาของขั้น (ชม.)",
      slaHint: "ใช้วัดและรายงาน ไม่แทนเวลารวมของคำขอ",
      sectionBasic: "ข้อมูลขั้น",
      sectionForm: "ฟอร์มของขั้น",
      sectionFormHint: "ผู้ทำงานกรอกก่อนออกจากขั้น บันทึกร่างได้ระหว่างทำ",
      sectionSubRequests: "คำขอย่อยของขั้น",
      sectionApproval: "อนุมัติก่อนออกจากขั้น",
      requiresApproval: "ต้องอนุมัติก่อนไปขั้นถัดไป",
      approvalHint:
        "Publish สายอนุมัติของขั้นนี้ก่อน แล้วจึง publish flow — ขั้นที่ไม่มีสายอนุมัติจะ publish ไม่ได้",
      approvalSaveFirst: "ตั้งรหัสขั้นให้เรียบร้อยก่อนตั้งสายอนุมัติ",
      sectionExits: "ทางออก",
      exitsHint:
        "ลองทีละบรรทัดจากบนลงล่าง เงื่อนไขแรกที่เป็นจริงชนะ บรรทัดสุดท้ายต้องไม่มีเงื่อนไข ไม่มีทางออกเลย = ขั้นสุดท้าย",
      exitTo: "ไปขั้น",
      exitAlways: "ทุกกรณี",
      exitWhen: "เมื่อ",
      addExit: "+ เพิ่มทางออก",
      addCondition: "ใส่เงื่อนไข",
      removeCondition: "ไม่มีเงื่อนไข",
      fieldPlaceholder: "ช่องในฟอร์ม",
      valuePlaceholder: "ค่า",
      inHint: "คั่นหลายค่าด้วย ,",
      sectionBackward: "ย้อนกลับ",
      backwardHint: "ผู้ทำงานส่งงานกลับไปขั้นเหล่านี้ได้ โดยไม่ตรวจฟอร์มของขั้นนี้",
      introV2:
        "แต่ละขั้นมีประเภทของตัวเอง — ผู้ขอกรอก, อนุมัติ, รับเรื่อง, ดำเนินการ, ผู้ขอยืนยันปิดงาน — เลือกประเภทก่อน แล้วตั้งค่าเฉพาะส่วนที่ประเภทนั้นใช้",
      v1Badge: "flow แบบเก่า (v1)",
      convertV2: "แปลงเป็น flow แบบใหม่",
      convertV2Confirm: "แปลงเป็น flow แบบใหม่?",
      convertV2Body:
        "ร่างใหม่สร้างจากค่าปัจจุบันของประเภทคำขอ (ฟอร์ม เอกสาร สายอนุมัติ) ยังไม่มีผลจนกว่าจะ publish",
      suggest: "สร้าง flow จากค่าเดิม",
      suggestFailed: "สร้างร่างจากค่าเดิมไม่สำเร็จ",
      sectionKind: "ประเภทขั้น",
      kinds: {
        draft: { label: "ผู้ขอกรอกคำขอ" },
        returned: { label: "ผู้ขอแก้ไข" },
        pending_approval: { label: "อนุมัติ" },
        submitted: { label: "รับเรื่อง" },
        in_progress: { label: "ดำเนินการ" },
        approved: { label: "ผู้ขอยืนยันปิดงาน" },
      } as Record<string, { label: string }>,
      sectionReceiver: "ผู้รับงานเมื่อเข้าขั้นนี้",
      receiverKeep: "คนเดิม",
      receiverDefault: "ผู้รับของประเภทคำขอ",
      receiverUser: "ระบุคน",
      receiverStep: "คนที่ทำขั้นอื่น",
      receiverStepPlaceholder: "เลือกขั้น",
      sectionApprovers: "ผู้อนุมัติของขั้นนี้",
      approversHint: "ไล่ทีละชั้นจากบนลงล่าง ต้องผ่านทุกชั้นจึงไปขั้นถัดไป",
      returnTo: "ส่งกลับไปขั้น",
      returnToPlaceholder: "เลือกขั้นที่รับงานคืนเมื่อผู้อนุมัติส่งกลับ",
      sectionDocs: "เอกสารที่ต้องแนบในขั้นนี้",
      warnFirst: (name: string) => `ขั้นแรก "${name}" ต้องเป็นประเภท "ผู้ขอกรอกคำขอ"`,
      warnLast: (name: string) =>
        `"${name}" ไม่มีทางออก จึงเป็นขั้นสุดท้าย — ต้องเป็นประเภท "ผู้ขอยืนยันปิดงาน"`,
      warnReturnTo: (name: string) => `ขั้นอนุมัติ "${name}" ยังไม่ได้เลือกขั้นที่จะส่งกลับ`,
      approvalSummary: (count: number) => `${count} ชั้น`,
      ops: {
        gt: "มากกว่า",
        gte: "มากกว่าหรือเท่ากับ",
        lt: "น้อยกว่า",
        lte: "น้อยกว่าหรือเท่ากับ",
        eq: "เท่ากับ",
        neq: "ไม่เท่ากับ",
        in: "เป็นหนึ่งใน",
      },
    },
    name: "ชื่อประเภท",
    receiver: "ทีมผู้รับ",
    sla: "SLA (ชั่วโมงทำการ)",
    fields: "ฟิลด์ฟอร์ม (form schema)",
    /** §16 A2 names these `เอกสารบังคับ`; a document may now also be optional. */
    docs: "เอกสารบังคับ / ไม่บังคับ",
    addDoc: "+ เพิ่มเอกสารบังคับ",
    docsEmpty: "ยังไม่ได้กำหนดเอกสาร — ผู้ยื่นยังแนบไฟล์เพิ่มเติมได้เสมอ",
    docRequired: "บังคับ",
    docOptional: "ไม่บังคับ",
    docRequiredToggle: "บังคับแนบก่อนยื่นคำขอ",
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
    /** The pill §16 puts on a sensitive field — what it *does*, not what it is. */
    fieldRestricted: "จำกัดสิทธิ์",
    fieldMultiline: "ข้อความยาว",
    /** §16 describes a field by its shape (`ตัวเลข · ฟิลด์อ่อนไหว`), not by its JSON Schema type. */
    fieldTypeLabels: {
      text: "ข้อความ",
      number: "ตัวเลข",
      boolean: "ใช่/ไม่ใช่",
      date: "วันที่",
      datetime: "วันที่และเวลา",
      select: "ตัวเลือก",
      table: "ตาราง",
    } satisfies Record<FieldKind, string>,
    fieldSelectCount: (count: number) => `ตัวเลือก ${count} ค่า`,
    fieldOptions: "ตัวเลือก",
    fieldOptionsHint: "พิมพ์แล้วกด Enter ทีละค่า",
    fieldTrueLabel: "ข้อความเมื่อเป็นจริง",
    fieldFalseLabel: "ข้อความเมื่อเป็นเท็จ",
    fieldTruePlaceholder: "ใช่",
    fieldFalsePlaceholder: "ไม่ใช่",
    fieldRange: (min: number, max: number) => `${min}–${max}`,
    fieldEditTitle: "แก้ไขฟิลด์ฟอร์ม",
    fieldAddTitle: "เพิ่มฟิลด์ฟอร์ม",
    entryEditTitle: "แก้ไขรายการ",
    entryAddTitle: "เพิ่มรายการ",
    save: "บันทึก",
    disable: "ปิดใช้งาน",
    enable: "เปิดใช้งาน",
    enabled: "เปิดใช้งานแล้ว",
    disabled: "ปิดใช้งานแล้ว",
    saved: "บันทึกแล้ว",
    deleted: "ลบประเภทคำขอแล้ว",
    moreActions: "การจัดการอื่น",
    sectionGeneral: "ข้อมูลทั่วไป",
    sectionReceiving: "การรับเรื่องและ SLA",
    sectionEligibility: "ผู้มีสิทธิ์ยื่น",
    sectionDocs: "เอกสารและเหตุผลตีกลับ",
    sectionSubRequests: "คำขอย่อยที่ต้องสร้าง",
    subRequestsNote:
      "ผู้รับงานจะเห็นรายการนี้ในหน้าคำขอ — กด “ทำเสร็จแล้ว” ได้เมื่อสร้างรายการที่บังคับครบ และคำขอย่อยทุกใบปิดแล้ว",
    subRequestsEmpty: "ยังไม่กำหนด — ผู้รับงานสร้างคำขอย่อยได้ตามต้องการ",
    subRequestAdd: "+ เพิ่มประเภทคำขอย่อย",
    subRequestUnknown: "(ไม่พบประเภทนี้ในบริษัท)",
    sectionForms: "ฟอร์ม",
    newType: "+ เพิ่มประเภท",
    newTypeTitle: "เพิ่มประเภทคำขอ",
    code: "รหัสประเภท",
    codeHint: "ตัวพิมพ์ใหญ่ ตัวเลข หรือขีดล่าง · เปลี่ยนภายหลังไม่ได้",
    codePlaceholder: "NDA",
    namePlaceholder: "ขอจัดทำ NDA",
    /** The placeholder field a new type starts with; the API refuses an empty schema. */
    starterFieldTitle: "เหตุผล",
    effectNote:
      "การบันทึกมีผลกับคำขอที่ยื่นใหม่เท่านั้น — คำขอที่เดินอยู่ใช้การตั้งค่า ณ ขณะยื่น · ทุกการแก้ไขลง Audit Log",
    matrixNote: "อ้างตารางอำนาจอนุมัติของบริษัทที่ยื่น",
    selectFirst: "เลือกประเภทจากรายการทางซ้าย",

    entryCode: "รหัส",
    entryLabel: "ชื่อที่แสดง",
    remove: "ลบ",
    noReceiver: "ยังไม่ได้กำหนดทีมผู้รับ",
    fixedReceiver: "ผู้รับเรื่องประจำ",
    fixedReceiverPlaceholder: "ผู้ยื่นเลือกเอง",
    fixedReceiverHint:
      "ถ้ากำหนดไว้ ทุกคำขอของประเภทนี้จะส่งถึงคนนี้ ผู้ยื่นเปลี่ยนไม่ได้",
    /** SUP-01 — which hours the SLA clock actually counts. */
    coverage: {
      H24X7: "24x7 — นับตลอดเวลา",
      H8X7: "8x7 — นับเฉพาะเวลาทำการ ทุกวัน",
      H8X5: "8x5 — นับเฉพาะเวลาทำการ วันทำงาน",
    } as Record<string, string>,
    workingHoursLink: "ตั้งเวลาทำการและวันหยุด",
    /* REQ-03 — `อ้างอิงโอกาสการขาย` is per type, not a rule of the submit screen. */
    tableColumns: "คอลัมน์ของตาราง",
    tableEditColumn: "แก้ไข",
    tableAddColumn: "+ เพิ่มคอลัมน์",
    tableNoColumns: "ยังไม่มีคอลัมน์ — ตารางจะแสดงว่างเปล่า",
    columnSummary: (key: string, kind: string, required: boolean) =>
      required ? `${key} · ${kind} · บังคับ` : `${key} · ${kind}`,
    tableMaxRows: "จำนวนแถวสูงสุด",
    tableNoCap: "ไม่จำกัด",
    tableMaxRowsHint: "เว้นว่างไว้ ผู้ยื่นจะเพิ่มแถวได้ไม่จำกัด",
    refRequired: "ต้องระบุอ้างอิงโอกาสการขาย",
    refRequiredHint:
      "เปิดไว้เมื่อคำขอประเภทนี้ผูกกับโอกาสการขายเสมอ · ปิดไว้ ผู้ยื่นจะเว้นว่างได้",
    eligibleUnits: "หน่วยงานที่เปิดคำขอนี้ได้",
    eligibleUnitsAll: "ไม่ได้เลือก = ทุกหน่วยงานเปิดได้",
    eligibleUnitsHint:
      "เลือกหน่วยงานไหน หน่วยงานที่อยู่ใต้หน่วยงานนั้นก็เปิดคำขอนี้ได้ด้วย",
    requesterForm: "ฟอร์มผู้ขอ",
    receiverForm: "ฟอร์มผู้รับคำขอ",
    receiverFormHint:
      "ผู้รับคำขอกรอกฟอร์มนี้ก่อนกดทำเสร็จ — ไม่มีฟิลด์เลยแปลว่าประเภทนี้ไม่มีขั้นนี้",
    deleteType: "ลบประเภทคำขอ",
    deleteConfirm: (name: string) => `ลบประเภทคำขอ ${name}?`,
    deleteConfirmBody:
      "ลบแล้วเอากลับไม่ได้ — ถ้าเคยมีคำขอประเภทนี้แล้ว ระบบจะไม่ให้ลบ ให้ปิดใช้งานแทน",
    /** §16 A2 list subtitle: `DSC · Sales → Pricing · SLA 24 ชม.ทำการ` */
    listSubtitle: (code: string, receiver: string, sla: string) =>
      `${code} · ${receiver} · ${sla}`,
    slaShort: (hours: number, businessHours: boolean) =>
      businessHours ? `SLA ${hours} ชม.ทำการ` : `SLA ${hours} ชม.`,
    slaUnset: "ยังไม่ได้ตั้ง SLA",
  },

  /** SUP-01 — the working window every business-hours SLA is measured against. */
  slaAdmin: {
    title: "เวลาทำการและวันหยุด",
    subtitle:
      "SLA แบบ 8x7 และ 8x5 นับเฉพาะช่วงเวลานี้ — แก้แล้วมีผลกับคำขอที่ยื่นใหม่",
    company: "บริษัท",
    start: "เวลาเปิด",
    end: "เวลาปิด",
    weekdays: "วันทำงาน",
    holidays: "วันหยุด",
    holidaysHint: "หนึ่งวันต่อบรรทัด รูปแบบ YYYY-MM-DD",
    save: "บันทึก",
    saved: "บันทึกแล้ว",
    endBeforeStart: "เวลาปิดต้องอยู่หลังเวลาเปิด",
    days: ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"],
  },

  /**
   * H2.3 — งานทั้งหมด, every request this person may open.
   *
   * The screen used to list only the groups the viewer heads, so it was empty
   * for everybody who heads nothing — with nothing on the page to say why.
   * `emptyReason` exists so an empty list can never again be mistaken for a
   * failed load.
   */
  allWork: {
    title: "งานทั้งหมด",
    subtitle:
      "ทุกคำขอที่คุณเข้าถึงได้ — งานของคุณเอง งานของหน่วยงานที่คุณเป็นหัวหน้า และหน่วยงานที่ได้รับสิทธิ์ scope",
    empty: "ยังไม่มีคำขอที่คุณเข้าถึงได้",
    emptyReason:
      "คุณยังไม่ได้เป็นหัวหน้าหน่วยงานใด และยังไม่ได้รับสิทธิ์ scope ให้เห็นงานของหน่วยงานอื่น — หน้านี้จึงแสดงเฉพาะคำขอที่คุณเกี่ยวข้องโดยตรง",
  },

  myWork: {
    /* Deciding several approvals at once from the อนุมัติ tab. */
    batch: {
      selected: (count: number) => `เลือก ${count} รายการ`,
      approve: (count: number) => `อนุมัติ ${count} รายการ`,
      reject: (count: number) => `ไม่อนุมัติ ${count} รายการ`,
      clear: "ล้างที่เลือก",
      limit: "เลือกได้ครั้งละไม่เกิน 50 รายการ",
      resultTitle: "ผลการตัดสิน",
      resultSummary: (ok: number, failed: number) => `สำเร็จ ${ok} · ไม่สำเร็จ ${failed}`,
    },
    title: "งานค้างของฉัน",
    newRequest: "ยื่นคำขอใหม่",
    /**
     * The four tabs, in the order the requirement names them. Short on purpose:
     * they sit in one row and each is qualified by the count beside it.
     *
     * The first used to be named after the viewer's scope level, which no
     * longer exists — and calling it "คำขอของฉัน" while it listed tickets
     * handed to you by somebody else was a lie either way. It is now the union
     * of the other three, which is what "ทั้งหมด" says.
     */
    tabInvolved: "ทั้งหมด",
    tabCreated: "สร้าง",
    tabIncoming: "รับเรื่อง",
    tabApprovals: "อนุมัติ",
    /** The badge beside it: how many are actually waiting on this person. */
    awaitingMe: "รอคุณตัดสิน",
    emptyIncoming: "ไม่มีคำขอที่ส่งมาให้คุณ",
    search: "ค้นหาเลขที่ / ลูกค้า / โอกาสการขาย",
    filterStatus: "สถานะ",
    filterType: "ประเภท",
    /**
     * What the status box opens on, and what it says while it is there.
     *
     * Named in full rather than left as a blank box: the screen hides the
     * three statuses that mean the request is over, and a filter nobody can
     * see is one that reads as missing data (4 ก.ย. 2569).
     */
    filterOpen: "งานค้าง · ไม่รวมที่จบแล้ว",
    /** The way out of that default. `filterAll` stays the bare word — it is
        also the "no filter" placeholder of the type box and of งานทั้งหมด. */
    filterAnyStatus: "ทั้งหมด · รวมที่จบแล้ว",
    filterAll: "ทั้งหมด",
    onlyOverdue: "เฉพาะเกินกำหนด",
    columns: {
      requestNo: "เลขที่คำขอ",
      typeRef: "ประเภท · อ้างอิง",
      status: "สถานะ",
      currentStep: "ขั้นปัจจุบัน",
      dueAt: "ครบกำหนด",
      actions: "การดำเนินการ",
      requester: "ผู้ขอ",
      receiver: "ผู้รับเรื่อง",
    },
    /**
     * SCOPE-02 — the first tab shows what this viewer may see and nothing more.
     * Printed under the heading so a short list is not mistaken for missing
     * data.
     */
    scopeNote:
      "หน้านี้แสดงเฉพาะงานที่คุณเกี่ยวข้อง — คำขอของฉัน คำขอที่ฉันรับเรื่อง และคำขอที่รออนุมัติจากฉัน",
    empty: "ยังไม่มีคำขอ",
    emptyApprovals: "ไม่มีรายการรออนุมัติ",
    clockPaused: "นาฬิกาหยุด",
    overdueBy: (text: string) => `เกิน ${text}`,
    dueIn: (text: string) => `เหลือ ${text}`,
    /** A finished request whose clock stopped inside its SLA (`state: met`). */
    onTime: "ทันกำหนด",
    /** REQ-02 issues the number at submit, so a draft has none yet. */
    noNumber: "ยังไม่ออกเลข",
    /** Shown under the assignee when the ticket was handed on from someone else. */
    handedFrom: (name: string) => `รับเรื่องเดิม: ${name}`,
    step: (current: number, total: number) => `ขั้น ${current}/${total}`,
    status: {
      draft: "ร่าง",
      submitted: "รอรับ",
      pending_approval: "รออนุมัติ",
      returned: "ตีกลับ",
      approved: "อนุมัติแล้ว",
      rejected: "ไม่อนุมัติ",
      in_progress: "กำลังดำเนินการ",
      on_hold: "พักไว้",
      completed: "เสร็จสิ้น",
      closed: "ปิดคำขอแล้ว",
      cancelled: "ยกเลิก",
    } as Record<string, string>,
  },

  /*
    §16 A1 — now the two approval tabs of a request type rather than a screen.
    The stage labels that used to head it, and its own title and subtitle, went
    with the screen: `requestTypes.tabApproval*` names the two moments a request
    can be checked, and the type is named by the card the tabs sit in.
  */
  matrix: {
    empty: "ยังไม่ได้ตั้งค่าตารางอำนาจอนุมัติ",
    /**
     * Shown in place of the ladder to a viewer without
     * `admin.approval-matrix.manage` — one permission covers both reading and
     * publishing, so the tab has nothing it may fetch.
     */
    noPermission: "ไม่มีสิทธิ์ดูตารางอำนาจอนุมัติ",
    emptyForSubject:
      "ประเภทงานนี้ยังไม่มีตารางอำนาจอนุมัติ — กด “สร้างเวอร์ชันใหม่” เพื่อเริ่ม",

    version: "เวอร์ชัน",
    effectiveFrom: "มีผลตั้งแต่",
    draft: "ฉบับร่าง",
    /**
     * §16 writes the ladder in force as `เวอร์ชัน 2 (ปัจจุบัน)` — one line, not
     * a version number with a separate "in force" badge beside it.
     */
    currentSuffix: "(ปัจจุบัน)",
    /**
     * §16 A1's own words.
     *
     * Suggestion: `เผยแพร่` (publish) describes the API more accurately than
     * `สร้าง` (create) — a version is *published*, and the publish is what
     * reaches the audit log. §16 wins here because the mockup is the copy
     * specification; say the word and this becomes `เผยแพร่เวอร์ชันใหม่`.
     */
    publishNew: "สร้างเวอร์ชันใหม่",
    /* CD-80 — end a ladder without editing any version. */
    retire: "ยกเลิกขั้นอนุมัตินี้",
    retireConfirm:
      "ยกเลิกขั้นอนุมัตินี้? คำขอที่ยื่นหลังจากนี้จะไม่ผ่านขั้นนี้ — คำขอที่อยู่ระหว่างอนุมัติยังใช้เวอร์ชันเดิมจนจบ",
    retired: "ยกเลิกขั้นอนุมัติแล้ว",
    retiredTitle: (on: string) => `ยกเลิกขั้นอนุมัตินี้แล้ว ตั้งแต่ ${on}`,
    retiredHint:
      "คำขอใหม่ไม่ผ่านขั้นนี้ — กด “สร้างเวอร์ชันใหม่” เพื่อเปิดขั้นอนุมัตินี้อีกครั้ง",
    retiredSummary: "ยกเลิกขั้นอนุมัติ",
    /**
     * §16 splits what used to be one sentence: immutability stays here, while
     * "งานที่เดินอยู่ใช้เวอร์ชัน ณ ขณะยื่น" becomes rule 3 of `alwaysEnforced`.
     */
    immutableNote: "เวอร์ชันที่ประกาศแล้วแก้ทับไม่ได้ — ต้องสร้างเวอร์ชันใหม่",
    saved: "เผยแพร่แล้ว",
    currency: "สกุลเงิน",
    createdBy: "สร้างโดย",
    /**
     * §8.1 amendment — a ladder is a list of levels, not amount bands. The
     * wording follows the chart: Company → Division → Department → ตำแหน่ง.
     */
    supervisorLevel: {
      1: "หัวหน้าหน่วยงานที่สังกัด",
      2: "หัวหน้าแผนก",
      3: "หัวหน้าฝ่าย",
      4: "ผู้บริหารบริษัท",
    } as Record<number, string>,
    levelSupervisor: "หัวหน้าทีม",
    levelOrg: "ตามตำแหน่งงาน",
    levelUp: "หัวหน้าชั้นไหน",
    levelChartOf: "หัวหน้าของใคร",
    chartOfRequester: "ผู้ขอ",
    chartOfWorker: "ผู้ทำงาน",
    levelUpHint:
      "นับจากหน่วยงานที่ผู้ยื่นสังกัดขึ้นไป · ชั้นที่ยังไม่ตั้งหัวหน้า ระบบจะไต่ขึ้นต่อ",
    levelGroups: "หน่วยงานที่มีสิทธิ์อนุมัติ",
    levelPeople: "ผู้อนุมัติในหน่วยงานที่เลือก",
    levelPeopleHint:
      "ไม่เลือก = หัวหน้าของหน่วยงานที่เลือก · เลือกหลายคนได้ ใครอนุมัติก็ผ่าน",
    addLevel: "+ เพิ่มชั้นอนุมัติ",
    levelMode: "ต้องอนุมัติ",
    modeAny: "คนใดคนหนึ่ง",
    modeAll: "ครบทุกคน",
    levelNote: "บังคับเหตุผล",
    noteAlways: "ทุกการตัดสิน",
    noteRejectOnly: "เฉพาะไม่อนุมัติ/ส่งกลับ",
    levelSla: "เวลาอนุมัติ (ชม.)",
    levelSlaHint: "เกินแล้วเตือนผู้อนุมัติ และแจ้งหัวหน้าเมื่อเกินอีกครึ่งหนึ่งของเวลา",
    levelCondition: "ใช้ชั้นนี้เมื่อ",
    conditionAlways: "ทุกครั้ง",
    addCondition: "ใส่เงื่อนไข",
    removeCondition: "ใช้ทุกครั้ง",
    conditionHint: "ไม่เข้าเงื่อนไข = ข้ามชั้นนี้ (บันทึกไว้ว่าข้ามเพราะอะไร)",
    startOver: "เริ่มใหม่",
    copiedFromCurrent: (version: number) => `เริ่มจากชั้นของ v${version} ที่ใช้อยู่ — แก้แล้ว publish เป็น version ใหม่`,
    meaningSupervisor: "ไต่ตามผังทีมของผู้ยื่นในขณะนั้น",
    meaningGroupHeads: (groups: string) => `หัวหน้าของ ${groups}`,
    columns: {
      level: "ระดับ",
      approvers: "ผู้อนุมัติ",
      meaning: "ความหมาย",
    },

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
    historyTierAdded: (level: string) => `เพิ่มชั้นที่ ${level}`,
    historyTierRemoved: (level: string) => `ตัดระดับ ${level}`,
    historyChainChanged: (level: string) => `ปรับสายอนุมัติ ${level}`,
    historyNoChange: "ไม่เปลี่ยนสายอนุมัติ",
  },
  /** CD-75 — บันทึกการเข้าพบจากมือถือ. */
  visitLog: {
    title: "บันทึกการเข้าพบ",
    subtitle: "บันทึกทันทีหลังออกจากที่ลูกค้า — สรุปการประชุม รูป และนัดติดตาม",
    deal: "โอกาสการขาย",
    dealPlaceholder: "ค้นหาดีลของคุณ",
    pickDeal: "เลือกโอกาสการขายก่อน",
    noDeals: "คุณยังไม่มีโอกาสการขายที่เปิดอยู่",
    what: "ทำอะไร",
    types: {
      meeting: "เข้าพบ/ประชุม",
      call: "โทร",
      note: "บันทึก",
    } as Record<string, string>,
    subject: "หัวข้อ",
    defaultSubject: {
      meeting: "เข้าพบลูกค้า",
      call: "โทรคุยกับลูกค้า",
      note: "บันทึกเพิ่มเติม",
      email: "อีเมล",
      task: "งาน",
    } as Record<string, string>,
    summary: "สรุปการประชุม",
    summaryPlaceholder: "คุยเรื่องอะไร ลูกค้าต้องการอะไร ตกลงอะไรกันไว้",
    photos: "รูป",
    takePhoto: (count: number) =>
      count ? `ถ่าย/เลือกรูปเพิ่ม (${count}/10)` : "ถ่ายรูป / เลือกรูป",
    removePhoto: "เอารูปออก",
    followUp: "นัดติดตามครั้งถัดไป (ถ้ามี)",
    followUpDate: "วันที่นัด",
    defaultFollowUp: "ติดตามลูกค้า",
    save: "บันทึก",
    saved: "บันทึกการเข้าพบแล้ว",
    photosFailed: (count: number, reason: string) =>
      `แนบรูปไม่สำเร็จ ${count} รูป (${reason}) — แนบเพิ่มได้ที่หน้าดีล`,
    followUpFailed: (reason: string) => `ตั้งนัดติดตามไม่สำเร็จ: ${reason}`,
    openDeal: "เปิดหน้าดีล",
    logAnother: "บันทึกอีกรายการ",
  },

  /** CD-84 — ส่งมอบงานต่อจากฝ่ายขาย. */
  handover: {
    /** CD-144 — ชุดเอกสารเทคนิคของ Solution ที่อนุมัติแล้ว */
    technical: {
      title: (title: string, version: number) =>
        `ชุดเอกสารเทคนิค · ${title} เวอร์ชัน ${version} (อนุมัติแล้ว)`,
      preview: "จะแนบไปกับงานส่งมอบนี้",
      missing:
        "ดีลนี้มี Solution แต่ยังไม่มีเวอร์ชันที่อนุมัติ — ขออนุมัติ Solution ก่อนจึงส่งมอบได้",
      summary: "สรุปทางออก",
      design: "รายละเอียดการออกแบบ",
      inScope: "งานในขอบเขต",
      outOfScope: "งานนอกขอบเขต",
      deliverables: "รายการส่งมอบและเกณฑ์ตรวจรับ",
      criterion: "ตรวจรับ",
      assumptions: "สมมติฐานการออกแบบ",
      requirements: "ผลวิเคราะห์ความต้องการ",
      customerAnswer: "ลูกค้าตอบ",
      files: "ไฟล์แบบ",
      none: "—",
      openSolution: "เปิดหน้า Solution",
    },
    cardTitle: "ส่งมอบงานต่อ",
    notWon: "ส่งมอบงานได้เมื่อโอกาสการขายชนะแล้ว (เปิดใบสั่งขายแล้ว)",
    intro:
      "ยืนยันทุกรายการก่อนส่งงานให้ทีมถัดไป — รายการที่มีเครื่องหมาย * ต้องกรอกรายละเอียด ไม่ครบส่งไม่ได้",
    noItems: "ยังไม่ได้ตั้งรายการตรวจ — ผู้ดูแลตั้งได้ที่ ตั้งค่า CRM",
    categories: {
      commercial: "ข้อมูลการค้า",
      requirement: "ความต้องการลูกค้า",
      commitment: "สิ่งที่รับปากไว้",
    } as Record<string, string>,
    team: "ทีมที่รับงาน",
    teamPlaceholder: "เลือกทีม",
    detailPlaceholder: "รายละเอียด",
    note: "หมายเหตุถึงทีมที่รับ",
    saveDraft: "บันทึกร่าง",
    submit: "ส่งมอบงาน",
    submitted: "ส่งมอบงานแล้ว",
    draftSaved: "บันทึกร่างแล้ว",
    progress: (done: number, total: number) => `ครบ ${done}/${total} รายการ`,
    status: {
      draft: "ร่าง",
      submitted: "รอทีมรับ",
      accepted: "ทีมรับแล้ว",
      returned: "ถูกตีกลับ",
    } as Record<string, string>,
    statusColor: {
      draft: "default",
      submitted: "gold",
      accepted: "green",
      returned: "orange",
    } as Record<string, string>,
    sentTo: (team: string, at: string, round: number) =>
      `ส่งให้ ${team} เมื่อ ${at}` + (round > 1 ? ` (ครั้งที่ ${round})` : ""),
    returnedBecause: (who: string, reason: string) =>
      `${who} ตีกลับ: ${reason}`,
    acceptedBy: (who: string, at: string) => `${who} รับงานเมื่อ ${at}`,
    history: "ประวัติ",
    historyAction: {
      submitted: "ส่งมอบ",
      accepted: "รับงาน",
      returned: "ตีกลับ",
    } as Record<string, string>,
    // inbox
    title: "งานส่งมอบ",
    subtitle: "งานที่ฝ่ายขายส่งต่อมาให้ทีมของคุณ และงานที่คุณส่งไป",
    boxIncoming: "ส่งถึงทีมของฉัน",
    boxSent: "ที่ฉันส่ง",
    allStatuses: "ทุกสถานะ",
    empty: "ไม่มีงานส่งมอบ",
    columns: {
      deal: "โอกาสการขาย",
      customer: "ลูกค้า",
      team: "ทีมที่รับ",
      owner: "ผู้ขาย",
      status: "สถานะ",
      updated: "อัปเดต",
    },
    open: "เปิด",
    accept: "รับงาน",
    accepted: "รับงานแล้ว",
    returnWork: "ตีกลับ",
    returnReason: "เหตุผลที่ตีกลับ (ฝ่ายขายจะเห็น)",
    returnReasonRequired: "ต้องระบุเหตุผล",
    cancel: "ยกเลิก",
    returned: "ตีกลับแล้ว",
    openDeal: "เปิดหน้าดีล",
    amount: "มูลค่า",
  },

  /** CD-54 — ถ้อยคำการแจ้งเตือนต่อเหตุการณ์. */
  notificationTemplates: {
    title: "ข้อความแจ้งเตือน",
    subtitle: (company: string) =>
      `ถ้อยคำที่ระบบใช้แจ้งเตือนแต่ละเหตุการณ์ ของบริษัท ${company} — แก้แล้วมีผลกับการแจ้งเตือนครั้งถัดไป ไม่ต้องแก้โปรแกรม`,
    customTag: "แก้แล้ว",
    usingStandard: "ใช้ข้อความมาตรฐาน",
    customSince: (at: Date) =>
      `ข้อความของบริษัท · แก้ล่าสุด ${at.toLocaleString("th-TH")}`,
    titleLabel: "หัวข้อ",
    bodyLabel: "ข้อความ",
    variablesHint:
      "ตัวแปรที่ใช้ได้ (คลิกเพื่อเพิ่มท้ายข้อความ) — ใช้ตัวอื่นไม่ได้",
    preview: "ตัวอย่าง (ค่าสมมติ)",
    emailSignature: (company: string) =>
      `อีเมลจะลงท้ายด้วยหัวจดหมายของ ${company} (ตั้งที่หน้า ตั้งค่า CRM)`,
    save: "บันทึก",
    saved: "บันทึกข้อความแล้ว",
    discard: "ยกเลิกการแก้",
    reset: "กลับไปใช้ข้อความมาตรฐาน",
    resetConfirm: "ลบข้อความของบริษัทนี้และกลับไปใช้ข้อความมาตรฐาน?",
    resetDone: "กลับไปใช้ข้อความมาตรฐานแล้ว",
    standardIs: (title: string) => `ข้อความมาตรฐาน: “${title}”`,
  },

  /** CD-53 — กติกาแจ้งเตือนจากเหตุการณ์ ต่อบริษัท. */
  /** CD-132 — ออกแบบ Solution (Pre-Sales) */
  presales: {
    title: "ออกแบบ Solution",
    deal: "โอกาสการขาย",
    request: "คำขอ",
    brief: "โจทย์จากฝ่ายขาย",
    briefEmpty: "คำขอไม่มีรายละเอียดโจทย์",
    briefFields: {
      requirement: "ความต้องการ",
      scope: "ขอบเขต",
      site: "ไซต์",
      timeline: "กำหนดเวลา",
      decision_maker: "ผู้ตัดสินใจ",
      budget_range: "กรอบงบประมาณ",
      constraints: "ข้อจำกัด",
      competitors: "คู่แข่ง",
      needs_demo: "ต้องการสาธิต",
    } as Record<string, string>,
    version: (no: number) => `เวอร์ชัน ${no}`,
    versionStatus: {
      draft: "ร่าง",
      locked: "ยืนยันแล้ว",
      superseded: "ถูกแทนแล้ว",
    } as Record<string, string>,
    changeNote: "เหตุที่แก้",
    readOnly: "ดูอย่างเดียว — แก้ได้เฉพาะทีม Pre-Sales",
    lockedHint: "เวอร์ชันนี้ยืนยันแล้ว แก้ไม่ได้ — ถ้าต้องเปลี่ยนให้เปิดเวอร์ชันใหม่",
    solutionTitle: "ชื่อ Solution",
    summary: "สรุปทางออก",
    summaryPlaceholder: "ทางออกที่เสนอในไม่กี่บรรทัด",
    design: "รายละเอียดการออกแบบ",
    designPlaceholder: "สถาปัตยกรรม อุปกรณ์ วงจร การติดตั้ง …",
    assumptions: "สมมติฐานการออกแบบ",
    assumptionsHint: "ทุกข้อจะติดไปกับข้อเสนอและสัญญา",
    assumptionsEmpty: "ยังไม่มีสมมติฐาน",
    addAssumption: "เพิ่มสมมติฐาน",
    assumptionCategory: "หมวด",
    assumptionText: "สมมติฐาน",
    categories: {
      technical: "ทางเทคนิค",
      customer: "สิ่งที่ต้องพึ่งพาลูกค้า",
      third_party: "สิ่งที่ต้องพึ่งพาบุคคลที่สาม",
      commercial: "เชิงพาณิชย์",
      constraint: "ข้อจำกัด",
    } as Record<string, string>,
    /** CD-133 — สิ่งที่ต้องพึ่งพา: ใครรับผิดชอบ ภายในเมื่อไร */
    assumptionOwner: "ผู้รับผิดชอบ",
    assumptionNeededBy: "ต้องพร้อมภายใน",
    assumptionOwnerPlaceholder: "เช่น ฝ่ายไอทีลูกค้า / ISP",
    /** CD-133 — ประเมินความเป็นไปได้ */
    feasibility: {
      title: "ความเป็นไปได้",
      hint: "ผลประเมินรวมของเวอร์ชันนี้ — ต้องประเมินก่อนยืนยัน · ไม่เป็นไปได้ยืนยันเพื่อบันทึกผลได้แต่ขออนุมัติไม่ได้ · สิ่งที่ต้องพึ่งพาลูกค้า/บุคคลที่สามกับข้อจำกัด บันทึกในสมมติฐานด้านล่าง แล้วจะไปอยู่ในคำขอสัญญา",
      verdicts: {
        unassessed: "ยังไม่ประเมิน",
        feasible: "เป็นไปได้",
        conditional: "เป็นไปได้แบบมีเงื่อนไข",
        not_feasible: "ไม่เป็นไปได้",
      } as Record<string, string>,
      notePlaceholder: {
        unassessed: "",
        feasible: "หมายเหตุ (ไม่บังคับ)",
        conditional: "เงื่อนไขที่ทำให้เป็นไปได้ (บังคับ)",
        not_feasible: "เหตุผลที่ไม่เป็นไปได้ (บังคับ)",
      } as Record<string, string>,
    },
    files: "ไฟล์แบบ",
    filesEmpty: "ยังไม่มีไฟล์",
    upload: "แนบไฟล์ (≤ 25 MB)",
    removeFile: "เอาออก",
    save: "บันทึกร่าง",
    saved: "บันทึกร่างแล้ว",
    lock: "ยืนยันเวอร์ชันนี้",
    lockConfirm:
      "ยืนยันแล้วจะแก้เวอร์ชันนี้ไม่ได้อีก — ถ้าต้องเปลี่ยนต้องเปิดเวอร์ชันใหม่ ยืนยันไหม?",
    locked: "ยืนยันเวอร์ชันแล้ว",
    unsaved: "มีการแก้ที่ยังไม่บันทึก — บันทึกร่างก่อนยืนยัน",
    newVersion: "เปิดเวอร์ชันใหม่",
    newVersionNote: "ทำไมต้องแก้ (เห็นในประวัติเวอร์ชัน)",
    newVersionOk: "เปิดเวอร์ชัน",
    history: "ประวัติเวอร์ชัน",
    lockedAt: "ยืนยันเมื่อ",
    start: "เริ่มออกแบบ Solution",
    open: (no: number) => `เปิด Solution (เวอร์ชัน ${no})`,
    startHint: "คำขอนี้คือโจทย์ Solution — เริ่มออกแบบได้หลังรับเรื่อง",
    cardTitle: "Solution",

    /** CD-134 — ขอบเขตงาน (SOW) */
    sow: {
      title: "ขอบเขตงาน (SOW)",
      hint: "ล็อกไปพร้อมเวอร์ชัน — สัญญาและการส่งมอบอ้างอิงขอบเขตนี้; ยืนยันเวอร์ชันได้เมื่อมีงานในขอบเขต และทุกรายการส่งมอบมีเกณฑ์ตรวจรับ",
      inScope: "งานในขอบเขต",
      outOfScope: "งานนอกขอบเขต",
      inScopePlaceholder: "งานที่รวมอยู่ในข้อเสนอ",
      outOfScopePlaceholder: "งานที่ไม่รวม (ลูกค้าทำเองหรือเสนอแยก)",
      addLine: "เพิ่มข้อ",
      none: "—",
      deliverables: "รายการส่งมอบ",
      addDeliverable: "เพิ่มรายการส่งมอบ",
      noDeliverables: "ยังไม่มีรายการส่งมอบ",
      deliverableTitle: "ชื่อรายการส่งมอบ",
      deliverableDescription: "รายละเอียด (ไม่บังคับ)",
      criteria: "เกณฑ์ตรวจรับ",
      criterionPlaceholder: "ลูกค้าตรวจรับเมื่อ …",
      addCriterion: "เพิ่มเกณฑ์",
      noCriteria: "ยังไม่มีเกณฑ์ตรวจรับ",
      remove: "เอาออก",
    },

    /** CD-143 — อนุมัติ Solution */
    approval: {
      label: "การอนุมัติ",
      statuses: {
        none: "ยังไม่ขออนุมัติ",
        pending: "รออนุมัติ",
        approved: "อนุมัติแล้ว",
        rejected: "ไม่อนุมัติ",
        cancelled: "ยกเลิกคำขอ",
      } as Record<string, string>,
      request: "ขออนุมัติ Solution",
      requestHint:
        "จะสร้างร่างคำขอ “ขออนุมัติ Solution” พร้อมสรุป ขอบเขตงาน และสมมติฐานของเวอร์ชันนี้ — แนบเอกสารเพิ่มแล้วกดยื่นที่หน้าคำขอ",
      requestOk: "สร้างร่างคำขอ",
      openRequest: (no: string) => `เปิดคำขอ ${no}`,
      draftRequest: "ร่าง",
      approvedHint: "เวอร์ชันนี้อนุมัติแล้ว — เสนอลูกค้าได้ · ถ้าต้องแก้ให้เปิดเวอร์ชันใหม่แล้วขออนุมัติใหม่",
      notConfigured: "ยังไม่ได้ตั้งประเภทคำขอ “ขออนุมัติ Solution” ในตั้งค่า CRM",
    },

    /** CD-136 — ประมาณต้นทุน */
    cost: {
      title: "ประมาณต้นทุน",
      hint: "ต้นทุนต่อบรรทัด BOQ มาจากใบเสนอราคาคู่ค้าล่าสุดของบรรทัดนั้น ถ้าไม่มีใช้ต้นทุนอ้างอิง · แรงงาน = manday × อัตราตามบทบาทในตั้งค่า (จนกว่าจะมีโมดูล HR) · ครบทุกบรรทัด + เวอร์ชันอนุมัติแล้ว = พร้อมส่ง Pricing",
      materials: "วัสดุ/อุปกรณ์",
      labor: "แรงงาน",
      total: "รวม",
      complete: "ครบทุกบรรทัด",
      incomplete: (missing: number) => `ยังไม่มีต้นทุน ${missing} บรรทัด`,
      expired: (count: number) => `ราคาหมดอายุ ${count} บรรทัด`,
      line: "รายการ",
      quantity: "จำนวน",
      unitCost: "ต้นทุน/หน่วย",
      lineTotal: "รวม",
      source: "ที่มา",
      fromQuote: (vendor: string) => `ใบเสนอราคา ${vendor}`,
      fromReference: "ต้นทุนอ้างอิง",
      noCost: "ยังไม่มีต้นทุน",
      expiredTag: "หมดอายุ",
      laborTitle: "ต้นทุนแรงงาน",
      role: "บทบาท",
      mandays: "manday",
      rate: "อัตรา/manday",
      note: "หมายเหตุ",
      addLabor: "เพิ่มบรรทัด",
      saveLabor: "บันทึกแรงงาน",
      noRates: "ยังไม่ได้ตั้งอัตราต้นทุนแรงงาน — ตั้งได้ที่ ตั้งค่า CRM",
      saved: "บันทึกแล้ว",
      quotes: "ใบเสนอราคาจากคู่ค้า",
      quotesEmpty: "ยังไม่มีใบเสนอราคาจากคู่ค้า",
      addQuote: "บันทึกใบเสนอราคา",
      editQuote: "แก้ใบเสนอราคา",
      vendorName: "คู่ค้า",
      vendorCode: "รหัสผู้ขายใน SAP",
      quoteNo: "เลขที่ใบเสนอราคา",
      quoteDate: "วันที่",
      validUntil: "ใช้ได้ถึง",
      priceLines: "ราคาต่อหน่วยของบรรทัด BOQ (เว้นว่าง = ไม่ได้เสนอ)",
      attach: "แนบไฟล์",
      removeQuote: "เอาใบเสนอราคาออก?",
      requestQuote: "ขอราคาจากคู่ค้า",
      requestHint: "เลือกบรรทัด BOQ ที่ต้องการราคา — จะสร้างร่างคำขอ “ขอราคาจากคู่ค้า” ให้จัดซื้อ",
      requestOk: "สร้างร่างคำขอ",
      frozen: "เวอร์ชันนี้ถูกแทนแล้ว — ต้นทุนแก้ไม่ได้",
      save: "บันทึก",
    },

    /** CD-135 — BOQ / BOM */
    boq: {
      title: "BOQ / BOM",
      hint: "อุปกรณ์ วัสดุ ซอฟต์แวร์ และงานบริการ พร้อมรหัสสินค้าจาก SAP — ล็อกไปพร้อมเวอร์ชัน · ยืนยันได้เมื่อทุกบรรทัดมีรหัสสินค้าที่ยังขายอยู่ (จุดส่งต่อที่ 3 → Pricing) · บรรทัดที่ไม่มีต้นทุนอ้างอิงถูกทำเครื่องหมาย",
      summary: (noCode: number, noCost: number, total: string) =>
        `ไม่มีรหัส ${noCode} · ไม่มีต้นทุนอ้างอิง ${noCost} · รวมต้นทุนอ้างอิง ${total}`,
      empty: "ยังไม่มีรายการ",
      add: "เพิ่มบรรทัด",
      remove: "เอาออก",
      kind: "ประเภท",
      kinds: {
        equipment: "อุปกรณ์",
        material: "วัสดุ",
        software: "ซอฟต์แวร์",
        service: "งานบริการ",
      } as Record<string, string>,
      productCode: "รหัสสินค้า (SAP)",
      noCode: "ไม่มีรหัส",
      name: "รายการ",
      description: "รายละเอียด (ไม่บังคับ)",
      model: "รุ่น / เวอร์ชัน",
      quantity: "จำนวน",
      unit: "หน่วย",
      refUnitCost: "ต้นทุนอ้างอิง/หน่วย",
      noCost: "ยังไม่มีต้นทุน",
      pricingReady: (no: number) => `พร้อมส่ง Pricing (v${no})`,
    },

    /** CD-138 — TOR / RFP */
    tor: {
      title: "TOR / RFP",
      hint: "เก็บ TOR ต้นฉบับ แตกเป็นข้อกำหนดรายข้อ แล้วตอบทีละข้อ — ข้อบังคับที่ยังไม่ตอบหรือไม่เป็นไปตาม ขออนุมัติ Solution ไม่ได้ (และส่งข้อเสนอไม่ได้)",
      summary: (answered: number, mandatory: number, partial: number) =>
        `ข้อบังคับตอบแล้ว ${answered}/${mandatory}${partial ? ` · บางส่วน ${partial}` : ""}`,
      facts: "ข้อมูลหลัก",
      buyer: "ผู้ซื้อ / หน่วยงาน",
      projectNo: "เลขโครงการ / e-GP",
      submissionDeadline: "กำหนดยื่นข้อเสนอ",
      bidBond: "หลักประกันซอง",
      note: "หมายเหตุ",
      saveFacts: "บันทึกข้อมูลหลัก",
      saved: "บันทึกแล้ว",
      files: "ไฟล์ TOR ต้นฉบับ",
      filesEmpty: "ยังไม่ได้แนบ TOR",
      upload: "แนบไฟล์ (≤ 50 MB)",
      removeFile: "เอาออก",
      clauses: "ข้อกำหนด",
      clausesEmpty: "ยังไม่ได้แตกข้อกำหนด",
      addClause: "เพิ่มข้อ",
      paste: "วางจาก TOR",
      pasteHint: "วางข้อกำหนด ข้อละบรรทัด — เลขข้อนำหน้า (3.2.1, ข้อ 4, (ก)) จะแยกให้ · ทุกข้อเริ่มเป็นข้อบังคับ",
      pasteOk: "เพิ่มทั้งหมด",
      clauseNo: "เลขข้อ",
      text: "ข้อกำหนด",
      mandatory: "บังคับ",
      optional: "ไม่บังคับ",
      compliance: "การตอบ",
      response: "คำตอบ / วิธีที่เป็นไปตาม",
      reference: "อ้างอิง (เช่น SOW ข้อ 2)",
      answer: "ตอบ",
      save: "บันทึก",
      remove: "เอาออก",
      removeConfirm: "เอาข้อกำหนดนี้ออก?",
      gap: "ข้อบังคับค้าง",
      compliances: {
        unanswered: "ยังไม่ตอบ",
        comply: "เป็นไปตาม",
        partial: "บางส่วน",
        not_comply: "ไม่เป็นไปตาม",
      } as Record<string, string>,
      onDeal: (gaps: number) => `TOR ข้อบังคับค้าง ${gaps}`,
    },

    /** CD-139 — Demo / POC */
    demos: {
      title: "Demo / POC",
      hint: "แผน คนที่จอง อุปกรณ์ที่เบิก-คืน ผลตามเกณฑ์ความสำเร็จ และข้อค้นพบ · ปิดได้เมื่อคืนอุปกรณ์ครบ · ข้อค้นพบที่ต้องปรับ Solution ต้องปิดด้วยเวอร์ชันที่ปรับแล้วก่อนขออนุมัติ",
      summary: (planned: number, out: number, findings: number) =>
        `วางแผน ${planned} · อุปกรณ์ยังไม่คืน ${out} · ข้อค้นพบรอปรับ ${findings}`,
      empty: "ยังไม่มี Demo / POC",
      add: "เพิ่ม Demo / POC",
      fromRequest: "จากคำขอ",
      blank: "กรอกเอง (ไม่อ้างคำขอ)",
      requestUsed: "ใช้แล้ว",
      create: "สร้าง",
      kinds: { demo: "Demo", poc: "POC" } as Record<string, string>,
      statuses: {
        planned: "วางแผน",
        done: "จัดแล้ว",
        cancelled: "ยกเลิก",
      } as Record<string, string>,
      titleLabel: "ชื่อ",
      scheduledOn: "วันที่จัด",
      site: "สถานที่",
      people: "คน/ทีมที่จอง",
      plan: "แผนการจัด",
      criteria: "เกณฑ์ความสำเร็จและผล",
      addCriterion: "เพิ่มเกณฑ์",
      criterionPlaceholder: "เกณฑ์ความสำเร็จ",
      notePlaceholder: "ผลที่ได้/หมายเหตุ",
      results: {
        pending: "ยังไม่ได้ผล",
        met: "ผ่าน",
        not_met: "ไม่ผ่าน",
      } as Record<string, string>,
      outcome: "สรุปผล",
      save: "บันทึก",
      saved: "บันทึกแล้ว",
      closeDone: "ปิด — จัดแล้ว",
      closeCancelled: "ยกเลิก",
      closeConfirm: "ปิด Demo/POC นี้? ปิดแล้วแก้แผน/ผลไม่ได้",
      remove: "เอาออก",
      removeConfirm: "เอา Demo/POC นี้ออก?",
      equipment: "อุปกรณ์ที่เบิก",
      equipmentEmpty: "ยังไม่ได้เบิกอุปกรณ์",
      equipmentName: "อุปกรณ์/รุ่น",
      serial: "Serial / เลขครุภัณฑ์",
      quantity: "จำนวน",
      takenBy: "ผู้เบิก",
      outOn: "วันที่เบิก",
      returnedOn: "วันที่คืน",
      notReturned: "ยังไม่คืน",
      checkOut: "เบิก",
      checkIn: "คืนอุปกรณ์",
      findings: "ข้อค้นพบ",
      findingsEmpty: "ยังไม่มีข้อค้นพบ",
      findingPlaceholder: "สิ่งที่พบจากการ Demo/POC",
      requiresChange: "ต้องปรับ Solution",
      addFinding: "เพิ่ม",
      findingOpen: "รอปรับ Solution",
      findingResolved: (no: number) => `ปรับแล้วใน v${no}`,
      resolve: "ปรับแล้ว",
      resolveTitle: "ปิดข้อค้นพบ",
      resolveHint: "เลือกเวอร์ชันที่ปรับตามข้อค้นพบนี้แล้ว — ร่างที่กำลังแก้ หรือเวอร์ชันที่ยืนยันหลังบันทึกข้อค้นพบ",
      resolveOk: "ปิดข้อนี้",
      openRequest: "เปิดคำขอ",
      onDeal: (out: number, findings: number) =>
        [
          out ? `อุปกรณ์ Demo ยังไม่คืน ${out}` : "",
          findings ? `ข้อค้นพบ Demo รอปรับ ${findings}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
    },

    /** CD-141 — ความเสี่ยงทางเทคนิค */
    risks: {
      title: "ความเสี่ยงทางเทคนิค",
      hint: "โอกาสเกิด × ผลกระทบ (1–5) = คะแนน → ระดับ · ความเสี่ยงระดับสูง/วิกฤติที่ยังเปิดต้องมีผู้รับผิดชอบและแนวทางลดก่อนขออนุมัติ · ทะเบียนนี้ส่งต่อเป็นความเสี่ยงของโครงการเมื่อส่งมอบงาน",
      summary: (open: number, openHigh: number, needsPlan: number) =>
        `เปิด ${open} · สูง/วิกฤติ ${openHigh} · ยังไม่มีแผน ${needsPlan}`,
      empty: "ยังไม่มีความเสี่ยง",
      add: "เพิ่มความเสี่ยง",
      edit: "แก้ไข",
      remove: "เอาออก",
      removeConfirm: "เอาความเสี่ยงข้อนี้ออก?",
      save: "บันทึก",
      risk: "ความเสี่ยง",
      titlePlaceholder: "เช่น อุปกรณ์ขาดตลาด ส่งไม่ทันกำหนด",
      description: "รายละเอียด",
      likelihood: "โอกาสเกิด",
      impact: "ผลกระทบ",
      score: "คะแนน",
      owner: "ผู้รับผิดชอบ",
      mitigation: "แนวทางลดความเสี่ยง",
      status: "สถานะ",
      needsPlan: "ต้องมีผู้รับผิดชอบและแนวทางลด",
      scale: {
        1: "1 · น้อยมาก",
        2: "2 · น้อย",
        3: "3 · ปานกลาง",
        4: "4 · สูง",
        5: "5 · สูงมาก",
      } as Record<number, string>,
      levels: {
        low: "ต่ำ",
        medium: "ปานกลาง",
        high: "สูง",
        critical: "วิกฤติ",
      } as Record<string, string>,
      statuses: {
        open: "เปิด",
        mitigated: "ลดแล้ว",
        accepted: "ยอมรับ",
        closed: "ปิด",
      } as Record<string, string>,
      onDeal: (openHigh: number, needsPlan: number) =>
        needsPlan
          ? `ความเสี่ยงสูงยังไม่มีแผน ${needsPlan}`
          : `ความเสี่ยงสูง ${openHigh}`,
    },

    /** CD-140 — ชี้แจงประเด็นเทคนิค */
    clarifications: {
      title: "ชี้แจงประเด็นเทคนิค",
      hint: "คำถาม-คำตอบทางเทคนิคกับลูกค้าเป็นรายข้อ — คำตอบที่กระทบขอบเขตต้องแก้ SOW ในเวอร์ชันใหม่ (หรือร่าง) แล้วปิดด้วยเลขเวอร์ชันนั้น ก่อนขออนุมัติ",
      summary: (awaiting: number, scopeOpen: number) =>
        `รอคำตอบ ${awaiting} · รอแก้ SOW ${scopeOpen}`,
      empty: "ยังไม่มีคำถาม",
      ask: "เพิ่มคำถาม",
      questionPlaceholder: "คำถามทางเทคนิคถึงลูกค้า",
      askedOn: "วันที่ถาม",
      question: "คำถาม",
      answer: "คำตอบ",
      respondent: "ผู้ตอบ (ชื่อ · ตำแหน่ง)",
      answeredOn: "วันที่ตอบ",
      affectsScope: "คำตอบนี้กระทบขอบเขตงาน (ต้องแก้ SOW)",
      scope: "ขอบเขต",
      scopeOpen: "รอแก้ SOW",
      scopeResolved: (no: number) => `แก้ใน v${no}`,
      awaiting: "รอคำตอบ",
      recordAnswer: "บันทึกคำตอบ",
      editQuestion: "แก้คำถาม",
      resolve: "แก้ SOW แล้ว",
      resolveTitle: "ปิดข้อที่กระทบขอบเขต",
      resolveHint: "เลือกเวอร์ชันที่ SOW สะท้อนคำตอบนี้แล้ว — ร่างที่กำลังแก้ หรือเวอร์ชันที่ยืนยันหลังได้คำตอบ",
      resolveOk: "ปิดข้อนี้",
      remove: "เอาออก",
      removeConfirm: "เอาคำถามข้อนี้ออก?",
      save: "บันทึก",
      onDeal: (awaiting: number, scopeOpen: number) =>
        [
          awaiting ? `รอคำตอบเทคนิค ${awaiting}` : "",
          scopeOpen ? `รอแก้ SOW ${scopeOpen}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
    },

    /** CD-131 — วิเคราะห์ความต้องการ */
    analysis: {
      title: "วิเคราะห์ความต้องการ",
      hint: "แยกความต้องการเชิงธุรกิจกับเชิงเทคนิค แล้วประเมินทีละข้อ — ยืนยันเวอร์ชันไม่ได้ถ้ายังมีข้อที่ยังไม่ประเมินหรือยังรอลูกค้าตอบ",
      empty: "ยังไม่มีความต้องการ",
      add: "เพิ่มความต้องการ",
      addOk: "เพิ่ม",
      kind: "ประเภท",
      text: "ความต้องการ",
      assessment: "ผลประเมิน",
      note: "หมายเหตุ / คำถามถึงลูกค้า",
      answer: "คำตอบของลูกค้า",
      edit: "แก้ไข / ประเมิน",
      save: "บันทึก",
      remove: "เอาออก",
      removeConfirm: "เอาความต้องการข้อนี้ออก?",
      recordAnswer: "บันทึกคำตอบลูกค้า",
      answerOk: "บันทึกคำตอบ",
      notePlaceholder: {
        feasible: "วิธีที่จะทำ (ไม่บังคับ)",
        not_feasible: "เหตุผลที่ทำไม่ได้ (บังคับ)",
        needs_info: "สิ่งที่ต้องถามลูกค้า (บังคับ)",
        unassessed: "",
      } as Record<string, string>,
      kinds: {
        business: "เชิงธุรกิจ",
        technical: "เชิงเทคนิค",
      } as Record<string, string>,
      assessments: {
        unassessed: "ยังไม่ประเมิน",
        feasible: "ทำได้",
        not_feasible: "ทำไม่ได้",
        needs_info: "ต้องขอข้อมูลลูกค้า",
      } as Record<string, string>,
      waitingAnswer: "รอลูกค้าตอบ",
      summary: (feasible: number, notFeasible: number, waiting: number, unassessed: number) =>
        `ทำได้ ${feasible} · ทำไม่ได้ ${notFeasible} · รอลูกค้าตอบ ${waiting} · ยังไม่ประเมิน ${unassessed}`,
      waitingOnDeal: (count: number) => `รอลูกค้าตอบ ${count} ข้อ`,
    },
  },

  notificationRules: {
    title: "กติกาแจ้งเตือน",
    subtitle: (company: string) =>
      `เงื่อนไขที่ระบบใช้เตือนล่วงหน้าหรือเตือนเมื่อเลยกำหนด ของบริษัท ${company} — รวมไว้ที่เดียว แก้แล้วมีผลในรอบตรวจถัดไป ไม่ต้องแก้โปรแกรม`,
    moduleCrm: "งานขาย / ลูกค้า",
    moduleFinance: "การเงิน",
    enabled: "เปิดใช้",
    off: "ปิดอยู่",
    customTag: "ตั้งเอง",
    standardTag: "ค่ามาตรฐาน",
    recipients: "ส่งถึง",
    events: "ข้อความที่ใช้",
    editWording: "แก้ถ้อยคำที่หน้าข้อความแจ้งเตือน",
    standardIs: (text: string) => `มาตรฐาน: ${text}`,
    daysSuffix: "วัน",
    addStep: "เพิ่มขั้น",
    removeStep: "ลบขั้นนี้",
    save: "บันทึก",
    saved: "บันทึกกติกาแล้ว",
    discard: "ยกเลิกการแก้",
    reset: "กลับไปใช้ค่ามาตรฐาน",
    resetConfirm: "ลบค่าที่บริษัทนี้ตั้งไว้ และกลับไปใช้ค่ามาตรฐาน?",
    resetDone: "กลับไปใช้ค่ามาตรฐานแล้ว",
    updatedAt: (at: Date) => `แก้ล่าสุด ${at.toLocaleString("th-TH")}`,
    slaTitle: "เตือนใกล้ครบกำหนด / เกินกำหนดของคำขอ (SLA)",
    slaBody: "ตั้งต่อประเภทคำขอ เพราะแต่ละประเภทมีเวลามาตรฐานต่างกัน —",
    slaLink: "ไปที่หน้าตั้งค่า SLA",
  },

  /** CD-55 — ส่งถึงใคร เมื่อไร ช่องทางใด อ่านแล้วหรือยัง. */
  notificationLog: {
    title: "บันทึกการแจ้งเตือน",
    subtitle:
      "ทุกการแจ้งเตือนที่ระบบส่ง — ส่งถึงใคร เมื่อไร ช่องทางใด และเปิดอ่านแล้วหรือยัง ใช้อ้างอิงเมื่อมีข้อโต้แย้งว่าไม่เคยได้รับแจ้ง",
    searchPlaceholder: "ผู้รับ (ชื่อ / username / อีเมล) หรือหัวข้อ",
    anyEvent: "ทุกเหตุการณ์",
    anyRead: "สถานะการอ่านทั้งหมด",
    clear: "ล้างตัวกรอง",
    resultCount: (total: number) =>
      `พบ ${total.toLocaleString("th-TH")} รายการ`,
    empty: "ไม่พบการแจ้งเตือนตามเงื่อนไข",
    unread: "ยังไม่อ่าน",
    readOpened: "เปิดอ่านแล้ว",
    readMarkAll: "กด “อ่านทั้งหมด”",
    readUnknown: "อ่านแล้ว (ไม่ทราบวิธี)",
    resource: "อ้างถึง",
    sameResource: "ดูทุกการแจ้งเตือนของรายการนี้",
    resourceFilter: (type: string, id: string) =>
      `เฉพาะการแจ้งเตือนของ ${type} ${id}`,
    channel: "ช่องทาง",
    target: "ส่งถึง",
    deliveryStatus: "ผลการส่ง",
    sentAt: "เวลา",
    channels: {
      in_app: "ในระบบ",
      email: "อีเมล",
      teams: "Microsoft Teams",
    } as Record<string, string>,
    statuses: {
      sent: "ส่งแล้ว",
      queued: "รอส่ง",
      failed: "ส่งไม่สำเร็จ",
    } as Record<string, string>,
    columns: {
      createdAt: "เวลาที่แจ้ง",
      recipient: "ผู้รับ",
      message: "ข้อความ",
      channels: "ช่องทาง",
      read: "การอ่าน",
    },
    readNote:
      "เวลาอ่านคือครั้งแรกที่อ่าน (ไม่เปลี่ยนเมื่อเปิดซ้ำ) · “เปิดอ่านแล้ว” = ผู้รับกดเปิดข้อความนั้น · “กด อ่านทั้งหมด” = ล้างกระดิ่งทีเดียว ไม่ได้ยืนยันว่าเห็นข้อความ · “ไม่ทราบวิธี” = อ่านก่อนระบบเริ่มบันทึกวิธีอ่าน (28 ก.ย. 2569) · หน้านี้อ่านอย่างเดียว",
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
      actorHint: "ค้นด้วย user id — คัดลอกได้จากหน้าผังทีมและสิทธิ์",
    },
    resultCount: (total: number) =>
      `พบ ${total.toLocaleString("th-TH")} รายการ`,
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
    formLockCompany: "กรองตามบริษัทของผู้ดู",
    formLockCompanyHint:
      "เปิดสำหรับแดชบอร์ดที่อ่าน Data Mart (เช่น ผู้บริหาร · ภาพรวมรายสัปดาห์) — ผู้ดูเห็นเฉพาะข้อมูลบริษัทที่เลือกอยู่และเปลี่ยนไม่ได้ · แดชบอร์ดใน Metabase ต้องมีตัวแปร company ที่ล็อกไว้ (ดู docs/metabase.md) ไม่งั้นจะเปิดไม่ขึ้น",
    lockCompanyTag: "เฉพาะบริษัทผู้ดู",
    saved: "บันทึกแล้ว",
    deactivated: "ปิดใช้งานแดชบอร์ดแล้ว",

    // CD-91 — Data Mart
    martTitle: "Data Mart ยอดขายและคำขอค้าง",
    martHint: (minutes: number) =>
      minutes > 0
        ? `แดชบอร์ดผู้บริหารอ่านข้อมูลที่เตรียมไว้ใน schema mart — ระบบสร้างใหม่ทุก ${minutes} นาที`
        : "แดชบอร์ดผู้บริหารอ่านข้อมูลที่เตรียมไว้ใน schema mart — การสร้างอัตโนมัติปิดอยู่",
    martRefresh: "ปรับปรุงตอนนี้",
    martRefreshed: "ปรับปรุง Data Mart แล้ว",
    martNever: "ยังไม่เคยสร้าง",
    martColumns: {
      table: "ตาราง",
      rows: "จำนวนแถว",
      refreshedAt: "สร้างล่าสุด",
      duration: "ใช้เวลา (ms)",
    },
    martTables: {
      fact_sales: "ยอดขาย (ใบสั่งขาย)",
      fact_pipeline: "Pipeline ดีลที่เปิดอยู่",
      sales_target_actual: "เป้า vs ยอดจริง",
      open_requests: "คำขอค้าง",
      request_backlog_daily: "คำขอค้างรายวัน (วันนี้)",
    } as Record<string, string>,

    // CD-90 — Data Lake
    lakeTitle: "Data Lake (ข้อมูลดิบย้อนหลัง)",
    lakeHint: (minutes: number) =>
      (minutes > 0
        ? `ระบบส่งแถวที่เปลี่ยนจากคำขอ CRM และงานขายลง database แยกทุก ${minutes} นาที (เก็บทุกเวอร์ชัน) และใบแจ้งหนี้ SAP วันละครั้ง`
        : "การส่งอัตโนมัติปิดอยู่ — กดส่งข้อมูลตอนนี้เพื่อส่งแถวที่เปลี่ยน (เก็บทุกเวอร์ชัน)") +
      " — ข้อมูลอ่อนไหว (เนื้อหาฟอร์ม ต้นทุน/margin เลขภาษี ข้อมูลติดต่อ) ไม่ถูกส่ง",
    lakeNotConfigured:
      "ยังไม่ได้ตั้งค่า Data Lake — ผู้ดูแลระบบต้องกำหนด LAKE_DATABASE_URL ใน .env ของ core-service",
    lakeRun: "ส่งข้อมูลตอนนี้",
    lakeRan: "ส่งข้อมูลลง Data Lake แล้ว",
    lakeNever: "ยังไม่เคยส่ง",
    lakeModules: {
      request: "คำขอ",
      crm: "CRM",
      sales: "งานขาย",
      reference: "ข้อมูลอ้างอิง",
      sap: "SAP",
    } as Record<string, string>,
    lakeColumns: {
      table: "ตาราง",
      module: "โมดูล",
      upTo: "ส่งถึง",
      lastRun: "รอบล่าสุด",
      total: "แถวสะสม",
      excluded: "คอลัมน์ที่ไม่ส่ง",
    },
  },

  /** หน้ากุญแจ API ของช่องทางภายนอก (`admin.integration.manage`). */
  erpSync: {
    catalog: {
      title: "รายการสินค้าจาก SAP",
      hint: "ใช้เลือกรหัสสินค้าบนบรรทัดใบเสนอราคา — ดึงจาก SAP เองทุกชั่วโมง",
      counts: (active: number, total: number) =>
        `ขายอยู่ ${active} รายการ (ทั้งหมด ${total})`,
      lastSynced: (when: string) => `ดึงล่าสุด ${when}`,
      never: "ยังไม่เคยดึงจาก SAP — ตอนนี้ยังไม่ตรวจรหัสสินค้าบนใบเสนอราคา",
      syncNow: "ดึงจาก SAP ตอนนี้",
      synced: (r: {
        total: number;
        created: number;
        updated: number;
        deactivated: number;
      }) =>
        `ดึงแล้ว ${r.total} รายการ — ใหม่ ${r.created} · แก้ ${r.updated} · เลิกขาย ${r.deactivated}`,
    },
    title: "คิวส่ง SAP",
    subtitle:
      "ข้อมูลบันทึกใน Connect the Dot ก่อนแล้วค่อยส่งเข้า SAP — งานที่ส่งไม่สำเร็จครบรอบจะหยุดลองเอง แก้ต้นเหตุแล้วกดส่งใหม่ที่นี่",
    filters: {
      failed: (n: number) => `ส่งไม่สำเร็จ · ${n}`,
      pending: (n: number) => `รอส่ง · ${n}`,
      all: "ทั้งหมด",
    },
    refresh: "โหลดใหม่",
    columns: {
      kind: "งาน",
      resource: "รหัส",
      name: "ลูกค้า",
      status: "สถานะ",
      attempts: "ลองแล้ว",
      lastError: "ข้อผิดพลาดล่าสุด",
      when: "อัปเดตล่าสุด",
    },
    kinds: {
      customer_upsert: "ส่งลูกค้า",
      receivables_refresh: "อ่านยอดค้างชำระ",
      sale_order_create: "ส่งใบสั่งขาย",
      sale_order_cancel: "ยกเลิกใบสั่งขาย",
    } as Record<string, string>,
    status: {
      failed: "ส่งไม่สำเร็จ",
      pending: "รอส่ง",
    } as Record<string, string>,
    nextTry: (when: string) => `ลองเองอีกครั้ง ${when}`,
    attempts: (n: number) => `${n} ครั้ง`,
    noError: "—",
    more: "เพิ่มเติม",
    retry: "ส่งใหม่",
    retryConfirm: "เริ่มนับรอบใหม่และส่งเข้า SAP ทันที?",
    retrySucceeded: (code: string) => `ส่ง ${code} เข้า SAP สำเร็จ`,
    retryStillFailing: (code: string, error: string) =>
      `ส่ง ${code} ยังไม่สำเร็จ — ${error}`,
    retryInProgress: (code: string) =>
      `กำลังส่ง ${code} เข้า SAP — กดโหลดใหม่เพื่อดูผล`,
    cancel: "ยกเลิก",
    empty: {
      failed: "ไม่มีงานที่ส่งไม่สำเร็จ",
      pending: "ไม่มีงานที่รอส่ง",
      all: "คิวว่าง — ทุกอย่างถึง SAP แล้ว",
    } as Record<string, string>,
  },
  apiKeys: {
    title: "กุญแจ API",
    subtitle:
      "หนึ่งช่องทางหนึ่งกุญแจ — เพิกถอนใบเดียวได้โดยไม่กระทบช่องทางอื่น",
    issue: "ออกกุญแจใหม่",
    empty: "ยังไม่มีกุญแจของบริษัทนี้",
    loadFailed: "โหลดรายการกุญแจไม่สำเร็จ",
    forbidden: "ต้องมีสิทธิ์ออก/เพิกถอนกุญแจ API จึงจะเปิดหน้านี้ได้",

    columnName: "ชื่อ",
    columnPrefix: "ตัวขึ้นต้น",
    columnSource: "รหัสช่องทาง",
    columnScopes: "สิทธิ์",
    columnStatus: "สถานะ",
    columnExpires: "หมดอายุ",
    columnLastUsed: "ใช้ล่าสุด",
    columnActions: "",
    never: "—",

    status: {
      active: "ใช้งานได้",
      expired: "หมดอายุ",
      revoked: "เพิกถอนแล้ว",
    } as Record<string, string>,
    statusColor: {
      active: "green",
      expired: "orange",
      revoked: "red",
    } as Record<string, string>,

    editScopes: "แก้สิทธิ์",
    editScopesTitle: "แก้สิทธิ์ของกุญแจ",
    editScopesHint:
      "แทนที่ทั้งชุด ไม่ใช่เพิ่มเข้าไป · มีผลกับคำขอถัดไปทันที ช่องทางไม่ต้องเปลี่ยนกุญแจ",
    scopesUpdated: "แก้สิทธิ์แล้ว",
    scopesSave: "บันทึกสิทธิ์",

    revoke: "เพิกถอน",
    revokeConfirm: "เพิกถอนกุญแจใบนี้?",
    revokeConfirmBody:
      "มีผลกับคำขอถัดไปทันที และย้อนกลับไม่ได้ — ช่องทางที่ถือใบนี้จะเรียก API ไม่ได้อีก",
    revoked: "เพิกถอนแล้ว",

    formName: "ชื่อที่อ่านแล้วรู้ว่าอยู่ที่ไหน",
    formNameHint: "เช่น เว็บไซต์ osd.co.th (production)",
    formSource: "รหัสช่องทาง",
    formSourceHint:
      "ประทับลง Lead ทุกใบที่เข้ามาด้วยกุญแจนี้ · ตัวพิมพ์เล็ก ตัวเลข ขีด เช่น line-oa",
    formSourceInvalid: "ใช้ได้เฉพาะตัวพิมพ์เล็ก ตัวเลข และขีด",
    formScopes: "สิทธิ์ที่กุญแจใบนี้ถือ",
    formScopesHint: "ไม่มีค่าตั้งต้น — ติ๊กเท่าที่ช่องทางนั้นต้องใช้จริง",
    /** หัวข้อย่อยของ `integration.<area>.*` — จัดกลุ่มตามโมดูลที่กุญแจไปแตะ. */
    scopeAreas: {
      request: "คำขอ",
      approval: "อนุมัติ",
      crm: "CRM",
      other: "อื่น ๆ",
    } as Record<string, string>,
    formExpires: "อายุ (วัน)",
    formExpiresHint: "ไม่ระบุ = ไม่หมดอายุ เพิกถอนเอาเท่านั้น",
    save: "ออกกุญแจ",

    issuedTitle: "คัดลอกกุญแจเดี๋ยวนี้",
    issuedBody:
      "ค่าเต็มแสดงครั้งเดียว ระบบเก็บไว้แค่ค่าแฮช อ่านกลับไม่ได้อีก — ทำหายคือออกใบใหม่แล้วเพิกถอนใบเก่า",
    issuedDone: "คัดลอกแล้ว ปิดหน้าต่าง",
  },

  /** ใบเสนอราคาฉบับพิมพ์ (A4) */
  quotationPrint: {
    docTitle: "ใบเสนอราคา",
    docTitleEn: "QUOTATION",
    print: "พิมพ์ / บันทึก PDF",
    back: "กลับไปหน้าใบเสนอราคา",
    printHint:
      'ในหน้าต่างพิมพ์ เลือก "บันทึกเป็น PDF" เพื่อได้ไฟล์ — ตั้งกระดาษ A4 และปิด "ส่วนหัวและท้ายกระดาษ"',
    draftWatermark: "ร่าง",
    draftBanner:
      'ใบนี้ยังไม่ผ่านการอนุมัติ — ฉบับพิมพ์มีลายน้ำ "ร่าง" และไม่ควรส่งลูกค้า',
    taxId: "เลขประจำตัวผู้เสียภาษี",
    tel: "โทร",
    email: "อีเมล",
    no: "เลขที่",
    version: "ฉบับที่",
    date: "วันที่",
    validUntil: "ยืนราคาถึง",
    customer: "ลูกค้า",
    customerCode: "รหัสลูกค้า",
    address: "ที่อยู่",
    attention: "เรียน",
    subject: "เรื่อง",
    salesperson: "ผู้เสนอราคา",
    paymentTerms: "เงื่อนไขการชำระเงิน",
    col: {
      no: "ลำดับ",
      description: "รายการ",
      qty: "จำนวน",
      unit: "หน่วย",
      unitPrice: "ราคา/หน่วย",
      discount: "ส่วนลด",
      amount: "จำนวนเงิน",
    },
    subtotal: "รวมเป็นเงิน",
    discount: "หักส่วนลด",
    net: "ยอดหลังหักส่วนลด",
    vat: (pct: string) => `ภาษีมูลค่าเพิ่ม ${pct}%`,
    grandTotal: "ยอดรวมทั้งสิ้น",
    note: "หมายเหตุ",
    terms: "เงื่อนไข",
    signQuoter: "ผู้เสนอราคา",
    signApprover: "ผู้อนุมัติ",
    signCustomer: "ลูกค้ายืนยันการสั่งซื้อ",
    signDate: "วันที่ ______/______/______",
    loadFailed: "โหลดใบเสนอราคาไม่สำเร็จ",
  },
  /** SUP-03 กล่องแจ้งเตือน */
  notifications: {
    title: "การแจ้งเตือน",
    bellLabel: "การแจ้งเตือน",
    latest: "การแจ้งเตือนล่าสุด",
    viewAll: "ดูทั้งหมด",
    markAllRead: "อ่านทั้งหมดแล้ว",
    markRead: "ทำเครื่องหมายว่าอ่านแล้ว",
    allMarked: "ทำเครื่องหมายอ่านแล้วทั้งหมด",
    empty: "ยังไม่มีการแจ้งเตือน",
    emptyUnread: "ไม่มีการแจ้งเตือนที่ยังไม่อ่าน",
    loadFailed: "โหลดการแจ้งเตือนไม่สำเร็จ",
    filter: { all: "ทั้งหมด", unread: "ยังไม่อ่าน" },
    unreadCount: (n: number) => `ยังไม่อ่าน ${n} รายการ`,
    scopeNote:
      "แสดงการแจ้งเตือนของบริษัทที่เลือกอยู่ — สลับบริษัทเพื่อดูของบริษัทอื่น",
    open: "เปิดรายการ",
    resource: {
      request: "คำขอ",
      approval_case: "งานอนุมัติ",
      opportunity: "โอกาสการขาย",
      notification_digest: "สรุปรายวัน",
    } as Record<string, string>,
    preferences: {
      title: "ช่องทางการแจ้งเตือน",
      inApp: "ในระบบ (เปิดเสมอ)",
      email: "อีเมล",
      emailUnavailable:
        "ยังส่งอีเมลจริงไม่ได้จนกว่าจะตั้งค่าเซิร์ฟเวอร์อีเมล — ระบบบันทึกความต้องการของคุณไว้ก่อน",
      saved: "บันทึกการตั้งค่าแล้ว",
      /* CD-51 */
      teams: "Microsoft Teams",
      teamsHint:
        "ข้อความส่วนตัวจากบอทแจ้งเตือนใน Teams — เรื่องเดียวกับที่แจ้งในระบบ (รายการที่รวมเป็นสรุปรายวันจะไปพร้อมสรุป)",
      /* CD-52 */
      perCategory: "แยกตามเรื่อง",
      perCategoryHint:
        "เลือกรับทันที หรือรวมเป็นสรุปวันละครั้ง — รายการยังเข้าคิวงานตามปกติ เปลี่ยนแค่การเตือน",
      categories: {
        approval: "รออนุมัติจากฉัน",
        my_requests: "ผลการอนุมัติคำขอของฉัน",
        crm: "เตือนงานขาย",
        sla: "เกินกำหนด / เลยเวลาตอบกลับ",
      } as Record<string, string>,
      emailShort: "อีเมล",
      emailFor: "ส่งอีเมลสำหรับเรื่องนี้ด้วย",
      immediate: "ทันที",
      daily: "สรุปรายวัน",
      alwaysImmediate: "ส่งทันทีเสมอ — เรื่องเร่งด่วนรวมเป็นสรุปไม่ได้",
      digestHour: "เวลาส่งสรุปรายวัน",
      digestHint:
        "ส่งวันทำงานตามปฏิทินบริษัท เวลาไทย — ถ้าไม่มีรายการค้างก็ไม่ส่ง · เรื่องที่ตั้งเป็นสรุปรายวันจะไม่เด้งที่กระดิ่งทีละรายการ",
      digestUnused: "ใช้เมื่อมีเรื่องที่ตั้งเป็น “สรุปรายวัน”",
    },
  },
  runNumbers: {
    title: "เลขรันเอกสาร",
    subtitle:
      "รูปแบบเลขที่ของแต่ละชนิดเอกสาร แก้แล้วมีผลกับเอกสารที่ออกหลังจากนี้",
    add: "เพิ่มรูปแบบ",
    edit: "แก้ไข",
    remove: "ลบ",
    confirmRemove: "ลบรูปแบบนี้?",
    saved: "บันทึกแล้ว",
    removed: "ลบแล้ว",

    columnDocType: "ชนิดเอกสาร",
    columnScope: "ขอบเขต",
    columnPattern: "รูปแบบ",
    columnPadding: "ความยาวลำดับ",
    columnReset: "รอบรีเซ็ต",
    columnStart: "เลขเริ่มต้น",
    columnActive: "สถานะ",

    formDocType: "ชนิดเอกสาร",
    formScope: "ขอบเขต",
    formScopeHelp: "รหัสประเภทคำขอ เว้นว่าง = ใช้กับทุกประเภท",
    formPattern: "รูปแบบ",
    formPatternHelp: "คลิกตัวแปรด้านล่างเพื่อแทรก",
    formPadding: "ความยาวลำดับ (หลัก)",
    formStart: "เลขเริ่มต้น",
    formReset: "รอบรีเซ็ตลำดับ",
    formActive: "เปิดใช้งาน",

    tokens: "ตัวแปรที่ใช้ได้",
    preview: (example: string) => `ตัวอย่างเลขถัดไป: ${example}`,
    previewFailed: "รูปแบบนี้ยังใช้ไม่ได้",
    scopeAll: "ทุกประเภท",
    active: "ใช้งาน",
    inactive: "ปิดไว้",

    docTypes: {
      REQUEST: "คำขอ",
      CUSTOMER: "ลูกค้า",
      OPPORTUNITY: "โอกาสการขาย",
      SALE_ORDER: "ใบสั่งขาย",
      QUOTATION: "ใบเสนอราคา",
    },
    resets: {
      none: "ไม่รีเซ็ต",
      yearly: "รายปี",
      monthly: "รายเดือน",
      daily: "รายวัน",
    },
  },

  common: {
    loadError: "โหลดข้อมูลไม่สำเร็จ",
    retry: "ลองใหม่",
    loading: "กำลังโหลด…",
    /** `<message> · <field>=<reason>` — ต่อรายละเอียดรายฟิลด์ท้าย error จาก backend. */
    withDetails: (message: string, details: string) =>
      `${message} · ${details}`,
  },

  /** CRM ระยะ 1 — Customer Master (CM-01…08, spec artifact 856c08fd). */
  sales: {
    leads: {
      title: "Lead",
      scopeNote: "เห็นเฉพาะ Lead ของคุณและของทีม ตามสิทธิ์ที่ได้รับ",
      /** CD-85 — แกน Getter. */
      newCustomerOnly: "เฉพาะลูกค้าใหม่",
      attempts: (n: number) => `ติดต่อ ${n} ครั้ง`,
      lastContact: (when: string) => `ล่าสุด ${when}`,
      discoveryShort: (done: number) => `Discovery ${done}/4`,
      fromTarget: "จากบริษัทเป้าหมาย",
      discovery: {
        title: "Discovery — ก่อนเปิดโอกาสการขาย",
        hint: "สิ่งที่ต้องรู้ก่อนเปิดดีล: ความต้องการ งบ ผู้ตัดสินใจ และกรอบเวลา",
        edit: "บันทึก Discovery",
        saved: "บันทึก Discovery แล้ว",
        complete: "ครบแล้ว",
        missing: (n: number) => `ขาด ${n} ข้อ`,
        requiredWarning:
          "บริษัทนี้ต้องการ Discovery ครบก่อนเปิดโอกาสการขาย — ขั้นตอนอนุมัติ/เลื่อนขั้นอาจไม่ให้ผ่านจนกว่าจะครบ",
        convertWarning: (items: string) =>
          `Discovery ยังไม่ครบ: ${items} — แปลงต่อได้ แต่ควรเก็บข้อมูลให้ครบก่อน`,
        item: {
          need: "ความต้องการ / Pain Point",
          budget: "งบประมาณ",
          decision_maker: "ผู้ตัดสินใจ",
          timeframe: "กรอบเวลาตัดสินใจ",
        } as Record<string, string>,
        budgetNote: "หมายเหตุงบ (ใช้แทนตัวเลขได้)",
        budgetAmount: "งบประมาณ (บาท)",
        timeframePlaceholder: "คาดว่าจะตัดสินใจภายใน",
      },
      prospecting: {
        title: "การเข้าหา",
        attempts: "จำนวนครั้งที่ติดต่อ",
        lastContact: "ติดต่อล่าสุด",
        lastOutcome: "ผลล่าสุด",
        none: "ยังไม่เคยติดต่อ",
      },
      newLead: "เพิ่ม Lead",
      searchPlaceholder: "ค้นหา ชื่อ / ผู้ติดต่อ / โทร / อีเมล",
      filterStatus: "สถานะ: ทั้งหมด",
      mineOnly: "เฉพาะของฉัน",
      empty: "ยังไม่มี Lead",
      status: {
        new: "ใหม่",
        cannot_contact: "ติดต่อไม่ได้",
        contacted: "ติดต่อแล้ว",
        qualified: "ผ่านคัดกรอง",
        disqualified: "คัดออก",
        converted: "แปลงเป็นโอกาสการขายแล้ว",
      } as Record<string, string>,
      statusColor: {
        new: "blue",
        cannot_contact: "orange",
        contacted: "cyan",
        qualified: "green",
        disqualified: "red",
        converted: "purple",
      } as Record<string, string>,
      columns: {
        name: "Lead",
        contact: "ผู้ติดต่อ",
        source: "แหล่งที่มา",
        status: "สถานะ",
        createdAt: "รับเข้าเมื่อ",
      },
      /** สลับระหว่างตารางกับกระดานการ์ดแยกตามสถานะ. */
      view: {
        table: "ตาราง",
        board: "การ์ด",
      },
      board: {
        count: (n: number) => `${n} ใบ`,
        empty: "ไม่มี Lead ในขั้นนี้",
        dragHint: "ลากการ์ดไปวางในคอลัมน์เพื่อเปลี่ยนสถานะ",
        moved: "เปลี่ยนสถานะแล้ว",
        pageNote: (shown: number, total: number) =>
          `กระดานแสดง ${shown} ใบจากทั้งหมด ${total} ใบ — เปลี่ยนหน้าด้านล่างเพื่อดูที่เหลือ`,
        open: "เปิดรายละเอียด",
      },
      form: {
        name: "ชื่อ Lead (บริษัท/บุคคล)",
        nameRequired: "ต้องระบุชื่อ Lead",
        contactName: "ผู้ติดต่อ",
        contactPosition: "ตำแหน่ง/ฝ่าย",
        phone: "โทรศัพท์",
        email: "อีเมล",
        emailInvalid: "อีเมลไม่ถูกต้อง",
        source: "แหล่งที่มา เช่น เว็บไซต์ / งานอีเวนต์ / แนะนำต่อ",
        note: "บันทึกเพิ่มเติม",
        customer: "ลูกค้าเดิม (ถ้ามี)",
        nameEn: "ชื่อ (ภาษาอังกฤษ)",
        taxId: "เลขทะเบียนนิติบุคคล",
        industry: "อุตสาหกรรม",
        companySize: "ขนาดบริษัท",
        employeeCount: "จำนวนพนักงาน",
        productGroup: "Product Group",
        subProduct: "Sub Product",
        projectRevenue: "Project Revenue (THB)",
        addressLine: "ที่อยู่",
        district: "เขต/อำเภอ",
        province: "จังหวัด",
        postalCode: "รหัสไปรษณีย์",
        country: "ประเทศ (รหัส 2 ตัว)",
        sections: {
          contact: "ผู้ติดต่อและช่องทาง",
          company: "ข้อมูลบริษัท/ลูกค้าเป้าหมาย",
          address: "ที่อยู่",
        },
        save: "บันทึก",
        created: "เพิ่ม Lead แล้ว",
        saved: "บันทึกแล้ว",
      },
      /** หน้ารายละเอียด Lead — pipeline + ข้อมูล + กิจกรรม (10 ก.ย. 2569). */
      detail: {
        backToList: "กลับหน้า Lead",
        statusLabel: "สถานะ",
        pipelineHint: "คลิกขั้นเพื่อเลื่อนสถานะ",
        pipelineClosed: "Lead นี้ปิดแล้ว",
        convertStep: "แปลงเป็นโอกาสการขาย",
        statusChanged: "เปลี่ยนสถานะแล้ว",
        edit: "แก้ไข",
        convertedBanner: (code: string) =>
          `Lead นี้แปลงเป็นโอกาสการขาย ${code} แล้ว — งานต่อจากนี้อยู่ที่โอกาสการขาย`,
        openOpportunity: "เปิดโอกาสการขาย",
        disqualifiedBanner: (reason: string) => `Lead นี้ถูกคัดออก — ${reason}`,
        createdAt: (when: string) => `รับเข้าเมื่อ ${when}`,
        contactCard: {
          title: "ผู้ติดต่อ",
          logActivity: "บันทึกกิจกรรม",
          sendEmail: "ส่งอีเมล",
          noContact: "ยังไม่มีผู้ติดต่อ — เพิ่มได้จากปุ่มแก้ไข",
          primary: "ผู้ติดต่อหลัก",
          all: (n: string) => `ผู้ติดต่อทั้งหมด (${n})`,
        },
        tabs: { details: "รายละเอียด", activities: "กิจกรรม" },
        sections: {
          lead: "ข้อมูล Lead",
          company: "ข้อมูลบริษัท/ลูกค้าเป้าหมาย",
          address: "ข้อมูลที่อยู่",
        },
        fields: {
          name: "ชื่อบริษัท/ลูกค้า",
          nameEn: "ชื่อ (ภาษาอังกฤษ)",
          taxId: "เลขทะเบียนนิติบุคคล",
          industry: "อุตสาหกรรม",
          companySize: "ขนาดบริษัท",
          employeeCount: "จำนวนพนักงาน",
          source: "แหล่งที่มา",
          productGroup: "Product Group",
          subProduct: "Sub Product",
          projectRevenue: "Project Revenue",
          owner: "ผู้รับผิดชอบ",
          customer: "ลูกค้าในทะเบียน",
          note: "บันทึก",
          createdAt: "รับเข้าเมื่อ",
          updatedAt: "แก้ไขล่าสุด",
          disqualifyReason: "เหตุผลที่คัดออก",
          convertedTo: "โอกาสการขาย",
          addressLine: "ที่อยู่",
          district: "เขต/อำเภอ",
          province: "จังหวัด",
          postalCode: "รหัสไปรษณีย์",
          country: "ประเทศ",
        },
        quick: {
          call: "โทร",
          email: "อีเมล",
          meeting: "นัดหมาย",
          task: "งาน",
        },
        activities: {
          upcoming: "ที่กำลังจะมาถึงและเกินกำหนด",
          done: "เสร็จแล้ว",
          add: "เพิ่มกิจกรรม",
          empty: "ยังไม่มีกิจกรรม",
          noUpcoming: "ไม่มีกิจกรรมค้าง",
          overdue: "เกินกำหนด",
          due: (when: string) => `กำหนด ${when}`,
          doneAt: (when: string) => `เสร็จ ${when}`,
          by: (name: string, when: string) => `${name} · ${when}`,
          markDone: "ทำเสร็จแล้ว",
          reopen: "เปิดกลับ",
          updated: "อัปเดตกิจกรรมแล้ว",
          closedHint: "Lead ปิดแล้ว — ลงกิจกรรมเพิ่มไม่ได้",
          type: {
            call: "โทร",
            email: "อีเมล",
            meeting: "นัดหมาย",
            task: "งาน",
            note: "บันทึก",
            visit: "เข้าพบ",
            line: "LINE",
            social: "โซเชียล",
          } as Record<string, string>,
          /** CD-85 — ผลการติดต่อ. */
          outcome: {
            reached: "ติดต่อได้",
            no_answer: "ติดต่อไม่ได้",
            interested: "สนใจ",
            not_interested: "ไม่สนใจ",
          } as Record<string, string>,
          outcomeColor: {
            reached: "blue",
            no_answer: "orange",
            interested: "green",
            not_interested: "red",
          } as Record<string, string>,
          form: {
            title: "ลงกิจกรรม",
            type: "ประเภท",
            subject: "หัวข้อ",
            subjectRequired: "ต้องระบุหัวข้อ",
            detail: "รายละเอียด",
            dueAt: "กำหนด (เว้นว่าง = ทำไปแล้ว)",
            outcome: "ผลการติดต่อ",
            outcomeHint: "ใส่เมื่อติดต่อไปแล้ว — ใช้นับจำนวนครั้งที่เข้าหา",
            save: "บันทึก",
            saved: "บันทึกกิจกรรมแล้ว",
          },
        },
      },
      qualify: "ผ่านคัดกรอง",
      actions: {
        edit: "แก้ไข",
        disqualify: "คัดออก",
        convert: "แปลงเป็นโอกาสการขาย",
      },
      disqualifyTitle: "คัดออก Lead",
      disqualifyReason: "เหตุผลที่คัดออก",
      disqualified: "คัดออกแล้ว",
      importer: {
        title: "นำเข้า Lead จาก Excel",
        subtitle:
          "เช่นรายชื่อจากงานอีเวนต์หรือไฟล์เดิม — อีเมล/เบอร์ที่มี Lead อยู่แล้วจะถูกข้าม นำเข้าไฟล์เดิมซ้ำไม่สร้างซ้ำ",
        openButton: "นำเข้า Excel",
        templateFile: "lead-import-template.xlsx",
        templateHint:
          "คอลัมน์โทรศัพท์ตั้งเป็นข้อความไว้แล้ว — อย่าเปลี่ยนเป็นตัวเลข เลข 0 นำหน้าจะหาย",
        headers: {
          name: "ชื่อ Lead (บริษัท/บุคคล)",
          contactName: "ผู้ติดต่อ",
          phone: "โทรศัพท์",
          email: "อีเมล",
          source: "แหล่งที่มา",
          campaign: "รหัสแคมเปญ",
          note: "บันทึก",
        },
        missingNameColumn:
          'ไม่พบคอลัมน์ "ชื่อ Lead (บริษัท/บุคคล)" — ใช้ไฟล์ต้นแบบเป็นตัวตั้ง',
        reasonLabels: {
          "name: required": "ไม่มีชื่อ Lead",
          "email: format": "อีเมลไม่ถูกต้อง",
          "phone: format": "เบอร์โทรไม่ถูกต้อง",
        } as Record<string, string>,
        columns: {
          row: "แถว",
          name: "Lead",
          contact: "ช่องทางติดต่อ",
          action: "ผล",
          detail: "รายละเอียด",
        },
        actionLabel: {
          create: "สร้าง",
          skip_duplicate: "ข้าม — มี Lead นี้แล้ว",
          error: "ติดปัญหา",
        } as Record<string, string>,
        done: (n: string) => `นำเข้าสำเร็จ ${n} ราย`,
        backToList: "ไปหน้า Lead",
      },
      convertTitle: "แปลงเป็นโอกาสการขาย",
      convertHint:
        "ไม่ต้องมีลูกค้าในทะเบียน — ว่างไว้ = ผู้มุ่งหวัง (ทะเบียนลูกค้าจะถูกสร้างเมื่อเปิดใบสั่งขาย) เลือกเฉพาะเมื่อ Lead นี้เป็นเรื่องของลูกค้าเดิม",
      convertCustomer: "ลูกค้าเดิมในทะเบียน (ถ้ามี)",
      convertTitleField: "ชื่อโอกาสการขาย (ว่าง = ใช้ชื่อ Lead)",
      convertAmount: "มูลค่าคาดการณ์ (THB)",
      converted: (code: string) => `แปลงเป็นโอกาสการขาย ${code} แล้ว`,
    },

    opportunities: {
      title: "โอกาสการขาย (Opportunity)",
      scopeNote: "เห็นเฉพาะโอกาสการขายของคุณและของทีม ตามสิทธิ์ที่ได้รับ",
      newOpportunity: "เปิดโอกาสการขายใหม่",
      searchPlaceholder: "ค้นหา ชื่อโอกาสการขาย / เลขโอกาสการขาย / ลูกค้า",
      filterStage: "ขั้น: ทั้งหมด",
      mineOnly: "เฉพาะของฉัน",
      empty: "ยังไม่มีโอกาสการขาย",
      view: {
        table: "ตาราง",
        board: "การ์ด",
      },
      board: {
        count: (n: number) => `${n} รายการ`,
        weighted: (amount: string) => `ถ่วงความน่าจะเป็น ${amount}`,
        targetTitle: (period: string) => `เป้าเดือน ${period}`,
        targetLink: "ดูเป้าและพยากรณ์",
        targetLine: (actual: string, forecast: string, target: string) =>
          `ขายแล้ว ${actual} · พยากรณ์ ${forecast} / เป้า ${target}`,
        empty: "ไม่มีโอกาสการขายในขั้นนี้",
        dragHint:
          'ลากการ์ดไปวางในคอลัมน์เพื่อเปลี่ยนขั้น — วางที่ "ชนะ" จะพาไปเปิดใบสั่งขาย, วางที่ "แพ้" ต้องระบุเหตุผล',
        moved: "เปลี่ยนขั้นแล้ว",
        pageNote: (shown: number, total: number) =>
          `กระดานแสดง ${shown} รายการจากทั้งหมด ${total} รายการ — เปลี่ยนหน้าด้านล่างเพื่อดูที่เหลือ`,
      },
      stage: {
        qualifying: "คัดกรอง",
        proposing: "เสนอราคา",
        negotiating: "ต่อรอง",
        won: "ชนะ",
        lost: "แพ้",
      } as Record<string, string>,
      stageColor: {
        qualifying: "default",
        proposing: "blue",
        negotiating: "gold",
        won: "green",
        lost: "red",
      } as Record<string, string>,
      /** CD-86 — ชนิดของดีล. */
      dealType: {
        new_business: "ลูกค้าใหม่",
        upsell: "ขายเพิ่ม (Upgrade/Upsell)",
        cross_sell: "ขายข้าม (Cross-sell)",
        renewal: "ต่ออายุ",
      } as Record<string, string>,
      dealTypeColor: {
        new_business: "default",
        upsell: "cyan",
        cross_sell: "purple",
        renewal: "geekblue",
      } as Record<string, string>,
      dealTypeLabel: "ชนิดดีล",
      dealTypeNeedsCustomer: "ขายเพิ่ม/ขายข้ามต้องเลือกลูกค้าในทะเบียน",
      columns: {
        code: "เลขโอกาสการขาย",
        title: "โอกาสการขาย",
        customer: "ลูกค้า / ผู้มุ่งหวัง",
        stage: "ขั้น",
        amount: "มูลค่า",
        expectedClose: "คาดปิด",
        nextFollowUp: "ติดตามครั้งถัดไป",
      },
      /** CD-65 */
      followUp: {
        all: "การติดตาม: ทั้งหมด",
        overdue: "นัดติดตามเลยกำหนด",
        stale: "ดีลเงียบเกินเกณฑ์",
        staleTag: "เงียบ",
        overdueTag: "เลยกำหนด",
      },
      /** PO 10 ก.ย. 2569: การเปิดโอกาสการขายยังไม่ถือเป็นลูกค้า */
      prospectTag: "ยังไม่เป็นลูกค้า",
      form: {
        partyMode: {
          prospect: "ผู้มุ่งหวังรายใหม่ (ยังไม่เป็นลูกค้า)",
          existing: "ลูกค้าเดิมในทะเบียน",
        },
        prospectName: "ชื่อผู้มุ่งหวัง (บริษัท/บุคคล)",
        prospectTaxId: "เลขผู้เสียภาษี (ถ้ามี)",
        prospectContact: "ชื่อผู้ติดต่อ",
        prospectPhone: "โทร",
        prospectEmail: "อีเมล",
        prospectHint:
          "ยังไม่สร้างทะเบียนลูกค้า — ระบบจะสร้างให้อัตโนมัติเมื่อเปิดใบสั่งขาย",
        customer: "ลูกค้าเดิม",
        title: "ชื่อโอกาสการขาย",
        amount: "มูลค่า (THB)",
        probability: "ความน่าจะเป็น (%)",
        expectedClose: "วันคาดว่าจะปิด",
        products: "product ที่เกี่ยวข้อง (รหัสตรงกับ SAP)",
        productsHint:
          "ค้นรหัสหรือชื่อแล้วเลือกจากรายการสินค้าจาก SAP ได้หลายตัว — ใช้เตือน KYC ตามสินค้า",
        prospectEmailInvalid: "รูปแบบอีเมลไม่ถูกต้อง",
        save: "บันทึก",
        created: (code: string) => `เปิดโอกาสการขาย ${code} แล้ว`,
        saved: "บันทึกแล้ว",
      },
      detail: {
        stageLabel: "ขั้นปัจจุบัน",
        openSaleOrder: "เปิดใบสั่งขาย (ปิดชนะ)",
        openSaleOrderTitle: "เปิดใบสั่งขายจากโอกาสการขายนี้",
        openSaleOrderHint:
          "เปิดใบสั่งขายถือว่าปิดโอกาสการขายแบบชนะ และเป็นจุดเดียวที่ระบบสร้างทะเบียนลูกค้า",
        saleOrderAmount: "มูลค่าใบสั่งขาย (THB) — ว่าง = ใช้มูลค่าโอกาสการขาย",
        saleOrderNote: "หมายเหตุ",
        customerToCreate: "ลูกค้าที่จะสร้างในทะเบียน",
        customerToCreateHint:
          "ค่าตั้งต้นมาจากผู้มุ่งหวัง/Lead — แก้ได้ก่อนบันทึก; ถ้าเลขผู้เสียภาษีตรงกับลูกค้าเดิม ระบบจะผูกรายเดิมให้",
        customerExisting: "ใบสั่งขายนี้จะออกให้ลูกค้า",
        useExistingCustomer: "ใช้ลูกค้าเดิมในทะเบียนแทนการสร้างใหม่",
        customerType: "ประเภทลูกค้า",
        customerNameTh: "ชื่อ (ไทย)",
        customerNameEn: "ชื่อ (อังกฤษ)",
        customerTaxId: "เลขผู้เสียภาษี 13 หลัก",
        customerBranchCode: "รหัสสาขา (00000 = สำนักงานใหญ่)",
        similarFound:
          "ระบบพบลูกค้าชื่อคล้ายในทะเบียน — เลือกใช้รายเดิมด้านบน หรือยืนยันสร้างใหม่พร้อมเหตุผล (ต้องมีสิทธิ์)",
        confirmDuplicate: "ยืนยันสร้างลูกค้าใหม่ทั้งที่ชื่อคล้าย",
        overrideReason: "เหตุผลที่ยืนยัน",
        saleOrderOpened: (code: string, customerCreated: boolean) =>
          customerCreated
            ? `เปิดใบสั่งขาย ${code} แล้ว — สร้างทะเบียนลูกค้าให้เรียบร้อย`
            : `เปิดใบสั่งขาย ${code} แล้ว`,
        prospectBanner:
          "โอกาสการขายนี้ยังไม่เป็นลูกค้าในทะเบียน — ระบบจะสร้างทะเบียนลูกค้าให้เมื่อเปิดใบสั่งขาย",
        prospectLabel: "ผู้มุ่งหวัง",
        prospectContactLabel: "ผู้ติดต่อ",
        kycProspectBody: (products: string) =>
          `${products} อยู่ในเงื่อนไขต้องทำ KYC — ยื่น KYC ได้หลังเปิดใบสั่งขาย (เมื่อมีทะเบียนลูกค้าแล้ว) ธุรกรรมยังเดินต่อได้`,
        saleOrdersTitle: "ใบสั่งขาย",
        noSaleOrders: "ยังไม่มีใบสั่งขาย",
        saleOrderColumns: {
          code: "เลขใบสั่งขาย",
          status: "สถานะ",
          amount: "มูลค่า",
          orderedAt: "วันที่เปิด",
          note: "หมายเหตุ",
        },
        saleOrderStatus: {
          open: "เปิดอยู่",
          cancelled: "ยกเลิก",
        } as Record<string, string>,
        // CD-88 — ใบสั่งขายเข้า SAP
        saleOrderErp: "SAP",
        saleOrderErpStatus: {
          not_ready: "ยังส่งไม่ได้",
          pending: "รอส่ง",
          synced: "ส่งแล้ว",
          failed: "ส่งไม่สำเร็จ",
          skipped: "ไม่ต้องส่ง",
        } as Record<string, string>,
        saleOrderErpHint: {
          not_ready:
            "ยังไม่มีรายการสินค้า — เปิดใบสั่งขายจากใบเสนอราคาที่ลูกค้ายอมรับเพื่อส่งเข้า SAP",
          pending:
            "บันทึกใน Connect the Dot แล้ว — ระบบจะส่งเข้า SAP ให้อัตโนมัติ",
          skipped: "ยกเลิกก่อนถึง SAP — ไม่มีอะไรต้องส่ง",
        } as Record<string, string>,
        saleOrderErpCancelled: "ยกเลิกใน SAP แล้ว",
        saleOrderErpLastError: (error: string) => `ข้อผิดพลาดล่าสุด: ${error}`,
        saleOrderLinesTitle: "รายการสินค้า",
        saleOrderAddLine: "เพิ่มรายการ",
        saleOrderRemoveLine: "ลบรายการ",
        saleOrderLinesEmpty: "ยังไม่มีรายการ",
        saleOrderLinesHint:
          "มูลค่าใบสั่งขาย = ยอดรวมรายการ (ก่อน VAT) — ใบที่มีรายการส่งเข้า SAP ให้อัตโนมัติ",
        saleOrderNoLinesHint:
          "ไม่ใส่รายการก็เปิดใบได้ แต่ส่งเข้า SAP ไม่ได้จนกว่าจะมีรายการสินค้า",
        saleOrderNoLines:
          "ใบสั่งขายนี้ไม่มีรายการสินค้า (เปิดตรงจากโอกาสการขาย)",
        cancelSaleOrder: "ยกเลิกใบสั่งขาย",
        cancelReason: "เหตุผลที่ยกเลิก",
        cancelled: "ยกเลิกใบสั่งขายแล้ว",
        lose: "ปิดโอกาสการขาย — แพ้",
        lostTitle: "ปิดโอกาสการขาย — แพ้",
        lostReason: "เหตุผล (รายการมาตรฐาน)",
        lostReasonText: "รายละเอียดเพิ่มเติม",
        lostDone: "บันทึกปิดแพ้แล้ว",
        closedWonBanner: "โอกาสการขายนี้ปิดแล้ว — ชนะ",
        closedLostBanner: (reason: string) =>
          `โอกาสการขายนี้ปิดแล้ว — แพ้ (${reason})`,
        kycWarningTitle: "โอกาสการขายนี้มี product ที่ต้องยืนยันตัวตน (KYC)",
        kycWarningBody: (products: string, customer: string) =>
          `${products} อยู่ในเงื่อนไขต้องทำ KYC และลูกค้า ${customer} ยังไม่ผ่านการยืนยันตัวตน — ยื่น KYC ได้เลย ธุรกรรมยังเดินต่อได้`,
        raiseKyc: "ยื่น KYC ให้ลูกค้า",
        customerLabel: "ลูกค้า",
        fromLead: (name: string) => `มาจาก Lead: ${name}`,
        tabRequests: "คำขอที่อ้างโอกาสการขายนี้",
        raiseRequest: "ยื่นคำขอ",
        /* CD-75 — รูปจากการเข้าพบ. */
        photos: {
          add: "แนบรูป",
          uploaded: "แนบรูปแล้ว",
          uploadFailed: (count: number, reason: string) =>
            `แนบรูปไม่สำเร็จ ${count} รูป — ${reason}`,
          remove: "ลบรูป",
          removeConfirm: "ลบรูปนี้?",
        },
        /* CD-78 — จองเลขหมายบริการ (Reserve-phone). */
        phoneNumbers: {
          title: "เลขหมายที่จอง",
          reserve: "จองเบอร์",
          empty: "ยังไม่ได้จองเบอร์ให้ดีลนี้",
          mockNotice:
            "ต่อกับ Reserve-phone ตัวจำลอง — เบอร์และการจองยังไม่ใช่ของจริง",
          number: "เลขหมาย",
          category: "ประเภท",
          categoryLabel: {
            normal: "ปกติ",
            golden: "เบอร์สวย",
          } as Record<string, string>,
          fee: "ค่าธรรมเนียม",
          expiresAt: "จองถึง",
          by: "จองโดย",
          status: {
            reserved: "จองอยู่",
            released: "ปล่อยแล้ว",
            expired: "หมดอายุ",
          } as Record<string, string>,
          releasedByLost: "ปล่อยอัตโนมัติ (ดีลแพ้)",
          daysLeft: (days: number) =>
            days <= 0 ? "หมดวันนี้" : `อีก ${days} วัน`,
          extend: "ต่ออายุ",
          extendTitle: (number: string) => `ต่ออายุการจอง ${number}`,
          extendDays: "จองต่อจากวันนี้ (วัน)",
          extended: "ต่ออายุแล้ว",
          release: "ปล่อยคืน",
          releaseConfirm: "ปล่อยเบอร์นี้คืน Reserve-phone? คนอื่นจะจองได้ทันที",
          released: "ปล่อยเบอร์แล้ว",
          searchTitle: "ค้นเบอร์ว่างจาก Reserve-phone",
          contains: "มีตัวเลข",
          containsPlaceholder: "เช่น 888",
          prefix: "ขึ้นต้นด้วย",
          prefixPlaceholder: "เช่น 02",
          anyCategory: "ทุกประเภท",
          search: "ค้นหา",
          noResult: "ไม่พบเบอร์ว่างตามเงื่อนไข",
          holdDays: (max: number) => `จองกี่วัน (สูงสุด ${max})`,
          reserveSelected: (count: number) => `จอง ${count} เบอร์`,
          reservedCount: (count: number) => `จองแล้ว ${count} เบอร์`,
          failedTitle: "บางเบอร์จองไม่ได้",
        },
        /* CD-79 — การต่อรองเงื่อนไขการค้า. */
        negotiations: {
          title: "การต่อรองเงื่อนไข",
          record: "บันทึกรอบการต่อรอง",
          empty: "ยังไม่มีการบันทึกการต่อรอง",
          round: (no: number) => `รอบที่ ${no}`,
          formTitle: (no: number) => `บันทึกการต่อรองรอบที่ ${no}`,
          date: "วันที่ต่อรอง",
          summary: "สรุปการต่อรอง",
          pickTerm: "เลือกเงื่อนไข",
          otherTerm: "เงื่อนไขอื่น (นอกรายการ)",
          otherName: "ชื่อเงื่อนไข",
          agreedPlaceholder: "ค่าที่ตกลง",
          note: "หมายเหตุ",
          addTerm: "เพิ่มเงื่อนไข",
          standardIs: (value: string) => `มาตรฐาน: ${value}`,
          otherAlwaysFlagged: "นอกรายการ = นอกมาตรฐาน",
          noStandards:
            "บริษัทยังไม่ได้ตั้งเงื่อนไขมาตรฐาน (หน้าตั้งค่า CRM) — ทุกเงื่อนไขจะนับเป็นนอกมาตรฐาน",
          willSend: (count: number) =>
            `มีเงื่อนไขนอกมาตรฐาน ${count} รายการ — บันทึกแล้วระบบจะส่งฝ่ายกฎหมายตรวจทันที`,
          save: "บันทึก",
          saveAndSend: "บันทึกและส่งฝ่ายกฎหมาย",
          saved: "บันทึกการต่อรองแล้ว",
          savedSent: "บันทึกแล้ว และส่งฝ่ายกฎหมายตรวจแล้ว",
          savedNotSent:
            "บันทึกแล้ว แต่ยังส่งฝ่ายกฎหมายไม่สำเร็จ — ดูรายละเอียดในการ์ด",
          nonStandard: "นอกมาตรฐาน",
          nonStandardCount: (count: number) => `นอกมาตรฐาน ${count} รายการ`,
          allStandard: "ตามมาตรฐาน",
          notInList: "— (นอกรายการ)",
          sentToLegal: "ส่งฝ่ายกฎหมายตรวจแล้ว",
          openRequest: "เปิดคำขอ",
          openDraft: "เปิดร่างคำขอ",
          columns: {
            term: "เงื่อนไข",
            standard: "มาตรฐาน",
            agreed: "ที่ตกลง",
          },
        },
        /* CD-81 — ประสานงานสัญญากับฝ่ายกฎหมายจากหน้าดีล. */
        contracts: {
          title: "สัญญา",
          raise: "ขอจัดทำ/แก้ไขสัญญา",
          empty: "ยังไม่มีคำขอสัญญาของดีลนี้",
          cannotRaise: "คุณยังยื่นคำขอประเภทสัญญาไม่ได้ — ติดต่อผู้ดูแลระบบ",
          draftNo: "(ร่าง)",
          columns: {
            no: "เลขคำขอ",
            stage: "สถานะร่างสัญญา",
            owner: "ผู้รับผิดชอบ",
            raised: "วันที่ขอ",
          },
          stages: {
            draft: "ยังไม่ได้ยื่น",
            submitted: "รอฝ่ายกฎหมายรับเรื่อง",
            in_progress: "ฝ่ายกฎหมายกำลังร่าง",
            on_hold: "พักไว้",
            returned: "ส่งกลับให้แก้ข้อมูล",
            completed: "ร่างเสร็จ — รอตรวจรับ",
            approved: "สัญญาพร้อมใช้",
            closed: "สัญญาพร้อมใช้",
            rejected: "ฝ่ายกฎหมายไม่รับทำ",
            cancelled: "ยกเลิก",
          } as Record<string, string>,
        },
        /** CD-130 — ขอ Solution และประเมินต้นทุน (Sales → Pre-Sales) */
        solutions: {
          title: "Solution (Pre-Sales)",
          design: "แบบ Solution",
          raise: "ขอ Solution และประเมินต้นทุน",
          empty:
            "ยังไม่ได้ขอ Solution — ต้องกรอกความต้องการ ขอบเขต ไซต์ กำหนดเวลา ผู้ตัดสินใจ และกรอบงบประมาณให้ครบจึงยื่นได้",
          cannotRaise:
            "คุณยังยื่นคำขอ Solution ไม่ได้ — ติดต่อผู้ดูแลระบบ",
          draftNo: "(ร่าง)",
          columns: {
            no: "เลขคำขอ",
            stage: "สถานะ",
            owner: "ผู้รับผิดชอบ",
            raised: "วันที่ขอ",
          },
          stages: {
            draft: "ยังไม่ได้ยื่น",
            submitted: "รอ Pre-Sales รับเรื่อง",
            in_progress: "Pre-Sales กำลังออกแบบ",
            on_hold: "พักไว้",
            returned: "Pre-Sales ตีกลับ — ข้อมูลไม่พอ",
            completed: "ส่ง Solution แล้ว — รอตรวจรับ",
            approved: "ได้ Solution แล้ว",
            closed: "ได้ Solution แล้ว",
            rejected: "Pre-Sales ไม่รับทำ",
            cancelled: "ยกเลิก",
          } as Record<string, string>,
        },
        /** CD-139 — ขอจัด Demo หรือ POC (Sales → Pre-Sales) */
        demos: {
          title: "Demo / POC",
          raise: "ขอจัด Demo หรือ POC",
          empty: "ยังไม่ได้ขอจัด Demo หรือ POC",
          cannotRaise: "คุณยังยื่นคำขอ Demo/POC ไม่ได้ — ติดต่อผู้ดูแลระบบ",
          draftNo: "(ร่าง)",
          columns: {
            no: "เลขคำขอ",
            stage: "สถานะ",
            owner: "ผู้รับผิดชอบ",
            raised: "วันที่ขอ",
          },
          stages: {
            draft: "ยังไม่ได้ยื่น",
            submitted: "รอหัวหน้า Pre-Sales รับเรื่อง",
            in_progress: "Pre-Sales เตรียม/จัดอยู่",
            on_hold: "พักไว้",
            returned: "Pre-Sales ตีกลับ",
            completed: "จัดแล้ว — รอตรวจรับ",
            approved: "จัดแล้ว",
            closed: "จัดแล้ว",
            rejected: "Pre-Sales ไม่รับจัด",
            cancelled: "ยกเลิก",
          } as Record<string, string>,
        },
        noRequests: "ยังไม่มีคำขอที่อ้างโอกาสการขายนี้",
        edit: "แก้ไข",
        quotationsTitle: "ใบเสนอราคา",
        /** CD-65 กิจกรรมและการติดตาม */
        activitiesTitle: "กิจกรรมและการติดตาม",
        pendingTitle: "นัดติดตามที่ค้างอยู่",
        doneTitle: (n: number) => `ทำแล้ว · ${n}`,
        noPending:
          "ไม่มีนัดติดตามค้าง — ใส่กำหนดตอนลงกิจกรรมเพื่อนัดครั้งถัดไป",
        noActivities: "ยังไม่มีกิจกรรม",
        lastActivity: "กิจกรรมล่าสุด",
        nextFollowUp: "ติดตามครั้งถัดไป",
        neverActive: "ยังไม่เคยมีกิจกรรม",
        staleBanner: (when: string) =>
          `โอกาสการขายนี้ไม่มีกิจกรรมเกินเกณฑ์ที่ตั้งไว้ — ระบบแจ้งเจ้าของและหัวหน้าแล้วเมื่อ ${when}`,
        staleHint: "ลงกิจกรรมที่ทำแล้วเพื่อล้างสถานะนี้",
        closedActivitiesHint: "โอกาสการขายนี้ปิดแล้ว — ลงกิจกรรมเพิ่มไม่ได้",
        newQuotation: "สร้างใบเสนอราคา",
        noQuotations: "ยังไม่มีใบเสนอราคา",
        saleOrderQuotation: "เปิดตามใบเสนอราคาที่ลูกค้ายอมรับ",
        saleOrderQuotationNone: "ไม่อ้างใบเสนอราคา",
        saleOrderQuotationHint:
          "เลือกใบเสนอราคาแล้วมูลค่าใบสั่งขาย = ยอดสุทธิก่อน VAT ของใบนั้น (แก้ไม่ได้) — ราคาเปลี่ยนให้ออกใบเสนอราคาเวอร์ชันใหม่",
      },
    },

    /** CD-76 — ใบเสนอราคา: เวอร์ชัน, วันหมดอายุ, ตรวจ margin ก่อนออก. */
    saleOrders: {
      title: "ใบสั่งขาย (Sale Order)",
      scopeNote:
        "เห็นเฉพาะใบสั่งขายของคุณและของทีม ตามสิทธิ์ที่ได้รับ · เปิดใบใหม่จากหน้ารายละเอียดโอกาสการขาย",
      searchPlaceholder: "ค้นหา เลขใบสั่งขาย / เลข SAP / ลูกค้า / โอกาสการขาย",
      filterStatus: "สถานะใบ: ทั้งหมด",
      filterErp: "สถานะ SAP: ทั้งหมด",
      mineOnly: "เฉพาะของฉัน",
      empty: "ยังไม่มีใบสั่งขาย",
      columns: {
        code: "เลขใบสั่งขาย",
        customer: "ลูกค้า",
        opportunity: "โอกาสการขาย",
        quotation: "ใบเสนอราคา",
        status: "สถานะ",
        amount: "มูลค่า",
        orderedAt: "วันที่เปิด",
      },
    },
    quotations: {
      title: "ใบเสนอราคา (Quotation)",
      scopeNote:
        "เห็นเฉพาะใบเสนอราคาของคุณและของทีม ตามสิทธิ์ที่ได้รับ · สร้างใบใหม่จากหน้ารายละเอียดโอกาสการขาย",
      searchPlaceholder: "ค้นหา เลขใบเสนอราคา / ชื่อ / ลูกค้า",
      filterStatus: "สถานะ: ทั้งหมด",
      mineOnly: "เฉพาะของฉัน",
      showSuperseded: "แสดงฉบับที่ถูกแทนแล้ว",
      empty: "ยังไม่มีใบเสนอราคา",
      status: {
        draft: "ร่าง",
        pending_approval: "รออนุมัติ margin",
        approved: "อนุมัติแล้ว",
        sent: "ส่งลูกค้าแล้ว",
        accepted: "ลูกค้ายอมรับ",
        declined: "ลูกค้าปฏิเสธ",
        superseded: "ถูกแทนด้วยเวอร์ชันใหม่",
        cancelled: "ยกเลิก",
      } as Record<string, string>,
      statusColor: {
        draft: "default",
        pending_approval: "gold",
        approved: "blue",
        sent: "geekblue",
        accepted: "green",
        declined: "red",
        superseded: "default",
        cancelled: "red",
      } as Record<string, string>,
      expiredTag: "หมดอายุ",
      columns: {
        no: "เลขที่",
        title: "เรื่อง",
        party: "ลูกค้า / ผู้มุ่งหวัง",
        opportunity: "โอกาสการขาย",
        status: "สถานะ",
        netTotal: "ยอดสุทธิ (ก่อน VAT)",
        grandTotal: "ยอดรวม VAT",
        margin: "margin",
        validUntil: "ใช้ได้ถึง",
      },
      version: (v: number) => `v${v}`,
      marginHidden: "—",
      detail: {
        fromOpportunity: "โอกาสการขาย",
        party: "ลูกค้า / ผู้มุ่งหวัง",
        taxId: "เลขผู้เสียภาษี",
        contact: "ผู้ติดต่อ",
        validUntil: "ใช้ได้ถึง",
        paymentTerms: "เงื่อนไขการชำระเงิน",
        note: "หมายเหตุ",
        title: "เรื่อง",
        linesTitle: "รายการ",
        addLine: "เพิ่มรายการ",
        removeLine: "ลบ",
        noLines: "ยังไม่มีรายการ — เพิ่มอย่างน้อยหนึ่งรายการก่อนยื่น",
        productPlaceholder: "ค้นรหัส/ชื่อสินค้า (ว่าง = บริการ)",
        productNotFound: "ไม่พบในรายการสินค้าจาก SAP",
        line: {
          productCode: "รหัสสินค้า",
          description: "รายละเอียด",
          quantity: "จำนวน",
          unit: "หน่วย",
          unitPrice: "ราคา/หน่วย",
          unitCost: "ต้นทุน/หน่วย",
          discountPct: "ส่วนลด %",
          lineTotal: "รวม",
        },
        costHint:
          "ต้นทุนกรอกเองต่อรายการจนกว่าจะมี BOQ/ทะเบียนสินค้า — ผู้ไม่มีสิทธิ์เห็นต้นทุนจะไม่เห็นคอลัมน์นี้และ margin",
        totals: {
          subtotal: "รวมก่อนส่วนลด",
          discount: "ส่วนลด",
          net: "ยอดสุทธิก่อน VAT",
          vat: (pct: string) => `VAT ${pct}%`,
          grand: "ยอดรวมทั้งสิ้น",
          cost: "ต้นทุนรวม",
          margin: "margin",
          minMargin: (pct: string) => `เกณฑ์ที่ใช้ตัดสิน: ${pct}%`,
        },
        unsavedPreview:
          "ตัวเลขด้านล่างคำนวณจากที่แก้อยู่ — บันทึกแล้วระบบจะคำนวณยืนยันอีกครั้ง",
        versionsTitle: "เวอร์ชันของใบนี้",
        current: "ฉบับที่กำลังดู",
        saleOrdersTitle: "ใบสั่งขายที่เปิดตามใบนี้",
        save: "บันทึกร่าง",
        saved: "บันทึกร่างแล้ว",
        submit: "ยื่นออกใบเสนอราคา (ตรวจ margin)",
        submitHint:
          "ระบบจะเทียบ margin กับเกณฑ์ของบริษัท — ผ่านเกณฑ์อนุมัติทันที ต่ำกว่าเกณฑ์ต้องขออนุมัติก่อนส่งลูกค้า",
        submitDirtyFirst: "บันทึกร่างก่อนยื่น",
        print: "พิมพ์ / PDF",
        approvedNow: "ผ่านการตรวจ margin — อนุมัติแล้ว พร้อมส่งลูกค้า",
        reasonTitle: "margin ต่ำกว่าเกณฑ์ — ต้องขออนุมัติ",
        reasonHint:
          "ระบบจะสร้างร่างคำขออนุมัติพร้อมตัวเลขจากใบนี้ให้ — คุณต้องเปิดคำขอเพื่อแนบใบเสนอราคาฉบับร่าง เลือกผู้รับเรื่อง แล้วยื่นเอง",
        reasonPlaceholder: "เหตุผลที่ต้องเสนอราคา margin ต่ำ",
        requestDrafted:
          "สร้างร่างคำขออนุมัติแล้ว — เปิดคำขอเพื่อแนบเอกสารและยื่น",
        pendingBanner:
          "ใบนี้รออนุมัติ margin — สถานะจะเปลี่ยนเองเมื่อคำขออนุมัติได้ผล (อนุมัติ = พร้อมส่ง, ไม่อนุมัติ/ยกเลิก = กลับเป็นร่าง)",
        openRequest: (no: string) => `เปิดคำขอ ${no}`,
        requestDraftNo: "ร่างคำขอ (ยังไม่ยื่น)",
        requestStatus: (status: string) => `สถานะคำขอ: ${status}`,
        lockedBanner:
          "ใบนี้ยื่นแล้ว แก้ไขไม่ได้ — ต้องการเปลี่ยนให้ออกเวอร์ชันใหม่",
        supersededBanner: "ฉบับนี้ถูกแทนด้วยเวอร์ชันใหม่แล้ว",
        expiredBanner:
          "ใบนี้หมดอายุแล้ว — ส่งหรือบันทึกลูกค้ายอมรับไม่ได้ ออกเวอร์ชันใหม่เพื่อกำหนดวันใหม่",
        send: "บันทึกว่าส่งลูกค้าแล้ว",
        sent: "บันทึกการส่งแล้ว",
        accept: "ลูกค้ายอมรับ",
        acceptTitle: "บันทึกลูกค้ายอมรับใบเสนอราคา",
        acceptNote: "หมายเหตุ เช่น เลข PO ของลูกค้า",
        accepted: "บันทึกลูกค้ายอมรับแล้ว — เปิดใบสั่งขายได้จากหน้าโอกาสการขาย",
        decline: "ลูกค้าปฏิเสธ",
        declineTitle: "บันทึกลูกค้าปฏิเสธ",
        declineReason: "เหตุผลที่ลูกค้าปฏิเสธ",
        declined: "บันทึกลูกค้าปฏิเสธแล้ว",
        responseNote: "หมายเหตุจากลูกค้า",
        revise: "ออกเวอร์ชันใหม่",
        reviseConfirm: "ออกเวอร์ชันใหม่เป็นร่าง? ฉบับนี้จะถูกติดว่าถูกแทน",
        revised: (v: number) => `ออกเวอร์ชัน ${v} แล้ว`,
        cancel: "ยกเลิกใบเสนอราคา",
        cancelTitle: "ยกเลิกใบเสนอราคา",
        cancelReason: "เหตุผลที่ยกเลิก",
        cancelled: "ยกเลิกใบเสนอราคาแล้ว",
        cancelledBanner: (reason: string) => `ใบนี้ถูกยกเลิก — ${reason}`,
        openSaleOrderHint:
          "ลูกค้ายอมรับแล้ว — ไปหน้าโอกาสการขายเพื่อเปิดใบสั่งขายตามใบนี้",
        goOpportunity: "ไปหน้าโอกาสการขาย",
        created: (no: string) => `สร้างใบเสนอราคา ${no} แล้ว`,
      },
    },
  },

  customers: {
    /** CD-122 — รวมลูกค้าซ้ำ (admin). */
    merge: {
      button: "รวมเข้ากับลูกค้าอื่น",
      title: (code: string) => `รวม ${code} เข้ากับลูกค้าอื่น`,
      intro:
        "ใช้เมื่อลูกค้ารายเดียวกันถูกลงทะเบียนซ้ำ — เอกสารทั้งหมดของรายนี้ย้ายไปอยู่ที่รายหลัก รายนี้กลายเป็นรหัสเดิม (อ่านอย่างเดียว) ที่ลิงก์ไปหารายหลัก",
      into: "รายหลัก (ลูกค้าที่จะคงไว้)",
      searchPlaceholder: "พิมพ์ชื่อหรือรหัสลูกค้า",
      searchHint: "พิมพ์อย่างน้อย 2 ตัวอักษร",
      becomesAlias: "รายนี้ (ถูกรวม)",
      stays: "รายหลัก",
      moved: "สิ่งที่ย้ายไป",
      nothingMoved: "ไม่มีเอกสารให้ย้าย",
      kinds: {
        lead: "Lead",
        opportunity: "โอกาสการขาย",
        saleOrder: "ใบสั่งขาย",
        quotation: "ใบเสนอราคา",
        customerContact: "ผู้ติดต่อ",
        customerLocation: "สถานที่",
        customerKycRecord: "KYC",
        customerContract: "สัญญา",
        customerTouchpoint: "การติดต่อ/ทบทวน",
        customerTimelineEvent: "ไทม์ไลน์",
        segments: "กลุ่มลูกค้า",
        requests: "คำขอ",
        branches: "สาขา",
      } as Record<string, string>,
      reason: "เหตุผล",
      reasonPlaceholder: "เช่น ลงทะเบียนซ้ำจากการนำเข้า Excel",
      irreversible:
        "ย้อนกลับไม่ได้ในระบบ — บันทึกลง audit ทั้งสองราย",
      confirm: "รวมลูกค้า",
      done: "รวมลูกค้าแล้ว",
    },
    title: "ทะเบียนลูกค้า",
    scopeNote:
      "เห็นเฉพาะลูกค้าที่คุณรับผิดชอบหรืออยู่ในทีมของคุณ ตามสิทธิ์ที่ได้รับ",
    newCustomer: "สร้างลูกค้าใหม่",
    searchPlaceholder: "ค้นหา ชื่อ / เลขผู้เสียภาษี / รหัสลูกค้า",
    filterStatus: "สถานะ: ทั้งหมด",
    filterSegment: "กลุ่ม: ทั้งหมด",
    viewMineOnly: "เฉพาะที่ฉันรับผิดชอบ",
    empty: "ยังไม่มีลูกค้าในขอบเขตที่คุณเห็น",
    columns: {
      code: "รหัสลูกค้า",
      name: "ชื่อลูกค้า",
      taxId: "เลขผู้เสียภาษี",
      segments: "กลุ่ม",
      owner: "ผู้รับผิดชอบ",
      status: "สถานะ",
      updatedAt: "แก้ไขล่าสุด",
    },
    status: {
      draft: "ร่าง",
      active: "ใช้งาน",
      suspended: "พักใช้งาน",
      inactive: "ปิดใช้งาน",
    } as Record<string, string>,
    type: {
      corporate: "นิติบุคคล",
      individual: "บุคคลธรรมดา",
      government: "หน่วยงานรัฐ",
    } as Record<string, string>,
    kycVerified: "ยืนยันตัวตนแล้ว (KYC)",
    kycNotVerified: "ยังไม่ผ่าน KYC",
    /* CD-62 */
    approval: {
      tag: {
        pending: "รออนุมัติเปิดลูกค้า",
        rejected: "ไม่อนุมัติเปิดลูกค้า",
      } as Record<string, string>,
      pendingTitle: "ลูกค้าใหม่รออนุมัติ — ยังไม่ส่งลูกค้าและใบสั่งขายเข้า SAP",
      rejectedTitle: "ไม่อนุมัติเปิดลูกค้า — ลูกค้าและใบสั่งขายยังไม่ถูกส่งเข้า SAP",
      draftHint:
        "เปิดคำขอ แนบเอกสารที่ประเภทลูกค้านี้บังคับ แล้วกดยื่น — อนุมัติแล้วระบบส่งเข้า SAP ให้เอง",
      inFlightHint: (status: string) => `คำขออนุมัติอยู่ในสถานะ: ${status}`,
      noRequestHint: "ยังไม่มีคำขออนุมัติ — กดยื่นขออนุมัติเพื่อสร้างร่างคำขอ",
      openRequest: (no: string | null) => (no ? `เปิดคำขอ ${no}` : "เปิดร่างคำขอ"),
      raise: "ยื่นขออนุมัติ",
      raised: "สร้างร่างคำขออนุมัติแล้ว — แนบเอกสารแล้วยื่น",
    },
    /* CD-70 */
    contracts: {
      hint: "ระบบเปิดโอกาสต่ออายุให้อัตโนมัติ 90 วันก่อนสิ้นสุด และเตือนผู้รับผิดชอบที่ 60 และ 30 วัน",
      add: "บันทึกสัญญา",
      addTitle: "บันทึกสัญญา (เช่น สัญญาก่อนเริ่มใช้ระบบ)",
      editTitle: "แก้ไขสัญญา",
      save: "บันทึก",
      saved: "บันทึกสัญญาแล้ว",
      edit: "แก้ไข",
      cancel: "ยกเลิกสัญญา",
      openCase: "เปิดเคส",
      empty: "ยังไม่มีสัญญาในทะเบียน",
      requestsTitle: "คำขอสัญญาถึงฝ่ายกฎหมาย",
      openRenewal: "เปิดโอกาสต่ออายุ",
      renewalFrom: (date: string) => `เปิดโอกาสต่ออายุ ${date}`,
      status: {
        active: "มีผล",
        renewed: "ต่ออายุแล้ว",
        ended: "สิ้นสุด",
        cancelled: "ยกเลิก",
      } as Record<string, string>,
      columns: {
        contract: "สัญญา",
        period: "ระยะเวลา",
        value: "มูลค่า (บาท)",
        status: "สถานะ",
        renewal: "ต่ออายุ",
      },
      form: {
        contractNo: "เลขที่สัญญา",
        title: "ชื่อสัญญา",
        period: "วันเริ่ม – วันสิ้นสุด",
        periodHint: "วันเริ่มเว้นว่างได้ · แก้วันสิ้นสุดแล้วระบบนับการเตือนใหม่",
        endRequired: "ต้องระบุวันสิ้นสุด",
        value: "มูลค่าสัญญา (บาท)",
        note: "หมายเหตุ",
        required: "จำเป็นต้องกรอก",
      },
    },
    /* CD-61 */
    kycRiskTag: (level: string) => `ความเสี่ยง${level}`,
    kycValidUntil: (date: string) => `KYC ใช้ได้ถึง ${date}`,
    kycReviewDue: "KYC ใกล้หมดอายุ — ยื่นทบทวน",
    kyc: {
      tab: "KYC",
      status: "สถานะ",
      verified: "ยืนยันตัวตนแล้ว",
      expired: "หมดอายุ",
      notVerified: "ยังไม่ผ่าน KYC",
      risk: "ความเสี่ยง",
      validUntil: "ใช้ได้ถึง",
      riskLevels: { low: "ต่ำ", medium: "กลาง", high: "สูง" } as Record<
        string,
        string
      >,
      screeningClear: "ไม่พบชื่อในรายชื่อต้องห้ามของบริษัท",
      screeningHit: (count: number) =>
        `พบชื่อที่อาจตรงกับรายชื่อต้องห้าม ${count} รายการ — ผู้ตรวจ KYC ต้องระบุเหตุผลการยกเว้น มิฉะนั้น KYC จะไม่ผ่าน`,
      byTaxId: "เลขผู้เสียภาษีตรงกัน",
      byName: (percent: number) => `ชื่อคล้าย ${percent}%`,
      suggestion: (level: string) =>
        `ระบบแนะนำความเสี่ยง: ${level} (จากรายชื่อต้องห้าม — ตอนปิดคำขอ KYC ระบบคิดเอกสารที่ขาดด้วย)`,
      suggestedWas: (level: string) => ` ระบบแนะนำ ${level}`,
      signatories: "ผู้มีอำนาจลงนาม",
      clearance: "เหตุผลที่ยกเว้น",
      noRecords: "ยังไม่เคยผ่านการยืนยันตัวตน — ยื่นคำขอ KYC",
      openRequest: "เปิดคำขอ",
      recordStatus: {
        verified: "ใช้อยู่",
        screening_hit: "ไม่ผ่าน (ตรงรายชื่อต้องห้าม)",
        superseded: "ถูกแทนด้วยครั้งใหม่",
        expired: "หมดอายุ",
      } as Record<string, string>,
      columns: {
        recordedAt: "วันที่ยืนยัน",
        status: "ผล",
        risk: "ความเสี่ยง",
        expiresOn: "ใช้ได้ถึง",
        request: "คำขอ KYC",
      },
    },
    kycHint:
      "KYC บังคับเฉพาะเมื่อโอกาสการขายมี product ที่ต้องยืนยันตัวตน — ลูกค้าทั่วไปใช้งานได้ทันที",

    form: {
      createTitle: "สร้างลูกค้าใหม่",
      editTitle: "แก้ไขข้อมูลลูกค้า",
      sectionMain: "ข้อมูลหลัก",
      sectionLocations: "ที่อยู่ / ไซต์",
      sectionContacts: "ผู้ติดต่อ",
      sectionSegments: "กลุ่มลูกค้า",
      type: "ประเภทลูกค้า",
      nameTh: "ชื่อ (ไทย)",
      nameEn: "ชื่อ (อังกฤษ)",
      taxId: "เลขผู้เสียภาษี 13 หลัก",
      branchCode: "รหัสสาขา (5 หลัก)",
      branchCodeHint:
        "00000 = สำนักงานใหญ่ · สาขาย่อยสร้างเป็นลูกค้ารายใหม่ด้วยเลขภาษีเดิม + รหัสสาขาของตน",
      branchName: "ชื่อสาขา (ถ้ามี)",
      branchNamePlaceholder: "เช่น สาขาราชวงศ์",
      accountOwner: "ผู้รับผิดชอบบัญชี (account owner)",
      accountOwnerSelf: "ตัวฉันเอง",
      createAsDraft: "บันทึกเป็นร่างก่อน (ยังไม่เปิดใช้งาน)",
      submitCreate: "สร้างลูกค้า",
      submitSave: "บันทึกการแก้ไข",
      cancel: "ยกเลิก",
      created: (code: string) => `สร้างลูกค้าแล้ว · รหัส ${code}`,
      saved: "บันทึกการแก้ไขแล้ว",

      locationName: "ชื่อที่อยู่/ไซต์",
      locationNameHint:
        "เช่น สำนักงาน / ไซต์โรงงานบางปู / ห้องเซิร์ฟเวอร์ชั้น 3",
      locationRoles: "ใช้ทำอะไร",
      roleBilling: "ใช้ออกใบกำกับ",
      roleSite: "จุดติดตั้ง/รับของ",
      addressLine1: "ที่อยู่",
      addressLine2: "ที่อยู่ (ต่อ)",
      subDistrict: "แขวง/ตำบล",
      district: "เขต/อำเภอ",
      province: "จังหวัด",
      postalCode: "รหัสไปรษณีย์",
      addLocation: "เพิ่มที่อยู่/ไซต์",
      removeLocation: "ลบ",
      locationsHint:
        "ที่อยู่ออกใบกำกับและไซต์ติดตั้งของลูกค้ารายนี้ — หนึ่งรายการติ๊กได้ทั้งสองบทบาท",

      contactName: "ชื่อผู้ติดต่อ",
      contactRole: "บทบาท",
      contactRoles: {
        decision_maker: "ผู้ตัดสินใจ",
        user: "ผู้ใช้งาน",
        procurement: "จัดซื้อ",
        finance: "การเงิน",
        other: "อื่น ๆ",
      } as Record<string, string>,
      contactPhone: "โทรศัพท์",
      contactEmail: "อีเมล",
      contactLineId: "LINE ID",
      contactPosition: "ตำแหน่ง",
      contactPrimary: "ผู้ติดต่อหลัก",
      addContact: "เพิ่มผู้ติดต่อ",
      consentColumn: "ความยินยอม (PDPA)",
      consentEmail: "อีเมล",
      consentPhone: "โทร",
      consentStates: {
        granted: "ยินยอมแล้ว",
        none: "ยังไม่มีความยินยอม",
        withdrawn: "ถอนความยินยอมแล้ว",
        unknown: "ตรวจไม่ได้",
      } as Record<string, string>,
      doNotCall: "ห้ามโทร",
      consentHint:
        "สถานะอ่านสดจากระบบ PDPA กลาง — ระบบนี้ไม่เก็บสำเนา · ช่องทางที่ไม่มีความยินยอมห้ามใช้ทำแคมเปญ",

      errors: {
        nameRequired: "กรุณากรอกชื่อลูกค้า",
        taxIdFormat: "เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก",
        taxIdChecksum: "เลขผู้เสียภาษีไม่ถูกต้อง (checksum ไม่ผ่าน)",
        branchFormat: "รหัสสาขาต้องเป็นตัวเลข 5 หลัก",
      },
    },

    /** CM-03 — คำเตือน/บล็อคจากการตรวจซ้ำ inline. */
    dedup: {
      duplicateTitle: "เลขผู้เสียภาษีและรหัสสาขานี้มีลูกค้าอยู่แล้ว",
      duplicateBody:
        "สาขาเดียวกันสร้างซ้ำไม่ได้ — เปิดใช้รายเดิม หรือเปลี่ยนรหัสสาขาถ้าตั้งใจสร้างสาขาอื่น",
      headOfficeTitle: "เลขผู้เสียภาษีนี้มีลูกค้าในเครืออยู่แล้ว",
      headOfficeBody: (code: string) =>
        `รายใหม่จะถูกสร้างเป็นสาขา และผูกกับรายหลัก ${code} ให้อัตโนมัติ`,
      similarTitle: "พบลูกค้าชื่อคล้ายกัน",
      similarBody:
        "ตรวจสอบก่อนว่าใช่รายเดิมหรือไม่ — เลือกใช้รายเดิม หรือยืนยันสร้างใหม่พร้อมเหตุผล",
      similarity: (pct: string) => `คล้าย ${pct}%`,
      useExisting: "เปิดดูรายเดิม",
      confirmCreate: "ยืนยันสร้างใหม่ทั้งที่ระบบเตือน",
      confirmNoPermission:
        "การยืนยันสร้างทั้งที่ระบบเตือน ต้องได้รับสิทธิ์เฉพาะ — ติดต่อหัวหน้าหรือผู้ดูแลระบบ",
      overrideReason: "เหตุผลที่ยืนยันสร้าง",
      overrideReasonRequired: "ต้องระบุเหตุผลในการยืนยันสร้าง",
      checking: "กำลังตรวจสอบรายซ้ำ…",
      clear: "ไม่พบรายซ้ำ",
    },

    detail: {
      tabContacts: "ผู้ติดต่อ",
      tabLocations: "ที่อยู่/ไซต์",
      tabBranchCustomers: "สาขาในเครือ",
      tabHistory: "ประวัติการแก้ไข",
      tabTimeline: "ไทม์ไลน์",
      edit: "แก้ไขข้อมูล",
      activate: "เปิดใช้งาน",
      suspend: "พักใช้งาน",
      deactivate: "ปิดใช้งาน",
      reasonLabel: "เหตุผล",
      reasonRequired: "ต้องระบุเหตุผล",
      suspendTitle: "พักใช้งานลูกค้า",
      deactivateTitle: "ปิดใช้งานลูกค้า",
      deactivateHint: "ข้อมูลไม่หายและค้นย้อนได้เสมอ — ระบบนี้ไม่มีการลบลูกค้า",
      statusChanged: "เปลี่ยนสถานะแล้ว",
      mergedInto: (code: string) =>
        `ลูกค้ารายนี้ถูกรวมเข้ากับ ${code} — แก้ไขที่รายหลักแทน`,
      owner: "ผู้รับผิดชอบบัญชี",
      createdAt: "สร้างเมื่อ",
      updatedAt: "แก้ไขล่าสุด",
      code: "รหัสลูกค้า",
      taxId: "เลขผู้เสียภาษี",
      taxIdMasked: "เลขผู้เสียภาษีถูกปกปิดตามสิทธิ์ของคุณ",
      historyMasked: "ปกปิด",
      branch: "สาขา",
      headOfficeTag: "สำนักงานใหญ่",
      headOfficeOf: (code: string) => `สาขาของ ${code}`,
      site: "จุดติดตั้ง/รับของ",
      billingLoc: "ออกใบกำกับ",
      primaryLoc: "ที่อยู่หลัก",
      noContacts: "ยังไม่มีผู้ติดต่อ",
      noLocations: "ยังไม่มีที่อยู่/ไซต์",
      noBranchCustomers: "ยังไม่มีสาขาในเครือ",
      branchColumns: {
        code: "รหัสลูกค้า",
        branch: "สาขา",
        name: "ชื่อสาขา",
        status: "สถานะ",
      },
      noHistory: "ยังไม่มีการแก้ไข",
      noTimeline: "ยังไม่มีเหตุการณ์",
      historyColumns: {
        field: "ฟิลด์",
        before: "ค่าก่อน",
        after: "ค่าหลัง",
        changedBy: "ผู้แก้ไข",
        changedAt: "เมื่อ",
      },
      fieldNames: {
        type: "ประเภทลูกค้า",
        nameTh: "ชื่อ (ไทย)",
        nameEn: "ชื่อ (อังกฤษ)",
        taxId: "เลขผู้เสียภาษี",
        branchCode: "รหัสสาขา",
        branchName: "ชื่อสาขา",
        accountOwnerUserId: "ผู้รับผิดชอบบัญชี",
        status: "สถานะ",
      } as Record<string, string>,
      deleteContactConfirm: "ลบผู้ติดต่อนี้?",
      deleteLocationConfirm: "ลบที่อยู่/ไซต์นี้?",
      saveSegments: "บันทึกกลุ่ม",
      segmentsSaved: "บันทึกกลุ่มลูกค้าแล้ว",
      raiseRequest: "ยื่นคำขอ",
      raiseKyc: "ยื่น KYC",
      cards: {
        openOpportunities: "โอกาสการขายเปิด",
        openOpportunitiesAmount: (amount: string) => `มูลค่ารวม ${amount} บาท`,
        openRequests: "คำขอค้าง",
        totalRequestsSuffix: (total: string) => `จากทั้งหมด ${total}`,
        contacts: "ผู้ติดต่อ",
        locations: "ที่อยู่/ไซต์",
        branchCustomers: "สาขาในเครือ",
        outstanding: "ยอดค้างชำระ",
        outstandingPending: "มาพร้อมตัวเชื่อม SAP",
        outstandingDetail: (count: string, asOf: string) =>
          `ค้าง ${count} ใบ · ข้อมูล ${asOf}`,
      },
      tabOpportunities: "โอกาสการขาย",
      tabQuotations: "ใบเสนอราคา",
      tabSaleOrders: "ใบสั่งขาย",
      tabRequests: "คำขอ",
      noRequests: "ยังไม่มีคำขอที่อ้างถึงลูกค้ารายนี้",
      requestColumns: {
        no: "เลขที่",
        type: "ประเภท",
        status: "สถานะ",
        due: "กำหนด",
      },
      /** C360-01 — โครงหน้าครบตั้งแต่แรก: แท็บที่ยังไม่มาระบุระยะไว้เลย */
      futureTabs: {
        opportunities: {
          label: "โอกาสการขาย",
          phase: "มาพร้อมโมดูล Sales (CRM ระยะถัดไป)",
        },
        quotations: {
          label: "ใบเสนอราคา",
          phase: "มาพร้อมโมดูล Sales (CRM ระยะถัดไป)",
        },
        contracts: { label: "สัญญา", phase: "มาพร้อมโมดูล Legal (ระยะ 2)" },
        projects: { label: "โครงการ", phase: "มาพร้อมโมดูล PM (ระยะ 3)" },
        cases: {
          label: "เคส",
          phase: "มาพร้อมงานเคส/ข้อร้องเรียน (CRM ระยะถัดไป)",
        },
        financials: {
          label: "การเงิน",
          phase:
            "มาพร้อมตัวเชื่อม SAP (ชุดงาน D) — ยอดค้างชำระอ่านจาก SAP ที่เดียว",
        },
        assets: {
          label: "อุปกรณ์",
          phase:
            "มาพร้อมโมดูล Service & Support — ทะเบียนอุปกรณ์สร้างอัตโนมัติตอนส่งมอบ",
        },
      },
      futureTabNote: (phase: string) => `แท็บนี้ ${phase}`,
      /** CD-89 — แท็บการเงิน: ใบแจ้งหนี้และการรับชำระจาก SAP */
      tabFinancials: "การเงิน",
      tabAccount: "แผนบัญชี",
      invoices: {
        source: {
          mock: "รอเชื่อม SAP จริง — ระบบยังใช้ตัวเชื่อมจำลอง จึงไม่แสดงตัวเลข",
          not_synced: "ลูกค้ารายนี้ยังไม่ได้ส่งเข้า SAP — ยังไม่มีใบแจ้งหนี้",
          unavailable: "อ่านข้อมูลจาก SAP ไม่ได้ในขณะนี้ — ลองใหม่ภายหลัง",
        } as Record<string, string>,
        openSummary: (count: number, amount: string) =>
          `ค้างชำระ ${count} ใบ · ${amount} บาท`,
        overdueSummary: (count: number, amount: string) =>
          `เกินกำหนด ${count} ใบ · ${amount} บาท`,
        asOf: (when: string) => `ข้อมูลจาก SAP ณ ${when}`,
        empty: "ยังไม่มีใบแจ้งหนี้ใน SAP",
        overdueTag: "เกินกำหนด",
        status: {
          open: "ค้างชำระ",
          paid: "ชำระแล้ว",
          cancelled: "ยกเลิก",
        } as Record<string, string>,
        statusColor: {
          open: "gold",
          paid: "green",
          cancelled: "default",
        } as Record<string, string>,
        columns: {
          docNo: "เลขที่",
          reference: "อ้างอิง",
          issued: "วันที่ออก",
          due: "ครบกำหนด",
          total: "ยอด",
          paid: "ชำระแล้ว",
          outstanding: "คงค้าง",
          status: "สถานะ",
        },
        note: "อ่านจาก SAP (read-only) — 50 ใบล่าสุด รวมใบจากระบบสายบัญชีทุกระบบ",
      },
    },

    /** CM-10 — นำเข้าลูกค้าเดิมจาก Excel (admin.crm.manage). */
    importer: {
      title: "นำเข้าลูกค้าจาก Excel",
      subtitle:
        "สำหรับข้อมูลลูกค้าเดิมที่ผ่านการ cleansing แล้ว — ระบบตรวจซ้ำให้ นำเข้าไฟล์เดิมซ้ำจะข้ามรายที่มีอยู่",
      openButton: "นำเข้า Excel",
      downloadTemplate: "ดาวน์โหลดไฟล์ต้นแบบ",
      templateFile: "customer-import-template.xlsx",
      templateHint:
        "คอลัมน์เลขผู้เสียภาษี/รหัสสาขา/รหัสไปรษณีย์ ตั้งเป็นข้อความไว้แล้ว — อย่าเปลี่ยนเป็นตัวเลข เลข 0 นำหน้าจะหาย",
      uploadHint:
        "ลากไฟล์ .xlsx มาวาง หรือคลิกเลือกไฟล์ (ใช้ชีตแรก แถวแรกเป็นหัวคอลัมน์)",
      parsing: "กำลังอ่านไฟล์…",
      parsedRows: (n: string) =>
        `อ่านได้ ${n} แถว — ตรวจสอบผลด้านล่างก่อนยืนยัน`,
      checking: "กำลังตรวจกับระบบ…",
      importing: "กำลังนำเข้า…",
      confirm: "ยืนยันนำเข้า",
      reupload: "เลือกไฟล์ใหม่",
      emptyFile: "ไฟล์ไม่มีข้อมูล (ต้องมีหัวคอลัมน์ + อย่างน้อย 1 แถว)",
      missingNameColumn: 'ไม่พบคอลัมน์ "ชื่อ (ไทย)" — ใช้ไฟล์ต้นแบบเป็นตัวตั้ง',
      done: (n: string) => `นำเข้าสำเร็จ ${n} ราย`,
      backToList: "ไปหน้าทะเบียนลูกค้า",
      summary: {
        create: "จะสร้าง",
        created: "สร้างแล้ว",
        skip: "ข้าม (มีอยู่แล้ว)",
        error: "ติดปัญหา",
      },
      columns: {
        row: "แถว",
        name: "ชื่อลูกค้า",
        branch: "สาขา",
        action: "ผล",
        detail: "รายละเอียด",
      },
      actionLabel: {
        create: "สร้าง",
        skip_duplicate: "ข้าม — มีอยู่แล้ว",
        error: "ติดปัญหา",
      } as Record<string, string>,
      headOfficeNote: (code: string) => `ผูกเป็นสาขาของ ${code}`,
      headOfficeRowNote: (row: string) =>
        `ผูกเป็นสาขาของรายในแถว ${row} ของไฟล์นี้`,
      duplicateOfRow: (row: string) =>
        `เลขภาษี+สาขาซ้ำกับแถว ${row} ของไฟล์นี้`,
      possibleDuplicate: (code: string) =>
        `ไม่มีเลขภาษี แต่ชื่อตรงกับลูกค้า ${code} ที่มีอยู่แล้ว — ตรวจก่อนยืนยัน จะถูกสร้างเป็นรายใหม่`,
      possibleDuplicateRow: (row: string) =>
        `ไม่มีเลขภาษี แต่ชื่อตรงกับแถว ${row} ของไฟล์นี้ — ตรวจก่อนยืนยัน`,
      partialCommit: (done: string, total: string, cause: string) =>
        `นำเข้าหยุดกลางทาง: ${done} จาก ${total} แถวถูกนำเข้าแล้ว (ดูผลด้านล่าง) — ${cause}. ` +
        `ถ้านำเข้าไฟล์เดิมซ้ำ แถวที่มีเลขภาษีจะถูกข้าม แต่แถวที่ไม่มีเลขภาษีจะถูกสร้างซ้ำ ให้ลบแถวที่นำเข้าแล้วออกก่อน`,
      reasonLabels: {
        "name_th: required": "ไม่มีชื่อลูกค้า",
        "type: invalid": "ประเภทลูกค้าไม่ถูกต้อง",
        "tax_id: format": "เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก",
        "tax_id: checksum": "เลขผู้เสียภาษีไม่ถูกต้อง (checksum)",
        "branch_code: format": "รหัสสาขาต้องเป็นตัวเลข 5 หลัก",
        "postal_code: format": "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
        "contact_email: format": "อีเมลไม่ถูกต้อง",
        duplicate_race:
          "มีลูกค้าเลขภาษี+สาขานี้ถูกสร้างพร้อมกันจากที่อื่น — นำเข้าซ้ำเพื่อให้ข้ามแถวนี้",
        internal:
          "ระบบขัดข้องระหว่างนำเข้าแถวนี้ — ลองนำเข้าใหม่ (แถวที่เข้าแล้วจะถูกข้าม)",
      } as Record<string, string>,
      headers: {
        type: "ประเภท",
        nameTh: "ชื่อ (ไทย)",
        nameEn: "ชื่อ (อังกฤษ)",
        taxId: "เลขผู้เสียภาษี",
        branchCode: "รหัสสาขา",
        branchName: "ชื่อสาขา",
        line1: "ที่อยู่",
        line2: "ที่อยู่ (ต่อ)",
        subDistrict: "แขวง/ตำบล",
        district: "เขต/อำเภอ",
        province: "จังหวัด",
        postalCode: "รหัสไปรษณีย์",
        contactName: "ผู้ติดต่อ",
        contactPhone: "โทรศัพท์",
        contactEmail: "อีเมล",
      },
    },

    /** หน้าตั้งค่า CRM (admin.crm.manage). */
    admin: {
      title: "ตั้งค่า CRM",
      sectionSegments: "มิติการแบ่งกลุ่มลูกค้า",
      sectionKycProducts: "Product ที่ต้องยืนยันตัวตน (KYC)",
      kycProductsHint:
        "KYC ไม่บังคับทุกราย — โมดูลโอกาสการขายจะใช้ตารางนี้แจ้งเตือนเมื่อโอกาสการขายมี product ที่เข้าเงื่อนไข · รายการตั้งต้นรอยืนยันจาก PO/การเงิน กรอกได้เลยเมื่อได้รายการ",
      kycProductCode: "รหัส product (ตรงกับ SAP)",
      kycProductName: "ชื่อ product",
      addKycProduct: "เพิ่ม product",
      kycColumns: {
        code: "รหัส",
        name: "ชื่อ",
        active: "ใช้งาน",
      },
      segmentsHint:
        "เพิ่ม/แก้ค่ากลุ่มได้โดยไม่ต้อง deploy — โมดูล Pricing ระยะ 2 จะอ่านค่ากลุ่มจากที่นี่",
      addDimension: "เพิ่มมิติ",
      addValue: "เพิ่มค่า",
      dimensionCode: "รหัสมิติ (a-z, 0-9)",
      dimensionName: "ชื่อมิติ",
      valueCode: "รหัสค่า",
      valueName: "ชื่อค่า",
      active: "ใช้งาน",
      inactiveTag: "ปิดใช้",
      valueInUse: "กลุ่มนี้มีลูกค้าถูกจัดอยู่ — ปิดใช้งานแทนการลบ",
      deleteValueConfirm: "ลบค่านี้? (ลบได้เฉพาะค่าที่ยังไม่มีลูกค้าใช้)",
      sectionConfig: "การตรวจลูกค้าซ้ำ",
      codeFormatMoved: "รูปแบบรหัสลูกค้า (prefix / จำนวนหลัก) ตั้งที่หน้า",
      codeFormatLink: "เลขรันเอกสาร",
      dedupThreshold: "ระดับความคล้ายที่เตือน (0.5–1.0)",
      dedupThresholdHint:
        "ยิ่งต่ำยิ่งเตือนบ่อย — ค่าตั้งต้น 0.85 · จูนได้ระหว่าง UAT",
      sectionQuotation: "ใบเสนอราคาและการตรวจ margin",
      minMarginPct: "margin ขั้นต่ำ (%)",
      quotationValidityDays: "อายุใบเสนอราคา (วัน)",
      vatPct: "VAT (%)",
      quotationApprovalTypeCode: "ประเภทคำขอที่ใช้ขออนุมัติ margin ต่ำ",
      sectionTargets: "เป้าขาย",
      targetApprovalTypeCode: "ประเภทคำขอที่ใช้ขออนุมัติการปรับเป้า",
      /* CD-79 */
      sectionTradeTerms: "เงื่อนไขการค้ามาตรฐาน",
      tradeTermsHint:
        "การต่อรองที่ตกลงค่าต่างจากมาตรฐาน (หรือเงื่อนไขนอกรายการ) จะถูกทำเครื่องหมายและส่งฝ่ายกฎหมายตรวจอัตโนมัติ — ลบออกจากรายการ = ปิดใช้ (รอบการต่อรองเก่ายังเก็บค่ามาตรฐาน ณ วันนั้น)",
      tradeTermCode: "รหัส",
      tradeTermName: "เงื่อนไข",
      tradeTermStandard: "ค่ามาตรฐาน",
      tradeTermAdd: "เพิ่มเงื่อนไข",
      tradeTermSave: "บันทึกเงื่อนไขมาตรฐาน",
      /* CD-62 */
      sectionCustomerApproval: "อนุมัติเปิดลูกค้าใหม่",
      customerApprovalHint:
        "เลือกประเภทคำขอที่ใช้อนุมัติลูกค้าใหม่ต่อประเภทลูกค้า (เอกสารบังคับตั้งที่ประเภทคำขอ) — ลูกค้าใหม่ของประเภทที่เลือกจะยังไม่ส่งเข้า SAP (ทั้งลูกค้าและใบสั่งขาย) จนกว่าคำขอได้รับอนุมัติ · ไม่เลือก = ไม่ต้องอนุมัติ · ลูกค้าที่มีอยู่แล้วถือว่าอนุมัติแล้ว",
      customerApprovalNone: "ไม่ต้องอนุมัติ",
      customerApprovalSave: "บันทึก",
      /* CD-84 */
      sectionHandover: "ส่งมอบงานต่อจากฝ่ายขาย",
      handoverHint:
        "รายการที่ผู้ขายต้องยืนยันก่อนส่งงานให้ทีมถัดไป — ติ๊ก \"ต้องกรอกรายละเอียด\" ถ้าต้องการคำตอบไม่ใช่แค่ติ๊ก · ลบออก = ปิดใช้ (งานที่ส่งไปแล้วเก็บรายการ ณ วันส่ง)",
      handoverTeam: "ทีมที่รับงานโดยปริยาย",
      handoverTeamNone: "ไม่กำหนด (ผู้ขายเลือกเอง)",
      handoverCode: "รหัส",
      handoverCategory: "หมวด",
      handoverLabel: "รายการ",
      handoverRequiresDetail: "ต้องกรอกรายละเอียด",
      handoverAdd: "เพิ่มรายการ",
      handoverSave: "บันทึกรายการตรวจ",
      handoverTeamSave: "บันทึกทีม",
      /* CD-81 */
      /* CD-61 */
      sectionKyc: "KYC และรายชื่อต้องห้าม",
      kycReviewMonths: "ทบทวน KYC ทุก (เดือน)",
      kycReviewHint:
        "ตามระดับความเสี่ยงที่ผู้ตรวจกำหนด — เอกสารที่หมดอายุก่อนทำให้ KYC หมดอายุตามวันนั้น · แจ้งผู้รับผิดชอบลูกค้าล่วงหน้า 30 วัน",
      kycSaveMonths: "บันทึก",
      watchlistTitle: "รายชื่อต้องห้าม",
      watchlistHint:
        "ตอนปิดคำขอ KYC ระบบตรวจเลขผู้เสียภาษี (ตรงทุกหลัก) และชื่อ (คล้าย ≥ 85%) — ตรงแล้วต้องมีเหตุผลการยกเว้นจากผู้ตรวจ ไม่งั้น KYC ไม่ผ่าน",
      watchlistPaste: "เพิ่มรายชื่อ — บรรทัดละราย: ชื่อ | เลขผู้เสียภาษี | เหตุผล | แหล่งที่มา",
      watchlistPastePlaceholder:
        "บริษัท ตัวอย่าง จำกัด | 0105551234567 | อยู่ในรายชื่อคว่ำบาตร | ประกาศ 2569/12",
      watchlistAdd: "เพิ่มรายชื่อ",
      watchlistAdded: (count: number) => `เพิ่มแล้ว ${count} รายการ`,
      watchlistBadLine: (line: number) =>
        `บรรทัดที่ ${line} ต้องมีอย่างน้อย ชื่อ | เลขผู้เสียภาษี (เว้นว่างได้) | เหตุผล`,
      watchlistDeactivate: "ปิดใช้",
      watchlistEmpty: "ยังไม่มีรายชื่อต้องห้าม",
      watchlistColumns: {
        name: "ชื่อ",
        taxId: "เลขผู้เสียภาษี",
        reason: "เหตุผล",
        source: "แหล่งที่มา",
      },
      sectionContracts: "สัญญา",
      /* CD-130 */
      sectionSolutions: "Solution (Pre-Sales)",
      solutionRequestTypeCode: "ประเภทคำขอ \"ขอ Solution และประเมินต้นทุน\"",
      solutionHint:
        "หน้าดีลจะมีการ์ด “Solution” พร้อมปุ่มขอ Solution ด้วยประเภทนี้ — ช่องบังคับของฟอร์มประเภทนี้คือรายการตรวจความครบก่อนยื่น (แก้ได้ที่หน้าประเภทคำขอ) · เว้นว่าง = ไม่แสดงการ์ด",
      /* CD-136 */
      vendorQuoteTypeCode: "ประเภทคำขอ \"ขอราคาจากคู่ค้า\"",
      laborRates: "อัตราต้นทุนแรงงานต่อ manday (Pre-Sales)",
      laborRatesHint: "ใช้ประมาณต้นทุนแรงงานบน Solution — แทนที่ด้วยอัตราจากโมดูล HR เมื่อพร้อม (CD-17) · อัตราถูกคัดลอกลงประมาณการ ณ วันบันทึก",
      laborRole: "บทบาท",
      laborRate: "บาท/manday",
      addLaborRate: "เพิ่มบทบาท",
      /* CD-139 */
      demoRequestTypeCode: "ประเภทคำขอ \"ขอจัด Demo หรือ POC\"",
      demoHint:
        "หน้าดีลจะมีการ์ด “Demo / POC” พร้อมปุ่มขอจัด — หัวหน้าทีมที่รับเรื่องรับคำขอ = อนุมัติ · เว้นว่าง = ไม่แสดงการ์ด",
      /* CD-143 */
      solutionApprovalTypeCode: "ประเภทคำขอ \"ขออนุมัติ Solution\"",
      solutionApprovalHint:
        "หน้า Solution จะมีปุ่มขออนุมัติบนเวอร์ชันที่ยืนยันแล้ว — ผู้อนุมัติคือตารางอำนาจอนุมัติของประเภทนี้ · เว้นว่าง = ไม่แสดงปุ่ม",
      contractRequestTypeCode: "ประเภทคำขอที่ฝ่ายกฎหมายรับทำ/แก้สัญญา",
      liabilityApprovalRequestTypeCode:
        "ประเภทคำขออนุมัติเพดานความรับผิดเกินมูลค่าสัญญา",
      liabilityApprovalHint:
        "เมื่อบันทึกข้อกำหนดสัญญาที่เพดานความรับผิดสูงกว่ามูลค่าสัญญา (หรือไม่จำกัด) ระบบสร้างและยื่นคำขอประเภทนี้ถึงผู้บริหารให้อัตโนมัติ · ว่าง = ยังไม่ส่ง",
      legalRiskOpinionTypeCode: "ประเภทคำขอความเห็นความเสี่ยงทางกฎหมาย",
      contractApprovalTypeCode: "ประเภทคำขออนุมัติสัญญา",
      contractApprovalHint:
        "หน้าร่างสัญญามีปุ่มขออนุมัติฉบับล่าสุดด้วยประเภทนี้ · form มี contract_value (มูลค่า) และ risk_level (low/medium/high/critical) — ตั้งเงื่อนไขในตารางอำนาจอนุมัติเพื่อกำหนดเส้นทางตามมูลค่าและระดับความเสี่ยง · แก้ร่างหลังขออนุมัติ = การอนุมัติเป็นโมฆะ",
      legalRiskOpinionHint:
        "เมื่อฝ่ายกฎหมายประเมินสัญญาว่าความเสี่ยงสูง/วิกฤต หรือมีประเด็นที่ต้องเสนอผู้บริหาร ระบบสร้างและยื่นคำขอประเภทนี้ให้อัตโนมัติ — สัญญายังลงนามไม่ได้จนกว่าผู้บริหารเห็นชอบ · ว่าง = ยังไม่ส่ง",
      contractHint:
        "หน้าดีลจะมีการ์ด “สัญญา” พร้อมปุ่มขอจัดทำ/แก้ไขสัญญาด้วยประเภทนี้ และติดตามสถานะร่างได้จากหน้าดีล — เว้นว่าง = ไม่แสดงการ์ด · ประเภทคำขอต้องเปิดให้บริษัทนี้ใช้",
      targetHint:
        "ปรับเป้าของเดือนที่เริ่มแล้วต้องผ่านคำขอประเภทนี้ (ผู้อนุมัติตามตารางอำนาจอนุมัติของประเภท) — เว้นว่าง = ปรับเป้าระหว่างเดือนไม่ได้ · ตั้งเป้าเดือนหน้าทำได้เสมอ",
      quotationHint:
        "ใบเสนอราคาที่ margin ต่ำกว่าเกณฑ์ต้องผ่านคำขออนุมัติก่อนส่งลูกค้า — เกณฑ์ที่ใช้ถูกเก็บลงใบตอนยื่น แก้ค่าที่นี่ไม่ตัดสินใบเดิมใหม่ · ประเภทคำขอต้องเปิดให้บริษัทนี้ใช้",
      letterhead: {
        title: "หัวกระดาษใบเสนอราคา",
        hint: "ข้อมูลตามทะเบียนของบริษัทผู้ขายที่พิมพ์บนใบเสนอราคา — ช่องที่เว้นว่างจะไม่แสดงบนเอกสาร (ชื่อบริษัทว่าง = ใช้ชื่อบริษัทในระบบ)",
        logo: "โลโก้",
        noLogo: "ยังไม่มีโลโก้",
        chooseLogo: "เลือกไฟล์โลโก้",
        removeLogo: "ลบโลโก้",
        logoHint:
          "png, jpeg หรือ webp ไม่เกิน 360KB — แนะนำพื้นหลังโปร่งใส สูงประมาณ 200px",
        logoType: "โลโก้ต้องเป็นไฟล์ png, jpeg หรือ webp",
        logoTooLarge: "ไฟล์โลโก้ใหญ่เกิน 360KB — ย่อขนาดก่อนอัปโหลด",
        nameTh: "ชื่อบริษัท (ไทย) ตามทะเบียน",
        nameEn: "ชื่อบริษัท (อังกฤษ)",
        taxId: "เลขประจำตัวผู้เสียภาษี",
        branch: "สำนักงานใหญ่ / สาขา",
        address: "ที่อยู่",
        phone: "โทรศัพท์",
        email: "อีเมล",
        website: "เว็บไซต์",
        terms: "เงื่อนไขมาตรฐานท้ายใบเสนอราคา",
        termsPlaceholder:
          "เช่น 1. ราคานี้รวมค่าติดตั้งแล้ว\n2. รับประกันอุปกรณ์ 1 ปี",
        save: "บันทึกหัวกระดาษ",
      },
      sectionFollowUp: "การติดตามโอกาสการขาย",
      staleMoved: "เกณฑ์แจ้งเตือนดีลเงียบย้ายไปรวมกับกติกาแจ้งเตือนอื่นแล้ว —",
      staleMovedLink: "ตั้งที่หน้ากติกาแจ้งเตือน",
      discoveryRequired: "ต้องทำ Discovery ครบก่อนเปิดโอกาสการขายจาก Lead",
      healthNoContactDays: "ไม่ได้ติดต่อลูกค้าเดิมเกิน (วัน) = เฝ้าระวัง",
      healthNoContactHint:
        "สุขภาพลูกค้าในแกน Keeper: เกินจำนวนนี้ = เฝ้าระวัง, เกินสองเท่า = เสี่ยง · 0 = ไม่ใช้สัญญาณนี้",
      discoveryRequiredHint:
        "หน้า Lead จะเตือนเมื่อยังไม่ครบ · การบังคับจริงอยู่ที่ขั้นตอน workflow ของ Lead (lwf-0001) ซึ่งอ่านค่านี้",
      save: "บันทึกการตั้งค่า",
      saved: "บันทึกแล้ว",
    },
  },

  /** CD-161 — คลังสัญญา (ฝ่ายกฎหมาย). */
  contracts: {
    title: "คลังสัญญา",
    subtitle:
      "สัญญาทุกฉบับของบริษัท — สัญญาลูกค้า NDA ข้อตกลงหลัก (MSA) และสัญญากับคู่สัญญาอื่น ค้นได้ถึงข้อความในไฟล์ PDF",
    kind: {
      standard: "สัญญาซื้อขาย/บริการ",
      nda: "NDA",
      msa: "ข้อตกลงหลัก (MSA)",
      other: "อื่น ๆ",
    } as Record<string, string>,
    kindColor: {
      standard: "blue",
      nda: "purple",
      msa: "cyan",
      other: "default",
    } as Record<string, string>,
    status: {
      active: "มีผล",
      renewed: "ต่ออายุแล้ว",
      ended: "สิ้นสุด",
      cancelled: "ยกเลิก",
    } as Record<string, string>,
    statusColor: {
      active: "green",
      renewed: "blue",
      ended: "default",
      cancelled: "red",
    } as Record<string, string>,
    confidential: "ลับพิเศษ",
    searchPlaceholder: "เลขที่ ชื่อสัญญา คู่สัญญา หรือลูกค้า",
    textPlaceholder: "ข้อความในเนื้อสัญญา (PDF)",
    allKinds: "ทุกชนิด",
    allStatuses: "ทุกสถานะ",
    endsBetween: "หมดอายุระหว่าง",
    onlyConfidential: "เฉพาะลับพิเศษ",
    create: "บันทึกสัญญา",
    empty: "ไม่พบสัญญาตามเงื่อนไข",
    found: (count: number) => `พบ ${count} ฉบับ`,
    columns: {
      contract: "สัญญา",
      party: "คู่สัญญา",
      kind: "ชนิด",
      period: "ระยะเวลา",
      value: "มูลค่า",
      status: "สถานะ",
      files: "ไฟล์",
    },
    daysLeft: (days: number) =>
      days < 0 ? `หมดแล้ว ${-days} วัน` : `อีก ${days} วัน`,
    form: {
      createTitle: "บันทึกสัญญาในคลัง",
      editTitle: (no: string) => `แก้ไขสัญญา ${no}`,
      kind: "ชนิดสัญญา",
      contractNo: "เลขที่สัญญา",
      title: "ชื่อสัญญา",
      partyType: "คู่สัญญา",
      partyCustomer: "ลูกค้าในทะเบียน",
      partyOther: "คู่สัญญาอื่น",
      customer: "ลูกค้า",
      customerPlaceholder: "พิมพ์ชื่อหรือรหัสลูกค้า",
      counterpartyName: "ชื่อคู่สัญญา",
      counterpartyTaxId: "เลขประจำตัวผู้เสียภาษี (ถ้ามี)",
      startOn: "วันเริ่ม",
      endOn: "วันสิ้นสุด",
      value: "มูลค่า (บาท)",
      note: "หมายเหตุ",
      status: "สถานะ",
      required: "จำเป็นต้องกรอก",
      save: "บันทึก",
      saved: "บันทึกแล้ว",
      ndaScope: "ข้อมูลที่คุ้มครอง",
      ndaScopePlaceholder: "เช่น แบบระบบ ราคา ข้อมูลลูกค้า",
      ndaDirection: "ทิศทางการเปิดเผยข้อมูล",
      master: "อ้างอิงข้อตกลงหลัก (MSA)",
      masterPlaceholder: "ไม่อ้างอิง",
      masterHint: "ข้อตกลงหลักต้องเป็นคู่สัญญาเดียวกัน — แก้ข้อตกลงหลักแล้วผู้รับผิดชอบสัญญานี้จะได้รับแจ้ง",
    },
    ndaDirection: {
      mutual: "เปิดเผยทั้งสองฝ่าย",
      disclosing: "เราเป็นผู้เปิดเผย",
      receiving: "เราเป็นผู้รับข้อมูล",
    } as Record<string, string>,
    underMaster: (no: string) => `ภายใต้ ${no}`,
    detail: {
      back: "กลับไปคลังสัญญา",
      edit: "แก้ไข",
      party: "คู่สัญญา",
      taxId: "เลขประจำตัวผู้เสียภาษี",
      owner: "ผู้รับผิดชอบ",
      period: "ระยะเวลา",
      value: "มูลค่า",
      note: "หมายเหตุ",
      fromRequest: "มาจากคำขอสัญญา",
      renewalDeal: "ดีลต่ออายุ",
      filesTitle: "ไฟล์สัญญา",
      upload: "แนบไฟล์",
      uploadHint: "PDF, Word หรือรูป ไม่เกิน 25 MB — PDF จะถูกดึงข้อความไว้ค้นหา",
      uploaded: "แนบไฟล์แล้ว",
      noFiles: "ยังไม่มีไฟล์",
      removeConfirm: "ลบไฟล์นี้?",
      removed: "ลบไฟล์แล้ว",
      textStatus: {
        extracted: "ค้นข้อความได้",
        empty: "ไม่มีข้อความ (ไฟล์สแกน)",
        failed: "อ่านข้อความไม่ได้",
        not_pdf: "ไม่ใช่ PDF — ไม่ได้ค้นเนื้อหา",
      } as Record<string, string>,
      textStatusColor: {
        extracted: "green",
        empty: "orange",
        failed: "red",
        not_pdf: "default",
      } as Record<string, string>,
      accessTitle: "การเข้าถึง",
      confidentialSwitch: "สัญญาลับพิเศษ",
      confidentialHint:
        "เมื่อเปิด เห็นได้เฉพาะฝ่ายกฎหมาย ผู้รับผิดชอบ ผู้บันทึก และรายชื่อด้านล่าง — รวมถึงในหน้าลูกค้า",
      accessUsers: "ผู้ที่เปิดดูได้เพิ่มเติม",
      accessSave: "บันทึกการเข้าถึง",
      accessSaved: "บันทึกการเข้าถึงแล้ว",
      notConfidential: "สัญญาทั่วไป — ผู้มีสิทธิ์ดูคลังสัญญาเห็นได้ทุกคน",
      master: "ข้อตกลงหลัก (MSA)",
      ndaScope: "ข้อมูลที่คุ้มครอง",
      ndaDirection: "ทิศทาง",
      subContractsTitle: "สัญญาย่อยภายใต้ข้อตกลงนี้",
      noSubContracts: "ยังไม่มีสัญญาที่อ้างอิงข้อตกลงนี้",
      subContractsHint:
        "แก้รายละเอียด ข้อกำหนด หรือไฟล์ของข้อตกลงหลัก ระบบแจ้งผู้รับผิดชอบสัญญาย่อยที่ยังมีผลทุกฉบับ",
    },
    /** CD-163 — ติดตามข้อผูกพัน. */
    obligations: {
      title: "ข้อผูกพันตามสัญญา",
      add: "เพิ่มข้อผูกพัน",
      edit: "แก้ไข",
      empty: "ยังไม่ได้แตกข้อผูกพันจากสัญญานี้",
      hint: "แตกสิ่งที่สัญญาผูกพันเราไว้เป็นรายการที่มีผู้รับผิดชอบและกำหนด — ผู้รับผิดชอบได้รับแจ้ง เตือนก่อนถึงกำหนด และทำเครื่องหมายว่าทำแล้วเองได้",
      formTitle: "ข้อผูกพัน",
      itemTitle: "ต้องทำอะไร",
      detail: "รายละเอียด",
      clause: "อ้างอิงข้อในสัญญา",
      clausePlaceholder: "เช่น ข้อ 7.2",
      owner: "ผู้รับผิดชอบ",
      dueOn: "กำหนด",
      required: "ต้องระบุสิ่งที่ต้องทำและผู้รับผิดชอบ",
      saved: "บันทึกข้อผูกพันแล้ว",
      done: "ทำแล้ว",
      doneTitle: (title: string) => `บันทึกว่าทำแล้ว: ${title}`,
      doneNote: "บันทึก (ถ้ามี)",
      marked: "บันทึกว่าทำแล้ว",
      waive: "ยกเว้น",
      waiveConfirm: "ยกเว้นข้อผูกพันนี้? ผู้รับผิดชอบจะไม่ได้รับการเตือนอีก",
      reopen: "เปิดใหม่",
      status: {
        open: "ต้องทำ",
        done: "ทำแล้ว",
        waived: "ยกเว้น",
      } as Record<string, string>,
      statusColor: {
        open: "blue",
        done: "green",
        waived: "default",
      } as Record<string, string>,
      overdue: "เลยกำหนด",
      noDue: "ไม่มีกำหนด",
      doneBy: (name: string, at: string) => `${name} · ${at}`,
      mineTitle: "ข้อผูกพันของฉัน",
      mineSubtitle:
        "สิ่งที่สัญญาของบริษัทผูกพันไว้และมอบให้คุณรับผิดชอบ — ทำแล้วกด \"ทำแล้ว\" ระบบจะหยุดเตือน",
      mineEmpty: "ไม่มีข้อผูกพันที่ต้องทำ",
      contract: "สัญญา",
    },
    /** CD-146 — แม่แบบสัญญา. */
    templates: {
      title: "แม่แบบสัญญา",
      subtitle:
        "ข้อสัญญาเรียงตามลำดับ ใส่ตัวแปร {{ชื่อ}} ได้ — ตอนเริ่มร่าง ระบบเติมค่าจากคำขอ ดีล ลูกค้า เงื่อนไขการค้าที่ต่อรอง และหัวกระดาษ · แก้แม่แบบไม่กระทบร่างที่เริ่มไปแล้ว",
      add: "สร้างแม่แบบ",
      edit: "แก้ไข",
      empty: "ยังไม่มีแม่แบบสัญญา",
      code: "รหัส",
      name: "ชื่อแม่แบบ",
      kind: "ชนิดสัญญา",
      active: "ใช้งาน",
      inactive: "ปิดใช้",
      clauses: (n: number) => `${n} ข้อ`,
      clauseHeading: "หัวข้อ",
      clauseHeadingPlaceholder: "เช่น ข้อ 1 คู่สัญญา",
      clauseBody: "เนื้อความ",
      addClause: "เพิ่มข้อ",
      removeClause: "ลบข้อ",
      moveUp: "เลื่อนขึ้น",
      moveDown: "เลื่อนลง",
      variables: "ตัวแปรที่ใช้ได้ (คลิกเพื่อคัดลอก)",
      termVariables: (pattern: string) =>
        `เงื่อนไขการค้าที่ต่อรองแต่ละข้อ: {{${pattern}}}`,
      copied: "คัดลอกแล้ว",
      saved: "บันทึกแม่แบบแล้ว",
      save: "บันทึก",
      cancel: "ยกเลิก",
      required: "ต้องระบุรหัสและชื่อแม่แบบ",
    },
    /** CD-146 — ร่างสัญญา. */
    drafts: {
      cardTitle: "ร่างสัญญา",
      startHint:
        "เลือกแม่แบบเพื่อเริ่มร่าง — ระบบเติมข้อมูลจากคำขอ ดีล ลูกค้า และเงื่อนไขที่ต่อรองให้",
      noTemplates: "ยังไม่มีแม่แบบสัญญา — สร้างที่เมนูแม่แบบสัญญาก่อน",
      template: "แม่แบบ",
      start: "เริ่มร่าง",
      open: (n: number) => `เปิดร่าง (ฉบับที่ ${n})`,
      readOnly: "คำขอนี้ไม่ได้อยู่ระหว่างดำเนินการ — ดูร่างได้อย่างเดียว",
      title: "ร่างสัญญา",
      fromTemplate: (code: string, name: string) => `จากแม่แบบ ${code} · ${name}`,
      request: "คำขอ",
      version: "ฉบับที่",
      versionOf: (n: number, latest: number) =>
        n === latest ? `ฉบับที่ ${n} (ล่าสุด)` : `ฉบับที่ ${n}`,
      savedBy: (name: string, at: string) => `บันทึกโดย ${name} · ${at}`,
      edit: "แก้ร่าง",
      editLatest: "แก้จากฉบับล่าสุด",
      marks: {
        template: "ตามแม่แบบ",
        edited: "แก้จากแม่แบบ",
        added: "เพิ่มใหม่",
      } as Record<string, string>,
      markColor: {
        template: "default",
        edited: "orange",
        added: "blue",
      } as Record<string, string>,
      counts: (edited: number, added: number, removed: number) =>
        `แก้ ${edited} · เพิ่ม ${added} · ตัดออก ${removed} ข้อ จากแม่แบบ`,
      showTemplate: "ดูข้อความตามแม่แบบ",
      removedTitle: "ข้อในแม่แบบที่ตัดออก",
      missing: "ยังไม่มีค่า — ต้องกรอกเองในร่าง",
      note: "บันทึกการแก้ไขฉบับนี้",
      notePlaceholder: "เช่น แก้ข้อค่าปรับตามที่ลูกค้าขอ",
      addClause: "เพิ่มข้อ",
      removeClause: "ตัดข้อนี้",
      moveUp: "ขึ้น",
      moveDown: "ลง",
      saveVersion: "บันทึกเป็นฉบับใหม่",
      cancel: "ยกเลิก",
      saved: (n: number) => `บันทึกเป็นฉบับที่ ${n} แล้ว`,
      contractLink: "ร่างสัญญาที่ใช้ทำฉบับนี้",
    },
    /** CD-147 — ตรวจสัญญา. */
    review: {
      compareWith: "เทียบกับฉบับ",
      noCompare: "ไม่เทียบ",
      compareTitle: (from: number, to: number) =>
        `เปรียบเทียบฉบับที่ ${from} → ฉบับที่ ${to}`,
      compareCounts: (changed: number, added: number, removed: number) =>
        `แก้ ${changed} · เพิ่ม ${added} · ตัดออก ${removed} ข้อ`,
      change: {
        same: "ไม่เปลี่ยน",
        changed: "แก้",
        added: "เพิ่ม",
        removed: "ตัดออก",
      } as Record<string, string>,
      changeColor: {
        same: "default",
        changed: "orange",
        added: "blue",
        removed: "red",
      } as Record<string, string>,
      moved: "ย้ายลำดับ",
      headingBefore: (heading: string) => `เดิม: ${heading}`,
      hideSame: "ซ่อนข้อที่ไม่เปลี่ยน",
      title: "การตรวจสัญญา",
      hint: "เปิดรอบตรวจบนฉบับล่าสุด ให้ความเห็นรายข้อ ผู้ร่างตอบทีละข้อว่าแก้แล้วหรือไม่แก้ (พร้อมเหตุผล) — ตอบครบทุกข้อจึงปิดรอบได้",
      open: "เปิดรอบตรวจ",
      openNote: "หมายเหตุรอบตรวจ",
      round: (no: number, version: number) =>
        `รอบที่ ${no} · ตรวจฉบับที่ ${version}`,
      roundStatus: {
        open: "กำลังตรวจ",
        closed: "ปิดรอบแล้ว",
      } as Record<string, string>,
      roundColor: {
        open: "blue",
        closed: "green",
      } as Record<string, string>,
      openedBy: (name: string, at: string) => `เปิดโดย ${name} · ${at}`,
      closedBy: (name: string, at: string, version: number) =>
        `ปิดโดย ${name} · ${at} · ที่ฉบับที่ ${version}`,
      unanswered: (n: number) => `ยังไม่ตอบ ${n} ข้อ`,
      noRounds: "ยังไม่มีรอบตรวจ",
      noComments: "ยังไม่มีความเห็น",
      clause: "ข้อที่ให้ความเห็น",
      comment: "ความเห็น",
      commentPlaceholder: "เช่น ค่าปรับสูงเกินมาตรฐาน เสนอลดเป็นร้อยละ 0.05",
      addComment: "เพิ่มความเห็น",
      commentStatus: {
        open: "รอตอบ",
        resolved: "แก้แล้ว",
        declined: "ไม่แก้",
      } as Record<string, string>,
      commentColor: {
        open: "orange",
        resolved: "green",
        declined: "default",
      } as Record<string, string>,
      changedSince: "ข้อนี้ถูกแก้แล้วหลังฉบับที่ตรวจ",
      notChangedSince: "ข้อนี้ยังไม่ถูกแก้",
      resolvedIn: (n: number) => `แก้ในฉบับที่ ${n}`,
      response: "คำตอบ / เหตุผล",
      resolve: "แก้แล้ว",
      decline: "ไม่แก้",
      reasonRequired: "ไม่แก้ต้องให้เหตุผล",
      close: "ปิดรอบตรวจ",
      closeBlocked: "ตอบความเห็นให้ครบก่อนปิดรอบ",
      opened: "เปิดรอบตรวจแล้ว",
      closed: "ปิดรอบตรวจแล้ว",
      commentCount: (n: number) => `${n} ความเห็น`,
    },
    /** CD-159 — อนุมัติสัญญา. */
    approval: {
      title: "อนุมัติสัญญา",
      hint: "ขออนุมัติร่างฉบับล่าสุด — ตารางอำนาจอนุมัติกำหนดผู้อนุมัติตามมูลค่าและระดับความเสี่ยง · แก้ร่างหลังขออนุมัติ การอนุมัติเป็นโมฆะ",
      request: (n: number) => `ขออนุมัติฉบับที่ ${n}`,
      requestAgain: (n: number) => `ขออนุมัติฉบับที่ ${n} ใหม่`,
      requested: "ส่งขออนุมัติแล้ว",
      blockers: "ยังขออนุมัติไม่ได้",
      notConfigured: "ยังไม่ได้ตั้งประเภทคำขออนุมัติสัญญาในหน้าตั้งค่า CRM",
      state: {
        missing: "ยังไม่ได้ส่งอนุมัติ",
        draft: "ร่างคำขอ — ยังไม่ได้ยื่น",
        pending: "รออนุมัติ",
        approved: "อนุมัติแล้ว",
        rejected: "ไม่อนุมัติ",
      } as Record<string, string>,
      stateColor: {
        missing: "red",
        draft: "orange",
        pending: "orange",
        approved: "green",
        rejected: "red",
      } as Record<string, string>,
      version: (n: number) => `ฉบับที่ ${n}`,
      risk: (level: string) => `ความเสี่ยง: ${level}`,
      requestedBy: (name: string, at: string) => `ขอโดย ${name} · ${at}`,
      openRequest: "เปิดคำขอ",
      voidedTitle: "การอนุมัติที่เป็นโมฆะ",
      voided: (n: number, reason: string) => `ฉบับที่ ${n} — ${reason}`,
      approvedTag: (n: number) => `อนุมัติแล้ว (ฉบับที่ ${n})`,
      riskTitle: "ประเมินความเสี่ยงของร่าง",
    },
    /** CD-145 — ข้อมูลที่มากับคำขอจัดทำสัญญา. */
    requestPackage: {
      title: "ข้อมูลการค้าและขอบเขตงาน",
      hint: "ระบบแนบให้ตอนยื่นคำขอ — เงื่อนไขที่ตกลงในรอบต่อรองล่าสุด และขอบเขตงานของ Solution ที่อนุมัติ · แก้ดีลภายหลังไม่เปลี่ยนข้อมูลนี้ กด \"ดึงจากดีลอีกครั้ง\" เมื่อต้องการ",
      notCaptured: "ยังไม่มีข้อมูล — ระบบแนบให้เมื่อยื่นคำขอจากหน้าดีล",
      refresh: "ดึงจากดีลอีกครั้ง",
      refreshed: "ดึงข้อมูลจากดีลแล้ว",
      capturedOnSubmit: (at: string) => `แนบตอนยื่นคำขอ · ${at}`,
      capturedAgain: (at: string) => `ดึงใหม่ · ${at}`,
      terms: (round: number) => `เงื่อนไขที่ตกลง (รอบต่อรองที่ ${round})`,
      nonStandard: "ไม่ตรงมาตรฐาน",
      standard: (value: string) => `มาตรฐาน: ${value}`,
      solution: (title: string, version: number) =>
        `ขอบเขตงานจาก Solution "${title}" ฉบับที่ ${version}`,
      inScope: "งานในขอบเขต",
      outOfScope: "งานนอกขอบเขต",
      deliverables: "รายการส่งมอบและเกณฑ์ตรวจรับ",
      assumptions: "สมมติฐานและสิ่งที่ต้องพึ่งพา",
    },
    /** CD-150 — ตรวจขอบเขตงาน. */
    scopeCheck: {
      title: "ตรวจขอบเขตงาน",
      hint: "เทียบขอบเขตงานที่แนบคำขอ (จาก Solution ที่อนุมัติ) กับร่างฉบับล่าสุด — รายการที่ไม่พบในสัญญาต้องตัดสินว่าตรง (ใช้ถ้อยคำอื่น) หรือไม่สอดคล้อง · ไม่สอดคล้องขออนุมัติสัญญาไม่ได้",
      notApplicable: "คำขอนี้ไม่มีขอบเขตงานจาก Solution ที่อนุมัติ — ไม่ต้องตรวจ",
      version: (n: number) => `ร่างฉบับที่ ${n}`,
      earlier: (n: number) => `ตรวจล่าสุดที่ฉบับที่ ${n} — ฉบับนี้ต้องตรวจใหม่`,
      status: {
        consistent: "สอดคล้อง",
        inconsistent: "ไม่สอดคล้อง",
      } as Record<string, string>,
      statusColor: {
        consistent: "green",
        inconsistent: "red",
      } as Record<string, string>,
      unchecked: "ยังไม่ได้ตรวจ",
      checkedBy: (name: string, at: string) => `ตรวจโดย ${name} · ${at}`,
      kinds: {
        in_scope: "ในขอบเขต",
        out_of_scope: "นอกขอบเขต",
        deliverable: "ส่งมอบ",
        criterion: "เกณฑ์ตรวจรับ",
      } as Record<string, string>,
      found: "พบในสัญญา",
      notFound: "ไม่พบในสัญญา",
      match: "ตรง",
      mismatch: "ไม่สอดคล้อง",
      notePlaceholder: "ตรง: อยู่ข้อไหน/ถ้อยคำใด · ไม่สอดคล้อง: ต่างกันอย่างไร",
      save: (n: number) => `บันทึกผลตรวจฉบับที่ ${n}`,
      saved: "บันทึกผลตรวจขอบเขตงานแล้ว",
    },
    /** CD-158 — ประเมินความเสี่ยงกฎหมาย. */
    risk: {
      title: "ประเมินความเสี่ยงกฎหมาย",
      edit: "ประเมิน",
      reassess: "ประเมินใหม่",
      empty: "ยังไม่ได้ประเมินความเสี่ยงของสัญญานี้",
      hint: "ระดับความเสี่ยงและประเด็นที่ทำให้เกิด — สูง/วิกฤต หรือประเด็นที่ติ๊ก \"เสนอผู้บริหาร\" ระบบส่งขอความเห็นผู้บริหารให้ และลงนามไม่ได้จนกว่าผู้บริหารเห็นชอบ",
      level: "ระดับความเสี่ยง",
      levels: {
        low: "ต่ำ",
        medium: "ปานกลาง",
        high: "สูง",
        critical: "วิกฤต",
      } as Record<string, string>,
      levelColor: {
        low: "green",
        medium: "gold",
        high: "orange",
        critical: "red",
      } as Record<string, string>,
      summary: "สรุปความเห็นฝ่ายกฎหมาย",
      issues: "ประเด็น",
      noIssues: "ไม่มีประเด็นที่บันทึก",
      addIssue: "เพิ่มประเด็น",
      removeIssue: "ลบ",
      issueTitle: "ประเด็น",
      issueTitlePlaceholder: "เช่น ค่าปรับไม่มีเพดาน",
      issueClause: "ข้อในสัญญา",
      issueDetail: "รายละเอียด / ข้อเสนอ",
      issueSeverity: "ระดับ",
      severities: {
        low: "ต่ำ",
        medium: "กลาง",
        high: "สูง",
      } as Record<string, string>,
      escalate: "เสนอผู้บริหาร",
      opinion: "ความเห็นผู้บริหาร",
      opinionState: {
        not_needed: "ไม่ต้องเสนอผู้บริหาร",
        missing: "ต้องขอความเห็นผู้บริหาร — ยังไม่ได้ส่ง",
        draft: "ร่างคำขอความเห็น — ยังไม่ได้ยื่น",
        pending: "รอความเห็นผู้บริหาร",
        approved: "ผู้บริหารเห็นชอบ",
        rejected: "ผู้บริหารไม่เห็นชอบ",
      } as Record<string, string>,
      opinionColor: {
        not_needed: "default",
        missing: "red",
        draft: "orange",
        pending: "orange",
        approved: "green",
        rejected: "red",
      } as Record<string, string>,
      askAgain: "ขอความเห็น",
      asked: "ส่งขอความเห็นผู้บริหารแล้ว",
      openDraft: "เปิดร่างคำขอ",
      signReady: "ลงนามได้ (ด้านความเสี่ยง)",
      assessedAt: (at: string) => `ประเมินเมื่อ ${at}`,
      saved: "บันทึกการประเมินแล้ว",
      save: "บันทึก",
      cancel: "ยกเลิก",
    },
    /** CD-164 — แผนการวางบิลตามงวด. */
    installments: {
      title: "แผนการวางบิลตามงวด",
      edit: "วางงวด",
      empty: "ยังไม่ได้วางงวดชำระของสัญญานี้",
      noValue: "ระบุมูลค่าสัญญาก่อน จึงวางงวดได้",
      hint: "ทุกงวดตั้งแต่เงินมัดจำ งวดตามความคืบหน้า จนถึงเงินประกันผลงาน — ผลรวมต้องเท่ามูลค่าสัญญาพอดี และเงินมัดจำต้องมีหลักประกันออกคู่กัน",
      formTitle: "แผนการวางบิลตามงวด",
      addRow: "เพิ่มงวด",
      remove: "ลบงวดนี้",
      fillRest: "เติมส่วนที่เหลือ",
      seq: (n: number) => `งวดที่ ${n}`,
      kind: "ประเภท",
      kinds: {
        deposit: "เงินมัดจำ",
        progress: "งวดตามความคืบหน้า",
        final: "งวดสุดท้าย",
        retention: "เงินประกันผลงาน",
      } as Record<string, string>,
      kindColor: {
        deposit: "gold",
        progress: "blue",
        final: "green",
        retention: "purple",
      } as Record<string, string>,
      label: "ชื่องวด",
      labelPlaceholder: "ว่าง = ชื่อประเภท",
      amount: "จำนวนเงิน",
      share: "สัดส่วน %",
      dueOn: "กำหนดชำระ",
      dueNote: "เงื่อนไขการชำระ",
      dueNotePlaceholder: "เช่น 30 วันหลังตรวจรับ",
      milestone: "หมุดหมายที่ปลดล็อก",
      milestonePlaceholder: "เช่น ติดตั้งและตรวจรับงวดที่ 2",
      guarantee: "หลักประกัน",
      guaranteeTypes: {
        bank_guarantee: "หนังสือค้ำประกันธนาคาร",
        cheque: "เช็คธนาคาร",
        cash: "เงินสด",
      } as Record<string, string>,
      guaranteeAmount: "วงเงินหลักประกัน",
      guaranteeRef: "เลขที่หลักประกัน",
      guaranteeExpiresOn: "หมดอายุ",
      guaranteeNeeded: "เงินมัดจำต้องมีหลักประกัน ไม่น้อยกว่ายอดมัดจำ",
      total: "รวม",
      value: "มูลค่าสัญญา",
      balanced: "ครบพอดี",
      short: (gap: string) => `ขาดอีก ${gap}`,
      over: (gap: string) => `เกิน ${gap}`,
      notBalanced: "ผลรวมต้องเท่ามูลค่าสัญญาพอดีจึงบันทึกได้",
      saved: "บันทึกแผนการวางบิลแล้ว",
      clear: "ล้างแผน",
      cancel: "ยกเลิก",
    },
    /** CD-153..156 — ข้อกำหนดของสัญญา. */
    terms: {
      title: "ข้อกำหนดของสัญญา",
      edit: "แก้ไขข้อกำหนด",
      empty: "ยังไม่ได้บันทึกข้อกำหนด",
      notSet: "ยังไม่ระบุ",
      saved: "บันทึกข้อกำหนดแล้ว",
      liability: "ความรับผิด",
      unlimited: "ไม่จำกัด",
      capAmount: "เพดานความรับผิด (บาท)",
      overValue: (pct: number) => `สูงกว่ามูลค่าสัญญา ${pct}%`,
      withinValue: "ไม่เกินมูลค่าสัญญา",
      approval: {
        not_needed: "ไม่ต้องขออนุมัติ",
        missing: "ต้องขออนุมัติผู้บริหาร — ยังไม่ได้ส่ง",
        draft: "ร่างคำขออนุมัติ — ยังไม่ได้ยื่น",
        pending: "รอผู้บริหารอนุมัติ",
        approved: "ผู้บริหารอนุมัติแล้ว",
        rejected: "ผู้บริหารไม่อนุมัติ",
      } as Record<string, string>,
      approvalColor: {
        not_needed: "default",
        missing: "red",
        draft: "orange",
        pending: "orange",
        approved: "green",
        rejected: "red",
      } as Record<string, string>,
      askAgain: "ขออนุมัติ",
      openDraft: "เปิดร่างคำขอ",
      asked: "ส่งคำขออนุมัติแล้ว",
      penalty: "ค่าปรับ",
      penaltyRate: "อัตรา (ร้อยละ)",
      penaltyPeriod: "ต่อ",
      periods: {
        day: "วัน",
        week: "สัปดาห์",
        month: "เดือน",
        occurrence: "ครั้ง",
      } as Record<string, string>,
      penaltyBasis: "ของ",
      bases: {
        contract_value: "มูลค่าสัญญา",
        undelivered_value: "มูลค่างานที่ยังไม่ส่งมอบ",
        monthly_fee: "ค่าบริการรายเดือน",
        other: "อื่น ๆ",
      } as Record<string, string>,
      penaltyBasisNote: "อธิบายฐานคำนวณ",
      penaltyCapPct: "เพดาน (ร้อยละของมูลค่าสัญญา)",
      penaltyCapAmount: "หรือเพดานเป็นเงิน (บาท)",
      penaltyLine: (rate: string, period: string, basis: string) =>
        `ร้อยละ ${rate} ต่อ${period} ของ${basis}`,
      ceiling: (amount: string) => `ค่าปรับสูงสุด ${amount} บาท`,
      warranty: "การรับประกัน",
      warrantyMonths: "ระยะประกัน (เดือน)",
      warrantyScope: "ขอบเขต",
      warrantyExclusions: "ข้อยกเว้น",
      acceptedOn: "วันตรวจรับจริง",
      acceptedHint: "ประกันนับจากวันตรวจรับจริง ไม่ใช่วันลงนาม — กรอกเมื่อลูกค้าตรวจรับแล้ว",
      warrantyRuns: (from: string, to: string) => `ประกัน ${from} – ${to}`,
      warrantyWaiting: (months: number) =>
        `ประกัน ${months} เดือน — เริ่มนับเมื่อตรวจรับ`,
      termination: "การยกเลิก",
      noticeDays: "บอกกล่าวล่วงหน้า (วัน)",
      notice: (days: number) => `บอกกล่าวล่วงหน้า ${days} วัน`,
      conditions: "เงื่อนไขการเลิกสัญญา",
      consequences: "ผลที่ตามมา",
      steps: "ขั้นตอนเมื่อยกเลิกจริง",
      addStep: "+ เพิ่มขั้นตอน",
      liabilityNote: "หมายเหตุความรับผิด",
      /* CD-151 */
      service: "ระดับบริการ",
      serviceHint:
        "เคสที่อ้างอิงสัญญานี้จะนับเวลาตอบกลับ/แก้ไขตามตัวเลขนี้ แทนค่าตั้งต้นของประเภทเคส",
      serviceEnable: "ผูกพันระดับบริการ",
      serviceDefault: "ใช้ค่าตั้งต้น",
      severity: "ระดับ",
      responseHours: "ตอบกลับ (ชม.)",
      resolutionHours: "แก้ไข (ชม.)",
      coverage: "นับเวลา",
      coverageDefault: "ตามประเภทเคส",
      availability: "ความพร้อมใช้งาน (%)",
      reportEvery: "รายงานผลบริการ",
      reports: {
        monthly: "รายเดือน",
        quarterly: "รายไตรมาส",
      } as Record<string, string>,
      levelLine: (response: number, resolution: number) =>
        `ตอบกลับ ${response} ชม. · แก้ไข ${resolution} ชม.`,
      availabilityLine: (pct: number) => `ความพร้อมใช้งาน ${pct}%`,
    },
  },
  /** CD-66 — ช่องทางรับคำขอจากลูกค้า (ผู้ดูแล). */
  intakeChannels: {
    title: "ช่องทางรับคำขอจากลูกค้า",
    subtitle: (company: string) =>
      `ให้ลูกค้าของ ${company} ส่งคำขอเองผ่านแบบฟอร์มสาธารณะ LINE หรือ AI CARE — คำขอเข้าระบบเหมือนพนักงานยื่น โดยมีผู้ยื่นแทนที่ตั้งไว้`,
    channel: {
      web_form: "แบบฟอร์มสาธารณะ",
      line: "LINE Official Account",
      ai_care: "AI CARE",
    } as Record<string, string>,
    channelHint: {
      web_form:
        "ลิงก์สาธารณะที่ส่งให้ลูกค้าได้ทันที — ใครมีลิงก์ก็ส่งคำขอได้ มีจำกัดจำนวนครั้งต่อเครือข่าย",
      line: "ตัวเชื่อม webhook — ต้องตั้ง LINE_CHANNEL_SECRET และ LINE_CHANNEL_ACCESS_TOKEN ของบริษัทที่ external-service ก่อน (docs/customer-intake.md)",
      ai_care:
        "ตัวเชื่อมสำหรับระบบ AI CARE — เรียกด้วยกุญแจ API ที่มีสิทธิ์ integration.request.intake",
    } as Record<string, string>,
    enabled: "เปิดรับคำขอ",
    disabled: "ปิดอยู่",
    notConfigured: "ยังไม่ได้ตั้งค่า",
    requester: "ผู้ยื่นแทน",
    requesterHint:
      "คำขอทุกใบต้องมีผู้ยื่น — ใช้ผู้ใช้คนนี้ ส่วนข้อมูลลูกค้าเก็บไว้เป็นผู้ติดต่อบนคำขอ",
    requesterRequired: "เลือกผู้ยื่นแทน",
    types: "ประเภทคำขอที่เปิดรับ",
    typesRequired: "เลือกอย่างน้อยหนึ่งประเภท",
    formTitle: "หัวข้อแบบฟอร์ม",
    formTitlePlaceholder: "เช่น แจ้งปัญหา / ขอใช้บริการ",
    intro: "คำอธิบายบนแบบฟอร์ม",
    link: "ลิงก์แบบฟอร์ม",
    linkAfterSave: "บันทึกแล้วจะได้ลิงก์",
    copy: "คัดลอก",
    copied: "คัดลอกลิงก์แล้ว",
    open: "เปิดดู",
    newLink: "ออกลิงก์ใหม่",
    newLinkConfirm:
      "ลิงก์เดิมจะใช้ไม่ได้ทันทีหลังบันทึก — ลูกค้าที่ถือลิงก์เดิมต้องได้ลิงก์ใหม่",
    newLinkPending: "จะออกลิงก์ใหม่เมื่อบันทึก",
    save: "บันทึก",
    saved: "บันทึกแล้ว",
    updatedAt: (at: string) =>
      `แก้ล่าสุด ${new Date(at).toLocaleString("th-TH")}`,
  },

  /** CD-66 — หน้าสาธารณะที่ลูกค้าเห็น (ไม่ต้อง login). */
  /** CD-14 ระบบลงนามอิเล็กทรอนิกส์. */
  esign: {
    layouts: {
      title: "แม่แบบช่องลงนาม",
      subtitle:
        "กำหนดว่าเอกสารแต่ละประเภทมีใครลงนาม ลงที่หน้าใด ตำแหน่งไหน และลำดับการลงนาม — ช่องที่ตั้งเป็น \"หน้าลงนามท้ายเอกสาร\" จะไปอยู่ในหน้าที่ระบบแนบให้",
      add: "สร้างแม่แบบ",
      edit: "แก้ไข",
      empty: "ยังไม่มีแม่แบบช่องลงนาม",
      code: "รหัส",
      name: "ชื่อ",
      docType: "ประเภทเอกสาร",
      docTypes: {
        contract: "สัญญา",
        acceptance: "ใบรับรองการตรวจรับ",
        other: "อื่น ๆ",
      } as Record<string, string>,
      active: "ใช้งาน",
      inactive: "ปิดใช้",
      fields: "ช่องลงนาม",
      fieldLabel: "ผู้ลงนาม (ฐานะ)",
      fieldLabelPlaceholder: "เช่น ผู้ว่าจ้าง",
      page: "หน้า",
      pages: {
        first: "หน้าแรก",
        last: "หน้าสุดท้าย",
        appendix: "หน้าลงนามท้ายเอกสาร",
        number: "ระบุเลขหน้า",
      } as Record<string, string>,
      pageNumber: "เลขหน้า",
      position: "ตำแหน่ง",
      positions: {
        "bottom-left": "ล่างซ้าย",
        "bottom-center": "ล่างกลาง",
        "bottom-right": "ล่างขวา",
        "top-left": "บนซ้าย",
        "top-right": "บนขวา",
      } as Record<string, string>,
      order: "ลำดับ",
      authority: "ผู้มีอำนาจลงนามของบริษัท",
      authorityHint: "ช่องนี้ต้องเป็นพนักงานในทะเบียนผู้มีอำนาจลงนาม ภายในวงเงิน",
      addField: "เพิ่มช่อง",
      removeField: "ลบ",
      save: "บันทึก",
      cancel: "ยกเลิก",
      saved: "บันทึกแม่แบบแล้ว",
      required: "ต้องระบุรหัสและชื่อ",
      fieldCount: (n: number) => `${n} ช่อง`,
      describe: (page: string, position: string, order: number) =>
        `${page} · ${position} · ลำดับ ${order}`,
    },
    /** CD-172 ทะเบียนผู้มีอำนาจลงนาม. */
    authorities: {
      title: "ทะเบียนผู้มีอำนาจลงนาม",
      subtitle:
        "ผู้ที่ลงนามแทนบริษัทได้ ภายในวงเงินและประเภทเอกสาร — ช่องลงนามที่ติ๊ก \"ผู้มีอำนาจลงนามของบริษัท\" รับได้เฉพาะผู้ในทะเบียน · ปิดใช้หรือลดวงเงิน มีผลกับเอกสารที่รอลงนามอยู่ทันที",
      add: "เพิ่มผู้มีอำนาจ",
      edit: "แก้ไข",
      empty: "ยังไม่มีผู้มีอำนาจลงนามในทะเบียน",
      person: "ผู้มีอำนาจ",
      position: "ตำแหน่ง",
      positionPlaceholder: "เช่น กรรมการผู้จัดการ",
      limit: "วงเงิน (บาท)",
      unlimited: "ไม่จำกัดวงเงิน",
      limitText: (amount: string) => `วงเงิน ${amount} บาท`,
      docTypes: "ประเภทเอกสาร",
      allDocTypes: "ทุกประเภท",
      validFrom: "ตั้งแต่",
      validTo: "ถึง",
      period: (from: string, to: string) => `${from} – ${to}`,
      always: "ไม่กำหนดช่วงเวลา",
      active: "ใช้งาน",
      inactive: "ปิดใช้",
      note: "หมายเหตุ (เช่น เลขที่หนังสือมอบอำนาจ)",
      save: "บันทึก",
      cancel: "ยกเลิก",
      saved: "บันทึกทะเบียนแล้ว",
      required: "ต้องระบุผู้มีอำนาจและตำแหน่ง",
    },
    status: {
      draft: "ร่าง — ยังไม่ส่ง",
      sent: "รอลงนาม",
      completed: "ลงนามครบ",
      declined: "ถูกปฏิเสธ",
      cancelled: "ยกเลิก",
      expired: "หมดอายุ",
    } as Record<string, string>,
    statusColor: {
      draft: "default",
      sent: "blue",
      completed: "green",
      declined: "red",
      cancelled: "default",
      expired: "orange",
    } as Record<string, string>,
    signerStatus: {
      pending: "รอลงนาม",
      signed: "ลงนามแล้ว",
      declined: "ปฏิเสธ",
    } as Record<string, string>,
    signerColor: {
      pending: "default",
      signed: "green",
      declined: "red",
    } as Record<string, string>,
    kinds: {
      internal: "ภายใน",
      external: "ภายนอก",
    } as Record<string, string>,
    events: {
      sent: "ส่งคำขอลงนาม",
      notified: "แจ้งเตือนในระบบ",
      opened: "เปิดลิงก์",
      otp_sent: "ส่งรหัสยืนยัน",
      otp_verified: "ยืนยันตัวตนแล้ว",
      otp_failed: "กรอกรหัสผิด",
      viewed: "เปิดอ่านเอกสาร",
      signed: "ลงนาม",
      declined: "ปฏิเสธ",
      sealed: "ผนึกเอกสาร",
    } as Record<string, string>,
    contract: {
      title: "ลงนามอิเล็กทรอนิกส์",
      send: "ส่งลงนาม",
      empty: "ยังไม่ได้ส่งลงนาม",
      noPdf: "แนบไฟล์ PDF ของสัญญาก่อน จึงส่งลงนามได้",
      noLayouts: "ยังไม่มีแม่แบบช่องลงนาม — สร้างที่เมนูแม่แบบช่องลงนาม",
      document: "ไฟล์ที่ลงนาม (PDF)",
      layout: "แม่แบบช่องลงนาม",
      mode: "การลงนาม",
      modes: {
        sequential: "เรียงตามลำดับ",
        parallel: "พร้อมกัน",
      } as Record<string, string>,
      expires: "อายุคำขอ (วัน)",
      message: "ข้อความถึงผู้ลงนาม",
      signer: "ผู้ลงนาม",
      internalUser: "พนักงาน",
      externalName: "ชื่อผู้ลงนาม",
      email: "อีเมล",
      phone: "เบอร์โทร",
      createAndSend: "สร้างและส่งลงนาม",
      created: "ส่งลงนามแล้ว",
      links: "ลิงก์ลงนามของผู้ลงนามภายนอก — แสดงครั้งเดียว คัดลอกส่งให้ผู้ลงนาม (ระบบยังไม่ส่งอีเมลให้)",
      copy: "คัดลอก",
      copied: "คัดลอกแล้ว",
      signed: "ดาวน์โหลดฉบับลงนาม",
      cancel: "ยกเลิกการส่งลงนาม",
      cancelReason: "เหตุผลที่ยกเลิก",
      cancelled: "ยกเลิกแล้ว",
      history: "ประวัติ",
      verifyCode: (code: string) => `รหัสตรวจสอบ ${code}`,
      expiresAt: (at: string) => `หมดเขต ${at}`,
      order: (n: number) => `ลำดับ ${n}`,
      signedAt: (at: string) => `ลงนาม ${at}`,
    },
    mine: {
      title: "เอกสารรอลงนาม",
      subtitle: "เอกสารที่ระบุให้คุณลงนาม — เปิดอ่านฉบับเต็มแล้วลงนามด้วยการล็อกอินของคุณ",
      empty: "ไม่มีเอกสารรอลงนาม",
      waiting: (n: number) => `รออีก ${n} ผู้ลงนามก่อนหน้า`,
      open: "เปิดลงนาม",
    },
    sign: {
      role: (role: string) => `ลงนามในฐานะ ${role}`,
      read: "อ่านเอกสารฉบับเต็มด้านล่างก่อนลงนาม",
      openFull: "เปิดเอกสารในแท็บใหม่",
      method: "ลายมือชื่อ",
      methods: {
        draw: "วาด",
        type: "พิมพ์",
        upload: "อัปโหลดภาพ",
      } as Record<string, string>,
      clear: "ล้าง",
      typePlaceholder: "พิมพ์ชื่อ-นามสกุล",
      uploadHint: "ภาพ PNG หรือ JPEG ไม่เกิน 500 KB",
      consent:
        "ข้าพเจ้าได้อ่านเอกสารฉบับเต็มแล้ว และยินยอมลงนามด้วยวิธีอิเล็กทรอนิกส์ โดยให้มีผลเช่นเดียวกับการลงลายมือชื่อ",
      sign: "ลงนาม",
      decline: "ปฏิเสธการลงนาม",
      declineReason: "เหตุผลที่ปฏิเสธ",
      signed: "ลงนามเรียบร้อยแล้ว",
      declined: "ปฏิเสธการลงนามแล้ว",
      noAuthority: (reason: string) => `ลงนามไม่ได้ — ${reason}`,
      notYourTurn: (n: number) => `ยังไม่ถึงลำดับของคุณ — รออีก ${n} ผู้ลงนาม`,
      mustRead: "เปิดอ่านเอกสารก่อน จึงลงนามได้",
      needSignature: "ใส่ลายมือชื่อก่อน",
      needConsent: "ยืนยันการลงนามอิเล็กทรอนิกส์ก่อน",
      done: "เอกสารนี้ไม่ได้รอให้คุณลงนามแล้ว",
      verifyAt: (code: string) => `ตรวจสอบเอกสารได้ด้วยรหัส ${code}`,
    },
    public: {
      title: "ลงนามเอกสารอิเล็กทรอนิกส์",
      invalidLink: "ลิงก์ไม่ถูกต้องหรือใช้แล้ว",
      tooMany: "ใช้งานถี่เกินไป — ลองใหม่ภายหลัง",
      unavailable: "ระบบไม่พร้อมให้บริการชั่วคราว",
      hello: (name: string) => `เรียน ${name}`,
      verifyFirst: "ยืนยันตัวตนด้วยรหัสครั้งเดียวก่อนเปิดเอกสาร",
      sendCode: (to: string) => `ส่งรหัสไปที่ ${to}`,
      codeSent: (to: string) => `ส่งรหัสไปที่ ${to} แล้ว — รหัสมีอายุ 10 นาที`,
      code: "รหัส 6 หลัก",
      confirm: "ยืนยัน",
      verified: "ยืนยันตัวตนแล้ว",
      expiresAt: (at: string) => `ลงนามได้ถึง ${at}`,
      thanks: "ขอบคุณ — ลงนามเรียบร้อยแล้ว เมื่อทุกฝ่ายลงนามครบ ผู้ส่งจะได้รับเอกสารฉบับลงนาม",
    },
    verify: {
      title: "ตรวจสอบเอกสารที่ลงนาม",
      subtitle:
        "ตรวจว่าไฟล์ที่คุณถืออยู่ตรงกับฉบับที่ลงนามจริง — ไฟล์ไม่ถูกส่งขึ้นระบบ เบราว์เซอร์คำนวณค่าตรวจสอบ (SHA-256) แล้วส่งเฉพาะค่านั้น",
      code: "รหัสตรวจสอบ",
      look: "ตรวจสอบ",
      notFound: "ไม่พบเอกสารที่ลงนามด้วยรหัสนี้",
      document: "เอกสาร",
      completedAt: (at: string) => `ลงนามครบ ${at}`,
      signers: "ผู้ลงนาม",
      pick: "เลือกไฟล์ PDF ที่ต้องการตรวจ",
      match: "ตรงกัน — ไฟล์นี้คือฉบับที่ลงนามจริง",
      mismatch: "ไม่ตรงกัน — ไฟล์นี้ไม่ใช่ฉบับที่ลงนาม หรือถูกแก้ไขหลังลงนาม",
      hash: (value: string) => `SHA-256 ของไฟล์ที่ลงนาม: ${value}`,
    },
  },
  publicForm: {
    pageTitle: "ส่งคำขอ",
    defaultTitle: "ส่งคำขอถึงเรา",
    notFound: "ไม่พบแบบฟอร์มนี้ หรือปิดรับแล้ว",
    notFoundHint: "กรุณาติดต่อผู้ที่ส่งลิงก์นี้ให้ท่าน",
    type: "เรื่องที่ต้องการ",
    typePlaceholder: "เลือกเรื่อง",
    needsStaff:
      "เรื่องนี้ต้องแนบเอกสารหรืออ้างอิงเอกสารเดิม — กรุณาติดต่อเจ้าหน้าที่โดยตรง",
    details: "รายละเอียด",
    contact: "ข้อมูลติดต่อกลับ",
    contactName: "ชื่อผู้ติดต่อ",
    contactEmail: "อีเมล",
    contactPhone: "เบอร์โทร",
    contactCompany: "บริษัท/หน่วยงาน",
    contactTaxId: "เลขประจำตัวผู้เสียภาษี (ถ้ามี)",
    taxIdInvalid: "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก",
    emailInvalid: "รูปแบบอีเมลไม่ถูกต้อง",
    contactRequired: "กรอกอีเมลหรือเบอร์โทรอย่างน้อยหนึ่งช่อง",
    required: "จำเป็นต้องกรอก",
    yes: "ใช่",
    no: "ไม่ใช่",
    submit: "ส่งคำขอ",
    removeRow: "ลบแถว",
    privacy:
      "ข้อมูลที่กรอกใช้เพื่อดำเนินการคำขอนี้และติดต่อกลับเท่านั้น",
    tooMany: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    notReady: "ช่องทางนี้ยังไม่พร้อมใช้งาน",
    failed: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
    unreachable: "ติดต่อระบบไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
    sentTitle: "ได้รับคำขอแล้ว",
    sentNo: (no: string) => `เลขที่คำขอ ${no}`,
    sentNoPending: "เจ้าหน้าที่จะแจ้งเลขที่คำขอให้ทราบ",
    sentHint:
      "เก็บลิงก์ติดตามสถานะไว้ — ใครมีลิงก์นี้ก็ดูสถานะได้ จึงไม่ควรส่งต่อ",
    statusLink: "ติดตามสถานะ",
    another: "ส่งคำขออีกเรื่อง",
    statusTitle: "สถานะคำขอ",
    statusNotFound: "ไม่พบคำขอจากลิงก์นี้",
    requestNo: "เลขที่คำขอ",
    requestType: "เรื่อง",
    company: "ถึง",
    currentStatus: "สถานะ",
    submittedAt: "ส่งเมื่อ",
    dueAt: "กำหนดเสร็จ",
    completedAt: "เสร็จเมื่อ",
    updatedAt: "อัปเดตล่าสุด",
    pendingNo: "รอออกเลข",
    status: {
      draft: "ร่าง",
      submitted: "รับเรื่องแล้ว",
      pending_approval: "รออนุมัติ",
      approved: "อนุมัติแล้ว",
      in_progress: "กำลังดำเนินการ",
      completed: "ดำเนินการเสร็จ",
      closed: "ปิดเรื่องแล้ว",
      rejected: "ไม่อนุมัติ",
      cancelled: "ยกเลิก",
      returned: "ขอข้อมูลเพิ่ม",
      on_hold: "พักไว้ชั่วคราว",
    } as Record<string, string>,
  },
} as const;

/**
 * คำอธิบายไทยของรหัสสิทธิ์ — ว่างถ้ายังไม่มีคำแปล.
 *
 * อยู่ตรงนี้เพราะทั้งหน้า Role และหน้ากุญแจ API ต้องใช้ สำเนาที่สองคือสำเนาที่จะลืมอัปเดต
 */
export function thaiForPermission(code: string): string {
  const labels: Record<string, string> = messages.roleAdmin.permission;
  return labels[code] ?? "";
}

/** Maps a callback `?error=` code to Thai copy, with a safe fallback. */
export function loginErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!code) return null;

  const errors = messages.login.errors as Record<string, string>;
  return errors[code] ?? messages.login.errors.default;
}
