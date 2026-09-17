import { redirect } from "next/navigation";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { ApiKeyAdmin } from "@/components/api-key-admin";
import { messages } from "@/lib/messages";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * กุญแจ API ของช่องทางภายนอก (`admin.integration.manage`).
 *
 * สิทธิ์ `integration.*` ถูกออกให้กุญแจที่นี่ — หน้า Role ยังแสดงมันในฐานะ
 * `type: 'service'` เพื่อให้เห็นว่าระบบมีสิทธิ์อะไรบ้าง แต่ทางปกติคือหน้านี้
 */
export default async function AdminApiKeysPage() {
  const session = await getSession();
  if (!can(session, "admin.integration.manage")) redirect(HOME_PATH);

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.apiKeys.title}
        </Title>
        <Text type="secondary" className="text-xs">
          {messages.apiKeys.subtitle}
        </Text>
      </div>

      <ApiKeyAdmin />
    </div>
  );
}
