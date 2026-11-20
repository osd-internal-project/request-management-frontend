import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { LineLinkCard } from "@/components/notifications/line-link-card";
import { getLineLink } from "@/lib/api/notifications";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * LINE ของฉัน — every signed-in user links their own LINE here, from the
 * avatar menu. Login only, no permission: the routes behind it are
 * `@Authenticated()` and act on the caller's own row.
 */
export default async function MyLinePage({
  searchParams,
}: {
  searchParams: Promise<{ line?: string }>;
}) {
  const [session, query, lineResult] = await Promise.all([
    getSession(),
    searchParams,
    getLineLink(),
  ]);
  const company = session?.companies.find(
    (item) => item.id === session.active_company_id,
  );
  const ml = messages.notifications.line;

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div>
        <Title level={4} className="mb-0!">
          {ml.pageTitle}
        </Title>
        <Text type="secondary" className="text-xs">
          {ml.pageSubtitle(company?.name ?? "")}
        </Text>
      </div>
      {lineResult.ok ? (
        <LineLinkCard status={lineResult.data} result={query.line ?? null} />
      ) : (
        <Text type="danger">{lineResult.error.message}</Text>
      )}
    </div>
  );
}
