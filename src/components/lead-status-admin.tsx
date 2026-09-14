"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
} from "antd";
import Text from "antd/es/typography/Text";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { messages } from "@/lib/messages";
import type { LeadStatusSetting } from "@/lib/api/types";

const m = messages.customers.admin;
const ml = m.leadStatuses;

/** สีป้ายที่ antd `Tag` รู้จัก — พอสำหรับแยกขั้นในสายตา ไม่ต้องมี color picker. */
const COLORS = [
  "default",
  "blue",
  "cyan",
  "green",
  "gold",
  "orange",
  "red",
  "purple",
  "magenta",
  "geekblue",
  "lime",
  "volcano",
] as const;

interface Draft {
  id: string | null;
  code: string;
  nameTh: string;
  color: string;
  isDefault: boolean;
}

function draftOf(row: LeadStatusSetting): Draft {
  return {
    id: row.id,
    code: row.code,
    nameTh: row.nameTh,
    color: row.color,
    isDefault: row.isDefault,
  };
}

const BLANK: Draft = {
  id: null,
  code: "",
  nameTh: "",
  color: "default",
  isDefault: false,
};

/**
 * ตั้งค่า CRM → สถานะ Lead — "หน้า Lead ต้องมีสถานะอะไรบ้าง" ตอบจากที่นี่.
 *
 * สามแถวเป็นสถานะระบบ: ตั้งต้นของ Lead ใหม่ และปลายทางสองทาง (แปลงเป็นโอกาส
 * การขาย / คัดออก) — ลบและปิดใช้งานไม่ได้ เพราะปุ่มสองปุ่มบนหน้ารายละเอียดต้อง
 * มีที่ไป. ที่เหลือเพิ่ม ลบ เปลี่ยนชื่อ สลับลำดับได้อิสระ.
 *
 * หน้านี้ตั้งได้แค่ *มีขั้นอะไรบ้าง* — ไม่ได้ตั้ง *กฎการเลื่อนขั้น*. เงื่อนไขอย่าง
 * "ต้องมีกิจกรรมที่ทำเสร็จก่อน" หรือ "ขั้นนี้แปลงเป็นโอกาสการขายได้" อยู่บน
 * workflow `lwf-0001` บน service workflowable (PO 10 ก.ย. 2569: "Workflow owns
 * Process, Core owns Data") — ถ้าจะเพิ่ม checkbox แนวนั้นกลับมาที่นี่ แปลว่า
 * process กำลังงอกที่สองและจะ drift กับ workflow.
 */
export function LeadStatusAdmin({
  rows,
  onCall,
}: {
  rows: LeadStatusSetting[];
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = draft?.id !== null && draft !== null;

  async function save() {
    if (!draft) return;
    setBusy(true);

    const body = {
      name_th: draft.nameTh.trim(),
      color: draft.color,
      is_default: draft.isDefault,
    };

    const done = draft.id
      ? await onCall(`lead-statuses/${draft.id}`, "PATCH", body)
      : await onCall("lead-statuses", "POST", {
          ...body,
          code: draft.code.trim().toLowerCase(),
        });

    setBusy(false);
    if (done) setDraft(null);
  }

  /** สลับกับแถวข้างเคียงแล้วส่งลำดับใหม่ทั้งชุด — backend เขียน sortOrder ให้เอง. */
  function move(index: number, by: -1 | 1) {
    const next = rows.map((row) => row.id);
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void onCall("lead-statuses/reorder", "PATCH", { ids: next });
  }

  return (
    <Card size="small" title={ml.section}>
      <Space orientation="vertical" size={10} className="w-full">
        <Text type="secondary" className="text-xs">
          {ml.hint}
        </Text>

        <div>
          <Button type="primary" onClick={() => setDraft({ ...BLANK })}>
            {ml.add}
          </Button>
        </div>

        <Table<LeadStatusSetting>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={rows}
          locale={{ emptyText: ml.empty }}
          columns={[
            {
              title: ml.columns.order,
              key: "order",
              width: 90,
              render: (_: unknown, _row, index) => (
                <Space size={0}>
                  <Button
                    type="text"
                    size="small"
                    aria-label={ml.moveUp}
                    icon={<ArrowUpOutlined />}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <Button
                    type="text"
                    size="small"
                    aria-label={ml.moveDown}
                    icon={<ArrowDownOutlined />}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  />
                </Space>
              ),
            },
            {
              title: ml.columns.name,
              dataIndex: "nameTh",
              render: (nameTh: string, row) => (
                <Space size={4} wrap>
                  <Tag color={row.color}>{nameTh}</Tag>
                  {row.isDefault && <Tag color="blue">{ml.defaultTag}</Tag>}
                  {row.isSystem && <Tag>{ml.systemTag}</Tag>}
                </Space>
              ),
            },
            {
              title: ml.columns.code,
              dataIndex: "code",
              width: 160,
              render: (code: string) => (
                <Text type="secondary" className="text-xs">
                  {code}
                </Text>
              ),
            },
            {
              title: ml.columns.kind,
              dataIndex: "kind",
              width: 190,
              render: (kind: LeadStatusSetting["kind"]) => ml.kind[kind],
            },
            {
              title: ml.columns.active,
              dataIndex: "active",
              width: 90,
              render: (active: boolean, row) => (
                <Tooltip title={row.isSystem ? ml.systemLocked : undefined}>
                  <Switch
                    size="small"
                    checked={active}
                    disabled={row.isSystem}
                    onChange={(next) =>
                      void onCall(`lead-statuses/${row.id}`, "PATCH", {
                        active: next,
                      })
                    }
                  />
                </Tooltip>
              ),
            },
            {
              title: "",
              key: "actions",
              width: 150,
              align: "right" as const,
              render: (_: unknown, row) => (
                <Space>
                  <Button size="small" onClick={() => setDraft(draftOf(row))}>
                    {messages.sales.leads.actions.edit}
                  </Button>
                  {!row.isSystem && (
                    <Popconfirm
                      title={ml.deleteConfirm}
                      onConfirm={() =>
                        void onCall(`lead-statuses/${row.id}`, "DELETE")
                      }
                    >
                      <Button size="small" danger>
                        {ml.delete}
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        open={draft !== null}
        title={editing ? ml.editTitle(draft?.nameTh ?? "") : ml.addTitle}
        okText={m.save}
        cancelText={messages.customers.form.cancel}
        confirmLoading={busy}
        okButtonProps={{
          disabled:
            !draft?.nameTh.trim() || (!editing && !draft?.code.trim()),
        }}
        onCancel={() => setDraft(null)}
        onOk={() => void save()}
        destroyOnHidden
      >
        <Space orientation="vertical" size={10} className="w-full">
          {!editing && (
            <div>
              <Text className="mb-1 block text-xs">{ml.fields.code}</Text>
              <Input
                value={draft?.code}
                maxLength={30}
                placeholder="follow_up"
                onChange={(event) =>
                  setDraft(
                    (prev) => prev && { ...prev, code: event.target.value },
                  )
                }
              />
              <Text type="secondary" className="mt-1 block text-xs">
                {ml.fields.codeHint}
              </Text>
            </div>
          )}

          <div>
            <Text className="mb-1 block text-xs">{ml.fields.name}</Text>
            <Input
              value={draft?.nameTh}
              maxLength={60}
              onChange={(event) =>
                setDraft(
                  (prev) => prev && { ...prev, nameTh: event.target.value },
                )
              }
            />
          </div>

          <div>
            <Text className="mb-1 block text-xs">{ml.fields.color}</Text>
            <Select
              className="w-full"
              value={draft?.color}
              onChange={(color) =>
                setDraft((prev) => prev && { ...prev, color })
              }
              options={COLORS.map((color) => ({
                value: color,
                label: <Tag color={color}>{draft?.nameTh || color}</Tag>,
              }))}
            />
          </div>

          <Checkbox
            checked={draft?.isDefault}
            // ถอดธงตั้งต้นตรง ๆ ไม่ได้ — ย้ายด้วยการติ๊กให้ขั้นอื่นแทน ไม่งั้น
            // จะเหลือบริษัทที่ไม่มีขั้นตั้งต้นเลยโดยไม่มีอะไรบอก.
            disabled={editing && rows.some((row) => row.id === draft?.id && row.isDefault)}
            onChange={(event) =>
              setDraft(
                (prev) => prev && { ...prev, isDefault: event.target.checked },
              )
            }
          >
            {ml.fields.isDefault}
          </Checkbox>
        </Space>
      </Modal>
    </Card>
  );
}
