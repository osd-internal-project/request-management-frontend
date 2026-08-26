import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { OrgAdmin } from "@/components/org-admin";
import orgUnits from "@/lib/api/org-units";

import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * Screen A3 — ผังทีมและสิทธิ์ (AUTH-04, ROLE-03, SCOPE-01).
 *
 * The document's rule for this screen: *"role หลักมาจาก Keycloak, scope ปรับ
 * ในระบบ"*. A member's primary role comes from the realm; what an admin edits
 * here is their org placement, their supervisor, and the data scope attached
 * to their role.
 *
 * The tree itself lives in this database (D-08) — it is the source of truth for
 * "หัวหน้าของผู้ยื่น", which drives data scope, approval step 1, and escalation.
 * Keycloak groups are a separate concept and are not read here.
 */
export default async function AdminOrgPage() {
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
  const initialSelectedId =
    units.find((unit) => unit.kind === "TEAM" && unit.memberCount > 0)?.id ??
    units.find((unit) => unit.memberCount > 0)?.id ??
    units.find((unit) => unit.kind === "TEAM")?.id ??
    units[0]?.id ??
    null;

  const membersResult = initialSelectedId
    ? await orgUnits.getOrgUnitMembers(initialSelectedId)
    : null;

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

      <OrgAdmin
        units={unitsResult.data}
        unassigned={unassignedResult.ok ? unassignedResult.data : []}
        initialSelectedId={initialSelectedId}
        initialMembers={membersResult?.ok ? membersResult.data : []}
        companyId={session?.active_company_id ?? ""}
      />
    </div>
  );
}
