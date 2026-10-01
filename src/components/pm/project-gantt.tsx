"use client";

import { Tooltip } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import type { PlanMilestoneForecast, PlanTaskView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.plan;
const DAY_MS = 86_400_000;

/**
 * CD-178 — the plan on a timeline: one bar per task from its start to its
 * finish (critical in red, a point in time as a diamond, a summary as a
 * thin bar), weekly guides, and each milestone's due day as a marker.
 */
export function ProjectGantt({
  tasks,
  projectStart,
  finish,
  milestones,
}: {
  readonly tasks: PlanTaskView[];
  readonly projectStart: string;
  readonly finish: string | null;
  readonly milestones: PlanMilestoneForecast[];
}) {
  const dated = tasks.filter((task) => task.start && task.finish);
  const ends = [
    finish,
    ...milestones.map((row) => row.dueOn),
    ...milestones.map((row) => row.forecast),
  ].filter((day): day is string => Boolean(day));
  const first = dayjs(projectStart).startOf("week");
  const last = dayjs(ends.sort().reverse()[0] ?? projectStart)
    .endOf("week")
    .add(1, "day");
  const total = Math.max(1, Math.round(last.diff(first) / DAY_MS));
  const at = (day: string) =>
    (Math.round(dayjs(day).diff(first) / DAY_MS) / total) * 100;
  const weeks: dayjs.Dayjs[] = [];
  for (let week = first; week.isBefore(last); week = week.add(7, "day")) {
    weeks.push(week);
  }
  const depth = (wbs: string) => wbs.split(".").length - 1;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 760 }}>
        {/* the weeks */}
        <div className="flex border-b text-xs">
          <div className="w-56 shrink-0" />
          <div className="relative h-5 flex-1">
            {weeks.map((week) => (
              <span
                key={week.valueOf()}
                className="absolute top-0 text-gray-500"
                style={{ left: `${at(week.format("YYYY-MM-DD"))}%` }}
              >
                {week.format("D MMM")}
              </span>
            ))}
          </div>
        </div>

        {dated.map((task) => {
          const left = at(task.start!);
          const width = Math.max(
            at(dayjs(task.finish!).add(1, "day").format("YYYY-MM-DD")) - left,
            0.6,
          );
          const point = !task.summary && task.durationDays === 0;
          return (
            <div
              key={task.id}
              className="flex items-center border-b py-1 text-xs"
            >
              <div
                className="w-56 shrink-0 truncate pr-2"
                style={{ paddingLeft: depth(task.wbs) * 12 }}
                title={`${task.wbs} ${task.title}`}
              >
                <Text type="secondary">{task.wbs}</Text> {task.title}
              </div>
              <div className="relative h-5 flex-1">
                {weeks.map((week) => (
                  <span
                    key={week.valueOf()}
                    className="absolute top-0 h-full border-l border-gray-100 dark:border-gray-800"
                    style={{ left: `${at(week.format("YYYY-MM-DD"))}%` }}
                  />
                ))}
                <Tooltip
                  title={`${dayjs(task.start).format("D MMM")} – ${dayjs(task.finish).format("D MMM YYYY")}${task.floatDays !== null ? ` · ${m.columns.float} ${task.floatDays}` : ""}`}
                >
                  {point ? (
                    <span
                      className="absolute top-1 h-3 w-3 rotate-45 bg-gray-700 dark:bg-gray-300"
                      style={{ left: `calc(${left}% - 6px)` }}
                    />
                  ) : (
                    <span
                      className={`absolute rounded ${
                        task.summary
                          ? "top-2 h-1.5 bg-gray-600 dark:bg-gray-300"
                          : task.critical
                            ? "top-0.5 h-4 bg-red-500"
                            : "top-0.5 h-4 bg-blue-500"
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  )}
                </Tooltip>
              </div>
            </div>
          );
        })}

        {/* the milestones' due days against their forecasts */}
        {milestones.map((row) => (
          <div key={row.id} className="flex items-center border-b py-1 text-xs">
            <div className="w-56 shrink-0 truncate pr-2" title={row.title}>
              ◆ {row.title}
            </div>
            <div className="relative h-5 flex-1">
              {row.forecast && (
                <Tooltip
                  title={m.forecast(dayjs(row.forecast).format("D MMM YYYY"))}
                >
                  <span
                    className={`absolute top-1 h-3 w-3 rotate-45 ${row.late ? "bg-red-500" : "bg-green-600"}`}
                    style={{ left: `calc(${at(row.forecast)}% - 6px)` }}
                  />
                </Tooltip>
              )}
              {row.dueOn && (
                <Tooltip title={m.due(dayjs(row.dueOn).format("D MMM YYYY"))}>
                  <span
                    className="absolute top-0 h-5 border-l-2 border-dashed border-orange-500"
                    style={{ left: `${at(row.dueOn)}%` }}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
