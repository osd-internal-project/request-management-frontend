"use client";

import { Tag, Tooltip } from "antd";
import type { ProjectHealth } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.health;

/** CD-192 — green, amber or red with the score; the factors on hover. */
export function HealthTag({ health }: { readonly health: ProjectHealth }) {
  const factors = health.factors.length
    ? health.factors
        .map(
          (factor) => `${factor.label}: ${factor.detail} (+${factor.points})`,
        )
        .join("\n")
    : m.none;
  return (
    <Tooltip title={<span className="whitespace-pre-line">{factors}</span>}>
      <Tag color={m.color[health.level]}>
        {m.level[health.level]} · {m.score(health.score)}
      </Tag>
    </Tooltip>
  );
}
