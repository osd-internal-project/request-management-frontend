"use client";

import { Menu, Select, Tooltip, type MenuProps } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useEffect, useMemo, useRef, useState } from "react";
import { GROUP_ICONS, type MenuEntry } from "@/app/configs/menu";
import { MenuIcon } from "@/components/layout/nav-icons";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";

/** The entry whose href is the longest prefix of `pathname`, so a detail page maps to its list. */
export function menuEntryFor(pathname: string, menus: readonly MenuEntry[]) {
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

/** Buckets in first-seen order, so the config's order decides the rail's. */
function bucketBy<K>(
  entries: readonly MenuEntry[],
  keyOf: (entry: MenuEntry) => K,
) {
  const buckets = new Map<K, MenuEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    buckets.set(key, [...(buckets.get(key) ?? []), entry]);
  }
  return buckets;
}

function toMenuItem(entry: MenuEntry) {
  return {
    key: entry.href,
    label: entry.label,
    icon: <MenuIcon name={entry.icon} />,
  };
}

/**
 * The menu as a rail of modules (`MenuEntry.group`) beside a panel listing the
 * chosen module's entries. The rail is dropped when the session sees only one module.
 */
export function ModuleNav({
  menus,
  pathname,
  onNavigate,
  shortcut = false,
}: {
  menus: MenuEntry[];
  pathname: string;
  onNavigate: (href: string) => void;
  /** Ctrl/⌘+K focuses the search. Only one mounted instance should take it. */
  shortcut?: boolean;
}) {
  const searchRef = useRef<RefSelectProps>(null);
  const modules = useMemo(
    () => bucketBy(menus, (entry) => entry.group),
    [menus],
  );
  const current = menuEntryFor(pathname, menus);

  // A module picked in the rail only lasts until the next navigation, then the
  // panel follows the page again.
  const [picked, setPicked] = useState<{
    pathname: string;
    group: string;
  } | null>(null);
  const activeGroup =
    (picked?.pathname === pathname ? picked.group : null) ??
    current?.group ??
    modules.keys().next().value;

  const panelItems = useMemo(() => {
    const sections = bucketBy(
      modules.get(activeGroup ?? "") ?? [],
      (entry) => entry.section,
    );
    return [...sections.entries()].flatMap(
      ([section, entries]): NonNullable<MenuProps["items"]> =>
        section === undefined
          ? entries.map(toMenuItem)
          : [
              {
                key: `section:${section}`,
                type: "group" as const,
                label: section,
                children: entries.map(toMenuItem),
              },
            ],
    );
  }, [modules, activeGroup]);

  const searchOptions = useMemo(
    () =>
      [...modules.entries()].map(([group, entries]) => ({
        label: group,
        title: group,
        options: entries.map((entry) => ({
          value: entry.href,
          label: entry.label,
        })),
      })),
    [modules],
  );

  useEffect(() => {
    if (!shortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  return (
    <div className="flex min-h-0 flex-1">
      {modules.size > 1 && (
        <nav className="flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-[var(--app-border-soft)] py-2">
          {[...modules.keys()].map((group) => {
            const active = group === activeGroup;
            return (
              <Tooltip key={group} title={group} placement="right">
                <button
                  type="button"
                  aria-label={group}
                  aria-pressed={active}
                  onClick={() => setPicked({ pathname, group })}
                  className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-lg ${
                    active
                      ? "bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                      : "text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-pale)]"
                  }`}
                >
                  <MenuIcon name={GROUP_ICONS[group]} />
                </button>
              </Tooltip>
            );
          })}
        </nav>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 px-3 pt-3 pb-2">
          <Select
            ref={searchRef}
            className="w-full"
            showSearch
            value={null}
            placeholder={messages.nav.searchMenu}
            options={searchOptions}
            notFoundContent={messages.nav.searchMenuEmpty}
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            onChange={(href: string) => onNavigate(href)}
          />
        </div>
        <div className="shrink-0 truncate px-4 pt-1 pb-1 text-xs font-semibold text-[var(--app-text-secondary)]">
          {activeGroup}
        </div>
        {/* min-h-0: a flex item defaults to min-height:auto, which would let a
            long menu stretch the Sider instead of scrolling. */}
        <Menu
          className="min-h-0 flex-1 overflow-y-auto border-e-0!"
          mode="inline"
          selectedKeys={current ? [current.href] : []}
          items={panelItems}
          onClick={({ key }) => onNavigate(key)}
        />
      </div>
    </div>
  );
}
