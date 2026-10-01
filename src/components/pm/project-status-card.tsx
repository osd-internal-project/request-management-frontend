"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Popconfirm,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import type {
  StatusReportView,
  StatusReportsView,
  StatusSnapshot,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { HealthTag } from "./health-tag";

const m = messages.projects.statusReports;
const f = m.figures;
const pct = (value: number | null) => (value === null ? "—" : String(value));

/** The figures a snapshot holds, one line each. */
function Figures({ snapshot }: { readonly snapshot: StatusSnapshot }) {
  return (
    <div className="space-y-0.5 text-xs">
      <div>
        {f.progress(
          pct(snapshot.progress.workPct),
          pct(snapshot.progress.plannedPct),
        )}
      </div>
      <div>
        {f.milestones(
          snapshot.milestones.achieved,
          snapshot.milestones.total,
          snapshot.milestones.late.length,
        )}
      </div>
      <div>
        {f.risks(
          snapshot.risks.open,
          snapshot.risks.high,
          snapshot.risks.critical,
        )}
      </div>
      <div>{f.issues(snapshot.issues.open, snapshot.issues.overdue)}</div>
      {snapshot.budget && (
        <div>
          {f.budget(
            snapshot.budget.versionNo,
            formatAmount(snapshot.budget.total),
            snapshot.budget.growthPct
              ? String(snapshot.budget.growthPct)
              : null,
          )}
        </div>
      )}
      <div>
        {f.payments(
          formatAmount(snapshot.payments.received),
          formatAmount(snapshot.payments.outstanding),
          formatAmount(snapshot.payments.overdue),
        )}
      </div>
    </div>
  );
}

/** The manager's words in a report. */
function Words({ report }: { readonly report: StatusReportView }) {
  return (
    <div className="space-y-1 text-xs whitespace-pre-line">
      {report.accomplished && (
        <div>
          <Text strong className="text-xs">
            {m.accomplished}:
          </Text>{" "}
          {report.accomplished}
        </div>
      )}
      {report.nextSteps && (
        <div>
          <Text strong className="text-xs">
            {m.nextSteps}:
          </Text>{" "}
          {report.nextSteps}
        </div>
      )}
      {report.helpNeeded && (
        <div>
          <Text strong type="danger" className="text-xs">
            {m.helpNeeded}:
          </Text>{" "}
          {report.helpNeeded}
        </div>
      )}
    </div>
  );
}

/**
 * CD-192 — the project's health now, this week's status report (drafted by
 * the system, completed and sent by the manager), and the weeks before.
 */
export function ProjectStatusCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: StatusReportsView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const current = view.reports.find((row) => row.weekStart === view.thisWeek);
  const earlier = view.reports.filter((row) => row !== current);
  const [accomplished, setAccomplished] = useState(current?.accomplished ?? "");
  const [nextSteps, setNextSteps] = useState(current?.nextSteps ?? "");
  const [helpNeeded, setHelpNeeded] = useState(current?.helpNeeded ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/status-reports`;

  async function call(path: string, init: RequestInit, done: string) {
    setBusy(true);
    setError(null);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(done);
    router.refresh();
    return true;
  }

  const words = () =>
    JSON.stringify({
      accomplished,
      next_steps: nextSteps,
      help_needed: helpNeeded,
    });

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          <HealthTag health={view.live.health} />
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}

      <div className="mb-3">
        <Text strong className="text-sm">
          {m.live}
        </Text>
        <Figures snapshot={view.live} />
      </div>

      <div className="mb-3 rounded border border-gray-200 p-2">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Text strong className="text-sm">
            {m.week(dayjs(view.thisWeek).format("D MMM YY"))}
          </Text>
          {current && (
            <>
              <Tag
                color={current.status === "submitted" ? "success" : "default"}
              >
                {current.status === "submitted" ? m.submitted : m.draft}
              </Tag>
              <HealthTag
                health={{
                  level: current.healthLevel,
                  score: current.healthScore,
                  factors: current.snapshot.health.factors,
                }}
              />
            </>
          )}
        </div>
        {!current ? (
          view.canEdit ? (
            <Button
              size="small"
              type="primary"
              loading={busy}
              onClick={() => void call(base, { method: "POST" }, m.saved)}
            >
              {m.makeDraft}
            </Button>
          ) : (
            <Text type="secondary" className="text-xs">
              {m.noDraft}
            </Text>
          )
        ) : current.status === "submitted" || !view.canEdit ? (
          <>
            <Words report={current} />
            {current.submittedAt && (
              <Text type="secondary" className="block text-xs">
                {m.by(
                  current.submittedByName ?? "",
                  dayjs(current.submittedAt).format("D MMM YY HH:mm"),
                )}
              </Text>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs">
              {m.accomplished}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={accomplished}
                onChange={(event) => setAccomplished(event.target.value)}
              />
            </label>
            <label className="block text-xs">
              {m.nextSteps}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={nextSteps}
                onChange={(event) => setNextSteps(event.target.value)}
              />
            </label>
            <label className="block text-xs">
              {m.helpNeeded}
              <Input.TextArea
                rows={2}
                maxLength={4000}
                value={helpNeeded}
                onChange={(event) => setHelpNeeded(event.target.value)}
              />
            </label>
            <Space wrap>
              <Button
                size="small"
                loading={busy}
                onClick={() =>
                  void call(
                    `${base}/${current.id}`,
                    { method: "PATCH", body: words() },
                    m.saved,
                  )
                }
              >
                {m.save}
              </Button>
              <Button
                size="small"
                loading={busy}
                onClick={() => void call(base, { method: "POST" }, m.saved)}
              >
                {m.refresh}
              </Button>
              <Popconfirm
                title={m.submitConfirm}
                onConfirm={async () => {
                  // the words as typed go with the report
                  const saved = await appApi(`${base}/${current.id}`, {
                    method: "PATCH",
                    body: words(),
                  });
                  if (!saved.ok) {
                    setError(saved.message);
                    return;
                  }
                  await call(
                    `${base}/${current.id}/submit`,
                    { method: "POST" },
                    m.sent,
                  );
                }}
              >
                <Button size="small" type="primary" loading={busy}>
                  {m.submit}
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}
      </div>

      {earlier.length > 0 ? (
        <Collapse
          size="small"
          items={[
            {
              key: "history",
              label: m.history(earlier.length),
              children: (
                <div className="divide-y">
                  {earlier.map((report) => (
                    <div key={report.id} className="py-2">
                      <Space size={4} wrap>
                        <Text strong className="text-sm">
                          {m.week(dayjs(report.weekStart).format("D MMM YY"))}
                        </Text>
                        <Tag
                          color={
                            report.status === "submitted"
                              ? "success"
                              : "default"
                          }
                        >
                          {report.status === "submitted"
                            ? m.submitted
                            : m.draft}
                        </Tag>
                        <HealthTag
                          health={{
                            level: report.healthLevel,
                            score: report.healthScore,
                            factors: report.snapshot.health.factors,
                          }}
                        />
                      </Space>
                      <Words report={report} />
                      <Figures snapshot={report.snapshot} />
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      ) : (
        !current && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.noDraft} />
        )
      )}
    </Card>
  );
}
