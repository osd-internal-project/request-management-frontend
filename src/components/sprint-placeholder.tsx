import { Card, Empty, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Paragraph from "antd/es/typography/Paragraph";
import { messages } from "@/lib/messages";

/**
 * A screen whose route, permission, and place in the navigation are settled,
 * but whose contents ship in a later sprint.
 *
 * Naming the sprint and requirement code makes the gap legible: this is a
 * scheduled screen, not a broken one.
 */
export function SprintPlaceholder({
  title,
  sprint,
  requirement,
  description,
}: {
  title: string;
  sprint: string;
  requirement: string;
  description?: string;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <Title level={4} className="mb-0!">
          {title}
        </Title>
        <Tag color="blue">{sprint}</Tag>
        <Tag>{requirement}</Tag>
      </div>

      <Empty
        description={
          <div>
            <Paragraph className="mb-1!">
              {messages.placeholder.comingSoon}
            </Paragraph>
            <Paragraph type="secondary" className="mb-0! text-xs">
              {description ??
                messages.placeholder.sprintNote(sprint, requirement)}
            </Paragraph>
          </div>
        }
      />
    </Card>
  );
}
