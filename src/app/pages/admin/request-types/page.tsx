import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { RequestTypeAdmin } from "@/components/request-type-admin";
import admin, { getAdminRequestTypes } from "@/lib/api/admin";
import orgUnitsApi from "@/lib/api/org-units";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { can, getSession } from "@/lib/session";

/**
 * Screen §16 A2 — ประเภทคำขอ (ผู้ดูแล), with §16 A1 folded in.
 *
 * Loaded from the *admin* list, which includes inactive types: a type still
 * being set up is precisely what this screen exists to finish, and the
 * requester-facing list deliberately hides it.
 *
 * ตารางอำนาจอนุมัติ used to be a screen of its own that asked for the request
 * type all over again. It is now two tabs of the type already selected here,
 * so its ladders and the directory it names publishers from are fetched
 * alongside the catalog.
 */
export default async function AdminRequestTypesPage() {
  const session = await getSession();

  /*
    One permission covers both reading and publishing a ladder, so a viewer
    without it is not asked for — the tabs say so instead. Fetching anyway
    would be a guaranteed 403 per page view and one FORBIDDEN line in the
    core-service log burying the real ones.
  */
  const canManageMatrix = can(session, "admin.approval-matrix.manage");

  // The org tree feeds the `ทีมผู้รับ` selector. Fetched alongside rather than
  // on demand: it is a handful of rows and the selector is always on screen.
  const [result, unitsResult, matrix, users] = await Promise.all([
    getAdminRequestTypes(),
    orgUnitsApi.getOrgUnits(),
    canManageMatrix ? admin.getApprovalMatrix() : null,
    // The directory names who published a version; `createdBy` is stored as an
    // id and core-service owns no identity tables.
    canManageMatrix ? getAllDirectoryUsers() : null,
  ]);

  const userNames = Object.fromEntries(
    (users?.ok ? users.data : []).map((user) => [user.id, user.displayName]),
  );

  if (!result.ok) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={result.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.requestTypes.title}
        </Title>
        <Text type="secondary">{messages.requestTypes.subtitle}</Text>
      </div>

      {/*
        The company is named on the list card §16 heads with it
        (`ประเภททั้งหมด · บริษัท OSD`), so it is not repeated here.
      */}
      <RequestTypeAdmin
        types={result.data}
        orgUnits={unitsResult.ok ? unitsResult.data : []}
        companies={(session?.companies ?? []).map((company) => ({
          id: company.id,
          name: company.name,
        }))}
        companyId={session?.active_company_id ?? ""}
        matrixVersions={matrix?.ok ? matrix.data : []}
        userNames={userNames}
        canManageMatrix={canManageMatrix}
      />
    </div>
  );
}
