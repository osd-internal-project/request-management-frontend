import { redirect } from "next/navigation";
import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { ServiceLaborCosts } from "@/components/hr/service-labor-costs";

const m = messages.hr.laborCosts;

/** This month so far, Bangkok time. */
function thisMonth() {
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/** CD-234 — ต้นทุนแรงงานงานบริการ (pay-derived: `hr.rate.read`). */
export default async function LaborCostsPage() {
  const session = await getSession();
  if (!can(session, "hr.rate.read")) redirect(HOME_PATH);
  const { from, to } = thisMonth();
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <Card>
        <ServiceLaborCosts from={from} to={to} />
      </Card>
    </div>
  );
}
