import { redirect } from "next/navigation";
import { Alert } from "antd";
import { RunNumberAdmin } from "@/components/admin/run-number-admin";
import { apiGet } from "@/lib/api/core";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import type { RunNumberSetting } from "@/lib/api/run-numbers";
import { PageHeader } from "@/components/admin/page-header";

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
    <div className="flex flex-col gap-4">
      <PageHeader title={m.title} subtitle={m.subtitle} />

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
