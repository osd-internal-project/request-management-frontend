import { redirect } from "next/navigation";
import { AssetRegister } from "@/components/service/asset-register";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-236 — the installed base (`service.asset.read`). */
export default async function ServiceAssetsPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <AssetRegister canManage={can(session, "service.asset.manage")} />;
}
