import { redirect } from "next/navigation";
import { MarkupList } from "@/components/pricing/markup-list";
import { getMarkupRules } from "@/lib/api/pricing";
import { HOME_PATH } from "@/lib/routes";
import { can, canAny, getSession } from "@/lib/session";

/** CD-200 — กำหนด Markup. */
export default async function MarkupPage() {
  const session = await getSession();
  if (!canAny(session, ["pricing.price.read", "pricing.price.manage"])) {
    redirect(HOME_PATH);
  }
  const result = await getMarkupRules();
  return (
    <MarkupList
      rows={result.ok ? result.data : []}
      canManage={can(session, "pricing.price.manage")}
    />
  );
}
