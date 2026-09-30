"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Radio,
  Select,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ContractRiskView, RiskIssue } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.risk;

type Level = NonNullable<ContractRiskView["level"]>;

interface Draft {
  level: Level;
  summary: string;
  issues: RiskIssue[];
}

const blankIssue = (): RiskIssue => ({
  title: "",
  detail: null,
  clause: null,
  severity: "medium",
  escalate: false,
});

/**
 * CD-158 — ประเมินความเสี่ยงกฎหมาย: a level, the issues behind it, and
 * which of them go to the executives. High or critical, or any issue marked,
 * asks the executives (the server raises the request); the card then says
 * whether the contract may be signed as far as risk goes.
 */
export function ContractRiskCard({
  basePath,
  view,
  canManage,
}: {
  /** `contracts/<id>` — or, for a draft (CD-159), `contract-drafts/<id>`. */
  readonly basePath: string;
  readonly view: ContractRiskView;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opinion = view.opinion;

  function patchIssue(index: number, change: Partial<RiskIssue>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            issues: current.issues.map((issue, at) =>
              at === index ? { ...issue, ...change } : issue,
            ),
          }
        : current,
    );
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const result = await appApi(`${basePath}/risk`, {
      method: "PUT",
      body: JSON.stringify({
        level: draft.level,
        summary: draft.summary,
        issues: draft.issues.map((issue) => ({
          title: issue.title,
          detail: issue.detail,
          clause: issue.clause,
          severity: issue.severity,
          escalate: issue.escalate,
        })),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setDraft(null);
    router.refresh();
  }

  async function askAgain() {
    const result = await appApi(`${basePath}/risk/opinion`, {
      method: "POST",
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.asked);
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={
        <span>
          {m.title}
          {view.level && (
            <Tag color={m.levelColor[view.level]} className="ml-2!">
              {m.levels[view.level]}
            </Tag>
          )}
        </span>
      }
      extra={
        canManage ? (
          <Button
            size="small"
            onClick={() => {
              setError(null);
              setDraft({
                level: view.level ?? "low",
                summary: view.summary ?? "",
                issues: view.issues.map((issue) => ({ ...issue })),
              });
            }}
          >
            {view.assessed ? m.reassess : m.edit}
          </Button>
        ) : null
      }
    >
      {!view.assessed ? (
        <>
          <Text type="secondary" className="block">
            {m.empty}
          </Text>
          <Text type="secondary" className="mt-1 block text-xs">
            {m.hint}
          </Text>
        </>
      ) : (
        <div className="space-y-3">
          {view.signing.ready === true ? (
            <Alert type="success" showIcon title={m.signReady} />
          ) : (
            view.signing.reason && (
              <Alert type="warning" showIcon title={view.signing.reason} />
            )
          )}

          {view.summary && (
            <Text className="block text-sm whitespace-pre-line">
              {view.summary}
            </Text>
          )}

          <div>
            <Text strong className="block">
              {m.issues} · {view.issues.length}
            </Text>
            {view.issues.length ? (
              <div className="divide-y">
                {view.issues.map((issue, index) => (
                  <div key={index} className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{issue.title}</span>
                      {issue.clause && (
                        <Text type="secondary" className="text-xs">
                          {issue.clause}
                        </Text>
                      )}
                      <Tag color={m.levelColor[issue.severity]}>
                        {m.severities[issue.severity]}
                      </Tag>
                      {issue.escalate && <Tag color="purple">{m.escalate}</Tag>}
                    </div>
                    {issue.detail && (
                      <Text
                        type="secondary"
                        className="block text-xs whitespace-pre-line"
                      >
                        {issue.detail}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" className="text-sm">
                {m.noIssues}
              </Text>
            )}
          </div>

          <div>
            <Text strong className="block">
              {m.opinion}
            </Text>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Tag color={m.opinionColor[opinion.state]}>
                {m.opinionState[opinion.state]}
              </Tag>
              {opinion.request && (
                <Link href={ROUTES.requestDetail(opinion.request.id)}>
                  {opinion.request.requestNo ?? m.openDraft}
                </Link>
              )}
              {canManage &&
                (opinion.state === "missing" ||
                  opinion.state === "rejected") && (
                  <Button size="small" onClick={() => void askAgain()}>
                    {m.askAgain}
                  </Button>
                )}
            </div>
            {opinion.error && (
              <Text type="danger" className="block text-xs">
                {opinion.error}
              </Text>
            )}
          </div>

          {view.assessedAt && (
            <Text type="secondary" className="block text-xs">
              {m.assessedAt(dayjs(view.assessedAt).format("D MMM YY HH:mm"))}
            </Text>
          )}
        </div>
      )}

      <Modal
        open={draft !== null}
        title={m.title}
        width={760}
        onCancel={() => setDraft(null)}
        onOk={() => void save()}
        okText={m.save}
        cancelText={m.cancel}
        confirmLoading={busy}
        destroyOnHidden
      >
        {draft && (
          <div className="flex flex-col gap-3">
            {error && <Alert type="error" showIcon title={error} />}
            <Text type="secondary" className="text-xs">
              {m.hint}
            </Text>
            <div>
              <Text className="mb-1 block text-xs">{m.level}</Text>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={draft.level}
                onChange={(event) =>
                  setDraft({ ...draft, level: event.target.value as Level })
                }
                options={Object.entries(m.levels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
            <label className="text-xs">
              {m.summary}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={draft.summary}
                onChange={(event) =>
                  setDraft({ ...draft, summary: event.target.value })
                }
              />
            </label>

            <Text strong>{m.issues}</Text>
            {draft.issues.map((issue, index) => (
              <div key={index} className="rounded border p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                  <label className="text-xs sm:col-span-3">
                    {m.issueTitle}
                    <Input
                      value={issue.title}
                      maxLength={255}
                      placeholder={m.issueTitlePlaceholder}
                      aria-label={m.issueTitle}
                      onChange={(event) =>
                        patchIssue(index, { title: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs sm:col-span-1">
                    {m.issueClause}
                    <Input
                      value={issue.clause ?? ""}
                      maxLength={100}
                      onChange={(event) =>
                        patchIssue(index, { clause: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    {m.issueSeverity}
                    <Select
                      className="w-full"
                      aria-label={m.issueSeverity}
                      value={issue.severity}
                      options={Object.entries(m.severities).map(
                        ([value, label]) => ({ value, label }),
                      )}
                      onChange={(severity: RiskIssue["severity"]) =>
                        patchIssue(index, { severity })
                      }
                    />
                  </label>
                  <label className="text-xs sm:col-span-6">
                    {m.issueDetail}
                    <Input.TextArea
                      rows={2}
                      maxLength={2000}
                      value={issue.detail ?? ""}
                      onChange={(event) =>
                        patchIssue(index, { detail: event.target.value })
                      }
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Checkbox
                    checked={issue.escalate}
                    onChange={(event) =>
                      patchIssue(index, { escalate: event.target.checked })
                    }
                  >
                    {m.escalate}
                  </Checkbox>
                  <Button
                    size="small"
                    danger
                    onClick={() =>
                      setDraft({
                        ...draft,
                        issues: draft.issues.filter((_, at) => at !== index),
                      })
                    }
                  >
                    {m.removeIssue}
                  </Button>
                </div>
              </div>
            ))}
            <Button
              onClick={() =>
                setDraft({ ...draft, issues: [...draft.issues, blankIssue()] })
              }
            >
              {m.addIssue}
            </Button>
          </div>
        )}
      </Modal>
    </Card>
  );
}
