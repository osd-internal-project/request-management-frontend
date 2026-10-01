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
  Popconfirm,
  Select,
  Space,
  Tag,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import type { ProjectChangeView, ProjectChangesView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.changes;
const categories = messages.projects.budget.categories;

interface LineDraft {
  key: number;
  category: "material" | "labor" | "other";
  description: string;
  quantity: number | null;
  unitCost: number | null;
}

interface Draft {
  id?: string;
  title: string;
  reason: string;
  scopeAdded: string;
  scopeRemoved: string;
  scheduleDays: number;
  priceChange: number;
  lines: LineDraft[];
}

let nextKey = 1;
const signed = (value: number) =>
  `${value > 0 ? "+" : ""}${formatAmount(value)}`;
const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

/**
 * CD-185 — change requests: each judged on scope, time and cost with the
 * margin worked out, sent to the change board, and — approved — written
 * into the next budget.
 */
export function ProjectChangesCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectChangesView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/changes`;

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

  function open(change?: ProjectChangeView) {
    setError(null);
    setDraft(
      change
        ? {
            id: change.id,
            title: change.title,
            reason: change.reason,
            scopeAdded: change.scopeAdded ?? "",
            scopeRemoved: change.scopeRemoved ?? "",
            scheduleDays: change.scheduleDays,
            priceChange: change.priceChange,
            lines: change.costLines.map((line) => ({
              key: nextKey++,
              category: line.category,
              description: line.description,
              quantity: line.quantity,
              unitCost: line.unitCost,
            })),
          }
        : {
            title: "",
            reason: "",
            scopeAdded: "",
            scopeRemoved: "",
            scheduleDays: 0,
            priceChange: 0,
            lines: [],
          },
    );
  }

  async function save() {
    if (!draft) return;
    const ok = await call(
      draft.id ? `${base}/${draft.id}` : base,
      {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          title: draft.title,
          reason: draft.reason,
          scope_added: draft.scopeAdded,
          scope_removed: draft.scopeRemoved,
          schedule_days: draft.scheduleDays,
          price_change: draft.priceChange,
          cost_lines: draft.lines.map((line) => ({
            category: line.category,
            description: line.description,
            quantity: line.quantity ?? 0,
            unit_cost: line.unitCost,
          })),
        }),
      },
      m.saved,
    );
    if (ok) setDraft(null);
  }

  const patchLine = (key: number, change: Partial<LineDraft>) =>
    draft &&
    setDraft({
      ...draft,
      lines: draft.lines.map((line) =>
        line.key === key ? { ...line, ...change } : line,
      ),
    });

  return (
    <Card
      size="small"
      title={`${m.title} · ${view.changes.filter((row) => row.status !== "cancelled").length}`}
      extra={
        view.canEdit ? (
          <Button size="small" type="primary" onClick={() => open()}>
            {m.add}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {!view.typeConfigured && view.canEdit && (
        <Alert className="mb-2" type="info" showIcon title={m.notConfigured} />
      )}
      {error && !draft && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.changes.length ? (
        <div className="divide-y">
          {view.changes.map((change) => (
            <div
              key={change.id}
              className={`py-2 text-sm ${change.status === "cancelled" ? "opacity-50" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {change.label} · {change.title}
                  </span>{" "}
                  <Tag color={m.statusColor[change.status]}>
                    {m.status[change.status]}
                  </Tag>
                  {change.request && (
                    <a
                      className="text-xs"
                      href={ROUTES.requestDetail(change.request.id)}
                    >
                      {m.request(change.request.requestNo ?? "")}
                    </a>
                  )}
                </div>
                {view.canEdit && change.status === "draft" && (
                  <Space wrap>
                    <Button size="small" onClick={() => open(change)}>
                      {m.edit}
                    </Button>
                    <Popconfirm
                      title={m.submitConfirm}
                      onConfirm={() =>
                        void call(
                          `${base}/${change.id}/submit`,
                          { method: "POST" },
                          m.submitted,
                        )
                      }
                    >
                      <Button
                        size="small"
                        type="primary"
                        disabled={!view.typeConfigured || busy}
                      >
                        {m.submit}
                      </Button>
                    </Popconfirm>
                    <Button
                      size="small"
                      type="text"
                      danger
                      onClick={() =>
                        void call(
                          `${base}/${change.id}/cancel`,
                          { method: "POST" },
                          m.saved,
                        )
                      }
                    >
                      {m.cancel}
                    </Button>
                  </Space>
                )}
              </div>
              <Text type="secondary" className="block text-xs">
                {change.reason}
              </Text>
              {change.scopeAdded && (
                <div className="text-xs">
                  {m.scopeAdded}: {change.scopeAdded}
                </div>
              )}
              {change.scopeRemoved && (
                <div className="text-xs">
                  {m.scopeRemoved}: {change.scopeRemoved}
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs">
                <span>{m.schedule(change.scheduleDays)}</span>
                <span>{m.cost(signed(change.costChange))}</span>
                <span>{m.price(signed(change.priceChange))}</span>
                {change.impact &&
                  (change.impact.margin.fromPct === null ? (
                    <Text type="secondary" className="text-xs">
                      {m.noBudget}
                    </Text>
                  ) : (
                    <Text
                      className="text-xs"
                      type={
                        (change.impact.margin.toPct ?? 0) <
                        change.impact.margin.fromPct
                          ? "warning"
                          : "success"
                      }
                    >
                      {m.margin(
                        pct(change.impact.margin.fromPct),
                        pct(change.impact.margin.toPct),
                      )}
                    </Text>
                  ))}
              </div>
              {change.error && (
                <Text type="danger" className="block text-xs">
                  {change.error}
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
        width={760}
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
              {m.form.reason}
              <Input.TextArea
                rows={2}
                value={draft.reason}
                onChange={(event) =>
                  setDraft({ ...draft, reason: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.scopeAdded}
                <Input.TextArea
                  rows={2}
                  value={draft.scopeAdded}
                  onChange={(event) =>
                    setDraft({ ...draft, scopeAdded: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.scopeRemoved}
                <Input.TextArea
                  rows={2}
                  value={draft.scopeRemoved}
                  onChange={(event) =>
                    setDraft({ ...draft, scopeRemoved: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.scheduleDays}
                <InputNumber
                  className="w-full!"
                  value={draft.scheduleDays}
                  onChange={(value) =>
                    setDraft({ ...draft, scheduleDays: Number(value ?? 0) })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.priceChange}
                <InputNumber
                  className="w-full!"
                  value={draft.priceChange}
                  onChange={(value) =>
                    setDraft({ ...draft, priceChange: Number(value ?? 0) })
                  }
                />
              </label>
            </div>
            <div>
              <Text className="block text-xs">{m.form.costLines}</Text>
              {draft.lines.map((line) => (
                <div key={line.key} className="mt-1 flex flex-wrap gap-2">
                  <Select
                    size="small"
                    className="w-32"
                    value={line.category}
                    onChange={(category: LineDraft["category"]) =>
                      patchLine(line.key, { category })
                    }
                    options={Object.entries(categories).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Input
                    size="small"
                    className="min-w-40 flex-1"
                    placeholder={m.form.description}
                    value={line.description}
                    onChange={(event) =>
                      patchLine(line.key, { description: event.target.value })
                    }
                  />
                  <InputNumber
                    size="small"
                    className="w-24"
                    placeholder={m.form.quantity}
                    value={line.quantity}
                    onChange={(value) =>
                      patchLine(line.key, {
                        quantity: value === null ? null : Number(value),
                      })
                    }
                  />
                  <InputNumber
                    size="small"
                    className="w-32"
                    min={0}
                    placeholder={m.form.unitCost}
                    value={line.unitCost}
                    onChange={(value) =>
                      patchLine(line.key, {
                        unitCost: value === null ? null : Number(value),
                      })
                    }
                  />
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        lines: draft.lines.filter(
                          (item) => item.key !== line.key,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <Button
                size="small"
                className="mt-1"
                onClick={() =>
                  setDraft({
                    ...draft,
                    lines: [
                      ...draft.lines,
                      {
                        key: nextKey++,
                        category: "material",
                        description: "",
                        quantity: 1,
                        unitCost: null,
                      },
                    ],
                  })
                }
              >
                {m.form.addLine}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
