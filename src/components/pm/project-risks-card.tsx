"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type { ProjectRiskView, ProjectRisksView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.risks;

interface Draft {
  id?: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  ownerUserId: string | null;
  response: string;
  status: ProjectRiskView["status"];
  reviewEveryDays: number;
}

interface Review {
  risk: ProjectRiskView;
  note: string;
  likelihood: number;
  impact: number;
  status: ProjectRiskView["status"];
}

const statusOptions = Object.entries(m.status).map(([value, label]) => ({
  value,
  label,
}));

/** The tags that say where a risk stands. */
export function RiskTags({ risk }: { readonly risk: ProjectRiskView }) {
  return (
    <>
      <Tag color={m.levelColor[risk.level]}>
        {m.level[risk.level]} {risk.score}
      </Tag>
      <Tag>{m.source[risk.source]}</Tag>
      {risk.status !== "open" && <Tag>{m.status[risk.status]}</Tag>}
      {risk.needsPlan && <Tag color="red">{m.needsPlan}</Tag>}
      {risk.reviewOverdue && <Tag color="volcano">{m.overdue}</Tag>}
    </>
  );
}

/**
 * CD-183 — the project's risks: taken over from the technical team and
 * Legal or raised here, each with an owner, a plan and a review cycle.
 */
export function ProjectRisksCard({
  projectId,
  view,
  people,
  currentUserId,
}: {
  readonly projectId: string;
  readonly view: ProjectRisksView;
  readonly people: { id: string; name: string }[];
  readonly currentUserId: string | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/risks`;
  const pickable = [
    ...people,
    ...view.risks
      .filter(
        (risk) =>
          risk.ownerUserId &&
          !people.some((person) => person.id === risk.ownerUserId),
      )
      .map((risk) => ({ id: risk.ownerUserId!, name: risk.ownerName ?? "" })),
  ];

  async function call(path: string, init: RequestInit, done: string) {
    setBusy(true);
    setError(null);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(done);
    router.refresh();
    return true;
  }

  async function save() {
    if (!draft) return;
    const ok = await call(
      draft.id ? `${base}/${draft.id}` : base,
      {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          likelihood: draft.likelihood,
          impact: draft.impact,
          owner_user_id: draft.ownerUserId,
          response: draft.response,
          review_every_days: draft.reviewEveryDays,
          ...(draft.id ? { status: draft.status } : {}),
        }),
      },
      m.saved,
    );
    if (ok) setDraft(null);
  }

  async function saveReview() {
    if (!review) return;
    const ok = await call(
      `${base}/${review.risk.id}/reviews`,
      {
        method: "POST",
        body: JSON.stringify({
          note: review.note,
          likelihood: review.likelihood,
          impact: review.impact,
          status: review.status,
        }),
      },
      m.saved,
    );
    if (ok) setReview(null);
  }

  return (
    <Card
      size="small"
      title={`${m.title} · ${view.risks.filter((risk) => risk.status === "open").length}`}
      extra={
        view.canEdit ? (
          <Space wrap>
            <Button
              size="small"
              loading={busy}
              onClick={() =>
                void call(`${base}/take-over`, { method: "POST" }, m.takenOver)
              }
            >
              {m.takeOver}
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setError(null);
                setDraft({
                  title: "",
                  description: "",
                  likelihood: 3,
                  impact: 3,
                  ownerUserId: null,
                  response: "",
                  status: "open",
                  reviewEveryDays: 14,
                });
              }}
            >
              {m.add}
            </Button>
          </Space>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && !draft && !review && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}
      {view.risks.length ? (
        <div className="divide-y">
          {view.risks.map((risk) => (
            <div
              key={risk.id}
              className={`py-2 text-sm ${risk.status === "closed" ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {risk.label} · {risk.title}
                  </span>{" "}
                  <RiskTags risk={risk} />
                </div>
                <Space size={0} wrap>
                  {view.canEdit && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setDraft({
                          id: risk.id,
                          title: risk.title,
                          description: risk.description ?? "",
                          likelihood: risk.likelihood,
                          impact: risk.impact,
                          ownerUserId: risk.ownerUserId,
                          response: risk.response ?? "",
                          status: risk.status,
                          reviewEveryDays: risk.reviewEveryDays,
                        });
                      }}
                    >
                      {m.edit}
                    </Button>
                  )}
                  {(view.canEdit || risk.ownerUserId === currentUserId) && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setError(null);
                        setReview({
                          risk,
                          note: "",
                          likelihood: risk.likelihood,
                          impact: risk.impact,
                          status: risk.status,
                        });
                      }}
                    >
                      {m.reviewAction}
                    </Button>
                  )}
                </Space>
              </div>
              <div className="text-xs">
                <Text type="secondary">
                  {m.score(risk.likelihood, risk.impact)} · {m.owner}:{" "}
                  {risk.ownerName ?? m.noOwner} ·{" "}
                  {m.every(risk.reviewEveryDays)}
                  {risk.nextReviewOn &&
                    ` · ${m.nextReview(dayjs(risk.nextReviewOn).format("D MMM YY"))}`}
                </Text>
              </div>
              <div className="text-xs whitespace-pre-line">
                {m.response}: {risk.response ?? m.noResponse}
              </div>
              {risk.reviews[0] && (
                <Text type="secondary" className="block text-xs">
                  {dayjs(risk.reviews[0].reviewedAt).format("D MMM YY")} ·{" "}
                  {risk.reviews[0].reviewedByName}: {risk.reviews[0].note}
                </Text>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? m.form.editTitle : m.form.addTitle}
        onCancel={() => setDraft(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void save()}
        destroyOnHidden
      >
        {draft && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.name}
              <Input
                value={draft.title}
                maxLength={255}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.description}
              <Input.TextArea
                rows={2}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <label className="block text-xs">
                {m.form.likelihood}
                <InputNumber
                  className="w-full!"
                  min={1}
                  max={5}
                  value={draft.likelihood}
                  onChange={(value) =>
                    setDraft({ ...draft, likelihood: Number(value ?? 1) })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.impact}
                <InputNumber
                  className="w-full!"
                  min={1}
                  max={5}
                  value={draft.impact}
                  onChange={(value) =>
                    setDraft({ ...draft, impact: Number(value ?? 1) })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.every}
                <InputNumber
                  className="w-full!"
                  min={1}
                  max={180}
                  value={draft.reviewEveryDays}
                  onChange={(value) =>
                    setDraft({ ...draft, reviewEveryDays: Number(value ?? 14) })
                  }
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.owner}
              <SearchSelect
                className="w-full"
                allowClear
                value={draft.ownerUserId ?? undefined}
                onChange={(value?: string) =>
                  setDraft({ ...draft, ownerUserId: value ?? null })
                }
                options={pickable.map((person) => ({
                  value: person.id,
                  label: person.name,
                }))}
              />
            </label>
            <label className="block text-xs">
              {m.form.response}
              <Input.TextArea
                rows={3}
                value={draft.response}
                onChange={(event) =>
                  setDraft({ ...draft, response: event.target.value })
                }
              />
            </label>
            {draft.id && (
              <label className="block text-xs">
                {m.form.status}
                <Select
                  className="w-full"
                  value={draft.status}
                  onChange={(status: Draft["status"]) =>
                    setDraft({ ...draft, status })
                  }
                  options={statusOptions}
                />
              </label>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={review !== null}
        title={`${m.form.reviewTitle}: ${review?.risk.label ?? ""}`}
        onCancel={() => setReview(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void saveReview()}
        destroyOnHidden
      >
        {review && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={3}
                value={review.note}
                onChange={(event) =>
                  setReview({ ...review, note: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs">
                {m.form.likelihood}
                <InputNumber
                  className="w-full!"
                  min={1}
                  max={5}
                  value={review.likelihood}
                  onChange={(value) =>
                    setReview({ ...review, likelihood: Number(value ?? 1) })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.impact}
                <InputNumber
                  className="w-full!"
                  min={1}
                  max={5}
                  value={review.impact}
                  onChange={(value) =>
                    setReview({ ...review, impact: Number(value ?? 1) })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.status}
                <Select
                  className="w-full"
                  value={review.status}
                  onChange={(status: Review["status"]) =>
                    setReview({ ...review, status })
                  }
                  options={statusOptions}
                />
              </label>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
