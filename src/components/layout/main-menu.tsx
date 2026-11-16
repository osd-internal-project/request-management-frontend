import { Empty } from "antd";
import Link from "next/link";
import { GROUP_ICONS, type MenuEntry } from "@/app/configs/menu";
import { MenuIcon } from "@/components/layout/nav-icons";
import { messages } from "@/lib/messages";

/** Buckets in first-seen order, so the config's order decides the page's. */
function groupBy(entries: readonly MenuEntry[], keyOf: (e: MenuEntry) => string) {
  const buckets = new Map<string, MenuEntry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    buckets.set(key, [...(buckets.get(key) ?? []), entry]);
  }
  return [...buckets];
}

/** The main menu: every entry this session may open, one block per module. */
export function MainMenu({ menus }: { menus: readonly MenuEntry[] }) {
  if (menus.length === 0) return <Empty description={messages.mainMenu.empty} />;

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groupBy(menus, (e) => e.group).map(([group, entries]) => (
        <section
          key={group}
          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]"
        >
          <h2 className="m-0 flex items-center gap-2 border-b border-[var(--app-border-soft)] px-4 py-2.5 text-[15px] font-semibold text-[var(--app-text)]">
            <span className="text-[var(--app-primary)]">
              <MenuIcon name={GROUP_ICONS[group]} />
            </span>
            {group}
          </h2>
          <div className="p-2">
            {groupBy(entries, (e) => e.section ?? "").map(([section, items]) => (
              <div key={section}>
                {section && (
                  <div className="px-2 pt-2 pb-1 text-xs font-medium text-[var(--app-text-muted)]">
                    {section}
                  </div>
                )}
                <ul className="m-0 list-none p-0">
                  {items.map((entry) => (
                    <li key={entry.href}>
                      <Link
                        href={entry.href}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[var(--app-text)] hover:bg-[var(--app-primary-pale)] hover:text-[var(--app-primary)] focus-visible:outline-2 focus-visible:outline-[var(--app-primary)]"
                      >
                        <span className="text-[var(--app-text-secondary)]">
                          <MenuIcon name={entry.icon} />
                        </span>
                        {entry.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
