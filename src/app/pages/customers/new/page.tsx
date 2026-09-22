import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import { CustomerForm } from "@/components/crm/customers/customer-form";
import customers from "@/lib/api/customers";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** ฟอร์มสร้างลูกค้า (CM-01/03) — inline dedup ก่อน submit. */
export default async function NewCustomerPage() {
  const session = await getSession();
  if (!can(session, "crm.customer.manage")) redirect(HOME_PATH);

  const optionsResult = await customers.getSegmentOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Title level={4} className="mb-0!">
        {messages.customers.form.createTitle}
      </Title>
      <CustomerForm
        mode="create"
        canOverride={can(session, "crm.customer.dedup.override")}
        segmentOptions={optionsResult.ok ? optionsResult.data : []}
      />
    </div>
  );
}
