"use client";

import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import { useCallback, useEffect, useState } from "react";
import {
  issueApiKey,
  listApiKeyScopes,
  listApiKeys,
  revokeApiKey,
  type ApiKeyRow,
  type ApiKeyScope,
  type IssuedApiKey,
} from "@/lib/api/integrations";
import { messages } from "@/lib/messages";

/**
 * AUTH-06 — ออก API key ให้ช่องทางภายนอกเอง (14 ก.ย. 2569).
 *
 * หน้าจอนี้มีอยู่เพราะ "หนึ่งกุญแจต่อหนึ่งช่องทาง" ทำให้การออกกุญแจกลายเป็นงาน
 * ประจำของคนดูแล CRM — ก่อนหน้านี้ต้องให้ dev รัน `yarn apikey:issue` ให้ ซึ่ง
 * จบลงด้วยการใช้กุญแจใบเดิมซ้ำทุกช่องทางเพราะขอใบใหม่ทีต้องรอคน.
 *
 * สิ่งที่ CLI เคยรับประกันไว้ยังต้องจริงที่นี่: **ค่าเต็มของกุญแจผ่านหน้าจอนี้
 * ครั้งเดียว** แล้วไม่มีทางอ่านกลับ. ผลคือกฎสองข้อของไฟล์นี้ —
 *
 * 1. `issued` ถูกเก็บใน state ชั่วคราวและถูกล้างเมื่อปิด modal; ไม่มี `localStorage`
 *    ไม่มี query string ไม่มีการยิงกลับไปขอใหม่
 * 2. `listApiKeys` ไม่เคยคืนค่าเต็ม — ตารางแสดงได้แค่ `prefix` โดยเจตนา
 */
const SOURCE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** endpoint ที่ช่องทางต้องยิงเข้ามา — path เท่านั้น host มาจากฝั่งที่ deploy. */
const INTAKE_PATH = "POST /api/v1/integrations/crm/leads";

interface FormValues {
  name: string;
  source_code: string;
  scopes: string[];
  expires_in_days?: number;
}

const STATUS_COLOR: Record<ApiKeyRow["status"], string | undefined> = {
  active: "green",
  expired: "orange",
  revoked: undefined,
};

export default function AdminIntegrationsPage() {
  const { message } = App.useApp();
  const copy = messages.apiKeys;

  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [scopes, setScopes] = useState<ApiKeyScope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [saving, setSaving] = useState(false);
  /** ค่าเต็มของกุญแจที่เพิ่งออก — อยู่ในหน่วยความจำจนกว่าจะปิดหน้าต่าง. */
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);
  const [form] = Form.useForm<FormValues>();

  const refresh = useCallback(
    () =>
      listApiKeys().then((result) => {
        if (result.ok) setKeys(result.data);
        else setError(result.message);
      }),
    [],
  );

  useEffect(() => {
    void refresh();
    void listApiKeyScopes().then((result) => {
      if (result.ok) setScopes(result.data);
    });
  }, [refresh]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);

    const result = await issueApiKey({
      name: values.name,
      source_code: values.source_code,
      scopes: values.scopes,
      expires_in_days: values.expires_in_days,
    });

    setSaving(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }

    void message.success(copy.issuedToast);
    setIssuing(false);
    form.resetFields();
    // ปิดฟอร์มแล้วเปิดหน้าต่างค่าเต็มทันที — เป็นครั้งเดียวที่คนจะได้เห็นมัน
    setIssued(result.data);
    await refresh();
  };

  const revoke = async (row: ApiKeyRow) => {
    const result = await revokeApiKey(row.id);

    if (!result.ok) {
      void message.error(result.message);
      return;
    }

    void message.success(copy.revoke.done);
    await refresh();
  };

  /**
   * `navigator.clipboard` ล้มเหลวได้จริงบน http ที่ไม่ใช่ localhost — จับไว้แล้ว
   * บอกให้เลือกคัดลอกเอง ดีกว่าปุ่มที่กดแล้วเงียบทั้งที่ยังไม่ได้อะไรติดมือ.
   */
  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      void message.success(copy.issued.copied);
    } catch {
      void message.warning(copy.issued.copyFailed);
    }
  };

  const scopeLabel = (code: string) => copy.scopeLabels[code] ?? code;

  if (error) {
    return (
      <Alert type="error" showIcon title={copy.loadFailed} description={error} />
    );
  }

  if (!keys) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {copy.title}
        </Title>
        <Text type="secondary">{copy.subtitle}</Text>
      </div>

      <Card
        title={copy.title}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setIssuing(true);
            }}
          >
            {copy.issue}
          </Button>
        }
      >
        <Table<ApiKeyRow>
          rowKey="id"
          dataSource={keys}
          pagination={false}
          locale={{ emptyText: copy.empty }}
          columns={[
            {
              title: copy.columns.name,
              dataIndex: "name",
              render: (name: string, row) =>
                row.status === "active" ? (
                  name
                ) : (
                  <Text type="secondary">{name}</Text>
                ),
            },
            {
              title: copy.columns.prefix,
              dataIndex: "prefix",
              width: 150,
              render: (prefix: string) => <Text code>{prefix}…</Text>,
            },
            {
              title: copy.columns.source,
              dataIndex: "source_code",
              width: 150,
              render: (source: string | null) =>
                source ? <Tag color="blue">{source}</Tag> : copy.never,
            },
            {
              title: copy.columns.scopes,
              dataIndex: "scopes",
              render: (codes: string[]) => (
                <Space size={[0, 4]} wrap>
                  {codes.map((code) => (
                    <Tooltip key={code} title={code}>
                      <Tag>{scopeLabel(code)}</Tag>
                    </Tooltip>
                  ))}
                </Space>
              ),
            },
            {
              title: copy.columns.status,
              dataIndex: "status",
              width: 120,
              render: (status: ApiKeyRow["status"]) => (
                <Tag color={STATUS_COLOR[status]}>{copy.status[status]}</Tag>
              ),
            },
            {
              title: copy.columns.lastUsed,
              dataIndex: "last_used_at",
              width: 180,
              render: (at: string | null) =>
                at ? new Date(at).toLocaleString("th-TH") : copy.never,
            },
            {
              title: copy.columns.actions,
              key: "actions",
              width: 120,
              render: (_, row) =>
                row.status === "revoked" ? null : (
                  <Popconfirm
                    title={copy.revoke.confirm}
                    description={copy.revoke.confirmBody}
                    onConfirm={() => revoke(row)}
                  >
                    <Button size="small" danger>
                      {copy.revoke.action}
                    </Button>
                  </Popconfirm>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        open={issuing}
        title={copy.form.title}
        okText={copy.form.submit}
        cancelText={copy.form.cancel}
        onOk={() => void submit()}
        confirmLoading={saving}
        onCancel={() => setIssuing(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label={copy.form.name}
            extra={copy.form.nameHelp}
            rules={[{ required: true, max: 120 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="source_code"
            label={copy.form.sourceCode}
            extra={copy.form.sourceCodeHelp}
            rules={[
              { required: true },
              {
                pattern: SOURCE_CODE_PATTERN,
                message: copy.form.sourceCodeInvalid,
              },
            ]}
          >
            <Input placeholder="website" />
          </Form.Item>
          <Form.Item
            name="scopes"
            label={copy.form.scopes}
            extra={copy.form.scopesHelp}
            rules={[{ required: true, type: "array", min: 1 }]}
          >
            <Checkbox.Group className="flex flex-col gap-2">
              {scopes.map((scope) => (
                <Checkbox key={scope.code} value={scope.code}>
                  {scopeLabel(scope.code)}{" "}
                  <Text type="secondary" code>
                    {scope.code}
                  </Text>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
          <Form.Item
            name="expires_in_days"
            label={copy.form.expires}
            extra={copy.form.expiresHelp}
          >
            <InputNumber min={1} max={3650} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/*
        หน้าต่างที่แสดงค่าเต็ม — ปิดแล้วค่าหายไปจากทั้งหน้าจอและจากระบบ
        (`setIssued(null)`; backend ไม่มี endpoint อ่านกลับ). ไม่มีปุ่มกากบาท
        หรือคลิกนอกกรอบเพื่อปิด เพื่อไม่ให้ปิดโดยไม่ได้ตั้งใจก่อนคัดลอก.
      */}
      <Modal
        open={issued !== null}
        title={copy.issued.title}
        closable={false}
        maskClosable={false}
        keyboard={false}
        okText={copy.issued.done}
        onOk={() => setIssued(null)}
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <Alert type="warning" showIcon description={copy.issued.warning} />

        <div className="mt-4 flex items-start gap-2">
          <Input.TextArea
            value={issued?.key ?? ""}
            readOnly
            autoSize
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button
            icon={<CopyOutlined />}
            onClick={() => void copyKey(issued?.key ?? "")}
          >
            {copy.issued.copy}
          </Button>
        </div>

        <Paragraph type="secondary" className="mt-4 mb-1!">
          {copy.issued.handOver}
        </Paragraph>
        <Paragraph className="mb-3!">
          <Text code>Authorization: Bearer {issued?.prefix}…</Text>
        </Paragraph>

        <Paragraph type="secondary" className="mb-1!">
          {copy.issued.endpointHint}
        </Paragraph>
        <Paragraph className="mb-0!">
          <Text code>{INTAKE_PATH}</Text>
        </Paragraph>
      </Modal>
    </div>
  );
}
