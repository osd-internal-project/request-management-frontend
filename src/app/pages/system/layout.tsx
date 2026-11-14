import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { getSession } from "@/lib/session";

/**
 * Every /system page says which level it acts on — the one strip that marks
 * "changes here reach every company". Each page still checks its own right.
 */
export default async function SystemLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session?.system_permissions?.length) redirect(HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="note"
        className="rounded-md border-l-4 border-[var(--app-primary)] bg-[var(--app-primary-soft)] px-4 py-2 text-[var(--app-text)]"
      >
        {messages.system.banner}
      </div>
      {children}
    </div>
  );
}
