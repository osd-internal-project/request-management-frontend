"use client";

import { useState } from "react";
import { App, Drawer, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { EmployeeProfile } from "./employee-profile";
import type { Employee } from "./employee-types";

const m = messages.hr.employees;

/** CD-230 — the people below me; opening one is recorded on the server. */
export function TeamList({ rows }: { rows: Employee[] }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState<Employee | null>(null);

  async function show(row: Employee) {
    const result = await appApi<Employee>(`hr/employees/${row.userId}`);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    setOpen(result.data);
  }

  return (
    <>
      <Table<Employee>
        rowKey="userId"
        size="small"
        dataSource={rows}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        locale={{ emptyText: m.teamEmpty }}
        scroll={{ x: 900 }}
        onRow={(row) => ({
          onClick: () => void show(row),
          className: "cursor-pointer",
        })}
        columns={[
          {
            title: m.name,
            key: "name",
            render: (_: unknown, row) => (
              <>
                <div>{row.displayName}</div>
                <Text type="secondary" className="text-xs">
                  {row.position ?? ""}
                </Text>
              </>
            ),
          },
          {
            title: m.orgUnit,
            key: "org",
            render: (_: unknown, row) => row.orgUnit?.name ?? m.none,
          },
          {
            title: m.supervisor,
            key: "supervisor",
            render: (_: unknown, row) => row.supervisor?.displayName ?? m.none,
          },
          {
            title: m.level,
            key: "level",
            render: (_: unknown, row) =>
              row.profile.level
                ? `${row.profile.level.code} ${row.profile.level.name}`
                : m.none,
          },
          {
            title: m.status,
            key: "status",
            render: (_: unknown, row) => (
              <Tag>{m.statuses[row.profile.status] ?? row.profile.status}</Tag>
            ),
          },
          {
            title: m.skills,
            key: "skills",
            render: (_: unknown, row) => (
              <Space size={[4, 4]} wrap>
                {row.skills.map((skill) => (
                  <Tag
                    key={skill.skillId}
                    color={skill.certExpired ? "red" : undefined}
                  >
                    {skill.name} {skill.proficiency}
                  </Tag>
                ))}
              </Space>
            ),
          },
        ]}
      />
      <Drawer
        open={!!open}
        size="large"
        title={open?.displayName}
        onClose={() => setOpen(null)}
      >
        {open && <EmployeeProfile employee={open} />}
      </Drawer>
    </>
  );
}
