"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type { OnCallRota, OnCallShift } from "@/lib/api/service";
import { messages } from "@/lib/messages";

const m = messages.service.assets.onCall;

interface Editing {
  id: string | null;
  range: [Dayjs, Dayjs] | null;
  primary: string | null;
  backup: string | null;
  note: string;
}

const format = (value: string) => dayjs(value).format("DD/MM/YYYY");

/**
 * CD-241 — who answers out of hours: spans of days with a primary and a
 * backup, and whom a case raised out of hours right now would reach.
 */
export function OnCallRotaView({
  canManage,
  people,
}: {
  readonly canManage: boolean;
  readonly people: readonly { id: string; name: string }[];
}) {
  const { message } = App.useApp();
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<{
    reload: number;
    rota: OnCallRota | null;
    error: string | null;
  } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<OnCallRota>("service-on-call").then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { reload, rota: result.data, error: null }
          : { reload, rota: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [reload]);

  const options = people.map((person) => ({
    value: person.id,
    label: person.name,
  }));

  function startEdit(row: OnCallShift | null) {
    setError(null);
    setEditing(
      row
        ? {
            id: row.id,
            range: [dayjs(row.startOn), dayjs(row.endOn)],
            primary: row.primaryUserId,
            backup: row.backupUserId,
            note: row.note ?? "",
          }
        : { id: null, range: null, primary: null, backup: null, note: "" },
    );
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const result = await appApi<OnCallShift>(
      editing.id ? `service-on-call/${editing.id}` : "service-on-call",
      {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_on: editing.range?.[0].format("YYYY-MM-DD") ?? "",
          end_on: editing.range?.[1].format("YYYY-MM-DD") ?? "",
          primary_user_id: editing.primary ?? "",
          backup_user_id: editing.backup,
          note: editing.note.trim() || null,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setEditing(null);
    setReload((n) => n + 1);
  }

  async function remove(id: string) {
    const result = await appApi<{ id: string }>(`service-on-call/${id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setReload((n) => n + 1);
  }

  const rota = loaded?.rota ?? null;

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      {loaded?.error && (
        <Alert className="mb-3" type="error" showIcon title={loaded.error} />
      )}
      {rota && (
        <Alert
          className="mb-3"
          type={rota.now.onCall ? "info" : "warning"}
          showIcon
          title={rota.now.outOfHours ? m.nowOut : m.nowIn}
          description={
            rota.now.onCall
              ? m.onCallNow(
                  rota.now.onCall.name,
                  m.levels[rota.now.onCall.level],
                )
              : m.nobody
          }
        />
      )}
      {canManage && (
        <Space className="mb-3">
          <Button type="primary" onClick={() => startEdit(null)}>
            {m.add}
          </Button>
          {!people.length && (
            <Text type="warning" className="text-xs">
              {m.noPeople}
            </Text>
          )}
        </Space>
      )}
      <Table<OnCallShift>
        rowKey="id"
        size="small"
        loading={!loaded || loaded.reload !== reload}
        dataSource={rota?.items ?? []}
        pagination={false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 700 }}
        columns={[
          {
            title: m.columns.period,
            width: 220,
            render: (_: unknown, row) => (
              <span>
                {format(row.startOn)} – {format(row.endOn)}{" "}
                {rota?.now.shift?.id === row.id && <Tag color="blue">●</Tag>}
              </span>
            ),
          },
          {
            title: m.columns.primary,
            dataIndex: "primaryName",
          },
          {
            title: m.columns.backup,
            render: (_: unknown, row) => row.backupName ?? "—",
          },
          {
            title: m.columns.note,
            render: (_: unknown, row) => row.note ?? "",
          },
          ...(canManage
            ? [
                {
                  title: "",
                  width: 140,
                  render: (_: unknown, row: OnCallShift) => (
                    <Space>
                      <Button size="small" onClick={() => startEdit(row)}>
                        {m.edit}
                      </Button>
                      <Popconfirm
                        title={m.removeConfirm}
                        onConfirm={() => void remove(row.id)}
                      >
                        <Button size="small" danger>
                          {m.remove}
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={editing !== null}
        title={editing?.id ? m.edit : m.add}
        onCancel={() => setEditing(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.period}
              <DatePicker.RangePicker
                className="w-full"
                format="DD/MM/YYYY"
                value={editing.range}
                onChange={(value) =>
                  setEditing({
                    ...editing,
                    range: value?.[0] && value[1] ? [value[0], value[1]] : null,
                  })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.primary}
              <Select
                className="w-full"
                showSearch={{ optionFilterProp: "label" }}
                value={editing.primary ?? undefined}
                options={options}
                onChange={(value: string) =>
                  setEditing({ ...editing, primary: value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.backup}
              <Select
                className="w-full"
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                value={editing.backup ?? undefined}
                options={options.filter(
                  (option) => option.value !== editing.primary,
                )}
                onChange={(value?: string) =>
                  setEditing({ ...editing, backup: value ?? null })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.note}
              <Input
                value={editing.note}
                maxLength={500}
                onChange={(event) =>
                  setEditing({ ...editing, note: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
