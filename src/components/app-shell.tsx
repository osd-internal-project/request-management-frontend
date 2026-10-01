"use client";

import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  Splitter,
} from "antd";
import { MessageOutlined, MessageTwoTone } from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { MenuEntry } from "@/app/configs/menu";
import { ChatPanel } from "@/components/layout/chat-panel";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { messages } from "@/lib/messages";

const { Header, Content, Footer, Sider } = Layout;

const currentYear = new Date().getFullYear();

/** Only the width is remembered — see `readChatWidth`. */
const CHAT_WIDTH_KEY = "chat-panel-width";
const CHAT_WIDTH_DEFAULT = "33%";

/**
 * Whether the panel is open is deliberately *not* stored: the server renders
 * it closed, so a stored "open" would break hydration.
 */
function readChatWidth() {
  try {
    const stored = Number(window.localStorage.getItem(CHAT_WIDTH_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

function writeChatWidth(width: number) {
  try {
    window.localStorage.setItem(CHAT_WIDTH_KEY, String(Math.round(width)));
  } catch {
    // Private mode or blocked storage — the panel still works, it just forgets.
  }
}

export interface ShellCompany {
  id: string;
  name: string;
}

export interface ShellUser {
  displayName: string;
  companies: ShellCompany[];
  activeCompanyId: string | null;
}

/**
 * The authenticated shell. Menu entries arrive already filtered by the
 * server against the session's permissions (ROLE-06) — this component only
 * renders what it is given, so a client-side bug cannot reveal an entry the
 * backend would refuse anyway.
 */
export function AppShell({
  user,
  menus,
  canReadNotifications,
  children,
}: {
  user: ShellUser;
  menus: MenuEntry[];
  /** SUP-03 — no bell (and no polling) for someone who cannot read the inbox. */
  canReadNotifications: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState<number | null>(null);

  // Below `lg` the Sider is already collapsed — two panes would leave neither
  // usable, so the panel covers the screen instead.
  const isDesktop = !!screens.lg;

  function toggleChat() {
    // The stored width is read here rather than during render or on mount:
    // the server cannot read localStorage, and a differing first paint is a
    // hydration error.
    if (!chatOpen) setChatWidth(readChatWidth());
    setChatOpen(!chatOpen);
  }

  function onSplitterResizeEnd(sizes: number[]) {
    const panelWidth = sizes[1];
    if (panelWidth) writeChatWidth(panelWidth);
  }

  // Groups keep the "ผู้ดูแลระบบ" heading from the mockups without the menu
  // config needing to know about antd's item shape.
  const items = useMemo(() => {
    const ungrouped = menus.filter((entry) => !entry.group);
    const groups = new Map<string, MenuEntry[]>();

    for (const entry of menus.filter((candidate) => candidate.group)) {
      const bucket = groups.get(entry.group!) ?? [];
      bucket.push(entry);
      groups.set(entry.group!, bucket);
    }

    return [
      ...ungrouped.map((entry) => ({ key: entry.href, label: entry.label })),
      ...[...groups.entries()].map(([group, entries]) => ({
        key: `group:${group}`,
        type: "group" as const,
        label: group,
        children: entries.map((entry) => ({
          key: entry.href,
          label: entry.label,
        })),
      })),
    ];
  }, [menus]);

  const avatarDropdownItems = [
    {
      key: "logout",
      label: (
        // A plain link, not a fetch: logout has to leave the SPA and pass
        // through Keycloak's end-session endpoint (AUTH-03).
        <a href="/api/auth/logout" className="text-red-500">
          {messages.nav.logout}
        </a>
      ),
    },
  ];

  return (
    // The shell is exactly one viewport tall; scrolling belongs to the menu
    // and the content, never to the page.
    <Layout className="h-screen overflow-hidden">
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        classNames={{ body: "flex h-full flex-col" }}
      >
        <div className="flex h-16 w-full shrink-0 items-center justify-center">
          <h1 className="text-xl font-bold">{messages.app.name}</h1>
        </div>

        <Menu
          // min-h-0: a flex item defaults to min-height:auto, which would let a
          // long menu stretch the Sider instead of scrolling.
          className="min-h-0 flex-1 overflow-y-auto"
          mode="inline"
          selectedKeys={[pathname]}
          items={items}
          onClick={({ key }) => {
            if (!key.startsWith("group:")) router.push(key);
          }}
        />
      </Sider>

      {/* The Splitter renders even while the panel is closed: swapping the
          wrapper on toggle would move `children` in the React tree and remount
          the whole page, losing form state and scroll position. */}
      <Splitter className="min-w-0 flex-1" onResizeEnd={onSplitterResizeEnd}>
        <Splitter.Panel min="40%">
          {/* min-w-0 keeps a wide table from pushing the Sider off-screen. */}
          <Layout className="h-full min-w-0">
            <Header
              style={{ padding: 0 }}
              className="shrink-0 bg-white shadow-sm"
            >
              <div className="mx-4 flex h-full items-center justify-between">
                <CompanySwitcher
                  companies={user.companies}
                  activeCompanyId={user.activeCompanyId}
                />
                <div className="flex items-center gap-3">
                  {canReadNotifications && <NotificationBell />}
                  <span className="text-sm text-gray-700">
                    {user.displayName}
                  </span>
                  <Dropdown
                    menu={{ items: avatarDropdownItems }}
                    trigger={["click"]}
                  >
                    <Avatar className="cursor-pointer">
                      {user.displayName.charAt(0)}
                    </Avatar>
                  </Dropdown>
                  <Button
                    type="text"
                    // className="hidden"
                    // hidden={true}
                    icon={chatOpen ? <MessageTwoTone /> : <MessageOutlined />}
                    onClick={toggleChat}
                    aria-label={messages.chat.toggle}
                  />
                </div>
              </div>
            </Header>

            {/* The app's only scroll region: viewport height minus the header. */}
            <Content className="min-h-0 flex-1 overflow-y-auto">
              <div className="p-6">{children}</div>

              <Footer className="text-center">
                {messages.app.name} ©{currentYear}
              </Footer>
            </Content>
          </Layout>
        </Splitter.Panel>

        {chatOpen && isDesktop && (
          <Splitter.Panel
            defaultSize={chatWidth ?? CHAT_WIDTH_DEFAULT}
            min={320}
            max="60%"
          >
            <ChatPanel widget={null} onClose={() => setChatOpen(false)} />
          </Splitter.Panel>
        )}
      </Splitter>

      <Drawer
        open={chatOpen && !isDesktop}
        placement="right"
        size="100%"
        closable={false}
        styles={{ body: { padding: 0 } }}
        onClose={() => setChatOpen(false)}
      >
        <ChatPanel widget={null} onClose={() => setChatOpen(false)} />
      </Drawer>
    </Layout>
  );
}
