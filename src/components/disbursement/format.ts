import type {
  DisbursementKind,
  DisbursementStatus,
} from "@/lib/api/disbursement";

/** An evidence file through the BFF (client-safe: no server-only imports here). */
export function disbursementFileUrl(docNo: string, fileId: string): string {
  return `/api/app/disbursements/${encodeURIComponent(docNo)}/files/${encodeURIComponent(fileId)}`;
}

/** `15,000.00` — the screens' money format. */
export const baht = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** `15/09/2569` — Buddhist-era date, as the screens print it. */
export function thaiDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

export function thaiDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export const STATUS_COLOR: Record<DisbursementStatus, string> = {
  PENDING_HEAD: "gold",
  RETURNED: "orange",
  PENDING_VERIFY: "blue",
  PENDING_EXEC: "purple",
  APPROVED: "cyan",
  PARTIALLY_PAID: "blue",
  PAID: "geekblue",
  CLEARING: "volcano",
  CLOSED: "green",
  REJECTED: "red",
  CANCELLED: "default",
};

/** Which of the screen's steps (Flow_Advance.png) the disbursement stands on; past the end = done. */
export function stepIndex(
  kind: DisbursementKind,
  status: DisbursementStatus,
): number {
  const advance: Record<DisbursementStatus, number> = {
    RETURNED: 0,
    PENDING_HEAD: 1,
    PENDING_VERIFY: 3,
    PENDING_EXEC: 3,
    APPROVED: 4,
    PARTIALLY_PAID: 4,
    PAID: 5,
    CLEARING: 6,
    CLOSED: 7,
    REJECTED: 1,
    CANCELLED: 0,
  };
  const petty: Record<DisbursementStatus, number> = {
    ...advance,
    PAID: 6,
    CLEARING: 6,
    CLOSED: 6,
  };
  return (kind === "PETTY_CASH" ? petty : advance)[status];
}

/** The step of a disbursement created after approval (`messages.disbursement.v3Steps`); past the end = done. */
export function v3StepIndex(kind: DisbursementKind, status: DisbursementStatus): number {
  const advance: Partial<Record<DisbursementStatus, number>> = {
    PENDING_VERIFY: 0,
    APPROVED: 1,
    PARTIALLY_PAID: 1,
    PAID: 2,
    CLEARING: 3,
    CLOSED: 4,
  };
  const petty: Partial<Record<DisbursementStatus, number>> = {
    PENDING_VERIFY: 0,
    APPROVED: 1,
    PARTIALLY_PAID: 1,
    PAID: 2,
    CLOSED: 3,
  };
  return (kind === "PETTY_CASH" ? petty : advance)[status] ?? 0;
}
