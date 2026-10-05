"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Skeleton, Space, Tag } from "antd";
import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { TimesheetGrid } from "./timesheet-grid";
import {
  dayLabel,
  payloadOf,
  rowsOf,
  shiftDay,
  type TimesheetOptions,
  type TimesheetRow,
  type TimesheetWeek as Week,
} from "./timesheet-types";

const m = messages.hr.timesheet;

export const STATUS_COLOR: Record<string, string> = {
  draft: "default",
  submitted: "processing",
  approved: "success",
  returned: "error",
};

/** CD-231 — my week: log hours, save as often as I like, submit once. */
export function TimesheetWeek({ today }: { today: string }) {
  const { message } = App.useApp();
  const [day, setDay] = useState(today);
  const [options, setOptions] = useState<TimesheetOptions | null>(null);
  const [loaded, setLoaded] = useState<{
    day: string;
    week: Week | null;
    error: string | null;
  } | null>(null);
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void appApi<TimesheetOptions>("hr/timesheets/options").then((result) => {
      if (result.ok) setOptions(result.data);
    });
  }, []);

  useEffect(() => {
    let live = true;
    void appApi<Week>(`hr/timesheets/week?day=${day}`).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { day, week: result.data, error: null }
          : { day, week: null, error: result.message },
      );
      if (result.ok) {
        setRows(rowsOf(result.data.lines));
        setDirty(false);
      }
    });
    return () => {
      live = false;
    };
  }, [day]);

  const week = loaded?.day === day ? loaded.week : null;
  const show = (next: Week) => {
    setLoaded({ day, week: next, error: null });
    setRows(rowsOf(next.lines));
    setDirty(false);
  };

  const go = (target: string) => {
    if (dirty && !window.confirm(m.discard)) return;
    setDay(target);
  };

  const save = async () => {
    if (!week) return null;
    if (rows.some((row) => !row.item || !row.workTypeId)) {
      void message.error(m.incomplete);
      return null;
    }
    setBusy(true);
    const result = await appApi<Week>("hr/timesheets/week", {
      method: "PUT",
      body: JSON.stringify({
        week_start: week.weekStart,
        rows: rows.map(payloadOf),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return null;
    }
    show(result.data);
    return result.data;
  };

  const submit = async () => {
    const saved = dirty || !week?.id ? await save() : week;
    if (!saved?.id) return;
    setBusy(true);
    const result = await appApi<unknown>(`hr/timesheets/${saved.id}/submit`, {
      method: "POST",
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.submitted);
    const fresh = await appApi<Week>(`hr/timesheets/week?day=${day}`);
    if (fresh.ok) show(fresh.data);
  };

  if (loaded?.error && loaded.day === day)
    return <Alert type="error" showIcon title={loaded.error} />;

  return (
    <Card
      title={
        <Space wrap>
          <Button
            size="small"
            icon={<LeftOutlined />}
            aria-label={m.prevWeek}
            onClick={() => go(shiftDay(week?.weekStart ?? day, -7))}
          />
          <span>
            {week
              ? `${dayLabel(week.days[0])} – ${dayLabel(week.days[6])}`
              : m.loading}
          </span>
          <Button
            size="small"
            icon={<RightOutlined />}
            aria-label={m.nextWeek}
            onClick={() => go(shiftDay(week?.weekStart ?? day, 7))}
          />
          <Button size="small" onClick={() => go(today)}>
            {m.thisWeek}
          </Button>
          {week ? (
            <Tag color={STATUS_COLOR[week.status]}>{m.status[week.status]}</Tag>
          ) : null}
        </Space>
      }
      extra={
        week?.editable ? (
          <Space>
            <Button
              loading={busy}
              disabled={!dirty}
              onClick={() => void save()}
            >
              {m.save}
            </Button>
            <Button
              type="primary"
              loading={busy}
              disabled={!rows.length}
              onClick={() => void submit()}
            >
              {m.submit}
            </Button>
          </Space>
        ) : null
      }
    >
      {!week ? (
        <Skeleton active />
      ) : (
        <div className="space-y-3">
          {week.status === "returned" && week.returnReason ? (
            <Alert
              type="warning"
              showIcon
              title={m.returnedBecause}
              description={week.returnReason}
            />
          ) : null}
          {week.status === "submitted" ? (
            <Alert type="info" showIcon title={m.waiting} />
          ) : null}
          <TimesheetGrid
            days={week.days}
            rows={rows}
            labels={week.labels}
            options={options}
            today={today}
            onChange={
              week.editable
                ? (next) => {
                    setRows(next);
                    setDirty(true);
                  }
                : undefined
            }
          />
          {week.editable ? (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                setRows([
                  ...rows,
                  {
                    key: `new-${Date.now()}`,
                    item: null,
                    projectTaskId: null,
                    workTypeId: null,
                    billable: false,
                    note: "",
                    hours: {},
                  },
                ]);
                setDirty(true);
              }}
            >
              {m.addRow}
            </Button>
          ) : null}
          <Text type="secondary" className="block text-xs">
            {m.hint}
          </Text>
        </div>
      )}
    </Card>
  );
}
