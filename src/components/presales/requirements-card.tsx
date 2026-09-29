"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  RequirementAssessment,
  RequirementKind,
  SolutionDetail,
  SolutionRequirement,
} from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const ma = messages.presales.analysis;

const ASSESSMENT_COLOR: Record<string, string> = {
  unassessed: "default",
  feasible: "green",
  not_feasible: "red",
  needs_info: "gold",
};

const KINDS = Object.keys(ma.kinds) as RequirementKind[];
const ASSESSMENTS = Object.keys(ma.assessments) as RequirementAssessment[];

const waiting = (row: SolutionRequirement) =>
  row.assessment === "needs_info" && !row.customerAnswer?.trim();

/**
 * CD-131 — วิเคราะห์ความต้องการ. A list apart from the versions: Pre-Sales
 * keeps editing it while the design is drafted; a salesperson on the deal
 * records what the customer answered.
 */
export function RequirementsCard({ solution }: { solution: SolutionDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const base = `presales/solutions/${solution.id}/requirements`;
  const counts = solution.requirement_counts;

  const [kind, setKind] = useState<RequirementKind>("business");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SolutionRequirement | null>(null);
  const [answering, setAnswering] = useState<SolutionRequirement | null>(null);
  const [answer, setAnswer] = useState("");

  async function run(path: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function add() {
    const ok = await run(base, {
      method: "POST",
      body: JSON.stringify({ kind, text }),
    });
    if (ok) setText("");
  }

  async function saveEdit() {
    if (!editing) return;
    const ok = await run(`${base}/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        kind: editing.kind,
        text: editing.text,
        assessment: editing.assessment,
        note: editing.note,
      }),
    });
    if (ok) setEditing(null);
  }

  async function saveAnswer() {
    if (!answering) return;
    const ok = await run(`${base}/${answering.id}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    });
    if (ok) setAnswering(null);
  }

  return (
    <Card
      size="small"
      title={`${ma.title} · ${counts.total}`}
      extra={
        counts.total ? (
          <Text type="secondary" className="text-xs">
            {ma.summary(
              counts.feasible,
              counts.not_feasible,
              counts.waiting_customer,
              counts.unassessed,
            )}
          </Text>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {ma.hint}
      </Text>

      {solution.can_manage && (
        <Space.Compact className="mb-3 w-full">
          <Select
            value={kind}
            style={{ width: 140 }}
            onChange={(value: RequirementKind) => setKind(value)}
            options={KINDS.map((value) => ({
              value,
              label: ma.kinds[value],
            }))}
          />
          <Input
            value={text}
            maxLength={2000}
            placeholder={ma.text}
            onChange={(event) => setText(event.target.value)}
            onPressEnter={() => text.trim() && void add()}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!text.trim()}
            loading={busy}
            onClick={() => void add()}
          >
            {ma.add}
          </Button>
        </Space.Compact>
      )}

      <Table<SolutionRequirement>
        size="small"
        rowKey="id"
        pagination={false}
        locale={{ emptyText: ma.empty }}
        dataSource={solution.requirements}
        columns={[
          { title: "#", dataIndex: "seq", width: 48 },
          {
            title: ma.kind,
            dataIndex: "kind",
            width: 110,
            render: (value: string) => (
              <Tag color={value === "business" ? "blue" : "purple"}>
                {ma.kinds[value] ?? value}
              </Tag>
            ),
          },
          {
            title: ma.text,
            dataIndex: "text",
            render: (value: string) => (
              <span className="whitespace-pre-wrap">{value}</span>
            ),
          },
          {
            title: ma.assessment,
            dataIndex: "assessment",
            width: 150,
            render: (value: string) => (
              <Tag color={ASSESSMENT_COLOR[value]}>
                {ma.assessments[value] ?? value}
              </Tag>
            ),
          },
          {
            title: ma.note,
            dataIndex: "note",
            render: (value: string) => (
              <span className="whitespace-pre-wrap">{value || "—"}</span>
            ),
          },
          {
            title: ma.answer,
            key: "answer",
            render: (_: unknown, row) =>
              row.customerAnswer ? (
                <span className="whitespace-pre-wrap">
                  {row.customerAnswer}
                </span>
              ) : waiting(row) ? (
                <Tag color="orange">{ma.waitingAnswer}</Tag>
              ) : (
                "—"
              ),
          },
          {
            key: "actions",
            width: 150,
            render: (_: unknown, row) => (
              <Space size={0} wrap>
                {solution.can_manage && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setEditing({ ...row })}
                  >
                    {ma.edit}
                  </Button>
                )}
                {solution.can_answer && row.assessment === "needs_info" && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setAnswer(row.customerAnswer ?? "");
                      setAnswering(row);
                    }}
                  >
                    {ma.recordAnswer}
                  </Button>
                )}
                {solution.can_manage && (
                  <Popconfirm
                    title={ma.removeConfirm}
                    onConfirm={() =>
                      void run(`${base}/${row.id}`, { method: "DELETE" })
                    }
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      aria-label={ma.remove}
                    />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={editing !== null}
        title={editing ? `${ma.edit} #${editing.seq}` : ""}
        okText={ma.save}
        okButtonProps={{ loading: busy, disabled: !editing?.text.trim() }}
        onOk={() => void saveEdit()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        {editing && (
          <Space orientation="vertical" className="w-full">
            <Radio.Group
              value={editing.kind}
              onChange={(event) =>
                setEditing({
                  ...editing,
                  kind: event.target.value as RequirementKind,
                })
              }
              options={KINDS.map((value) => ({
                value,
                label: ma.kinds[value],
              }))}
            />
            <Input.TextArea
              value={editing.text}
              maxLength={2000}
              autoSize={{ minRows: 2 }}
              onChange={(event) =>
                setEditing({ ...editing, text: event.target.value })
              }
            />
            <Text strong>{ma.assessment}</Text>
            <Radio.Group
              value={editing.assessment}
              optionType="button"
              onChange={(event) =>
                setEditing({
                  ...editing,
                  assessment: event.target.value as RequirementAssessment,
                })
              }
              options={ASSESSMENTS.map((value) => ({
                value,
                label: ma.assessments[value],
              }))}
            />
            <Input.TextArea
              value={editing.note}
              maxLength={2000}
              autoSize={{ minRows: 2 }}
              placeholder={ma.notePlaceholder[editing.assessment]}
              onChange={(event) =>
                setEditing({ ...editing, note: event.target.value })
              }
            />
          </Space>
        )}
      </Modal>

      <Modal
        open={answering !== null}
        title={answering ? `${ma.recordAnswer} #${answering.seq}` : ""}
        okText={ma.answerOk}
        okButtonProps={{ loading: busy, disabled: !answer.trim() }}
        onOk={() => void saveAnswer()}
        onCancel={() => setAnswering(null)}
        destroyOnHidden
      >
        {answering && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{answering.note}</Text>
            <Input.TextArea
              value={answer}
              maxLength={4000}
              autoSize={{ minRows: 3 }}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </Space>
        )}
      </Modal>
    </Card>
  );
}
