"use client";

import { useEffect, useState } from "react";
import { Alert, Input, Select, Skeleton, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { Skill, StaffMember } from "./employee-types";

const m = messages.hr.employees;

/** CD-230 — who to staff with: name, place, level, skills. Nothing else. */
export function StaffDirectory() {
  const [q, setQ] = useState("");
  const [skillId, setSkillId] = useState<string | undefined>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const key = `${q}|${skillId ?? ""}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    items: StaffMember[] | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    void appApi<{ items: Skill[] }>("hr/skills").then((result) => {
      if (result.ok) setSkills(result.data.items);
    });
  }, []);

  useEffect(() => {
    let live = true;
    const [text, skill] = key.split("|");
    const params = new URLSearchParams();
    if (text) params.set("q", text);
    if (skill) params.set("skill_id", skill);
    void appApi<{ items: StaffMember[] }>(`hr/staff?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { key, items: result.data.items, error: null }
            : { key, items: null, error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  const items = loaded?.key === key ? loaded.items : null;
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input.Search
          allowClear
          className="w-72 max-w-full"
          placeholder={m.search}
          onSearch={(value) => setQ(value.trim())}
        />
        <Select<string>
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-56"
          placeholder={m.allSkills}
          value={skillId}
          onChange={setSkillId}
          options={skills
            .filter((skill) => skill.active)
            .map((skill) => ({ value: skill.id, label: skill.name }))}
        />
      </div>
      {loaded?.key === key && loaded.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !items ? (
        <Skeleton active />
      ) : (
        <Table<StaffMember>
          rowKey="userId"
          size="small"
          dataSource={items}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 800 }}
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
              title: m.level,
              key: "level",
              render: (_: unknown, row) =>
                row.level ? `${row.level.code} ${row.level.name}` : m.none,
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
                      {skill.name} · {m.proficiencies[skill.proficiency]}
                    </Tag>
                  ))}
                </Space>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
