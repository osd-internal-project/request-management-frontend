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
    employmentType: string;
    status: string;
    endDate: string | null;
    note: string;
  };
  skills: EmployeeSkill[];
}

export interface Skill {
  id: string;
  code: string;
  name: string;
  category: string;
  sortOrder: number;
  active: boolean;
}
