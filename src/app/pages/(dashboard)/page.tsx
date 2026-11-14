import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { MainMenu } from "@/components/layout/main-menu";
import { PendingAssignment } from "@/components/requests/pending-assignment";
import { loadMenus } from "@/lib/menus";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * The landing page after login: every menu entry this session may open.
 * The queue that used to live here is `ROUTES.myWork`.
 */
export default async function MainMenuPage() {
  const session = await getSession();
  // The layout already sent a missing session to SESSION_EXPIRED_PATH.
  const menus = session ? await loadMenus(session) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* AUTH-04: kept from the old landing page — the first thing an unplaced user must see. */}
      {session?.user.pending_org_assignment && <PendingAssignment />}
      <div>
        <Title level={3} className="mb-1!">
          {messages.mainMenu.title}
        </Title>
        <Text type="secondary">{messages.mainMenu.description}</Text>
      </div>
      <MainMenu menus={menus} />
    </div>
  );
}
