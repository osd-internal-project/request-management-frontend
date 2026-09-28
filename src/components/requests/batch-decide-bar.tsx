"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Modal, Space } from "antd";
import Text from "antd/es/typography/Text";
import { CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import { batchDecide, type BatchDecideResult } from "@/lib/api/client-requests";
import type { RequestRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ReasonDialog } from "@/components/requests/reason-dialog";

const t = messages.myWork.batch;

/** The backend's per-request limit on one batch — see `BatchDecideDto`. */
export const BATCH_LIMIT = 50;

/**
 * Approve or reject the selected rows with one note, then show each outcome:
 * a batch is one transaction per case, so some can fail while the rest land.
 */
export function BatchDecideBar({
  rows,
  onClear,
}: {
  readonly rows: readonly RequestRow[];
  readonly onClear: () => void;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [asking, setAsking] = useState<"approve" | "reject" | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BatchDecideResult[] | null>(null);
  // Snapshotted at decision time: the selection is cleared once the batch lands.
  const [numberOf, setNumberOf] = useState<ReadonlyMap<string, string>>(new Map());

  async function decide(note: string): Promise<boolean> {
    if (!asking) return false;
    setNumberOf(
      new Map(rows.map((row) => [row.approvalCases?.[0]?.id ?? "", row.requestNo ?? row.id])),
    );
    setBusy(true);
    const result = await batchDecide({
      caseIds: rows.map((row) => row.approvalCases?.[0]?.id ?? "").filter(Boolean),
      decision: asking,
      note,
    });
    setBusy(false);

    if (!result.ok) {
      void message.error(result.message);
      return false;
    }

    setAsking(null);
    setResults(result.data.results);
    onClear();
    router.refresh();
    return true;
  }

  const okCount = results?.filter((entry) => entry.ok).length ?? 0;

  return (
    <>
      {rows.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#2F6FED0d] p-2 max-md:sticky max-md:top-0 max-md:z-10">
          <Text strong>{t.selected(rows.length)}</Text>
          {rows.length >= BATCH_LIMIT && (
            <Text type="secondary" className="text-xs">
              {t.limit}
            </Text>
          )}
          <span className="flex-1" />
          <Space wrap>
            <Button type="primary" onClick={() => setAsking("approve")}>
              {t.approve(rows.length)}
            </Button>
            <Button danger onClick={() => setAsking("reject")}>
              {t.reject(rows.length)}
            </Button>
            <Button type="text" onClick={onClear}>
              {t.clear}
            </Button>
          </Space>
        </div>
      )}

      <ReasonDialog
        action={asking}
        busy={busy}
        reasons={[]}
        returnToRequester={false}
        onCancel={() => setAsking(null)}
        onConfirm={(note) => decide(note)}
      />

      <Modal
        open={results !== null}
        title={t.resultTitle}
        footer={null}
        onCancel={() => setResults(null)}
      >
        {results && (
          <div className="space-y-2">
            <Text>{t.resultSummary(okCount, results.length - okCount)}</Text>
            <ul className="m-0 list-none space-y-1 p-0">
              {results.map((entry) => (
                <li key={entry.case_id} className="flex items-start gap-2">
                  {entry.ok ? (
                    <CheckCircleTwoTone twoToneColor="#52c41a" />
                  ) : (
                    <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                  )}
                  <span>
                    <Text strong>{numberOf.get(entry.case_id) ?? entry.case_id}</Text>
                    {entry.error && (
                      <Text type="danger" className="block text-xs">
                        {entry.error.message}
                      </Text>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}
