"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type { ProjectUatView, UatFindingView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.uat;
const show = (value: string) => dayjs(value).format("D MMM YY");

interface Draft {
  id?: string;
  label?: string;
  title: string;
  description: string;
  severity: UatFindingView["severity"];
  testItemId: string | null;
  reportedBy: string;
  reportedOn: Dayjs | null;
  ownerUserId: string | null;
}

interface Move {
  finding: UatFindingView;
  action: "fix" | "confirm" | "reopen" | "defer" | "undefer";
  note: string;
  confirmedBy: string;
  confirmedOn: Dayjs | null;
}

/** Which moves a finding offers, by its status. */
const MOVES: Record<UatFindingView["status"], Move["action"][]> = {
  open: ["fix", "defer"],
  fixed: ["confirm", "reopen", "defer"],
  confirmed: [],
  deferred: ["undefer"],
};

/**
 * CD-222 — what the customer found in their testing, how serious, and where
 * each fix stands; blockers hold acceptance until the customer confirms.
 */
export function ProjectUatCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectUatView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [move, setMove] = useState<Move | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/uat`;

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

  async function save() {
    if (!draft) return;
    const ok = await call(draft.id ? `${base}/${draft.id}` : base, {
      method: draft.id ? "PATCH" : "POST",
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        severity: draft.severity,
        test_item_id: draft.testItemId ?? "",
        reported_by: draft.reportedBy,
        reported_on: draft.reportedOn?.format("YYYY-MM-DD"),
        owner_user_id: draft.ownerUserId ?? "",
      }),
    });
    if (ok) setDraft(null);
  }

  async function saveMove() {
    if (!move) return;
    const ok = await call(`${base}/${move.finding.id}/${move.action}`, {
      method: "POST",
      body: JSON.stringify({
        note: move.note,
        confirmed_by: move.confirmedBy,
        confirmed_on: move.confirmedOn?.format("YYYY-MM-DD"),
      }),
    });
    if (ok) setMove(null);
  }

  return (
    <Card
      size="small"
      title={`${m.title} · ${view.total}`}
      extra={
        view.canWrite ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setError(null);
              setDraft({
                title: "",
                description: "",
                severity: "major",
                testItemId: null,
                reportedBy: "",
                reportedOn: dayjs(),
                ownerUserId: null,
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
      {view.total > 0 && (
        <Text className="mb-1 block text-xs">
          {m.counts(view.open, view.fixed, view.confirmed, view.deferred)}
        </Text>
      )}
      {view.blocking.length > 0 && (
        <Alert
          className="mb-2"
          type="error"
          showIcon
          title={m.blocking(view.blocking.join(", "))}
        />
      )}
      {error && !draft && !move && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      {view.findings.length ? (
        <div className="divide-y">
          {view.findings.map((finding) => (
            <div key={finding.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-medium">
                    {finding.label} · {finding.title}
                  </span>{" "}
                  <Tag color={m.severityColor[finding.severity]}>
                    {m.severity[finding.severity]}
                  </Tag>
                  <Tag color={m.statusColor[finding.status]}>
                    {m.status[finding.status]}
                  </Tag>
                  {finding.testItem && <Tag>{finding.testItem.label}</Tag>}
                </div>
                {view.canWrite && (
                  <Space size={0} wrap>
                    {MOVES[finding.status]
                      .filter(
                        (action) =>
                          view.canEdit ||
                          (action !== "defer" && action !== "undefer"),
                      )
                      .filter(
                        (action) =>
                          action !== "defer" || finding.severity !== "blocker",
                      )
                      .map((action) => (
                        <Button
                          key={action}
                          size="small"
                          type="link"
                          onClick={() => {
                            setError(null);
                            setMove({
                              finding,
                              action,
                              note: "",
                              confirmedBy: finding.reportedBy ?? "",
                              confirmedOn: dayjs(),
                            });
                          }}
                        >
                          {m.actions[action]}
                        </Button>
                      ))}
                    {finding.status === "open" && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          setError(null);
                          setDraft({
                            id: finding.id,
                            label: finding.label,
                            title: finding.title,
                            description: finding.description ?? "",
                            severity: finding.severity,
                            testItemId: finding.testItem?.id ?? null,
                            reportedBy: finding.reportedBy ?? "",
                            reportedOn: finding.reportedOn
                              ? dayjs(finding.reportedOn)
                              : null,
                            ownerUserId: finding.ownerUserId,
                          });
                        }}
                      >
                        {m.edit}
                      </Button>
                    )}
                  </Space>
                )}
              </div>
              <Text type="secondary" className="block text-xs">
                {finding.reportedOn &&
                  m.reported(finding.reportedBy, show(finding.reportedOn))}
                {finding.ownerName && ` · ${m.owner(finding.ownerName)}`}
              </Text>
              {finding.description && (
                <div className="text-xs whitespace-pre-line">
                  {finding.description}
                </div>
              )}
              {finding.reopenNote && finding.status === "open" && (
                <Text type="danger" className="block text-xs">
                  {m.reopened(finding.reopenNote)}
                </Text>
              )}
              {finding.fixNote && finding.status !== "open" && (
                <div className="text-xs">{m.fixed(finding.fixNote)}</div>
              )}
              {finding.confirmedByName && finding.confirmedOn && (
                <Text type="success" className="block text-xs">
                  {m.confirmedBy(
                    finding.confirmedByName,
                    show(finding.confirmedOn),
                  )}
                </Text>
              )}
              {finding.deferReason && (
                <Text type="secondary" className="block text-xs">
                  {m.deferredBecause(finding.deferReason)}
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
        title={draft?.label ? m.form.editTitle(draft.label) : m.form.addTitle}
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
              {m.form.title}
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
                maxLength={4000}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                {m.form.severity}
                <Select
                  className="w-full"
                  value={draft.severity}
                  onChange={(severity: Draft["severity"]) =>
                    setDraft({ ...draft, severity })
                  }
                  options={Object.entries(m.severity).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
              <label className="block text-xs">
                {m.form.test}
                <Select
                  className="w-full"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={draft.testItemId ?? undefined}
                  onChange={(value?: string) =>
                    setDraft({ ...draft, testItemId: value ?? null })
                  }
                  options={view.tests.map((row) => ({
                    value: row.id,
                    label: row.label,
                  }))}
                />
              </label>
              <label className="block text-xs">
                {m.form.reportedBy}
                <Input
                  value={draft.reportedBy}
                  maxLength={255}
                  onChange={(event) =>
                    setDraft({ ...draft, reportedBy: event.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                {m.form.reportedOn}
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.reportedOn}
                  disabledDate={(value) => value.isAfter(dayjs(), "day")}
                  onChange={(value) =>
                    setDraft({ ...draft, reportedOn: value })
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
                options={people.map((person) => ({
                  value: person.id,
                  label: person.name,
                }))}
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={move !== null}
        title={
          move ? `${move.finding.label} — ${m.actions[move.action]}` : undefined
        }
        onCancel={() => setMove(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={() => void saveMove()}
        destroyOnHidden
      >
        {move && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            {move.action === "confirm" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block text-xs">
                  {m.form.confirmedBy}
                  <Input
                    value={move.confirmedBy}
                    maxLength={255}
                    onChange={(event) =>
                      setMove({ ...move, confirmedBy: event.target.value })
                    }
                  />
                </label>
                <label className="block text-xs">
                  {m.form.confirmedOn}
                  <DatePicker
                    className="w-full"
                    format="DD/MM/YYYY"
                    value={move.confirmedOn}
                    disabledDate={(value) => value.isAfter(dayjs(), "day")}
                    onChange={(value) =>
                      setMove({ ...move, confirmedOn: value })
                    }
                  />
                </label>
              </div>
            ) : (
              m.form.note[move.action] && (
                <label className="block text-xs">
                  {m.form.note[move.action]}
                  <Input.TextArea
                    rows={3}
                    maxLength={4000}
                    value={move.note}
                    onChange={(event) =>
                      setMove({ ...move, note: event.target.value })
                    }
                  />
                </label>
              )
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
