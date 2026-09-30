import Link from "next/link";
import { Alert, Card, Empty, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { getMySignatures } from "@/lib/api/esign";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.esign.mine;

/** CD-14 — what waits for me to sign (anyone signed in). */
export default async function MySignaturesPage() {
  const result = await getMySignatures();
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Title level={4} className="mb-1!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>
      {!result.ok ? (
        <Alert type="error" showIcon title={messages.common.loadError} />
      ) : result.data.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      ) : (
        result.data.map((row) => (
          <Card key={row.signerId} size="small">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{row.title}</div>
                <Text type="secondary" className="text-xs">
                  {messages.esign.sign.role(row.role)} ·{" "}
                  {messages.esign.public.expiresAt(
                    new Date(row.expiresAt).toLocaleDateString("th-TH", {
                      timeZone: "Asia/Bangkok",
                    }),
                  )}
                </Text>
              </div>
              {row.turn.may ? (
                <Link href={ROUTES.esignSign(row.signerId)}>{m.open}</Link>
              ) : (
                <Tag>{m.waiting(row.turn.waitingFor)}</Tag>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
