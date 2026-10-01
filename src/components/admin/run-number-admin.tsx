"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import {
  createRunNumber,
  deleteRunNumber,
  listRunNumberTokens,
  previewRunNumber,
  updateRunNumber,
  type RunNumberDocType,
  type RunNumberReset,
  type RunNumberSetting,
  type RunNumberToken,
} from "@/lib/api/run-numbers";
import { messages } from "@/lib/messages";

const m = messages.runNumbers;

const DOC_TYPES: RunNumberDocType[] = [
  "REQUEST",
  "CUSTOMER",
  "OPPORTUNITY",
  "SALE_ORDER",
  "QUOTATION",
  "PROJECT",
];

const RESETS: RunNumberReset[] = ["none", "yearly", "monthly", "daily"];

/** หน่วงก่อนถาม server เพื่อไม่ยิงทุกตัวอักษรที่พิมพ์. */
const PREVIEW_DEBOUNCE_MS = 400;

interface FormValues {
  doc_type: RunNumberDocType;
  scope_key?: string;
  pattern: string;
  seq_padding: number;
  start_number: number;
  reset_period: RunNumberReset;
  active: boolean;
}

export function RunNumberAdmin({
  settings,
}: {
  settings: RunNumberSetting[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [editing, setEditing] = useState<RunNumberSetting | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [tokens, setTokens] = useState<RunNumberToken[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  /** ทิ้งคำตอบเก่าที่กลับมาหลังคำตอบใหม่. */
  const previewAttempt = useRef(0);

  const open = editing !== null;
  const values = Form.useWatch([], form);

  const loadTokens = useCallback((docType: RunNumberDocType) => {
    void listRunNumberTokens(docType).then((result) => {
      setTokens(result.ok ? result.data : []);
    });
  }, []);

  useEffect(() => {
    const docType = values?.doc_type;
    if (!open || !docType) return;

    loadTokens(docType);
  }, [open, values?.doc_type, loadTokens]);

  useEffect(() => {
    if (!open) return;

    const attempt = ++previewAttempt.current;
    const timer = setTimeout(() => {
      if (!values?.doc_type || !values?.pattern) {
        setPreview(null);
        return;
      }

      void previewRunNumber({
        doc_type: values.doc_type,
        scope_key: values.scope_key,
        pattern: values.pattern,
        seq_padding: values.seq_padding,
        start_number: values.start_number,
        reset_period: values.reset_period,
      }).then((result) => {
        if (attempt !== previewAttempt.current) return;
        setPreview(result.ok ? result.data.number : null);
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    open,
    values?.doc_type,
    values?.scope_key,
    values?.pattern,
    values?.seq_padding,
    values?.start_number,
    values?.reset_period,
  ]);

  function close() {
    setEditing(null);
    setTokens([]);
    setPreview(null);
  }

  function edit(row: RunNumberSetting | "new") {
    setEditing(row);
    form.setFieldsValue(
      row === "new"
        ? {
            doc_type: "REQUEST",
            scope_key: "",
            pattern: "",
            seq_padding: 4,
            start_number: 1,
            reset_period: "none",
            active: true,
          }
        : {
            doc_type: row.docType,
            scope_key: row.scopeKey === "*" ? "" : row.scopeKey,
            pattern: row.pattern,
            seq_padding: row.seqPadding,
            start_number: row.startNumber,
            reset_period: row.resetPeriod,
            active: row.active,
          },
    );
  }

  /** แทรกตัวแปรต่อท้ายรูปแบบที่กำลังพิมพ์. */
  function insert(token: string) {
    const current = form.getFieldValue("pattern") ?? "";
    form.setFieldValue("pattern", `${current}{${token}}`);
  }

  async function submit() {
    const input = await form.validateFields();
    setSaving(true);

    const payload = {
      doc_type: input.doc_type,
      scope_key: input.scope_key?.trim() || undefined,
      pattern: input.pattern.trim(),
      seq_padding: input.seq_padding,
      start_number: input.start_number,
      reset_period: input.reset_period,
      active: input.active,
    };

    const result =
      editing === "new"
        ? await createRunNumber(payload)
        : await updateRunNumber(editing!.id, payload);

    setSaving(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }

    message.success(m.saved);
    close();
    router.refresh();
  }

  async function remove(id: string) {
    const result = await deleteRunNumber(id);
    if (!result.ok) {
      message.error(result.message);
      return;
    }

    message.success(m.removed);
    router.refresh();
  }

  return (
    <Card
      size="small"
      extra={
        <Button type="primary" onClick={() => edit("new")}>
          {m.add}
        </Button>
      }
    >
      <Table<RunNumberSetting>
        rowKey="id"
        size="small"
        dataSource={settings}
        pagination={false}
        columns={[
          {
            title: m.columnDocType,
            dataIndex: "docType",
            render: (value: RunNumberDocType) => m.docTypes[value],
          },
          {
            title: m.columnScope,
            dataIndex: "scopeKey",
            render: (value: string) =>
              value === "*" ? (
                <Text type="secondary">{m.scopeAll}</Text>
              ) : (
                value
              ),
          },
          {
            title: m.columnPattern,
            dataIndex: "pattern",
            render: (value: string) => <code>{value}</code>,
          },
          { title: m.columnPadding, dataIndex: "seqPadding" },
          {
            title: m.columnReset,
            dataIndex: "resetPeriod",
            render: (value: RunNumberReset) => m.resets[value],
          },
          { title: m.columnStart, dataIndex: "startNumber" },
          {
            title: m.columnActive,
            dataIndex: "active",
            render: (value: boolean) => (
              <Tag color={value ? "green" : "default"}>
                {value ? m.active : m.inactive}
              </Tag>
            ),
          },
          {
            key: "actions",
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => edit(row)}>
                  {m.edit}
                </Button>
                <Popconfirm
                  title={m.confirmRemove}
                  onConfirm={() => void remove(row.id)}
                >
                  <Button size="small" danger>
                    {m.remove}
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title={editing === "new" ? m.add : m.edit}
        onCancel={close}
        onOk={() => void submit()}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="doc_type"
            label={m.formDocType}
            rules={[{ required: true }]}
          >
            <SearchSelect
              disabled={editing !== "new"}
              options={DOC_TYPES.map((value) => ({
                value,
                label: m.docTypes[value],
              }))}
            />
          </Form.Item>

          <Form.Item
            name="scope_key"
            label={m.formScope}
            extra={m.formScopeHelp}
          >
            <Input maxLength={60} disabled={editing !== "new"} />
          </Form.Item>

          <Form.Item
            name="pattern"
            label={m.formPattern}
            extra={m.formPatternHelp}
            rules={[{ required: true }]}
          >
            <Input maxLength={120} />
          </Form.Item>

          <div className="mb-3">
            <Text type="secondary" className="mb-1 block text-xs">
              {m.tokens}
            </Text>
            <Space size={[4, 4]} wrap>
              {tokens.map((token) => (
                <Tag
                  key={token.token}
                  className="cursor-pointer"
                  onClick={() => insert(token.token)}
                >
                  {`{${token.token}}`} · {token.label}
                </Tag>
              ))}
            </Space>
          </div>

          <Form.Item
            name="seq_padding"
            label={m.formPadding}
            rules={[{ required: true, type: "number", min: 1, max: 12 }]}
          >
            <InputNumber min={1} max={12} className="w-full" />
          </Form.Item>

          <Form.Item
            name="start_number"
            label={m.formStart}
            rules={[{ required: true, type: "number", min: 1 }]}
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="reset_period"
            label={m.formReset}
            rules={[{ required: true }]}
          >
            <SearchSelect
              options={RESETS.map((value) => ({
                value,
                label: m.resets[value],
              }))}
            />
          </Form.Item>

          <Form.Item name="active" label={m.formActive} valuePropName="checked">
            <Switch />
          </Form.Item>

          <Text type="secondary" className="block text-xs">
            {preview ? m.preview(preview) : m.previewFailed}
          </Text>
        </Form>
      </Modal>
    </Card>
  );
}
