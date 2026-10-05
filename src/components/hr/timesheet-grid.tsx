"use client";

import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import {
  dayLabel,
  type TimesheetOptions,
  type TimesheetRow,
} from "./timesheet-types";

const m = messages.hr.timesheet;
const LONG_DAY = 8;

type Props = {
  days: string[];
  rows: TimesheetRow[];
  labels: Record<string, string>;
  options?: TimesheetOptions | null;
  /** Without it the grid is read-only (a supervisor's view). */
  onChange?: (rows: TimesheetRow[]) => void;
  today?: string;
};

/** CD-231 — a week: work item × work type rows, hours per day columns. */
export function TimesheetGrid({
  days,
  rows,
  labels,
  options,
  onChange,
  today,
}: Props) {
  const editable = !!onChange;
  const patch = (key: string, change: Partial<TimesheetRow>) =>
    onChange?.(
      rows.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );

  const itemLabel = (item: string | null) => {
    if (!item) return m.none;
    const [kind, id] = item.split(/:(.*)/);
    return labels[kind === "internal" ? item : id] ?? id;
  };

  const itemOptions = [
    {
      label: m.kinds.project,
      options: (options?.projects ?? []).map((project) => ({
        value: `project:${project.id}`,
        label: `${project.projectNo} · ${project.name}`,
      })),
    },
    {
      label: m.kinds.service,
      options: (options?.requests ?? []).map((request) => ({
        value: `service:${request.id}`,
        label: request.label,
      })),
    },
    {
      label: m.kinds.presales,
      options: (options?.solutions ?? []).map((solution) => ({
        value: `presales:${solution.id}`,
        label: solution.label,
      })),
    },
    {
      label: m.kinds.internal,
      options: (options?.internal ?? []).map((activity) => ({
        value: `internal:${activity.code}`,
        label: activity.name,
      })),
    },
  ];
  // Keep a saved item selectable even when it left the option list.
  for (const row of rows) {
    if (
      row.item &&
      !itemOptions.some((group) =>
        group.options.some((option) => option.value === row.item),
      )
    ) {
      const kind = row.item.split(":")[0];
      const group = itemOptions.find(
        (g) => g.label === m.kinds[kind as keyof typeof m.kinds],
      );
      group?.options.push({ value: row.item, label: itemLabel(row.item) });
    }
  }
  const workTypes = (options?.work_types ?? []).map((type) => ({
    value: type.id,
    label: type.name,
  }));
  for (const row of rows)
    if (row.workTypeId && !workTypes.some((t) => t.value === row.workTypeId))
      workTypes.push({
        value: row.workTypeId,
        label: labels[row.workTypeId] ?? row.workTypeId,
      });

  const totals = Object.fromEntries(
    days.map((day) => [
      day,
      rows.reduce((sum, row) => sum + (row.hours[day] ?? 0), 0),
    ]),
  );
  const rowTotal = (row: TimesheetRow) =>
    days.reduce((sum, day) => sum + (row.hours[day] ?? 0), 0);

  return (
    <Table<TimesheetRow>
      size="small"
      rowKey="key"
      pagination={false}
      scroll={{ x: 1180 }}
      dataSource={rows}
      locale={{ emptyText: editable ? m.emptyEditable : m.empty }}
      columns={[
        {
          title: m.item,
          key: "item",
          width: 300,
          fixed: "left",
          render: (_, row) => {
            const projectId = row.item?.startsWith("project:")
              ? row.item.slice("project:".length)
              : null;
            const tasks =
              options?.projects.find((p) => p.id === projectId)?.tasks ?? [];
            if (!editable) {
              return (
                <div>
                  <div>{itemLabel(row.item)}</div>
                  {row.projectTaskId ? (
                    <Text type="secondary" className="text-xs">
                      {labels[row.projectTaskId] ?? row.projectTaskId}
                    </Text>
                  ) : null}
                  {row.note ? (
                    <div>
                      <Text type="secondary" className="text-xs">
                        {row.note}
                      </Text>
                    </div>
                  ) : null}
                </div>
              );
            }
            return (
              <div className="space-y-1">
                <Select
                  showSearch={{ optionFilterProp: "label" }}
                  className="w-full"
                  placeholder={m.pickItem}
                  value={row.item ?? undefined}
                  options={itemOptions.filter((g) => g.options.length)}
                  onChange={(item: string) => {
                    const kind = item.split(":")[0];
                    patch(row.key, {
                      item,
                      projectTaskId: null,
                      billable: kind === "project" || kind === "service",
                    });
                  }}
                />
                {projectId ? (
                  <Select
                    allowClear
                    className="w-full"
                    size="small"
                    placeholder={m.pickTask}
                    value={row.projectTaskId ?? undefined}
                    options={tasks.map((task) => ({
                      value: task.id,
                      label: `#${task.seq} ${task.title}`,
                    }))}
                    onChange={(id?: string) =>
                      patch(row.key, { projectTaskId: id ?? null })
                    }
                  />
                ) : null}
                <Input
                  size="small"
                  maxLength={500}
                  placeholder={m.note}
                  value={row.note}
                  onChange={(event) =>
                    patch(row.key, { note: event.target.value })
                  }
                />
              </div>
            );
          },
        },
        {
          title: m.workType,
          key: "workType",
          width: 160,
          render: (_, row) =>
            editable ? (
              <Select
                className="w-full"
                placeholder={m.pickWorkType}
                value={row.workTypeId ?? undefined}
                options={workTypes}
                onChange={(id: string) => patch(row.key, { workTypeId: id })}
              />
            ) : (
              (labels[row.workTypeId ?? ""] ?? row.workTypeId)
            ),
        },
        {
          title: m.billable,
          key: "billable",
          width: 70,
          align: "center",
          render: (_, row) => {
            const kind = row.item?.split(":")[0];
            const allowed = kind === "project" || kind === "service";
            return (
              <Tooltip title={allowed ? undefined : m.notBillable}>
                <Checkbox
                  checked={allowed && row.billable}
                  disabled={!editable || !allowed}
                  onChange={(event) =>
                    patch(row.key, { billable: event.target.checked })
                  }
                />
              </Tooltip>
            );
          },
        },
        ...days.map((day) => ({
          title: (
            <span className={day === today ? "font-semibold" : undefined}>
              {dayLabel(day)}
            </span>
          ),
          key: day,
          width: 82,
          align: "center" as const,
          render: (_: unknown, row: TimesheetRow) =>
            editable ? (
              <InputNumber
                size="small"
                className="!w-[70px]"
                min={0}
                max={24}
                step={0.5}
                precision={1}
                disabled={!!today && day > today}
                value={row.hours[day] ?? null}
                onChange={(value) =>
                  patch(row.key, {
                    hours: { ...row.hours, [day]: value ?? null },
                  })
                }
              />
            ) : (
              (row.hours[day] ?? "")
            ),
        })),
        {
          title: m.total,
          key: "total",
          width: 70,
          align: "right",
          render: (_, row) => <Text strong>{rowTotal(row)}</Text>,
        },
        ...(editable
          ? [
              {
                key: "remove",
                width: 44,
                render: (_: unknown, row: TimesheetRow) => (
                  <Button
                    type="text"
                    danger
                    size="small"
                    aria-label={m.removeRow}
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      onChange?.(rows.filter((r) => r.key !== row.key))
                    }
                  />
                ),
              },
            ]
          : []),
      ]}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <Text strong>{m.dayTotal}</Text>
            </Table.Summary.Cell>
            {days.map((day, index) => (
              <Table.Summary.Cell key={day} index={3 + index} align="center">
                {totals[day] > LONG_DAY ? (
                  <Tooltip title={m.longDay}>
                    <Tag color="orange" className="!m-0">
                      {totals[day]}
                    </Tag>
                  </Tooltip>
                ) : (
                  totals[day] || ""
                )}
              </Table.Summary.Cell>
            ))}
            <Table.Summary.Cell index={10} align="right">
              <Text strong>
                {Object.values(totals).reduce((sum, value) => sum + value, 0)}
              </Text>
            </Table.Summary.Cell>
            {editable ? <Table.Summary.Cell index={11} /> : null}
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  );
}
