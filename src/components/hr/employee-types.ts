/** CD-229 — what the register API returns for one person. */
export interface EmployeeSkill {
  skillId: string;
  code: string;
  name: string;
  category: string;
  proficiency: number;
  certificate: string;
  certExpiresOn: string | null;
  certExpired: boolean;
  note: string;
}

export interface Employee {
  userId: string;
  displayName: string;
  email: string | null;
  employeeId: string | null;
  position: string | null;
  startWork: string | null;
  orgUnit: { id: string; name: string } | null;
  supervisor: { id: string; displayName: string } | null;
  profile: {
    saved: boolean;
    levelId: string | null;
    level: { id: string; code: string; name: string } | null;
    /** CD-230 — HR and the person only; a supervisor's view leaves these out. */
    employmentType?: string;
    status: string;
    endDate?: string | null;
    note?: string;
  };
  skills: EmployeeSkill[];
}

/** CD-230 — the staffing directory row (PM / Pre-Sales). */
export interface StaffMember {
  userId: string;
  displayName: string;
  position: string | null;
  orgUnit: { id: string; name: string } | null;
  level: { id: string; code: string; name: string } | null;
  skills: {
    skillId: string;
    name: string;
    category: string;
    proficiency: number;
    certExpired: boolean;
  }[];
}

export interface Skill {
  id: string;
  code: string;
  name: string;
  category: string;
  sortOrder: number;
  active: boolean;
}
