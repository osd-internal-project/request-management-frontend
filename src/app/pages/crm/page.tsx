import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import {
  CrmDashboardView,
  CrmDashboardViewSwitch,
} from "@/components/reports/crm-dashboard-view";
import { getCrmDashboard } from "@/lib/api/reports";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.crmDashboard;

/**
 * CD-73 — ภาพรวม CRM. ตัวเลขทุกตัวมาจาก `GET /opportunities/dashboard` ซึ่งนับ
 * ผ่านกฎการมองเห็นเดียวกับหน้ารายการ การ์ดจึงตรงกับแถวที่กดเข้าไปเห็น.
 */
export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { view } = await searchParams;
  const result = await getCrmDashboard({ view });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={4} className="mb-0!">
            {m.title}
          </Title>
          <Text type="secondary">{m.subtitle}</Text>
          <div>
            <Text type="secondary" className="text-xs">
              {m.scopeNote}
            </Text>
          </div>
        </div>
        <CrmDashboardViewSwitch view={view === "mine" ? "mine" : "team"} />
      </div>

      {result.ok ? (
        <CrmDashboardView dashboard={result.data} />
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
