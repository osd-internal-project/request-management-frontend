"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Card, Empty, Input, InputNumber, Tag } from "antd";
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  LockOutlined,
} from "@ant-design/icons";
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
import {
  fieldOrder,
  isMultilineField,
  isSensitiveField,
} from "@/lib/api/types";
import type {
  ChainPreview,
  DirectoryUser,
  FormSchemaProperty,
  OrgUnitShape,
  RequestAttachment,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect, SearchTreeSelect } from "@/components/search-select";
import { buildUnitTree, subtreeIds } from "@/lib/org-tree";
import { ROUTES } from "@/lib/routes";


/**
 * Which field of a type carries the money.
 *
 * Read from the schema rather than assumed: a type authored in A2 may call it
 * anything, and the approval ladder is selected from whichever numeric field
 * the type marks as its amount.
 */
function amountFieldOf(type: RequestType | null): string | null {
  const entries = Object.entries(type?.formSchema?.properties ?? {});

  return (
    entries.find(([name]) => name === "deal_value")?.[0] ??
    entries.find(([, prop]) => prop.type === "number")?.[0] ??
    null
  );
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
export function RequestForm({
  types,
  people,
  units,
  parentRequestId,
  initialRef,
  initialTypeCode,
}: {
  types: RequestType[];
  /** The directory the `ผู้รับเรื่อง` selector draws from. */
  people: DirectoryUser[];
  /** The company's chart — `ทีมผู้รับ` is a tree over it. */
  units: OrgUnitShape[];
  /** Set when this request is being raised from inside another one. */
  parentRequestId?: string | null;
  /** REQ-06 / C360-06 — raised from an entity page (เช่น หน้า 360° ลูกค้า):
   * the ref arrives prefilled and typed, ไม่ต้องพิมพ์ซ้ำ. */
  initialRef?: { type: string; id: string } | null;
  /** Preselect a type (เช่น ปุ่ม "ยื่น KYC" ส่ง type=KYC) — ผู้ใช้เปลี่ยนได้. */
  initialTypeCode?: string;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const router = useRouter();

  const [typeCode, setTypeCode] = useState<string | undefined>(() => {
    if (initialTypeCode && types.some((t) => t.code === initialTypeCode)) {
      return initialTypeCode;
    }
    return types.length === 1 ? types[0].code : undefined;
  });
  /**
   * A request is handed to a person, not dropped in a department's queue.
   *
   * The source keeps a named `ผู้รับผิดชอบที่แผนกปลายทาง` on every row, and the
   * backend refuses a submit without one — a ticket nobody owns is the failure
   * this system exists to prevent.
   */
  const [receiverId, setReceiverId] = useState<string | undefined>();
  /**
   * ทีมผู้รับ. Seeded from the type and changeable — REQ-01 configures a
   * starting point, not a routing rule, and the departments' own logs show
   * work being sent outside the type's usual team often enough to matter.
   *
   * `undefined` means "whatever the type says"; the server applies the same
   * default, so a request raised without ever touching this field still lands
   * on the right team.
   */
  const [receiverOrgUnitId, setReceiverOrgUnitId] = useState<
    string | undefined
  >(types.length === 1 ? (types[0].receiverOrgUnitId ?? undefined) : undefined);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [refId, setRefId] = useState(initialRef?.id ?? "");
  const [draftId, setDraftId] = useState<string | null>(null);

  /** The prefilled ref keeps its own type; a hand-typed one stays "deal". */
  const refTypeOf = (id: string) =>
    initialRef && id === initialRef.id ? initialRef.type : "deal";
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [preview, setPreview] = useState<ChainPreview | null>(null);
  /**
   * Why there is no route to show, when there is none.
   *
   * `APV_MATRIX_NOT_FOUND` means the type has no approval step — a legitimate
   * configuration for over a third of the request types. Anything else is a
   * genuine failure and must not be dressed up as one.
   */
  const [chainError, setChainError] = useState<{
    code?: string;
    message: string;
  } | null>(null);
  /** Sequence number of the newest preview call — see `refreshPreview`. */
  const previewAttempt = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * §16 shows `บันทึกร่างอัตโนมัติล่าสุด 10:42 น.` under the form. There is no
   * autosave yet, so this is set only by a save that actually succeeded —
   * showing a time before anything was stored would be a claim, not a status.
   */
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const type = types.find((candidate) => candidate.code === typeCode) ?? null;
  const schema = type?.formSchema;
  const required = schema?.required ?? [];

  /**
   * The whole chart, as a tree.
   *
   * This used to be a flat list built from the receiving teams the request
   * types happened to name, because the chart was admin-only over the API and
   * a page that fetches what its viewer cannot read is a guaranteed 403. There
   * is now `GET /org-units` for exactly this, so the requester can send work
   * anywhere in the company — the type's team is a starting point, not a fence.
   */
  const teamTree = useMemo(
    () =>
      buildUnitTree(units, {
        // A switched-off team is shown and not choosable, rather than removed:
        // dropping it would re-hang the teams under it at the root and hide
        // everybody in them from a pick made further up the chart.
        disabled: (unit) => !unit.active,
      }),
    [units],
  );

  /**
   * The chosen team **and everything under it**.
   *
   * Matching the unit exactly found nobody once the chart gained a fourth
   * level: a receiving team is a department, and people sit at positions
   * beneath it. 36 of the 40 types with a receiving team were offering an
   * empty receiver list.
   *
   * Nobody in the branch is still a real answer, not a reason to widen the
   * list — it means the team has no members yet, and quietly handing the
   * ticket to somebody outside it would hide that. Clearing the team is how
   * the requester asks for everybody, and that is deliberate.
   */
  const receiverCandidates = useMemo(() => {
    if (!receiverOrgUnitId) return people;

    const branch = subtreeIds(units, receiverOrgUnitId);

    return people.filter(
      (person) => person.orgUnitId && branch.has(person.orgUnitId),
    );
  }, [people, units, receiverOrgUnitId]);

  /**
   * Which field carries the money.
   *
   * Read from the schema rather than assumed: a type authored in A2 may call
   * it anything, and the approval ladder is selected from whichever numeric
   * field the type marks as its amount.
   */
  const amountField = amountFieldOf(type);

  /** REQ-03 — the type decides whether `อ้างอิงดีล` blocks a submit. */
  const refRequired = type?.refRequired ?? false;

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
      ref_type: refId ? refTypeOf(refId) : undefined,
      ref_id: refId || undefined,
      receiver_user_id: receiverId,
      receiver_org_unit_id: receiverOrgUnitId,
      ...(parentRequestId ? { parent_request_id: parentRequestId } : {}),
    });

    if (!created.ok) {
      setError(created.message);
      return null;
    }

    setDraftId(created.data.id);
    return created.data.id;
  }

  /**
   * Asks the server for the route, for `code` and the amount in `nextValues`.
   *
   * The type is a parameter rather than read from state because the caller
   * that matters most — picking a type — runs in the same tick as
   * `setTypeCode`, where `typeCode` is still the previous value.
   */
  async function refreshPreview(
    code: string | undefined,
    nextValues: Record<string, unknown>,
  ) {
    // Nothing to ask about, and nothing to clear: the type selector resets
    // both before it changes the code, and both start null.
    if (!code) return;

    const field = amountFieldOf(
      types.find((entry) => entry.code === code) ?? null,
    );
    const raw = field ? nextValues[field] : undefined;

    // Typing in the amount fires one call per keystroke, and the answers do
    // not have to come back in order. Only the newest one may write state.
    const attempt = ++previewAttempt.current;

    const result = await previewChain({
      subject_type: `request:${code}`,
      // Sent as a string: money must not be rounded through a JS number on
      // the way to a ceiling comparison.
      ...(raw === undefined || raw === null || raw === ""
        ? {}
        : { amount: String(raw) }),
    });

    if (attempt !== previewAttempt.current) return;

    setPreview(result.ok ? result.data : null);
    setChainError(
      result.ok ? null : { code: result.code, message: result.message },
    );
  }

  /**
   * The route is a property of the type, not of the amount.
   *
   * It used to be fetched only when the amount field changed, so a type with
   * no numeric field never showed a route at all and one with a numeric field
   * only showed it after the first keystroke — while the panel meanwhile
   * announced "ไม่มีชั้นอนุมัติ". Reacting to the type covers the first paint
   * (a single-type form starts with one chosen) and every later change; the
   * answers are re-fetched from `setField` when the amount moves.
   */
  useEffect(() => {
    void refreshPreview(typeCode, {});
    // `refreshPreview` is redefined every render; the type is what should
    // re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeCode]);

  function setField(name: string, value: unknown) {
    const next = { ...values, [name]: value };
    setValues(next);
    if (name === amountField) void refreshPreview(typeCode, next);
  }

  async function onSaveDraft() {
    setBusy(true);
    setError(null);

    const id = await ensureDraft();

    if (id) {
      const saved = await saveDraft(id, {
        form_data: values,
        ref_type: refId ? refTypeOf(refId) : null,
        ref_id: refId || null,
        receiver_user_id: receiverId ?? null,
        receiver_org_unit_id: receiverOrgUnitId,
      });

      if (saved.ok) {
        void message.success(messages.requestForm.saved);
        setSavedAt(
          new Date().toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } else setError(saved.message);
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
    // Not part of `formSchema`, so no schema validation covers it. The backend
    // checks it too (`assertSubmittable`) — this is only so the person is told
    // before the round trip, not instead of it.
    if (refRequired && !refId.trim()) {
      setError(messages.requestForm.refRequired);
      return;
    }

    setBusy(true);
    setError(null);

    const id = await ensureDraft();

    if (id) {
      /*
        Saved first: the draft row was created before the last keystrokes.

        The receiver and the team go with it. Leaving them out overwrote a
        change made after the draft was created with nothing — the submit then
        failed on a receiver the user had already picked.
      */
      await saveDraft(id, {
        form_data: values,
        ref_type: refId ? refTypeOf(refId) : null,
        ref_id: refId || null,
        receiver_user_id: receiverId ?? null,
        receiver_org_unit_id: receiverOrgUnitId,
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

  // Explicit, because `jsonb` returns the properties sorted by key length —
  // see `fieldOrder`. Sorting a copy keeps the schema object untouched.
  const fields = Object.entries(schema?.properties ?? {}).sort(
    ([, a], [, b]) => fieldOrder(a) - fieldOrder(b),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {error && <Alert type="error" showIcon title={error} />}

        <Card>
          {/* Two columns from `md` up, matching §16; the long answer spans both. */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <Field label={messages.requestForm.type} required>
              <SearchSelect
                className="w-full"
                value={typeCode}
                onChange={(next) => {
                  // A new type means a new schema: keeping the old answers
                  // would submit fields the new form never showed.
                  setTypeCode(next);
                  setValues({});
                  // Cleared here as well as re-fetched by the effect, so the
                  // old type's route is not left on screen while the new one
                  // is still being asked for.
                  setPreview(null);
                  setChainError(null);
                  setDraftId(null);
                  setAttachments([]);

                  // The new type brings its own default team, and the person
                  // picked from the old team may not be in it.
                  const chosen = types.find((entry) => entry.code === next);
                  setReceiverOrgUnitId(chosen?.receiverOrgUnitId ?? undefined);
                  setReceiverId(undefined);
                }}
                placeholder={messages.requestForm.type}
                options={types.map((entry) => ({
                  value: entry.code,
                  label: `${entry.name} (${entry.code})`,
                }))}
              />
            </Field>

            {/*
              §16 A2 calls this ทีมผู้รับ. It arrives preselected from the type
              and stays changeable — the type configures where work usually
              goes, not where this particular request has to.
            */}
            <Field
              label={messages.requestForm.receiverTeam}
              hint={messages.requestForm.receiverTeamHint}
            >
              <SearchTreeSelect
                className="w-full"
                allowClear
                treeDefaultExpandAll
                value={receiverOrgUnitId}
                onChange={(next?: string) => {
                  setReceiverOrgUnitId(next);
                  // The person already chosen may not be in the new branch.
                  setReceiverId(undefined);
                }}
                placeholder={messages.requestForm.receiverTeamPlaceholder}
                treeData={teamTree}
              />
            </Field>

            {/*
              A ticket is handed to a person. The backend refuses a submit
              without one, so this is required here rather than discovered at
              the last click.
            */}
            <Field
              label={messages.requestForm.receiver}
              required
              hint={
                receiverOrgUnitId && receiverCandidates.length === 0
                  ? messages.requestForm.receiverTeamEmpty
                  : undefined
              }
            >
              <SearchSelect
                className="w-full"
                value={receiverId}
                onChange={setReceiverId}
                placeholder={messages.requestForm.receiverPlaceholder}
                options={receiverCandidates.map((person) => ({
                  value: person.id,
                  label: `${person.displayName} · ${person.username}`,
                }))}
              />
            </Field>

            {/*
              Required only when the type says so.

              §16 marks it with `*`, but that mockup is the DSC screen and most
              types have no deal to point at. The magnifying glass went with the
              hard-coded rule: it never searched anything, and an icon that says
              a field is a lookup when it is a text box is a screen lying to the
              person filling it in.
            */}
            <Field
              label={messages.requestForm.refLabel}
              required={refRequired}
            >
              <Input
                value={refId}
                onChange={(event) => setRefId(event.target.value)}
                placeholder="D-501"
              />
            </Field>

            {type ? (
              fields.map(([name, prop]) => (
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
              <div className="md:col-span-2">
                <Empty description={messages.requestForm.typeRequired} />
              </div>
            )}
          </div>
        </Card>

        {type && (
          <Card title={messages.requestForm.requiredDocsTitle}>
            {/* One row per required document — satisfied rows carry the file
                they were satisfied by, rather than listing it separately. */}
            <ul className="mb-3 space-y-2">
              {(type.requiredDocs ?? []).map((doc) => {
                const attached = attachments.find(
                  (entry) => entry.docCode === doc.code,
                );

                return (
                  <li
                    key={doc.code}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm ${
                      attached
                        ? "border-green-600/20 bg-green-50/60"
                        : "border-black/8"
                    }`}
                  >
                    {attached ? (
                      <CheckCircleFilled className="text-green-600" />
                    ) : null}
                    <Text strong>{doc.name}</Text>

                    {attached ? (
                      <>
                        <Text type="secondary" className="text-xs">
                          {attached.fileName} · {fileSize(attached.sizeBytes)}
                        </Text>
                        <Button
                          size="small"
                          type="link"
                          danger
                          className="ms-auto px-0!"
                          onClick={() => void onRemoveAttachment(attached.id)}
                        >
                          {messages.requestForm.remove}
                        </Button>
                      </>
                    ) : (
                      <Tag color="orange" className="ms-auto">
                        {messages.requestForm.missingDoc}
                      </Tag>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Extra documents beyond the required list. */}
            {attachments.filter((entry) => !entry.docCode).length > 0 && (
              <ul className="mb-3 divide-y divide-black/5">
                {attachments
                  .filter((entry) => !entry.docCode)
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span>
                        {entry.fileName}{" "}
                        <Text type="secondary">
                          · {fileSize(entry.sizeBytes)}
                        </Text>
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
            )}

            <label className="block cursor-pointer rounded-lg border border-dashed border-black/15 px-4 py-5 text-center text-sm transition-colors hover:border-blue-400 hover:bg-blue-50/40">
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Fills the first outstanding requirement, so the common case
                  // needs no separate "which document is this?" step.
                  const nextMissing = (type.requiredDocs ?? []).find(
                    (doc) => !attachedCodes.has(doc.code),
                  );
                  if (file) void onAttach(file, nextMissing?.code);
                  event.target.value = "";
                }}
              />
              <Text type="secondary">{messages.requestForm.dropzone}</Text>
            </label>

            <Paragraph type="secondary" className="mt-3! mb-0! text-xs">
              {messages.requestForm.noStorageNote}
            </Paragraph>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text type="secondary" className="text-xs">
            {savedAt ? messages.requestForm.autosaveAt(savedAt) : ""}
          </Text>

          <div className="flex gap-2">
            <Button onClick={() => void onSaveDraft()} loading={busy}>
              {messages.requestForm.saveDraft}
            </Button>
            <Button
              type="primary"
              onClick={() => void onSubmit()}
              loading={busy}
              disabled={!typeCode}
            >
              {busy
                ? messages.requestForm.submitting
                : messages.requestForm.submit}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ChainPanel
          preview={preview}
          typeChosen={Boolean(typeCode)}
          error={chainError}
        />

        <Card title={messages.requestForm.slaTitle} size="small">
          {type?.slaHours ? (
            <>
              <div className="flex items-center gap-2">
                <ClockCircleOutlined className="text-base text-blue-600" />
                <Text strong className="text-base">
                  {messages.requestForm.slaHours(type.slaHours)}
                </Text>
              </div>
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
/**
 * A `type: "array"` field: a grid the person filling it in adds rows to.
 *
 * The columns come from `items`, ordered by the same `x-order` the top-level
 * fields use, so a table authored in A2 draws in the order the admin arranged
 * it. `maxItems` caps the rows — absent means they may keep going, which is
 * what the requirement asked for.
 *
 * Cells reuse nothing from `SchemaField`: that renders a labelled block, and a
 * table already carries its labels in the header. Only the input itself is
 * shared in spirit — number columns get `InputNumber`, everything else a text
 * box, which is the same distinction one level up.
 */
function TableField({
  property,
  value,
  onChange,
}: {
  readonly property: FormSchemaProperty;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
}) {
  const columns = Object.entries(property.items?.properties ?? {}).sort(
    ([, a], [, b]) => fieldOrder(a) - fieldOrder(b),
  );
  const requiredColumns = new Set(property.items?.required ?? []);

  /*
    A value that is not an array is treated as no rows rather than crashing the
    form: `formData` is `jsonb` an admin can reshape, and a screen that throws
    on unexpected data is a screen nobody can correct the data from.
  */
  const rows = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : [];

  const full =
    property.maxItems !== undefined && rows.length >= property.maxItems;

  function setCell(index: number, column: string, next: unknown) {
    onChange(
      rows.map((row, at) => (at === index ? { ...row, [column]: next } : row)),
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left">
              {columns.map(([column, spec]) => (
                <th key={column} className="px-2 py-1 font-medium">
                  {spec.title ?? column}
                  {requiredColumns.has(column) && (
                    <span className="text-red-500"> *</span>
                  )}
                  {isSensitiveField(spec) && (
                    <Tag color="gold" className="ml-1 m-0!">
                      {messages.requestForm.sensitiveBadge}
                    </Tag>
                  )}
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              // The index is the identity: rows carry no id of their own, and
              // any key derived from the contents changes as somebody types.
              <tr key={index} className="border-b border-black/5">
                {columns.map(([column, spec]) => (
                  <td key={column} className="px-2 py-1">
                    {spec.type === "number" ? (
                      <InputNumber
                        className="w-full"
                        value={row[column] as number | undefined}
                        min={spec.minimum}
                        max={spec.maximum}
                        onChange={(next) => setCell(index, column, next)}
                      />
                    ) : (
                      <Input
                        value={row[column] as string | undefined}
                        maxLength={spec.maxLength}
                        onChange={(event) =>
                          setCell(index, column, event.target.value)
                        }
                      />
                    )}
                  </td>
                ))}
                <td className="px-2 py-1">
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={() =>
                      onChange(rows.filter((_, at) => at !== index))
                    }
                  >
                    {messages.requestForm.remove}
                  </Button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-2 py-3 text-center"
                >
                  <Text type="secondary">{messages.requestForm.tableEmpty}</Text>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <Button size="small" disabled={full} onClick={() => onChange([...rows, {}])}>
          {messages.requestForm.tableAddRow}
        </Button>
        {property.maxItems !== undefined && (
          <Text type="secondary" className="text-xs">
            {messages.requestForm.tableRowCap(rows.length, property.maxItems)}
          </Text>
        )}
      </div>
    </div>
  );
}

export function SchemaField({
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
  const multiline = isMultilineField(property);
  const isTable = property.type === "array" && Boolean(property.items);

  return (
    <Field
      label={property.title ?? name}
      required={required}
      // A grid of inputs never fits a form column.
      wide={multiline || isTable}
      badge={
        // SCOPE-04 — states who will see the value, next to the value itself.
        isSensitiveField(property) ? (
          <Tag color="gold" icon={<LockOutlined />} className="m-0!">
            {messages.requestForm.sensitiveBadge}
          </Tag>
        ) : null
      }
    >
      {isTable ? (
        <TableField property={property} value={value} onChange={onChange} />
      ) : property.enum ? (
        <SearchSelect
          className="w-full"
          value={value as string | undefined}
          onChange={onChange}
          options={property.enum.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      ) : property.type === "number" ? (
        <InputNumber
          // Full width of its column: a number is not narrower than a name, and
          // antd's default made the money field the smallest input on a form
          // that is mostly about money.
          className="w-full"
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
      ) : multiline ? (
        <Input.TextArea
          rows={3}
          maxLength={property.maxLength}
          value={value as string | undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          value={value as string | undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

/**
 * Label, required marker, and optional badge above a control.
 *
 * Shared so a schema-driven field and a hand-written one (type, deal ref) come
 * out the same height and weight — that is what makes the two columns line up.
 */
export function Field({
  label,
  required,
  badge,
  hint,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  badge?: React.ReactNode;
  /** A line under the control — what the value means, not an error. */
  hint?: string;
  /** Spans both columns — for long answers. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Text strong>
          {label} {required && <Text type="danger">*</Text>}
        </Text>
        {badge}
      </div>
      {children}
      {hint && (
        <Text type="secondary" className="mt-1 block text-xs">
          {hint}
        </Text>
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
function ChainPanel({
  preview,
  typeChosen,
  error,
}: {
  preview: ChainPreview | null;
  typeChosen: boolean;
  /** Why there is no route — `null` when the server has not refused one. */
  error: { code?: string; message: string } | null;
}) {
  if (!preview) {
    /*
      In flight, derived rather than stored: a type is chosen, the server has
      neither answered nor refused. Choosing a type clears both, so this can
      only be true while a call is outstanding — one less state to keep
      truthful, and no setState inside an effect to get there.
    */
    const loading = typeChosen && !error;

    /*
      Four different silences used to print the same sentence. Told apart,
      because only one of them means what that sentence says:
        · no type picked yet          → nothing has been asked
        · in flight                   → the answer is coming
        · APV_MATRIX_NOT_FOUND        → genuinely no approval step
        · anything else               → the panel failed, and saying
                                        "ทำเสร็จแล้วจบเลย" would be a lie the
                                        requester acts on
    */
    const body = !typeChosen ? (
      <Text type="secondary">{messages.requestForm.chainPickType}</Text>
    ) : loading ? (
      <Text type="secondary">{messages.requestForm.chainLoading}</Text>
    ) : error && error.code !== "APV_MATRIX_NOT_FOUND" ? (
      <Alert
        type="warning"
        showIcon
        title={messages.requestForm.chainLoadError}
        description={error.message}
      />
    ) : (
      <Text type="secondary">{messages.requestForm.chainNoMatrix}</Text>
    );

    return (
      <Card title={messages.requestForm.chainTitle} size="small">
        {body}
      </Card>
    );
  }

  return (
    <Card title={messages.requestForm.chainTitle} size="small">
      <Paragraph className="mb-1! text-xs">
        {messages.requestForm.chainComputed}
      </Paragraph>
      <Paragraph type="secondary" className="mb-4! text-xs">
        — {messages.requestForm.chainNoPick}
      </Paragraph>

      <ol>
        {preview.steps.map((step, index) => (
          <li key={step.step_no} className="flex gap-3">
            {/* The rail: a numbered disc, and a line down to the next step.
                Drawn per-item so the last step ends the line cleanly. */}
            <div className="flex flex-col items-center">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {step.step_no}
              </span>
              {index < preview.steps.length - 1 && (
                <span className="my-1 w-px flex-1 bg-black/10" />
              )}
            </div>

            <div className="min-w-0 pb-4">
              <div className="text-sm">
                <Text strong>
                  {step.display_name ?? step.position}
                </Text>
              </div>

              {/*
                A level can name several people and any one of them may decide.
                Said explicitly: showing only the first name would read as "this
                person must approve", which is not what the ladder says.
              */}
              {step.candidate_user_ids.length > 1 && (
                <Text type="secondary" className="text-xs">
                  {messages.requestForm.chainAnyOf(
                    step.candidate_user_ids.length,
                  )}
                </Text>
              )}

              {step.step_no === 1 && (
                <Text type="secondary" className="block text-xs">
                  {messages.requestForm.stepReasonFirst}
                </Text>
              )}

              {!step.user_id && (
                <div className="mt-1">
                  <Tag color="red">{messages.requestForm.chainUnresolved}</Tag>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
