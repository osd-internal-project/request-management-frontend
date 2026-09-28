import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import {
  SalesReportFilters,
  SalesReportView,
} from "@/components/reports/sales-report-view";
import { getSalesReport } from "@/lib/api/reports";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.salesReport;

/**
 * CD-83 — รายงานยอดขาย.
 *
 * ตัวเลขรวมมาจาก server ทั้งหมด (`GET /opportunities/report`) หน้านี้แค่พาช่วงเวลา
 * จาก URL ไปให้ — ไม่ narrow ต่อในเบราว์เซอร์ เพราะอัตราการปิดที่คำนวณซ้ำจากแถว
 * ที่ถูกตัดแล้วคือคนละตัวเลขกัน.
 */
export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const filters = await searchParams;
  const result = await getSalesReport(filters);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
        {/* SCOPE-02: ตารางที่สั้นกว่าของเพื่อนร่วมงานคือความจริง ไม่ใช่ข้อมูลหาย */}
        <div>
          <Text type="secondary" className="text-xs">
            {m.scopeNote}
          </Text>
        </div>
      </div>

      {/* อยู่นอกเงื่อนไข: วันที่ผิดใน URL ต้องแก้ได้จากหน้าเดิม */}
      <SalesReportFilters
        from={result.ok ? result.data.period.from : filters.from}
        to={result.ok ? result.data.period.to : filters.to}
      />

      {result.ok ? (
        <SalesReportView report={result.data} />
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
