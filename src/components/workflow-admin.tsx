"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import type { ClientResult } from "@/lib/api/client";
import {
  createWorkflow,
  publishWorkflow,
  saveWorkflowGraph,
} from "@/lib/api/client-workflow";
import type {
  RequestType,
  WorkflowAction,
  WorkflowDataMap,
  WorkflowDefinition,
  WorkflowState,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** The §7.1 statuses, in the order `RequestStatus` declares them. */
const PHASES = [
  "draft",
  "submitted",
  "returned",
  "pending_approval",
  "approved",
  "rejected",
  "in_progress",
  "on_hold",
  "completed",
  "closed",
  "cancelled",
] as const;

const AUTHORITIES = Object.keys(
  messages.workflow.action.authorities,
) as (keyof typeof messages.workflow.action.authorities)[];

const TARGET_COLUMNS = Object.keys(
  messages.workflow.dataFlow.columns,
) as (keyof typeof messages.workflow.dataFlow.columns)[];

/**
 * หน้า Set Workflow — where a request type's route is assembled.
 *
 * Four things, in the order somebody builds them: the states a request can sit
 * in, the form each shows, the buttons out of each, and where the answers go.
 *
 * **Publishing is one-way.** A published version is immutable, so the screen
 * offers "publish a new version" rather than "edit" — the same shape screen A1
 * takes, and for the same reason: a request already running keeps the route it
 * started on (§7). Everything is disabled once `status !== "draft"`.
 *
 * The server re-validates the whole graph at publish and answers with every
 * fault at once, which is what the alert at the top renders. Nothing here
 * duplicates those rules: a screen that decided for itself whether a route was
 * publishable would be a second, weaker copy of `workflow-rules.ts`.
 */
export function WorkflowAdmin({
  definitions,
  types,
  initial,
}: {
  readonly definitions: WorkflowDefinition[];
  readonly types: RequestType[];
  /** The graph of the version selected on the server, if any. */
  readonly initial: WorkflowDefinition | null;
}) {
  const { message } = App.useApp();

  const [versions, setVersions] = useState(definitions);
  const [current, setCurrent] = useState<WorkflowDefinition | null>(initial);
  const [states, setStates] = useState<WorkflowState[]>(initial?.states ?? []);
  const [actions, setActions] = useState<WorkflowAction[]>(
    initial?.actions ?? [],
  );

  const [typeId, setTypeId] = useState<string | undefined>(
    initial?.requestTypeId ?? types[0]?.id,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [faults, setFaults] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  /** Which state's or action's schema dialog is open. */
  const [editingSchema, setEditingSchema] = useState<
    | { kind: "state"; index: number }
    | { kind: "action"; index: number }
    | null
  >(null);

  const readOnly = current?.status !== "draft";
  const visibleVersions = useMemo(
    () => versions.filter((version) => version.requestTypeId === typeId),
    [versions, typeId],
  );

  const stateKeys = states.map((state) => state.key).filter(Boolean);

  async function run<T>(
    name: string,
    call: () => Promise<ClientResult<T>>,
    onOk: (data: T) => void,
  ) {
    setBusy(name);
    setFaults([]);

    const result = await call();
    setBusy(null);

    if (result.ok) {
      onOk(result.data);
      return;
    }

    // The server sends every fault at once so they can be fixed in one pass —
    // one error per save is how an admin stops using a screen.
    setFaults(
      result.details?.length
        ? result.details.map((detail) => `${detail.field} — ${detail.reason}`)
        : [result.message],
    );
  }

  function patchState(index: number, patch: Partial<WorkflowState>) {
    setStates((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function patchAction(index: number, patch: Partial<WorkflowAction>) {
    setActions((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-4">
      <Card size="small">
        <Space wrap align="center">
          <Text strong>{messages.workflow.selectType}</Text>
          <Select
            value={typeId}
            onChange={(value) => {
              setTypeId(value);
              setCurrent(null);
              setStates([]);
              setActions([]);
              setFaults([]);
            }}
            style={{ minWidth: 260 }}
            options={types.map((type) => ({
              value: type.id,
              label: `${type.code} — ${type.name}`,
            }))}
          />

          <Text strong>{messages.workflow.versions}</Text>
          <Select
            value={current?.id}
            placeholder={messages.workflow.empty}
            style={{ minWidth: 220 }}
            onChange={(value) => {
              const chosen = versions.find((version) => version.id === value);
              // The list carries no graph; the editor loads it from the page,
              // so switching version reloads through the server component.
              if (chosen) window.location.search = `?definition=${chosen.id}`;
            }}
            options={visibleVersions.map((version) => ({
              value: version.id,
              label: `v${version.version} · ${
                version.status === "draft"
                  ? messages.workflow.draft
                  : version.status === "published"
                    ? messages.workflow.published
                    : messages.workflow.retired
              }`,
            }))}
          />

          <Button onClick={() => setCreating(true)} disabled={!typeId}>
            {messages.workflow.newDraft}
          </Button>

          {current ? (
            <>
              <Button
                type="default"
                loading={busy === "save"}
                disabled={readOnly}
                onClick={() =>
                  run(
                    "save",
                    () => saveWorkflowGraph(current.id, { states, actions }),
                    () => message.success(messages.workflow.saved),
                  )
                }
              >
                {messages.workflow.save}
              </Button>

              <Popconfirm
                title={messages.workflow.publishConfirm}
                description={messages.workflow.publishConfirmBody}
                okText={messages.org.confirmOk}
                cancelText={messages.org.confirmCancel}
                disabled={readOnly}
                onConfirm={() =>
                  run(
                    "publish",
                    () => publishWorkflow(current.id),
                    (published) => {
                      message.success(messages.workflow.publishedOk);
                      setCurrent(published);
                      setVersions((rows) =>
                        rows.map((row) =>
                          row.id === published.id ? published : row,
                        ),
                      );
                    },
                  )
                }
              >
                <Button type="primary" loading={busy === "publish"} disabled={readOnly}>
                  {messages.workflow.publish}
                </Button>
              </Popconfirm>
            </>
          ) : null}
        </Space>
      </Card>

      {readOnly && current ? (
        <Alert type="info" showIcon message={messages.workflow.readOnly} />
      ) : null}

      {faults.length ? (
        <Alert
          type="error"
          showIcon
          message={messages.workflow.errors.invalid}
          description={
            <ul className="m-0 list-disc pl-5">
              {faults.map((fault) => (
                <li key={fault}>{fault}</li>
              ))}
            </ul>
          }
        />
      ) : null}

      {!current ? (
        <Card>
          <Empty description={messages.workflow.empty}>
            <Text type="secondary">{messages.workflow.emptyHint}</Text>
          </Empty>
        </Card>
      ) : (
        <Tabs
          items={[
            {
              key: "states",
              label: messages.workflow.tabs.states,
              children: (
                <StatesTab
                  states={states}
                  readOnly={readOnly}
                  onPatch={patchState}
                  onAdd={() =>
                    setStates((rows) => [
                      ...rows,
                      {
                        key: "",
                        name: "",
                        phase: "in_progress",
                        kind: "user_task",
                        isStart: rows.length === 0,
                      },
                    ])
                  }
                  onRemove={(index) =>
                    setStates((rows) => rows.filter((_, i) => i !== index))
                  }
                  onEditSchema={(index) =>
                    setEditingSchema({ kind: "state", index })
                  }
                />
              ),
            },
            {
              key: "actions",
              label: messages.workflow.tabs.actions,
              children: (
                <ActionsTab
                  actions={actions}
                  stateKeys={stateKeys}
                  readOnly={readOnly}
                  onPatch={patchAction}
                  onAdd={() =>
                    setActions((rows) => [
                      ...rows,
                      {
                        fromStateKey: stateKeys[0] ?? "",
                        actionKey: "",
                        toStateKey: stateKeys[0] ?? "",
                        label: "",
                        authority: "carrier",
                        confirmRequired: false,
                        dataMaps: [],
                      },
                    ])
                  }
                  onRemove={(index) =>
                    setActions((rows) => rows.filter((_, i) => i !== index))
                  }
                  onEditSchema={(index) =>
                    setEditingSchema({ kind: "action", index })
                  }
                />
              ),
            },
            {
              key: "dataFlow",
              label: messages.workflow.tabs.dataFlow,
              children: (
                <DataFlowTab
                  actions={actions}
                  readOnly={readOnly}
                  onPatch={patchAction}
                />
              ),
            },
          ]}
        />
      )}

      <SchemaDialog
        open={editingSchema !== null}
        value={
          editingSchema?.kind === "state"
            ? states[editingSchema.index]?.formSchema
            : editingSchema
              ? actions[editingSchema.index]?.formSchema
              : null
        }
        hint={
          editingSchema?.kind === "state"
            ? messages.workflow.formSchema.stateHint
            : messages.workflow.formSchema.actionHint
        }
        readOnly={readOnly}
        onClose={() => setEditingSchema(null)}
        onSave={(schema) => {
          if (!editingSchema) return;
          if (editingSchema.kind === "state") {
            patchState(editingSchema.index, { formSchema: schema });
          } else {
            patchAction(editingSchema.index, { formSchema: schema });
          }
          setEditingSchema(null);
        }}
      />

      <Modal
        open={creating}
        title={messages.workflow.newDraft}
        okText={messages.org.confirmOk}
        cancelText={messages.org.confirmCancel}
        confirmLoading={busy === "create"}
        onCancel={() => setCreating(false)}
        onOk={() =>
          run(
            "create",
            () =>
              createWorkflow({
                request_type_id: typeId!,
                name: draftName.trim(),
              }),
            (created) => {
              setCreating(false);
              setDraftName("");
              window.location.search = `?definition=${created.id}`;
            },
          )
        }
      >
        <Input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={messages.workflow.newDraftName}
        />
      </Modal>
    </div>
  );
}

function StatesTab({
  states,
  readOnly,
  onPatch,
  onAdd,
  onRemove,
  onEditSchema,
}: {
  readonly states: WorkflowState[];
  readonly readOnly: boolean;
  readonly onPatch: (index: number, patch: Partial<WorkflowState>) => void;
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
  readonly onEditSchema: (index: number) => void;
}) {
  return (
    <Card
      size="small"
      extra={
        <Button size="small" onClick={onAdd} disabled={readOnly}>
          {messages.workflow.state.add}
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        className="mb-3!"
        message={messages.workflow.state.phaseHint}
      />

      <Table<WorkflowState>
        size="small"
        rowKey={(_, index) => String(index)}
        dataSource={states}
        pagination={false}
        locale={{ emptyText: messages.workflow.state.empty }}
        columns={[
          {
            title: messages.workflow.state.key,
            dataIndex: "key",
            render: (value: string, _row, index) => (
              <Input
                value={value}
                disabled={readOnly}
                onChange={(event) => onPatch(index, { key: event.target.value })}
              />
            ),
          },
          {
            title: messages.workflow.state.name,
            dataIndex: "name",
            render: (value: string, _row, index) => (
              <Input
                value={value}
                disabled={readOnly}
                onChange={(event) => onPatch(index, { name: event.target.value })}
              />
            ),
          },
          {
            title: messages.workflow.state.phase,
            dataIndex: "phase",
            render: (value: string, _row, index) => (
              <Select
                value={value}
                disabled={readOnly}
                style={{ minWidth: 170 }}
                onChange={(phase) => onPatch(index, { phase })}
                options={PHASES.map((phase) => ({ value: phase, label: phase }))}
              />
            ),
          },
          {
            title: messages.workflow.state.kind,
            dataIndex: "kind",
            render: (value: WorkflowState["kind"], _row, index) => (
              <Select
                value={value}
                disabled={readOnly}
                style={{ minWidth: 130 }}
                onChange={(kind) => onPatch(index, { kind })}
                options={Object.entries(messages.workflow.state.kinds).map(
                  ([key, label]) => ({ value: key, label }),
                )}
              />
            ),
          },
          {
            title: messages.workflow.state.isStart,
            dataIndex: "isStart",
            render: (value: boolean, _row, index) => (
              <Checkbox
                checked={value}
                disabled={readOnly}
                onChange={(event) =>
                  onPatch(index, { isStart: event.target.checked })
                }
              />
            ),
          },
          {
            title: messages.workflow.state.slaHours,
            dataIndex: "slaHours",
            render: (value: number | null, _row, index) => (
              <InputNumber
                value={value ?? undefined}
                min={0}
                disabled={readOnly}
                placeholder={messages.workflow.state.slaHint}
                onChange={(slaHours) =>
                  onPatch(index, { slaHours: slaHours ?? null })
                }
              />
            ),
          },
          {
            title: messages.workflow.tabs.forms,
            render: (_value, _row, index) => (
              <Button size="small" onClick={() => onEditSchema(index)}>
                {messages.workflow.formSchema.title}
              </Button>
            ),
          },
          {
            title: "",
            render: (_value, _row, index) => (
              <Button
                size="small"
                danger
                disabled={readOnly}
                onClick={() => onRemove(index)}
              >
                {messages.workflow.state.remove}
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}

function ActionsTab({
  actions,
  stateKeys,
  readOnly,
  onPatch,
  onAdd,
  onRemove,
  onEditSchema,
}: {
  readonly actions: WorkflowAction[];
  readonly stateKeys: string[];
  readonly readOnly: boolean;
  readonly onPatch: (index: number, patch: Partial<WorkflowAction>) => void;
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
  readonly onEditSchema: (index: number) => void;
}) {
  const stateOptions = stateKeys.map((key) => ({ value: key, label: key }));

  return (
    <Card
      size="small"
      extra={
        <Button size="small" onClick={onAdd} disabled={readOnly || !stateKeys.length}>
          {messages.workflow.action.add}
        </Button>
      }
    >
      <Table<WorkflowAction>
        size="small"
        rowKey={(_, index) => String(index)}
        dataSource={actions}
        pagination={false}
        locale={{ emptyText: messages.workflow.action.empty }}
        columns={[
          {
            title: messages.workflow.action.fromState,
            dataIndex: "fromStateKey",
            render: (value: string, _row, index) => (
              <Select
                value={value}
                disabled={readOnly}
                style={{ minWidth: 130 }}
                options={stateOptions}
                onChange={(fromStateKey) => onPatch(index, { fromStateKey })}
              />
            ),
          },
          {
            title: messages.workflow.action.actionKey,
            dataIndex: "actionKey",
            render: (value: string, _row, index) => (
              <Input
                value={value}
                disabled={readOnly}
                onChange={(event) =>
                  onPatch(index, { actionKey: event.target.value })
                }
              />
            ),
          },
          {
            title: messages.workflow.action.label,
            dataIndex: "label",
            render: (value: string, _row, index) => (
              <Input
                value={value}
                disabled={readOnly}
                onChange={(event) => onPatch(index, { label: event.target.value })}
              />
            ),
          },
          {
            title: messages.workflow.action.toState,
            dataIndex: "toStateKey",
            render: (value: string, _row, index) => (
              <Select
                value={value}
                disabled={readOnly}
                style={{ minWidth: 130 }}
                options={stateOptions}
                onChange={(toStateKey) => onPatch(index, { toStateKey })}
              />
            ),
          },
          {
            title: messages.workflow.action.authority,
            dataIndex: "authority",
            render: (value: string, _row, index) => (
              <Select
                value={value}
                disabled={readOnly}
                style={{ minWidth: 200 }}
                onChange={(authority) => onPatch(index, { authority })}
                options={AUTHORITIES.map((key) => ({
                  value: key,
                  label: messages.workflow.action.authorities[key],
                }))}
              />
            ),
          },
          {
            title: messages.workflow.action.condition,
            dataIndex: "condition",
            render: (value: string | null, _row, index) => (
              <Input
                value={value ?? ""}
                disabled={readOnly}
                placeholder={messages.workflow.action.conditionHint}
                onChange={(event) =>
                  onPatch(index, { condition: event.target.value })
                }
              />
            ),
          },
          {
            title: messages.workflow.action.confirmRequired,
            dataIndex: "confirmRequired",
            render: (value: boolean, _row, index) => (
              <Checkbox
                checked={value ?? false}
                disabled={readOnly}
                onChange={(event) =>
                  onPatch(index, { confirmRequired: event.target.checked })
                }
              />
            ),
          },
          {
            title: messages.workflow.tabs.forms,
            render: (_value, _row, index) => (
              <Button size="small" onClick={() => onEditSchema(index)}>
                {messages.workflow.formSchema.title}
              </Button>
            ),
          },
          {
            title: "",
            render: (_value, _row, index) => (
              <Button
                size="small"
                danger
                disabled={readOnly}
                onClick={() => onRemove(index)}
              >
                {messages.workflow.action.remove}
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}

/**
 * Where a button's answers go.
 *
 * Grouped under the button rather than listed flat: a mapping only means
 * anything in the context of the form it reads from, and "which button wrote
 * this into receiver_form_data" is the question this screen has to answer.
 */
function DataFlowTab({
  actions,
  readOnly,
  onPatch,
}: {
  readonly actions: WorkflowAction[];
  readonly readOnly: boolean;
  readonly onPatch: (index: number, patch: Partial<WorkflowAction>) => void;
}) {
  if (!actions.length) {
    return (
      <Card size="small">
        <Empty description={messages.workflow.action.empty} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon message={messages.workflow.dataFlow.hint} />

      {actions.map((action, index) => {
        const maps = action.dataMaps ?? [];

        function patchMaps(next: WorkflowDataMap[]) {
          onPatch(index, { dataMaps: next });
        }

        return (
          <Card
            key={`${action.fromStateKey}-${action.actionKey}-${index}`}
            size="small"
            title={
              <Space>
                <Tag>{action.fromStateKey}</Tag>
                <Text strong>{action.label || action.actionKey}</Text>
              </Space>
            }
            extra={
              <Button
                size="small"
                disabled={readOnly}
                onClick={() =>
                  patchMaps([
                    ...maps,
                    {
                      sourceField: "",
                      variableName: "",
                      targetColumn: "form_data",
                    },
                  ])
                }
              >
                {messages.workflow.dataFlow.add}
              </Button>
            }
          >
            <Table<WorkflowDataMap>
              size="small"
              rowKey={(_, mapIndex) => String(mapIndex)}
              dataSource={maps}
              pagination={false}
              locale={{ emptyText: messages.workflow.dataFlow.empty }}
              columns={[
                {
                  title: messages.workflow.dataFlow.sourceField,
                  dataIndex: "sourceField",
                  render: (value: string, _row, mapIndex) => (
                    <Input
                      value={value}
                      disabled={readOnly}
                      onChange={(event) =>
                        patchMaps(
                          maps.map((map, i) =>
                            i === mapIndex
                              ? { ...map, sourceField: event.target.value }
                              : map,
                          ),
                        )
                      }
                    />
                  ),
                },
                {
                  title: messages.workflow.dataFlow.variableName,
                  dataIndex: "variableName",
                  render: (value: string, _row, mapIndex) => (
                    <Input
                      value={value}
                      disabled={readOnly}
                      onChange={(event) =>
                        patchMaps(
                          maps.map((map, i) =>
                            i === mapIndex
                              ? { ...map, variableName: event.target.value }
                              : map,
                          ),
                        )
                      }
                    />
                  ),
                },
                {
                  title: messages.workflow.dataFlow.targetColumn,
                  dataIndex: "targetColumn",
                  render: (value: string, _row, mapIndex) => (
                    <Select
                      value={value}
                      disabled={readOnly}
                      style={{ minWidth: 260 }}
                      onChange={(targetColumn) =>
                        patchMaps(
                          maps.map((map, i) =>
                            i === mapIndex ? { ...map, targetColumn } : map,
                          ),
                        )
                      }
                      options={TARGET_COLUMNS.map((key) => ({
                        value: key,
                        label: messages.workflow.dataFlow.columns[key],
                      }))}
                    />
                  ),
                },
                {
                  title: "",
                  render: (_value, _row, mapIndex) => (
                    <Button
                      size="small"
                      danger
                      disabled={readOnly}
                      onClick={() =>
                        patchMaps(maps.filter((_, i) => i !== mapIndex))
                      }
                    >
                      {messages.workflow.dataFlow.remove}
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        );
      })}
    </div>
  );
}

/** The JSON Schema editor, shared by a state's form and an action's form. */
function SchemaDialog({
  open,
  value,
  hint,
  readOnly,
  onClose,
  onSave,
}: {
  readonly open: boolean;
  readonly value: Record<string, unknown> | null | undefined;
  readonly hint: string;
  readonly readOnly: boolean;
  readonly onClose: () => void;
  readonly onSave: (schema: Record<string, unknown> | null) => void;
}) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <Modal
      open={open}
      title={messages.workflow.formSchema.title}
      okText={messages.org.confirmOk}
      cancelText={messages.org.confirmCancel}
      okButtonProps={{ disabled: readOnly }}
      afterOpenChange={(opened) => {
        if (!opened) return;
        setText(value ? JSON.stringify(value, null, 2) : "");
        setInvalid(false);
      }}
      onCancel={onClose}
      onOk={() => {
        const trimmed = text.trim();
        if (!trimmed) {
          onSave(null);
          return;
        }

        try {
          onSave(JSON.parse(trimmed) as Record<string, unknown>);
        } catch {
          // Saving unparseable JSON would fail at the server with a message
          // about the request body rather than about this field.
          setInvalid(true);
        }
      }}
    >
      <Text type="secondary">{hint}</Text>
      <Input.TextArea
        rows={14}
        value={text}
        disabled={readOnly}
        className="mt-2! font-mono"
        onChange={(event) => {
          setText(event.target.value);
          setInvalid(false);
        }}
      />
      {invalid ? (
        <Alert
          type="error"
          showIcon
          className="mt-2!"
          message={messages.workflow.formSchema.invalid}
        />
      ) : null}
    </Modal>
  );
}
