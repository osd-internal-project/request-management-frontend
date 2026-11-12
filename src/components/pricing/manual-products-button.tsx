"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  listManualProducts,
  removeProduct,
  updateProduct,
  type ManualProduct,
} from "@/lib/api/products";
import { messages } from "@/lib/messages";

const m = messages.pricing.manualProducts;

/**
 * Products typed in while no ERP is connected: rename, change the unit, or
 * remove. Shown to whoever may set prices; the server checks again. SAP's
 * products are not listed — SAP owns those.
 */
export function ManualProductsButton() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ManualProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    name: string;
    unit: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    const result = await listManualProducts();
    if (result.ok) setRows(result.data);
    else setError(result.message);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    const result = await updateProduct(editing.id, {
      name: editing.name.trim(),
      unit: editing.unit.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.saved);
    setEditing(null);
    setRows(
      (rows ?? []).map((row) =>
        row.id === result.data.id ? result.data : row,
      ),
    );
  }

  async function remove(row: ManualProduct) {
    const result = await removeProduct(row.id);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.removed(row.code));
    setRows((rows ?? []).filter((one) => one.id !== row.id));
  }

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          setRows(null);
          setEditing(null);
          void load();
        }}
      >
        {m.open}
      </Button>
      <Modal
        open={open}
        title={m.title}
        footer={null}
        width={720}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <Space orientation="vertical" className="w-full">
          <Text type="secondary">{m.hint}</Text>
          {error ? (
            <Alert type="error" showIcon title={error} />
          ) : (
            <Table<ManualProduct>
              rowKey="id"
              size="small"
              loading={!rows}
              dataSource={rows ?? []}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              locale={{ emptyText: m.empty }}
              columns={[
                { title: m.code, dataIndex: "code", width: 150 },
                {
                  title: m.name,
                  dataIndex: "name",
                  render: (value: string, row) =>
                    editing?.id === row.id ? (
                      <Input
                        maxLength={200}
                        value={editing.name}
                        onChange={(event) =>
                          setEditing({ ...editing, name: event.target.value })
                        }
                      />
                    ) : (
                      value
                    ),
                },
                {
                  title: m.unit,
                  dataIndex: "unit",
                  width: 120,
                  render: (value: string | null, row) =>
                    editing?.id === row.id ? (
                      <Input
                        maxLength={30}
                        value={editing.unit}
                        onChange={(event) =>
                          setEditing({ ...editing, unit: event.target.value })
                        }
                      />
                    ) : (
                      (value ?? "—")
                    ),
                },
                {
                  title: "",
                  key: "actions",
                  width: 150,
                  render: (_: unknown, row) =>
                    editing?.id === row.id ? (
                      <Space size={0}>
                        <Button
                          type="link"
                          size="small"
                          loading={busy}
                          disabled={!editing.name.trim()}
                          onClick={() => void save()}
                        >
                          {m.save}
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setEditing(null)}
                        >
                          {m.cancel}
                        </Button>
                      </Space>
                    ) : (
                      <Space size={0}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() =>
                            setEditing({
                              id: row.id,
                              name: row.name,
                              unit: row.unit ?? "",
                            })
                          }
                        >
                          {m.edit}
                        </Button>
                        <Popconfirm
                          title={m.removeConfirm(row.code)}
                          description={
                            <div className="max-w-xs">{m.removeHint}</div>
                          }
                          okText={m.remove}
                          okButtonProps={{ danger: true }}
                          onConfirm={() => void remove(row)}
                        >
                          <Button type="link" size="small" danger>
                            {m.remove}
                          </Button>
                        </Popconfirm>
                      </Space>
                    ),
                },
              ]}
            />
          )}
        </Space>
      </Modal>
    </>
  );
}
