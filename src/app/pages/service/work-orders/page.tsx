import { redirect } from "next/navigation";
import { WorkOrders } from "@/components/service/work-orders";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * CD-239 — service jobs (`service.asset.read`). `?customer=&label=&asset=`
 * opens the form for an asset (from the register).
 */
export default async function ServiceWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; label?: string; asset?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  const query = await searchParams;
  return (
    <WorkOrders
      canManage={can(session, "service.asset.manage")}
      start={
        query.customer
          ? {
              customerId: query.customer,
              customerLabel: query.label ?? query.customer,
              assetId: query.asset,
            }
          : undefined
      }
    />
  );
}
