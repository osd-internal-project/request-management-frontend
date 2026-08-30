"use client";

import { Fragment, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { adminApi } from "@/lib/api/client";
import type {
  ApprovalMatrixVersion,
  MatrixTier,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

export type { MatrixTier, ApprovalMatrixVersion } from "@/lib/api/types";

const POSITIONS = ["team_lead", "cfo", "ceo"];

/** The Thai titles §16 prints in the ladder, not the storage codes. */
const POSITION_LABEL: Record<string, string> = {
  team_lead: "หัวหน้าทีมของผู้ยื่น",
  cfo: "CFO",
  ceo: "CEO",
};

/**
 * §16 draws each rung a shade warmer than the one below it, so a chain that
 * reaches the CEO reads as escalation at a glance rather than as three
 * identical chips.
 */
const STEP_TONE = ["default", "gold", "red"];

function money(value: string | null): string {
  return value === null
    ? messages.matrix.noCeiling
    : Number(value).toLocaleString("th-TH");
}

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

/**
 * The band a tier covers, as §16 writes it: `100,001 – 1,000,000`.
 *
 * Derived from the tier below rather than stored: the ladder is a list of
 * ceilings, so a tier's lower bound is one baht above the one beneath it.
 * Storing it twice is how the two start disagreeing.
 */
function band(tiers: MatrixTier[], index: number): string {
  const upto = tiers[index]?.upto ?? null;
  const below = index > 0 ? (tiers[index - 1]?.upto ?? null) : null;

  if (below === null) {
    return upto === null ? messages.matrix.noCeiling : `≤ ${money(upto)}`;
  }

  const from = (Number(below) + 1).toLocaleString("th-TH");

  return upto === null ? `> ${money(below)}` : `${from} – ${money(upto)}`;
}

/** One rung of the `ลำดับชั้นผู้อนุมัติ` column: `2 · CFO`. */
function step(position: string, index: number): string {
  return `${index + 1} · ${POSITION_LABEL[position] ?? position}`;
}

/**
 * Why this rung exists — the `ความหมาย` column.
 *
 * §16 names whoever the tier *adds* (`— เพิ่ม CFO`), which is the reason the
 * band exists at all. Derived from the chains rather than written per tier: a
 * ladder is configuration, so any wording keyed to T1/T2 by hand would be
 * wrong the first time an administrator inserts a rung between them.
 */
function meaning(tiers: MatrixTier[], index: number): string {
  if (index === 0) return messages.matrix.meaningFirst;

  const below = new Set(tiers[index - 1]?.chain ?? []);
  const added = (tiers[index]?.chain ?? [])
    .filter((position) => !below.has(position))
    .map((position) => POSITION_LABEL[position] ?? position);

  // A tier that only raises the ceiling has no new approver to name.
  if (!added.length) {
    return messages.matrix.meaningOver(
      index,
      money(tiers[index - 1]?.upto ?? null),
    );
  }

  const joined = added.join(" · ");

  return index === tiers.length - 1
    ? messages.matrix.meaningTop(index, joined)
    : messages.matrix.meaningAdds(index, joined);
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
 * edits one — the same reason `band()` computes a tier's lower bound instead of
 * keeping it.
 *
 * Reports the first difference rather than all of them: the line is a jog to
 * the memory, and the full ladder is one click away in the table above.
 */
function changeSummary(
  tiers: MatrixTier[],
  previous: MatrixTier[] | null,
): string {
  if (!previous) return messages.matrix.historyInitial;

  for (let index = 0; index < Math.max(tiers.length, previous.length); index++) {
    const level = `T${index}`;
    const now = tiers[index];
    const before = previous[index];

    if (now && !before) return messages.matrix.historyTierAdded(level);
    if (!now && before) return messages.matrix.historyTierRemoved(level);
    if (!now || !before) continue;

    if (now.upto !== before.upto) {
      return messages.matrix.historyCeilingMoved(level, money(now.upto));
    }

    if (now.chain.join() !== before.chain.join()) {
      return messages.matrix.historyChainChanged(level);
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
}: {
  versions: ApprovalMatrixVersion[];
  /** The company's request-type catalog — what a ladder can be published for. */
  types: RequestType[];
  companies: { id: string; name: string }[];
  companyId: string;
  /** `userId` → display name, so the header can name who published a version. */
  userNames: Record<string, string>;
}) {
  const [activeCompany, setActiveCompany] = useState(companyId);
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
      <Alert
        type="warning"
        showIcon
        title={messages.matrix.placeholderWarning}
      />

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
          <Select
            value={shownSubject ?? undefined}
            onChange={setActiveSubject}
            style={{ minWidth: 320 }}
            showSearch
            optionFilterProp="label"
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
      />

      {/* Keyed so the subject prefill below follows the toolbar rather than
          freezing at whatever was selected when the form first mounted. */}
      <PublishDialog
        key={shownSubject ?? "none"}
        open={publishing}
        companyId={activeCompany}
        subject={shownSubject}
        subjects={subjects}
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
}: {
  versions: ApprovalMatrixVersion[];
  userNames: Record<string, string>;
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
                  · {changeSummary(version.tiers, previous?.tiers ?? null)}
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

/** The four-column ladder §16 draws, under the version header it draws. */
function MatrixVersionTable({
  version,
  live,
  userNames,
}: {
  version: ApprovalMatrixVersion;
  live: boolean;
  userNames: Record<string, string>;
}) {
  const tiers = version.tiers;

  const rows = tiers.map((tier, index) => ({
    key: index,
    level: `T${index}`,
    band: band(tiers, index),
    chain: tier.chain,
    meaning: meaning(tiers, index),
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
            title: messages.matrix.columns.band,
            dataIndex: "band",
            width: 240,
            render: (value: string) => (
              <span className="tabular-nums">{value}</span>
            ),
          },
          {
            title: messages.matrix.columns.chain,
            dataIndex: "chain",
            render: (chain: string[]) => (
              <div className="flex flex-wrap items-center gap-1">
                {chain.map((position, index) => (
                  <Fragment key={`${position}-${index}`}>
                    {index > 0 && <span className="text-black/25">→</span>}
                    <Tag
                      color={STEP_TONE[index] ?? STEP_TONE[0]}
                      className="m-0!"
                    >
                      {step(position, index)}
                    </Tag>
                  </Fragment>
                ))}
              </div>
            ),
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

function PublishDialog({
  open,
  companyId,
  subject,
  subjects,
  onClose,
  onDone,
}: {
  open: boolean;
  companyId: string;
  /** The subject the toolbar is showing — what a new version most likely edits. */
  subject: string | null;
  subjects: { value: string; label: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const values = (await form.validateFields()) as {
      subject_type: string;
      tiers: { upto?: string; chain: string[] }[];
    };

    setSaving(true);
    setError(null);

    const result = await adminApi("approval-matrix", {
      method: "POST",
      body: JSON.stringify({
        company_id: companyId,
        subject_type: values.subject_type,
        tiers: values.tiers.map((tier) => ({
          upto: tier.upto ? tier.upto : null,
          chain: tier.chain,
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

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...(subject ? { subject_type: subject } : {}),
          tiers: [{ chain: ["team_lead"] }],
        }}
      >
        <Form.Item
          name="subject_type"
          label={messages.matrix.subject}
          rules={[{ required: true }]}
        >
          <Select showSearch optionFilterProp="label" options={subjects} />
        </Form.Item>

        <Form.List name="tiers">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" wrap>
                  <Form.Item
                    name={[field.name, "upto"]}
                    label={messages.matrix.upto}
                  >
                    <Input placeholder={messages.matrix.noCeiling} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, "chain"]}
                    label={messages.matrix.chain}
                    rules={[{ required: true }]}
                  >
                    <Select
                      mode="multiple"
                      style={{ minWidth: 260 }}
                      options={POSITIONS.map((position) => ({
                        value: position,
                        label: POSITION_LABEL[position],
                      }))}
                    />
                  </Form.Item>
                  <Button type="link" danger onClick={() => remove(field.name)}>
                    {messages.requestForm.remove}
                  </Button>
                </Space>
              ))}
              <Button onClick={() => add({ chain: ["team_lead"] })}>
                {messages.matrix.addTier}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
