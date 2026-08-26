/**
 * BI API (CD-92)
 *
 * Services: core-service — `GET /bi/menu`
 *
 * The embed URLs are signed by the backend and expire in minutes, so callers
 * must fetch this fresh each time a dashboard page mounts — never cache it.
 */

import { appApi, type ClientResult } from "../client";

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

const biApi = { getBiMenu };

export default biApi;
