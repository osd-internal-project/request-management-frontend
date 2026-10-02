"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { EmployeeProfile } from "./employee-profile";
import type { Employee, Skill } from "./employee-types";

const m = messages.hr.employees;

interface Level {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface Draft {
  userId: string;
  name: string;
  levelId: string | null;
  employmentType: string;
  status: string;
  endDate: string | null;
  note: string;
  skills: {
    skillId?: string;
    proficiency: number;
    certificate: string;
    certExpiresOn: string | null;
  }[];
}

/**
 * CD-229 — ทะเบียนพนักงาน: the company's people from the directory with HR's
 * level, employment, status and skills; and the skill catalog.
 */
export function EmployeesRegister({ canManage }: { canManage: boolean }) {
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [levelId, setLevelId] = useState<string | undefined>();
  const [skillId, setSkillId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [reload, setReload] = useState(0);
  const key = JSON.stringify({ q, levelId, skillId, status, reload });
  const [loaded, setLoaded] = useState<{
    key: string;
    items: Employee[] | null;
    error: string | null;
  } | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [skillDraft, setSkillDraft] = useState<
    (Partial<Skill> & { id?: string }) | null
  >(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (levelId) params.set("level_id", levelId);
    if (skillId) params.set("skill_id", skillId);
    if (status) params.set("status", status);
    void appApi<{ items: Employee[] }>(
      `hr/employees?${params.toString()}`,
    ).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { key, items: result.data.items, error: null }
          : { key, items: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void appApi<{ items: Skill[] }>("hr/skills").then((result) => {
      if (result.ok) setSkills(result.data.items);
    });
    void appApi<{ levels: Level[] }>("hr/labor-rates").then((result) => {
      if (result.ok) setLevels(result.data.levels);
    });
  }, [reload]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    const profile = await appApi(`hr/employees/${draft.userId}`, {
      method: "PUT",
      body: JSON.stringify({
        level_id: draft.levelId,
        employment_type: draft.employmentType,
        status: draft.status,
        end_date: draft.endDate,
        note: draft.note,
      }),
    });
    const skillSet = profile.ok
      ? await appApi(`hr/employees/${draft.userId}/skills`, {
          method: "PUT",
          body: JSON.stringify({
            skills: draft.skills
              .filter((skill) => skill.skillId)
              .map((skill) => ({
                skill_id: skill.skillId,
                proficiency: skill.proficiency,
                certificate: skill.certificate || undefined,
                cert_expires_on: skill.certExpiresOn ?? undefined,
              })),
          }),
        })
      : profile;
    setBusy(false);
    if (!skillSet.ok) {
      void message.error(skillSet.message);
      return;
    }
    void message.success(m.saved);
    setDraft(null);
    setReload((value) => value + 1);
  }

  async function saveSkill() {
    if (!skillDraft) return;
    setBusy(true);
    const result = await appApi(
      skillDraft.id ? `hr/skills/${skillDraft.id}` : "hr/skills",
      {
        method: skillDraft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(skillDraft.id ? {} : { code: skillDraft.code }),
          name: skillDraft.name,
          category: skillDraft.category ?? "",
          sort_order: skillDraft.sortOrder ?? 0,
          active: skillDraft.active ?? true,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.saved);
    setSkillDraft(null);
    setReload((value) => value + 1);
  }

  const edit = (row: Employee) =>
    setDraft({
      userId: row.userId,
      name: row.displayName,
      levelId: row.profile.levelId,
      employmentType: row.profile.employmentType ?? "permanent",
      status: row.profile.status,
      endDate: row.profile.endDate ?? null,
      note: row.profile.note ?? "",
      skills: row.skills.map((skill) => ({
        skillId: skill.skillId,
        proficiency: skill.proficiency,
        certificate: skill.certificate,
        certExpiresOn: skill.certExpiresOn,
      })),
    });

  const items = loaded?.key === key ? loaded.items : null;
  const activeSkills = skills.filter((skill) => skill.active);

  const people = (
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
          className="w-48"
          placeholder={m.allLevels}
          value={levelId}
          onChange={setLevelId}
          options={levels.map((level) => ({
            value: level.id,
            label: `${level.code} ${level.name}`,
          }))}
        />
        <Select<string>
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-56"
          placeholder={m.allSkills}
          value={skillId}
          onChange={setSkillId}
          options={skills.map((skill) => ({
            value: skill.id,
            label: skill.name,
          }))}
        />
        <Select<string>
          allowClear
          className="w-40"
          placeholder={m.allStatuses}
          value={status}
          onChange={setStatus}
          options={Object.entries(m.statuses).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
      {loaded?.key === key && loaded.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !items ? (
        <Skeleton active />
      ) : (
        <Table<Employee>
          rowKey="userId"
          size="small"
          dataSource={items}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 1100 }}
          onRow={(row) => ({
            onClick: () => setViewing(row),
            className: "cursor-pointer",
          })}
          columns={[
            {
              title: m.name,
              key: "name",
              width: 200,
              render: (_: unknown, row) => (
                <>
                  <div>{row.displayName}</div>
                  <Text type="secondary" className="text-xs">
                    {row.employeeId ?? ""}
                  </Text>
                </>
              ),
            },
            { title: m.position, dataIndex: "position", width: 180 },
            {
              title: m.orgUnit,
              key: "org",
              width: 160,
              render: (_: unknown, row) => row.orgUnit?.name ?? m.none,
            },
            {
              title: m.level,
              key: "level",
              width: 160,
              render: (_: unknown, row) =>
                row.profile.level
                  ? `${row.profile.level.code} ${row.profile.level.name}`
                  : m.none,
            },
            {
              title: m.employmentType,
              key: "employment",
              width: 130,
              render: (_: unknown, row) =>
                row.profile.saved ? (
                  (m.employmentTypes[row.profile.employmentType ?? ""] ??
                  row.profile.employmentType)
                ) : (
                  <Text type="secondary">{m.notSaved}</Text>
                ),
            },
            {
              title: m.status,
              key: "status",
              width: 100,
              render: (_: unknown, row) => (
                <Tag
                  color={
                    row.profile.status === "active"
                      ? "green"
                      : row.profile.status === "resigned"
                        ? "default"
                        : "gold"
                  }
                >
                  {m.statuses[row.profile.status] ?? row.profile.status}
                </Tag>
              ),
            },
            {
              title: m.skills,
              key: "skills",
              render: (_: unknown, row) => (
                <Space size={[4, 4]} wrap>
                  {row.skills.slice(0, 4).map((skill) => (
                    <Tag
                      key={skill.skillId}
                      color={skill.certExpired ? "red" : undefined}
                    >
                      {skill.name} {skill.proficiency}
                    </Tag>
                  ))}
                  {row.skills.length > 4 && <Tag>+{row.skills.length - 4}</Tag>}
                </Space>
              ),
            },
            ...(canManage
              ? [
                  {
                    key: "edit",
                    width: 50,
                    render: (_: unknown, row: Employee) => (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        aria-label={m.edit}
                        onClick={(event) => {
                          event.stopPropagation();
                          edit(row);
                        }}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
    </>
  );

  const catalog = (
    <>
      {canManage && (
        <Button
          size="small"
          icon={<PlusOutlined />}
          className="mb-2"
          onClick={() =>
            setSkillDraft({ active: true, sortOrder: (skills.length + 1) * 10 })
          }
        >
          {m.add}
        </Button>
      )}
      <Table<Skill>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={skills}
        columns={[
          { title: m.skillCode, dataIndex: "code", width: 140 },
          { title: m.skillName, dataIndex: "name" },
          { title: m.category, dataIndex: "category", width: 160 },
          {
            title: m.active,
            dataIndex: "active",
            width: 90,
            render: (value: boolean) =>
              value ? (
                <Tag color="green">{m.active}</Tag>
              ) : (
                <Tag>{m.inactive}</Tag>
              ),
          },
          ...(canManage
            ? [
                {
                  key: "edit",
                  width: 50,
                  render: (_: unknown, row: Skill) => (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      aria-label={m.edit}
                      onClick={() => setSkillDraft(row)}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </>
  );

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div>
        <Title level={3} className="!mb-1">
          {m.title}
        </Title>
        <Text type="secondary">{m.hint}</Text>
      </div>
      <Card>
        <Tabs
          items={[
            { key: "people", label: m.tabPeople, children: people },
            { key: "skills", label: m.tabSkills, children: catalog },
          ]}
        />
      </Card>

      <Drawer
        open={!!viewing}
        size="large"
        title={viewing?.displayName}
        onClose={() => setViewing(null)}
        extra={
          canManage && viewing ? (
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                edit(viewing);
                setViewing(null);
              }}
            >
              {m.edit}
            </Button>
          ) : null
        }
      >
        {viewing && <EmployeeProfile employee={viewing} />}
      </Drawer>

      <Modal
        open={!!draft}
        width={720}
        title={draft ? `${m.edit} — ${draft.name}` : ""}
        okText={m.save}
        okButtonProps={{ loading: busy }}
        onOk={() => void save()}
        onCancel={() => setDraft(null)}
        destroyOnHidden
      >
        {draft && (
          <Space orientation="vertical" className="w-full">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Text type="secondary">{m.level}</Text>
                <Select<string>
                  allowClear
                  className="w-full"
                  value={draft.levelId ?? undefined}
                  onChange={(value) =>
                    setDraft({ ...draft, levelId: value ?? null })
                  }
                  options={levels
                    .filter(
                      (level) => level.active || level.id === draft.levelId,
                    )
                    .map((level) => ({
                      value: level.id,
                      label: `${level.code} ${level.name}`,
                    }))}
                />
              </div>
              <div>
                <Text type="secondary">{m.employmentType}</Text>
                <Select<string>
                  className="w-full"
                  value={draft.employmentType}
                  onChange={(value) =>
                    setDraft({ ...draft, employmentType: value })
                  }
                  options={Object.entries(m.employmentTypes).map(
                    ([value, label]) => ({
                      value,
                      label,
                    }),
                  )}
                />
              </div>
              <div>
                <Text type="secondary">{m.status}</Text>
                <Select<string>
                  className="w-full"
                  value={draft.status}
                  onChange={(value) => setDraft({ ...draft, status: value })}
                  options={Object.entries(m.statuses).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>
              <div>
                <Text type="secondary">{m.endDate}</Text>
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.endDate ? dayjs(draft.endDate) : null}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      endDate: value ? value.format("YYYY-MM-DD") : null,
                    })
                  }
                />
              </div>
            </div>
            <Text type="secondary">{m.note}</Text>
            <Input.TextArea
              rows={2}
              maxLength={1000}
              value={draft.note}
              onChange={(event) =>
                setDraft({ ...draft, note: event.target.value })
              }
            />
            <Text strong>{m.skills}</Text>
            {draft.skills.map((skill, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Select<string>
                  showSearch
                  optionFilterProp="label"
                  className="w-56"
                  value={skill.skillId}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      skills: draft.skills.map((row, at) =>
                        at === index ? { ...row, skillId: value } : row,
                      ),
                    })
                  }
                  options={activeSkills.map((option) => ({
                    value: option.id,
                    label: option.name,
                    disabled: draft.skills.some(
                      (row, at) => at !== index && row.skillId === option.id,
                    ),
                  }))}
                />
                <Select<number>
                  className="w-32"
                  value={skill.proficiency}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      skills: draft.skills.map((row, at) =>
                        at === index ? { ...row, proficiency: value } : row,
                      ),
                    })
                  }
                  options={[1, 2, 3].map((value) => ({
                    value,
                    label: `${value} ${m.proficiencies[value]}`,
                  }))}
                />
                <Input
                  className="w-36"
                  placeholder={m.certificate}
                  maxLength={200}
                  value={skill.certificate}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      skills: draft.skills.map((row, at) =>
                        at === index
                          ? { ...row, certificate: event.target.value }
                          : row,
                      ),
                    })
                  }
                />
                <DatePicker
                  className="w-36"
                  placeholder={m.certExpires}
                  format="DD/MM/YYYY"
                  value={
                    skill.certExpiresOn ? dayjs(skill.certExpiresOn) : null
                  }
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      skills: draft.skills.map((row, at) =>
                        at === index
                          ? {
                              ...row,
                              certExpiresOn: value
                                ? value.format("YYYY-MM-DD")
                                : null,
                            }
                          : row,
                      ),
                    })
                  }
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      skills: draft.skills.filter((_, at) => at !== index),
                    })
                  }
                />
              </div>
            ))}
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() =>
                setDraft({
                  ...draft,
                  skills: [
                    ...draft.skills,
                    { proficiency: 2, certificate: "", certExpiresOn: null },
                  ],
                })
              }
            >
              {m.addSkill}
            </Button>
          </Space>
        )}
      </Modal>

      <Modal
        open={!!skillDraft}
        title={skillDraft?.id ? m.edit : m.add}
        okText={m.save}
        okButtonProps={{
          loading: busy,
          disabled: !skillDraft?.code || !skillDraft?.name,
        }}
        onOk={() => void saveSkill()}
        onCancel={() => setSkillDraft(null)}
        destroyOnHidden
      >
        {skillDraft && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{m.skillCode}</Text>
            <Input
              value={skillDraft.code}
              maxLength={30}
              disabled={Boolean(skillDraft.id)}
              onChange={(event) =>
                setSkillDraft({
                  ...skillDraft,
                  code: event.target.value.toUpperCase(),
                })
              }
            />
            <Text type="secondary">{m.skillName}</Text>
            <Input
              value={skillDraft.name}
              maxLength={100}
              onChange={(event) =>
                setSkillDraft({ ...skillDraft, name: event.target.value })
              }
            />
            <Text type="secondary">{m.category}</Text>
            <Input
              value={skillDraft.category}
              maxLength={60}
              onChange={(event) =>
                setSkillDraft({ ...skillDraft, category: event.target.value })
              }
            />
            <InputNumber
              min={0}
              value={skillDraft.sortOrder}
              onChange={(value) =>
                setSkillDraft({ ...skillDraft, sortOrder: value ?? 0 })
              }
            />
            <Space>
              <Switch
                checked={skillDraft.active ?? true}
                onChange={(active) => setSkillDraft({ ...skillDraft, active })}
              />
              <Text>{m.active}</Text>
            </Space>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
