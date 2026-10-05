/** CD-231 — the shapes `hr/timesheets/*` answers with. */

export type WorkKind = "project" | "service" | "presales" | "internal";

export type TimesheetStatus = "draft" | "submitted" | "approved" | "returned";

export type TimesheetLine = {
  workDate: string;
  kind: WorkKind;
  projectId: string | null;
  projectTaskId: string | null;
  requestId: string | null;
  solutionId: string | null;
  internalCode: string | null;
  workTypeId: string;
  hours: number;
  billable: boolean;
  note: string;
};

export type TimesheetWeek = {
  id: string | null;
  userId: string;
  weekStart: string;
  days: string[];
  status: TimesheetStatus;
  editable: boolean;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  returnReason: string | null;
  lines: TimesheetLine[];
  totals: Record<string, number>;
  hours: number;
  billableHours: number;
  longDays: string[];
  /** id (or `internal:CODE`) → readable name. */
  labels: Record<string, string>;
};

export type TimesheetOptions = {
  projects: {
    id: string;
    projectNo: string;
    name: string;
    status: string;
    tasks: { id: string; seq: number; title: string; status: string }[];
  }[];
  requests: { id: string; label: string }[];
  solutions: { id: string; label: string }[];
  internal: { code: string; name: string }[];
  work_types: { id: string; code: string; name: string }[];
};

export type PendingTimesheet = {
  id: string;
  userId: string;
  name: string;
  weekStart: string;
  submittedAt: string | null;
  hours: number;
  billableHours: number;
};

/** One grid row: a work item × work type, hours per day. */
export type TimesheetRow = {
  key: string;
  /** `project:ID` · `service:ID` · `presales:ID` · `internal:CODE` */
  item: string | null;
  projectTaskId: string | null;
  workTypeId: string | null;
  billable: boolean;
  note: string;
  hours: Record<string, number | null>;
};

export function itemOf(line: TimesheetLine) {
  const id =
    line.kind === "project"
      ? line.projectId
      : line.kind === "service"
        ? line.requestId
        : line.kind === "presales"
          ? line.solutionId
          : line.internalCode;
  return `${line.kind}:${id ?? ""}`;
}

/** Lines → grid rows (same item, task, work type and billable share a row). */
export function rowsOf(lines: TimesheetLine[]): TimesheetRow[] {
  const rows = new Map<string, TimesheetRow>();
  for (const line of lines) {
    const item = itemOf(line);
    const key = [item, line.projectTaskId, line.workTypeId, line.billable].join(
      "|",
    );
    const row = rows.get(key) ?? {
      key,
      item,
      projectTaskId: line.projectTaskId,
      workTypeId: line.workTypeId,
      billable: line.billable,
      note: line.note,
      hours: {},
    };
    row.hours[line.workDate] = (row.hours[line.workDate] ?? 0) + line.hours;
    if (!row.note && line.note) row.note = line.note;
    rows.set(key, row);
  }
  return [...rows.values()];
}

/** A grid row → the API's row. */
export function payloadOf(row: TimesheetRow) {
  const [kind, id] = (row.item ?? ":").split(/:(.*)/) as [WorkKind, string];
  const hours: Record<string, number> = {};
  for (const [day, value] of Object.entries(row.hours))
    if (value) hours[day] = value;
  return {
    kind,
    project_id: kind === "project" ? id : null,
    project_task_id: kind === "project" ? row.projectTaskId : null,
    request_id: kind === "service" ? id : null,
    solution_id: kind === "presales" ? id : null,
    internal_code: kind === "internal" ? id : null,
    work_type_id: row.workTypeId ?? "",
    billable: kind === "project" || kind === "service" ? row.billable : false,
    note: row.note,
    hours,
  };
}

export function shiftDay(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayLabel(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
