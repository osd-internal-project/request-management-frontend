/** CD-53 — one reminder rule: what it is (catalog, in code) and the company's setting. */
export interface NotificationRuleRow {
  code: string;
  module: "crm" | "finance" | "pm" | "kb";
  label: string;
  description: string;
  recipients: string;
  events: { event_type: string; label: string }[];
  params: {
    key: string;
    label: string;
    /** CD-266 — count and percent are a single whole number. */
    kind: "days" | "days_list" | "percent_list" | "count" | "percent";
    min: number;
    max: number;
    max_items: number | null;
  }[];
  standard: { enabled: true; params: RuleParams };
  enabled: boolean;
  values: RuleParams;
  /** false = the standard is in use. */
  customized: boolean;
  updated_at: string | null;
}

export type RuleParams = Record<string, number | number[]>;
