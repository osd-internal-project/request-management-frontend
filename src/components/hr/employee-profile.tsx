"use client";

import { Descriptions, Space, Tag } from "antd";
import dayjs from "dayjs";
import { messages } from "@/lib/messages";
import type { Employee } from "./employee-types";

const m = messages.hr.employees;
const thaiDate = (value: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : m.none;

/** CD-229 — one person, directory facts and HR's, read-only. */
export function EmployeeProfile({ employee }: { employee: Employee }) {
  const p = employee.profile;
  return (
    <Descriptions
      size="small"
      column={{ xs: 1, md: 2 }}
      items={[
        {
          key: "employeeId",
          label: m.employeeId,
          children: employee.employeeId ?? m.none,
        },
        { key: "email", label: m.email, children: employee.email ?? m.none },
        {
          key: "position",
          label: m.position,
          children: employee.position ?? m.none,
        },
        {
          key: "orgUnit",
          label: m.orgUnit,
          children: employee.orgUnit?.name ?? m.none,
        },
        {
          key: "supervisor",
          label: m.supervisor,
          children: employee.supervisor?.displayName ?? m.none,
        },
        {
          key: "startWork",
          label: m.startWork,
          children: thaiDate(employee.startWork),
        },
        {
          key: "level",
          label: m.level,
          children: p.level ? `${p.level.code} ${p.level.name}` : m.none,
        },
        {
          key: "employment",
          label: m.employmentType,
          children: m.employmentTypes[p.employmentType] ?? p.employmentType,
        },
        {
          key: "status",
          label: m.status,
          children: m.statuses[p.status] ?? p.status,
        },
        { key: "endDate", label: m.endDate, children: thaiDate(p.endDate) },
        {
          key: "skills",
          label: m.skills,
          span: 2,
          children: employee.skills.length ? (
            <Space size={[4, 4]} wrap>
              {employee.skills.map((skill) => (
                <Tag
                  key={skill.skillId}
                  color={skill.certExpired ? "red" : "blue"}
                >
                  {skill.name} · {m.proficiencies[skill.proficiency]}
                  {skill.certificate
                    ? ` · ${skill.certificate}${skill.certExpiresOn ? ` (${thaiDate(skill.certExpiresOn)})` : ""}`
                    : ""}
                </Tag>
              ))}
            </Space>
          ) : (
            m.none
          ),
        },
        ...(p.note
          ? [{ key: "note", label: m.note, span: 2, children: p.note }]
          : []),
      ]}
    />
  );
}
