"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  SecretField,
  unwrap,
} from "@/components/admin/integrations/secret-field";
import {
  agentTaskCurl,
  curlFor,
  intakeForAgent,
  SAMPLE_AGENT_RECORD_ID,
} from "@/components/admin/integrations/api-example";
import { CodeBlock } from "@/components/ui/code-block";
import {
  getApiKeyExamples,
  listApiKeys,
  type ApiExample,
  type ApiKeyRow,
} from "@/lib/api/api-keys";
import {
  createOutboundConnection,
  endpointUrl,
  listAgentActions,
  listOutboundConnections,
  revealOutboundConnectionKey,
  splitVuvagentUrl,
  testOutboundConnection,
  updateOutboundConnection,
  type ActionEndpoint,
  type AgentActionInfo,
  type ConnectionTestResult,
  type OutboundConnectionRow,
} from "@/lib/api/outbound-connections";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.outboundConnections;
const VENDOR = "vuvagent";

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.reason).join("; "),
      )
    : result.message;
}

/** One row of the actions table: what the action sends, joined with what this company set. */
interface ActionLine extends AgentActionInfo {
  endpoint: ActionEndpoint | null;
}

/**
 * การเชื่อมต่อที่ CTD ใช้ส่งงานของ agent ไปให้ระบบนี้ (`admin.integration.manage`) —
 * URL และ key ตั้งครั้งเดียวต่อ vendor; แต่ละงานเลือก endpoint และเวลาหมดของตัวเอง.
 */
export function OutboundConnectionAdmin({
  integrationId,
  externalApiBase,
  onChanged,
}: {
  integrationId: string;
  externalApiBase: string | null;
  onChanged: () => void;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<OutboundConnectionRow[]>([]);
  const [actions, setActions] = useState<AgentActionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // null = closed, "new" = add, a row = edit
  const [editing, setEditing] = useState<OutboundConnectionRow | "new" | null>(
    null,
  );

  // state is set only when the answers arrive, as `webhook-admin.tsx` does
  const load = useCallback(
    () =>
      Promise.all([
        listOutboundConnections(integrationId),
        listAgentActions(),
      ]).then(([connections, catalog]) => {
        setLoading(false);
        if (!connections.ok) return setLoadError(connections.message);
        if (!catalog.ok) return setLoadError(catalog.message);
        setLoadError(null);
        setRows(connections.data);
        setActions(catalog.data);
      }),
    [integrationId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function replace(row: OutboundConnectionRow) {
    setRows((current) =>
      current.map((item) => (item.id === row.id ? row : item)),
    );
    onChanged();
  }

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
      {!loading && rows.length === 0 && !loadError && (
        <Card size="small">
          <Space direction="vertical">
            <Text type="secondary">{m.empty}</Text>
            <Button type="primary" onClick={() => setEditing("new")}>
              {m.add}
            </Button>
          </Space>
        </Card>
      )}
      {rows.map((row) => (
        <ConnectionCard
          key={row.id}
          row={row}
          actions={actions.filter((action) => action.vendor === row.vendor)}
          externalApiBase={externalApiBase}
          onEdit={() => setEditing(row)}
          onChanged={replace}
        />
      ))}
      <ConnectionModal
        key={
          editing === null ? "closed" : editing === "new" ? "new" : editing.id
        }
        editing={editing}
        integrationId={integrationId}
        firstAction={actions.find((action) => action.vendor === VENDOR)}
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

function ConnectionCard({
  row,
  actions,
  externalApiBase,
  onEdit,
  onChanged,
}: {
  row: OutboundConnectionRow;
  actions: AgentActionInfo[];
  externalApiBase: string | null;
  onEdit: () => void;
  onChanged: (row: OutboundConnectionRow) => void;
}) {
  const { message } = App.useApp();
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState<ConnectionTestResult | null>(null);
  const [editingAction, setEditingAction] = useState<ActionLine | null>(null);

  const lines: ActionLine[] = actions.map((action) => ({
    ...action,
    endpoint: row.endpoints.find((item) => item.action === action.action) ?? null,
  }));
  const firstSet = row.endpoints[0];

  async function save(payload: Parameters<typeof updateOutboundConnection>[1]) {
    const result = await updateOutboundConnection(row.id, payload);
    if (!result.ok) {
      message.error(errorText(result));
      return false;
    }
    onChanged(result.data);
    message.success(m.saved);
    return true;
  }

  async function test() {
    if (!firstSet) return;
    setTesting(true);
    const result = await testOutboundConnection(row.id, firstSet.action);
    setTesting(false);
    if (!result.ok) {
      message.error(errorText(result));
      return;
    }
    setTested(result.data);
  }

  return (
    <Card
      size="small"
      title={m.vendors[row.vendor] ?? row.vendor}
      extra={
        <Space>
          <Text type="secondary" className="text-xs">
            {m.active}
          </Text>
          <Switch
            size="small"
            checked={row.active}
            onChange={(active) => void save({ active })}
          />
          <Button type="link" size="small" onClick={onEdit}>
            {m.edit}
          </Button>
        </Space>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[7rem_1fr] items-center gap-x-3 gap-y-2">
          <Text type="secondary">{m.url}</Text>
          <Text code copyable className="text-xs">
            {row.base_url}
          </Text>
          <Text type="secondary">{m.key}</Text>
          <SecretField
            hint={m.keyHint}
            load={async () =>
              unwrap(
                await revealOutboundConnectionKey(row.id),
                (data) => data.api_key,
              )
            }
          />
        </div>

        <Space wrap align="center">
          <Button
            onClick={() => void test()}
            loading={testing}
            disabled={!firstSet}
          >
            {m.test}
          </Button>
          {tested && (
            <Tag color={tested.ok ? "success" : "error"}>
              {tested.ok
                ? m.testPassed(tested.status, tested.ms)
                : m.testFailed(tested.problem ?? String(tested.status))}
            </Tag>
          )}
        </Space>
        <Text type="secondary" className="block text-xs">
          {m.testHint}
        </Text>

        <Table
          rowKey="action"
          size="small"
          dataSource={lines}
          pagination={false}
          scroll={{ x: true }}
          columns={[
            {
              title: m.columns.action,
              key: "action",
              render: (_: unknown, line: ActionLine) => (
                <Space direction="vertical" size={0}>
                  <Text>{m.actions[line.action] ?? line.action}</Text>
                  <Text code className="text-xs">
                    {line.action}
                  </Text>
                </Space>
              ),
            },
            {
              title: m.columns.payload,
              key: "payload",
              render: (_: unknown, line: ActionLine) => (
                <Space wrap size={4}>
                  {line.payload_fields.map((field) => (
                    <Text key={field} code className="text-xs">
                      {field}
                    </Text>
                  ))}
                </Space>
              ),
            },
            {
              title: m.columns.endpointId,
              key: "endpoint",
              render: (_: unknown, line: ActionLine) =>
                line.endpoint ? (
                  <Text code copyable className="text-xs">
                    {line.endpoint.endpoint_id}
                  </Text>
                ) : (
                  <Text type="warning">{m.notSet}</Text>
                ),
            },
            {
              title: m.columns.timeout,
              key: "timeout",
              render: (_: unknown, line: ActionLine) =>
                m.timeoutValue(
                  line.endpoint?.timeout_minutes ??
                    line.default_timeout_minutes,
                ),
            },
            {
              key: "edit",
              render: (_: unknown, line: ActionLine) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setEditingAction(line)}
                >
                  {m.edit}
                </Button>
              ),
            },
          ]}
        />
        {lines.some((line) => line.endpoint) && (
          <AgentRoundTrip
            row={row}
            lines={lines}
            externalApiBase={externalApiBase}
          />
        )}
      </div>
      <ActionModal
        key={editingAction?.action ?? "closed"}
        line={editingAction}
        baseUrl={row.base_url}
        onClose={() => setEditingAction(null)}
        onSave={async (endpoint) => {
          const others = row.endpoints.filter(
            (item) => item.action !== endpoint.action,
          );
          if (await save({ endpoints: [...others, endpoint] })) {
            setEditingAction(null);
          }
        }}
      />
    </Card>
  );
}

const LEAD_CREATE = "integration.crm.lead.create";
const RECORD_UPDATE = "integration.agent.record.update";

/** The calls Vuvagent makes back, cut from the served catalogue of a key that can make them. */
interface ReturnCalls {
  key: ApiKeyRow;
  intake: ApiExample | undefined;
  done: ApiExample | undefined;
}

/**
 * ① CTD → Vuvagent and ② Vuvagent → CTD for each action with an endpoint.
 * ② needs a ready key: without one the examples would name a key that cannot make the calls.
 */
function AgentRoundTrip({
  row,
  lines,
  externalApiBase,
}: {
  row: OutboundConnectionRow;
  lines: ActionLine[];
  externalApiBase: string | null;
}) {
  // undefined = loading, null = no ready key
  const [calls, setCalls] = useState<ReturnCalls | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listApiKeys().then(async (keys) => {
      if (!keys.ok) return setError(keys.message);
      const key = keys.data.find(
        (item) =>
          item.integration_id === row.integration_id &&
          item.status === "active" &&
          item.scopes.includes(LEAD_CREATE) &&
          item.scopes.includes(RECORD_UPDATE),
      );
      if (!key) return setCalls(null);
      const examples = await getApiKeyExamples(key.id);
      if (!examples.ok) return setError(examples.message);
      const find = (method: string, path: string) =>
        examples.data.find((item) => item.method === method && item.path === path);
      setCalls({
        key,
        intake: find("POST", "/crm/leads/intake"),
        done: find("PATCH", "/agent-records/{id}"),
      });
    });
  }, [row.integration_id]);

  const curl = (example: ApiExample) =>
    calls ? curlFor(example, { externalApiBase, keyPrefix: calls.key.prefix }) : "";
  // the same id step ① sent, so the reader sees which task is being closed
  const done = calls?.done && {
    ...calls.done,
    path: calls.done.path.replace("{id}", SAMPLE_AGENT_RECORD_ID),
  };

  return (
    <>
      {lines.map(
        (line) =>
          line.endpoint && (
            <div
              key={line.action}
              className="space-y-2 border-t border-[var(--app-border-soft)] pt-3"
            >
              <Text strong>
                {m.roundTripTitle(m.actions[line.action] ?? line.action)}
              </Text>
              <Text type="secondary" className="block text-xs">
                {m.roundTripOut}
              </Text>
              <CodeBlock
                code={agentTaskCurl(
                  row.base_url,
                  line.endpoint.endpoint_id,
                  line.payload_fields,
                )}
              />
              <Text type="secondary" className="block text-xs">
                {m.roundTripBack}
              </Text>
              {error && (
                <Alert
                  type="error"
                  showIcon
                  title={m.keyLoadFailed}
                  description={error}
                />
              )}
              {calls === null && (
                <Alert type="warning" showIcon title={m.keyMissing} />
              )}
              {calls && (
                <>
                  <Text type="success" className="block text-xs">
                    {m.keyReady(calls.key.name, calls.key.prefix)}
                  </Text>
                  {!externalApiBase && (
                    <Text type="warning" className="block text-xs">
                      {messages.integrations.exampleBaseUnset}
                    </Text>
                  )}
                  {calls.intake && (
                    <>
                      <Text className="block text-xs">{m.stepIntake}</Text>
                      <CodeBlock code={curl(intakeForAgent(calls.intake))} />
                    </>
                  )}
                  {done && (
                    <>
                      <Text className="block text-xs">{m.stepDone}</Text>
                      <CodeBlock code={curl(done)} />
                      <Text className="block text-xs">{m.stepFailed}</Text>
                      <CodeBlock
                        code={curl({
                          ...done,
                          body: { status: "failed", error: m.sampleFailedError },
                        })}
                      />
                    </>
                  )}
                </>
              )}
              <ul className="m-0 list-disc pl-5 text-xs text-[var(--app-text-secondary)]">
                {m.roundTripCodes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ),
      )}
    </>
  );
}

interface ConnectionValues {
  url: string;
  api_key?: string;
}

function ConnectionModal({
  editing,
  integrationId,
  firstAction,
  onClose,
  onSaved,
}: {
  editing: OutboundConnectionRow | "new" | null;
  integrationId: string;
  firstAction: AgentActionInfo | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<ConnectionValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const row = editing !== null && editing !== "new" ? editing : null;
  const split = splitVuvagentUrl(
    Form.useWatch("url", form) ?? row?.base_url ?? "",
  );

  async function save(values: ConnectionValues) {
    setBusy(true);
    setError(null);
    const apiKey = values.api_key?.trim() || undefined;
    const { baseUrl, endpointId } = splitVuvagentUrl(values.url);
    // a pasted endpoint URL on a new connection also sets the first action's endpoint
    const endpoints =
      endpointId && firstAction
        ? [
            {
              action: firstAction.action,
              endpoint_id: endpointId,
              timeout_minutes: firstAction.default_timeout_minutes,
            },
          ]
        : undefined;
    const result = row
      ? await updateOutboundConnection(row.id, {
          base_url: baseUrl,
          api_key: apiKey,
        })
      : await createOutboundConnection({
          integration_id: integrationId,
          vendor: VENDOR,
          base_url: baseUrl,
          api_key: apiKey ?? "",
          endpoints,
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
      <Form<ConnectionValues>
        form={form}
        layout="vertical"
        initialValues={{ url: row?.base_url }}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="url"
          label={m.fields.url}
          extra={
            split.endpointId
              ? m.fields.urlSplit(split.baseUrl, split.endpointId)
              : m.fields.urlHint
          }
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
      </Form>
    </Modal>
  );
}

interface ActionValues {
  endpoint: string;
  timeout_minutes: number;
}

function ActionModal({
  line,
  baseUrl,
  onClose,
  onSave,
}: {
  line: ActionLine | null;
  baseUrl: string;
  onClose: () => void;
  onSave: (endpoint: ActionEndpoint) => Promise<void>;
}) {
  const [form] = Form.useForm<ActionValues>();
  const [busy, setBusy] = useState(false);
  const typed = Form.useWatch("endpoint", form) ?? "";
  const endpointId = splitVuvagentUrl(typed).endpointId ?? typed.trim();

  async function save(values: ActionValues) {
    if (!line) return;
    setBusy(true);
    await onSave({
      action: line.action,
      endpoint_id:
        splitVuvagentUrl(values.endpoint).endpointId ?? values.endpoint.trim(),
      timeout_minutes: values.timeout_minutes,
    });
    setBusy(false);
  }

  return (
    <Modal
      open={line !== null}
      title={
        line ? m.editActionTitle(m.actions[line.action] ?? line.action) : ""
      }
      okText={m.save}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form<ActionValues>
        form={form}
        layout="vertical"
        initialValues={{
          endpoint: line?.endpoint?.endpoint_id,
          timeout_minutes:
            line?.endpoint?.timeout_minutes ?? line?.default_timeout_minutes,
        }}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="endpoint"
          label={m.fields.endpointId}
          extra={m.fields.endpointIdHint}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="timeout_minutes"
          label={m.fields.timeout}
          extra={m.fields.timeoutHint}
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={1440} precision={0} />
        </Form.Item>
        {endpointId && (
          <Text type="secondary" className="text-xs">
            {m.fields.preview}{" "}
            <Text code className="text-xs">
              {endpointUrl(baseUrl, endpointId)}
            </Text>
          </Text>
        )}
      </Form>
    </Modal>
  );
}
