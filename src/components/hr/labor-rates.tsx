"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.hr.rates;

interface HrItem {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

interface Rate {
  id: string;
  levelId: string;
  workTypeId: string;
  costPerManday: number;
  sellPerManday: number | null;
  validFrom: string;
  validTo: string | null;
  note: string;
  current: boolean;
  upcoming: boolean;
}

interface Register {
  today: string;
  levels: HrItem[];
  work_types: HrItem[];
  rates: Rate[];
}

type ItemKind = "levels" | "work-types";

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2 });
const thaiDate = (value: string) => dayjs(value).format("DD/MM/YYYY");

/**
 * CD-207 — ต้นทุนบุคลากร: levels, work types and the cost per manday of each
 * pair over time. HR keeps it (`hr.rate.manage`); Pricing and executives
 * read it (`hr.rate.read`).
 */
export function LaborRates({ canManage }: { canManage: boolean }) {
  const { message } = App.useApp();
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: number;
    data: Register | null;
    error: string | null;
  } | null>(null);
  const [item, setItem] = useState<{
    kind: ItemKind;
    id: string | null;
    code: string;
    name: string;
    sortOrder: number;
    active: boolean;
  } | null>(null);
  const [rate, setRate] = useState<{
    levelId?: string;
    workTypeId?: string;
    cost: number | null;
    sell: number | null;
    from: Dayjs | null;
    note: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void appApi<Register>("hr/labor-rates").then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { key: reload, data: result.data, error: null }
          : { key: reload, data: null, error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [reload]);

  async function send(path: string, init: RequestInit, done: string) {
    setBusy(true);
    const result = await appApi<Register>(path, init);
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return false;
    }
    void message.success(done);
    setReload((value) => value + 1);
    return true;
  }

  async function saveItem() {
    if (!item) return;
    const ok = await send(
      item.id ? `hr/${item.kind}/${item.id}` : `hr/${item.kind}`,
      {
        method: item.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(item.id ? {} : { code: item.code.trim() }),
          name: item.name.trim(),
          sort_order: item.sortOrder,
          active: item.active,
        }),
      },
      m.saved,
    );
    if (ok) setItem(null);
  }

  async function saveRate() {
    if (!rate) return;
    const ok = await send(
      "hr/labor-rates",
      {
        method: "POST",
        body: JSON.stringify({
          level_id: rate.levelId,
          work_type_id: rate.workTypeId,
          cost_per_manday: rate.cost,
          sell_per_manday: rate.sell ?? undefined,
          valid_from: rate.from?.format("YYYY-MM-DD"),
          note: rate.note.trim() || undefined,
        }),
      },
      m.saved,
    );
    if (ok) setRate(null);
  }

  if (loaded?.error)
    return <Alert type="error" showIcon title={loaded.error} />;
  const data = loaded?.data;
  if (!data) return <Skeleton active />;

  const levelName = new Map(
    data.levels.map((l) => [l.id, `${l.code} ${l.name}`]),
  );
  const typeName = new Map(data.work_types.map((t) => [t.id, t.name]));
  const activeTypes = data.work_types.filter((type) => type.active);

  const itemTable = (kind: ItemKind, rows: HrItem[], title: string) => (
    <Card
      size="small"
      title={title}
      extra={
        canManage && (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              setItem({
                kind,
                id: null,
                code: "",
                name: "",
                sortOrder: (rows.length + 1) * 10,
                active: true,
              })
            }
          >
            {m.add}
          </Button>
        )
      }
    >
      <Table<HrItem>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        columns={[
          { title: m.code, dataIndex: "code", width: 120 },
          { title: m.name, dataIndex: "name" },
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
                  render: (_: unknown, row: HrItem) => (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      aria-label={m.edit}
                      onClick={() => setItem({ kind, ...row })}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            {m.title}
          </Title>
          <Text type="secondary">{m.hint}</Text>
        </div>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!data.levels.length || !data.work_types.length}
            onClick={() =>
              setRate({
                cost: null,
                sell: null,
                from: dayjs().add(1, "day"),
                note: "",
              })
            }
          >
            {m.addRate}
          </Button>
        )}
      </div>

      <Card size="small" title={m.current}>
        <Table<HrItem>
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 200 + activeTypes.length * 150 }}
          dataSource={data.levels.filter((level) => level.active)}
          locale={{ emptyText: m.empty }}
          columns={[
            {
              title: m.level,
              key: "level",
              width: 200,
              render: (_: unknown, level) => `${level.code} ${level.name}`,
            },
            ...activeTypes.map((type) => ({
              title: type.name,
              key: type.id,
              width: 150,
              align: "right" as const,
              render: (_: unknown, level: HrItem) => {
                const pair = data.rates.filter(
                  (row) =>
                    row.levelId === level.id && row.workTypeId === type.id,
                );
                const current = pair.find((row) => row.current);
                const next = pair.find((row) => row.upcoming);
                return (
                  <>
                    <div>{current ? money(current.costPerManday) : m.none}</div>
                    {next && (
                      <Tag color="blue" className="mt-1">
                        {m.upcomingTag(
                          money(next.costPerManday),
                          thaiDate(next.validFrom),
                        )}
                      </Tag>
                    )}
                  </>
                );
              },
            })),
          ]}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {itemTable("levels", data.levels, m.levels)}
        {itemTable("work-types", data.work_types, m.workTypes)}
      </div>

      <Card size="small" title={m.history}>
        <Table<Rate>
          rowKey="id"
          size="small"
          dataSource={data.rates}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: m.empty }}
          scroll={{ x: 900 }}
          columns={[
            {
              title: m.level,
              key: "level",
              render: (_: unknown, row) => levelName.get(row.levelId) ?? "—",
            },
            {
              title: m.workType,
              key: "type",
              render: (_: unknown, row) => typeName.get(row.workTypeId) ?? "—",
            },
            {
              title: m.cost,
              dataIndex: "costPerManday",
              align: "right",
              render: (value: number) => money(value),
            },
            {
              title: m.sell,
              dataIndex: "sellPerManday",
              align: "right",
              render: (value: number | null) =>
                value === null ? m.none : money(value),
            },
            {
              title: m.validFrom,
              dataIndex: "validFrom",
              render: (value: string) => thaiDate(value),
            },
            {
              title: m.validTo,
              dataIndex: "validTo",
              render: (value: string | null) =>
                value ? thaiDate(value) : m.none,
            },
            {
              key: "status",
              render: (_: unknown, row) =>
                row.current ? (
                  <Tag color="green">{m.statusCurrent}</Tag>
                ) : row.upcoming ? (
                  <Tag color="blue">{m.statusUpcoming}</Tag>
                ) : (
                  <Tag>{m.statusPast}</Tag>
                ),
            },
            { title: m.note, dataIndex: "note", ellipsis: true },
            ...(canManage
              ? [
                  {
                    key: "withdraw",
                    width: 70,
                    render: (_: unknown, row: Rate) =>
                      row.upcoming ? (
                        <Popconfirm
                          title={m.withdrawConfirm}
                          onConfirm={() =>
                            void send(
                              `hr/labor-rates/${row.id}`,
                              { method: "DELETE" },
                              m.withdrawn,
                            )
                          }
                        >
                          <Button type="link" size="small" danger>
                            {m.withdraw}
                          </Button>
                        </Popconfirm>
                      ) : null,
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Modal
        open={!!item}
        title={item?.id ? m.edit : m.add}
        okText={m.save}
        okButtonProps={{
          loading: busy,
          disabled: !item?.code.trim() || !item?.name.trim(),
        }}
        onOk={() => void saveItem()}
        onCancel={() => setItem(null)}
        destroyOnHidden
      >
        {item && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{m.code}</Text>
            <Input
              value={item.code}
              maxLength={20}
              disabled={Boolean(item.id)}
              onChange={(event) =>
                setItem({ ...item, code: event.target.value.toUpperCase() })
              }
            />
            <Text type="secondary">{m.name}</Text>
            <Input
              value={item.name}
              maxLength={100}
              onChange={(event) =>
                setItem({ ...item, name: event.target.value })
              }
            />
            <Text type="secondary">{m.sortOrder}</Text>
            <InputNumber
              min={0}
              value={item.sortOrder}
              onChange={(value) => setItem({ ...item, sortOrder: value ?? 0 })}
            />
            <Space>
              <Switch
                checked={item.active}
                onChange={(active) => setItem({ ...item, active })}
              />
              <Text>{m.active}</Text>
            </Space>
          </Space>
        )}
      </Modal>

      <Modal
        open={!!rate}
        title={m.addRate}
        okText={m.save}
        okButtonProps={{
          loading: busy,
          disabled:
            !rate?.levelId ||
            !rate?.workTypeId ||
            rate?.cost === null ||
            !rate?.from,
        }}
        onOk={() => void saveRate()}
        onCancel={() => setRate(null)}
        destroyOnHidden
      >
        {rate && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{m.level}</Text>
            <Select<string>
              className="w-full"
              value={rate.levelId}
              onChange={(levelId) => setRate({ ...rate, levelId })}
              options={data.levels
                .filter((level) => level.active)
                .map((level) => ({
                  value: level.id,
                  label: `${level.code} ${level.name}`,
                }))}
            />
            <Text type="secondary">{m.workType}</Text>
            <Select<string>
              className="w-full"
              value={rate.workTypeId}
              onChange={(workTypeId) => setRate({ ...rate, workTypeId })}
              options={activeTypes.map((type) => ({
                value: type.id,
                label: type.name,
              }))}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Text type="secondary">{m.cost}</Text>
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={2}
                  value={rate.cost}
                  onChange={(cost) => setRate({ ...rate, cost })}
                />
              </div>
              <div>
                <Text type="secondary">{m.sell}</Text>
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={2}
                  value={rate.sell}
                  onChange={(sell) => setRate({ ...rate, sell })}
                />
              </div>
            </div>
            <Text type="secondary">{m.validFrom}</Text>
            <DatePicker
              className="w-full"
              value={rate.from}
              format="DD/MM/YYYY"
              onChange={(from) => setRate({ ...rate, from })}
            />
            <Text type="secondary">{m.note}</Text>
            <Input
              value={rate.note}
              maxLength={500}
              onChange={(event) =>
                setRate({ ...rate, note: event.target.value })
              }
            />
          </Space>
        )}
      </Modal>
    </Space>
  );
}
