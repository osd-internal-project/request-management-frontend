import { redirect } from "next/navigation";
import { SoftphoneSettings } from "@/components/admin/softphone/softphone-settings";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";
import { PageHeader } from "@/components/admin/page-header";

const m = messages.softphone;

/** Each user's softphone extension (`admin.softphone.manage`). */
export default async function SoftphonePage() {
  const session = await getSession();
  if (!can(session, "admin.softphone.manage")) redirect(HOME_PATH);

  const users = await getAllDirectoryUsers();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <SoftphoneSettings
        users={(users.ok ? users.data : []).map((user) => ({
          id: user.id,
          name: user.displayName,
        }))}
      />
    </div>
  );
}
