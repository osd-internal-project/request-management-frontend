import { redirect } from "next/navigation";
import { AssetImport } from "@/components/service/asset-import";
import { ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-236 — the base that predates the system, from Excel (`service.asset.manage`). */
export default async function ServiceAssetImportPage() {
  const session = await getSession();
  if (!can(session, "service.asset.manage")) redirect(ROUTES.serviceAssets);
  return <AssetImport />;
}
