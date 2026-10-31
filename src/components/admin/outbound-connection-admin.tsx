"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
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
  type AgentActionInfo,
  type ConnectionTestResult,
  type OutboundConnectionRow,
} from "@/lib/api/outbound-connections";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.outboundConnections;

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.reason).join("; "),
      )
    : result.message;
}

/**
 * การเชื่อมต่อที่ CTD ใช้ส่งงานของ agent (`admin.integration.manage`) — หนึ่งกล่องต่อหนึ่งงาน:
 * ที่ Vuvagent หนึ่งงานคือหนึ่ง agent มี URL, key, endpoint และเวลาหมดของตัวเอง.
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AgentActionInfo | null>(null);

  // state is set only when the answers arrive, as `webhook-admin.tsx` does
  const load = useCallback(
    () =>
      Promise.all([
        listOutboundConnections(integrationId),
        listAgentActions(),
      ]).then(([connections, catalog]) => {
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

  const vendors = [...new Set(actions.map((action) => action.vendor))];
  const rowOf = (action: string) =>
    rows.find((row) => row.action === action) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {loadError && (
        <Alert
          type="error"
          showIcon
          title={m.loadFailed}
          description={loadError}
        />
      )}
      {vendors.map((vendor) => (
        <Card key={vendor} size="small" title={m.vendors[vendor] ?? vendor}>
          <div className="flex flex-col gap-3">
            {actions
              .filter((action) => action.vendor === vendor)
              .map((action) => (
                <AgentBox
                  key={action.action}
                  action={action}
                  row={rowOf(action.action)}
                  externalApiBase={externalApiBase}
                  onEdit={() => setEditing(action)}
                  onChanged={replace}
                />
              ))}
          </div>
        </Card>
      ))}
      <AgentModal
        key={editing?.action ?? "closed"}
        action={editing}
        row={editing ? rowOf(editing.action) : null}
        integrationId={integrationId}
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

function PayloadFields({ fields }: { fields: string[] }) {
  return (
    <Space wrap size={4}>
      {fields.map((field) => (
        <Text key={field} code className="text-xs">
          {field}
        </Text>
      ))}
    </Space>
  );
}

/** One agent: set → everything about it in one box; not set → what it sends and a button. */
function AgentBox({
  action,
  row,
  externalApiBase,
  onEdit,
  onChanged,
}: {
  action: AgentActionInfo;
  row: OutboundConnectionRow | null;
  externalApiBase: string | null;
  onEdit: () => void;
  onChanged: (row: OutboundConnectionRow) => void;
}) {
  const { message } = App.useApp();
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState<ConnectionTestResult | null>(null);
  const label = m.actions[action.action] ?? action.action;

  async function setActive(active: boolean) {
    if (!row) return;
    const result = await updateOutboundConnection(row.id, { active });
    if (!result.ok) return void message.error(errorText(result));
    onChanged(result.data);
    message.success(m.saved);
  }

  async function test() {
    if (!row) return;
    setTesting(true);
    const result = await testOutboundConnection(row.id);
    setTesting(false);
    if (!result.ok) return void message.error(errorText(result));
    setTested(result.data);
  }

  const title = (
    <Space size={8}>
      <Text strong>{label}</Text>
      <Text code className="text-xs">
        {action.action}
      </Text>
    </Space>
  );

  if (!row) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--app-border-soft)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title}
          <Button type="primary" size="small" onClick={onEdit}>
            {m.setUp}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Text type="warning">{m.notSet}</Text>
          <Text type="secondary">{m.columns.payload}</Text>
          <PayloadFields fields={action.payload_fields} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[var(--app-border-soft)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title}
        <Space wrap>
          <Text type="secondary" className="text-xs">
            {m.active}
          </Text>
          <Switch
            size="small"
            checked={row.active}
            onChange={(active) => void setActive(active)}
          />
          <Button size="small" onClick={() => void test()} loading={testing}>
            {m.test}
          </Button>
          <Button type="link" size="small" onClick={onEdit}>
            {m.edit}
          </Button>
        </Space>
      </div>
      {tested && (
        <Tag className="self-start" color={tested.ok ? "success" : "error"}>
          {tested.ok
            ? m.testPassed(tested.status, tested.ms)
            : m.testFailed(tested.problem ?? String(tested.status))}
        </Tag>
      )}
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
        <Text type="secondary">{m.columns.endpointId}</Text>
        <Text code copyable className="text-xs">
          {row.endpoint_id}
        </Text>
        <Text type="secondary">{m.columns.timeout}</Text>
        <Text>{m.timeoutValue(row.timeout_minutes)}</Text>
        <Text type="secondary">{m.columns.payload}</Text>
        <PayloadFields fields={action.payload_fields} />
      </div>
      <Text type="secondary" className="text-xs">
        {m.testHint}
      </Text>
      <Collapse
        ghost
        size="small"
        items={[
          {
            key: "round-trip",
            label: m.roundTripTitle(label),
            children: (
              <AgentRoundTrip
                row={row}
                payloadFields={action.payload_fields}
                externalApiBase={externalApiBase}
              />
            ),
          },
        ]}
      />
    </div>
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
 * ① CTD → this agent and ② the agent → CTD. ② needs a ready key: without one the
 * examples would name a key that cannot make the calls.
 */
function AgentRoundTrip({
  row,
  payloadFields,
  externalApiBase,
}: {
  row: OutboundConnectionRow;
  payloadFields: string[];
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
    <div className="flex flex-col gap-2">
      <Text type="secondary" className="block text-xs">
        {m.roundTripOut}
      </Text>
      <CodeBlock
        code={agentTaskCurl(row.base_url, row.endpoint_id, payloadFields)}
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
  );
}

interface AgentValues {
  url: string;
  endpoint: string;
  api_key?: string;
  timeout_minutes: number;
}

/** Set up or edit one agent. A pasted endpoint URL fills the endpoint id as well. */
function AgentModal({
  action,
  row,
  integrationId,
  onClose,
  onSaved,
}: {
  action: AgentActionInfo | null;
  row: OutboundConnectionRow | null;
  integrationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<AgentValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = splitVuvagentUrl(Form.useWatch("url", form) ?? row?.base_url ?? "");
  const typed = Form.useWatch("endpoint", form) ?? "";
  const endpointId =
    url.endpointId ?? (splitVuvagentUrl(typed).endpointId ?? typed.trim());
  const label = action ? (m.actions[action.action] ?? action.action) : "";

  async function save(values: AgentValues) {
    if (!action) return;
    setBusy(true);
    setError(null);
    const apiKey = values.api_key?.trim() || undefined;
    const split = splitVuvagentUrl(values.url);
    const endpoint =
      split.endpointId ??
      splitVuvagentUrl(values.endpoint ?? "").endpointId ??
      (values.endpoint ?? "").trim();
    const result = row
      ? await updateOutboundConnection(row.id, {
          base_url: split.baseUrl,
          api_key: apiKey,
          endpoint_id: endpoint,
          timeout_minutes: values.timeout_minutes,
        })
      : await createOutboundConnection({
          integration_id: integrationId,
          action: action.action,
          base_url: split.baseUrl,
          api_key: apiKey ?? "",
          endpoint_id: endpoint,
          timeout_minutes: values.timeout_minutes,
        });
    setBusy(false);
    if (!result.ok) return setError(errorText(result));
    onSaved();
  }

  return (
    <Modal
      open={action !== null}
      title={row ? m.editTitle(label) : m.addTitle(label)}
      okText={m.save}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      {error && <Alert className="mb-3" type="error" showIcon title={error} />}
      <Form<AgentValues>
        form={form}
        layout="vertical"
        initialValues={{
          url: row?.base_url,
          endpoint: row?.endpoint_id,
          timeout_minutes:
            row?.timeout_minutes ?? action?.default_timeout_minutes,
        }}
        onFinish={(values) => void save(values)}
      >
        <Form.Item
          name="url"
          label={m.fields.url}
          extra={
            url.endpointId
              ? m.fields.urlSplit(url.baseUrl, url.endpointId)
              : m.fields.urlHint
          }
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        {!url.endpointId && (
          <Form.Item
            name="endpoint"
            label={m.fields.endpointId}
            extra={m.fields.endpointIdHint}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        )}
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
              {endpointUrl(url.baseUrl, endpointId)}
            </Text>
          </Text>
        )}
      </Form>
    </Modal>
  );
}
