"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import {
  getMarkupOptions,
  WORK_TYPES,
  type MarkupOptions,
  type MarkupRule,
  type WorkType,
} from "@/lib/api/pricing/client";
import { messages } from "@/lib/messages";

const mm = messages.pricing.markup;
const workTypes = messages.sales.quotations.detail.workTypes;

interface Draft {
  id?: string;
  priority: number | null;
  workType: WorkType | null;
  productGroupCode: string | null;
  segmentValueId: string | null;
  markupPct: number | null;
  note: string;
  active: boolean;
}

/**
 * CD-200 — markup rules in the order they are tried. Empty conditions match
 * anything; the lowest number wins, a tie goes to the most specific rule.
 */
export function MarkupList({
  rows,
  canManage,
}: {
  rows: MarkupRule[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [options, setOptions] = useState<MarkupOptions | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(next: Draft) {
    setDraft(next);
    if (!options) {
      const result = await getMarkupOptions();
      if (result.ok) setOptions(result.data);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = JSON.stringify({
      priority: draft.priority ?? 100,
      work_type: draft.workType,
      product_group_code: draft.productGroupCode,
      segment_value_id: draft.segmentValueId,
      markup_pct: draft.markupPct,
      note: draft.note,
      active: draft.active,
    });
    const result = draft.id
      ? await appApi(`pricing/markup-rules/${draft.id}`, {
          method: "PATCH",
          body,
        })
      : await appApi("pricing/markup-rules", { method: "POST", body });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(mm.saved);
    setDraft(null);
    router.refresh();
  }

  async function remove(id: string) {
    const result = await appApi(`pricing/markup-rules/${id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(mm.removed);
    router.refresh();
  }

  const any = <Text type="secondary">{mm.any}</Text>;

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={3} className="!mb-1">
            {mm.title}
          </Title>
          <Text type="secondary">{mm.hint}</Text>
        </div>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              void open({
                priority: 100,
                workType: null,
                productGroupCode: null,
                segmentValueId: null,
                markupPct: null,
                note: "",
                active: true,
              })
            }
          >
            {mm.add}
          </Button>
        )}
      </div>
      <Card>
        <Table<MarkupRule>
          rowKey="id"
          size="small"
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: mm.empty }}
          scroll={{ x: 760 }}
          columns={[
            { title: mm.priority, dataIndex: "priority", width: 80 },
            {
              title: mm.workType,
              dataIndex: "workType",
              render: (value: string | null) =>
                value ? workTypes[value] : any,
            },
            {
              title: mm.group,
              key: "group",
              render: (_: unknown, row) => row.productGroupName ?? any,
            },
            {
              title: mm.segment,
              key: "segment",
              render: (_: unknown, row) => row.segmentLabel ?? any,
            },
            {
              title: mm.markupPct,
              dataIndex: "markupPct",
              width: 100,
              align: "right",
              render: (value: number) => `${value}%`,
            },
            {
              title: mm.active,
              dataIndex: "active",
              width: 80,
              render: (value: boolean) =>
                value ? (
                  <Tag color="green">{mm.active}</Tag>
                ) : (
                  <Tag>{mm.inactive}</Tag>
                ),
            },
            { title: mm.note, dataIndex: "note", ellipsis: true },
            ...(canManage
              ? [
                  {
                    key: "actions",
                    width: 90,
                    render: (_: unknown, row: MarkupRule) => (
                      <Space size={0}>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          aria-label={mm.edit}
                          onClick={() =>
                            void open({
                              id: row.id,
                              priority: row.priority,
                              workType: row.workType,
                              productGroupCode: row.productGroupCode,
                              segmentValueId: row.segmentValueId,
                              markupPct: row.markupPct,
                              note: row.note,
                              active: row.active,
                            })
                          }
                        />
                        <Popconfirm
                          title={mm.remove}
                          onConfirm={() => void remove(row.id)}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Modal
        open={!!draft}
        title={draft?.id ? mm.edit : mm.add}
        okText={mm.save}
        okButtonProps={{
          loading: busy,
          disabled: draft?.markupPct === null || draft?.markupPct === undefined,
        }}
        onOk={() => void save()}
        onCancel={() => setDraft(null)}
        destroyOnHidden
      >
        {draft && (
          <Space orientation="vertical" className="w-full">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Text type="secondary">{mm.priority}</Text>
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={0}
                  value={draft.priority}
                  onChange={(priority) => setDraft({ ...draft, priority })}
                />
              </div>
              <div>
                <Text type="secondary">{mm.markupPct}</Text>
                <InputNumber
                  className="w-full"
                  min={0}
                  max={1000}
                  precision={2}
                  value={draft.markupPct}
                  onChange={(markupPct) => setDraft({ ...draft, markupPct })}
                />
              </div>
            </div>
            <div>
              <Text type="secondary">{mm.workType}</Text>
              <Select<WorkType>
                className="w-full"
                allowClear
                placeholder={mm.any}
                value={draft.workType ?? undefined}
                onChange={(workType) =>
                  setDraft({ ...draft, workType: workType ?? null })
                }
                options={WORK_TYPES.map((value) => ({
                  value,
                  label: workTypes[value],
                }))}
              />
            </div>
            <div>
              <Text type="secondary">{mm.group}</Text>
              <Select<string>
                className="w-full"
                allowClear
                placeholder={mm.any}
                loading={!options}
                value={draft.productGroupCode ?? undefined}
                onChange={(code) =>
                  setDraft({ ...draft, productGroupCode: code ?? null })
                }
                options={(options?.groups ?? []).map((group) => ({
                  value: group.code,
                  label: `${group.code} · ${group.name}`,
                }))}
              />
            </div>
            <div>
              <Text type="secondary">{mm.segment}</Text>
              <Select<string>
                className="w-full"
                allowClear
                placeholder={mm.any}
                loading={!options}
                value={draft.segmentValueId ?? undefined}
                onChange={(id) =>
                  setDraft({ ...draft, segmentValueId: id ?? null })
                }
                options={(options?.segments ?? []).map((segment) => ({
                  value: segment.id,
                  label: segment.label,
                }))}
              />
            </div>
            <div>
              <Text type="secondary">{mm.note}</Text>
              <Input
                maxLength={500}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </div>
            <Space>
              <Switch
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
              />
              <Text>{mm.active}</Text>
            </Space>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
