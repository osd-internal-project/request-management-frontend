import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { KeycloakMappingAdmin } from "@/components/keycloak-mapping-admin";
import { OrgAdmin } from "@/components/org-admin";
import { OrgPermissionTabs } from "@/components/org-permission-tabs";
import { GroupScopeAdmin } from "@/components/group-scope-admin";
import { ScopeRulesAdmin } from "@/components/scope-rules-admin";
import { RolePermissionAdmin } from "@/components/role-permission-admin";
import audit from "@/lib/api/audit";
import orgUnits from "@/lib/api/org-units";
import roleApi from "@/lib/api/roles";

import { messages } from "@/lib/messages";
import { toOrgTab } from "@/lib/org-tabs";
import { can, getSession } from "@/lib/session";

/**
 * Screen §16 A3 — ผังทีมและสิทธิ์, and Screen §16 A4 — Role และ Permission.
 *
 * §16 draws these as two tabs of one screen, with Scope Rules and Keycloak
 * Mapping beside them, so they share a page and a company header.
 *
 * The document's rule throughout: *"role หลักมาจาก Keycloak, scope ปรับใน
 * ระบบ"*. Membership of a role is decided in the realm (ROLE-03); what a role
 * may do, and how far it sees, is decided here.
 *
 * The org tree lives in this database (D-08) — the source of truth for
 * "หัวหน้าของผู้ยื่น", which drives data scope, approval step 1, and escalation.
 * Keycloak groups are a separate concept and are not read here.
 */
export default async function AdminOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = toOrgTab(tab);

  const session = await getSession();

  const [unitsResult, unassignedResult] = await Promise.all([
    orgUnits.getOrgUnits(),
    orgUnits.getUnassignedUsers(),
  ]);

  // The unit opened on first paint, and its members, resolved here so the
  // client component needs no effect to fill the panel — selecting a *different*
  // unit is a user action and loads from its click handler.
  // Prefer a unit that actually has members: opening on an empty one makes the
  // screen look broken when it is merely showing the truth about an empty team.
  const units = unitsResult.ok ? unitsResult.data : [];
  /*
    Prefer whichever unit has the most people. The old order looked for a TEAM
    first, and the real OSD chart (บริษัท → ฝ่าย → แผนก) has none — so it fell
    through to `units[0]`, the company root, which holds nobody and made a
    fully populated org chart open on an empty panel.
  */
  const initialSelectedId =
    [...units]
      .sort((a, b) => b.memberCount - a.memberCount)
      .find((unit) => unit.memberCount > 0)?.id ??
    units.find(
      (unit) =>
        unit.kind === "POSITION" ||
        unit.kind === "TEAM" ||
        unit.kind === "DEPARTMENT",
    )
      ?.id ??
    units[0]?.id ??
    null;

  // The scope pane opens on the same group as the tree, so its grants come
  // with the first paint too — picking a *different* group loads from the
  // client, like the member panel above.
  const [membersResult, scopesResult] = initialSelectedId
    ? await Promise.all([
        orgUnits.getOrgUnitMembers(initialSelectedId),
        orgUnits.getOrgUnitScopes(initialSelectedId),
      ])
    : [null, null];

  // The other tabs. Fetched here rather than lazily on tab change so
  // switching tabs is instant and the whole screen fails or succeeds as one —
  // each is a small admin table, not a paged list.
  const [permissionResult, rolesResult, mappingResult] = await Promise.all([
    roleApi.getPermissions(),
    roleApi.getRoles(),
    roleApi.getKeycloakRoleMappings(),
  ]);

  const roleRows = rolesResult.ok ? rolesResult.data : [];
  const mappingRows = mappingResult.ok ? mappingResult.data : [];

  // A4 opens on the first role, so its panels are filled server-side; every
  // later selection loads from the client (see `client-roles.ts`).
  const firstRoleId = roleRows[0]?.id ?? null;

  const [holderResult, auditResult] = firstRoleId
    ? await Promise.all([
        roleApi.getRoleHolders(firstRoleId),
        audit.getAuditLogs({
          page: 1,
          page_size: 3,
          resource_type: "role",
          resource_id: firstRoleId,
        }),
      ])
    : [null, null];

  if (!unitsResult.ok) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={unitsResult.error.message}
      />
    );
  }

  const activeCompany = session?.companies.find(
    (company) => company.id === session.active_company_id,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Title level={4} className="mb-0!">
          {messages.org.title}{" "}
          <Text type="secondary" className="text-base font-normal">
            — {messages.org.subtitle}
          </Text>
        </Title>
        {activeCompany && (
          <Text type="secondary">
            {messages.nav.company}: {activeCompany.name}
          </Text>
        )}
      </div>

      <OrgPermissionTabs
        initialTab={initialTab}
        tree={
          <OrgAdmin
            units={unitsResult.data}
            unassigned={unassignedResult.ok ? unassignedResult.data : []}
            initialSelectedId={initialSelectedId}
            initialMembers={membersResult?.ok ? membersResult.data : []}
            companyId={session?.active_company_id ?? ""}
            roles={roleRows}
            canManageRoles={can(session, "admin.role.manage")}
          />
        }
        roles={
          <RolePermissionAdmin
            roles={roleRows}
            permissions={permissionResult.ok ? permissionResult.data : []}
            mappings={mappingRows}
            companyName={activeCompany?.name ?? ""}
            companyId={session?.active_company_id ?? ""}
            initialHolders={holderResult?.ok ? holderResult.data : []}
            initialAudit={auditResult?.ok ? auditResult.data.data : []}
          />
        }
        scope={
          <div className="space-y-4">
            {/*
              The editable half first: an administrator opening this tab is
              almost always here to change something, and the rules that
              cannot be changed are context for that, not the point of it.
            */}
            <GroupScopeAdmin
              units={unitsResult.data}
              initialViewerId={initialSelectedId}
              initialScopes={scopesResult?.ok ? scopesResult.data : []}
            />
            <ScopeRulesAdmin roles={roleRows} />
          </div>
        }
        keycloak={
          <KeycloakMappingAdmin
            mappings={mappingRows}
            roles={roleRows}
            companyId={session?.active_company_id ?? ""}
          />
        }
      />
    </div>
  );
}
