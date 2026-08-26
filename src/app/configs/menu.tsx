import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { Session } from "@/lib/session";

export interface MenuEntry {
  label: string;
  href: string;
  /** Shown only if the session holds at least one of these. */
  permissions?: readonly string[];
  /** Group heading rendered above this entry, e.g. "ผู้ดูแลระบบ". */
  group?: string;
}

/**
 * The navigation from the §16 mockups, each entry tagged with the permission
 * that reveals it.
 */
const MENU_ITEMS: readonly MenuEntry[] = [
  {
    label: messages.nav.myWork,
    href: ROUTES.myWork,
    permissions: ["request.read"],
  },
  {
    label: messages.nav.newRequest,
    href: ROUTES.newRequest,
    permissions: ["request.create"],
  },
  {
    label: messages.nav.approvals,
    href: ROUTES.approvals,
    permissions: ["approval.decide"],
  },
  {
    label: messages.nav.bottleneckReport,
    href: ROUTES.bottleneckReport,
    permissions: ["report.request.read"],
  },

  // CD-92 — Metabase dashboards, embedded behind the app's own login. The
  // key segment must match `dashboards[].key` from `GET /bi/menu`.
  {
    label: messages.nav.biRequestOverview,
    href: ROUTES.biDashboard("requestOverview"),
    permissions: ["report.dashboard.read"],
    group: messages.nav.biGroup,
  },
  {
    label: messages.nav.biApproval,
    href: ROUTES.biDashboard("approval"),
    permissions: ["report.dashboard.read"],
    group: messages.nav.biGroup,
  },
  {
    label: messages.nav.biSla,
    href: ROUTES.biDashboard("sla"),
    permissions: ["report.dashboard.read"],
    group: messages.nav.biGroup,
  },

  {
    label: messages.nav.adminApprovalMatrix,
    href: ROUTES.adminApprovalMatrix,
    permissions: ["admin.approval-matrix.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminRequestTypes,
    href: ROUTES.adminRequestTypes,
    permissions: ["admin.request-type.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminOrg,
    href: ROUTES.adminOrg,
    permissions: ["admin.org.manage"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminUsers,
    href: ROUTES.adminUsers,
    permissions: ["user.read"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminAudit,
    href: ROUTES.adminAudit,
    permissions: ["audit.read"],
    group: messages.nav.adminGroup,
  },
  {
    label: messages.nav.adminBi,
    href: ROUTES.adminBi,
    permissions: ["admin.bi.manage"],
    group: messages.nav.adminGroup,
  },
];

/**
 * The menu this session may see (ROLE-06).
 *
 * Filtering here is for usability only — a user who types an admin URL still
 * gets a 403 from the backend, because `PolicyGuard` re-checks the same
 * permission on every call. Never treat a hidden menu item as access control.
 *
 * Passing no session yields an empty menu rather than the full one, so a
 * failed `/auth/me` degrades closed.
 */
export const accessMenuItems = (session?: Session | null): MenuEntry[] => {
  if (!session) return [];

  return MENU_ITEMS.filter(
    (item) =>
      !item.permissions?.length ||
      item.permissions.some((permission) =>
        session.permissions.includes(permission),
      ),
  );
};
