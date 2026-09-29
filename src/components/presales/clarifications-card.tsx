"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { SolutionClarification, SolutionDetail } from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const mc = messages.presales.clarifications;
const mp = messages.presales;

const today = () => new Date().toISOString().slice(0, 10);
const dateOf = (value: string | null) => (value ? value.slice(0, 10) : "—");

interface AnswerDraft {
  row: SolutionClarification;
  answer: string;
  respondent: string;
  answeredOn: string;
  affectsScope: boolean;
}

/**
 * CD-140 — ชี้แจงประเด็นเทคนิค: the Q&A with the customer, apart from the
 * versions. Pre-Sales and the deal's salesperson ask and record answers; an
 * answer that changes the scope stays open until Pre-Sales names the version
 * whose SOW has it, and until then the Solution cannot go for approval.
 */
export function ClarificationsCard({ solution }: { solution: SolutionDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const base = `presales/solutions/${solution.id}/clarifications`;
  const counts = solution.clarification_counts;
  // Pre-Sales, or the salesperson on the deal (the API decides).
  const canWrite = solution.can_answer;

  const [question, setQuestion] = useState("");
  const [askedOn, setAskedOn] = useState(today());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SolutionClarification | null>(null);
  const [answering, setAnswering] = useState<AnswerDraft | null>(null);
  const [resolving, setResolving] = useState<SolutionClarification | null>(
    null,
  );
  const [resolveVersion, setResolveVersion] = useState<number | undefined>();

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

  async function ask() {
    const ok = await run(base, {
      method: "POST",
      body: JSON.stringify({ question, asked_on: askedOn }),
    });
    if (ok) setQuestion("");
  }

  async function saveQuestion() {
    if (!editing) return;
    const ok = await run(`${base}/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ question: editing.question }),
    });
    if (ok) setEditing(null);
  }

  async function saveAnswer() {
    if (!answering) return;
    const ok = await run(`${base}/${answering.row.id}/answer`, {
      method: "POST",
      body: JSON.stringify({
        answer: answering.answer,
        respondent: answering.respondent,
        answered_on: answering.answeredOn,
        affects_scope: answering.affectsScope,
      }),
    });
    if (ok) setAnswering(null);
  }

  async function resolve() {
    if (!resolving || !resolveVersion) return;
    const ok = await run(`${base}/${resolving.id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ version_no: resolveVersion }),
    });
    if (ok) setResolving(null);
  }

  return (
    <Card
      size="small"
      title={`${mc.title} · ${counts.total}`}
      extra={
        counts.total ? (
          <Text type="secondary" className="text-xs">
            {mc.summary(counts.awaiting_answer, counts.scope_open)}
          </Text>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {mc.hint}
      </Text>

      {canWrite && (
        <Space.Compact className="mb-3 w-full">
          <Input
            type="date"
            value={askedOn}
            style={{ width: 160 }}
            aria-label={mc.askedOn}
            onChange={(event) => setAskedOn(event.target.value || today())}
          />
          <Input
            value={question}
            maxLength={4000}
            placeholder={mc.questionPlaceholder}
            onChange={(event) => setQuestion(event.target.value)}
            onPressEnter={() => question.trim() && void ask()}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!question.trim()}
            loading={busy}
            onClick={() => void ask()}
          >
            {mc.ask}
          </Button>
        </Space.Compact>
      )}

      <Table<SolutionClarification>
        size="small"
        rowKey="id"
        pagination={false}
        locale={{ emptyText: mc.empty }}
        dataSource={solution.clarifications}
        columns={[
          { title: "#", dataIndex: "seq", width: 48 },
          {
            title: mc.question,
            dataIndex: "question",
            render: (value: string, row) => (
              <>
                <span className="whitespace-pre-wrap">{value}</span>
                <Text type="secondary" className="block text-xs">
                  {mc.askedOn} {dateOf(row.askedOn)}
                </Text>
              </>
            ),
          },
          {
            title: mc.answer,
            dataIndex: "answer",
            render: (value: string | null, row) =>
              value ? (
                <>
                  <span className="whitespace-pre-wrap">{value}</span>
                  <Text type="secondary" className="block text-xs">
                    {[row.respondent, dateOf(row.answeredOn)]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </>
              ) : (
                <Tag color="orange">{mc.awaiting}</Tag>
              ),
          },
          {
            title: mc.scope,
            key: "scope",
            width: 120,
            render: (_: unknown, row) =>
              !row.answer || !row.affectsScope ? (
                "—"
              ) : row.scopeResolvedVersionNo !== null ? (
                <Tag color="green">
                  {mc.scopeResolved(row.scopeResolvedVersionNo)}
                </Tag>
              ) : (
                <Tag color="red">{mc.scopeOpen}</Tag>
              ),
          },
          {
            key: "actions",
            width: 180,
            render: (_: unknown, row) => (
              <Space size={0} wrap>
                {canWrite && !row.answer && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setEditing({ ...row })}
                  >
                    {mc.editQuestion}
                  </Button>
                )}
                {canWrite && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      setAnswering({
                        row,
                        answer: row.answer ?? "",
                        respondent: row.respondent ?? "",
                        answeredOn: row.answeredOn
                          ? row.answeredOn.slice(0, 10)
                          : today(),
                        affectsScope: row.affectsScope,
                      })
                    }
                  >
                    {mc.recordAnswer}
                  </Button>
                )}
                {solution.can_manage &&
                  row.answer &&
                  row.affectsScope &&
                  row.scopeResolvedVersionNo === null && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setResolveVersion(solution.currentVersionNo);
                        setResolving(row);
                      }}
                    >
                      {mc.resolve}
                    </Button>
                  )}
                {solution.can_manage && (
                  <Popconfirm
                    title={mc.removeConfirm}
                    onConfirm={() =>
                      void run(`${base}/${row.id}`, { method: "DELETE" })
                    }
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      aria-label={mc.remove}
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
        title={editing ? `${mc.editQuestion} #${editing.seq}` : ""}
        okText={mc.save}
        okButtonProps={{ loading: busy, disabled: !editing?.question.trim() }}
        onOk={() => void saveQuestion()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        {editing && (
          <Input.TextArea
            value={editing.question}
            maxLength={4000}
            autoSize={{ minRows: 2 }}
            onChange={(event) =>
              setEditing({ ...editing, question: event.target.value })
            }
          />
        )}
      </Modal>

      <Modal
        open={answering !== null}
        title={answering ? `${mc.recordAnswer} #${answering.row.seq}` : ""}
        okText={mc.save}
        okButtonProps={{
          loading: busy,
          disabled:
            !answering?.answer.trim() ||
            !answering.respondent.trim() ||
            !answering.answeredOn,
        }}
        onOk={() => void saveAnswer()}
        onCancel={() => setAnswering(null)}
        destroyOnHidden
      >
        {answering && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{answering.row.question}</Text>
            <Input.TextArea
              value={answering.answer}
              maxLength={8000}
              autoSize={{ minRows: 3 }}
              placeholder={mc.answer}
              onChange={(event) =>
                setAnswering({ ...answering, answer: event.target.value })
              }
            />
            <Input
              value={answering.respondent}
              maxLength={300}
              placeholder={mc.respondent}
              onChange={(event) =>
                setAnswering({ ...answering, respondent: event.target.value })
              }
            />
            <Space>
              <Text>{mc.answeredOn}</Text>
              <Input
                type="date"
                value={answering.answeredOn}
                onChange={(event) =>
                  setAnswering({
                    ...answering,
                    answeredOn: event.target.value,
                  })
                }
              />
            </Space>
            <Checkbox
              checked={answering.affectsScope}
              onChange={(event) =>
                setAnswering({
                  ...answering,
                  affectsScope: event.target.checked,
                })
              }
            >
              {mc.affectsScope}
            </Checkbox>
          </Space>
        )}
      </Modal>

      <Modal
        open={resolving !== null}
        title={resolving ? `${mc.resolveTitle} #${resolving.seq}` : ""}
        okText={mc.resolveOk}
        okButtonProps={{ loading: busy, disabled: !resolveVersion }}
        onOk={() => void resolve()}
        onCancel={() => setResolving(null)}
        destroyOnHidden
      >
        {resolving && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{mc.resolveHint}</Text>
            <Select
              value={resolveVersion}
              style={{ width: "100%" }}
              onChange={(no: number) => setResolveVersion(no)}
              options={solution.versions.map((row) => ({
                value: row.versionNo,
                label: `${mp.version(row.versionNo)} · ${
                  mp.versionStatus[row.status] ?? row.status
                }`,
              }))}
            />
          </Space>
        )}
      </Modal>
    </Card>
  );
}
