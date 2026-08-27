"use client";

import type { ReactNode } from "react";
import { Tabs } from "antd";
import { messages } from "@/lib/messages";
import type { OrgTabKey } from "@/lib/org-tabs";

/**
 * §16 — A3 and A4 are two tabs of one screen (`ผังทีมและสิทธิ์`), with Scope
 * Rules and Keycloak Mapping beside them.
 *
 * A client component because `Tabs` owns which tab is open, and because its
 * `items` array cannot be built on the server: antd accepts render callbacks
 * in places like this, and a function does not survive the server→client
 * boundary — the fault that took the bottleneck screen down before
 * (`bottleneck-table.tsx`).
 *
 * The panels themselves are passed in as already-rendered children, so each
 * one keeps fetching its own data the way it prefers and this file stays a
 * layout.
 */
export function OrgPermissionTabs({
  tree,
  roles,
  scope,
  keycloak,
  initialTab = "tree",
}: {
  readonly tree: ReactNode;
  readonly roles: ReactNode;
  readonly scope: ReactNode;
  readonly keycloak: ReactNode;
  /** From `?tab=` — lets an admin link straight to one tab. */
  readonly initialTab?: OrgTabKey;
}) {
  return (
    <Tabs
      defaultActiveKey={initialTab}
      items={[
        { key: "tree", label: messages.org.tabs.tree, children: tree },
        { key: "roles", label: messages.org.tabs.roles, children: roles },
        { key: "scope", label: messages.org.tabs.scope, children: scope },
        {
          key: "keycloak",
          label: messages.org.tabs.keycloak,
          children: keycloak,
        },
      ]}
    />
  );
}
