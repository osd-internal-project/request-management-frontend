import { redirect } from "next/navigation";
import { MailSettingsAdmin } from "@/components/admin/mail-settings-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

/** อีเมลงานขาย — mailbox + Microsoft Graph ต่อบริษัท (`admin.integration.manage`). */
export default async function AdminMailSettingsPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={messages.mailSettings.title} subtitle={messages.mailSettings.subtitle} />

      <MailSettingsAdmin />
    </div>
  );
}
