"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Input, Select, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ContractClause,
  ContractDraftView,
  DraftComparison,
} from "@/lib/api/contracts";
import { ContractDraftCompare } from "@/components/legal/contract-draft-compare";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.drafts;
const mr = messages.contracts.review;

const VARIABLE = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

/** The `{{variables}}` still standing in the text — what Legal must write in. */
function unfilled(clauses: readonly ContractClause[]): string[] {
  const names = new Set<string>();
  for (const clause of clauses) {
    for (const match of `${clause.heading}\n${clause.body}`.matchAll(
      VARIABLE,
    )) {
      names.add(match[1]);
    }
  }
  return [...names];
}

/**
 * CD-146 — one version of a contract draft. Each clause is marked against
 * the template as it was filled (edited / added), with the template's text
 * a click away; clauses taken out are listed at the end. Legal edits from
 * the latest version and saves the whole text as the next one — earlier
 * versions never change.
 */
export function ContractDraftEditor({
  view,
  canManage,
  comparison,
}: {
  readonly view: ContractDraftView;
  readonly canManage: boolean;
  /** CD-147 — this version against another, when asked for. */
  readonly comparison?: DraftComparison | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<ContractClause[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const isLatest = view.version.versionNo === view.latestVersionNo;
  const missing = unfilled(view.clauses);

  function patch(index: number, change: Partial<ContractClause>) {
    setEditing((current) =>
      (current ?? []).map((clause, at) =>
        at === index ? { ...clause, ...change } : clause,
      ),
    );
  }

  function move(index: number, by: -1 | 1) {
    setEditing((current) => {
      const rows = [...(current ?? [])];
      const target = index + by;
      if (target < 0 || target >= rows.length) return rows;
      [rows[index], rows[target]] = [rows[target], rows[index]];
      return rows;
    });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const result = await appApi<ContractDraftView>(
      `contract-drafts/${view.id}/versions`,
      {
        method: "POST",
        body: JSON.stringify({
          base_version: view.latestVersionNo,
          note,
          clauses: editing.map((clause) => ({
            // a clause added here has no key yet: the server gives it one
            key: clause.key || undefined,
            heading: clause.heading,
            body: clause.body,
          })),
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved(result.data.version.versionNo));
    setEditing(null);
    setNote("");
    router.push(ROUTES.contractDraft(view.id));
    router.refresh();
  }

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Title level={4} className="mb-1!">
          {m.title}
        </Title>
        <Text type="secondary" className="block text-sm">
          {m.request}{" "}
          <Link href={ROUTES.requestDetail(view.request.id)}>
            {view.request.requestNo ?? view.request.id.slice(0, 8)}
          </Link>{" "}
          · {m.fromTemplate(view.template.code, view.template.name)}
        </Text>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label={m.version}
          value={view.version.versionNo}
          disabled={editing !== null}
          onChange={(no: number) =>
            router.push(ROUTES.contractDraft(view.id, no))
          }
          options={Array.from({ length: view.latestVersionNo }, (_, i) => {
            const no = view.latestVersionNo - i;
            return { value: no, label: m.versionOf(no, view.latestVersionNo) };
          })}
        />
        {view.latestVersionNo > 1 && (
          <Select
            aria-label={mr.compareWith}
            placeholder={mr.compareWith}
            allowClear
            className="min-w-36"
            value={comparison?.from}
            disabled={editing !== null}
            onChange={(no?: number) =>
              router.push(
                ROUTES.contractDraft(view.id, view.version.versionNo, no),
              )
            }
            options={Array.from({ length: view.latestVersionNo }, (_, i) => i + 1)
              .filter((no) => no !== view.version.versionNo)
              .map((no) => ({
                value: no,
                label: `${mr.compareWith} ${no}`,
              }))}
          />
        )}
        {canManage && view.editable && editing === null && (
          <Button
            type="primary"
            onClick={() => {
              if (!isLatest) {
                router.push(ROUTES.contractDraft(view.id));
                return;
              }
              setError(null);
              setEditing(
                view.clauses.map(({ key, heading, body }) => ({
                  key,
                  heading,
                  body,
                })),
              );
            }}
          >
            {isLatest ? m.edit : m.editLatest}
          </Button>
        )}
      </div>
    </div>
  );

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        {error && <Alert type="error" showIcon title={error} />}
        {editing.map((clause, index) => (
          <Card key={clause.key || `new-${index}`} size="small">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Text strong>{index + 1}.</Text>
              <div className="flex gap-1">
                <Button
                  size="small"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  {m.moveUp}
                </Button>
                <Button
                  size="small"
                  disabled={index === editing.length - 1}
                  onClick={() => move(index, 1)}
                >
                  {m.moveDown}
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() =>
                    setEditing(editing.filter((_, at) => at !== index))
                  }
                >
                  {m.removeClause}
                </Button>
              </div>
            </div>
            <Input
              value={clause.heading}
              maxLength={255}
              aria-label={`${index + 1}`}
              onChange={(event) =>
                patch(index, { heading: event.target.value })
              }
            />
            <Input.TextArea
              className="mt-2"
              autoSize={{ minRows: 3, maxRows: 20 }}
              maxLength={20000}
              value={clause.body}
              onChange={(event) => patch(index, { body: event.target.value })}
            />
          </Card>
        ))}
        <Button
          onClick={() =>
            setEditing([...editing, { key: "", heading: "", body: "" }])
          }
        >
          {m.addClause}
        </Button>
        <label className="text-xs">
          {m.note}
          <Input
            value={note}
            maxLength={1000}
            placeholder={m.notePlaceholder}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setEditing(null)}>{m.cancel}</Button>
          <Button type="primary" loading={busy} onClick={() => void save()}>
            {m.saveVersion}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {header}
      <Text type="secondary" className="text-xs">
        {m.savedBy(
          view.version.createdByName,
          dayjs(view.version.createdAt).format("D MMM YY HH:mm"),
        )}
        {view.version.note ? ` — ${view.version.note}` : ""}
      </Text>
      {!view.editable && <Alert type="info" showIcon title={m.readOnly} />}
      <Text className="text-sm">
        {m.counts(view.counts.edited, view.counts.added, view.counts.removed)}
      </Text>
      {missing.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={m.missing}
          description={missing.map((name) => `{{${name}}}`).join(", ")}
        />
      )}

      {comparison ? (
        <ContractDraftCompare comparison={comparison} />
      ) : (
      <Card size="small">
        <div className="divide-y">
          {view.clauses.map((clause, index) => (
            <div key={clause.key} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Text strong>
                  {index + 1}. {clause.heading}
                </Text>
                {clause.mark !== "template" && (
                  <Tag color={m.markColor[clause.mark]}>
                    {m.marks[clause.mark]}
                  </Tag>
                )}
                {clause.mark === "edited" && (
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      setOpened((current) => {
                        const next = new Set(current);
                        if (next.has(clause.key)) next.delete(clause.key);
                        else next.add(clause.key);
                        return next;
                      })
                    }
                  >
                    {m.showTemplate}
                  </Button>
                )}
              </div>
              <Text className="mt-1 block text-sm whitespace-pre-line">
                {clause.body}
              </Text>
              {opened.has(clause.key) && clause.templateBody !== null && (
                <div className="mt-2 rounded bg-black/[.04] p-2">
                  <Text type="secondary" className="text-xs whitespace-pre-line">
                    {clause.templateBody}
                  </Text>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      )}

      {view.removed.length > 0 && (
        <Card size="small" title={m.removedTitle}>
          {view.removed.map((clause) => (
            <div key={clause.key} className="py-1">
              <Text delete type="secondary">
                {clause.heading}
              </Text>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
