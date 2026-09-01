"use client";

import { Fragment, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Modal,
  Segmented,
  Table,
  Tag,
  message,
} from "antd";
import type { FormInstance } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { adminApi } from "@/lib/api/client";
import type {
  ApprovalMatrixVersion,
  MatrixLevel,
  OrgUnitNode,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import {
  SearchSelect,
  SearchTreeSelect,
} from "@/components/search-select";
import { buildUnitTree, type UnitTreeNode } from "@/lib/org-tree";

export type { ApprovalMatrixVersion } from "@/lib/api/types";


/** The Thai titles §16 prints in the ladder, not the storage codes. */



/** APV-02 builds this from the type code at submit; A1 must match it exactly. */
function subjectOf(type: RequestType): string {
  return `request:${type.code}`;
}

/**
 * Everything an administrator can publish a ladder for, in one list.
 *
 * The catalog comes first because that is the real answer to "which kinds of
 * work does this company have". Subjects that only exist as an old matrix are
 * appended so a ladder never disappears from the screen just because its
 * request type was removed.
 *
 * **Reading this off the existing versions alone was a dead end**: a company
 * with no matrix had an empty dropdown, and the publish dialog offered the same
 * empty list — so the first ladder for a subject could never be created from
 * the screen at all. That is why OSD had forty request types and no matrix.
 */
function subjectOptions(
  types: RequestType[],
  versions: ApprovalMatrixVersion[],
): { value: string; label: string }[] {
  const options = types.map((type) => ({
    value: subjectOf(type),
    label: `${type.name} (${subjectOf(type)})`,
  }));

  const known = new Set(options.map((option) => option.value));

  for (const subject of new Set(versions.map((entry) => entry.subjectType))) {
    if (!known.has(subject)) options.push({ value: subject, label: subject });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, "th"));
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
 * Screen §16 A1 — ตารางอำนาจอนุมัติ (APV-01, APV-02).
 *
 * One company at a time (D-18: each has its own ladder) and one subject type at
 * a time, both chosen from the toolbar §16 draws — **without** switching the
 * company the working screens are showing, which is what the header switcher
 * does.
 *
 * Published versions render read-only, because they are immutable: editing a
 * ladder means publishing the next version, which is what lets work already in
 * flight keep the ceilings it was routed under. An edit control on a published
 * version would promise something the API deliberately refuses.
 */
export function ApprovalMatrixAdmin({
  versions: initial,
  types: initialTypes,
  companies,
  companyId,
  userNames,
  orgUnits,
}: {
  versions: ApprovalMatrixVersion[];
  /** The company's request-type catalog — what a ladder can be published for. */
  types: RequestType[];
  companies: { id: string; name: string }[];
  companyId: string;
  /** `userId` → display name, so the header can name who published a version. */
  userNames: Record<string, string>;
  /** The chart, for the `org` levels and for naming the groups a ladder uses. */
  orgUnits: OrgUnitNode[];
}) {
  const [activeCompany, setActiveCompany] = useState(companyId);
  const unitTree = buildUnitTree(orgUnits);
  const unitNames = Object.fromEntries(
    orgUnits.map((unit) => [unit.id, unit.name]),
  );
  const [versions, setVersions] = useState(initial);
  const [types, setTypes] = useState(initialTypes);
  const [activeSubject, setActiveSubject] = useState<string | null>(
    subjectOptions(initialTypes, initial)[0]?.value ?? null,
  );
  const [publishing, setPublishing] = useState(false);

  /**
   * Both lists are re-read together, and the subject is re-chosen from what
   * came back rather than carried over: company B need not run the same kinds
   * of work as company A, and a stale selection would leave the screen showing
   * an empty ladder for a subject that company has never had.
   */
  async function loadCompany(nextCompanyId: string) {
    setActiveCompany(nextCompanyId);

    const [matrix, catalog] = await Promise.all([
      adminApi<ApprovalMatrixVersion[]>(
        `approval-matrix?company_id=${encodeURIComponent(nextCompanyId)}`,
      ),
      adminApi<RequestType[]>(
        `request-types?company_id=${encodeURIComponent(nextCompanyId)}`,
      ),
    ]);

    const loadedVersions = matrix.ok ? matrix.data : [];
    const loadedTypes = catalog.ok ? catalog.data : [];

    setVersions(loadedVersions);
    setTypes(loadedTypes);
    setActiveSubject(
      subjectOptions(loadedTypes, loadedVersions)[0]?.value ?? null,
    );
  }

  const subjects = subjectOptions(types, versions);
  const shownSubject = activeSubject ?? subjects[0]?.value ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={activeCompany}
          onChange={(key) => void loadCompany(String(key))}
          options={companies.map((company) => ({
            value: company.id,
            // The seed already names companies "บริษัท B"; prefixing again
            // would read "บริษัท บริษัท B".
            label: company.name,
          }))}
        />

        <span className="flex items-center gap-2">
          <Text type="secondary" className="text-xs">
            {messages.matrix.subject}
          </Text>
          <SearchSelect
            value={shownSubject ?? undefined}
            onChange={setActiveSubject}
            style={{ minWidth: 320 }}
            placeholder={messages.matrix.subject}
            notFoundContent={messages.matrix.noSubjects}
            options={subjects}
          />
        </span>

        <div className="flex-1" />

        <Button type="primary" onClick={() => setPublishing(true)}>
          {messages.matrix.publishNew}
        </Button>
      </div>

      <SubjectLadder
        versions={versions.filter(
          (version) => version.subjectType === shownSubject,
        )}
        userNames={userNames}
        unitNames={unitNames}
      />

      {/* Keyed so the subject prefill below follows the toolbar rather than
          freezing at whatever was selected when the form first mounted. */}
      <PublishDialog
        key={shownSubject ?? "none"}
        open={publishing}
        companyId={activeCompany}
        subject={shownSubject}
        subjects={subjects}
        unitTree={unitTree}
        onClose={() => setPublishing(false)}
        onDone={async () => {
          setPublishing(false);
          void message.success(messages.matrix.saved);
          await loadCompany(activeCompany);
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
  onRemove,
}: {
  name: number;
  form: FormInstance;
  unitTree: UnitTreeNode[];
  onRemove: () => void;
}) {
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
    </Card>
  );
}

function PublishDialog({
  open,
  companyId,
  subject,
  subjects,
  unitTree,
  onClose,
  onDone,
}: {
  open: boolean;
  companyId: string;
  /** The subject the toolbar is showing — what a new version most likely edits. */
  subject: string | null;
  subjects: { value: string; label: string }[];
  unitTree: UnitTreeNode[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const values = (await form.validateFields()) as {
      subject_type: string;
      levels: {
        type: "supervisor" | "org";
        up?: number;
        orgUnitIds?: string[];
        userIds?: string[];
      }[];
    };

    setSaving(true);
    setError(null);

    const result = await adminApi("approval-matrix", {
      method: "POST",
      body: JSON.stringify({
        company_id: companyId,
        subject_type: values.subject_type,
        // Only the fields the chosen shape uses. Sending an `up` on an `org`
        // level would be stored and then never read, which is how a ladder
        // starts describing something it does not do.
        levels: values.levels.map((level) =>
          level.type === "supervisor"
            ? { type: "supervisor", up: level.up ?? 1 }
            : {
                type: "org",
                orgUnitIds: level.orgUnitIds ?? [],
                userIds: level.userIds ?? [],
              },
        ),
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

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...(subject ? { subject_type: subject } : {}),
          levels: [{ type: "supervisor", up: 1 }],
        }}
      >
        <Form.Item
          name="subject_type"
          label={messages.matrix.subject}
          rules={[{ required: true }]}
        >
          <SearchSelect showSearch optionFilterProp="label" options={subjects} />
        </Form.Item>

        <Form.List name="levels">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <LevelFields
                  key={field.key}
                  name={field.name}
                  form={form}
                  unitTree={unitTree}
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
