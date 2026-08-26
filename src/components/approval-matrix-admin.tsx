"use client";

import { useState } from "react";
import { Alert, Button, Card, Empty, Form, Input, Modal, Select, Space, Tag, message } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { messages } from "@/lib/messages";

import type { ApprovalMatrixVersion } from "@/lib/api/types";
import { adminApi } from "@/lib/api/client";
export type {
  MatrixTier,
  ApprovalMatrixVersion,
} from "@/lib/api/types";

const POSITIONS = ["team_lead", "cfo", "ceo"];

function money(value: string | null) {
  return value === null
    ? messages.matrix.noCeiling
    : Number(value).toLocaleString("th-TH");
}

/**
 * Screen §16 A1 — ตารางอำนาจอนุมัติ (APV-01, APV-02).
 *
 * Published versions render read-only, because they are immutable: editing a
 * ladder means publishing the next version, which is what lets work already in
 * flight keep the ceilings it was routed under. Showing an edit control on a
 * published version would promise something the API deliberately refuses.
 */
export function ApprovalMatrixAdmin({
  versions: initial,
  companyId,
}: {
  versions: ApprovalMatrixVersion[];
  companyId: string;
}) {
  const [versions, setVersions] = useState(initial);
  const [publishing, setPublishing] = useState(false);

  // Highest published version per subject — the one actually routing cases.
  const inForce = new Map<string, number>();
  for (const version of versions) {
    if (!version.publishedAt) continue;
    const current = inForce.get(version.subjectType) ?? -1;
    if (version.version > current) inForce.set(version.subjectType, version.version);
  }

  const subjects = [...new Set(versions.map((v) => v.subjectType))].sort();

  async function refresh() {
    const result = await adminApi<ApprovalMatrixVersion[]>("approval-matrix");
    if (result.ok) setVersions(result.data);
  }

  return (
    <div className="space-y-4">
      <Alert type="warning" showIcon title={messages.matrix.placeholderWarning} />

      <div className="flex justify-end">
        <Button type="primary" onClick={() => setPublishing(true)}>
          {messages.matrix.publishNew}
        </Button>
      </div>

      {subjects.length === 0 && <Empty description={messages.matrix.empty} />}

      {subjects.map((subject) => (
        <Card key={subject} title={subject}>
          <div className="space-y-3">
            {versions
              .filter((version) => version.subjectType === subject)
              .sort((a, b) => b.version - a.version)
              .map((version) => {
                const live = inForce.get(subject) === version.version;

                return (
                  <div
                    key={version.id}
                    className={`rounded border p-3 ${live ? "border-black/20" : "border-black/5"}`}
                  >
                    <Space size={8} className="mb-2">
                      <Text strong>
                        {messages.matrix.version} {version.version}
                      </Text>
                      {version.publishedAt ? (
                        <Tag color="green">{messages.matrix.published}</Tag>
                      ) : (
                        <Tag>{messages.matrix.draft}</Tag>
                      )}
                      {live && <Tag color="blue">{messages.matrix.inForce}</Tag>}
                      <Text type="secondary" className="text-xs">
                        {messages.matrix.effectiveFrom}:{" "}
                        {new Date(version.effectiveFrom).toLocaleDateString("th-TH")}
                        {" · "}
                        {version.currency}
                      </Text>
                    </Space>

                    <ol className="ml-4 list-decimal space-y-1 text-xs">
                      {version.tiers.map((tier, index) => (
                        <li key={index}>
                          <Text type="secondary">
                            {messages.matrix.upto} {money(tier.upto)}
                          </Text>{" "}
                          →{" "}
                          {tier.chain.map((position) => (
                            <Tag key={position}>{position}</Tag>
                          ))}
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
          </div>
        </Card>
      ))}

      <Paragraph type="secondary" className="text-xs">
        {messages.matrix.immutableNote}
      </Paragraph>

      <PublishDialog
        open={publishing}
        companyId={companyId}
        subjects={subjects}
        onClose={() => setPublishing(false)}
        onDone={async () => {
          setPublishing(false);
          void message.success(messages.matrix.saved);
          await refresh();
        }}
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
          // Blank means "no ceiling" — the open-ended top tier.
          upto: tier.upto?.trim() ? tier.upto.trim() : null,
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
      onOk={submit}
      confirmLoading={saving}
      width={640}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          tiers: [
            { upto: "100000", chain: ["team_lead"] },
            { upto: "", chain: ["team_lead", "cfo"] },
          ],
        }}
      >
        <Form.Item
          name="subject_type"
          label={messages.matrix.title}
          rules={[{ required: true }]}
        >
          <Select
            options={subjects.map((subject) => ({
              value: subject,
              label: subject,
            }))}
            placeholder="request:DSC"
          />
        </Form.Item>

        <Form.List name="tiers">
          {(fields, { add, remove }) => (
            <div className="space-y-2">
              {fields.map((field) => (
                <Space key={field.key} align="baseline" className="flex">
                  <Form.Item
                    name={[field.name, "upto"]}
                    label={messages.matrix.upto}
                    className="mb-0!"
                  >
                    <Input placeholder={messages.matrix.noCeiling} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, "chain"]}
                    label={messages.matrix.chain}
                    className="mb-0! min-w-64"
                    rules={[{ required: true }]}
                  >
                    <Select
                      mode="multiple"
                      options={POSITIONS.map((p) => ({ value: p, label: p }))}
                    />
                  </Form.Item>
                  <Button size="small" onClick={() => remove(field.name)}>
                    −
                  </Button>
                </Space>
              ))}
              <Button size="small" onClick={() => add({ chain: ["team_lead"] })}>
                + ชั้น
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
