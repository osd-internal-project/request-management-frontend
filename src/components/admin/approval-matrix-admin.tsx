"use client";

import { Fragment, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Segmented,
  Select,
  Table,
  Tag,
} from "antd";
import type { FormInstance } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { adminApi } from "@/lib/api/client";
import {
  FLOW_CONDITION_OPS,
  type ApprovalMatrixVersion,
  type FlowCondition,
  type MatrixLevel,
  type MatrixLevelOptions,
  type OrgUnitNode,
  type RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import {
  SearchSelect,
  SearchTreeSelect,
} from "@/components/ui/search-select";
import { buildUnitTree, type UnitTreeNode } from "@/lib/org/org-tree";

export type { ApprovalMatrixVersion } from "@/lib/api/types";


/** The Thai titles §16 prints in the ladder, not the storage codes. */



/**
 * The subject a request type's after-work ladder is stored under.
 *
 * APV-02 builds this same string from the type code at submit, and A2 must
 * match it exactly — the two live in different files now, so a change here is
 * a change to routing, not to a label.
 *
 * The before-work ladder is this with `:pre` appended. Publishing one is what
 * switches the pre-work stage on; there is no separate flag anywhere, which is
 * why the two stages are two tabs rather than a checkbox.
 */
export function subjectOf(type: RequestType): string {
  return `request:${type.code}`;
}




function thaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * What changed between one version and the one before it — §16 prints this
 * beside each entry in `ประวัติเวอร์ชัน` (`ปรับ T1 เป็น 100,000`).
 *
 * **Derived, never stored.** A summary saved alongside a version is a second
 * copy of the same fact, and the two start disagreeing the first time anyone
 * edits one.
 *
 * Reports the first difference rather than all of them: the line is a jog to
 * the memory, and the full ladder is one click away in the table above.
 */
function changeSummary(
  levels: MatrixLevel[] | null,
  previous: MatrixLevel[] | null,
): string {
  if (!previous) return messages.matrix.historyInitial;

  const now = levels ?? [];

  for (let index = 0; index < Math.max(now.length, previous.length); index++) {
    const label = `${index + 1}`;
    const here = now[index];
    const before = previous[index];

    if (here && !before) return messages.matrix.historyTierAdded(label);
    if (!here && before) return messages.matrix.historyTierRemoved(label);
    if (!here || !before) continue;

    if (JSON.stringify(here) !== JSON.stringify(before)) {
      return messages.matrix.historyChainChanged(label);
    }
  }

  return messages.matrix.historyNoChange;
}

/**
 * §16 A1 — ตารางอำนาจอนุมัติ for one subject, as a panel inside A2.
 *
 * The subject arrives fixed rather than chosen: A2 has already selected the
 * request type in its left-hand list, and the two stages are its two approval
 * tabs, so the selector A1 used to draw would be asking a question that has
 * already been answered twice.
 *
 * Published versions render read-only, because they are immutable: editing a
 * ladder means publishing the next version, which is what lets work already in
 * flight keep the ladder it was routed under. An edit control on a published
 * version would promise something the API deliberately refuses.
 */
export function SubjectMatrixPanel({
  subject,
  companyId,
  versions,
  canManage,
  userNames,
  orgUnits,
  onPublished,
  conditionFields = [],
}: {
  /** `request:<CODE>` or `request:<CODE>:pre` — see {@link subjectOf}. */
  subject: string;
  /** Form fields a level condition may name; none hides the condition controls. */
  conditionFields?: readonly { value: string; label: string }[];
  companyId: string;
  /** Every version the company has; this panel keeps only its own subject's. */
  versions: ApprovalMatrixVersion[];
  /** `admin.approval-matrix.manage` — without it the ladder is read-only. */
  canManage: boolean;
  /** `userId` → display name, so the header can name who published a version. */
  userNames: Record<string, string>;
  /** The chart, for the `org` levels and for naming the groups a ladder uses. */
  orgUnits: OrgUnitNode[];
  /** Re-read the company's matrix — a published version is new server state. */
  onPublished: () => void | Promise<void>;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const [publishing, setPublishing] = useState(false);

  const unitTree = buildUnitTree(orgUnits);
  const live = versions
    .filter((version) => version.subjectType === subject && version.publishedAt)
    .sort((a, b) => b.version - a.version)[0];
  const unitNames = Object.fromEntries(
    orgUnits.map((unit) => [unit.id, unit.name]),
  );

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button type="primary" onClick={() => setPublishing(true)}>
            {messages.matrix.publishNew}
          </Button>
        </div>
      )}

      <SubjectLadder
        versions={versions.filter(
          (version) => version.subjectType === subject,
        )}
        userNames={userNames}
        unitNames={unitNames}
      />

      {/* Keyed on the subject and the live version so switching ladders, or
          publishing one, mounts a fresh form seeded from what is in force. */}
      <PublishDialog
        key={`${subject}:${live?.id ?? "none"}`}
        live={live}
        open={publishing}
        companyId={companyId}
        subject={subject}
        unitTree={unitTree}
        conditionFields={conditionFields}
        onClose={() => setPublishing(false)}
        onDone={async () => {
          setPublishing(false);
          void message.success(messages.matrix.saved);
          await onPublished();
        }}
      />
    </div>
  );
}

/** The ladder in force for one subject, plus the two cards §16 puts beneath it. */
function SubjectLadder({
  versions,
  userNames,
  unitNames,
}: {
  versions: ApprovalMatrixVersion[];
  userNames: Record<string, string>;
  unitNames: Record<string, string>;
}) {
  if (!versions.length) {
    return <Empty description={messages.matrix.emptyForSubject} />;
  }

  // Newest first, so index + 1 is always the version beneath.
  const ordered = [...versions].sort((a, b) => b.version - a.version);

  // Highest published version — the one actually routing cases.
  const liveVersion = ordered.find((version) => version.publishedAt)?.version;

  /*
    Only the ladder in force is drawn in full. §16 shows one table and a list;
    stacking every version's table made an old ceiling as prominent as the one
    actually routing cases.
  */
  const shown =
    ordered.find((version) => version.version === liveVersion) ?? ordered[0];

  return (
    <div className="space-y-4">
      {shown && (
        <MatrixVersionTable
          version={shown}
          live={shown.version === liveVersion}
          userNames={userNames}
          unitNames={unitNames}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <AlwaysEnforced />
        <VersionHistory versions={ordered} />
      </div>
    </div>
  );
}

/** §16 A1 — the rules that hold whatever the table above says. */
function AlwaysEnforced() {
  return (
    <Card
      size="small"
      title={messages.matrix.alwaysEnforcedTitle}
      className="flex-1"
    >
      <ul className="m-0 list-disc space-y-2 pl-5">
        {messages.matrix.alwaysEnforced.map((rule) => (
          <li key={rule}>
            <Text type="secondary" className="text-xs">
              {rule}
            </Text>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * §16 A1 — one line per version, newest first.
 *
 * Drawn even when there is only one version: §16 gives the card a fixed place
 * beside the rules, and a panel that appears on the second publish reads as a
 * screen that changed shape rather than as history that grew.
 */
function VersionHistory({ versions }: { versions: ApprovalMatrixVersion[] }) {
  return (
    <Card
      size="small"
      title={messages.matrix.historyTitle}
      className="w-full lg:w-[380px] lg:flex-none"
    >
      <ul className="m-0 list-none p-0">
        {versions.map((version, index) => {
          const previous = versions[index + 1] ?? null;
          const when = thaiDate(version.effectiveFrom);

          return (
            <li
              key={version.id}
              className="flex items-baseline justify-between gap-3 border-b border-black/5 py-2 text-xs last:border-b-0"
            >
              <span className="min-w-0">
                <Text>
                  {messages.matrix.version} {version.version}
                </Text>{" "}
                <Text type="secondary">
                  · {changeSummary(version.levels, previous?.levels ?? null)}
                </Text>
              </span>

              <Text
                type={version.publishedAt ? "success" : "warning"}
                className="shrink-0 text-xs"
              >
                {version.publishedAt
                  ? messages.matrix.historyEffective(when)
                  : messages.matrix.historyPending(when)}
              </Text>
            </li>
          );
        })}
      </ul>

      <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
        {messages.matrix.historyNote}
      </Paragraph>
    </Card>
  );
}

/**
 * A level, in one line — what the ladder table prints in place of a chain.
 *
 * Named for what it *is* rather than for who it resolves to today: the whole
 * point of a `supervisor` level is that it follows people as they move, so
 * printing a name here would make the ladder look like a list of individuals.
 */
function levelLabel(
  level: MatrixLevel,
  unitNames: Record<string, string>,
): string {
  if (level.type === "supervisor") {
    return messages.matrix.supervisorLevel[level.up] ?? `หัวหน้าชั้นที่ ${level.up}`;
  }

  return level.orgUnitIds
    .map((id) => unitNames[id] ?? id)
    .join(" · ");
}

/** The `ความหมาย` column: who that resolves to, and how. */
function levelMeaning(
  level: MatrixLevel,
  unitNames: Record<string, string>,
  userNames: Record<string, string>,
): string {
  if (level.type === "supervisor") return messages.matrix.meaningSupervisor;

  if (level.userIds?.length) {
    return level.userIds.map((id) => userNames[id] ?? id).join(", ");
  }

  return messages.matrix.meaningGroupHeads(
    level.orgUnitIds.map((id) => unitNames[id] ?? id).join(", "),
  );
}

/** The four-column ladder §16 draws, under the version header it draws. */
function MatrixVersionTable({
  version,
  live,
  userNames,
  unitNames,
}: {
  version: ApprovalMatrixVersion;
  live: boolean;
  userNames: Record<string, string>;
  unitNames: Record<string, string>;
}) {
  /*
    One row per level, in order. The ladders published with amount ceilings are
    gone (`yarn matrix:clear-legacy`), so there is no second shape to draw —
    see the declared amendment in §8 of `docs/ctd-foundation-spec.md`.
  */
  const rows = (version.levels ?? []).map((level, index) => ({
    key: index,
    level: `${index + 1}`,
    chain: levelLabel(level, unitNames),
    meaning: levelMeaning(level, unitNames, userNames),
  }));

  return (
    <Card
      size="small"
      styles={{ body: { padding: 0 } }}
      title={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
          <Text strong>
            {messages.matrix.version} {version.version}
            {live && ` ${messages.matrix.currentSuffix}`}
          </Text>

          {version.publishedAt ? (
            <Tag color="green" className="m-0!">
              {messages.matrix.effectiveFrom}{" "}
              {thaiDate(version.effectiveFrom)}
            </Tag>
          ) : (
            <Tag className="m-0!">
              {messages.matrix.draft} · {messages.matrix.effectiveFrom}{" "}
              {thaiDate(version.effectiveFrom)}
            </Tag>
          )}

          <Text type="secondary" className="text-xs font-normal">
            {messages.matrix.currency} {version.currency}
            {version.createdBy &&
              ` · ${messages.matrix.createdBy} ${
                userNames[version.createdBy] ?? version.createdBy
              }`}
          </Text>

          <div className="flex-1" />

          {/* §16 puts the immutability rule here, beside the version it
              constrains, rather than as a footnote under the table. */}
          <Text type="secondary" className="text-xs font-normal">
            {messages.matrix.immutableNote}
          </Text>
        </div>
      }
    >
      <Table
        size="small"
        pagination={false}
        dataSource={rows}
        columns={[
          {
            title: messages.matrix.columns.level,
            dataIndex: "level",
            width: 80,
            render: (level: string) => <Text strong>{level}</Text>,
          },
          {
            title: messages.matrix.columns.approvers,
            dataIndex: "chain",
            render: (value: string) => <Tag className="m-0!">{value}</Tag>,
          },
          {
            title: messages.matrix.columns.meaning,
            dataIndex: "meaning",
            width: 220,
            render: (value: string) => (
              <Text type="secondary" className="text-xs">
                {value}
              </Text>
            ),
          },
        ]}
        scroll={{ x: true }}
      />
    </Card>
  );
}

/**
 * One level of the ladder being authored.
 *
 * A `Segmented` first, because the two shapes ask for completely different
 * things and showing both at once reads as one form with half its fields
 * greyed out. Watching the field rather than holding local state keeps the
 * switch and the value that gets submitted the same thing.
 */
function LevelFields({
  name,
  form,
  unitTree,
  conditionFields,
  onRemove,
}: {
  name: number;
  form: FormInstance;
  unitTree: UnitTreeNode[];
  /** Fields a condition may name; empty hides the condition controls. */
  conditionFields: readonly { value: string; label: string }[];
  onRemove: () => void;
}) {
  const condition = Form.useWatch(["levels", name, "condition"], form) as
    | FlowCondition
    | undefined;
  const type = Form.useWatch(["levels", name, "type"], form) as
    | "supervisor"
    | "org"
    | undefined;

  const chosenUnits = (Form.useWatch(["levels", name, "orgUnitIds"], form) ??
    []) as string[];

  const [people, setPeople] = useState<
    { value: string; label: string }[]
  >([]);

  /**
   * The people under the chosen groups, so "pick from this group" means the
   * whole subtree — a department's people sit in the positions under it, not
   * in the department itself.
   */
  async function loadPeople(unitIds: string[]) {
    const results = await Promise.all(
      unitIds.map((unitId) =>
        adminApi<{ id: string; displayName: string; username: string }[]>(
          `org-units/${unitId}/members/recursive`,
        ),
      ),
    );

    const found = new Map<string, { value: string; label: string }>();
    for (const result of results) {
      if (!result.ok) continue;
      for (const person of result.data) {
        found.set(person.id, {
          value: person.id,
          label: `${person.displayName} · ${person.username}`,
        });
      }
    }

    setPeople([...found.values()]);

    // People picked under groups that are no longer chosen would still approve; drop them.
    const picked = (form.getFieldValue(["levels", name, "userIds"]) ?? []) as string[];
    form.setFieldValue(
      ["levels", name, "userIds"],
      picked.filter((userId) => found.has(userId)),
    );
  }

  return (
    <Card size="small" className="mb-3!">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Form.Item name={[name, "type"]} noStyle>
          <Segmented
            options={[
              {
                value: "supervisor",
                label: messages.matrix.levelSupervisor,
              },
              { value: "org", label: messages.matrix.levelOrg },
            ]}
          />
        </Form.Item>
        <Button type="link" danger onClick={onRemove}>
          {messages.requestForm.remove}
        </Button>
      </div>

      {type === "org" ? (
        <>
          <Form.Item
            name={[name, "orgUnitIds"]}
            label={messages.matrix.levelGroups}
            rules={[{ required: true }]}
          >
            <SearchTreeSelect
              multiple
              allowClear
              treeDefaultExpandAll
              treeData={unitTree}
              onChange={(next: string[]) => void loadPeople(next)}
            />
          </Form.Item>

          <Form.Item
            name={[name, "userIds"]}
            label={messages.matrix.levelPeople}
            extra={messages.matrix.levelPeopleHint}
          >
            <SearchSelect
              mode="multiple"
              allowClear
              disabled={!chosenUnits.length}
              options={people}
            />
          </Form.Item>
        </>
      ) : (
        <Form.Item
          name={[name, "up"]}
          label={messages.matrix.levelUp}
          extra={messages.matrix.levelUpHint}
          rules={[{ required: true }]}
        >
          <SearchSelect
            options={[1, 2, 3, 4].map((up) => ({
              value: up,
              label: messages.matrix.supervisorLevel[up],
            }))}
          />
        </Form.Item>
      )}

      <div className="grid gap-x-4 md:grid-cols-3">
        <Form.Item name={[name, "mode"]} label={messages.matrix.levelMode} initialValue="any">
          <Radio.Group
            options={[
              { value: "any", label: messages.matrix.modeAny },
              { value: "all", label: messages.matrix.modeAll },
            ]}
          />
        </Form.Item>
        <Form.Item
          name={[name, "noteRequired"]}
          label={messages.matrix.levelNote}
          initialValue="always"
        >
          <Select
            options={[
              { value: "always", label: messages.matrix.noteAlways },
              { value: "reject_or_return", label: messages.matrix.noteRejectOnly },
            ]}
          />
        </Form.Item>
        <Form.Item
          name={[name, "slaHours"]}
          label={messages.matrix.levelSla}
          extra={messages.matrix.levelSlaHint}
        >
          <InputNumber min={1} className="w-full" />
        </Form.Item>
      </div>

      {conditionFields.length > 0 && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{messages.matrix.levelCondition}</span>
            {condition ? (
              <>
                <Form.Item name={[name, "condition", "field"]} noStyle rules={[{ required: true }]}>
                  <Select className="min-w-36" options={[...conditionFields]} />
                </Form.Item>
                <Form.Item name={[name, "condition", "op"]} noStyle>
                  <Select
                    className="min-w-32"
                    options={FLOW_CONDITION_OPS.map((op) => ({
                      value: op,
                      label: messages.requestTypes.flow.ops[op],
                    }))}
                  />
                </Form.Item>
                <Form.Item name={[name, "condition", "value"]} noStyle rules={[{ required: true }]}>
                  <Input className="w-36" />
                </Form.Item>
              </>
            ) : (
              <span className="text-black/45">{messages.matrix.conditionAlways}</span>
            )}
            <Button
              type="link"
              size="small"
              onClick={() =>
                form.setFieldValue(
                  ["levels", name, "condition"],
                  condition
                    ? undefined
                    : { field: conditionFields[0]?.value, op: "gt", value: "" },
                )
              }
            >
              {condition ? messages.matrix.removeCondition : messages.matrix.addCondition}
            </Button>
          </div>
          {condition && (
            <span className="block text-xs text-black/45">{messages.matrix.conditionHint}</span>
          )}
        </div>
      )}
    </Card>
  );
}

const DEFAULT_LEVELS: MatrixLevel[] = [{ type: "supervisor", up: 1 }];

function PublishDialog({
  open,
  live,
  companyId,
  subject,
  unitTree,
  conditionFields,
  onClose,
  onDone,
}: {
  open: boolean;
  conditionFields: readonly { value: string; label: string }[];
  /** The version in force; the form starts from its levels rather than blank. */
  live?: ApprovalMatrixVersion;
  companyId: string;
  /** The tab's own subject — fixed, so the dialog cannot publish another one. */
  subject: string;
  unitTree: UnitTreeNode[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const values = (await form.validateFields()) as {
      levels: (MatrixLevelOptions & {
        type: "supervisor" | "org";
        up?: number;
        orgUnitIds?: string[];
        userIds?: string[];
      })[];
    };

    setSaving(true);
    setError(null);

    const result = await adminApi("approval-matrix", {
      method: "POST",
      body: JSON.stringify({
        company_id: companyId,
        subject_type: subject,
        // Only the fields the chosen shape uses. Sending an `up` on an `org`
        // level would be stored and then never read, which is how a ladder
        // starts describing something it does not do.
        levels: values.levels.map((level) => ({
          ...(level.type === "supervisor"
            ? { type: "supervisor", up: level.up ?? 1 }
            : {
                type: "org",
                orgUnitIds: level.orgUnitIds ?? [],
                userIds: level.userIds ?? [],
              }),
          ...levelOptionsOf(level),
        })),
      }),
    });

    setSaving(false);

    if (result.ok) {
      form.resetFields();
      onDone();
    } else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={messages.matrix.publishNew}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={saving}
      width={680}
      destroyOnHidden
    >
      {error && (
        <Alert type="error" showIcon title={error} className="mb-3!" />
      )}

      {live?.levels?.length ? (
        <Alert
          type="info"
          showIcon
          className="mb-3!"
          title={messages.matrix.copiedFromCurrent(live.version)}
          action={
            <Button
              size="small"
              onClick={() => form.setFieldsValue({ levels: DEFAULT_LEVELS })}
            >
              {messages.matrix.startOver}
            </Button>
          }
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          levels: live?.levels?.length ? live.levels : DEFAULT_LEVELS,
        }}
      >
        <Form.List name="levels">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <LevelFields
                  key={field.key}
                  name={field.name}
                  form={form}
                  unitTree={unitTree}
                  conditionFields={conditionFields}
                  onRemove={() => remove(field.name)}
                />
              ))}
              <Button onClick={() => add({ type: "supervisor", up: 1 })}>
                {messages.matrix.addLevel}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

/** Only options that differ from the default, so an unchanged ladder publishes as before. */
function levelOptionsOf(level: MatrixLevelOptions): MatrixLevelOptions {
  const condition = level.condition?.field
    ? {
        ...level.condition,
        value:
          level.condition.op === "in"
            ? textOf(level.condition.value)
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean)
            : numberOrText(level.condition.value),
      }
    : undefined;

  return {
    ...(level.mode === "all" ? { mode: "all" as const } : {}),
    ...(level.noteRequired === "reject_or_return"
      ? { noteRequired: "reject_or_return" as const }
      : {}),
    ...(typeof level.slaHours === "number" ? { slaHours: level.slaHours } : {}),
    ...(condition ? { condition } : {}),
  };
}

function textOf(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function numberOrText(value: unknown): unknown {
  const text = textOf(value).trim();
  return text !== "" && !Number.isNaN(Number(text)) ? Number(text) : text;
}
