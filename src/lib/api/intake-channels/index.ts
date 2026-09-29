/**
 * CD-66 — a company's customer-intake channels (core-service,
 * `admin.request-type.manage`).
 */
import { apiGet, type ApiResult } from "../core";

export type IntakeChannelCode = "web_form" | "line" | "ai_care";

export interface IntakeChannelRow {
  channel: IntakeChannelCode;
  configured: boolean;
  enabled: boolean;
  requester: { id: string; displayName: string } | null;
  type_codes: string[];
  /** web_form only — the public link's secret part. */
  slug: string | null;
  title: string | null;
  intro: string | null;
  updated_at: string | null;
}

export function getIntakeChannels(): Promise<ApiResult<IntakeChannelRow[]>> {
  return apiGet("/admin/intake-channels");
}
