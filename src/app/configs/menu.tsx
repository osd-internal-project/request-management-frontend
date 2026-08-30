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

/** One BI dashboard as the menu needs it — `key` and `title` from `GET /bi/menu`. */
export interface BiMenuDashboard {
  key: string;
  title: string;
}

/**
 * The menu this session may see (ROLE-06).
 *
 * Filtering here is for usability only — a user who types an admin URL still
 * gets a 403 from the backend, because `PolicyGuard` re-checks the same
 * permission on every call. Never treat a hidden menu item as access control.
 *
 * CD-92 v2: the BI entries are no longer fixed — the layout passes in whatever
 * `GET /bi/menu` answered for this caller (already filtered per team by the
 * backend), and they render under the BI group between reports and admin.
 *
 * Passing no session yields an empty menu rather than the full one, so a
 * failed `/auth/me` degrades closed.
 */
export const accessMenuItems = (
  session?: Session | null,
  biDashboards: readonly BiMenuDashboard[] = [],
): MenuEntry[] => {
  if (!session) return [];

  const biEntries: MenuEntry[] = biDashboards.map((dashboard) => ({
    label: dashboard.title,
    href: ROUTES.biDashboard(dashboard.key),
    permissions: ["report.dashboard.read"],
    group: messages.nav.biGroup,
  }));

  const adminStart = MENU_ITEMS.findIndex(
    (item) => item.group === messages.nav.adminGroup,
  );
  const items =
    adminStart === -1
      ? [...MENU_ITEMS, ...biEntries]
      : [
          ...MENU_ITEMS.slice(0, adminStart),
          ...biEntries,
          ...MENU_ITEMS.slice(adminStart),
        ];

  return items.filter(
    (item) =>
      !item.permissions?.length ||
      item.permissions.some((permission) =>
        session.permissions.includes(permission),
      ),
  );
};
