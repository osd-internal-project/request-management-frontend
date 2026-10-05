import { redirect } from "next/navigation";
import { Surveys } from "@/components/service/surveys";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-248 — satisfaction after service jobs (`service.asset.read`). */
export default async function ServiceSurveysPage() {
  const session = await getSession();
  if (!can(session, "service.asset.read")) redirect(HOME_PATH);
  return <Surveys />;
}
