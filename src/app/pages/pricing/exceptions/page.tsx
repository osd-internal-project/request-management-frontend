import { redirect } from "next/navigation";
import { PricingExceptionsRegister } from "@/components/pricing/pricing-exceptions-register";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-205 — ทะเบียนข้อยกเว้นด้านราคา. */
export default async function PricingExceptionsPage() {
  const session = await getSession();
  if (!can(session, "pricing.price.read")) redirect(HOME_PATH);
  return (
    <PricingExceptionsRegister
      canManage={can(session, "pricing.price.manage")}
    />
  );
}
