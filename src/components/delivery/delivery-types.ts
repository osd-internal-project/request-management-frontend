/** CD-250 — what `delivery/*` answers with. */

export type Readiness = "unknown" | "ready" | "partial" | "not_ready";

export interface DeliveryLine {
  id: string;
  boqIndex: number;
  label: string;
  unit: string | null;
  quantity: number;
  readiness: Readiness;
  readyQty: number | null;
  expectedOn: string | null;
  fallbackPlan: string;
  note: string;
}

export interface Delivery {
  id: string;
  projectId: string;
  milestoneId: string;
  seq: number;
  plannedOn: string;
  location: string;
  receiverName: string;
  receiverPhone: string;
  note: string;
  status: "planned" | "delivered" | "cancelled";
  readiness: Readiness;
  lines: DeliveryLine[];
  warning?: boolean;
}

export interface ProjectDeliveryView {
  project: { id: string; label: string; status: string };
  canEdit: boolean;
  today: string;
  warnDays: number;
  milestones: {
    id: string;
    seq: number;
    title: string;
    dueOn: string | null;
    status: string;
  }[];
  boq: {
    index: number;
    label: string;
    quantity: number;
    unit: string | null;
    planned: number;
    remaining: number;
    over: boolean;
  }[];
  deliveries: Delivery[];
}

export interface DeliveryBoardView {
  today: string;
  warnDays: number;
  items: (Delivery & {
    project: { id: string; label: string; managerUserId: string } | null;
    milestone: { id: string; seq: number; title: string } | null;
  })[];
}

export const READINESS_COLOR: Record<Readiness, string> = {
  ready: "success",
  partial: "warning",
  not_ready: "error",
  unknown: "default",
};

export function thaiDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}
