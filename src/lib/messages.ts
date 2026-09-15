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
      session_expired:
        "เซสชันหมดอายุหรือถูกยกเลิก กรุณาเข้าสู่ระบบอีกครั้ง",
      default: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    },

    /** `/login/reconnect` — the only screen shown instead of Keycloak's. */
    reconnect: {
      title: "เชื่อมต่อระบบยืนยันตัวตนไม่ได้",
      subtitle:
        "ยังไปต่อที่หน้าเข้าสู่ระบบไม่ได้ในตอนนี้ ระบบไม่ได้พาคุณวนกลับไปซ้ำ เพราะจะไม่สำเร็จจนกว่าการเชื่อมต่อจะกลับมา",
      retryButton: "ลองเชื่อมต่ออีกครั้ง",
      hint: "มักเกิดจากระบบหลังบ้านหรือ Keycloak กำลังปิดปรับปรุงหรือเครือข่ายภายในขัดข้อง หากกดลองใหม่แล้วยังไม่ได้ ให้แจ้งผู้ดูแลระบบ",
      contactPrefix: "ยังเชื่อมต่อไม่ได้หลังลองใหม่หลายครั้ง แจ้งผู้ดูแลระบบที่",
    },
  },

  nav: {
    /** H2.1 — the group heading above the request screens. */
    requestGroup: "Request",
    myWork: "งานค้างของฉัน",
    newRequest: "ยื่นคำขอใหม่",
    allWork: "งานทั้งหมด",
    bottleneckReport: "รายงานคอขวด",
    crmGroup: "ลูกค้า (CRM)",
    customers: "ทะเบียนลูกค้า",
    leads: "Lead",
    opportunities: "โอกาสการขาย",
    adminGroup: "ผู้ดูแลระบบ",
    adminCrm: "ตั้งค่า CRM",
    adminRequestTypes: "ประเภทคำขอ",
    adminSla: "เวลาทำการและวันหยุด",
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
    editTeam: "แก้ไขทีม",
    searchTeam: "ค้นหาหน่วยงาน ชื่อ รหัส หรือหัวหน้า",
    searchNoMatch: "ไม่พบหน่วยงานที่ตรงกับคำค้น",
    deleteTeam: "ลบหน่วยงาน",
    deleteConfirm: (name: string) => `ลบหน่วยงาน ${name}?`,
    deleteConfirmBody:
      "ลบแล้วเอากลับไม่ได้ — ถ้าต้องการเก็บประวัติไว้ ให้ปิดใช้งานแทน",
    addMember: "เพิ่มสมาชิก",
    addMemberHint: "เลือกได้จากคนทั้งบริษัท คนที่ถูกเลือกจะย้ายมาสังกัดหน่วยงานนี้",
    selectUser: "ค้นหาชื่อหรือชื่อผู้ใช้",
    editRoles: "แก้ role",
    editRolesTitle: (name: string) => `role ของ ${name}`,
    editRolesHint:
      "role ที่มาจาก Keycloak ถอนที่นี่ไม่ได้ — ต้องแก้ที่ Keycloak · ที่ผูกมือไว้ถอนได้",
    fromKeycloak: "จาก Keycloak",
    manualGrant: "ผูกมือ",
    leadFromCompany: "เลือกหัวหน้าได้จากคนทั้งบริษัท ไม่จำเป็นต้องเป็นสมาชิกหน่วยงานนี้",
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
    } as Record<string, string>,
    permissionsPlaceholder: "อ่านอย่างเดียว",
    columnRemove: "",
    remove: "ลบ",
    /* A person has no subtree, so the checkbox has nothing to reach. */
    descendantsNotForUser: "ใช้ได้เฉพาะปลายทางที่เป็นกลุ่ม — บุคคลไม่มีกลุ่มย่อย",
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
    subtitle:
      "รายชื่อผู้ใช้จาก Keycloak (อ่านอย่างเดียว) · ตำแหน่ง สังกัด และ role ดูแลในระบบนี้ แก้ที่หน้าผังทีมและสิทธิ์ · role กับหน่วยงานที่เป็นหัวหน้าเป็นของบริษัทที่เลือกอยู่",
    searchPlaceholder: "ค้นหาชื่อผู้ใช้ ชื่อ หรืออีเมล",
    search: "ค้นหา",
    empty: "ไม่พบผู้ใช้",
    columns: {
      username: "ชื่อผู้ใช้",
      name: "ชื่อ-นามสกุล",
      position: "ตำแหน่ง",
      team: "สังกัด",
      leads: "เป็นหัวหน้า",
      roles: "role",
      email: "อีเมล",
      status: "สถานะ",
    },
    active: "ใช้งาน",
    inactive: "ปิดใช้งาน",
    /** A realm account that has never signed in has no local profile yet. */
    noProfile: "ยังไม่เคยเข้าระบบ",
    page: (from: number, to: number, total: number) =>
      `${from}–${to} จาก ${total} คน`,
    prev: "ก่อนหน้า",
    next: "ถัดไป",
  },

  requestForm: {
    receiver: "ผู้รับเรื่อง",
    receiverTeam: "ทีมผู้รับ",
    receiverTeamHint: "ค่าตั้งต้นมาจากประเภทคำขอ — เปลี่ยนได้",
    receiverTeamPlaceholder: "เลือกทีมผู้รับ",
    receiverTeamEmpty: "ทีมนี้ยังไม่มีสมาชิก — เลือกทีมอื่นหรือล้างช่องทีมผู้รับ",
    receiverPlaceholder: "เลือกผู้รับเรื่อง — คำขอจะไปอยู่ในคิวของคนนี้",
    receiverRequired: "ต้องระบุผู้รับเรื่องก่อนยื่นคำขอ",
    title: "ยื่นคำขอ",
    /** §16 หน้าที่ 3 — the page heading and the left-menu entry agree. */
    pageTitle: "ยื่นคำขอใหม่",
    draftBanner: "สถานะ: ร่าง — เลขคำขอจะออกเมื่อกดยื่น",
    type: "ประเภทคำขอ",
    typeRequired: "เลือกประเภทคำขอก่อน",
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
    noStorageNote:
      "รอบนี้ระบบบันทึกเฉพาะรายการเอกสาร ยังไม่เก็บตัวไฟล์และดาวน์โหลดไม่ได้",
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
    timelineEmpty: "ยังไม่มีการเปลี่ยนสถานะ",
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
    pendingNote:
      "ขั้นที่ยังไม่ตัดสินไม่ถูกนำมาเฉลี่ย ",
  },

  requestTypes: {
    title: "ประเภทคำขอ",
    subtitle: "ประเภทคำขอ — ตั้งค่าได้โดยไม่ต้องแก้โปรแกรม",
    listTitle: "ประเภททั้งหมด",
    /** §16 A2 heads the list with the company whose types these are. */
    listTitleFor: (company: string) => `ประเภททั้งหมด · ${company}`,
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
    tabApprovalRequester: "อำนาจอนุมัติ(ผู้ยื่น)",
    tabApprovalReceiver: "อำนาจอนุมัติ(ผู้รับ)",
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
    /** The pill §16 puts on a sensitive field — what it *does*, not what it is. */
    fieldRestricted: "จำกัดสิทธิ์",
    fieldMultiline: "ข้อความยาว",
    /** §16 describes a field by its shape (`ตัวเลข · ฟิลด์อ่อนไหว`), not by its JSON Schema type. */
    fieldTypeLabels: {
      string: "ข้อความ",
      number: "ตัวเลข",
      boolean: "ใช่/ไม่ใช่",
    } as Record<string, string>,
    fieldRange: (min: number, max: number) => `${min}–${max}`,
    fieldEditTitle: "แก้ไขฟิลด์ฟอร์ม",
    fieldAddTitle: "เพิ่มฟิลด์ฟอร์ม",
    entryEditTitle: "แก้ไขรายการ",
    entryAddTitle: "เพิ่มรายการ",
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
    /** SUP-01 — which hours the SLA clock actually counts. */
    coverage: {
      H24X7: "24x7 — นับตลอดเวลา",
      H8X7: "8x7 — นับเฉพาะเวลาทำการ ทุกวัน",
      H8X5: "8x5 — นับเฉพาะเวลาทำการ วันทำงาน",
    } as Record<string, string>,
    workingHoursLink: "ตั้งเวลาทำการและวันหยุด",
    /* REQ-03 — `อ้างอิงโอกาสการขาย` is per type, not a rule of the submit screen. */
    /* A `type: "array"` field — a grid the requester adds rows to. */
    fieldTypeTable: "array (ตาราง)",
    tableColumns: "คอลัมน์ของตาราง",
    tableEditColumn: "แก้ไข",
    tableAddColumn: "+ เพิ่มคอลัมน์",
    tableNoColumns: "ยังไม่มีคอลัมน์ — ตารางจะแสดงว่างเปล่า",
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
    step: (current: number, total: number) => `ขั้น ${current}/${total}`,
    status: {
      draft: "ร่าง",
      submitted: "ยื่นแล้ว",
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
    emptyForSubject: "ประเภทงานนี้ยังไม่มีตารางอำนาจอนุมัติ — กด “สร้างเวอร์ชันใหม่” เพื่อเริ่ม",

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
    levelUpHint:
      "นับจากหน่วยงานที่ผู้ยื่นสังกัดขึ้นไป · ชั้นที่ยังไม่ตั้งหัวหน้า ระบบจะไต่ขึ้นต่อ",
    levelGroups: "หน่วยงานที่มีสิทธิ์อนุมัติ",
    levelPeople: "ผู้อนุมัติในหน่วยงานที่เลือก",
    levelPeopleHint:
      "ไม่เลือก = หัวหน้าของหน่วยงานที่เลือก · เลือกหลายคนได้ ใครอนุมัติก็ผ่าน",
    addLevel: "+ เพิ่มชั้นอนุมัติ",
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

  /** CRM ระยะ 1 — Customer Master (CM-01…08, spec artifact 856c08fd). */
  sales: {
    leads: {
      title: "Lead",
      scopeNote: "เห็นเฉพาะ Lead ของคุณและของทีม ตามสิทธิ์ที่ได้รับ",
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
          } as Record<string, string>,
          form: {
            title: "ลงกิจกรรม",
            type: "ประเภท",
            subject: "หัวข้อ",
            subjectRequired: "ต้องระบุหัวข้อ",
            detail: "รายละเอียด",
            dueAt: "กำหนด (เว้นว่าง = ทำไปแล้ว)",
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
          note: "บันทึก",
        },
        missingNameColumn:
          "ไม่พบคอลัมน์ \"ชื่อ Lead (บริษัท/บุคคล)\" — ใช้ไฟล์ต้นแบบเป็นตัวตั้ง",
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
      columns: {
        code: "เลขโอกาสการขาย",
        title: "โอกาสการขาย",
        customer: "ลูกค้า / ผู้มุ่งหวัง",
        stage: "ขั้น",
        amount: "มูลค่า",
        expectedClose: "คาดปิด",
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
        products: "product ที่เกี่ยวข้อง (รหัสตรงกับ Odoo)",
        productsHint: "พิมพ์รหัสแล้ว Enter เพิ่มได้หลายตัว",
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
        cancelSaleOrder: "ยกเลิกใบสั่งขาย",
        cancelReason: "เหตุผลที่ยกเลิก",
        cancelled: "ยกเลิกใบสั่งขายแล้ว",
        lose: "ปิดโอกาสการขาย — แพ้",
        lostTitle: "ปิดโอกาสการขาย — แพ้",
        lostReason: "เหตุผล (รายการมาตรฐาน)",
        lostReasonText: "รายละเอียดเพิ่มเติม",
        lostDone: "บันทึกปิดแพ้แล้ว",
        closedWonBanner: "โอกาสการขายนี้ปิดแล้ว — ชนะ",
        closedLostBanner: (reason: string) => `โอกาสการขายนี้ปิดแล้ว — แพ้ (${reason})`,
        kycWarningTitle: "โอกาสการขายนี้มี product ที่ต้องยืนยันตัวตน (KYC)",
        kycWarningBody: (products: string, customer: string) =>
          `${products} อยู่ในเงื่อนไขต้องทำ KYC และลูกค้า ${customer} ยังไม่ผ่านการยืนยันตัวตน — ยื่น KYC ได้เลย ธุรกรรมยังเดินต่อได้`,
        raiseKyc: "ยื่น KYC ให้ลูกค้า",
        customerLabel: "ลูกค้า",
        fromLead: (name: string) => `มาจาก Lead: ${name}`,
        tabRequests: "คำขอที่อ้างโอกาสการขายนี้",
        raiseRequest: "ยื่นคำขอ",
        noRequests: "ยังไม่มีคำขอที่อ้างโอกาสการขายนี้",
        edit: "แก้ไข",
      },
    },
  },

  customers: {
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
      branchCodeHint: "00000 = สำนักงานใหญ่ · สาขาย่อยสร้างเป็นลูกค้ารายใหม่ด้วยเลขภาษีเดิม + รหัสสาขาของตน",
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
      locationNameHint: "เช่น สำนักงาน / ไซต์โรงงานบางปู / ห้องเซิร์ฟเวอร์ชั้น 3",
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
      deactivateHint:
        "ข้อมูลไม่หายและค้นย้อนได้เสมอ — ระบบนี้ไม่มีการลบลูกค้า",
      statusChanged: "เปลี่ยนสถานะแล้ว",
      mergedInto: (code: string) =>
        `ลูกค้ารายนี้ถูกรวมเข้ากับ ${code} — แก้ไขที่รายหลักแทน`,
      owner: "ผู้รับผิดชอบบัญชี",
      createdAt: "สร้างเมื่อ",
      updatedAt: "แก้ไขล่าสุด",
      code: "รหัสลูกค้า",
      taxId: "เลขผู้เสียภาษี",
      taxIdMasked: "เลขผู้เสียภาษีถูกปกปิดตามสิทธิ์ของคุณ",
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
        outstandingPending: "มาพร้อมตัวเชื่อม Odoo",
        outstandingDetail: (count: string, asOf: string) =>
          `ค้าง ${count} ใบ · ข้อมูล ${asOf}`,
      },
      tabOpportunities: "โอกาสการขาย",
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
        opportunities: { label: "โอกาสการขาย", phase: "มาพร้อมโมดูล Sales (CRM ระยะถัดไป)" },
        quotations: {
          label: "ใบเสนอราคา",
          phase: "มาพร้อมโมดูล Sales (CRM ระยะถัดไป)",
        },
        contracts: { label: "สัญญา", phase: "มาพร้อมโมดูล Legal (ระยะ 2)" },
        projects: { label: "โครงการ", phase: "มาพร้อมโมดูล PM (ระยะ 3)" },
        cases: { label: "เคส", phase: "มาพร้อมงานเคส/ข้อร้องเรียน (CRM ระยะถัดไป)" },
        financials: {
          label: "การเงิน",
          phase: "มาพร้อมตัวเชื่อม Odoo (ชุดงาน D) — ยอดค้างชำระอ่านจาก Odoo ที่เดียว",
        },
        assets: {
          label: "อุปกรณ์",
          phase: "มาพร้อมโมดูล Service & Support — ทะเบียนอุปกรณ์สร้างอัตโนมัติตอนส่งมอบ",
        },
      },
      futureTabNote: (phase: string) => `แท็บนี้ ${phase}`,
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
      uploadHint: "ลากไฟล์ .xlsx มาวาง หรือคลิกเลือกไฟล์ (ใช้ชีตแรก แถวแรกเป็นหัวคอลัมน์)",
      parsing: "กำลังอ่านไฟล์…",
      parsedRows: (n: string) => `อ่านได้ ${n} แถว — ตรวจสอบผลด้านล่างก่อนยืนยัน`,
      checking: "กำลังตรวจกับระบบ…",
      importing: "กำลังนำเข้า…",
      confirm: "ยืนยันนำเข้า",
      reupload: "เลือกไฟล์ใหม่",
      emptyFile: "ไฟล์ไม่มีข้อมูล (ต้องมีหัวคอลัมน์ + อย่างน้อย 1 แถว)",
      missingNameColumn: "ไม่พบคอลัมน์ \"ชื่อ (ไทย)\" — ใช้ไฟล์ต้นแบบเป็นตัวตั้ง",
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
      reasonLabels: {
        "name_th: required": "ไม่มีชื่อลูกค้า",
        "type: invalid": "ประเภทลูกค้าไม่ถูกต้อง",
        "tax_id: format": "เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก",
        "tax_id: checksum": "เลขผู้เสียภาษีไม่ถูกต้อง (checksum)",
        "branch_code: format": "รหัสสาขาต้องเป็นตัวเลข 5 หลัก",
        "postal_code: format": "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
        "contact_email: format": "อีเมลไม่ถูกต้อง",
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
      kycProductCode: "รหัส product (ตรงกับ Odoo)",
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
      sectionConfig: "รูปแบบรหัสลูกค้าและการตรวจซ้ำ",
      codePrefix: "Prefix รหัสลูกค้า",
      codePadding: "จำนวนหลักลำดับ",
      codePreview: (example: string) => `ตัวอย่างรหัสที่จะออก: ${example}`,
      dedupThreshold: "ระดับความคล้ายที่เตือน (0.5–1.0)",
      dedupThresholdHint:
        "ยิ่งต่ำยิ่งเตือนบ่อย — ค่าตั้งต้น 0.85 · จูนได้ระหว่าง UAT",
      save: "บันทึกการตั้งค่า",
      saved: "บันทึกแล้ว",
    },
  },
} as const;

/** Maps a callback `?error=` code to Thai copy, with a safe fallback. */
export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;

  const errors = messages.login.errors as Record<string, string>;
  return errors[code] ?? messages.login.errors.default;
}
