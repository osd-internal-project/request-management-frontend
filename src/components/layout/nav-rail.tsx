"use client";

import { Tooltip } from "antd";
import type { MenuEntry } from "@/app/configs/menu";
import { MenuIcon } from "@/components/layout/nav-icons";

/**
 * The menu as a narrow column of icon + caption, shown while the chat is
 * expanded. Same entries and order as the full menu; groups become dividers.
 */
export function NavRail({
  className,
  menus,
  pathname,
  onNavigate,
}: {
  className?: string;
  menus: MenuEntry[];
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <nav
      className={`flex w-20 shrink-0 flex-col overflow-y-auto border-r border-[var(--app-border-soft)] bg-white py-2 ${className ?? ""}`}
    >
      {menus.map((entry, index) => {
        const startsGroup = index > 0 && entry.group !== menus[index - 1]?.group;
        const active = entry.href === pathname;

        return (
          <div key={entry.href}>
            {startsGroup && (
              <hr className="mx-3 my-2 border-[var(--app-border-soft)]" />
            )}
            <Tooltip title={entry.label} placement="right">
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(entry.href)}
                className={`mx-1 flex w-[calc(100%-0.5rem)] cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-2 text-lg ${
                  active
                    ? "bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
                    : "text-[var(--app-text-secondary)] hover:bg-[var(--app-primary-pale)]"
                }`}
              >
                <MenuIcon name={entry.icon} />
                <span className="line-clamp-2 text-center text-[11px] leading-tight">
                  {entry.label}
                </span>
              </button>
            </Tooltip>
          </div>
        );
      })}
    </nav>
  );
}
