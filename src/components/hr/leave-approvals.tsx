"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Input, Modal, Space, Table } from "antd";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { period, type Leave } from "./leave-types";

const m = messages.hr.leave;

/** CD-232 — leave waiting for me: approve, or reject with a reason. */
export function LeaveApprovals() {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    version: number;
    items: Leave[] | null;
    error: string | null;
  } | null>(null);
  const [rejecting, setRejecting] = useState<Leave | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<{ items: Leave[] }>("hr/leaves/pending").then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { version, items: result.data.items, error: null }
          : { version, items: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [version]);

  const decide = async (leave: Leave, action: "approve" | "reject") => {
    setBusy(leave.id);
    const result = await appApi<Leave>(`hr/leaves/${leave.id}/${action}`, {
      method: "POST",
      body: JSON.stringify(action === "reject" ? { note: note.trim() } : {}),
    });
    setBusy(null);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(action === "approve" ? m.approved : m.rejected);
    setRejecting(null);
    setNote("");
    setVersion((value) => value + 1);
  };

  if (loaded?.error)
    return <Alert type="error" showIcon title={loaded.error} />;
  return (
    <>
      <Table<Leave>
        rowKey="id"
        size="small"
        loading={!loaded}
        dataSource={loaded?.items ?? []}
        pagination={false}
        locale={{ emptyText: m.noPending }}
        scroll={{ x: 760 }}
        columns={[
          { title: m.person, dataIndex: "name" },
          { title: m.type, dataIndex: "leaveType" },
          {
            title: m.dates,
            key: "dates",
            render: (_, row) =>
              `${period(row.startDate, row.endDate)}${row.part === "full" ? "" : ` (${m.parts[row.part]})`}`,
          },
          { title: m.daysCol, dataIndex: "days", align: "right" },
          { title: m.reason, dataIndex: "reason" },
          {
            key: "actions",
            align: "right",
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  danger
                  disabled={!!busy}
                  onClick={() => setRejecting(row)}
                >
                  {m.reject}
                </Button>
                <Button
                  size="small"
                  type="primary"
                  loading={busy === row.id}
                  disabled={!!busy && busy !== row.id}
                  onClick={() => void decide(row, "approve")}
                >
                  {m.approve}
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={!!rejecting}
        title={m.rejectTitle}
        okText={m.reject}
        okButtonProps={{
          danger: true,
          disabled: !note.trim(),
          loading: !!busy,
        }}
        onOk={() => rejecting && void decide(rejecting, "reject")}
        onCancel={() => setRejecting(null)}
      >
        <Input.TextArea
          rows={3}
          maxLength={1000}
          placeholder={m.rejectReason}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal>
    </>
  );
}
