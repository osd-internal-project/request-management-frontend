import { redirect } from "next/navigation";
import { accessMenuItems } from "../configs/menu";
import { AppShell } from "@/components/app-shell";
import { LOGOUT_PATH } from "@/lib/routes";
import { getSession } from "@/lib/session";

/**
 * The authenticated shell.
 *
 * A server component so the session — and therefore the menu — is resolved
 * before anything renders: ROLE-06 has the frontend read permissions once
 * after login and compose navigation from them, rather than shipping the full
 * menu and hiding parts of it in the browser.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // A cookie exists (the proxy let this through) but the backend rejected the
  // token — expired, revoked, or the service was down.
  //
  // Redirecting straight to /login would loop forever: the proxy sees the
  // cookie, calls that "authenticated", and sends the browser back here. Going
  // through logout clears the cookies first, so the next request is genuinely
  // unauthenticated and /login renders.
  if (!session) redirect(`${LOGOUT_PATH}?reason=session_expired`);

  return (
    <AppShell
      user={{
        displayName: session.user.display_name,
        // `active_company_id` comes from the backend, not from the cookie: a
        // cookie the backend refused was already dropped in `getSession`, so
        // this is the company the page actually rendered for.
        activeCompanyId: session.active_company_id,
        companies: session.companies.map((company) => ({
          id: company.id,
          name: company.name,
        })),
      }}
      menus={accessMenuItems(session)}
    >
      {children}
    </AppShell>
  );
}
