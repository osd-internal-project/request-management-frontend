import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ApprovalMatrixAdmin } from "@/components/approval-matrix-admin";
import admin from "@/lib/api/admin";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

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
  const result = await admin.getApprovalMatrix();

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
          companyId={session?.active_company_id ?? ""}
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
