import { notFound, redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import { CustomerForm } from "@/components/crm/customers/customer-form";
import customers from "@/lib/api/customers";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * แก้ไขข้อมูลหลักของลูกค้า (CM-01) — ที่อยู่ ผู้ติดต่อ และกลุ่มแก้จากแท็บใน
 * หน้ารายละเอียด; ฟอร์มนี้แก้เฉพาะ identity fields ซึ่งเดินผ่าน dedup ซ้ำ
 * เมื่อชื่อ/เลขภาษีเปลี่ยน (CM-03).
 */
export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!can(session, "crm.customer.manage")) redirect(HOME_PATH);

  const { id } = await params;
  const result = await customers.getCustomer(id);

  // SCOPE-03: the backend answers 404 for a customer outside the caller's
  // reach; render the same here rather than a broken form.
  if (!result.ok) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Title level={4} className="mb-0!">
        {messages.customers.form.editTitle} · {result.data.customerCode}
      </Title>
      <CustomerForm
        mode="edit"
        canOverride={can(session, "crm.customer.dedup.override")}
        segmentOptions={[]}
        initial={result.data}
      />
    </div>
  );
}
