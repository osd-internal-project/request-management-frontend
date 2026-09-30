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
  Switch,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { EsignLayout, EsignLayoutField } from "@/lib/api/esign";
import { messages } from "@/lib/messages";

const m = messages.esign.layouts;

interface FieldDraft {
  label: string;
  page: "first" | "last" | "appendix" | "number";
  pageNumber: number;
  position: EsignLayoutField["position"];
  order: number;
}

interface Draft {
  id?: string;
  code: string;
  name: string;
  docType: EsignLayout["docType"];
  active: boolean;
  fields: FieldDraft[];
}

const blankField = (order: number): FieldDraft => ({
  label: "",
  page: "last",
  pageNumber: 1,
  position: order % 2 ? "bottom-left" : "bottom-right",
  order,
});

const pageLabel = (page: EsignLayoutField["page"]) =>
  typeof page === "number" ? `${m.pageNumber} ${page}` : m.pages[page];

/**
 * CD-165 กำหนดช่องลงนาม — per kind of document: the parties, where each
 * signs (a page and a preset corner, or the signature page appended at the
 * end), and in what order.
 */
export function EsignLayoutsAdmin({
  layouts,
}: {
  readonly layouts: EsignLayout[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(index: number, change: Partial<FieldDraft>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            fields: current.fields.map((field, at) =>
              at === index ? { ...field, ...change } : field,
            ),
          }
        : current,
    );
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
      draft.id ? `esign/layouts/${draft.id}` : "esign/layouts",
      {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(draft.id ? {} : { code: draft.code }),
          name: draft.name,
          doc_type: draft.docType,
          active: draft.active,
          fields: draft.fields.map((field) => ({
            label: field.label,
            page: field.page === "number" ? String(field.pageNumber) : field.page,
            position: field.position,
            order: field.order,
          })),
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
        <Button
          type="primary"
          onClick={() => {
            setError(null);
            setDraft({
              code: "",
              name: "",
              docType: "contract",
              active: true,
              fields: [blankField(1), blankField(2)],
            });
          }}
        >
          {m.add}
        </Button>
      </div>

      {layouts.length ? (
        layouts.map((layout) => (
          <Card
            key={layout.id}
            size="small"
            title={
              <span>
                {layout.code} · {layout.name}{" "}
                <Tag>{m.docTypes[layout.docType]}</Tag>
                {!layout.active && <Tag>{m.inactive}</Tag>}
              </span>
            }
            extra={
              <Button
                size="small"
                onClick={() => {
                  setError(null);
                  setDraft({
                    id: layout.id,
                    code: layout.code,
                    name: layout.name,
                    docType: layout.docType,
                    active: layout.active,
                    fields: layout.fields.map((field) => ({
                      label: field.label,
                      page: typeof field.page === "number" ? "number" : field.page,
                      pageNumber: typeof field.page === "number" ? field.page : 1,
                      position: field.position,
                      order: field.order,
                    })),
                  });
                }}
              >
                {m.edit}
              </Button>
            }
          >
            {layout.fields.map((field) => (
              <div key={field.key} className="text-sm">
                <span className="font-medium">{field.label}</span>{" "}
                <Text type="secondary" className="text-xs">
                  {m.describe(
                    pageLabel(field.page),
                    m.positions[field.position],
                    field.order,
                  )}
                </Text>
              </div>
            ))}
          </Card>
        ))
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? `${m.edit} ${draft.code}` : m.add}
        width={820}
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
                    setDraft({ ...draft, code: event.target.value.toUpperCase() })
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
                {m.docType}
                <Select
                  className="w-full"
                  value={draft.docType}
                  onChange={(docType: Draft["docType"]) =>
                    setDraft({ ...draft, docType })
                  }
                  options={Object.entries(m.docTypes).map(([value, label]) => ({
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

            <Text strong>{m.fields}</Text>
            {draft.fields.map((field, index) => (
              <div
                key={index}
                className="grid grid-cols-1 items-end gap-2 rounded border p-2 sm:grid-cols-12"
              >
                <label className="text-xs sm:col-span-3">
                  {m.fieldLabel}
                  <Input
                    value={field.label}
                    maxLength={100}
                    placeholder={m.fieldLabelPlaceholder}
                    onChange={(event) =>
                      patch(index, { label: event.target.value })
                    }
                  />
                </label>
                <label className="text-xs sm:col-span-3">
                  {m.page}
                  <Select
                    className="w-full"
                    value={field.page}
                    onChange={(page: FieldDraft["page"]) => patch(index, { page })}
                    options={Object.entries(m.pages).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </label>
                {field.page === "number" && (
                  <label className="text-xs sm:col-span-1">
                    {m.pageNumber}
                    <InputNumber
                      className="w-full!"
                      min={1}
                      max={9999}
                      value={field.pageNumber}
                      onChange={(value) =>
                        patch(index, { pageNumber: Number(value ?? 1) })
                      }
                    />
                  </label>
                )}
                {field.page !== "appendix" && (
                  <label className="text-xs sm:col-span-2">
                    {m.position}
                    <Select
                      className="w-full"
                      value={field.position}
                      onChange={(position: FieldDraft["position"]) =>
                        patch(index, { position })
                      }
                      options={Object.entries(m.positions).map(
                        ([value, label]) => ({ value, label }),
                      )}
                    />
                  </label>
                )}
                <label className="text-xs sm:col-span-1">
                  {m.order}
                  <InputNumber
                    className="w-full!"
                    min={1}
                    max={20}
                    value={field.order}
                    onChange={(value) =>
                      patch(index, { order: Number(value ?? 1) })
                    }
                  />
                </label>
                <Button
                  danger
                  size="small"
                  className="sm:col-span-1"
                  disabled={draft.fields.length === 1}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      fields: draft.fields.filter((_, at) => at !== index),
                    })
                  }
                >
                  {m.removeField}
                </Button>
              </div>
            ))}
            <Button
              onClick={() =>
                setDraft({
                  ...draft,
                  fields: [...draft.fields, blankField(draft.fields.length + 1)],
                })
              }
            >
              {m.addField}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
