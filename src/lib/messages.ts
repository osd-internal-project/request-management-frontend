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
    publishNew: "+ เผยแพร่เวอร์ชันใหม่",
    immutableNote:
      "เวอร์ชันที่เผยแพร่แล้วแก้ไขไม่ได้ — การเปลี่ยนเพดานคือการเผยแพร่เวอร์ชันใหม่ งานที่เดินอยู่จะยังใช้เวอร์ชันเดิมที่มันเริ่มไว้",
    placeholderWarning:
      "ตัวเลขเพดานปัจจุบันเป็นค่าตั้งต้นสำหรับพัฒนา ยังไม่ได้รับการยืนยันจากฝ่ายการเงิน (คำถามค้าง A) — ห้ามใช้เป็นตัวเลขจริง",
    saved: "เผยแพร่แล้ว",
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
  },

  placeholder: {
    comingSoon: "ยังไม่เปิดใช้งานใน sprint นี้",
    sprintNote: (sprint: string, requirement: string) =>
      `หน้าจอนี้ส่งมอบใน ${sprint} (${requirement}) — เส้นทาง URL และสิทธิ์ถูกกำหนดไว้แล้ว`,
  },

  common: {
    loadError: "โหลดข้อมูลไม่สำเร็จ",
    retry: "ลองใหม่",
  },
} as const;

/** Maps a callback `?error=` code to Thai copy, with a safe fallback. */
export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;

  const errors = messages.login.errors as Record<string, string>;
  return errors[code] ?? messages.login.errors.default;
}
