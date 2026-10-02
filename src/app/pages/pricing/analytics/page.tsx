import { redirect } from "next/navigation";
import { PricingAnalytics } from "@/components/pricing/pricing-analytics";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-208 — วิเคราะห์ราคาและกำไร (Pricing only: every figure is a margin). */
export default async function PricingAnalyticsPage() {
  const session = await getSession();
  if (!can(session, "pricing.price.read")) redirect(HOME_PATH);
  return <PricingAnalytics />;
}
