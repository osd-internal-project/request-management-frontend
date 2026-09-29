import { redirect } from "next/navigation";
import { Alert } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { MyObligations } from "@/components/legal/my-obligations";
import { getMyObligations } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

const m = messages.contracts.obligations;

/** CD-163 — ข้อผูกพันของฉัน (anyone may be handed one: `notification.read`). */
export default async function MyObligationsPage() {
  const session = await getSession();
  if (!can(session, "notification.read")) redirect(HOME_PATH);
  const result = await getMyObligations();
  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {m.mineTitle}
        </Title>
        <Text type="secondary">{m.mineSubtitle}</Text>
      </div>
      {result.ok ? (
        <MyObligations rows={result.data} />
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
