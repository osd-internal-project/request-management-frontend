"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
} from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { StaffMember } from "./employee-types";
import type { Entitlement, LeaveType } from "./leave-types";

const m = messages.hr.leave;

type Draft = {
  id: string | null;
  code: string;
  name: string;
  annualDays: number | null;
  active: boolean;
};

/**
 * CD-232 — HR's side of leave: the kinds of leave with their yearly
 * allowance, and a person's own allowance for a year where it differs.
 */
export function LeaveSettings({
  canManage,
  thisYear,
}: {
  canManage: boolean;
  thisYear: number;
}) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [types, setTypes] = useState<{
    version: number;
    items: LeaveType[] | null;
    error: string | null;
  } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [year, setYear] = useState(thisYear);
  const [entitlements, setEntitlements] = useState<{
    key: string;
    items: Entitlement[];
  } | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [grant, setGrant] = useState<{
    userId?: string;
    leaveTypeId?: string;
    days: number | null;
  }>({ days: null });
  const [busy, setBusy] = useState(false);
  const key = `${year}|${version}`;

  useEffect(() => {
    let live = true;
    void appApi<{ items: LeaveType[] }>("hr/leave-types").then((result) => {
      if (!live) return;
      setTypes(
        result.ok
          ? { version, items: result.data.items, error: null }
          : { version, items: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [version]);

  useEffect(() => {
    let live = true;
    const [y] = key.split("|");
    void appApi<{ items: Entitlement[] }>(
      `hr/leave-entitlements?year=${y}`,
    ).then((result) => {
      if (live && result.ok) setEntitlements({ key, items: result.data.items });
    });
    return () => {
      live = false;
    };
  }, [key]);

  useEffect(() => {
    void appApi<{ items: StaffMember[] }>("hr/staff").then((result) => {
      if (result.ok) setStaff(result.data.items);
    });
  }, []);

  const saveType = async () => {
    if (!draft) return;
    setBusy(true);
    const result = await appApi<LeaveType>(
      draft.id ? `hr/leave-types/${draft.id}` : "hr/leave-types",
      {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify({
          ...(draft.id ? {} : { code: draft.code }),
          name: draft.name,
          annual_days: draft.annualDays,
          active: draft.active,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.saved);
    setDraft(null);
    setVersion((value) => value + 1);
  };

  const saveGrant = async () => {
    if (!grant.userId || !grant.leaveTypeId || grant.days === null) return;
    setBusy(true);
    const result = await appApi<unknown>("hr/leave-entitlements", {
      method: "PUT",
      body: JSON.stringify({
        user_id: grant.userId,
        leave_type_id: grant.leaveTypeId,
        year,
        days: grant.days,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.saved);
    setGrant({ days: null });
    setVersion((value) => value + 1);
  };

  if (types?.error) return <Alert type="error" showIcon title={types.error} />;
  const rows = types?.items ?? [];
  const editing = (id: string | null) => draft && draft.id === id;

  return (
    <div className="space-y-3">
      <Card
        title={m.typesTitle}
        extra={
          canManage && !draft ? (
            <Button
              size="small"
              onClick={() =>
                setDraft({
                  id: null,
                  code: "",
                  name: "",
                  annualDays: null,
                  active: true,
                })
              }
            >
              {m.addType}
            </Button>
          ) : null
        }
      >
        <Table<LeaveType | Draft>
          rowKey={(row) => row.id ?? "new"}
          size="small"
          loading={!types}
          pagination={false}
          dataSource={[...rows, ...(draft && !draft.id ? [draft] : [])]}
          columns={[
            {
              title: m.code,
              dataIndex: "code",
              width: 140,
              render: (code: string, row) =>
                editing(row.id) && !row.id ? (
                  <Input
                    size="small"
                    maxLength={20}
                    value={draft?.code}
                    onChange={(e) =>
                      setDraft((d) => d && { ...d, code: e.target.value })
                    }
                  />
                ) : (
                  code
                ),
            },
            {
              title: m.typeName,
              dataIndex: "name",
              render: (name: string, row) =>
                editing(row.id) ? (
                  <Input
                    size="small"
                    maxLength={100}
                    value={draft?.name}
                    onChange={(e) =>
                      setDraft((d) => d && { ...d, name: e.target.value })
                    }
                  />
                ) : (
                  name
                ),
            },
            {
              title: m.annualDays,
              dataIndex: "annualDays",
              width: 170,
              render: (value: number | null, row) =>
                editing(row.id) ? (
                  <InputNumber
                    size="small"
                    min={0}
                    max={365}
                    step={0.5}
                    placeholder={m.unlimited}
                    value={draft?.annualDays}
                    onChange={(v) =>
                      setDraft((d) => d && { ...d, annualDays: v ?? null })
                    }
                  />
                ) : value === null ? (
                  <Text type="secondary">{m.unlimited}</Text>
                ) : (
                  value
                ),
            },
            {
              title: m.active,
              dataIndex: "active",
              width: 90,
              render: (active: boolean, row) => (
                <Switch
                  size="small"
                  checked={editing(row.id) ? draft?.active : active}
                  disabled={!editing(row.id)}
                  onChange={(v) => setDraft((d) => d && { ...d, active: v })}
                />
              ),
            },
            ...(canManage
              ? [
                  {
                    key: "edit",
                    width: 150,
                    align: "right" as const,
                    render: (_: unknown, row: LeaveType | Draft) =>
                      editing(row.id) ? (
                        <Space>
                          <Button size="small" onClick={() => setDraft(null)}>
                            {m.cancelEdit}
                          </Button>
                          <Button
                            size="small"
                            type="primary"
                            loading={busy}
                            onClick={() => void saveType()}
                          >
                            {m.save}
                          </Button>
                        </Space>
                      ) : !draft ? (
                        <Button
                          size="small"
                          onClick={() =>
                            setDraft({
                              id: row.id,
                              code: row.code,
                              name: row.name,
                              annualDays: row.annualDays,
                              active: row.active,
                            })
                          }
                        >
                          {m.edit}
                        </Button>
                      ) : null,
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Card
        title={m.entitlementsTitle}
        extra={
          <Select
            size="small"
            value={year}
            onChange={setYear}
            options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({
              value: y,
              label: `${y + 543}`,
            }))}
          />
        }
      >
        <Text type="secondary" className="mb-3 block text-xs">
          {m.entitlementsHint}
        </Text>
        {canManage ? (
          <Space wrap className="mb-3">
            <Select
              showSearch={{ optionFilterProp: "label" }}
              className="w-60"
              placeholder={m.person}
              value={grant.userId}
              onChange={(userId: string) => setGrant((g) => ({ ...g, userId }))}
              options={staff.map((person) => ({
                value: person.userId,
                label: person.displayName,
              }))}
            />
            <Select
              className="w-44"
              placeholder={m.type}
              value={grant.leaveTypeId}
              onChange={(leaveTypeId: string) =>
                setGrant((g) => ({ ...g, leaveTypeId }))
              }
              options={rows
                .filter((type) => type.active)
                .map((type) => ({ value: type.id, label: type.name }))}
            />
            <InputNumber
              min={0}
              max={365}
              step={0.5}
              placeholder={m.days}
              value={grant.days}
              onChange={(days) => setGrant((g) => ({ ...g, days }))}
            />
            <Button
              type="primary"
              loading={busy}
              disabled={
                !grant.userId || !grant.leaveTypeId || grant.days === null
              }
              onClick={() => void saveGrant()}
            >
              {m.save}
            </Button>
          </Space>
        ) : null}
        <Table<Entitlement>
          rowKey="id"
          size="small"
          loading={entitlements?.key !== key}
          dataSource={entitlements?.items ?? []}
          pagination={false}
          locale={{ emptyText: m.noEntitlements }}
          columns={[
            { title: m.person, dataIndex: "name" },
            { title: m.type, dataIndex: "leaveType" },
            { title: m.daysCol, dataIndex: "days", align: "right" },
          ]}
        />
      </Card>
    </div>
  );
}
