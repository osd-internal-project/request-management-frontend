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
  Modal,
  Progress,
  Radio,
  Segmented,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type { ProjectTestsView, TestItemView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.tests;

interface Plan {
  item: TestItemView | null;
  text: string;
  steps: string;
  ownerUserId: string | null;
  waivedReason: string;
}

/**
 * CD-221 — the project's tests against what was sold, item by item: the
 * team records each result with its evidence (a failure opens an issue for
 * the manager); the manager writes how to test, assigns, adds or waives.
 */
export function ProjectTestsCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectTestsView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [filter, setFilter] = useState<"all" | "open">("open");
  const [recording, setRecording] = useState<TestItemView | null>(null);
  const [result, setResult] = useState<"pass" | "fail">("pass");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/tests`;
  const { coverage } = view;
  const shown = view.items.filter(
    (item) =>
      filter === "all" || item.state === "untested" || item.state === "failed",
  );
  const pickable = [
    ...people,
    ...view.items
      .filter(
        (item) =>
          item.ownerUserId &&
          !people.some((person) => person.id === item.ownerUserId),
      )
      .map((item) => ({ id: item.ownerUserId!, name: item.ownerName ?? "" })),
  ].filter(
    (person, index, all) => all.findIndex((p) => p.id === person.id) === index,
  );

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, init);
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return false;
    }
    message.success(m.saved);
    router.refresh();
    return true;
  }

  async function record() {
    if (!recording) return;
    const form = new FormData();
    form.append("result", result);
    if (note.trim()) form.append("note", note);
    if (file) form.append("file", file);
    const ok = await call(`${base}/${recording.id}/results`, {
      method: "POST",
      body: form,
    });
    if (ok) setRecording(null);
  }

  async function savePlan() {
    if (!plan) return;
    const body = plan.item
      ? {
          ...(plan.item.source === "manual" ? { text: plan.text } : {}),
          steps: plan.steps,
          owner_user_id: plan.ownerUserId ?? "",
          waived_reason: plan.waivedReason,
        }
      : {
          text: plan.text,
          steps: plan.steps,
          owner_user_id: plan.ownerUserId ?? undefined,
        };
    const ok = await call(plan.item ? `${base}/${plan.item.id}` : base, {
      method: plan.item ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    if (ok) setPlan(null);
  }

  const fileHref = (itemId: string, runId: string) =>
    `/api/app/projects/${projectId}/tests/${itemId}/results/${runId}/file`;

  return (
    <Card
      size="small"
      title={`${m.title} · ${m.coverage(coverage.passed, coverage.total)}`}
      extra={
        view.canEdit ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setError(null);
              setPlan({
                item: null,
                text: "",
                steps: "",
                ownerUserId: null,
                waivedReason: "",
              });
            }}
          >
            {m.add}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {coverage.total > 0 && (
        <div className="mb-2">
          <Progress
            percent={Math.round((coverage.passed / coverage.total) * 100)}
            size="small"
            status={coverage.failed ? "exception" : undefined}
          />
          <Text type="secondary" className="text-xs">
            {m.counts(coverage.failed, coverage.untested, coverage.waived)}
          </Text>
        </div>
      )}
      {coverage.complete && (
        <Alert className="mb-2" type="success" showIcon title={m.complete} />
      )}
      {error && !recording && !plan && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.items.length > 0 && (
        <Segmented
          size="small"
          className="mb-2"
          value={filter}
          onChange={(value) => setFilter(value as "all" | "open")}
          options={[
            { value: "open", label: m.filter.open },
            { value: "all", label: m.filter.all },
          ]}
        />
      )}

      {view.items.length ? (
        <div className="divide-y">
          {shown.map((item) => {
            const latest = item.runs[0];
            return (
              <div key={item.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">{item.label}</span>{" "}
                    <Tag color={m.stateColor[item.state]}>
                      {m.state[item.state]}
                    </Tag>
                    <Tag>{m.source[item.source]}</Tag>
                    {item.deliverable && (
                      <Text type="secondary" className="text-xs">
                        {item.deliverable} ·{" "}
                      </Text>
                    )}
                    {item.text}
                  </div>
                  <div>
                    {view.canWrite && item.state !== "waived" && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          setError(null);
                          setResult("pass");
                          setNote("");
                          setFile(null);
                          setRecording(item);
                        }}
                      >
                        {m.record}
                      </Button>
                    )}
                    {view.canEdit && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          setError(null);
                          setPlan({
                            item,
                            text: item.text,
                            steps: item.steps ?? "",
                            ownerUserId: item.ownerUserId,
                            waivedReason: item.waivedReason ?? "",
                          });
                        }}
                      >
                        {m.plan}
                      </Button>
                    )}
                  </div>
                </div>
                {item.steps && (
                  <div className="text-xs whitespace-pre-line">
                    {m.steps(item.steps)}
                  </div>
                )}
                {item.ownerName && (
                  <Text type="secondary" className="block text-xs">
                    {m.owner(item.ownerName)}
                  </Text>
                )}
                {item.waivedReason && (
                  <Text type="secondary" className="block text-xs">
                    {m.waivedBecause(item.waivedReason)}
                  </Text>
                )}
                {latest && (
                  <div className="text-xs">
                    <Text
                      type={latest.result === "fail" ? "danger" : "success"}
                    >
                      {m.run(
                        latest.result === "pass" ? m.form.pass : m.form.fail,
                        latest.testedByName,
                        dayjs(latest.testedAt).format("D MMM YY HH:mm"),
                      )}
                    </Text>
                    {latest.note && ` · ${latest.note}`}
                    {latest.evidenceName && (
                      <>
                        {" · "}
                        <a
                          href={fileHref(item.id, latest.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {latest.evidenceName}
                        </a>
                      </>
                    )}
                    {latest.issue?.label && (
                      <Tag className="ml-1" color="red">
                        {m.issue(latest.issue.label)}
                      </Tag>
                    )}
                    {item.runs.length > 1 && (
                      <Text type="secondary" className="ml-1 text-xs">
                        ({m.history(item.runs.length)})
                      </Text>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={recording !== null}
        title={m.form.recordTitle(recording?.label ?? "")}
        onCancel={() => setRecording(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void record()}
        destroyOnHidden
      >
        {recording && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <Text className="block text-sm">{recording.text}</Text>
            <Radio.Group
              value={result}
              onChange={(event) =>
                setResult(event.target.value as "pass" | "fail")
              }
              options={[
                { value: "pass", label: m.form.pass },
                { value: "fail", label: m.form.fail },
              ]}
            />
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <label className="block text-xs">
              {m.form.file}
              <input
                type="file"
                className="block text-sm"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={plan !== null}
        title={plan?.item ? m.form.planTitle(plan.item.label) : m.form.addTitle}
        onCancel={() => setPlan(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void savePlan()}
        destroyOnHidden
      >
        {plan && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.text}
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={plan.text}
                disabled={Boolean(plan.item && plan.item.source !== "manual")}
                onChange={(event) =>
                  setPlan({ ...plan, text: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.stepsLabel}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={plan.steps}
                onChange={(event) =>
                  setPlan({ ...plan, steps: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.ownerLabel}
              <SearchSelect
                className="w-full"
                allowClear
                value={plan.ownerUserId ?? undefined}
                onChange={(value?: string) =>
                  setPlan({ ...plan, ownerUserId: value ?? null })
                }
                options={pickable.map((person) => ({
                  value: person.id,
                  label: person.name,
                }))}
              />
            </label>
            {plan.item && (
              <label className="block text-xs">
                {m.form.waive}
                <Input
                  value={plan.waivedReason}
                  maxLength={2000}
                  onChange={(event) =>
                    setPlan({ ...plan, waivedReason: event.target.value })
                  }
                />
              </label>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
