"use client";

import { useState } from "react";
import { Button, Card, Grid, Steps } from "antd";
import Text from "antd/es/typography/Text";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { RequestStepRun } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const t = messages.requestDetail.flow;

/**
 * The request's flow steps: passed, current, not yet reached. A branch that was
 * never taken stays "not yet", because only visited steps have a run.
 */
export function RequestStepper({
  steps,
  runs,
  currentStepCode,
  waitingApproval,
  assigneeName,
}: {
  readonly steps: readonly { code: string; name: string }[];
  readonly runs: readonly RequestStepRun[];
  readonly currentStepCode: string | null;
  readonly waitingApproval: boolean;
  readonly assigneeName: string | null;
}) {
  const screens = Grid.useBreakpoint();
  const [expanded, setExpanded] = useState(false);
  const visited = new Set(runs.map((run) => run.stepCode));
  const currentIndex = steps.findIndex((step) => step.code === currentStepCode);

  const items = steps.map((step) => {
    const isCurrent = step.code === currentStepCode;
    const status: "finish" | "process" | "wait" = isCurrent
      ? "process"
      : visited.has(step.code)
        ? "finish"
        : "wait";

    return {
      status,
      title: step.name,
      description: isCurrent
        ? [waitingApproval ? t.waitingApproval : t.stepNow, assigneeName]
            .filter(Boolean)
            .join(" · ")
        : status === "finish"
          ? t.stepDone
          : t.stepLater,
    };
  });

  if (!screens.md) {
    const current = steps[currentIndex];
    return (
      <Card size="small">
        <Button
          type="text"
          block
          className="flex! items-center justify-between px-0!"
          onClick={() => setExpanded((open) => !open)}
        >
          <Text strong>
            {current
              ? t.compact(currentIndex + 1, steps.length, current.name)
              : t.stepLater}
          </Text>
          {expanded ? <UpOutlined /> : <DownOutlined />}
        </Button>
        {expanded && (
          <Steps className="mt-3" orientation="vertical" size="small" items={items} />
        )}
      </Card>
    );
  }

  return (
    <Card size="small">
      <Steps size="small" items={items} />
    </Card>
  );
}
