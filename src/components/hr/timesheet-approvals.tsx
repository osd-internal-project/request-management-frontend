"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Drawer,
  Input,
  Modal,
  Skeleton,
  Space,
  Table,
} from "antd";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { TimesheetGrid } from "./timesheet-grid";
import {
  dayLabel,
  rowsOf,
  shiftDay,
  type PendingTimesheet,
  type TimesheetWeek,
} from "./timesheet-types";

const m = messages.hr.timesheet;

/** CD-231 — weeks waiting for me: open, approve, or return with a reason. */
export function TimesheetApprovals() {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    version: number;
    items: PendingTimesheet[] | null;
    error: string | null;
  } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{
    id: string;
    week: TimesheetWeek | null;
    error: string | null;
  } | null>(null);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void appApi<{ items: PendingTimesheet[] }>("hr/timesheets/pending").then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { version, items: result.data.items, error: null }
            : { version, items: null, error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [version]);

  useEffect(() => {
    if (!openId) return;
    let live = true;
    void appApi<TimesheetWeek>(`hr/timesheets/${openId}`).then((result) => {
      if (!live) return;
      setSheet(
        result.ok
          ? { id: openId, week: result.data, error: null }
          : { id: openId, week: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [openId]);

  const decide = async (action: "approve" | "return") => {
    if (!openId) return;
    setBusy(true);
    const result = await appApi<unknown>(`hr/timesheets/${openId}/${action}`, {
      method: "POST",
      ...(action === "return"
        ? { body: JSON.stringify({ reason: reason.trim() }) }
        : {}),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(action === "approve" ? m.approved : m.returned);
    setReturning(false);
    setReason("");
    setOpenId(null);
    setVersion((value) => value + 1);
  };

  const items = loaded?.items ?? null;
  const pending = items?.find((item) => item.id === openId);
  const week = sheet?.id === openId ? sheet.week : null;

  if (loaded?.error)
    return <Alert type="error" showIcon title={loaded.error} />;
  return (
    <>
      <Table<PendingTimesheet>
        rowKey="id"
        size="small"
        loading={!items}
        dataSource={items ?? []}
        pagination={false}
        locale={{ emptyText: m.noPending }}
        columns={[
          { title: m.person, dataIndex: "name" },
          {
            title: m.week,
            dataIndex: "weekStart",
            render: (start: string) =>
              `${dayLabel(start)} – ${dayLabel(shiftDay(start, 6))}`,
          },
          { title: m.hours, dataIndex: "hours", align: "right" },
          {
            title: m.billableHours,
            dataIndex: "billableHours",
            align: "right",
          },
          {
            key: "open",
            align: "right",
            render: (_, row) => (
              <Button size="small" onClick={() => setOpenId(row.id)}>
                {m.open}
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        open={!!openId}
        size="90%"
        title={
          pending
            ? `${pending.name} · ${dayLabel(pending.weekStart)} – ${dayLabel(shiftDay(pending.weekStart, 6))}`
            : m.loading
        }
        onClose={() => setOpenId(null)}
        extra={
          <Space>
            <Button danger loading={busy} onClick={() => setReturning(true)}>
              {m.return}
            </Button>
            <Button
              type="primary"
              loading={busy}
              onClick={() => void decide("approve")}
            >
              {m.approve}
            </Button>
          </Space>
        }
      >
        {sheet?.id === openId && sheet.error ? (
          <Alert type="error" showIcon title={sheet.error} />
        ) : !week ? (
          <Skeleton active />
        ) : (
          <TimesheetGrid
            days={week.days}
            rows={rowsOf(week.lines)}
            labels={week.labels}
          />
        )}
      </Drawer>
      <Modal
        open={returning}
        title={m.returnTitle}
        okText={m.return}
        okButtonProps={{
          danger: true,
          disabled: !reason.trim(),
          loading: busy,
        }}
        onOk={() => void decide("return")}
        onCancel={() => setReturning(false)}
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder={m.returnReason}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  );
}
