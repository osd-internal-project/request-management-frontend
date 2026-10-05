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
import { MenuOutlined } from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { MenuEntry } from "@/app/configs/menu";
import { updateChatContext } from "@/components/layout/chat/chat-context";
import { ChatPanel } from "@/components/layout/chat/chat-panel";
import { ChatToggleButton } from "@/components/layout/chat/chat-toggle-button";
import {
  signOutChatWidget,
  type ChatWidgetConfig,
} from "@/components/layout/chat/librechat-widget";
import { useChatDock } from "@/components/layout/chat/use-chat-dock";
import { MenuIcon } from "@/components/layout/nav-icons";
import { NavRail } from "@/components/layout/nav-rail";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";

const { Header, Content, Footer, Sider } = Layout;

const currentYear = new Date().getFullYear();

const LOGOUT_ROUTE = "/api/auth/logout";

function toMenuItem(entry: MenuEntry) {
  return {
    key: entry.href,
    label: entry.label,
    icon: <MenuIcon name={entry.icon} />,
  };
}

/** The entry whose href is the longest prefix of `pathname`, so a detail page maps to its list. */
function menuEntryFor(pathname: string, menus: readonly MenuEntry[]) {
  let best: MenuEntry | null = null;
  for (const entry of menus) {
    // Home is the prefix of every route, so it only ever matches itself.
    const matches =
      pathname === entry.href ||
      (entry.href !== HOME_PATH && pathname.startsWith(`${entry.href}/`));
    if (matches && entry.href.length > (best?.href.length ?? -1)) best = entry;
  }
  return best;
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
  chatWidget,
  children,
}: {
  user: ShellUser;
  menus: MenuEntry[];
  /** SUP-03 — no bell (and no polling) for someone who cannot read the inbox. */
  canReadNotifications: boolean;
  /** Null when the LibreChat env is unset — the panel says so instead. */
  chatWidget: ChatWidgetConfig | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const [navOpen, setNavOpen] = useState(false);
  const chat = useChatDock();

  useEffect(() => {
    const entry = menuEntryFor(pathname, menus);
    const title = entry?.label ?? pathname;
    const lines = [
      messages.chat.context.page(title),
      entry?.group ? messages.chat.context.group(entry.group) : null,
      messages.chat.context.url(pathname),
    ];
    updateChatContext(
      {
        id: entry?.href ?? pathname,
        type: "page",
        title,
        content: lines.filter((line) => line !== null).join("\n"),
      },
      "page",
    );
  }, [pathname, menus]);

  // Below `lg` the Sider is already collapsed — two panes would leave neither
  // usable, so the panel covers the screen instead.
  const isDesktop = !!screens.lg;

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
      ...ungrouped.map(toMenuItem),
      ...[...groups.entries()].map(([group, entries]) => ({
        key: `group:${group}`,
        type: "group" as const,
        label: group,
        children: entries.map(toMenuItem),
      })),
    ];
  }, [menus]);

  // One menu, shown in the Sider on desktop and in a drawer below `lg`.
  const navMenu = (
    <Menu
      // min-h-0: a flex item defaults to min-height:auto, which would let a
      // long menu stretch the Sider instead of scrolling.
      className="min-h-0 flex-1 overflow-y-auto"
      mode="inline"
      selectedKeys={[pathname]}
      items={items}
      onClick={({ key }) => {
        if (key.startsWith("group:")) return;
        setNavOpen(false);
        router.push(key);
      }}
    />
  );

  async function onLogoutClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Revoke the chat widget's session first; the navigation would cut its iframe off.
    event.preventDefault();
    await signOutChatWidget();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a route handler, must leave the SPA (AUTH-03)
    window.location.href = LOGOUT_ROUTE;
  }

  const avatarDropdownItems = [
    {
      key: "logout",
      label: (
        // A plain link, not a fetch: logout has to leave the SPA and pass
        // through Keycloak's end-session endpoint (AUTH-03).
        <a
          href={LOGOUT_ROUTE}
          className="text-red-500"
          onClick={onLogoutClick}
        >
          {messages.nav.logout}
        </a>
      ),
    },
  ];

  const isExpanded = isDesktop && chat.mode === "expanded";

  function onRailNavigate(href: string) {
    // Leave the full-width chat so the page just opened is actually visible.
    chat.dock();
    router.push(href);
  }

  const chatPanel = (
    <ChatPanel
      widget={chatWidget}
      mode={chat.mode}
      canExpand={isDesktop}
      onClose={chat.close}
      onExpand={chat.expand}
      onDock={chat.dock}
    />
  );

  return (
    // The shell is exactly one viewport tall; scrolling belongs to the menu
    // and the content, never to the page.
    // `hasSider`: antd only detects a real <Sider> child, and NavRail is not one.
    <Layout hasSider className="h-screen overflow-hidden">
      {/* Hidden by CSS below `lg` rather than by `useBreakpoint`, which the
          server cannot know — a JS switch would flash the layout on hydration. */}
      {isExpanded ? (
        <NavRail
          className="max-lg:hidden!"
          menus={menus}
          pathname={pathname}
          onNavigate={onRailNavigate}
        />
      ) : (
        <Sider
          className="max-lg:hidden!"
          classNames={{ body: "flex h-full flex-col" }}
        >
          <div className="flex h-16 w-full shrink-0 items-center justify-center">
            <h1 className="text-xl font-bold">{messages.app.name}</h1>
          </div>

          {navMenu}
        </Sider>
      )}

      <Drawer
        open={navOpen}
        placement="left"
        size={280}
        title={messages.app.name}
        styles={{ body: { padding: 0, display: "flex", flexDirection: "column" } }}
        onClose={() => setNavOpen(false)}
      >
        {navMenu}
      </Drawer>

      {/* min-w-0 keeps a wide table from pushing the Sider off-screen. */}
      <Layout className="min-w-0 flex-1">
        {/* Spans content and chat, so the chat button stays put in every mode. */}
        <Header
          style={{ padding: 0 }}
          className="z-10 shrink-0 bg-white shadow-sm"
        >
          <div className="mx-3 flex h-full items-center justify-between gap-2 md:mx-4">
            <Button
              type="text"
              className="lg:hidden!"
              icon={<MenuOutlined />}
              aria-label={messages.nav.openMenu}
              onClick={() => setNavOpen(true)}
            />
            <CompanySwitcher
              companies={user.companies}
              activeCompanyId={user.activeCompanyId}
            />
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              {canReadNotifications && <NotificationBell />}
              <span className="text-sm text-gray-700 max-md:hidden">
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
              <ChatToggleButton open={chat.isOpen} onClick={chat.toggle} />
            </div>
          </div>
        </Header>

        {/* Both panels always render: swapping the tree on toggle would remount
            `children` (losing form state) and the widget (losing the conversation). */}
        <Splitter
          className="min-h-0 flex-1"
          classNames={{ dragger: chat.isOpen ? undefined : "hidden!" }}
          {...chat.splitter}
        >
          <Splitter.Panel className="relative overflow-hidden!">
            {/* The app's only scroll region: viewport height minus the header. */}
            <Content className="h-full overflow-y-auto">
              <div className="p-3 md:p-6">{children}</div>

              <Footer className="text-center">
                {messages.app.name} ©{currentYear}
              </Footer>
            </Content>

            {chat.isSnapPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 p-4 text-center font-medium text-[var(--app-text-muted)]">
                {messages.chat.snapHint}
              </div>
            )}
          </Splitter.Panel>

          <Splitter.Panel {...chat.chatPanel}>
            {chat.hasOpened && isDesktop && chatPanel}
          </Splitter.Panel>
        </Splitter>
      </Layout>

      <Drawer
        open={chat.isOpen && !isDesktop}
        placement="right"
        size="100%"
        closable={false}
        styles={{ body: { padding: 0 } }}
        onClose={chat.close}
      >
        {chat.hasOpened && !isDesktop && chatPanel}
      </Drawer>
    </Layout>
  );
}
