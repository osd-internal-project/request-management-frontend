"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { adminApi } from "@/lib/api/client";
import type { ApprovalMatrixVersion, MatrixTier } from "@/lib/api/types";
import { messages } from "@/lib/messages";

export type { MatrixTier, ApprovalMatrixVersion } from "@/lib/api/types";

const POSITIONS = ["team_lead", "cfo", "ceo"];

/** The Thai titles §16 prints in the ladder, not the storage codes. */
const POSITION_LABEL: Record<string, string> = {
  team_lead: "หัวหน้าทีม",
  cfo: "CFO",
  ceo: "CEO",
};

function money(value: string | null): string {
  return value === null
    ? messages.matrix.noCeiling
    : Number(value).toLocaleString("th-TH");
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

/** Why this rung exists — the `ความหมาย` column. */
function meaning(tiers: MatrixTier[], index: number): string {
  if (index === 0) return messages.matrix.meaningFirst;

  return messages.matrix.meaningOver(index, money(tiers[index - 1]?.upto ?? null));
}

/**
 * Screen §16 A1 — ตารางอำนาจอนุมัติ (APV-01, APV-02).
 *
 * One tab per company (D-18: each has its own ladder) so an administrator can
 * compare and edit them from one place, **without** switching the company the
 * working screens are showing — which is what the header switcher does.
 *
 * Published versions render read-only, because they are immutable: editing a
 * ladder means publishing the next version, which is what lets work already in
 * flight keep the ceilings it was routed under. An edit control on a published
 * version would promise something the API deliberately refuses.
 */
export function ApprovalMatrixAdmin({
  versions: initial,
  companies,
  companyId,
  userNames,
}: {
  versions: ApprovalMatrixVersion[];
  companies: { id: string; name: string }[];
  companyId: string;
  /** `userId` → display name, so the header can name who published a version. */
  userNames: Record<string, string>;
}) {
  const [activeCompany, setActiveCompany] = useState(companyId);
  const [versions, setVersions] = useState(initial);
  const [publishing, setPublishing] = useState(false);

  async function loadCompany(nextCompanyId: string) {
    setActiveCompany(nextCompanyId);

    const result = await adminApi<ApprovalMatrixVersion[]>(
      `approval-matrix?company_id=${encodeURIComponent(nextCompanyId)}`,
    );

    setVersions(result.ok ? result.data : []);
  }

  const subjects = [...new Set(versions.map((entry) => entry.subjectType))].sort();

  return (
    <div className="space-y-4">
      <Alert
        type="warning"
        showIcon
        title={messages.matrix.placeholderWarning}
      />

      <Tabs
        activeKey={activeCompany}
        onChange={(key) => void loadCompany(key)}
        items={companies.map((company) => ({
          key: company.id,
          // The seed already names companies "บริษัท B"; prefixing again
          // would read "บริษัท บริษัท B".
          label: company.name,
        }))}
      />

      <div className="flex justify-end">
        <Button type="primary" onClick={() => setPublishing(true)}>
          {messages.matrix.publishNew}
        </Button>
      </div>

      <MatrixVersions versions={versions} userNames={userNames} />

      <PublishDialog
        open={publishing}
        companyId={activeCompany}
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

/** Every subject type, newest version first. */
function MatrixVersions({
  versions,
  userNames,
}: {
  versions: ApprovalMatrixVersion[];
  userNames: Record<string, string>;
}) {
  if (!versions.length) return <Empty description={messages.matrix.empty} />;

  const subjects = [...new Set(versions.map((entry) => entry.subjectType))].sort();

  // Highest published version per subject — the one actually routing cases.
  const inForce = new Map<string, number>();
  for (const version of versions) {
    if (!version.publishedAt) continue;
    const current = inForce.get(version.subjectType) ?? -1;
    if (version.version > current) {
      inForce.set(version.subjectType, version.version);
    }
  }

  return (
    <>
      {subjects.map((subject) => (
        <Card key={subject} title={`${messages.matrix.subject}: ${subject}`}>
          <Space orientation="vertical" size="middle" className="flex">
            {versions
              .filter((version) => version.subjectType === subject)
              .sort((a, b) => b.version - a.version)
              .map((version) => (
                <MatrixVersionTable
                  key={version.id}
                  version={version}
                  live={inForce.get(subject) === version.version}
                  userNames={userNames}
                />
              ))}
          </Space>
        </Card>
      ))}

      <Paragraph type="secondary" className="text-xs">
        {messages.matrix.immutableNote}
      </Paragraph>
    </>
  );
}

/** The four-column ladder §16 draws. */
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
    chain: tier.chain
      .map(
        (position, step) =>
          `${step + 1} · ${POSITION_LABEL[position] ?? position}`,
      )
      .join("  →  "),
    meaning: meaning(tiers, index),
  }));

  return (
    <div
      className={`rounded border p-3 ${live ? "border-black/20" : "border-black/5"}`}
    >
      <Space size={8} className="mb-2" wrap>
        <Text strong>
          {messages.matrix.version} {version.version}
        </Text>
        {live && <Tag color="blue">{messages.matrix.inForce}</Tag>}
        {version.publishedAt ? (
          <Tag color="green">{messages.matrix.published}</Tag>
        ) : (
          <Tag>{messages.matrix.draft}</Tag>
        )}
        <Text type="secondary" className="text-xs">
          {messages.matrix.effectiveFrom}:{" "}
          {new Date(version.effectiveFrom).toLocaleDateString("th-TH")}
          {" · "}
          {messages.matrix.currency} {version.currency}
          {version.createdBy &&
            ` · ${messages.matrix.createdBy} ${
              userNames[version.createdBy] ?? version.createdBy
            }`}
        </Text>
      </Space>

      <Table
        size="small"
        pagination={false}
        dataSource={rows}
        columns={[
          {
            title: messages.matrix.columns.level,
            dataIndex: "level",
            width: 70,
          },
          { title: messages.matrix.columns.band, dataIndex: "band" },
          { title: messages.matrix.columns.chain, dataIndex: "chain" },
          { title: messages.matrix.columns.meaning, dataIndex: "meaning" },
        ]}
        scroll={{ x: true }}
      />
    </div>
  );
}

function PublishDialog({
  open,
  companyId,
  subjects,
  onClose,
  onDone,
}: {
  open: boolean;
  companyId: string;
  subjects: string[];
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
    >
      {error && (
        <Alert type="error" showIcon title={error} className="mb-3!" />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="subject_type"
          label={messages.matrix.subject}
          rules={[{ required: true }]}
        >
          <Select
            options={subjects.map((subject) => ({
              value: subject,
              label: subject,
            }))}
          />
        </Form.Item>

        <Form.List name="tiers" initialValue={[{ chain: ["team_lead"] }]}>
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
