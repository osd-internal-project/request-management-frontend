"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { useRouter } from "next/navigation";
import {
  addAttachment,
  createDraft,
  previewChain,
  removeAttachment,
  saveDraft,
  submitRequest,
} from "@/lib/api/client-requests";
import type {
  ChainPreview,
  FormSchemaProperty,
  RequestAttachment,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

/** Thai-grouped money, matching the mockup's `800,000`. */
function money(value: string | null): string {
  if (value === null) return "—";
  return Number(value).toLocaleString("th-TH");
}

function fileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

/**
 * Screen §16 หน้าที่ 3 — ยื่นคำขอ.
 *
 * The form is rendered from the type's `formSchema`, never from hard-coded
 * fields: REQ-01 requires the 3rd..30th request type to be addable from screen
 * A2 without a deploy, and a component that named `deal_value` itself would
 * quietly break that promise.
 *
 * The right-hand panel asks the server which approvers this amount would
 * reach. That call is the same code path the real submit routes through
 * (`planChain`), so what the user is shown before pressing the button is what
 * actually happens when they do.
 */
export function RequestForm({ types }: { types: RequestType[] }) {
  const router = useRouter();

  const [typeCode, setTypeCode] = useState<string | undefined>(
    types.length === 1 ? types[0].code : undefined,
  );
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [refId, setRefId] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [preview, setPreview] = useState<ChainPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = types.find((candidate) => candidate.code === typeCode) ?? null;
  const schema = type?.formSchema;
  const required = schema?.required ?? [];

  /**
   * Which field carries the money.
   *
   * Read from the schema rather than assumed: a type authored in A2 may call
   * it anything, and the approval ladder is selected from whichever numeric
   * field the type marks as its amount.
   */
  const amountEntries = Object.entries(schema?.properties ?? {});
  const amountField =
    amountEntries.find(([name]) => name === "deal_value")?.[0] ??
    amountEntries.find(([, prop]) => prop.type === "number")?.[0] ??
    null;

  /** The draft row must exist before a document can hang off it. */
  async function ensureDraft(): Promise<string | null> {
    if (draftId) return draftId;
    if (!typeCode) {
      setError(messages.requestForm.typeRequired);
      return null;
    }

    const created = await createDraft({
      type_code: typeCode,
      form_data: values,
      ref_type: refId ? "deal" : undefined,
      ref_id: refId || undefined,
    });

    if (!created.ok) {
      setError(created.message);
      return null;
    }

    setDraftId(created.data.id);
    return created.data.id;
  }

  async function refreshPreview(nextValues: Record<string, unknown>) {
    if (!typeCode) return;

    const raw = amountField ? nextValues[amountField] : undefined;

    const result = await previewChain({
      subject_type: `request:${typeCode}`,
      // Sent as a string: money must not be rounded through a JS number on
      // the way to a ceiling comparison.
      ...(raw === undefined || raw === null || raw === ""
        ? {}
        : { amount: String(raw) }),
    });

    setPreview(result.ok ? result.data : null);
  }

  function setField(name: string, value: unknown) {
    const next = { ...values, [name]: value };
    setValues(next);
    if (name === amountField) void refreshPreview(next);
  }

  async function onSaveDraft() {
    setBusy(true);
    setError(null);

    const id = await ensureDraft();

    if (id) {
      const saved = await saveDraft(id, {
        form_data: values,
        ref_type: refId ? "deal" : null,
        ref_id: refId || null,
      });

      if (saved.ok) void message.success(messages.requestForm.saved);
      else setError(saved.message);
    }

    setBusy(false);
  }

  async function onAttach(file: File, docCode?: string) {
    setError(null);
    const id = await ensureDraft();
    if (!id) return;

    // Metadata only — the bytes are deliberately never read or uploaded.
    const added = await addAttachment(id, {
      doc_code: docCode,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });

    if (added.ok) setAttachments((current) => [...current, added.data]);
    else setError(added.message);
  }

  async function onRemoveAttachment(attachmentId: string) {
    if (!draftId) return;

    const removed = await removeAttachment(draftId, attachmentId);

    if (removed.ok) {
      setAttachments((current) =>
        current.filter((entry) => entry.id !== attachmentId),
      );
    } else setError(removed.message);
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);

    const id = await ensureDraft();

    if (id) {
      // Saved first: the draft row was created before the last keystrokes.
      await saveDraft(id, {
        form_data: values,
        ref_type: refId ? "deal" : null,
        ref_id: refId || null,
      });

      const sent = await submitRequest(id);

      if (sent.ok) {
        void message.success(messages.requestForm.submitted);
        router.push(ROUTES.requestDetail(id));
        return;
      }

      setError(sent.message);
    }

    setBusy(false);
  }

  const attachedCodes = new Set(
    attachments.map((entry) => entry.docCode).filter(Boolean),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Alert type="info" showIcon message={messages.requestForm.draftBanner} />

        {error && <Alert type="error" showIcon message={error} />}

        <Card>
          <Space direction="vertical" size="middle" className="flex">
            <label className="block">
              <Text strong>
                {messages.requestForm.type} <Text type="danger">*</Text>
              </Text>
              <Select
                className="mt-1 w-full"
                value={typeCode}
                onChange={(next) => {
                  // A new type means a new schema: keeping the old answers
                  // would submit fields the new form never showed.
                  setTypeCode(next);
                  setValues({});
                  setPreview(null);
                  setDraftId(null);
                  setAttachments([]);
                }}
                placeholder={messages.requestForm.type}
                options={types.map((entry) => ({
                  value: entry.code,
                  label: `${entry.name} (${entry.code})`,
                }))}
              />
            </label>

            <label className="block">
              <Text strong>{messages.requestForm.refLabel}</Text>
              <Input
                className="mt-1"
                value={refId}
                onChange={(event) => setRefId(event.target.value)}
                placeholder="D-501"
              />
            </label>

            {type ? (
              Object.entries(schema?.properties ?? {}).map(([name, prop]) => (
                <SchemaField
                  key={name}
                  name={name}
                  property={prop}
                  required={required.includes(name)}
                  value={values[name]}
                  onChange={(value) => setField(name, value)}
                />
              ))
            ) : (
              <Empty description={messages.requestForm.typeRequired} />
            )}
          </Space>
        </Card>

        {type && (
          <Card title={messages.requestForm.documents}>
            {(type.requiredDocs ?? []).map((doc) => (
              <div key={doc.code} className="mb-2 flex items-center gap-2">
                <Text>{doc.name}</Text>
                {attachedCodes.has(doc.code) ? (
                  <Tag color="green">✓</Tag>
                ) : (
                  <Tag color="orange">{messages.requestForm.missingDoc}</Tag>
                )}
                <label className="cursor-pointer text-xs text-blue-600">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void onAttach(file, doc.code);
                      event.target.value = "";
                    }}
                  />
                  {messages.requestForm.dropzone}
                </label>
              </div>
            ))}

            <ul className="mt-2 divide-y divide-black/5">
              {attachments.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    {entry.fileName}{" "}
                    <Text type="secondary">· {fileSize(entry.sizeBytes)}</Text>
                  </span>
                  <Button
                    size="small"
                    type="link"
                    danger
                    onClick={() => void onRemoveAttachment(entry.id)}
                  >
                    {messages.requestForm.remove}
                  </Button>
                </li>
              ))}
            </ul>

            <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
              {messages.requestForm.noStorageNote}
            </Paragraph>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={() => void onSaveDraft()} loading={busy}>
            {messages.requestForm.saveDraft}
          </Button>
          <Button
            type="primary"
            onClick={() => void onSubmit()}
            loading={busy}
            disabled={!typeCode}
          >
            {busy ? messages.requestForm.submitting : messages.requestForm.submit}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <ChainPanel preview={preview} />

        <Card title={messages.requestForm.slaTitle} size="small">
          {type?.slaHours ? (
            <>
              <Text strong>{messages.requestForm.slaHours(type.slaHours)}</Text>
              <Paragraph type="secondary" className="mt-2! mb-0! text-xs">
                {messages.requestForm.slaNote}
              </Paragraph>
            </>
          ) : (
            <Text type="secondary">{messages.requestForm.slaNone}</Text>
          )}
        </Card>
      </div>
    </div>
  );
}

/** One field, rendered from what the schema says it is. */
function SchemaField({
  name,
  property,
  required,
  value,
  onChange,
}: {
  name: string;
  property: FormSchemaProperty;
  required: boolean;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = property.title ?? name;

  return (
    <label className="block">
      <Text strong>
        {label} {required && <Text type="danger">*</Text>}
      </Text>
      {property.sensitive && (
        <Tag color="gold" className="ml-2">
          {messages.requestForm.sensitiveBadge}
        </Tag>
      )}

      {property.enum ? (
        <Select
          className="mt-1 w-full"
          value={value as string | undefined}
          onChange={onChange}
          options={property.enum.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      ) : property.type === "number" ? (
        <InputNumber
          className="mt-1 w-full"
          value={value as number | undefined}
          onChange={(next) => onChange(next)}
          min={property.minimum}
          max={property.maximum}
          // Grouping is display only; the value sent stays a plain number.
          formatter={(input) =>
            `${input}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(input) => Number((input ?? "").replace(/,/g, ""))}
        />
      ) : property.multiline ? (
        <Input.TextArea
          className="mt-1"
          rows={3}
          value={value as string | undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          className="mt-1"
          value={value as string | undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

/**
 * `เส้นทางอนุมัติที่จะใช้` — the panel §16 หน้าที่ 3 puts on the right.
 *
 * States an absent approver as a rule rather than leaving a gap: "CEO ไม่อยู่
 * ในเส้นทาง — วงเงินไม่เกินเพดาน …" is what stops a requester wondering
 * whether somebody was missed.
 */
function ChainPanel({ preview }: { preview: ChainPreview | null }) {
  if (!preview) {
    return (
      <Card title={messages.requestForm.chainTitle} size="small">
        <Text type="secondary">{messages.requestForm.chainNeedsAmount}</Text>
      </Card>
    );
  }

  return (
    <Card title={messages.requestForm.chainTitle} size="small">
      <Paragraph className="mb-1! text-xs">
        {messages.requestForm.chainComputed(money(preview.amount))}{" "}
        {preview.exceeded_upto &&
          messages.requestForm.chainOverTier(money(preview.exceeded_upto))}
      </Paragraph>
      <Paragraph type="secondary" className="mb-3! text-xs">
        — {messages.requestForm.chainNoPick}
      </Paragraph>

      <ol className="space-y-2">
        {preview.steps.map((step) => (
          <li key={step.step_no} className="flex gap-2 text-sm">
            <Text strong>{step.step_no}</Text>
            <div className="min-w-0">
              <div>
                {step.position}
                {step.display_name && ` — ${step.display_name}`}
              </div>
              <Text type="secondary" className="text-xs">
                {step.step_no === 1
                  ? messages.requestForm.stepReasonFirst
                  : preview.exceeded_upto
                    ? messages.requestForm.stepReasonOver(
                        money(preview.exceeded_upto),
                      )
                    : ""}
              </Text>
              {!step.user_id && (
                <div>
                  <Tag color="red">{messages.requestForm.chainUnresolved}</Tag>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {preview.excluded
        .filter((entry) => entry.appears_above)
        .map((entry) => (
          <Paragraph
            key={entry.position}
            type="secondary"
            className="mt-3! mb-0! text-xs"
          >
            {messages.requestForm.chainExcluded(
              entry.position,
              money(entry.appears_above),
            )}
          </Paragraph>
        ))}
    </Card>
  );
}
