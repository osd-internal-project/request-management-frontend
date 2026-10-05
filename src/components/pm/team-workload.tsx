"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  DatePicker,
  Select,
  Skeleton,
  Space,
  Table,
  Tooltip,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type { WorkloadView, WorkloadWeek } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.resources.workload;

/** Green under 80%, amber to 100%, red over or with overbooked days. */
function shade(week: WorkloadWeek) {
  if (week.overbookedDays > 0 || (week.pct ?? 0) > 100) return "bg-red-100";
  if ((week.pct ?? 0) >= 80) return "bg-amber-100";
  if ((week.pct ?? 0) > 0) return "bg-green-50";
  return "";
}

/**
 * CD-180 — the team's load week by week across projects: booked hours
 * against the time left after leave, from CD-232's availability.
 */
export function TeamWorkload() {
  const [from, setFrom] = useState<Dayjs>(dayjs());
  const [weeks, setWeeks] = useState(8);
  const [skill, setSkill] = useState<string | null>(null);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const key = `${from.format("YYYY-MM-DD")}|${weeks}|${skill ?? ""}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    view: WorkloadView | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    void appApi<{ items: { id: string; name: string }[] }>("hr/skills").then(
      (result) => {
        if (result.ok) setSkills(result.data.items);
      },
    );
  }, []);

  useEffect(() => {
    let live = true;
    const [day, count, skillId] = key.split("|");
    const params = new URLSearchParams({ from: day, weeks: count });
    if (skillId) params.set("skill_id", skillId);
    void appApi<WorkloadView>(`project-resources/workload?${params}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { key, view: result.data, error: null }
            : { key, view: null, error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  const view = loaded?.key === key ? loaded.view : null;

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      <Space wrap className="mb-3">
        <label className="text-xs">
          {m.from}{" "}
          <DatePicker
            picker="week"
            value={from}
            allowClear={false}
            onChange={(value) => value && setFrom(value)}
          />
        </label>
        <label className="text-xs">
          {m.weeks}{" "}
          <Select
            value={weeks}
            style={{ width: 80 }}
            options={[4, 8, 13].map((value) => ({ value, label: value }))}
            onChange={setWeeks}
          />
        </label>
        <label className="text-xs">
          {m.skill}{" "}
          <Select
            allowClear
            style={{ width: 200 }}
            value={skill ?? undefined}
            options={skills.map((row) => ({ value: row.id, label: row.name }))}
            onChange={(value?: string) => setSkill(value ?? null)}
          />
        </label>
      </Space>
      {loaded?.key === key && loaded.error && (
        <Alert type="error" showIcon title={loaded.error} />
      )}
      {!loaded || loaded.key !== key ? (
        <Skeleton active />
      ) : view ? (
        <Table
          rowKey="userId"
          size="small"
          pagination={false}
          dataSource={view.people}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 200 + view.weeks.length * 110 }}
          columns={[
            {
              title: m.person,
              fixed: "left",
              width: 180,
              render: (_: unknown, row) => row.displayName ?? row.name ?? "",
            },
            ...view.weeks.map((week) => ({
              title: dayjs(week).format("D MMM"),
              key: week,
              width: 110,
              render: (_: unknown, row: WorkloadView["people"][number]) => {
                const cell = row.weeks.find((item) => item.week === week);
                if (!cell) return null;
                const open = cell.capacity - cell.leave;
                return (
                  <Tooltip
                    title={
                      <div className="text-xs">
                        {cell.projects.map((p) => (
                          <div key={p.projectId}>
                            {view.projects[p.projectId] ?? p.projectId}:{" "}
                            {p.hours} ชม.
                          </div>
                        ))}
                        {cell.leave > 0 && <div>ลา {cell.leave} ชม.</div>}
                        {cell.overbookedDays > 0 && (
                          <div>{m.overDays(cell.overbookedDays)}</div>
                        )}
                      </div>
                    }
                  >
                    <div
                      className={`rounded px-1 text-center text-xs ${shade(cell)}`}
                    >
                      {cell.pct === null ? "—" : `${cell.pct}%`}
                      <div className="text-[10px] text-gray-500">
                        {m.cell(cell.booked, open)}
                      </div>
                    </div>
                  </Tooltip>
                );
              },
            })),
          ]}
        />
      ) : null}
    </Card>
  );
}
