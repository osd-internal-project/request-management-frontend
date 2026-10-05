/** CD-232 — the shapes `hr/leaves`, `hr/leave-types` and `hr/availability` answer with. */

export type LeavePart = "full" | "am" | "pm";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  annualDays: number | null;
  sortOrder: number;
  active: boolean;
}

export interface LeaveBalance {
  leaveTypeId: string;
  code: string;
  name: string;
  quota: number | null;
  used: number;
  pending: number;
  remaining: number | null;
}

export interface Leave {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  part: LeavePart;
  days: number;
  reason: string;
  status: LeaveStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  cancelledAt: string | null;
  createdAt: string;
  decidedByName?: string | null;
  name?: string;
}

export interface MyLeaves {
  year: number;
  today: string;
  items: Leave[];
  balances: LeaveBalance[];
}

export interface Entitlement {
  id: string;
  userId: string;
  name: string;
  leaveTypeId: string;
  leaveType: string;
  year: number;
  days: number;
}

export interface AvailabilityDay {
  day: string;
  working: boolean;
  capacity: number;
  leaveHours: number;
  pendingLeave: boolean;
  leaveType: string | null;
  booked: { bookingId: string; projectId: string; hours: number }[];
  bookedHours: number;
  free: number;
}

export interface AvailabilityPerson {
  userId: string;
  displayName: string;
  position: string | null;
  orgUnit: { id: string; name: string } | null;
  level: { id: string; code: string; name: string } | null;
  days: AvailabilityDay[];
  totals: { capacity: number; leave: number; booked: number; free: number };
}

export interface Availability {
  from: string;
  to: string;
  days: string[];
  projects: Record<string, string>;
  people: AvailabilityPerson[];
}

export interface ProjectOption {
  id: string;
  label: string;
  managerUserId: string;
}

export function thaiDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function period(from: string, to: string) {
  return from === to ? thaiDate(from) : `${thaiDate(from)} – ${thaiDate(to)}`;
}
