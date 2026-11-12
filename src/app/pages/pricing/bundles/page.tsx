import { redirect } from "next/navigation";
import { BundleList } from "@/components/pricing/bundle-list";
import { getProductBundles } from "@/lib/api/pricing";
import { HOME_PATH } from "@/lib/routes";
import { can, canAny, getSession } from "@/lib/session";

/** ชุดรายการของ product — which SAP items a product's quotation carries. */
export default async function ProductBundlesPage() {
  const session = await getSession();
  if (!canAny(session, ["pricing.price.read", "pricing.price.manage"])) {
    redirect(HOME_PATH);
  }
  const result = await getProductBundles();
  return (
    <BundleList
      rows={result.ok ? result.data : []}
      canManage={can(session, "pricing.price.manage")}
    />
  );
}
