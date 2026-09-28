"use client";

import { Alert, Modal } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import type { FlowDraft } from "./flow-draft";

const t = messages.requestTypes.flow;

/** Confirms a publish with what changes against the live version, and the server's refusals. */
export function PublishFlowDialog({
  open,
  nextVersion,
  draft,
  current,
  busy,
  errors,
  onCancel,
  onConfirm,
}: {
  readonly open: boolean;
  readonly nextVersion: number;
  readonly draft: FlowDraft;
  readonly current: FlowDraft;
  readonly busy: boolean;
  readonly errors: readonly { field: string; reason: string }[];
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const summary = summarise(current, draft);

  return (
    <Modal
      open={open}
      title={t.publishTitle(nextVersion)}
      okText={t.publish(nextVersion)}
      confirmLoading={busy}
      onCancel={onCancel}
      onOk={onConfirm}
    >
      <div className="space-y-3">
        <Alert type="info" showIcon title={t.publishNote} />

        <ul className="m-0 list-disc space-y-1 pl-5">
          {summary.length ? (
            summary.map((line) => <li key={line}>{line}</li>)
          ) : (
            <li>{t.summaryNone}</li>
          )}
        </ul>

        {errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            title={t.publishErrors}
            description={
              <ul className="m-0 list-disc pl-5">
                {errors.map((error, index) => (
                  <li key={`${error.field}-${index}`}>
                    <Text code>{error.field}</Text> {error.reason}
                  </li>
                ))}
              </ul>
            }
          />
        )}
      </div>
    </Modal>
  );
}

function summarise(current: FlowDraft, draft: FlowDraft): string[] {
  const before = new Map(current.steps.map((step) => [step.code, JSON.stringify(step)]));
  const after = new Map(draft.steps.map((step) => [step.code, JSON.stringify(step)]));

  const added = [...after.keys()].filter((code) => !before.has(code)).length;
  const removed = [...before.keys()].filter((code) => !after.has(code)).length;
  const changed = [...after.entries()].filter(
    ([code, value]) => before.has(code) && before.get(code) !== value,
  ).length;

  return [
    added ? t.summaryAdded(added) : null,
    removed ? t.summaryRemoved(removed) : null,
    changed ? t.summaryChanged(changed) : null,
  ].filter((line): line is string => line !== null);
}
