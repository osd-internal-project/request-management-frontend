import { Card } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import { KbSearch } from "@/components/kb/kb-search";

const m = messages.kb;

/** CD-259 — the knowledge base: search, read, write drafts (all staff). */
export default function KbPage() {
  return (
    <div className="space-y-3">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <Card>
        <KbSearch />
      </Card>
    </div>
  );
}
