"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Collapse, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  PlayCircleOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import type { SalesAutomationStatus } from "@/lib/api/sales";
import { messages } from "@/lib/messages";

const ma = messages.sales.leads.detail.automation;

function when(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * งานขายอัตโนมัติ (11 พ.ย. 2569) — tells the salesperson, on the Lead and the
 * deal page, why the sales workflow stopped or will not start: the refusals
 * OSD Workflow actually got (with how to fix each), then what every step
 * needs. Hidden when the company has no sales trigger at all.
 *
 * 13 พ.ย. 2569 — a step whose needs are all met gets "เริ่ม": the run that
 * stopped is over and nothing restarts it, so the person does, once the data
 * is fixed. The backend decides whether it may (`can_start`).
 */
export function SalesAutomationCard({
  status,
  target,
  canStart = false,
}: {
  readonly status: SalesAutomationStatus | null;
  /** the page's record — where "เริ่ม" posts to */
  readonly target: { kind: "leads" | "opportunities"; id: string };
  readonly canStart?: boolean;
}) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [starting, setStarting] = useState<string | null>(null);

  if (!status?.in_use) return null;

  async function start(stepKey: string) {
    setStarting(stepKey);
    const result = await appApi(
      `${target.kind}/${target.id}/sales-automation/${stepKey}/start`,
      { method: "POST" },
    );
    setStarting(null);
    if (!result.ok) return void message.error(result.message);
    void message.success(ma.startQueued);
    router.refresh();
  }

  function confirmStart(step: { key: string; label: string }) {
    modal.confirm({
      title: (
        <span className="whitespace-pre-line">
          {ma.startConfirmTitle(step.label)}
        </span>
      ),
      content: ma.startConfirmBody,
      okText: ma.start,
      onOk: () => start(step.key),
    });
  }

  const startable = canStart && status.steps.some((step) => step.can_start);

  const failing = status.steps.flatMap((step) =>
    step.checks.filter((check) => !check.ok).map((check) => ({ step, check })),
  );

  const checklist = (
    <div className="flex flex-col gap-3">
      {status.steps.map((step) => (
        <div key={step.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Text strong className="text-sm">
              {step.ok ? (
                <CheckCircleFilled className="mr-1 text-green-600!" />
              ) : (
                <CloseCircleFilled className="mr-1 text-red-500!" />
              )}
              {step.label}
            </Text>
            {canStart && step.can_start && (
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                loading={starting === step.key}
                disabled={starting !== null && starting !== step.key}
                onClick={() => confirmStart(step)}
              >
                {ma.start}
              </Button>
            )}
          </div>
          {step.start_note && (
            <Text type="secondary" className="pl-5 text-xs">
              {step.start_note}
            </Text>
          )}
          {step.checks.map((check) => (
            <div key={check.key} className="flex gap-2 pl-5 text-xs">
              <span className={check.ok ? "text-green-600" : "text-red-500"}>
                {check.ok ? "✓" : "✗"}
              </span>
              <span>
                {check.label}
                {check.detail && (
                  <Text type="secondary" className="text-xs">
                    {" "}
                    — {check.detail}
                  </Text>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <Card
      size="small"
      title={
        <span>
          <RobotOutlined className="mr-1" />
          {ma.title}
        </span>
      }
      extra={
        status.ok ? (
          <Tag color="green">{ma.ready}</Tag>
        ) : (
          <Tag color="red">{ma.blocked}</Tag>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {!status.ok && (
          <Alert
            type="error"
            showIcon
            title={ma.blocked}
            description={
              <div className="flex flex-col gap-2">
                {status.issues.map((issue) => (
                  <div key={issue.id}>
                    <Text strong className="text-sm">
                      {ma.actions[issue.action] ?? issue.action}
                    </Text>{" "}
                    <Text type="secondary" className="text-xs">
                      {ma.stopped(when(issue.occurred_at))}
                    </Text>
                    <div className="text-sm">{issue.message}</div>
                    {issue.hint && (
                      <div className="text-sm">
                        {ma.howToFix}: {issue.hint}
                      </div>
                    )}
                  </div>
                ))}
                {failing.map(({ step, check }) => (
                  <div key={`${step.key}.${check.key}`} className="text-sm">
                    • {step.label}: {check.label}
                    {check.detail ? ` — ${check.detail}` : ""}
                  </div>
                ))}
                <Text type="secondary" className="text-xs">
                  {ma.blockedHint}
                </Text>
              </div>
            }
          />
        )}
        {startable && (
          <Text type="secondary" className="text-xs">
            {ma.startableHint}
          </Text>
        )}
        <Collapse
          ghost
          size="small"
          defaultActiveKey={startable ? ["steps"] : []}
          items={[{ key: "steps", label: ma.details, children: checklist }]}
        />
      </div>
    </Card>
  );
}
