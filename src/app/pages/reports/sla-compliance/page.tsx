import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { SlaComplianceView } from "@/components/reports/sla-compliance-view";
import { getSlaCompliance } from "@/lib/api/reports";
import requests from "@/lib/api/requests";
import { messages } from "@/lib/messages";

/**
 * CD-50 — รายงานการทำตามกำหนด. The menu shows it to `report.request.read`,
 * the same permission the endpoint declares.
 */
export default async function SlaCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{
    group_by?: string;
    type_code?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const filters = await searchParams;
  const [result, types] = await Promise.all([
    getSlaCompliance(filters),
    requests.getRequestTypes(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.slaReport.title}
        </Title>
        <Text type="secondary">{messages.slaReport.subtitle}</Text>
        <div>
          <Text type="secondary" className="text-xs">
            {messages.slaReport.scopeNote}
          </Text>
        </div>
      </div>

      {result.ok ? (
        <SlaComplianceView
          report={result.data}
          types={types.ok ? types.data : []}
          filters={filters}
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
