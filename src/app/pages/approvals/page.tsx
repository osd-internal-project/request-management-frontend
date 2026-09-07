import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { LedWork } from "@/components/led-work";
import requests from "@/lib/api/requests";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/session";

/**
 * H2.3 — งานทั้งหมด.
 *
 * Replaces "รออนุมัติของฉัน", which asked a different question: that screen was
 * a queue of decisions. The queue moved to the `อนุมัติ` tab on the landing
 * page, beside the other three, which is where somebody looks for their own
 * work.
 *
 * Since 4 ก.ย. 2569 this lists **everything the viewer may open** — their own
 * requests, the groups they head, and the groups a scope grant reaches. It
 * listed only the last two before, which made it empty for most people with no
 * way to tell that from a failed load.
 */
export default async function AllWorkPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    type_code?: string;
    q?: string;
    overdue?: string;
  }>;
}) {
  const [session, query] = await Promise.all([getSession(), searchParams]);

  const filters = {
    status: query.status,
    typeCode: query.type_code,
    q: query.q,
    overdue: query.overdue === "true",
  };

  const [result, types] = await Promise.all([
    requests.getLedRequests({
      status: filters.status,
      type_code: filters.typeCode,
      q: filters.q,
      overdue: filters.overdue,
      page_size: 100,
    }),
    requests.getRequestTypes(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.allWork.title}
        </Title>
        <Text type="secondary">{messages.allWork.subtitle}</Text>
      </div>

      {result.ok ? (
        <LedWork
          rows={result.data.data}
          types={types.ok ? types.data : []}
          filters={filters}
          /*
            An empty list is a real answer here, but "no work" and "you reach
            no groups" look identical on screen. The reason travels with the
            flag so the empty state can say which one it is.
          */
          leadsUnits={session?.leads_units ?? false}
          session={session}
        />
      ) : (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      )}
    </div>
  );
}
