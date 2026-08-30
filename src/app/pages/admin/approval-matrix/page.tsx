import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ApprovalMatrixAdmin } from "@/components/approval-matrix-admin";
import admin, { getAdminRequestTypes } from "@/lib/api/admin";
import { apiGet } from "@/lib/api/core";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

interface Paginated<T> {
  data: T[];
}

interface DirectoryUser {
  id: string;
  displayName: string;
}

/**
 * Screen §16 A1 — ตารางอำนาจอนุมัติ (APV-01, APV-02).
 *
 * Ceilings and approvers per (company, subject type), versioned with effective
 * dates. Published versions are immutable, so the screen offers "publish a new
 * version" rather than "edit" — an in-flight case keeps the ladder it started
 * under (§7).
 */
export default async function ApprovalMatrixPage() {
  const session = await getSession();

  /**
   * The directory is fetched so the version header can say *who* published a
   * ladder. `createdBy` is stored as an id and core-service owns no identity
   * tables, so the name is resolved here — on an admin screen whose viewer
   * already holds `user.read` — rather than by a cross-service call per row.
   */
  /**
   * The catalog is fetched alongside the ladders because the `ประเภทงาน`
   * selector is built from it — without it the screen can only offer subjects
   * that already have a matrix, which is a list you cannot add the first entry
   * to.
   */
  const [result, users, types] = await Promise.all([
    admin.getApprovalMatrix(),
    apiGet<Paginated<DirectoryUser>>("/users?page_size=100"),
    getAdminRequestTypes(),
  ]);

  const userNames = Object.fromEntries(
    (users.ok ? users.data.data : []).map((user) => [
      user.id,
      user.displayName,
    ]),
  );

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.matrix.title}
        </Title>
        <Text type="secondary">{messages.matrix.subtitle}</Text>
      </div>

      {result.ok ? (
        <ApprovalMatrixAdmin
          versions={result.data}
          types={types.ok ? types.data : []}
          companies={(session?.companies ?? []).map((company) => ({
            id: company.id,
            name: company.name,
          }))}
          companyId={session?.active_company_id ?? ""}
          userNames={userNames}
        />
      ) : (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      )}
    </div>
  );
}
