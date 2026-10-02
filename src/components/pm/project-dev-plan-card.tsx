"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ProjectDevPlanView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.devPlan;

const statusColor: Record<string, string> = {
  done: "success",
  in_progress: "processing",
  cancelled: "default",
};

const day = (value: string | null) =>
  value ? dayjs(value).format("D MMM YY") : "–";

/**
 * CD-212 — software work from the SOW in rounds of development: each round
 * a summary task in the project plan, each SOW line a task under it.
 */
export function ProjectDevPlanCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectDevPlanView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [roundOwner, setRoundOwner] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [target, setTarget] = useState<string | null>(
    view.iterations.at(-1)?.id ?? null,
  );
  const [owner, setOwner] = useState<string | null>(null);
  const [days, setDays] = useState<number>(5);
  const base = `projects/${projectId}/dev-plan/iterations`;
  const ownerOptions = people.map((person) => ({
    value: person.id,
    label: person.name,
  }));

  async function post(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return false;
    }
    message.success(m.saved);
    router.refresh();
    return true;
  }

  async function addIteration() {
    const ok = await post(base, {
      title,
      owner_user_id: roundOwner,
    });
    if (ok) {
      setTitle("");
      setRoundOwner(null);
    }
  }

  async function addItems() {
    if (!target) return;
    const ok = await post(`${base}/${target}/items`, {
      refs: picked,
      owner_user_id: owner,
      duration_days: days,
    });
    if (ok) setPicked([]);
  }

  return (
    <Card
      size="small"
      title={`${m.title} · ${m.coverage(view.planned, view.done, view.total)}`}
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}

      {view.iterations.length ? (
        <div className="divide-y">
          {view.iterations.map((round) => (
            <div key={round.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {round.wbs} {round.title}
                </span>
                <Tag>{m.progress(round.done, round.items.length)}</Tag>
                <Text type="secondary" className="text-xs">
                  {m.dates(day(round.start), day(round.finish))}
                  {round.ownerName && ` · ${round.ownerName}`}
                </Text>
              </div>
              {round.items.length ? (
                round.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 pl-4 text-xs"
                  >
                    <span>
                      {item.wbs} {item.title}
                    </span>
                    <Tag color={statusColor[item.status]}>
                      {m.status[item.status] ?? item.status}
                    </Tag>
                    <Text type="secondary" className="text-xs">
                      {[
                        item.ownerName,
                        m.dates(day(item.start), day(item.finish)),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </div>
                ))
              ) : (
                <Text type="secondary" className="block pl-4 text-xs">
                  {m.emptyIteration}
                </Text>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      {view.canEdit && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs">
            {m.iterationTitle}
            <Input
              value={title}
              maxLength={255}
              placeholder="Sprint 1"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="text-xs">
            {m.owner}
            <Select
              className="min-w-40"
              allowClear
              showSearch
              optionFilterProp="label"
              value={roundOwner ?? undefined}
              onChange={(value?: string) => setRoundOwner(value ?? null)}
              options={ownerOptions}
            />
          </label>
          <Button
            disabled={!title.trim() || busy}
            onClick={() => void addIteration()}
          >
            {m.addIteration}
          </Button>
        </div>
      )}

      <div className="mt-3">
        <Text strong className="text-xs">
          {view.unplanned.length
            ? m.unplanned(view.unplanned.length)
            : m.allPlanned}
        </Text>
        {view.unplanned.length > 0 && (
          <Checkbox.Group
            className="mt-1 flex flex-col"
            value={picked}
            disabled={!view.canEdit || !view.iterations.length}
            onChange={(values) => setPicked(values)}
            options={view.unplanned.map((row) => ({
              value: row.ref,
              label: (
                <span className="text-xs">
                  <Tag>{m.source[row.source]}</Tag>
                  {row.text}
                </span>
              ),
            }))}
          />
        )}
        {view.canEdit &&
          view.iterations.length > 0 &&
          view.unplanned.length > 0 && (
            <Space className="mt-2" wrap align="end">
              <label className="text-xs">
                {m.iteration}
                <Select
                  className="min-w-40"
                  value={target ?? undefined}
                  onChange={(value: string) => setTarget(value)}
                  options={view.iterations.map((round) => ({
                    value: round.id,
                    label: `${round.wbs} ${round.title}`,
                  }))}
                />
              </label>
              <label className="text-xs">
                {m.owner}
                <Select
                  className="min-w-40"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={owner ?? undefined}
                  onChange={(value?: string) => setOwner(value ?? null)}
                  options={ownerOptions}
                />
              </label>
              <label className="text-xs">
                {m.days}
                <InputNumber
                  min={0}
                  max={3650}
                  value={days}
                  onChange={(value) => setDays(value ?? 0)}
                />
              </label>
              <Button
                type="primary"
                disabled={!picked.length || !target || busy}
                onClick={() => void addItems()}
              >
                {m.toIteration} · {m.selected(picked.length)}
              </Button>
            </Space>
          )}
      </div>
    </Card>
  );
}
