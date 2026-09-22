import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { RunNumberAdmin } from "@/components/admin/run-number-admin";
import { apiGet } from "@/lib/api/core";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import type { RunNumberSetting } from "@/lib/api/run-numbers";

/**
 * เลขรันเอกสาร (admin.run-number.manage) — REQ-02.
 * รูปแบบเลขของทุกชนิดเอกสาร แก้ได้โดยไม่ต้อง deploy — docs/run-number.md.
 */
export default async function RunNumbersAdminPage() {
  const session = await getSession();
  if (!can(session, "admin.run-number.manage")) redirect(HOME_PATH);

  const result = await apiGet<RunNumberSetting[]>("/admin/run-numbers");
  const m = messages.runNumbers;

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {m.subtitle}
        </Text>
      </div>

      {result.ok ? (
        <RunNumberAdmin settings={result.data} />
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
