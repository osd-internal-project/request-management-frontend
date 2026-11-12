import { redirect } from "next/navigation";
import { ApiKeyAdmin } from "@/components/admin/api-key-admin";
import { HOME_PATH } from "@/lib/routes";
import { canSystem, getSession } from "@/lib/session";

/** P8 — keys no company owns; issuing one requires an expiry (the backend refuses without). */
export default async function SystemIntegrationsPage() {
  const session = await getSession();
  if (!canSystem(session, "system.integration.manage")) redirect(HOME_PATH);
  const base = process.env.EXTERNAL_API_PUBLIC_URL?.replace(/\/$/, "");
  return <ApiKeyAdmin scope="system" externalApiBase={base ? `${base}/api/v1` : null} />;
}
