import { redirect } from "next/navigation";
import { Alert, Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { ProcessLogView } from "@/components/admin/process-log-view";
import processLogs from "@/lib/api/process-logs";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** Only the filters the API accepts — anything else is dropped. */
function toQuery(params: Record<string, string | string[] | undefined>) {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    page: Number(single("page") ?? 1),
    page_size: 50,
    instance_id: single("instance_id"),
    stage_no: single("stage_no"),
    ref_no: single("ref_no"),
    status: single("status"),
    from: single("from"),
    to: single("to"),
  };
}

/**
 * บันทึกกระบวนการ End-to-End 7 ขั้น — OSD Workflow เขียนหนึ่งแถวต่อหนึ่ง
 * เหตุการณ์ หน้านี้อ่านอย่างเดียว (append-only เหมือน Audit Log).
 */
export default async function AdminProcessLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!can(session, "audit.read")) redirect(HOME_PATH);

  const query = toQuery(await searchParams);
  const [result, stages] = await Promise.all([
    processLogs.getProcessLogs(query),
    processLogs.getProcessStages(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.processLogs.title}
        </Title>
        <Text type="secondary">{messages.processLogs.subtitle}</Text>
      </div>

      {!result.ok ? (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={result.error.message}
        />
      ) : (
        <Card>
          <ProcessLogView
            rows={result.data.data}
            stages={stages.ok ? stages.data : []}
            page={result.data.page}
            pageSize={result.data.page_size}
            total={result.data.total}
          />
          <Paragraph type="secondary" className="mt-3 mb-0! text-xs">
            {messages.processLogs.appendOnly}
          </Paragraph>
        </Card>
      )}
    </div>
  );
}
