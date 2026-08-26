"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Space,
  Tag,
  message,
} from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { messages } from "@/lib/messages";

import type { ApprovalCase } from "@/lib/api/types";
import { appApi } from "@/lib/api/client";
export type {
  ApprovalStep,
  ApprovalCase,
} from "@/lib/api/types";

type Decision = "approve" | "reject" | "return";

function money(amount: string | null, currency: string | null) {
  if (amount === null) return "—";
  return `${Number(amount).toLocaleString("th-TH")} ${currency ?? ""}`.trim();
}

/**
 * The approval inbox and decision view (§8, APV-02).
 *
 * §8 is specific about the order: requester, amount, reason, attachments and
 * margin come **before** the decision buttons. An approver who has to click to
 * see what they are approving is being asked to approve blind.
 *
 * The margin is absent from the payload entirely when the caller lacks
 * `request.sensitive.read` — the backend removes it (SCOPE-04), so this shows
 * a note rather than an empty value.
 */
export function ApprovalInbox({
  cases: initial,
  total,
}: {
  cases: ApprovalCase[];
  total: number;
}) {
  const [cases, setCases] = useState(initial);
  const [count, setCount] = useState(total);
  const [open, setOpen] = useState<ApprovalCase | null>(null);

  async function refresh() {
    const result = await appApi<{ data: ApprovalCase[]; total: number }>(
      "approvals/inbox",
    );
    if (result.ok) {
      setCases(result.data.data);
      setCount(result.data.total);
    }
  }

  return (
    <Card title={`${messages.approvals.title} · ${count}`}>
      {cases.length === 0 ? (
        <Empty description={messages.approvals.empty} />
      ) : (
        <List>
          {cases.map((item) => (
            <List.Item
              key={item.id}
              actions={[
                <Button key="open" size="small" type="primary" onClick={() => setOpen(item)}>
                  เปิดดู
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space size={6}>
                    <Text strong>{item.subjectId}</Text>
                    <Tag>{item.subjectType}</Tag>
                    <Tag color="geekblue">
                      {messages.approvals.step} {item.currentStep}{" "}
                      {messages.approvals.of} {item.steps.length}
                    </Tag>
                  </Space>
                }
                description={
                  <span className="text-xs">
                    {messages.approvals.amount}:{" "}
                    {money(item.amount, item.currency)} ·{" "}
                    {new Date(item.createdAt).toLocaleString("th-TH")}
                  </span>
                }
              />
            </List.Item>
          ))}
        </List>
      )}

      <DecisionDialog
        approvalCase={open}
        onClose={() => setOpen(null)}
        onDone={async () => {
          setOpen(null);
          void message.success(messages.approvals.decided);
          await refresh();
        }}
      />
    </Card>
  );
}

function DecisionDialog({
  approvalCase,
  onClose,
  onDone,
}: {
  approvalCase: ApprovalCase | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Decision | null>(null);

  async function decide(decision: Decision) {
    if (!approvalCase) return;

    // §8: rejection always requires a reason. Checked here so the approver is
    // told before the round trip; the backend enforces it regardless.
    if (decision !== "approve" && !note.trim()) {
      setError(messages.approvals.reasonRequired);
      return;
    }

    setSaving(decision);
    setError(null);

    const result = await appApi(`approvals/${approvalCase.id}/decide`, {
      method: "POST",
      body: JSON.stringify({ decision, note: note.trim() || undefined }),
    });

    setSaving(null);
    if (result.ok) {
      setNote("");
      onDone();
    } else setError(result.message);
  }

  const payload = approvalCase?.payload ?? {};
  const hasMargin = "est_margin_pct" in payload;

  return (
    <Modal
      open={Boolean(approvalCase)}
      title={approvalCase?.subjectId ?? ""}
      onCancel={onClose}
      width={620}
      footer={
        // Decision buttons last, after everything the approver must read.
        <Space>
          <Button onClick={onClose}>ปิด</Button>
          <Button
            danger
            loading={saving === "reject"}
            onClick={() => void decide("reject")}
          >
            {messages.approvals.reject}
          </Button>
          <Button
            loading={saving === "return"}
            onClick={() => void decide("return")}
          >
            {messages.approvals.returnForEdit}
          </Button>
          <Button
            type="primary"
            loading={saving === "approve"}
            onClick={() => void decide("approve")}
          >
            {messages.approvals.approve}
          </Button>
        </Space>
      }
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}

      {approvalCase && (
        <div className="space-y-3">
          <div className="text-sm">
            <div>
              <Text strong>{messages.approvals.amount}: </Text>
              <Text>{money(approvalCase.amount, approvalCase.currency)}</Text>
            </div>
            <div>
              <Text strong>{messages.approvals.margin}: </Text>
              {hasMargin ? (
                <Text>{String(payload.est_margin_pct)}%</Text>
              ) : (
                <Text type="secondary">{messages.approvals.marginHidden}</Text>
              )}
            </div>
            {typeof payload.reason === "string" && (
              <div>
                <Text strong>{messages.approvals.reason}: </Text>
                <Text>{payload.reason}</Text>
              </div>
            )}
          </div>

          <div>
            <Text strong className="text-xs">
              {messages.approvals.chain}
            </Text>
            <ol className="ml-4 list-decimal text-xs">
              {approvalCase.steps.map((step) => (
                <li key={step.id}>
                  <Tag>{step.approverRole}</Tag>
                  <Tag
                    color={
                      step.status === "approved"
                        ? "green"
                        : step.status === "pending"
                          ? "blue"
                          : undefined
                    }
                  >
                    {step.status}
                  </Tag>
                  {step.delegationId && (
                    <Tag color="gold">{messages.approvals.viaDelegation}</Tag>
                  )}
                  {step.note && <Text type="secondary"> — {step.note}</Text>}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <Text strong className="text-xs">
              {messages.approvals.reason}
            </Text>
            <Input.TextArea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={messages.approvals.reasonRequired}
            />
          </div>

          <Paragraph type="secondary" className="mb-0! text-xs">
            ทุกการตัดสินใจถูกบันทึกใน Audit Log พร้อมชื่อผู้ตัดสิน
          </Paragraph>
        </div>
      )}
    </Modal>
  );
}
