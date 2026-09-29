"use client";

import { Tag, Tooltip } from "antd";
import { messages } from "@/lib/messages";
import type { HealthLevel, HealthSignal } from "@/lib/api/types";

const m = messages.keeper;

/** One line per signal, the worst first as the backend sends them. */
export function signalText(signal: HealthSignal): string {
  return m.signal[signal.code]?.(signal.values) ?? signal.code;
}

/** CD-86 — health as a tag; hover lists why. */
export function HealthTag({
  health,
}: {
  health: { level: HealthLevel; signals: HealthSignal[] };
}) {
  const tag = (
    <Tag color={m.healthColor[health.level]} className="mr-0!">
      {m.health[health.level]}
    </Tag>
  );
  if (!health.signals.length) return tag;
  return (
    <Tooltip
      title={
        <ul className="m-0 list-disc pl-4">
          {health.signals.map((signal) => (
            <li key={signal.code}>{signalText(signal)}</li>
          ))}
        </ul>
      }
    >
      {tag}
    </Tooltip>
  );
}
