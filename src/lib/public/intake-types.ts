/** CD-66 — shapes of the customer-intake API (external-service). */

export type IntakeFieldType =
  | "text"
  | "multiline"
  | "number"
  | "boolean"
  | "select"
  | "date"
  | "datetime"
  | "table";

export interface IntakeField {
  key: string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  order: number;
  options?: { value: string; label: string }[];
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  trueLabel?: string;
  falseLabel?: string;
  maxItems?: number;
  /** `table` only — its columns, as fields in their own right. */
  columns?: IntakeField[];
}

export interface IntakeFormView {
  company_name: string;
  title: string | null;
  intro: string | null;
  types: {
    code: string;
    name: string;
    fields: IntakeField[];
    /** Needs documents or a reference — staff must raise it. */
    needs_staff: boolean;
  }[];
}

export interface IntakeReceipt {
  request_no: string | null;
  status: string;
  status_token: string;
  customer_matched: boolean;
}

export interface IntakeStatusView {
  request_no: string | null;
  type_name: string;
  company_name: string;
  status: string;
  submitted_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  updated_at: string;
}
