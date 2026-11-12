import { AuditScreen } from "@/components/admin/audit-screen";

/** SUP-04 — the active company's audit log (see `AuditScreen`). */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuditScreen params={await searchParams} />;
}
