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
 * a queue of decisions, and this is a view of what the groups this person heads
 * are doing. The queue moved to the `อนุมัติ` tab on the landing page, beside
 * the other three, which is where somebody looks for their own work.
 *
 * Read-only. See `LedWork` for why there are no buttons on it.
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

      {/*
        Somebody who heads nothing gets an empty list from the backend, which is
        correct but silent. Said explicitly, because "no work" and "this screen
        is not for you" look identical otherwise.
      */}
      {!session?.leads_units && (
        <Alert type="info" showIcon title={messages.allWork.notALead} />
      )}

      {result.ok ? (
        <LedWork
          rows={result.data.data}
          types={types.ok ? types.data : []}
          filters={filters}
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
