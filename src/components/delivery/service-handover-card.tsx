"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { thaiDate } from "./delivery-types";
import {
  fill,
  HANDOVER_COLOR,
  HandoverPackageView,
  HandoverTrail,
  type HandoverPackage,
  type HandoverState,
} from "./handover-package";

const m = messages.delivery.handover;

interface Round {
  acceptanceId: string;
  label: string;
  decidedOn: string | null;
  package: HandoverPackage;
  handover: HandoverState | null;
}

interface View {
  canSend: boolean;
  rounds: Round[];
}

/**
 * CD-255 — after a round is accepted the delivery team hands the service
 * team its equipment, warranty, service terms, documents and contacts; the
 * service team acknowledges or asks back (answered by sending again).
 */
export function ServiceHandoverCard({ projectId }: { projectId: string }) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    view: View | null;
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Round | null>(null);
  const [sending, setSending] = useState<{ round: Round; note: string } | null>(
    null,
  );
  const base = `delivery/projects/${projectId}/handovers`;

  useEffect(() => {
    let live = true;
    void appApi<View>(base).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { view: result.data, error: null }
          : { view: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [base, version]);

  const view = loaded?.view ?? null;

  async function send() {
    if (!sending) return;
    setBusy(true);
    const result = await appApi<View>(
      `${base}/${sending.round.acceptanceId}/send`,
      {
        method: "POST",
        body: JSON.stringify({ note: sending.note.trim() || undefined }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.sent);
    setSending(null);
    setVersion((value) => value + 1);
  }

  return (
    <Card size="small" title={m.cardTitle}>
      <Text type="secondary" className="mb-2 block text-xs">
        {m.cardHint}
      </Text>
      {loaded?.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !view ? (
        <Skeleton active />
      ) : (
        <Table<Round>
          rowKey="acceptanceId"
          size="small"
          pagination={false}
          dataSource={view.rounds}
          locale={{ emptyText: m.none }}
          scroll={{ x: 720 }}
          columns={[
            { title: m.round, dataIndex: "label", width: 90 },
            {
              title: m.decidedOn,
              dataIndex: "decidedOn",
              width: 120,
              render: (v: string | null) => (v ? thaiDate(v) : "—"),
            },
            {
              title: m.status,
              key: "status",
              render: (_, row) => {
                const status = row.handover?.status ?? "none";
                return (
                  <Space orientation="vertical" size={2}>
                    <Tag color={HANDOVER_COLOR[status]}>
                      {m.statuses[status]}
                    </Tag>
                    {row.handover ? (
                      <HandoverTrail state={row.handover} />
                    ) : null}
                  </Space>
                );
              },
            },
            {
              key: "actions",
              width: 240,
              align: "right" as const,
              render: (_, row) => {
                const status = row.handover?.status;
                return (
                  <Space wrap>
                    <Button size="small" onClick={() => setViewing(row)}>
                      {m.view}
                    </Button>
                    {view.canSend && (!status || status === "questioned") ? (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => setSending({ round: row, note: "" })}
                      >
                        {status === "questioned" ? m.resend : m.send}
                      </Button>
                    ) : null}
                  </Space>
                );
              },
            },
          ]}
        />
      )}

      <Modal
        open={!!viewing}
        title={viewing ? fill(m.packageTitle, { r: viewing.label }) : ""}
        footer={null}
        width={760}
        onCancel={() => setViewing(null)}
      >
        {viewing ? <HandoverPackageView pack={viewing.package} /> : null}
      </Modal>

      <Modal
        open={!!sending}
        title={sending ? fill(m.sendTitle, { r: sending.round.label }) : ""}
        okText={sending?.round.handover ? m.resend : m.send}
        confirmLoading={busy}
        okButtonProps={{
          disabled:
            sending?.round.handover?.status === "questioned" &&
            !sending.note.trim(),
        }}
        width={760}
        onOk={() => void send()}
        onCancel={() => setSending(null)}
      >
        {sending ? (
          <Space orientation="vertical" className="w-full">
            {sending.round.handover?.question ? (
              <Alert
                type="warning"
                showIcon
                title={sending.round.handover.question}
              />
            ) : null}
            <HandoverPackageView pack={sending.round.package} />
            <Input.TextArea
              rows={3}
              maxLength={2000}
              placeholder={
                sending.round.handover?.status === "questioned"
                  ? m.answer
                  : m.note
              }
              value={sending.note}
              onChange={(event) =>
                setSending({ ...sending, note: event.target.value })
              }
            />
          </Space>
        ) : null}
      </Modal>
    </Card>
  );
}
