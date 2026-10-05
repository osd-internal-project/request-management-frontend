"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { KbCategory } from "./kb-types";

const m = messages.kb.categories;

interface Editing {
  id: string | null;
  name: string;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  reviewMonths: number | null;
}

/** CD-259 — the knowledge owners keep the process categories (two levels). */
export function KbCategories() {
  const { message } = App.useApp();
  const [items, setItems] = useState<KbCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void appApi<{ items: KbCategory[] }>("kb/categories").then((r) =>
      r.ok ? setItems(r.data.items) : setError(r.message),
    );
  }, []);

  async function save() {
    if (!editing) return;
    setBusy(true);
    const r = await appApi<{ items: KbCategory[] }>(
      editing.id ? `kb/categories/${editing.id}` : "kb/categories",
      {
        method: editing.id ? "PUT" : "POST",
        body: JSON.stringify({
          name: editing.name,
          parent_id: editing.parentId,
          sort_order: editing.sortOrder,
          active: editing.active,
          review_months: editing.reviewMonths,
        }),
      },
    );
    setBusy(false);
    if (!r.ok) {
      void message.error(r.message);
      return;
    }
    setItems(r.data.items);
    setEditing(null);
    void message.success(m.saved);
  }

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!items) return <Skeleton active />;
  const byId = new Map(items.map((c) => [c.id, c]));
  const rows = [...items].sort((a, b) => {
    const key = (c: KbCategory) =>
      c.parentId
        ? `${byId.get(c.parentId)?.name ?? ""}\u0001${c.name}`
        : c.name;
    return key(a).localeCompare(key(b), "th");
  });

  return (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        className="mb-3"
        onClick={() =>
          setEditing({
            id: null,
            name: "",
            parentId: null,
            sortOrder: 0,
            active: true,
            reviewMonths: null,
          })
        }
      >
        {m.add}
      </Button>
      <Table<KbCategory>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={rows}
        columns={[
          {
            title: m.name,
            key: "name",
            render: (_, c) =>
              c.parentId ? (
                <span className="pl-6">↳ {c.name}</span>
              ) : (
                <strong>{c.name}</strong>
              ),
          },
          { title: m.order, dataIndex: "sortOrder", width: 80 },
          {
            title: messages.kb.review.reviewMonths,
            dataIndex: "reviewMonths",
            width: 140,
            render: (v: number | null) => v ?? "—",
          },
          { title: m.articles, dataIndex: "articles", width: 90 },
          {
            title: m.active,
            dataIndex: "active",
            width: 90,
            render: (v: boolean) =>
              v ? <Tag color="success">✓</Tag> : <Tag>—</Tag>,
          },
          {
            key: "edit",
            width: 80,
            render: (_, c) => (
              <Button
                size="small"
                onClick={() =>
                  setEditing({
                    id: c.id,
                    name: c.name,
                    parentId: c.parentId,
                    sortOrder: c.sortOrder,
                    active: c.active,
                    reviewMonths: c.reviewMonths,
                  })
                }
              >
                {messages.kb.edit}
              </Button>
            ),
          },
        ]}
      />
      <Modal
        open={!!editing}
        title={editing?.id ? m.editTitle : m.addTitle}
        okText={m.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !editing?.name.trim() }}
        onOk={() => void save()}
        onCancel={() => setEditing(null)}
      >
        {editing ? (
          <Form layout="vertical">
            <Form.Item label={m.name} required>
              <Input
                maxLength={100}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Form.Item>
            <Form.Item label={m.parent}>
              <Select
                value={editing.parentId ?? ""}
                onChange={(v) =>
                  setEditing({ ...editing, parentId: v || null })
                }
                options={[
                  { value: "", label: m.topLevel },
                  ...items
                    .filter((c) => !c.parentId && c.id !== editing.id)
                    .map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </Form.Item>
            <Form.Item label={m.order}>
              <InputNumber
                min={0}
                max={9999}
                value={editing.sortOrder}
                onChange={(v) => setEditing({ ...editing, sortOrder: v ?? 0 })}
              />
            </Form.Item>
            <Form.Item
              label={messages.kb.review.reviewMonths}
              extra={messages.kb.review.reviewMonthsHint}
            >
              <InputNumber
                min={1}
                max={60}
                value={editing.reviewMonths ?? undefined}
                onChange={(v) =>
                  setEditing({ ...editing, reviewMonths: v ?? null })
                }
              />
            </Form.Item>
            <Form.Item label={m.active}>
              <Switch
                checked={editing.active}
                onChange={(v) => setEditing({ ...editing, active: v })}
              />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  );
}
