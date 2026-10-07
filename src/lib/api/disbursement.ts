/**
 * การเบิก — core-service `/disbursements`: created once the FI05 / FI06 request is approved;
 * paid in instalments, cleared and closed here. `legacy` rows still follow the request's steps.
 */
import { apiGet, type ApiResult } from "./core";
import type { Paginated } from "./types";

export type DisbursementKind = "ADVANCE" | "PETTY_CASH";
export type DisbursementStatus =
  | "PENDING_HEAD"
  | "RETURNED"
  | "PENDING_VERIFY"
  | "PENDING_EXEC"
  | "APPROVED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CLEARING"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";
export type DisbursementFileKind =
  | "PAYMENT_SLIP"
  | "TAX_INVOICE"
  | "RECEIPT_VOUCHER"
  | "TRAVEL_SLIP"
  | "RECEIPT"
  | "REFUND_PROOF"
  | "OTHER";

export interface DisbursementRow {
  docNo: string;
  kind: DisbursementKind;
  status: DisbursementStatus;
  requestNo: string | null;
  requesterId: string;
  purpose: string | null;
  requestedAmount: string;
  paidAmount: string;
  actualAmount: string | null;
  clearBy: string | null;
  createdAt: string;
}

export interface DisbursementLine {
  lineNo: number;
  description: string;
  costCenter: string | null;
  amount: string;
  note: string | null;
  receiptDate: string | null;
}

export interface DisbursementMovement {
  id: string;
  type: "PAYOUT" | "PAYOUT_VOID" | "REFUND" | "EXTRA_PAY";
  amount: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  /** When the money moved, as dated by accounting. */
  occurredAt: string | null;
  /** PAYOUT_VOID → the PAYOUT it cancels. */
  reversesId: string | null;
  counterpartyUserId: string | null;
  actedBy: string;
  actedAt: string;
}

export interface DisbursementFile {
  id: string;
  kind: DisbursementFileKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DisbursementDetail extends DisbursementRow {
  requestId: string;
  /** Worked through the request's own steps (a flow from before v3). */
  legacy: boolean;
  orgUnitId: string | null;
  payee: string | null;
  costCenter: string | null;
  neededBy: string | null;
  references: {
    soNo: string | null;
    soSubject: string | null;
    ticketNo: string | null;
    projectCode: string | null;
  };
  currency: string;
  refundAmount: string;
  extraPaidAmount: string;
  /** What closing would settle now; only while clearing. */
  pending: { refund: string; extraPay: string } | null;
  verify: {
    checks: Record<string, boolean> | null;
    note: string | null;
    by: string | null;
    at: string;
  } | null;
  approvedAt: string | null;
  paidBy: string | null;
  paidAt: string | null;
  clearingAt: string | null;
  closedBy: string | null;
  closedAt: string | null;
  estimate: DisbursementLine[];
  actual: DisbursementLine[];
  movements: DisbursementMovement[];
  files: DisbursementFile[];
  /** The request (ticket) this screen works. */
  ticket: {
    requestId: string;
    status: string;
    stepCode: string | null;
    assigneeUserId: string | null;
  } | null;
  workSteps: {
    verify: string | null;
    exec: string | null;
    pay: string | null;
    clear: string | null;
  } | null;
}

/** Returned by the actions that move the ticket after recording the money. */
export interface TicketMove {
  moved: boolean;
  message: string | null;
}

export interface DisbursementFilters {
  kind?: string;
  /** One status, or several joined with `,`. */
  status?: string;
  scope?: "mine" | "all";
  overdue?: "true";
}

export function getDisbursements(
  filters: DisbursementFilters,
): Promise<ApiResult<Paginated<DisbursementRow>>> {
  const params = new URLSearchParams({ page_size: "50" });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return apiGet(`/disbursements?${params.toString()}`);
}

export function getDisbursement(
  docNo: string,
): Promise<ApiResult<DisbursementDetail>> {
  return apiGet(`/disbursements/${encodeURIComponent(docNo)}`);
}
