"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  createWorkflowTrigger,
  listWorkflowStarts,
  listWorkflowTriggerEvents,
  listWorkflowTriggers,
  retryWorkflowStart,
  testWorkflowTrigger,
  updateWorkflowTrigger,
  type WorkflowStartRow,
  type WorkflowTriggerEvent,
  type WorkflowTriggerRow,
} from "@/lib/api/workflow-triggers";
import type { ClientResult } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.workflowTriggers;

function errorText(result: Extract<ClientResult<unknown>, { ok: false }>) {
  return result.details?.length
    ? messages.common.withDetails(
        result.message,
        result.details.map((detail) => detail.reason).join("; "),
      )
    : result.message;
}

function dateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StartStatus({ status }: { status: string }) {
  return (
    <Tag color={m.startColor[status]}>{m.startStatus[status] ?? status}</Tag>
  );
}

/**
 * ตั้งว่าเหตุการณ์ไหนใน CTD เริ่ม workflow ไหนบน OSD Workflow
 * (`admin.integration.manage`).
 *
 * channel key ส่งเข้าอย่างเดียว — หน้านี้ไม่เคยได้รับกลับ จึงแสดงแค่ว่าตั้งแล้วหรือยัง
 */
export function WorkflowTriggerAdmin() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<WorkflowTriggerRow[] | null>(null);
  const [events, setEvents] = useState<WorkflowTriggerEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** null = closed; "new" = adding; a row = editing it. */
  const [form, setForm] = useState<WorkflowTriggerRow | "new" | null>(null);
  const [name, setName] = useState("");
  const [eventKey, setEventKey] = useState<string | undefined>();
  const [typeCodes, setTypeCodes] = useState<string[]>([]);
  const [channelId, setChannelId] = useState("");
  const [channelKey, setChannelKey] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [history, setHistory] = useState<WorkflowTriggerRow | null>(null);
  const [starts, setStarts] = useState<WorkflowStartRow[] | null>(null);

  const refresh = useCallback(
    () =>
      listWorkflowTriggers().then((result) => {
        if (result.ok) setRows(result.data);
        else setError(result.message);
      }),
    [],
  );

  useEffect(() => {
    void refresh();
    void listWorkflowTriggerEvents().then((result) => {
      if (result.ok) setEvents(result.data);
    });
  }, [refresh]);

  const eventOf = useMemo(
    () => new Map(events.map((event) => [event.key, event])),
    [events],
  );
  const chosenEvent = eventKey ? eventOf.get(eventKey) : undefined;
  const filterKind = chosenEvent?.filter_kind ?? "request_type";

  const ready =
    name.trim().length > 0 &&
    Boolean(eventKey) &&
    channelId.trim().length > 0 &&
    (form !== "new" || channelKey.trim().length > 0);

  function open(row: WorkflowTriggerRow | "new") {
    const isNew = row === "new";
    setName(isNew ? "" : row.name);
    setEventKey(isNew ? undefined : row.event_key);
    setTypeCodes(isNew ? [] : [...row.type_codes]);
    setChannelId(isNew ? "" : row.channel_id);
    setChannelKey("");
    setOrganizationId(isNew ? "" : row.organization_id);
    setWorkspaceId(isNew ? "" : row.workspace_id);
    setForm(row);
  }

  async function save() {
    if (!ready || form === null || !eventKey) return;
    setBusy(true);
    const payload = {
      name: name.trim(),
      event_key: eventKey,
      type_codes: chosenEvent?.filters_by_type ? typeCodes : [],
      channel_id: channelId.trim(),
      ...(channelKey.trim() ? { channel_key: channelKey.trim() } : {}),
      ...(organizationId.trim()
        ? { organization_id: organizationId.trim() }
        : {}),
      ...(workspaceId.trim() ? { workspace_id: workspaceId.trim() } : {}),
    };
    const result =
      form === "new"
        ? await createWorkflowTrigger(payload)
        : await updateWorkflowTrigger(form.id, payload);
    setBusy(false);
    // the key leaves this page's state as soon as it is sent
    setChannelKey("");
    if (!result.ok) return void message.error(errorText(result));
    message.success(m.saved);
    setForm(null);
    await refresh();
  }

  async function toggle(row: WorkflowTriggerRow) {
    const result = await updateWorkflowTrigger(row.id, { active: !row.active });
    if (!result.ok) return void message.error(errorText(result));
    await refresh();
  }

  async function test(row: WorkflowTriggerRow) {
    const result = await testWorkflowTrigger(row.id);
    if (!result.ok) return void message.error(errorText(result));
    message.success(m.testQueued);
  }

  async function openHistory(row: WorkflowTriggerRow) {
    setHistory(row);
    setStarts(null);
    const result = await listWorkflowStarts(row.id);
    if (!result.ok) return void message.error(errorText(result));
    setStarts(result.data);
  }

  async function retry(start: WorkflowStartRow) {
    if (!history) return;
    const result = await retryWorkflowStart(history.id, start.id);
    if (!result.ok) return void message.error(errorText(result));
    message.success(m.retryQueued);
    await openHistory(history);
  }

  if (error) {
    return (
      <Alert type="error" showIcon title={m.loadFailed} description={error} />
    );
  }

  if (!rows) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        title={m.title}
        extra={
          <Button type="primary" onClick={() => open("new")}>
            {m.add}
          </Button>
        }
      >
        <Table<WorkflowTriggerRow>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: m.empty }}
          scroll={{ x: true }}
          columns={[
            { title: m.columnName, dataIndex: "name" },
            {
              title: m.columnEvent,
              key: "event",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>
                    {eventOf.get(row.event_key)?.label ?? row.event_key}
                  </span>
                  {row.type_codes.length > 0 && (
                    <Text type="secondary" className="text-xs">
                      {m.filter[
                        eventOf.get(row.event_key)?.filter_kind ??
                          "request_type"
                      ].only(row.type_codes.join(", "))}
                    </Text>
                  )}
                </Space>
              ),
            },
            {
              title: m.columnChannel,
              dataIndex: "channel_id",
              render: (value: string) => (
                <code className="text-xs break-all">{value}</code>
              ),
            },
            {
              title: m.columnLastStart,
              key: "last",
              render: (_, row) =>
                row.last_start ? (
                  <Space direction="vertical" size={0}>
                    <StartStatus status={row.last_start.status} />
                    <Text type="secondary" className="text-xs">
                      {dateTime(row.last_start.created_at)}
                    </Text>
                  </Space>
                ) : (
                  "—"
                ),
            },
            {
              title: m.columnStatus,
              dataIndex: "active",
              width: 90,
              render: (active: boolean) => (
                <Tag color={active ? "green" : "default"}>
                  {active ? m.active : m.inactive}
                </Tag>
              ),
            },
            {
              title: m.columnActions,
              key: "actions",
              width: 320,
              render: (_, row) => (
                <span className="flex flex-wrap gap-2">
                  <Button size="small" onClick={() => open(row)}>
                    {m.edit}
                  </Button>
                  <Button size="small" onClick={() => void toggle(row)}>
                    {row.active ? m.disable : m.enable}
                  </Button>
                  <Popconfirm
                    title={m.testConfirm}
                    description={m.testConfirmBody}
                    onConfirm={() => test(row)}
                    disabled={!row.active}
                  >
                    <Button size="small" disabled={!row.active}>
                      {m.test}
                    </Button>
                  </Popconfirm>
                  <Button size="small" onClick={() => void openHistory(row)}>
                    {m.history}
                  </Button>
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={form !== null}
        title={form === "new" ? m.add : m.edit}
        okText={m.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !ready }}
        onCancel={() => {
          setChannelKey("");
          setForm(null);
        }}
        onOk={() => void save()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Input
            placeholder={m.formName}
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <Select
              className="w-full"
              placeholder={m.formEvent}
              value={eventKey}
              options={events.map((event) => ({
                value: event.key,
                label: event.label,
              }))}
              onChange={(value: string) => setEventKey(value)}
            />
            {chosenEvent && (
              <Text type="secondary" className="text-xs">
                {m.formVariables(chosenEvent.variables.join(", "))}
              </Text>
            )}
          </div>
          {chosenEvent?.filters_by_type && (
            <div>
              <Select
                mode="tags"
                className="w-full"
                placeholder={m.filter[filterKind].placeholder}
                value={typeCodes}
                onChange={(values: string[]) =>
                  setTypeCodes(
                    values
                      .map((value) =>
                        // request types are uppercase, lead statuses lowercase
                        filterKind === "lead_status"
                          ? value.trim().toLowerCase()
                          : value.trim().toUpperCase(),
                      )
                      .filter(Boolean),
                  )
                }
              />
              <Text type="secondary" className="text-xs">
                {m.filter[filterKind].hint}
              </Text>
            </div>
          )}
          <div>
            <Input
              placeholder={m.formChannelId}
              value={channelId}
              maxLength={64}
              onChange={(e) => setChannelId(e.target.value)}
            />
            <Text type="secondary" className="text-xs">
              {m.formChannelIdHint}
            </Text>
          </div>
          <div>
            <Input.Password
              placeholder={
                form !== "new" && form?.has_channel_key
                  ? m.formChannelKeyKeep
                  : m.formChannelKey
              }
              value={channelKey}
              maxLength={500}
              autoComplete="new-password"
              onChange={(e) => setChannelKey(e.target.value)}
            />
            <Text type="secondary" className="text-xs">
              {m.formChannelKeyHint}
            </Text>
          </div>
          <Space.Compact className="w-full">
            <Input
              placeholder={m.formOrganization}
              value={organizationId}
              maxLength={100}
              onChange={(e) => setOrganizationId(e.target.value)}
            />
            <Input
              placeholder={m.formWorkspace}
              value={workspaceId}
              maxLength={100}
              onChange={(e) => setWorkspaceId(e.target.value)}
            />
          </Space.Compact>
        </Space>
      </Modal>

      <Drawer
        open={history !== null}
        title={`${m.history} · ${history?.name ?? ""}`}
        width={820}
        onClose={() => setHistory(null)}
        extra={
          history && (
            <Button size="small" onClick={() => void openHistory(history)}>
              ↻
            </Button>
          )
        }
      >
        {starts === null ? (
          <Spin />
        ) : (
          <Table<WorkflowStartRow>
            rowKey="id"
            size="small"
            dataSource={starts}
            pagination={false}
            locale={{ emptyText: m.historyEmpty }}
            scroll={{ x: true }}
            columns={[
              {
                title: m.columnAt,
                dataIndex: "created_at",
                render: (iso: string) => dateTime(iso),
              },
              {
                title: m.columnResource,
                key: "resource",
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    <span>
                      {m.resourceType[row.resource_type] ?? row.resource_type}
                    </span>
                    <code className="text-xs break-all">{row.resource_id}</code>
                  </Space>
                ),
              },
              {
                title: m.columnStatus,
                dataIndex: "status",
                render: (status: string) => <StartStatus status={status} />,
              },
              { title: m.columnAttempts, dataIndex: "attempts", width: 70 },
              {
                title: m.columnResult,
                key: "result",
                render: (_, row) =>
                  row.instance_id ? (
                    <code className="text-xs break-all">{row.instance_id}</code>
                  ) : (
                    (row.last_error ??
                    (row.last_status_code
                      ? `HTTP ${row.last_status_code}`
                      : "—"))
                  ),
              },
              {
                title: "",
                key: "retry",
                width: 90,
                render: (_, row) =>
                  row.status === "dead" ? (
                    <Button size="small" onClick={() => void retry(row)}>
                      {m.retry}
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}
