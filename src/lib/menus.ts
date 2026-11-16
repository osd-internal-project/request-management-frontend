import {
  accessMenuItems,
  type BiMenuDashboard,
  type MenuEntry,
} from "@/app/configs/menu";
import { apiGet } from "@/lib/api/core";
import type { Session } from "@/lib/session-shape";

/**
 * The menu this session may see, BI entries included — shared by the shell and
 * the main-menu page so both list the same entries.
 *
 * CD-92 v2: the BI entries come from configuration, already filtered per
 * caller (team visibility) by the backend. A failed fetch just renders the
 * menu without the BI group — the dashboards themselves still load their own
 * data when opened.
 */
export async function loadMenus(session: Session): Promise<MenuEntry[]> {
  let biDashboards: BiMenuDashboard[] = [];
  if (session.permissions.includes("report.dashboard.read")) {
    const menu = await apiGet<{ dashboards: BiMenuDashboard[] }>("/bi/menu");
    if (menu.ok) biDashboards = menu.data.dashboards;
  }
  return accessMenuItems(session, biDashboards);
}
