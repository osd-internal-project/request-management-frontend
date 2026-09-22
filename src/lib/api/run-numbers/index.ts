/**
 * Run number API (REQ-02)
 * Service: run-number-service — `/admin/run-numbers/*`
 */

import { adminApi, type ClientResult } from "../client";

export type RunNumberDocType =
  | "REQUEST"
  | "CUSTOMER"
  | "OPPORTUNITY"
  | "SALE_ORDER"
  | "QUOTATION";

export type RunNumberReset = "none" | "yearly" | "monthly" | "daily";

export interface RunNumberSetting {
  id: string;
  companyId: string;
  docType: RunNumberDocType;
  /** `*` = ใช้กับทุกขอบเขตของชนิดเอกสารนี้ */
  scopeKey: string;
  pattern: string;
  seqPadding: number;
  startNumber: number;
  resetPeriod: RunNumberReset;
  active: boolean;
}

export interface RunNumberToken {
  token: string;
  label: string;
  sample: string;
}

export interface RunNumberPreview {
  number: string;
  seq: number;
  pattern: string;
  periodKey: string;
}

export interface RunNumberPayload {
  doc_type: RunNumberDocType;
  scope_key?: string;
  pattern: string;
  seq_padding?: number;
  start_number?: number;
  reset_period?: RunNumberReset;
  active?: boolean;
}

export interface RunNumberPreviewPayload {
  doc_type: RunNumberDocType;
  scope_key?: string;
  pattern?: string;
  seq_padding?: number;
  start_number?: number;
  reset_period?: RunNumberReset;
}

/** ทุกรูปแบบของบริษัทที่ใช้งานอยู่ รวมที่ปิดไว้. */
export async function listRunNumbers(): Promise<
  ClientResult<RunNumberSetting[]>
> {
  return adminApi<RunNumberSetting[]>("run-numbers");
}

/** ตัวแปรที่ชนิดเอกสารนี้ใช้ได้ — หน้าจอไม่ฝังรายการเอง. */
export async function listRunNumberTokens(
  docType: RunNumberDocType,
): Promise<ClientResult<RunNumberToken[]>> {
  return adminApi<RunNumberToken[]>(`run-numbers/tokens?doc_type=${docType}`);
}

/** ตัวอย่างเลขของรูปแบบที่ยังไม่บันทึก คำนวณฝั่ง server. */
export async function previewRunNumber(
  payload: RunNumberPreviewPayload,
): Promise<ClientResult<RunNumberPreview>> {
  return adminApi<RunNumberPreview>("run-numbers/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createRunNumber(
  payload: RunNumberPayload,
): Promise<ClientResult<RunNumberSetting>> {
  return adminApi<RunNumberSetting>("run-numbers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRunNumber(
  id: string,
  payload: Partial<RunNumberPayload>,
): Promise<ClientResult<RunNumberSetting>> {
  return adminApi<RunNumberSetting>(`run-numbers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteRunNumber(id: string): Promise<ClientResult<void>> {
  return adminApi<void>(`run-numbers/${id}`, { method: "DELETE" });
}

const runNumbersApi = {
  listRunNumbers,
  listRunNumberTokens,
  previewRunNumber,
  createRunNumber,
  updateRunNumber,
  deleteRunNumber,
};

export default runNumbersApi;
