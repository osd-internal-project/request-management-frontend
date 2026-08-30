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
import {
  fieldOrder,
  isMultilineField,
  isSensitiveField,
} from "@/lib/api/types";
import type {
  CodedLabel,
  FormSchemaProperty,
  OrgUnitNode,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** One editable row of the form schema, flattened for display. */
interface FieldRow {
  key: string;
  title: string;
  type: string;
  required: boolean;
  sensitive: boolean;
  multiline: boolean;
  /**
   * Everything this screen does not edit — `description`, `enum`, `minimum`,
   * `maximum`, `maxLength` — carried through a round trip so saving a type does
   * not quietly strip the parts of its schema the editor has no control for.
   */
  extra: FormSchemaProperty;
}

const FIELD_TYPES = ["string", "number", "boolean"];

/** The schema keys this editor owns; everything else survives a round trip. */
const OWNED_PROPERTY_KEYS = [
  "type",
  "title",
  "sensitive",
  "multiline",
  "x-sensitive",
  "x-multiline",
  "x-order",
] as const;

const EMPTY_FIELD: FieldRow = {
  key: "",
  title: "",
  type: "string",
  required: false,
  sensitive: false,
  multiline: false,
  extra: {},
};

/**
 * Rows in the order the submit screen will draw them.
 *
 * `formSchema` is a `jsonb` column and Postgres does not preserve key order, so
 * the order is carried as `x-order` data (see `fieldOrder`). Reading it here —
 * and writing it back in `toSchema` — is what keeps this screen and หน้าที่ 3
 * showing the same form.
 */
function toRows(type: RequestType): FieldRow[] {
  const properties = type.formSchema?.properties ?? {};
  const required = new Set(type.formSchema?.required ?? []);

  return Object.entries(properties)
    .sort(([, a], [, b]) => fieldOrder(a) - fieldOrder(b))
    .map(([key, property]) => {
      const extra: FormSchemaProperty = { ...property };
      for (const owned of OWNED_PROPERTY_KEYS) delete extra[owned];

      return {
        key,
        title: property.title ?? key,
        type: property.type ?? "string",
        required: required.has(key),
        sensitive: isSensitiveField(property),
        multiline: isMultilineField(property),
        extra,
      };
    });
}

/** The inverse — what the API stores. */
function toSchema(rows: FieldRow[]) {
  const properties: Record<string, FormSchemaProperty> = {};

  rows.forEach((row, index) => {
    properties[row.key] = {
      ...row.extra,
      type: row.type,
      title: row.title,
      // Position is data, not key order — see `toRows`.
      "x-order": index + 1,
      ...(row.sensitive ? { "x-sensitive": true } : {}),
      ...(row.multiline ? { "x-multiline": true } : {}),
    };
  });

  return {
    type: "object",
    required: rows.filter((row) => row.required).map((row) => row.key),
    properties,
  };
}

/** §16 describes a field by its shape: `ตัวเลข 0–100`, `ตัวเลข · ฟิลด์อ่อนไหว`. */
function describeField(row: FieldRow): string {
  const parts: string[] = [];

  if (row.multiline) parts.push(messages.requestTypes.fieldMultiline);
  else {
    const base = messages.requestTypes.fieldTypeLabels[row.type] ?? row.type;
    const { minimum, maximum } = row.extra;

    parts.push(
      minimum !== undefined && maximum !== undefined
        ? `${base} ${messages.requestTypes.fieldRange(minimum, maximum)}`
        : base,
    );
  }

  if (row.sensitive) parts.push(messages.requestTypes.fieldSensitive);

  return parts.join(" · ");
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
 *
 * §16 draws every list here — form fields, documents, return reasons — as one
 * compact line each, so the whole configuration of a type fits on one screen.
 * Editing therefore happens in a dialog rather than in a row of inputs: a row
 * wide enough to edit in is a row too wide to scan.
 */
export function RequestTypeAdmin({
  types: initial,
  orgUnits,
  companyName,
}: {
  readonly types: RequestType[];
  /** For the `ทีมผู้รับ` selector — same source A3 uses. */
  readonly orgUnits: OrgUnitNode[];
  /** §16 heads the list with the company these types belong to. */
  readonly companyName: string | null;
}) {
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
  const [businessHours, setBusinessHours] = useState(
    initial[0]?.slaBusinessHours ?? true,
  );
  const [receiver, setReceiver] = useState<string | null>(
    initial[0]?.receiverOrgUnitId ?? null,
  );
  const [docs, setDocs] = useState<CodedLabel[]>(initial[0]?.requiredDocs ?? []);
  const [reasons, setReasons] = useState<CodedLabel[]>(
    initial[0]?.returnReasonCodes ?? [],
  );
  const [amountField, setAmountField] = useState<string | null>(
    initial[0]?.approvalPolicy?.amount_field ?? null,
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
    setBusinessHours(type.slaBusinessHours ?? true);
    setReceiver(type.receiverOrgUnitId ?? null);
    setDocs(type.requiredDocs ?? []);
    setReasons(type.returnReasonCodes ?? []);
    setAmountField(type.approvalPolicy?.amount_field ?? null);
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
      sla_business_hours: businessHours,
      ...(receiver ? { receiver_org_unit_id: receiver } : {}),
      required_docs: docs,
      return_reason_codes: reasons,
      // `mode` is carried through rather than offered: §8.1 defines one chain
      // shape, and a second would be an Approval Engine change, not a screen.
      approval_policy: {
        mode: selected.approvalPolicy?.mode ?? "standard_chain",
        ...(amountField ? { amount_field: amountField } : {}),
      },
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" onClick={() => setCreating(true)}>
          {messages.requestTypes.newTypeTitle}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        <TypeList
          types={types}
          orgUnits={orgUnits}
          selectedCode={selectedCode}
          companyName={companyName}
          onSelect={select}
        />

        <Card
          title={
            selected
              ? messages.requestTypes.edit(selected.name, selected.code)
              : messages.requestTypes.selectFirst
          }
          extra={
            selected && (
              <Space>
                <Button danger onClick={() => void toggleActive()}>
                  {selected.active
                    ? messages.requestTypes.disable
                    : messages.requestTypes.enable}
                </Button>
                <Button
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
            <div className="space-y-4">
              {error && <Alert type="error" showIcon title={error} />}

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <Text strong>{messages.requestTypes.name}</Text>
                  <Input
                    className="mt-1"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>

                <label className="block">
                  <Text strong>{messages.requestTypes.receiver}</Text>
                  <Select
                    className="mt-1 w-full"
                    allowClear
                    value={receiver ?? undefined}
                    placeholder={messages.requestTypes.noReceiver}
                    onChange={(next?: string) => setReceiver(next ?? null)}
                    options={orgUnits.map((unit) => ({
                      value: unit.id,
                      label: unit.name,
                    }))}
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
                  <Checkbox
                    className="mt-1"
                    checked={businessHours}
                    onChange={(event) => setBusinessHours(event.target.checked)}
                  >
                    <Text type="secondary" className="text-xs">
                      {messages.requestTypes.businessHours}
                    </Text>
                  </Checkbox>
                </label>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <FormSchemaEditor rows={rows} onChange={setRows} />

                <div className="space-y-4">
                  <RequiredDocs entries={docs} onChange={setDocs} />
                  <ReturnReasons entries={reasons} onChange={setReasons} />
                  <ApprovalRoute
                    rows={rows}
                    amountField={amountField}
                    onChange={setAmountField}
                  />
                </div>
              </div>

              <Alert
                type="info"
                showIcon
                title={messages.requestTypes.effectNote}
              />
            </div>
          )}
        </Card>
      </div>

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

/** §16's left column: every type of the active company, status included. */
function TypeList({
  types,
  orgUnits,
  selectedCode,
  companyName,
  onSelect,
}: {
  readonly types: RequestType[];
  readonly orgUnits: OrgUnitNode[];
  readonly selectedCode: string | null;
  readonly companyName: string | null;
  readonly onSelect: (type: RequestType) => void;
}) {
  return (
    <Card
      title={
        companyName
          ? messages.requestTypes.listTitleFor(companyName)
          : messages.requestTypes.listTitle
      }
      styles={{ body: { padding: 0 } }}
    >
      {types.length ? (
        <ul className="m-0 list-none p-0">
          {types.map((type) => {
            const active = type.code === selectedCode;

            return (
              <li key={type.code} className="border-b border-black/5 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(type)}
                  className={`flex w-full cursor-pointer flex-col gap-1 border-l-[3px] px-4 py-3 text-left hover:bg-black/[0.03] ${
                    active
                      ? "border-l-[var(--app-primary)] bg-[var(--app-primary-pale)]"
                      : "border-l-transparent"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold">
                      {type.name}
                    </span>
                    <Tag
                      color={type.active ? "green" : "default"}
                      className="m-0!"
                    >
                      {type.active
                        ? messages.requestTypes.active
                        : messages.requestTypes.inactive}
                    </Tag>
                  </span>

                  <Text type="secondary" className="truncate text-xs">
                    {messages.requestTypes.listSubtitle(
                      type.code,
                      orgUnits.find((unit) => unit.id === type.receiverOrgUnitId)
                        ?.name ?? messages.requestTypes.noReceiver,
                      type.slaHours
                        ? messages.requestTypes.slaShort(
                            type.slaHours,
                            type.slaBusinessHours ?? true,
                          )
                        : messages.requestTypes.slaUnset,
                    )}
                  </Text>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-4">
          <Empty />
        </div>
      )}
    </Card>
  );
}

/** `ฟิลด์ฟอร์ม (form schema)` — one line per field, edited in a dialog. */
function FormSchemaEditor({
  rows,
  onChange,
}: {
  readonly rows: FieldRow[];
  readonly onChange: (next: FieldRow[]) => void;
}) {
  // -1 opens the dialog on a new field; null keeps it closed.
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div>
      <Text strong>{messages.requestTypes.fields}</Text>

      <ul className="mt-2 m-0 list-none space-y-2 p-0">
        {rows.map((row, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => setEditing(index)}
              className="flex w-full cursor-pointer items-center gap-3 rounded border border-black/5 px-3 py-2 text-left hover:bg-black/[0.03]"
            >
              <span className="w-36 shrink-0 truncate font-semibold">
                {row.title || row.key}
              </span>

              <Text type="secondary" className="min-w-0 truncate text-xs">
                {describeField(row)}
              </Text>

              <span className="flex-1" />

              {row.required && (
                <Tag color="red" className="m-0!">
                  {messages.requestTypes.fieldRequired}
                </Tag>
              )}
              {row.sensitive && (
                <Tag color="blue" className="m-0!">
                  {messages.requestTypes.fieldRestricted}
                </Tag>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Button type="link" className="mt-1 px-0!" onClick={() => setEditing(-1)}>
        {messages.requestTypes.addField}
      </Button>

      {/*
        Keyed by which row is open: the draft below is seeded at mount, and
        `destroyOnHidden` destroys the Modal body, not this component. Without
        the key, the second field opened would show the first one's values.
      */}
      <FieldDialog
        key={editing ?? "closed"}
        open={editing !== null}
        row={editing !== null && editing >= 0 ? rows[editing] : null}
        onClose={() => setEditing(null)}
        onSave={(row) => {
          onChange(
            editing !== null && editing >= 0
              ? rows.map((entry, index) => (index === editing ? row : entry))
              : [...rows, row],
          );
          setEditing(null);
        }}
        onRemove={
          editing !== null && editing >= 0
            ? () => {
                onChange(rows.filter((_, index) => index !== editing));
                setEditing(null);
              }
            : undefined
        }
      />
    </div>
  );
}

function FieldDialog({
  open,
  row,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  row: FieldRow | null;
  onClose: () => void;
  onSave: (row: FieldRow) => void;
  onRemove?: () => void;
}) {
  // Seeded at mount; the caller keys this component per opening so a new
  // selection arrives as a remount rather than as a stale draft.
  const [draft, setDraft] = useState<FieldRow>(row ?? EMPTY_FIELD);

  function set(patch: Partial<FieldRow>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={
        row
          ? messages.requestTypes.fieldEditTitle
          : messages.requestTypes.fieldAddTitle
      }
      onCancel={onClose}
      onOk={() => onSave(draft)}
      okButtonProps={{ disabled: !draft.key.trim() }}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div className="flex items-center">
          {onRemove && (
            <Button type="link" danger onClick={onRemove}>
              {messages.requestTypes.remove}
            </Button>
          )}
          <span className="flex-1" />
          <Space>
            <CancelBtn />
            <OkBtn />
          </Space>
        </div>
      )}
    >
      <Space orientation="vertical" size="middle" className="flex">
        <label className="block">
          <Text strong>{messages.requestTypes.fieldName}</Text>
          <Input
            className="mt-1"
            value={draft.key}
            onChange={(event) => set({ key: event.target.value })}
          />
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.fieldTitle}</Text>
          <Input
            className="mt-1"
            value={draft.title}
            onChange={(event) => set({ title: event.target.value })}
          />
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.fieldType}</Text>
          <Select
            className="mt-1 w-full"
            value={draft.type}
            onChange={(next: string) => set({ type: next })}
            options={FIELD_TYPES.map((value) => ({ value, label: value }))}
          />
        </label>

        <Space wrap>
          <Checkbox
            checked={draft.required}
            onChange={(event) => set({ required: event.target.checked })}
          >
            {messages.requestTypes.fieldRequired}
          </Checkbox>
          <Checkbox
            checked={draft.sensitive}
            onChange={(event) => set({ sensitive: event.target.checked })}
          >
            {messages.requestTypes.fieldSensitive}
          </Checkbox>
          <Checkbox
            checked={draft.multiline}
            onChange={(event) => set({ multiline: event.target.checked })}
          >
            {messages.requestTypes.fieldMultiline}
          </Checkbox>
        </Space>
      </Space>
    </Modal>
  );
}

/** `เอกสารบังคับ` — one line each, as §16 draws them. */
function RequiredDocs({
  entries,
  onChange,
}: {
  readonly entries: CodedLabel[];
  readonly onChange: (next: CodedLabel[]) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div>
      <Text strong>{messages.requestTypes.docs}</Text>

      <ul className="mt-2 m-0 list-none p-0">
        {entries.map((entry, index) => (
          <li
            key={index}
            className="flex items-center gap-2 border-b border-black/5 py-1.5"
          >
            <button
              type="button"
              onClick={() => setEditing(index)}
              className="min-w-0 cursor-pointer truncate text-left font-semibold hover:underline"
            >
              {entry.name || entry.code}
            </button>
            <span className="flex-1" />
            <Button
              size="small"
              type="link"
              danger
              onClick={() =>
                onChange(entries.filter((_, i) => i !== index))
              }
            >
              {messages.requestTypes.remove}
            </Button>
          </li>
        ))}
      </ul>

      <Button type="link" className="mt-1 px-0!" onClick={() => setEditing(-1)}>
        {messages.requestTypes.addDoc}
      </Button>

      <CodedLabelDialog
        key={editing ?? "closed"}
        open={editing !== null}
        entry={editing !== null && editing >= 0 ? entries[editing] : null}
        onClose={() => setEditing(null)}
        onSave={(entry) => {
          onChange(
            editing !== null && editing >= 0
              ? entries.map((row, index) => (index === editing ? entry : row))
              : [...entries, entry],
          );
          setEditing(null);
        }}
      />
    </div>
  );
}

/** `เหตุผลตีกลับมาตรฐาน` — §16 draws these as pills, not as rows. */
function ReturnReasons({
  entries,
  onChange,
}: {
  readonly entries: CodedLabel[];
  readonly onChange: (next: CodedLabel[]) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div>
      <Text strong>{messages.requestTypes.reasons}</Text>
      <Paragraph type="secondary" className="mt-1! mb-2! text-xs">
        {messages.requestTypes.reasonsNote}
      </Paragraph>

      <div className="flex flex-wrap items-center gap-2">
        {entries.map((entry, index) => (
          <Tag
            key={index}
            closable
            className="m-0! cursor-pointer"
            onClick={() => setEditing(index)}
            onClose={(event) => {
              event.preventDefault();
              // The × is inside the pill, so its click would otherwise reach
              // the pill's own onClick and open the entry just removed.
              event.stopPropagation();
              onChange(entries.filter((_, i) => i !== index));
            }}
          >
            {entry.name || entry.code}
          </Tag>
        ))}

        <Tag
          className="m-0! cursor-pointer border-dashed"
          onClick={() => setEditing(-1)}
        >
          {messages.requestTypes.addReason}
        </Tag>
      </div>

      <CodedLabelDialog
        key={editing ?? "closed"}
        open={editing !== null}
        entry={editing !== null && editing >= 0 ? entries[editing] : null}
        onClose={() => setEditing(null)}
        onSave={(entry) => {
          onChange(
            editing !== null && editing >= 0
              ? entries.map((row, index) => (index === editing ? entry : row))
              : [...entries, entry],
          );
          setEditing(null);
        }}
      />
    </div>
  );
}

/**
 * `เอกสารบังคับ` and `เหตุผลตีกลับมาตรฐาน` are the same shape and the same
 * rules, so they share an editor.
 *
 * The code is what the system stores and reports on; the label is what a person
 * reads. Both matter — REQ-03 blocks a submit by code, REQ-04 counts bounces by
 * code — which is why the code stays visible and editable rather than being
 * generated from the label.
 */
function CodedLabelDialog({
  open,
  entry,
  onClose,
  onSave,
}: {
  open: boolean;
  entry: CodedLabel | null;
  onClose: () => void;
  onSave: (entry: CodedLabel) => void;
}) {
  const [draft, setDraft] = useState<CodedLabel>(entry ?? { code: "", name: "" });

  return (
    <Modal
      open={open}
      destroyOnHidden
      title={
        entry
          ? messages.requestTypes.entryEditTitle
          : messages.requestTypes.entryAddTitle
      }
      onCancel={onClose}
      onOk={() => onSave(draft)}
      okButtonProps={{ disabled: !draft.code.trim() || !draft.name.trim() }}
    >
      <Space orientation="vertical" className="flex">
        <label className="block">
          <Text strong>{messages.requestTypes.entryCode}</Text>
          <Input
            className="mt-1"
            value={draft.code}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))
            }
          />
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.entryLabel}</Text>
          <Input
            className="mt-1"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
      </Space>
    </Modal>
  );
}

/** `เส้นทางอนุมัติ` — the chain is §8.1's; only the amount field is a choice. */
function ApprovalRoute({
  rows,
  amountField,
  onChange,
}: {
  readonly rows: FieldRow[];
  readonly amountField: string | null;
  readonly onChange: (next: string | null) => void;
}) {
  return (
    <div>
      <Text strong>{messages.requestTypes.routeTitle}</Text>

      <div className="mt-2 rounded border border-black/10 bg-black/[0.02] p-3">
        <Text strong className="text-xs">
          {messages.requestTypes.routeStandard}
        </Text>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Text type="secondary" className="text-xs">
            {messages.requestTypes.amountField}
          </Text>
          <Select
            size="small"
            allowClear
            style={{ minWidth: 200 }}
            value={amountField ?? undefined}
            placeholder={messages.requestTypes.amountField}
            onChange={(next?: string) => onChange(next ?? null)}
            options={rows.map((row) => ({
              value: row.key,
              label: `${row.title || row.key} (${row.key})`,
            }))}
          />
        </div>

        <Paragraph type="secondary" className="mt-2! mb-0! text-xs">
          {messages.requestTypes.matrixNote}
        </Paragraph>
      </div>

      {/*
        APV-02 measures this field against the matrix ceilings. Without it a
        submit cannot pick a tier, so the type is unroutable — said here rather
        than discovered at the first submit.
      */}
      {!amountField && (
        <Alert
          type="warning"
          showIcon
          className="mt-2"
          message={messages.requestTypes.amountFieldMissing}
        />
      )}
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
