"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  SecretField,
  unwrap,
} from "@/components/admin/integrations/secret-field";
import {
  createIntegrationEndpoint,
  endpointUrl,
  listIntegrationEndpoints,
  revealIntegrationEndpointKey,
  updateIntegrationEndpoint,
  type IntegrationEndpointRow,
} from "@/lib/api/integration-endpoints";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.integrationEndpoints;

interface FormValues {
  action: string;
  base_url: string;
  endpoint_id: string;
  api_key?: string;
}

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.reason).join("; "),
      )
    : result.message;
}

/**
 * ปลายทางที่ CTD ส่งงานของ agent ไปให้ระบบนี้ (`admin.integration.manage`) —
 * แท็บ "Endpoint ที่เราเรียก" ของหน้า Integrations; รูปแบบเดียวกับแท็บ Webhook.
 */
export function IntegrationEndpointAdmin({
  integrationId,
  onChanged,
}: {
  integrationId: string;
  onChanged: () => void;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<IntegrationEndpointRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // null = closed, "new" = add, a row = edit
  const [editing, setEditing] = useState<IntegrationEndpointRow | "new" | null>(
    null,
  );

  // state is set only when the answer arrives, as `webhook-admin.tsx` does
  const load = useCallback(
    () =>
      listIntegrationEndpoints(integrationId).then((result) => {
        setLoading(false);
        if (!result.ok) return setLoadError(result.message);
        setLoadError(null);
        setRows(result.data);
      }),
    [integrationId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(row: IntegrationEndpointRow, active: boolean) {
    const result = await updateIntegrationEndpoint(row.id, { active });
    if (!result.ok) {
      message.error(errorText(result));
      return;
    }
    setRows((current) =>
      current.map((item) => (item.id === row.id ? result.data : item)),
    );
  }

  const takenActions = new Set(rows.map((row) => row.action));
  const canAdd = Object.keys(m.actions).some(
    (action) => !takenActions.has(action),
  );

  return (
    <div className="space-y-3">
      {loadError && (
        <Alert
          type="error"
          showIcon
          title={m.loadFailed}
          description={loadError}
        />
      )}
      <div className="flex justify-end">
        <Button
          type="primary"
          disabled={!canAdd}
          onClick={() => setEditing("new")}
        >
          {m.add}
        </Button>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: m.empty }}
        scroll={{ x: true }}
        columns={[
          {
            title: m.columns.action,
            dataIndex: "action",
            render: (action: string) => m.actions[action] ?? action,
          },
          {
            title: m.columns.url,
            key: "url",
            render: (_: unknown, row: IntegrationEndpointRow) => (
              <Text code copyable className="text-xs">
                {endpointUrl(row)}
              </Text>
            ),
          },
          {
            title: m.columns.key,
            key: "key",
            render: (_: unknown, row: IntegrationEndpointRow) => (
              <SecretField
                hint={m.keyHint}
                load={async () =>
                  unwrap(
                    await revealIntegrationEndpointKey(row.id),
                    (data) => data.api_key,
                  )
                }
              />
            ),
          },
          {
            title: m.columns.active,
            dataIndex: "active",
            render: (active: boolean, row: IntegrationEndpointRow) => (
              <Switch
                size="small"
                checked={active}
                onChange={(next) => void toggle(row, next)}
              />
            ),
          },
          {
            key: "edit",
            render: (_: unknown, row: IntegrationEndpointRow) => (
              <Button type="link" size="small" onClick={() => setEditing(row)}>
                {m.edit}
              </Button>
            ),
          },
        ]}
      />
      <EndpointModal
        key={
          editing === null ? "closed" : editing === "new" ? "new" : editing.id
        }
        editing={editing}
        integrationId={integrationId}
        takenActions={takenActions}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          message.success(m.saved);
          void load();
          onChanged();
        }}
      />
    </div>
  );
}

function EndpointModal({
  editing,
  integrationId,
  takenActions,
  onClose,
  onSaved,
}: {
  editing: IntegrationEndpointRow | "new" | null;
  integrationId: string;
  takenActions: ReadonlySet<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const row = editing !== null && editing !== "new" ? editing : null;
  const baseUrl = Form.useWatch("base_url", form) ?? row?.base_url ?? "";
  const endpointId =
    Form.useWatch("endpoint_id", form) ?? row?.endpoint_id ?? "";

  async function save(values: FormValues) {
    setBusy(true);
    setError(null);
    const apiKey = values.api_key?.trim() || undefined;
    const result = row
      ? await updateIntegrationEndpoint(row.id, {
          base_url: values.base_url,
          endpoint_id: values.endpoint_id,
          api_key: apiKey,
        })
      : await createIntegrationEndpoint({
          integration_id: integrationId,
          action: values.action,
          base_url: values.base_url,
          endpoint_id: values.endpoint_id,
          api_key: apiKey,
        });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result));
      return;
    }
    onSaved();
  }

  return (
    <Modal
      open={editing !== null}
      title={row ? m.editTitle : m.addTitle}
      okText={m.save}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {error && <Alert className="mb-3" type="error" showIcon title={error} />}
      <Form<FormValues>
        form={form}
        layout="vertical"
        initialValues={{
          action:
            row?.action ??
            Object.keys(m.actions).find((action) => !takenActions.has(action)),
          base_url: row?.base_url,
          endpoint_id: row?.endpoint_id,
        }}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="action"
          label={m.fields.action}
          rules={[{ required: true }]}
        >
          <Select
            disabled={row !== null}
            options={Object.entries(m.actions).map(([value, label]) => ({
              value,
              label,
              disabled: row === null && takenActions.has(value),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="base_url"
          label={m.fields.baseUrl}
          extra={m.fields.baseUrlHint}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="endpoint_id"
          label={m.fields.endpointId}
          extra={m.fields.endpointIdHint}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="api_key"
          label={m.fields.apiKey}
          rules={row ? [] : [{ required: true }]}
        >
          <Input.Password
            autoComplete="off"
            placeholder={row ? m.fields.apiKeyKeep : undefined}
          />
        </Form.Item>
        {baseUrl && endpointId && (
          <Text type="secondary" className="text-xs">
            {m.fields.preview}{" "}
            <Text code className="text-xs">
              {endpointUrl({ base_url: baseUrl, endpoint_id: endpointId })}
            </Text>
          </Text>
        )}
      </Form>
    </Modal>
  );
}
