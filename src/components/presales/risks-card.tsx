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
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  RiskStatus,
  SolutionDetail,
  SolutionRisk,
} from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const mr = messages.presales.risks;

export const RISK_LEVEL_COLOR: Record<string, string> = {
  low: "green",
  medium: "gold",
  high: "orange",
  critical: "red",
};

const SCALE = [1, 2, 3, 4, 5].map((value) => ({
  value,
  label: mr.scale[value],
}));
const STATUSES = Object.keys(mr.statuses) as RiskStatus[];

interface RiskDraft {
  id: string | null;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  owner: string;
  mitigation: string;
  status: RiskStatus;
}

const blank: RiskDraft = {
  id: null,
  title: "",
  description: "",
  likelihood: 3,
  impact: 3,
  owner: "",
  mitigation: "",
  status: "open",
};

/** Same bands as the backend: 1–4 · 5–9 · 10–16 · 20–25. */
function levelOf(score: number) {
  if (score >= 20) return "critical";
  if (score >= 10) return "high";
  if (score >= 5) return "medium";
  return "low";
}

/**
 * CD-141 — ความเสี่ยงทางเทคนิค: the Solution's risk register, apart from its
 * versions. Pre-Sales writes it; an open high or critical risk without an
 * owner or a plan keeps the Solution from going for approval.
 */
export function RisksCard({ solution }: { solution: SolutionDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const base = `presales/solutions/${solution.id}/risks`;
  const counts = solution.risk_counts;
  const [draft, setDraft] = useState<RiskDraft | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function save() {
    if (!draft) return;
    const { id, ...body } = draft;
    const ok = await run(id ? `${base}/${id}` : base, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(id ? body : { ...body, status: undefined }),
    });
    if (ok) setDraft(null);
  }

  const draftScore = draft ? draft.likelihood * draft.impact : 0;
  const draftLevel = levelOf(draftScore);
  const draftNeedsPlan =
    draft?.status === "open" &&
    (draftLevel === "high" || draftLevel === "critical") &&
    (!draft.owner.trim() || !draft.mitigation.trim());

  return (
    <Card
      size="small"
      title={`${mr.title} · ${counts.total}`}
      extra={
        <Space>
          {counts.total > 0 && (
            <Text type="secondary" className="text-xs">
              {mr.summary(counts.open, counts.open_high, counts.needs_plan)}
            </Text>
          )}
          {solution.can_manage && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setDraft({ ...blank })}
            >
              {mr.add}
            </Button>
          )}
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {mr.hint}
      </Text>
      <Table<SolutionRisk>
        size="small"
        rowKey="id"
        pagination={false}
        locale={{ emptyText: mr.empty }}
        dataSource={solution.risks}
        columns={[
          { title: "#", dataIndex: "seq", width: 48 },
          {
            title: mr.risk,
            dataIndex: "title",
            render: (title: string, row) => (
              <>
                <Text strong>{title}</Text>
                {row.description && (
                  <div className="text-xs whitespace-pre-wrap">
                    {row.description}
                  </div>
                )}
              </>
            ),
          },
          {
            title: mr.score,
            key: "score",
            width: 150,
            render: (_: unknown, row) => (
              <Space size={4} orientation="vertical">
                <Tag color={RISK_LEVEL_COLOR[row.level]}>
                  {mr.levels[row.level]} · {row.score}
                </Tag>
                <Text type="secondary" className="text-xs">
                  {row.likelihood} × {row.impact}
                </Text>
              </Space>
            ),
          },
          {
            title: mr.mitigation,
            key: "plan",
            render: (_: unknown, row) => (
              <>
                <div className="whitespace-pre-wrap">
                  {row.mitigation || "—"}
                </div>
                <Text type="secondary" className="text-xs">
                  {mr.owner}: {row.owner || "—"}
                </Text>
              </>
            ),
          },
          {
            title: mr.status,
            dataIndex: "status",
            width: 150,
            render: (status: string, row) => (
              <Space size={4} orientation="vertical">
                <Tag>{mr.statuses[status] ?? status}</Tag>
                {status === "open" &&
                  (row.level === "high" || row.level === "critical") &&
                  (!row.owner || !row.mitigation) && (
                    <Tag color="red">{mr.needsPlan}</Tag>
                  )}
              </Space>
            ),
          },
          ...(solution.can_manage
            ? [
                {
                  key: "actions",
                  width: 100,
                  render: (_: unknown, row: SolutionRisk) => (
                    <Space size={0}>
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          setDraft({
                            id: row.id,
                            title: row.title,
                            description: row.description,
                            likelihood: row.likelihood,
                            impact: row.impact,
                            owner: row.owner,
                            mitigation: row.mitigation,
                            status: row.status,
                          })
                        }
                      >
                        {mr.edit}
                      </Button>
                      <Popconfirm
                        title={mr.removeConfirm}
                        onConfirm={() =>
                          void run(`${base}/${row.id}`, { method: "DELETE" })
                        }
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          aria-label={mr.remove}
                        />
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={draft !== null}
        title={draft?.id ? mr.edit : mr.add}
        okText={mr.save}
        okButtonProps={{ loading: busy, disabled: !draft?.title.trim() }}
        onOk={() => void save()}
        onCancel={() => setDraft(null)}
        destroyOnHidden
      >
        {draft && (
          <Space orientation="vertical" className="w-full">
            <Input
              value={draft.title}
              maxLength={500}
              placeholder={mr.titlePlaceholder}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
            <Input.TextArea
              value={draft.description}
              maxLength={4000}
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder={mr.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
            <Space wrap>
              <span>
                <Text className="block text-xs">{mr.likelihood}</Text>
                <Select
                  value={draft.likelihood}
                  style={{ width: 150 }}
                  options={SCALE}
                  onChange={(value: number) =>
                    setDraft({ ...draft, likelihood: value })
                  }
                />
              </span>
              <span>
                <Text className="block text-xs">{mr.impact}</Text>
                <Select
                  value={draft.impact}
                  style={{ width: 150 }}
                  options={SCALE}
                  onChange={(value: number) =>
                    setDraft({ ...draft, impact: value })
                  }
                />
              </span>
              <Tag color={RISK_LEVEL_COLOR[draftLevel]}>
                {mr.levels[draftLevel]} · {draftScore}
              </Tag>
            </Space>
            <Input
              value={draft.owner}
              maxLength={300}
              placeholder={mr.owner}
              onChange={(event) =>
                setDraft({ ...draft, owner: event.target.value })
              }
            />
            <Input.TextArea
              value={draft.mitigation}
              maxLength={4000}
              autoSize={{ minRows: 2, maxRows: 5 }}
              placeholder={mr.mitigation}
              onChange={(event) =>
                setDraft({ ...draft, mitigation: event.target.value })
              }
            />
            {draft.id && (
              <Select
                value={draft.status}
                style={{ width: 200 }}
                options={STATUSES.map((value) => ({
                  value,
                  label: mr.statuses[value],
                }))}
                onChange={(value: RiskStatus) =>
                  setDraft({ ...draft, status: value })
                }
              />
            )}
            {draftNeedsPlan && <Tag color="red">{mr.needsPlan}</Tag>}
          </Space>
        )}
      </Modal>
    </Card>
  );
}
