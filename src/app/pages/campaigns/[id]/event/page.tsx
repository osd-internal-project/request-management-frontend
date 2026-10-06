import { redirect } from "next/navigation";
import { EventRegistrationsView } from "@/components/crm/campaigns/event-registrations";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * CD-270 — an event's registrants: the check-in list on the day and the
 * follow-up after. Registrants' phones and e-mails are for campaign managers.
 */
export default async function EventRegistrationsPage({ params }: Params) {
  const session = await getSession();
  if (!can(session, "crm.campaign.manage")) redirect(HOME_PATH);
  const { id } = await params;
  return <EventRegistrationsView campaignId={id} />;
}
