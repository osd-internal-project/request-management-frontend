"use client";

import { Alert, Card, Collapse, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  RobotOutlined,
} from "@ant-design/icons";
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
 */
export function SalesAutomationCard({
  status,
}: {
  readonly status: SalesAutomationStatus | null;
}) {
  if (!status?.in_use) return null;

  const failing = status.steps.flatMap((step) =>
    step.checks.filter((check) => !check.ok).map((check) => ({ step, check })),
  );

  const checklist = (
    <div className="flex flex-col gap-3">
      {status.steps.map((step) => (
        <div key={step.key} className="flex flex-col gap-1">
          <Text strong className="text-sm">
            {step.ok ? (
              <CheckCircleFilled className="mr-1 text-green-600!" />
            ) : (
              <CloseCircleFilled className="mr-1 text-red-500!" />
            )}
            {step.label}
          </Text>
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
        <Collapse
          ghost
          size="small"
          items={[{ key: "steps", label: ma.details, children: checklist }]}
        />
      </div>
    </Card>
  );
}
