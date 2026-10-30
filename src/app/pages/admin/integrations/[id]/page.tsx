import { redirect } from "next/navigation";
import { IntegrationDetail } from "@/components/admin/integrations/integration-detail";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** ระบบภายนอกหนึ่งระบบ: ตั้งค่า · กุญแจ API · Webhook · MCP · ประวัติการเรียก. */
export default async function AdminIntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  const { id } = await params;
  // ที่อยู่ที่ LibreChat มองเห็น ไม่ใช่ EXTERNAL_SERVICE_URL ภายใน docker
  const base = process.env.EXTERNAL_API_PUBLIC_URL?.replace(/\/$/, "");

  return (
    <IntegrationDetail
      id={id}
      mcpEndpoint={base ? `${base}/api/v1/mcp` : null}
      externalApiBase={base ? `${base}/api/v1` : null}
      canAudit={can(session, "admin.ai.audit")}
    />
  );
}
