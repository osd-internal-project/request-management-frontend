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
  searchParams: Promise<{ q?: string; status?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (!canAny(session, ["pricing.price.read", "pricing.price.manage"])) {
    redirect(HOME_PATH);
  }
  const { q, status, tab } = await searchParams;
  const picked = STATUSES.find((value) => value === status);
  // CD-197 — standard prices or special (customer / group / deal) prices.
  const special = tab === "special";
  const result = await getPrices({
    q,
    status: picked,
    scope: special ? "special" : "standard",
  });
  return (
    <PriceList
      rows={result.ok ? result.data : []}
      q={q ?? ""}
      status={picked ?? null}
      special={special}
      canManage={can(session, "pricing.price.manage")}
    />
  );
}
