import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PhoneWorkspacePanel } from "@/components/layout/phone/phone-workspace-panel";
import { messages } from "@/lib/messages";
import { HOME_PATH, SESSION_EXPIRED_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

export const metadata: Metadata = { title: messages.phone.title };

/**
 * D-Callcenter Workspace ในหน้าต่างของมันเอง (เปิดจากปุ่มโทรศัพท์บนเมนูซ้าย) —
 * นอก `/pages` จึงไม่มี app shell; ย้ายหน้าในแอปได้โดยสายไม่หลุด.
 */
export default async function PhonePage() {
  const session = await getSession();
  if (!session) redirect(SESSION_EXPIRED_PATH);
  if (!can(session, "phone.workspace.use")) redirect(HOME_PATH);
  return <PhoneWorkspacePanel open />;
}
