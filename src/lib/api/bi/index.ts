/**
 * BI API (CD-92)
 *
 * Services: core-service — `GET /bi/menu`, `/admin/bi/*`
 *
 * The embed URLs are signed by the backend and expire in minutes, so callers
 * must fetch this fresh each time a dashboard page mounts — never cache it.
 *
 * v2: the dashboard list is configuration (`bi_dashboards`), administered
 * from the "ตั้งค่า Dashboard" screen — each dashboard optionally scoped to
 * org units, so `GET /bi/menu` already answers per caller.
 */

import { adminApi, appApi, type ClientResult } from "../client";

export interface BiDashboard {
  key: string;
  title: string;
  embed_url: string;
}

export interface BiMenu {
  configured: boolean;
  dashboards: BiDashboard[];
  /** Present only when the caller holds `admin.bi.manage`. */
  settings_url: string | null;
}

/** Get the BI menu with fresh signed embed URLs. */
export async function getBiMenu(): Promise<ClientResult<BiMenu>> {
  return appApi<BiMenu>("bi/menu");
}

// --- admin surface (`admin.bi.manage`) ---

export interface BiAudienceUnit {
  id: string;
  name: string;
  kind: string;
}

export interface BiDashboardConfig {
  id: string;
  title: string;
  metabase_dashboard_id: number;
  sort_order: number;
  active: boolean;
  /** Empty = ทั้งบริษัทเห็น */
  org_units: BiAudienceUnit[];
  updated_at: string;
}

export interface BiOrgUnitOption {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
}

export interface BiDashboardPayload {
  title: string;
  metabase_dashboard_id: number;
  sort_order?: number;
  org_unit_ids?: string[];
  active?: boolean;
}

/** Every dashboard of the active company, retired ones included. */
export async function listBiDashboards(): Promise<
  ClientResult<BiDashboardConfig[]>
> {
  return adminApi<BiDashboardConfig[]>("bi/dashboards");
}

/** Org units of the active company, for the audience picker. */
export async function listBiOrgUnits(): Promise<
  ClientResult<BiOrgUnitOption[]>
> {
  return adminApi<BiOrgUnitOption[]>("bi/org-units");
}

export async function createBiDashboard(
  payload: BiDashboardPayload,
): Promise<ClientResult<BiDashboardConfig>> {
  return adminApi<BiDashboardConfig>("bi/dashboards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBiDashboard(
  id: string,
  payload: Partial<BiDashboardPayload>,
): Promise<ClientResult<BiDashboardConfig>> {
  return adminApi<BiDashboardConfig>(`bi/dashboards/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Soft delete — the backend retires the row (`active: false`). */
export async function deleteBiDashboard(
  id: string,
): Promise<ClientResult<void>> {
  return adminApi<void>(`bi/dashboards/${id}`, { method: "DELETE" });
}

const biApi = {
  getBiMenu,
  listBiDashboards,
  listBiOrgUnits,
  createBiDashboard,
  updateBiDashboard,
  deleteBiDashboard,
};

export default biApi;
