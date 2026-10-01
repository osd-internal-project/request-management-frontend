"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Progress,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ProjectProgressView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.progress;

/**
 * CD-188 — progress worked out from what closed (work by working days,
 * milestones achieved) against where the plan says it should be; and the
 * figures people reported, each beside what the system computed then.
 */
export function ProjectProgressCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectProgressView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState<number | null>(view.work.pct);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const variance = view.planned.variance;

  async function save() {
    if (pct === null) return;
    setBusy(true);
    setError(null);
    const result = await appApi(`projects/${projectId}/progress`, {
      method: "POST",
      body: JSON.stringify({
        reported_pct: pct,
        reason: reason || undefined,
        note: note || undefined,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setOpen(false);
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={m.title}
      extra={
        view.canEdit ? (
          <Button
            size="small"
            onClick={() => {
              setPct(view.work.pct);
              setReason("");
              setNote("");
              setError(null);
              setOpen(true);
            }}
          >
            {m.report}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {view.work.total === 0 ? (
        <Text type="secondary">{m.noPlan}</Text>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Text className="text-xs">{m.work}</Text>
            <Progress percent={view.work.pct ?? 0} size="small" />
            <Text type="secondary" className="text-xs">
              {m.workCount(view.work.done, view.work.total)}
            </Text>
          </div>
          <div>
            <Text className="text-xs">{m.planned}</Text>
            <Progress
              percent={view.planned.pct ?? 0}
              size="small"
              strokeColor="#999"
            />
            {variance !== null && (
              <Text
                type={variance < 0 ? "danger" : "success"}
                className="text-xs"
              >
                {variance === 0
                  ? m.onPlan
                  : variance > 0
                    ? m.ahead(variance)
                    : m.behind(-variance)}
              </Text>
            )}
          </div>
          <div>
            <Text className="text-xs">{m.milestones}</Text>
            <Progress percent={view.milestones.pct ?? 0} size="small" />
            <Text type="secondary" className="text-xs">
              {m.milestoneCount(
                view.milestones.achieved,
                view.milestones.total,
              )}
            </Text>
          </div>
        </div>
      )}

      {view.reports.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <Text strong className="text-xs">
            {m.history}
          </Text>
          {view.reports.slice(0, 5).map((row) => (
            <div key={row.id} className="py-1 text-xs">
              <span>
                {dayjs(row.reportedAt).format("D MMM YY")} ·{" "}
                {row.reportedByName} · {m.row(row.reportedPct, row.computedPct)}
              </span>
              {row.reason && (
                <Text type="warning" className="block">
                  {row.reason}
                </Text>
              )}
              {row.note && (
                <Text type="secondary" className="block">
                  {row.note}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={m.reportTitle}
        onCancel={() => setOpen(false)}
        okText={m.save}
        cancelText={m.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        <div className="space-y-3">
          {error && <Alert type="error" showIcon title={error} />}
          <label className="block text-xs">
            {m.reported}
            <InputNumber
              className="w-full!"
              min={0}
              max={100}
              step={5}
              value={pct}
              onChange={(value) =>
                setPct(value === null ? null : Number(value))
              }
            />
          </label>
          <label className="block text-xs">
            {m.reason(view.threshold)}
            <Input.TextArea
              rows={2}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <label className="block text-xs">
            {m.note}
            <Input.TextArea
              rows={2}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
      </Modal>
    </Card>
  );
}
