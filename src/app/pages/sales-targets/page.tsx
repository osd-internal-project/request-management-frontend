import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { SalesTargetsView } from "@/components/crm/sales-targets/sales-targets-view";
import { getSalesTargets } from "@/lib/api/sales-targets";
import { getOrgUnitShapes } from "@/lib/api/org-units";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.salesTargets;

/**
 * CD-82 — เป้าและพยากรณ์. ตัวเลขทุกตัวคำนวณที่ server (`GET /sales-targets`).
 * ตัวเลือกพนักงาน/กลุ่มโหลดเฉพาะผู้ตั้งเป้าที่อ่านสมุดรายชื่อได้ — คนอื่นไม่มีฟอร์ม
 * จึงไม่ยิงคำขอที่รู้ว่าจะได้ 403.
 */
export default async function SalesTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { period } = await searchParams;
  const pickers =
    can(session, "crm.target.manage") && can(session, "user.read");

  const [result, users, units] = await Promise.all([
    getSalesTargets(period),
    pickers ? getAllDirectoryUsers() : null,
    pickers ? getOrgUnitShapes() : null,
  ]);

  return (
    <div className="space-y-4">
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

      {result.ok ? (
        <SalesTargetsView
          list={result.data}
          users={users?.ok ? users.data : []}
          units={units?.ok ? units.data.filter((unit) => unit.active) : []}
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
