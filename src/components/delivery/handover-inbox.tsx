"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Input,
  Modal,
  Segmented,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
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

type Item = HandoverState & {
  project: { id: string; label: string } | null;
  round: string | null;
  decidedOn: string | null;
  package: HandoverPackage | null;
};

interface View {
  canAcknowledge: boolean;
  items: Item[];
}

/** CD-255 — the service team's inbox of what the delivery team handed over. */
export function HandoverInbox() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<string>("sent");
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    view: View | null;
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [answering, setAnswering] = useState<{
    item: Item;
    action: "acknowledge" | "question";
    text: string;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const query = status === "all" ? "" : `?status=${status}`;
    void appApi<View>(`delivery/handovers${query}`).then((result) => {
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
  }, [status, version]);

  const view = loaded?.view ?? null;

  async function answer() {
    if (!answering) return;
    setBusy(true);
    const result = await appApi(
      `delivery/handovers/${answering.item.id}/answer`,
      {
        method: "POST",
        body: JSON.stringify({
          action: answering.action,
          text: answering.text.trim() || undefined,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(
      answering.action === "acknowledge" ? m.acknowledged : m.asked,
    );
    setAnswering(null);
    setVersion((value) => value + 1);
  }

  return (
    <Space orientation="vertical" className="w-full">
      <Segmented
        value={status}
        onChange={(value) => setStatus(String(value))}
        options={[
          { value: "sent", label: m.statuses.sent },
          { value: "questioned", label: m.statuses.questioned },
          { value: "acknowledged", label: m.statuses.acknowledged },
          { value: "all", label: m.filterAll },
        ]}
      />
      {loaded?.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !view ? (
        <Skeleton active />
      ) : (
        <Table<Item>
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          dataSource={view.items}
          locale={{ emptyText: m.inboxEmpty }}
          scroll={{ x: 900 }}
          columns={[
            {
              title: m.project,
              key: "project",
              render: (_, row) =>
                row.project ? (
                  <Link href={`${ROUTES.projects}/${row.project.id}`}>
                    {row.project.label}
                  </Link>
                ) : (
                  "—"
                ),
            },
            { title: m.round, dataIndex: "round", width: 80 },
            {
              title: m.decidedOn,
              dataIndex: "decidedOn",
              width: 110,
              render: (v: string | null) => (v ? thaiDate(v) : "—"),
            },
            {
              title: m.status,
              key: "status",
              render: (_, row) => (
                <Space orientation="vertical" size={2}>
                  <Tag color={HANDOVER_COLOR[row.status]}>
                    {m.statuses[row.status]}
                  </Tag>
                  <HandoverTrail state={row} />
                </Space>
              ),
            },
            {
              key: "actions",
              width: 280,
              align: "right" as const,
              render: (_, row) => (
                <Space wrap>
                  <Button
                    size="small"
                    disabled={!row.package}
                    onClick={() => setViewing(row)}
                  >
                    {m.view}
                  </Button>
                  {view.canAcknowledge && row.status === "sent" ? (
                    <>
                      <Button
                        size="small"
                        onClick={() =>
                          setAnswering({
                            item: row,
                            action: "question",
                            text: "",
                          })
                        }
                      >
                        {m.ask}
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() =>
                          setAnswering({
                            item: row,
                            action: "acknowledge",
                            text: "",
                          })
                        }
                      >
                        {m.acknowledge}
                      </Button>
                    </>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={!!viewing}
        title={viewing ? fill(m.packageTitle, { r: viewing.round ?? "" }) : ""}
        footer={null}
        width={760}
        onCancel={() => setViewing(null)}
      >
        {viewing?.package ? (
          <HandoverPackageView pack={viewing.package} />
        ) : null}
      </Modal>

      <Modal
        open={!!answering}
        title={answering?.action === "acknowledge" ? m.ackTitle : m.askTitle}
        okText={answering?.action === "acknowledge" ? m.acknowledge : m.ask}
        confirmLoading={busy}
        okButtonProps={{
          disabled: answering?.action === "question" && !answering.text.trim(),
        }}
        onOk={() => void answer()}
        onCancel={() => setAnswering(null)}
      >
        {answering ? (
          <Input.TextArea
            rows={4}
            maxLength={2000}
            placeholder={
              answering.action === "acknowledge" ? m.ackNote : m.askText
            }
            value={answering.text}
            onChange={(event) =>
              setAnswering({ ...answering, text: event.target.value })
            }
          />
        ) : null}
      </Modal>
    </Space>
  );
}
