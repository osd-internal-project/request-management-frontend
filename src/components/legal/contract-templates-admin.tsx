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
  Select,
  Switch,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  ContractTemplate,
  TemplateVariables,
} from "@/lib/api/contracts";
import { messages } from "@/lib/messages";

const m = messages.contracts.templates;
const kinds = messages.contracts.kind as Record<string, string>;

interface Draft {
  id?: string;
  code: string;
  name: string;
  kind: ContractTemplate["kind"];
  active: boolean;
  clauses: { heading: string; body: string }[];
}

const blank: Draft = {
  code: "",
  name: "",
  kind: "standard",
  active: true,
  clauses: [{ heading: "", body: "" }],
};

/**
 * CD-146 — แม่แบบสัญญา: the company's templates as ordered clauses with
 * `{{variables}}`. The server checks every clause and variable on save.
 */
export function ContractTemplatesAdmin({
  templates,
  variables,
  canManage,
}: {
  readonly templates: ContractTemplate[];
  readonly variables: TemplateVariables | null;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchClause(index: number, change: { heading?: string; body?: string }) {
    setDraft((current) =>
      current
        ? {
            ...current,
            clauses: current.clauses.map((clause, at) =>
              at === index ? { ...clause, ...change } : clause,
            ),
          }
        : current,
    );
  }

  function move(index: number, by: -1 | 1) {
    setDraft((current) => {
      if (!current) return current;
      const rows = [...current.clauses];
      const target = index + by;
      if (target < 0 || target >= rows.length) return current;
      [rows[index], rows[target]] = [rows[target], rows[index]];
      return { ...current, clauses: rows };
    });
  }

  async function save() {
    if (!draft) return;
    if (!draft.id && (!draft.code.trim() || !draft.name.trim())) {
      setError(m.required);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi(
      draft.id ? `contract-templates/${draft.id}` : "contract-templates",
      {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(draft.id ? {} : { code: draft.code }),
          name: draft.name,
          kind: draft.kind,
          active: draft.active,
          clauses: draft.clauses,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setDraft(null);
    router.refresh();
  }

  async function copy(name: string) {
    try {
      await navigator.clipboard.writeText(`{{${name}}}`);
      message.success(m.copied);
    } catch {
      // clipboard refused (insecure context): the name is on screen anyway
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={4} className="mb-1!">
            {m.title}
          </Title>
          <Text type="secondary" className="text-sm">
            {m.subtitle}
          </Text>
        </div>
        {canManage && (
          <Button
            type="primary"
            onClick={() => {
              setError(null);
              setDraft({ ...blank, clauses: [{ heading: "", body: "" }] });
            }}
          >
            {m.add}
          </Button>
        )}
      </div>

      {templates.length ? (
        templates.map((template) => (
          <Card
            key={template.id}
            size="small"
            title={
              <span>
                {template.code} · {template.name}{" "}
                <Tag>{kinds[template.kind]}</Tag>
                {!template.active && <Tag>{m.inactive}</Tag>}
              </span>
            }
            extra={
              canManage ? (
                <Button
                  size="small"
                  onClick={() => {
                    setError(null);
                    setDraft({
                      id: template.id,
                      code: template.code,
                      name: template.name,
                      kind: template.kind,
                      active: template.active,
                      clauses: template.clauses.map(({ heading, body }) => ({
                        heading,
                        body,
                      })),
                    });
                  }}
                >
                  {m.edit}
                </Button>
              ) : null
            }
          >
            <Text type="secondary" className="text-xs">
              {m.clauses(template.clauses.length)} ·{" "}
              {template.clauses
                .slice(0, 5)
                .map((clause) => clause.heading)
                .join(" · ")}
              {template.clauses.length > 5 ? " · …" : ""}
            </Text>
          </Card>
        ))
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? `${m.edit} ${draft.code}` : m.add}
        width={900}
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <label className="text-xs">
                {m.code}
                <Input
                  value={draft.code}
                  disabled={Boolean(draft.id)}
                  maxLength={20}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      code: event.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <label className="text-xs sm:col-span-2">
                {m.name}
                <Input
                  value={draft.name}
                  maxLength={255}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              <label className="text-xs">
                {m.kind}
                <Select
                  className="w-full"
                  value={draft.kind}
                  onChange={(kind: Draft["kind"]) =>
                    setDraft({ ...draft, kind })
                  }
                  options={Object.entries(kinds).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
            </div>
            {draft.id && (
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  size="small"
                  checked={draft.active}
                  onChange={(active) => setDraft({ ...draft, active })}
                />
                {m.active}
              </label>
            )}

            {variables && (
              <div className="rounded bg-black/[.03] p-2">
                <Text className="block text-xs">{m.variables}</Text>
                <div className="mt-1 flex flex-wrap gap-1">
                  {variables.variables.map((variable) => (
                    <Tag
                      key={variable.name}
                      className="cursor-pointer"
                      title={variable.label}
                      onClick={() => void copy(variable.name)}
                    >
                      {`{{${variable.name}}}`} {variable.label}
                    </Tag>
                  ))}
                </div>
                <Text type="secondary" className="mt-1 block text-xs">
                  {m.termVariables(variables.termPattern)}
                </Text>
              </div>
            )}

            {draft.clauses.map((clause, index) => (
              <div key={index} className="rounded border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
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
                      disabled={index === draft.clauses.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      {m.moveDown}
                    </Button>
                    <Button
                      size="small"
                      danger
                      disabled={draft.clauses.length === 1}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          clauses: draft.clauses.filter((_, at) => at !== index),
                        })
                      }
                    >
                      {m.removeClause}
                    </Button>
                  </div>
                </div>
                <Input
                  value={clause.heading}
                  maxLength={255}
                  placeholder={m.clauseHeadingPlaceholder}
                  aria-label={m.clauseHeading}
                  onChange={(event) =>
                    patchClause(index, { heading: event.target.value })
                  }
                />
                <Input.TextArea
                  className="mt-2"
                  autoSize={{ minRows: 3, maxRows: 16 }}
                  maxLength={20000}
                  aria-label={m.clauseBody}
                  value={clause.body}
                  onChange={(event) =>
                    patchClause(index, { body: event.target.value })
                  }
                />
              </div>
            ))}
            <Button
              onClick={() =>
                setDraft({
                  ...draft,
                  clauses: [...draft.clauses, { heading: "", body: "" }],
                })
              }
            >
              {m.addClause}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
