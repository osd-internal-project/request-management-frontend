import { redirect } from "next/navigation";
import { PriceList } from "@/components/pricing/price-list";
import { getPrices, type PriceStatus } from "@/lib/api/pricing";
import { HOME_PATH } from "@/lib/routes";
import { can, canAny, getSession } from "@/lib/session";

const STATUSES: PriceStatus[] = ["current", "future", "expired"];

/** CD-194 — ราคามาตรฐาน. */
export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!canAny(session, ["pricing.price.read", "pricing.price.manage"])) {
    redirect(HOME_PATH);
  }
  const { q, status } = await searchParams;
  const picked = STATUSES.find((value) => value === status);
  const result = await getPrices({ q, status: picked });
  return (
    <PriceList
      rows={result.ok ? result.data : []}
      q={q ?? ""}
      status={picked ?? null}
      canManage={can(session, "pricing.price.manage")}
    />
  );
}
