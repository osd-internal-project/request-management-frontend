import { redirect } from "next/navigation";
import { LineSettingsAdmin } from "@/components/admin/line-settings-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

/** LINE ของบริษัท — LINE Login channel ที่พนักงานใช้ผูก LINE (`admin.integration.manage`). */
export default async function AdminLineSettingsPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.lineSettings.title} subtitle={messages.lineSettings.subtitle} />

      <LineSettingsAdmin />
    </div>
  );
}
