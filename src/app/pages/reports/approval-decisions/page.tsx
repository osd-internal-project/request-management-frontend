import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { DecisionLogView } from "@/components/reports/decision-log-view";
import { getDecisionLog, type DecisionLogFilters } from "@/lib/api/reports";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.decisionLog;

/**
 * APV-06 (CD-45) — ประวัติการใช้อำนาจอนุมัติ. หนึ่งแถวต่อการตัดสินหนึ่งครั้ง
 * กรองที่ server ทั้งหมด ปุ่มดาวน์โหลดใช้ตัวกรองชุดเดียวกัน.
 */
export default async function DecisionLogPage({
  searchParams,
}: {
  searchParams: Promise<DecisionLogFilters>;
}) {
  const session = await getSession();
  if (!can(session, "approval.history.read")) redirect(HOME_PATH);

  const filters = await searchParams;
  const result = await getDecisionLog(filters);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>

      {result.ok ? (
        <DecisionLogView
          rows={result.data.data}
          total={result.data.total}
          page={result.data.page}
          pageSize={result.data.page_size}
          period={result.data.period}
          basis={filters.basis}
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
