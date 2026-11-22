import type { ReactNode } from "react";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";

/** The one heading every admin/system page opens with, so title and hint sizes cannot drift. */
export function PageHeader({
  title,
  subtitle,
  extra,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Page-level actions, right-aligned. */
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Title level={4} className="mb-0!">
          {title}
        </Title>
        {subtitle && (
          <Text type="secondary" className="text-xs">
            {subtitle}
          </Text>
        )}
      </div>
      {extra}
    </div>
  );
}
