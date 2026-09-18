"use client";

import { Avatar, Dropdown, Layout, Menu } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import type { MenuEntry } from "@/app/configs/menu";
import { CompanySwitcher } from "@/components/company-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { messages } from "@/lib/messages";

const { Header, Content, Footer, Sider } = Layout;

const currentYear = new Date().getFullYear();

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
    <Layout className="min-h-screen">
      <Sider breakpoint="lg" collapsedWidth="0">
        <div className="mb-2 flex h-15 w-full items-center justify-center ">
          <h1 className="text-xl font-bold">{messages.app.name}</h1>
        </div>

        <Menu
          // theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={items}
          onClick={({ key }) => {
            if (!key.startsWith("group:")) router.push(key);
          }}
        />
      </Sider>

      <Layout>
        <Header style={{ padding: 0 }} className="bg-white shadow-sm">
          <div className="mx-4 flex h-full items-center justify-between">
            <CompanySwitcher
              companies={user.companies}
              activeCompanyId={user.activeCompanyId}
            />
            <div className="flex items-center gap-3">
              {canReadNotifications && <NotificationBell />}
              <span className="text-sm text-gray-700">{user.displayName}</span>
              <Dropdown
                menu={{ items: avatarDropdownItems }}
                trigger={["click"]}
              >
                <Avatar className="cursor-pointer">
                  {user.displayName.charAt(0)}
                </Avatar>
              </Dropdown>
            </div>
          </div>
        </Header>

        <Content style={{ margin: "24px 16px 0" }}>
          <div style={{ padding: 24, minHeight: 360 }}>{children}</div>
        </Content>

        <Footer style={{ textAlign: "center" }}>
          {messages.app.name} ©{currentYear}
        </Footer>
      </Layout>
    </Layout>
  );
}
