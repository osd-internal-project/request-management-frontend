import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { CrmAdmin } from "@/components/crm-admin";
import { apiGet } from "@/lib/api/core";
import customers from "@/lib/api/customers";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import type { CrmConfig } from "@/lib/api/types";

/**
 * ตั้งค่า CRM (admin.crm.manage) — CM-07 segment dimensions/values, CM-02
 * customer-code shape, CM-03 dedup threshold. Configuration over code (D-09):
 * everything here changes behaviour without a deploy.
 */
export default async function CrmAdminPage() {
  const session = await getSession();
  if (!can(session, "admin.crm.manage")) redirect(HOME_PATH);

  const [dimensionsResult, configResult, kycProductsResult] = await Promise.all([
    customers.getSegmentDimensions(),
    apiGet<CrmConfig>("/admin/crm/config"),
    customers.getKycProducts(),
  ]);

  const failed = !dimensionsResult.ok
    ? dimensionsResult
    : !configResult.ok
      ? configResult
      : null;

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.customers.admin.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.customers.admin.segmentsHint}
        </Text>
      </div>

      {failed && !failed.ok && (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={failed.error.message}
        />
      )}

      <CrmAdmin
        dimensions={dimensionsResult.ok ? dimensionsResult.data : []}
        kycProducts={kycProductsResult.ok ? kycProductsResult.data : []}
        config={
          configResult.ok
            ? configResult.data
            : {
                codePrefix: "CUS",
                codePadding: 6,
                dedupThreshold: 0.85,
                minMarginPct: 15,
                quotationValidityDays: 30,
                vatPct: 7,
                quotationApprovalTypeCode: "DSC",
                staleOpportunityDays: 14,
                letterheadNameTh: null,
                letterheadNameEn: null,
                letterheadTaxId: null,
                letterheadBranch: null,
                letterheadAddress: null,
                letterheadPhone: null,
                letterheadEmail: null,
                letterheadWebsite: null,
                letterheadLogo: null,
                quotationTerms: null,
              }
        }
        docPrefix={
          session?.companies.find((c) => c.id === session.active_company_id)
            ?.doc_prefix ?? "CTD"
        }
      />
    </div>
  );
}
