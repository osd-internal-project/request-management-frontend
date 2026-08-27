"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import {
  createRequestType,
  updateRequestType,
} from "@/lib/api/client-requests";
import type { FormSchemaProperty, RequestType } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** One editable row of the form schema, flattened for the table. */
interface FieldRow {
  key: string;
  title: string;
  type: string;
  required: boolean;
  sensitive: boolean;
}

const FIELD_TYPES = ["string", "number", "boolean"];

function toRows(type: RequestType): FieldRow[] {
  const properties = type.formSchema?.properties ?? {};
  const required = new Set(type.formSchema?.required ?? []);

  return Object.entries(properties).map(([key, property]) => ({
    key,
    title: property.title ?? key,
    type: property.type ?? "string",
    required: required.has(key),
    sensitive: Boolean(property.sensitive),
  }));
}

/** The inverse — what the API stores. */
function toSchema(rows: FieldRow[]) {
  const properties: Record<string, FormSchemaProperty> = {};

  for (const row of rows) {
    properties[row.key] = {
      type: row.type,
      title: row.title,
      ...(row.sensitive ? { sensitive: true } : {}),
    };
  }

  return {
    type: "object",
    required: rows.filter((row) => row.required).map((row) => row.key),
    properties,
  };
}

/**
 * Screen §16 A2 — ประเภทคำขอ.
 *
 * The whole screen exists to keep REQ-01's promise: the 3rd..30th request type
 * is added here, not in a migration. Everything a type needs — its form, its
 * required documents, its SLA — is data this page edits.
 *
 * Saving affects **new requests only**. Work already in the ladder keeps the
 * snapshot it was raised under (§7), which is why there is no "apply to
 * existing" control anywhere on this screen.
 */
export function RequestTypeAdmin({ types: initial }: { types: RequestType[] }) {
  const [types, setTypes] = useState(initial);
  const [selectedCode, setSelectedCode] = useState<string | null>(
    initial[0]?.code ?? null,
  );
  const [rows, setRows] = useState<FieldRow[]>(
    initial[0] ? toRows(initial[0]) : [],
  );
  const [name, setName] = useState(initial[0]?.name ?? "");
  const [slaHours, setSlaHours] = useState<number | null>(
    initial[0]?.slaHours ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = types.find((type) => type.code === selectedCode) ?? null;

  function select(type: RequestType) {
    setSelectedCode(type.code);
    setRows(toRows(type));
    setName(type.name);
    setSlaHours(type.slaHours ?? null);
    setError(null);
  }

  async function save() {
    if (!selected) return;

    setBusy(true);
    setError(null);

    const result = await updateRequestType(selected.code, {
      name,
      form_schema: toSchema(rows),
      ...(slaHours === null ? {} : { sla_hours: slaHours }),
    });

    if (result.ok) {
      setTypes((current) =>
        current.map((type) =>
          type.code === selected.code ? { ...type, ...result.data } : type,
        ),
      );
      void message.success(messages.requestTypes.saved);
    } else setError(result.message);

    setBusy(false);
  }

  async function toggleActive() {
    if (!selected) return;

    setBusy(true);
    const result = await updateRequestType(selected.code, {
      active: !selected.active,
    });

    if (result.ok) {
      setTypes((current) =>
        current.map((type) =>
          type.code === selected.code
            ? { ...type, active: !type.active }
            : type,
        ),
      );
    } else setError(result.message);

    setBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card
        title={messages.requestTypes.listTitle}
        extra={
          <Button size="small" onClick={() => setCreating(true)}>
            {messages.requestTypes.newType}
          </Button>
        }
      >
        {types.length ? (
          <ul className="divide-y divide-black/5">
            {types.map((type) => (
              <li key={type.code}>
                <button
                  type="button"
                  onClick={() => select(type)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-2 text-left hover:bg-black/5 ${
                    type.code === selectedCode ? "bg-black/5 font-medium" : ""
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {type.name}{" "}
                    <Text type="secondary" className="text-xs">
                      {type.code}
                    </Text>
                  </span>
                  <Tag color={type.active ? "green" : "default"}>
                    {type.active
                      ? messages.requestTypes.active
                      : messages.requestTypes.inactive}
                  </Tag>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}

        <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
          {messages.requestTypes.matrixNote}
        </Paragraph>
      </Card>

      <Card
        title={
          selected
            ? messages.requestTypes.edit(selected.name, selected.code)
            : messages.requestTypes.selectFirst
        }
        extra={
          selected && (
            <Space>
              <Button size="small" onClick={() => void toggleActive()}>
                {selected.active
                  ? messages.requestTypes.disable
                  : messages.requestTypes.enable}
              </Button>
              <Button
                size="small"
                type="primary"
                loading={busy}
                onClick={() => void save()}
              >
                {messages.requestTypes.save}
              </Button>
            </Space>
          )
        }
      >
        {!selected ? (
          <Empty description={messages.requestTypes.selectFirst} />
        ) : (
          <Space orientation="vertical" size="middle" className="flex">
            {error && <Alert type="error" showIcon title={error} />}

            <label className="block">
              <Text strong>{messages.requestTypes.name}</Text>
              <Input
                className="mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label className="block">
              <Text strong>{messages.requestTypes.sla}</Text>
              <InputNumber
                className="mt-1 w-full"
                min={1}
                value={slaHours ?? undefined}
                onChange={(next) => setSlaHours(next ?? null)}
              />
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Text strong>{messages.requestTypes.fields}</Text>
                <Button
                  size="small"
                  onClick={() =>
                    setRows((current) => [
                      ...current,
                      {
                        key: `field_${current.length + 1}`,
                        title: "",
                        type: "string",
                        required: false,
                        sensitive: false,
                      },
                    ])
                  }
                >
                  {messages.requestTypes.addField}
                </Button>
              </div>

              <ul className="space-y-2">
                {rows.map((row, index) => (
                  <li
                    key={index}
                    className="flex flex-wrap items-center gap-2 rounded border border-black/5 p-2"
                  >
                    <Input
                      size="small"
                      style={{ width: 150 }}
                      value={row.key}
                      placeholder={messages.requestTypes.fieldName}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((entry, i) =>
                            i === index
                              ? { ...entry, key: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                    <Input
                      size="small"
                      style={{ width: 170 }}
                      value={row.title}
                      placeholder={messages.requestTypes.fieldTitle}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((entry, i) =>
                            i === index
                              ? { ...entry, title: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                    <Select
                      size="small"
                      style={{ width: 110 }}
                      value={row.type}
                      onChange={(next) =>
                        setRows((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, type: next } : entry,
                          ),
                        )
                      }
                      options={FIELD_TYPES.map((value) => ({
                        value,
                        label: value,
                      }))}
                    />
                    <Checkbox
                      checked={row.required}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((entry, i) =>
                            i === index
                              ? { ...entry, required: event.target.checked }
                              : entry,
                          ),
                        )
                      }
                    >
                      {messages.requestTypes.fieldRequired}
                    </Checkbox>
                    <Checkbox
                      checked={row.sensitive}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((entry, i) =>
                            i === index
                              ? { ...entry, sensitive: event.target.checked }
                              : entry,
                          ),
                        )
                      }
                    >
                      {messages.requestTypes.fieldSensitive}
                    </Checkbox>
                    <Button
                      size="small"
                      type="link"
                      danger
                      onClick={() =>
                        setRows((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      {messages.requestForm.remove}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Text strong>{messages.requestTypes.docs}</Text>
              <div className="mt-1">
                {(selected.requiredDocs ?? []).map((doc) => (
                  <Tag key={doc.code}>
                    {doc.name} ({doc.code})
                  </Tag>
                ))}
              </div>
            </div>

            <Alert
              type="info"
              showIcon
              title={messages.requestTypes.effectNote}
            />
          </Space>
        )}
      </Card>

      <NewTypeDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(type) => {
          setTypes((current) => [...current, type]);
          setCreating(false);
          select(type);
        }}
      />
    </div>
  );
}

/**
 * A new type starts **inactive** — the API's default.
 *
 * Offering it on the submit screen before its form and documents are settled
 * would produce requests nobody can route, so the admin turns it on once the
 * rest of this screen is filled in.
 */
function NewTypeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (type: RequestType) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await createRequestType({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      // One placeholder field so the schema is usable from the start; the
      // API rejects a schema with no properties at all.
      form_schema: {
        type: "object",
        required: ["reason"],
        properties: { reason: { type: "string", title: "เหตุผล" } },
      },
    });

    setBusy(false);

    if (result.ok) {
      setCode("");
      setName("");
      onCreated(result.data);
    } else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={messages.requestTypes.newTypeTitle}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={busy}
      okButtonProps={{ disabled: !code.trim() || !name.trim() }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}

      <Space orientation="vertical" className="flex">
        <label className="block">
          <Text strong>{messages.requestTypes.code}</Text>
          <Input
            className="mt-1"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="NDA"
          />
          <Text type="secondary" className="text-xs">
            {messages.requestTypes.codeHint}
          </Text>
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.name}</Text>
          <Input
            className="mt-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ขอจัดทำ NDA"
          />
        </label>
      </Space>
    </Modal>
  );
}
