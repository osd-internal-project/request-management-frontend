import { PortalEnter } from "@/components/service/portal";

type Props = { params: Promise<{ token: string }> };

/** CD-249 — the invite link: opens a portal session, then the portal. */
export default async function PortalEnterPage({ params }: Props) {
  const { token } = await params;
  return <PortalEnter invite={token} />;
}
