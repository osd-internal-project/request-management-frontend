import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { AgentRecordList } from "@/components/agent-records/agent-record-list";
import { getAgentRecords } from "@/lib/api/agent-records";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { canAny, getSession } from "@/lib/session";

const PAGE_SIZE = 20;
/** The `read` right of every action in the backend's `AGENT_ACTIONS`. */
const READ_PERMISSIONS = ["crm.sales.read"];

/** งานของ AI agent — เห็นเฉพาะ action ที่มีสิทธิ์ดู; backend กรองแถวให้. Gate-before-fetch. */
export default async function AgentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!canAny(session, READ_PERMISSIONS)) redirect(HOME_PATH);

  const query = await searchParams;
  const page = Number(query.page) || 1;
  const result = await getAgentRecords({
    status: query.status,
    page,
    page_size: PAGE_SIZE,
  });

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.agentRecords.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.agentRecords.subtitle}
        </Text>
      </div>
      {!result.ok && (
        <Alert type="error" showIcon title={messages.agentRecords.loadFailed} />
      )}
      <AgentRecordList
        rows={result.ok ? result.data.data : []}
        total={result.ok ? result.data.total : 0}
        page={page}
        pageSize={PAGE_SIZE}
        status={query.status}
      />
    </div>
  );
}
