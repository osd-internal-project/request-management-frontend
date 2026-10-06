import { PortalHome } from "@/components/service/portal";

/**
 * CD-249 — the Customer Portal (a session from an invite link).
 * CD-281 — `?article=<id>` opens that article (AI CARE links its sources here).
 */
export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ article?: string }>;
}) {
  const { article } = await searchParams;
  return <PortalHome articleId={article} />;
}
