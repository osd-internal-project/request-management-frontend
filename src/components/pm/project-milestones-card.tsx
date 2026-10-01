"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
} from "antd";
import { PaperClipOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import type {
  ProjectMilestone,
  ProjectMilestonesView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.milestones;

interface Draft {
  id?: string;
  title: string;
  description: string;
  dueOn: Dayjs | null;
  installmentId: string | null;
  criteria: string;
  penaltyApplies: boolean;
}

const evidenceUrl = (projectId: string, milestoneId: string) =>
  `/api/app/projects/${projectId}/milestones/${milestoneId}/evidence`;

/**
 * CD-182 — the project's milestones: how each is measured, when it is
 * due, the installment it unlocks. The manager ticks each criterion and,
 * with all ticked, records the milestone achieved with its evidence.
 */
export function ProjectMilestonesCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectMilestonesView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [achieving, setAchieving] = useState<ProjectMilestone | null>(null);
  const [achievedOn, setAchievedOn] = useState<Dayjs | null>(dayjs());
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canEdit } = view;
  const base = `projects/${projectId}/milestones`;
  const waiting = view.installments.filter(
    (row) =>
      !row.milestoneId &&
      (Boolean(row.milestone) ||
        row.kind === "progress" ||
        row.kind === "final"),
  ).length;

  async function call(path: string, init: RequestInit, done?: string) {
    setBusy(true);
    setError(null);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    if (done) message.success(done);
    router.refresh();
    return true;
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError(m.form.required);
      return;
    }
    const body = JSON.stringify({
      title: draft.title,
      description: draft.description,
      due_on: draft.dueOn ? draft.dueOn.format("YYYY-MM-DD") : null,
      installment_id: draft.installmentId,
      penalty_applies: draft.penaltyApplies,
      criteria: draft.criteria
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
    const ok = await call(
      draft.id ? `${base}/${draft.id}` : base,
      { method: draft.id ? "PATCH" : "POST", body },
      m.saved,
    );
    if (ok) setDraft(null);
  }

  async function achieve() {
    if (!achieving) return;
    if (!achievedOn || !note.trim()) {
      setError(m.achieveForm.required);
      return;
    }
    const form = new FormData();
    form.append("achieved_on", achievedOn.format("YYYY-MM-DD"));
    form.append("evidence_note", note);
    if (file) form.append("file", file);
    const ok = await call(
      `${base}/${achieving.id}/achieve`,
      { method: "POST", body: form },
      m.saved,
    );
    if (ok) setAchieving(null);
  }

  const installmentOptions = (current?: string) =>
    view.installments
      .filter((row) => !row.milestoneId || row.milestoneId === current)
      .map((row) => ({
        value: row.id,
        label: `${row.seq}. ${row.label} · ${formatAmount(row.amount)}`,
      }));

  return (
    <Card
      size="small"
      title={`${m.title} · ${view.milestones.filter((row) => row.status !== "cancelled").length}`}
      extra={
        canEdit ? (
          <Space wrap>
            {waiting > 0 && (
              <Button
                size="small"
                loading={busy}
                onClick={() =>
                  void call(
                    `${base}/from-schedule`,
                    { method: "POST" },
                    m.fromScheduleDone,
                  )
                }
              >
                {m.fromSchedule}
              </Button>
            )}
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setError(null);
                setDraft({
                  title: "",
                  description: "",
                  dueOn: null,
                  installmentId: null,
                  criteria: "",
                  penaltyApplies: Boolean(view.penalty.rate),
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
      {view.penalty.exposure.total > 0 && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={m.exposure(
            formatAmount(view.penalty.exposure.total),
            view.penalty.ceiling === null
              ? null
              : formatAmount(view.penalty.ceiling),
          )}
        />
      )}
      {canEdit && waiting > 0 && (
        <Alert
          className="mb-2"
          type="info"
          showIcon
          title={m.waiting(waiting)}
        />
      )}
      {error && !draft && !achieving && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.milestones.length ? (
        <div className="divide-y">
          {view.milestones.map((row) => {
            const planned = row.status === "planned";
            const allMet =
              row.criteria.length > 0 &&
              row.criteriaMet === row.criteria.length;
            return (
              <div
                key={row.id}
                className={`py-2 ${row.status === "cancelled" ? "opacity-50" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">
                      {row.seq}. {row.title}
                    </span>{" "}
                    <Tag color={m.statusColor[row.status]}>
                      {m.status[row.status]}
                    </Tag>
                    {row.overdue && <Tag color="red">{m.overdue}</Tag>}
                    {row.penaltyApplies && (
                      <Tag color="volcano">{m.penaltyTag}</Tag>
                    )}
                    {row.penalty && row.penalty.daysLate > 0 && (
                      <Text type="danger" className="text-xs">
                        {m.penaltyLate(
                          row.penalty.daysLate,
                          row.penalty.amount === null
                            ? null
                            : formatAmount(row.penalty.amount),
                        )}
                      </Text>
                    )}
                    <div className="flex flex-wrap gap-x-3 text-xs">
                      {row.dueOn && (
                        <Text type="secondary">
                          {m.due(dayjs(row.dueOn).format("D MMM YYYY"))}
                        </Text>
                      )}
                      {row.installment && (
                        <Text type="warning">
                          {m.installment(
                            row.installment.seq,
                            row.installment.label,
                            formatAmount(row.installment.amount),
                          )}
                        </Text>
                      )}
                    </div>
                    {row.description && (
                      <Text className="block whitespace-pre-line text-sm">
                        {row.description}
                      </Text>
                    )}
                  </div>
                  {canEdit && planned && (
                    <Space wrap>
                      <Button
                        size="small"
                        type="primary"
                        disabled={!allMet}
                        title={allMet ? undefined : m.achieveHint}
                        onClick={() => {
                          setError(null);
                          setAchievedOn(dayjs());
                          setNote("");
                          setFile(null);
                          setAchieving(row);
                        }}
                      >
                        {m.achieve}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setError(null);
                          setDraft({
                            id: row.id,
                            title: row.title,
                            description: row.description ?? "",
                            dueOn: row.dueOn ? dayjs(row.dueOn) : null,
                            installmentId: row.installment?.id ?? null,
                            penaltyApplies: row.penaltyApplies,
                            criteria: row.criteria
                              .map((item) => item.text)
                              .join("\n"),
                          });
                        }}
                      >
                        {m.edit}
                      </Button>
                      <Popconfirm
                        title={m.cancelConfirm}
                        onConfirm={() =>
                          void call(
                            `${base}/${row.id}/cancel`,
                            { method: "POST" },
                            m.saved,
                          )
                        }
                      >
                        <Button size="small" danger type="text">
                          {m.cancel}
                        </Button>
                      </Popconfirm>
                    </Space>
                  )}
                </div>

                <div className="mt-1 pl-3">
                  <Text type="secondary" className="text-xs">
                    {row.criteria.length
                      ? m.criteria(row.criteriaMet, row.criteria.length)
                      : m.noCriteria}
                  </Text>
                  {row.criteria.map((item, index) => (
                    <div key={item.text} className="text-sm">
                      <Checkbox
                        checked={item.met}
                        disabled={!canEdit || !planned || busy}
                        onChange={(event) =>
                          void call(`${base}/${row.id}/criteria/${index}`, {
                            method: "PUT",
                            body: JSON.stringify({ met: event.target.checked }),
                          })
                        }
                      >
                        {item.text}
                      </Checkbox>
                      {item.met && item.metAt && (
                        <Text type="secondary" className="ml-1 text-xs">
                          {m.metBy(
                            item.metByName ?? "—",
                            dayjs(item.metAt).format("D MMM YY HH:mm"),
                          )}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>

                {row.status === "achieved" && (
                  <div className="mt-1 rounded bg-green-50 p-2 text-sm dark:bg-green-950">
                    <div>
                      {m.achievedOn(
                        dayjs(row.achievedOn).format("D MMM YYYY"),
                        row.achievedByName ?? "—",
                      )}
                    </div>
                    <div className="whitespace-pre-line">
                      <Text type="secondary">{m.evidence}: </Text>
                      {row.evidenceNote}
                    </div>
                    {row.evidenceFile && (
                      <a
                        href={evidenceUrl(projectId, row.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <PaperClipOutlined /> {row.evidenceFile.name}
                      </a>
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
        open={draft !== null}
        title={draft?.id ? m.form.editTitle : m.form.addTitle}
        onCancel={() => setDraft(null)}
        okText={m.save}
        cancelText={m.close}
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
                maxLength={2000}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.due}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.dueOn}
                  onChange={(value) => setDraft({ ...draft, dueOn: value })}
                />
              </label>
              <label className="block text-xs">
                {m.form.installment}
                <Select
                  className="w-full"
                  allowClear
                  placeholder={m.form.installmentNone}
                  value={draft.installmentId ?? undefined}
                  onChange={(value?: string) =>
                    setDraft({ ...draft, installmentId: value ?? null })
                  }
                  options={installmentOptions(draft.id)}
                />
              </label>
            </div>
            <label className="block text-xs">
              {m.form.criteria}
              <Input.TextArea
                rows={4}
                value={draft.criteria}
                placeholder={m.form.criteriaPlaceholder}
                onChange={(event) =>
                  setDraft({ ...draft, criteria: event.target.value })
                }
              />
            </label>
            {view.penalty.rate && (
              <Checkbox
                checked={draft.penaltyApplies}
                onChange={(event) =>
                  setDraft({ ...draft, penaltyApplies: event.target.checked })
                }
              >
                {m.penaltyApplies}
              </Checkbox>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={achieving !== null}
        title={`${m.achieveForm.title}: ${achieving?.title ?? ""}`}
        onCancel={() => setAchieving(null)}
        okText={m.save}
        cancelText={m.close}
        confirmLoading={busy}
        onOk={() => void achieve()}
        destroyOnHidden
      >
        <div className="space-y-3">
          {error && <Alert type="error" showIcon title={error} />}
          <label className="block text-xs">
            {m.achieveForm.day}
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={achievedOn}
              disabledDate={(value) => value.isAfter(dayjs(), "day")}
              onChange={(value) => setAchievedOn(value)}
            />
          </label>
          <label className="block text-xs">
            {m.achieveForm.note}
            <Input.TextArea
              rows={3}
              maxLength={2000}
              value={note}
              placeholder={m.achieveForm.notePlaceholder}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <label className="block text-xs">
            {m.achieveForm.file}
            <input
              type="file"
              className="block text-sm"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </Modal>
    </Card>
  );
}
