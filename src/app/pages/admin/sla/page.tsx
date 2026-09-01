import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { WorkingHoursAdmin } from "@/components/working-hours-admin";
import slaApi from "@/lib/api/sla";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * SUP-01 — เวลาทำการและวันหยุด.
 *
 * Its own screen rather than a panel on A2 because it is a different
 * permission: A2 is `admin.request-type.manage` and this is
 * `admin.sla.manage`, so a panel there would show a form its viewer could not
 * save. A2 links here instead.
 *
 * One calendar per company, and the active company is the one edited — the
 * header switcher is how you reach another company's, the same as everywhere.
 */
export default async function SlaSettingsPage() {
  const [session, calendars] = await Promise.all([
    getSession(),
    slaApi.getHolidayCalendars(),
  ]);

  if (!calendars.ok) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={calendars.error.message}
      />
    );
  }

  const companyId = session?.active_company_id ?? "";
  const activeCompany = session?.companies.find(
    (company) => company.id === companyId,
  );

  // A company with no row has never had one set; the component shows the
  // defaults the backend would apply rather than an empty form.
  const calendar =
    calendars.data.find((entry) => entry.companyId === companyId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.slaAdmin.title}
        </Title>
        <Text type="secondary">{messages.slaAdmin.subtitle}</Text>
      </div>

      <WorkingHoursAdmin
        companyId={companyId}
        companyName={activeCompany?.name ?? ""}
        initial={calendar}
      />
    </div>
  );
}
