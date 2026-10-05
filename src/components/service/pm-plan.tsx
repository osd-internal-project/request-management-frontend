"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { PmPlanView, PmRound } from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.service.assets.pm;

const STATUS_COLOR: Record<string, string> = {
  opened: "blue",
  done: "green",
  failed: "red",
  skipped: "default",
};

/** A round's state, late or not. */
export function PmRoundStatus({ round }: { readonly round: PmRound }) {
  return (
    <Space size={4} wrap>
      <Tag color={STATUS_COLOR[round.status]}>{m.status[round.status]}</Tag>
      {round.overdue && <Tag color="red">{m.overdue}</Tag>}
      {round.openError && (
        <Text type="danger" className="text-xs">
          {round.openError}
        </Text>
      )}
    </Space>
  );
}

/** Open now / skip, for a round not yet done. */
export function PmRoundActions({
  round,
  onDone,
}: {
  readonly round: PmRound;
  readonly onDone: () => void;
}) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState<string | null>(null);

  async function send(path: string, body?: unknown) {
    setBusy(true);
    const result = await appApi<PmRound>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return false;
    }
    message.success(m.saved);
    onDone();
    return true;
  }

  if (["done", "skipped", "opening"].includes(round.status)) return null;
  return (
    <Space size={4}>
      {["planned", "failed"].includes(round.status) && (
        <Button
          size="small"
          loading={busy}
          onClick={() => void send(`service-pm/rounds/${round.id}/open`)}
        >
          {m.open}
        </Button>
      )}
      <Button size="small" onClick={() => setSkipping("")}>
        {m.skip}
      </Button>
      <Modal
        open={skipping !== null}
        title={m.skip}
        onCancel={() => setSkipping(null)}
        confirmLoading={busy}
        okButtonProps={{ disabled: !skipping?.trim() }}
        onOk={() =>
          void send(`service-pm/rounds/${round.id}/skip`, {
            reason: skipping ?? "",
          }).then((ok) => ok && setSkipping(null))
        }
        destroyOnHidden
      >
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder={m.skipReason}
          value={skipping ?? ""}
          onChange={(event) => setSkipping(event.target.value)}
        />
      </Modal>
    </Space>
  );
}

/**
 * CD-244 — in a service contract's drawer: its PM plan (how often, how far
 * ahead, whose) and its rounds.
 */
export function PmPlanCard({
  entitlementId,
  canManage,
  people,
}: {
  readonly entitlementId: string;
  readonly canManage: boolean;
  readonly people: readonly { id: string; name: string }[];
}) {
  const { message } = App.useApp();
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<PmPlanView | null>(null);
  const [form, setForm] = useState<{
    interval: string;
    leadDays: number;
    owner: string | null;
    active: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<PmPlanView>(`service-pm/plans/${entitlementId}`).then(
      (result) => {
        if (!live) return;
        if (result.ok) setView(result.data);
        else setError(result.message);
      },
    );
    return () => {
      live = false;
    };
  }, [entitlementId, reload]);

  async function save() {
    if (!form) return;
    setBusy(true);
    setError(null);
    const result = await appApi<PmPlanView>(
      `service-pm/plans/${entitlementId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval: form.interval,
          lead_days: form.leadDays,
          owner_user_id: form.owner ?? "",
          active: form.active,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setForm(null);
    setView(result.data);
  }

  const editable = canManage && people.length > 0;

  return (
    <Card size="small" className="mt-4" title={m.title}>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {view?.plan ? (
        <Text className="block text-sm">
          {m.summary(
            m.intervals[view.plan.interval],
            view.plan.leadDays,
            view.plan.ownerName,
          )}
          {!view.plan.active && <Tag className="ml-1">{m.active} ✕</Tag>}
        </Text>
      ) : (
        <Text type="secondary" className="block text-xs">
          {m.noPlan}
        </Text>
      )}
      {editable &&
        (form ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block text-xs">
              {m.interval}
              <Select
                className="w-full"
                value={form.interval}
                options={Object.entries(m.intervals).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(value: string) =>
                  setForm({ ...form, interval: value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.leadDays}
              <InputNumber
                className="w-full"
                min={0}
                max={90}
                value={form.leadDays}
                onChange={(value) =>
                  setForm({ ...form, leadDays: Number(value ?? 14) })
                }
              />
            </label>
            <label className="block text-xs">
              {m.owner}
              <Select
                className="w-full"
                showSearch={{ optionFilterProp: "label" }}
                value={form.owner ?? undefined}
                options={people.map((person) => ({
                  value: person.id,
                  label: person.name,
                }))}
                onChange={(value: string) => setForm({ ...form, owner: value })}
              />
            </label>
            <Checkbox
              className="self-end"
              checked={form.active}
              onChange={(event) =>
                setForm({ ...form, active: event.target.checked })
              }
            >
              {m.active}
            </Checkbox>
            <Space>
              <Button
                type="primary"
                size="small"
                loading={busy}
                disabled={!form.owner}
                onClick={() => void save()}
              >
                {m.save}
              </Button>
              <Button size="small" onClick={() => setForm(null)}>
                ✕
              </Button>
            </Space>
          </div>
        ) : (
          <Button
            className="mt-2"
            size="small"
            onClick={() =>
              setForm({
                interval: view?.plan?.interval ?? "quarterly",
                leadDays: view?.plan?.leadDays ?? 14,
                owner: view?.plan?.ownerUserId ?? null,
                active: view?.plan?.active ?? true,
              })
            }
          >
            {m.save}
          </Button>
        ))}
      {view && view.rounds.length > 0 && (
        <Table<PmRound>
          className="mt-2"
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={view.rounds}
          columns={[
            {
              title: m.columns.round,
              width: 80,
              render: (_: unknown, row) => m.round(row.roundNo),
            },
            {
              title: m.columns.due,
              width: 100,
              render: (_: unknown, row) =>
                dayjs(row.dueOn).format("DD/MM/YYYY"),
            },
            {
              title: m.columns.status,
              render: (_: unknown, row) => (
                <span>
                  <PmRoundStatus round={row} />
                  {row.requestId && (
                    <Link href={ROUTES.requestDetail(row.requestId)}>
                      {row.request?.requestNo ?? ""}
                    </Link>
                  )}
                </span>
              ),
            },
            ...(canManage
              ? [
                  {
                    title: "",
                    width: 170,
                    render: (_: unknown, row: PmRound) => (
                      <PmRoundActions
                        round={row}
                        onDone={() => setReload((n) => n + 1)}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
    </Card>
  );
}

/** CD-244 — rounds of every plan: coming due, late, done. */
export function PmRounds({ canManage }: { readonly canManage: boolean }) {
  const [state, setState] = useState("upcoming");
  const [reload, setReload] = useState(0);
  const key = `${state}|${reload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    rows: PmRound[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    const [current] = key.split("|");
    void appApi<PmRound[]>(`service-pm/rounds?state=${current}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { key, rows: result.data, error: null }
            : { key, rows: [], error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  const rows = loaded?.key === key ? loaded.rows : [];

  return (
    <Card title={m.listTitle}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      <Select
        className="mb-3"
        style={{ width: 200 }}
        value={state}
        onChange={setState}
        options={Object.entries(m.states).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      {loaded?.key === key && loaded.error && (
        <Alert className="mb-2" type="error" showIcon title={loaded.error} />
      )}
      <Table<PmRound>
        rowKey="id"
        size="small"
        loading={!loaded || loaded.key !== key}
        dataSource={rows}
        pagination={rows.length > 30 ? { pageSize: 30 } : false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: 1000 }}
        columns={[
          {
            title: m.columns.due,
            width: 110,
            render: (_: unknown, row) => dayjs(row.dueOn).format("DD/MM/YYYY"),
          },
          {
            title: m.columns.customer,
            width: 220,
            render: (_: unknown, row) =>
              row.customer ? `${row.customer.code} · ${row.customer.name}` : "",
          },
          {
            title: m.columns.contract,
            render: (_: unknown, row) =>
              `${row.entitlementTitle} · ${m.round(row.roundNo)}`,
          },
          {
            title: m.columns.status,
            width: 220,
            render: (_: unknown, row) => <PmRoundStatus round={row} />,
          },
          {
            title: m.columns.request,
            width: 160,
            render: (_: unknown, row) =>
              row.requestId ? (
                <Link href={ROUTES.requestDetail(row.requestId)}>
                  {row.request?.requestNo ?? row.requestId.slice(0, 8)}
                </Link>
              ) : null,
          },
          ...(canManage
            ? [
                {
                  title: "",
                  width: 180,
                  render: (_: unknown, row: PmRound) => (
                    <PmRoundActions
                      round={row}
                      onDone={() => setReload((n) => n + 1)}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
