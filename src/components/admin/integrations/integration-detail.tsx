"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
} from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import { ApiKeyAdmin } from "@/components/admin/api-key-admin";
import { WebhookAdmin } from "@/components/admin/webhook-admin";
import { IntegrationEndpointAdmin } from "@/components/admin/integration-endpoint-admin";
import {
  listIntegrationCalls,
  listIntegrations,
  updateIntegration,
  type IntegrationCall,
  type IntegrationMode,
  type IntegrationRow,
} from "@/lib/api/integrations";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ModeTags, ModesPicker } from "./integration-modes";

const m = messages.integrations;
const PAGE_SIZE = 20;

/**
 * ระบบภายนอกหนึ่งระบบ: แถบ "เรียกได้แบบไหน" บนสุด แล้ว 5 tab.
 * backend ไม่มี GET รายตัว — หาจากรายการของบริษัท ซึ่งมีไม่กี่แถว.
 *
 * @param mcpEndpoint URL ที่ผู้ใช้วางใน LibreChat; null = ยังไม่ได้ตั้ง env
 */
export function IntegrationDetail({
  id,
  mcpEndpoint,
  canAudit,
}: {
  readonly id: string;
  readonly mcpEndpoint: string | null;
  readonly canAudit: boolean;
}) {
  const [row, setRow] = useState<IntegrationRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    () =>
      listIntegrations().then((result) => {
        if (!result.ok) return setError(result.message);
        setRow(result.data.find((item) => item.id === id) ?? null);
      }),
    [id],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) {
    return (
      <Alert type="error" showIcon title={m.loadFailed} description={error} />
    );
  }
  if (row === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }
  if (row === null) return <Alert type="warning" showIcon title={m.notFound} />;

  return (
    <div className="space-y-4">
      <div>
        <Link href={ROUTES.adminIntegrations} className="text-xs">
          {m.back}
        </Link>
        <Title level={4} className="mb-0!">
          {row.name}{" "}
          {!row.active && <Tag className="align-middle">{m.inactive}</Tag>}
        </Title>
        {row.description && (
          <Text type="secondary" className="text-xs">
            {row.description}
          </Text>
        )}
      </div>

      <div className="rounded-lg bg-[var(--app-primary-soft)] px-4 py-3">
        <Text strong className="mr-2 text-xs">
          {m.columnModes}
        </Text>
        <ModeTags integration={row} />
        {row.allow_acting_user && (
          <Alert
            className="mt-2"
            type="warning"
            showIcon
            title={m.actingUserWarning}
          />
        )}
      </div>

      <Tabs
        items={[
          {
            key: "settings",
            label: m.tabs.settings,
            children: <SettingsTab row={row} onSaved={refresh} />,
          },
          {
            key: "keys",
            label: `${m.tabs.keys} (${row.api_key_count})`,
            children: (
              <>
                <Paragraph type="secondary" className="text-xs">
                  {m.keysHint}
                </Paragraph>
                <ApiKeyAdmin integrationId={row.id} />
              </>
            ),
          },
          {
            key: "webhooks",
            label: `${m.tabs.webhooks} (${row.webhook_count})`,
            children: (
              <>
                <Paragraph type="secondary" className="text-xs">
                  {m.webhooksHint}
                </Paragraph>
                <WebhookAdmin integrationId={row.id} />
              </>
            ),
          },
          {
            key: "endpoints",
            label: `${m.tabs.endpoints} (${row.endpoint_count})`,
            children: (
              <>
                <Paragraph type="secondary" className="text-xs">
                  {m.endpointsHint}
                </Paragraph>
                <IntegrationEndpointAdmin
                  integrationId={row.id}
                  onChanged={refresh}
                />
              </>
            ),
          },
          {
            key: "mcp",
            label: m.tabs.mcp,
            children: <McpTab endpoint={mcpEndpoint} canAudit={canAudit} />,
          },
          {
            key: "calls",
            label: m.tabs.calls,
            children: <CallsTab id={row.id} canAudit={canAudit} />,
          },
        ]}
      />
    </div>
  );
}

function SettingsTab({
  row,
  onSaved,
}: {
  readonly row: IntegrationRow;
  readonly onSaved: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState(row.name);
  const [description, setDescription] = useState(row.description ?? "");
  const [modes, setModes] = useState<IntegrationMode[]>(row.modes);
  const [actingUser, setActingUser] = useState(row.allow_acting_user);
  const [clientIds, setClientIds] = useState<string[]>(row.keycloak_client_ids);
  const [busy, setBusy] = useState(false);

  async function save(payload: Parameters<typeof updateIntegration>[1]) {
    setBusy(true);
    const result = await updateIntegration(row.id, payload);
    setBusy(false);
    if (!result.ok) {
      return void message.error(
        result.details?.length
          ? messages.common.withDetails(
              result.message,
              result.details
                .map((detail) => `${detail.field}=${detail.reason}`)
                .join("; "),
            )
          : result.message,
      );
    }
    message.success(m.saved);
    await onSaved();
  }

  return (
    <Card>
      <Form layout="vertical" component="div" className="max-w-2xl">
        <Form.Item label={m.formNameLabel} required>
          <Input
            placeholder={m.formName}
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
        </Form.Item>
        <Form.Item label={m.formDescriptionLabel}>
          <Input.TextArea
            placeholder={m.formDescription}
            value={description}
            maxLength={500}
            autoSize={{ minRows: 2 }}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Form.Item>
        <Form.Item>
          <ModesPicker
            value={modes}
            onChange={setModes}
            actingUser={{ value: actingUser, onChange: setActingUser }}
          />
        </Form.Item>
        {modes.includes("delegated") && (
          <Form.Item label={m.formClientIds} extra={m.formClientIdsHint}>
            <Select
              mode="tags"
              className="w-full"
              value={clientIds}
              onChange={setClientIds}
              tokenSeparators={[",", " "]}
            />
          </Form.Item>
        )}
        <Space>
          <Button
            type="primary"
            loading={busy}
            disabled={!name.trim() || modes.length === 0}
            onClick={() =>
              void save({
                name: name.trim(),
                description: description.trim(),
                modes,
                allow_acting_user: actingUser,
                keycloak_client_ids: clientIds,
              })
            }
          >
            {m.save}
          </Button>
          {row.active ? (
            <Popconfirm
              title={m.deactivateConfirm}
              description={m.deactivateConfirmBody}
              onConfirm={() => save({ active: false })}
            >
              <Button danger>{m.deactivate}</Button>
            </Popconfirm>
          ) : (
            <Button onClick={() => void save({ active: true })}>
              {m.activate}
            </Button>
          )}
        </Space>
      </Form>
    </Card>
  );
}

function McpTab({
  endpoint,
  canAudit,
}: {
  readonly endpoint: string | null;
  readonly canAudit: boolean;
}) {
  return (
    <Card>
      <Text strong className="text-xs">
        {m.mcpEndpoint}
      </Text>
      {endpoint ? (
        <Paragraph copyable={{ text: endpoint }} className="mt-1">
          <Text code>{endpoint}</Text>
        </Paragraph>
      ) : (
        <Paragraph type="secondary" className="mt-1 text-xs">
          {m.mcpEndpointUnset}
        </Paragraph>
      )}
      <Paragraph className="text-sm">{m.mcpCredential}</Paragraph>
      <Text strong className="text-xs">
        {m.mcpHowTo}
      </Text>
      <ol className="mt-1 mb-3 list-decimal space-y-1 pl-5 text-sm">
        {m.mcpSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {canAudit && <Link href={ROUTES.adminAiAudit}>{m.mcpAudit}</Link>}
    </Card>
  );
}

function CallsTab({
  id,
  canAudit,
}: {
  readonly id: string;
  readonly canAudit: boolean;
}) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<IntegrationCall[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listIntegrationCalls(id, page, PAGE_SIZE).then((result) => {
      if (!result.ok) return setError(result.message);
      setRows(result.data.data);
      setTotal(result.data.total);
    });
  }, [id, page]);

  if (error) {
    return (
      <Alert type="error" showIcon title={m.loadFailed} description={error} />
    );
  }

  return (
    <Card>
      <Paragraph type="secondary" className="text-xs">
        {m.callsHint}
        {canAudit && (
          <>
            {" "}
            {m.callsVsAudit}{" "}
            <Link href={ROUTES.adminAiAudit}>{m.mcpAudit}</Link>
          </>
        )}
      </Paragraph>
      <Table<IntegrationCall>
        rowKey="id"
        size="small"
        loading={rows === null}
        dataSource={rows ?? []}
        locale={{ emptyText: m.callsEmpty }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: setPage,
        }}
        columns={[
          {
            title: m.callAt,
            dataIndex: "at",
            width: 150,
            render: (iso: string) =>
              new Date(iso).toLocaleString("th-TH", {
                dateStyle: "short",
                timeStyle: "medium",
              }),
          },
          {
            title: m.callRoute,
            key: "route",
            render: (_, call) => (
              <Text code className="text-xs">
                {call.method} {call.route}
              </Text>
            ),
          },
          {
            title: m.callMode,
            dataIndex: "mode",
            width: 120,
            render: (mode: IntegrationCall["mode"]) => m.callModeLabel[mode],
          },
          {
            title: m.callStatus,
            dataIndex: "status",
            width: 80,
            render: (status: number) => (
              <Tag color={status < 400 ? "success" : "error"}>{status}</Tag>
            ),
          },
          {
            title: m.callDuration,
            dataIndex: "duration_ms",
            width: 90,
            render: (ms: number) => `${ms} ms`,
          },
        ]}
      />
    </Card>
  );
}
