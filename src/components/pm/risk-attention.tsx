"use client";

import Link from "next/link";
import { Card, Empty } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import type { RiskAttentionRow } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { RiskTags } from "./project-risks-card";

const m = messages.projects.risks;

/**
 * CD-183 — for the executives: every open high or critical risk with no
 * owner or plan, and every review past its day, across running projects.
 */
export function RiskAttention({ rows }: { readonly rows: RiskAttentionRow[] }) {
  return (
    <div className="space-y-3">
      <div>
        <Title level={4} className="mb-0!">
          {m.attention.title}
        </Title>
        <Text type="secondary">{m.attention.subtitle}</Text>
      </div>
      {rows.length ? (
        rows.map((row) => (
          <Card key={row.id} size="small">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={ROUTES.projectDetail(row.project.id)}>
                  {row.project.projectNo} · {row.project.name}
                </Link>
                <div className="font-medium">
                  {row.label} · {row.title}
                </div>
              </div>
              <div>
                <RiskTags risk={row} />
              </div>
            </div>
            <Text type="secondary" className="block text-xs">
              {m.owner}: {row.ownerName ?? m.noOwner} ·{" "}
              {m.attention.manager(row.project.managerName ?? "—")}
            </Text>
            <div className="text-xs whitespace-pre-line">
              {m.response}: {row.response ?? m.noResponse}
            </div>
          </Card>
        ))
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={m.attention.empty}
        />
      )}
    </div>
  );
}
