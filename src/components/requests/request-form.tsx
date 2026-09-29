"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Radio,
  Tag,
} from "antd";
import dayjs from "dayjs";
import {
  AuditOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  LockOutlined,
  PaperClipOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { useRouter } from "next/navigation";
import {
  attachmentFileUrl,
  createDraft,
  previewChain,
  removeAttachment,
  saveDraft,
  submitRequest,
  uploadAttachment,
} from "@/lib/api/client-requests";
import {
  booleanLabelsOf,
  fieldKindOf,
  fieldOrder,
  isMultilineField,
  isRequiredDoc,
  isSensitiveField,
} from "@/lib/api/types";
import type { ClientResult } from "@/lib/api/client";
import type {
  ChainPreview,
  DirectoryUser,
  FormSchemaProperty,
  OrgUnitShape,
  RequestAttachment,
  RequestSeverity,
  RequestType,
} from "@/lib/api/types";
import { REQUEST_SEVERITIES } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect, SearchTreeSelect } from "@/components/ui/search-select";
import { buildUnitTree, subtreeIds } from "@/lib/org/org-tree";
import { ROUTES } from "@/lib/routes";
import {
  applyComputedFields,
  isComputedField,
} from "@/lib/computed-fields";


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

/**
 * One approval stage's answer, as the panel needs it.
 *
 * A request can be checked twice — before the work is handed over, and again
 * when it comes back — and the two are configured independently. They are kept
 * apart here rather than merged because "not configured" is a real answer for
 * either one, and a merged shape cannot say which half is missing.
 */
interface StageChain {
  preview: ChainPreview | null;
  /** `APV_MATRIX_NOT_FOUND` = this stage is off; anything else = it broke. */
  error: { code?: string; message: string } | null;
}

/** Before a type is chosen, nothing has been asked and nothing has failed. */
const EMPTY_STAGE: StageChain = { preview: null, error: null };

/** One `previewChain` answer, as the panel reads it. */
function toStage(result: ClientResult<ChainPreview>): StageChain {
  return result.ok
    ? { preview: result.data, error: null }
    : { preview: null, error: { code: result.code, message: result.message } };
}

function fileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

/** A per-document file picker; `busy` while its own upload is in flight. */
export function FilePickButton({
  busy,
  disabled,
  className,
  onPick,
}: {
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly className?: string;
  readonly onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
      <Button
        size="small"
        icon={<PaperClipOutlined />}
        loading={busy}
        disabled={disabled && !busy}
        className={className}
        onClick={() => input.current?.click()}
      >
        {busy ? messages.requestForm.uploading : messages.requestForm.attachFile}
      </Button>
    </>
  );
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
  initialValues,
  requesterName,
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
  /**
   * CD-133 — answers to start the form with (e.g. a contract request's
   * assumptions from the deal's approved Solution). Only keys the type's
   * form has are kept; the user edits them like any other answer.
   */
  initialValues?: Record<string, unknown>;
  /** Who is raising it — the first band of the route panel. */
  requesterName: string;
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
  // Seeds the receiver fields below; covers a `?type=` deep link as well as a single type.
  const initialType = types.find((entry) => entry.code === typeCode);
  /**
   * A request is handed to a person, not dropped in a department's queue.
   *
   * The source keeps a named `ผู้รับผิดชอบที่แผนกปลายทาง` on every row, and the
   * backend refuses a submit without one — a ticket nobody owns is the failure
   * this system exists to prevent.
   */
  const [receiverId, setReceiverId] = useState<string | undefined>(
    initialType?.receiverUserId ?? undefined,
  );
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
  >(initialType?.receiverOrgUnitId ?? undefined);
  /** CD-67 — only asked for, and only sent, when the type is a case type. */
  const [severity, setSeverity] = useState<RequestSeverity | undefined>();
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const known = initialType?.formSchema?.properties ?? {};
    return Object.fromEntries(
      Object.entries(initialValues ?? {}).filter(([key]) => key in known),
    );
  });
  const [refId, setRefId] = useState(initialRef?.id ?? "");
  const [draftId, setDraftId] = useState<string | null>(null);

  /** The prefilled ref keeps its own type; a hand-typed one stays "opportunity". */
  const refTypeOf = (id: string) =>
    initialRef && id === initialRef.id ? initialRef.type : "opportunity";
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  // The doc code being uploaded; "" for an extra file, null when idle.
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  /**
   * One stage's answer: the route, or why there is none.
   *
   * `APV_MATRIX_NOT_FOUND` means this stage is not configured — a legitimate
   * setup, and the common one: a type may be checked before the work, after
   * it, both, or neither. Anything else is a genuine failure and must not be
   * dressed up as one.
   */
  const [preWork, setPreWork] = useState<StageChain>(EMPTY_STAGE);
  const [afterWork, setAfterWork] = useState<StageChain>(EMPTY_STAGE);
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
  /** The type's ผู้รับเรื่องประจำ — when set, the receiver field is locked to it. */
  const fixedReceiver = type?.receiverUser ?? null;
  const fixedReceiverName = fixedReceiver?.displayName ?? null;
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
   * Who the route panel names as the receiving band.
   *
   * The person once one is chosen, the team while one is not — a team is a
   * truthful answer at that point, and leaving the band blank would read as a
   * step the route is missing rather than one not yet filled in.
   */
  const receiverName = useMemo(() => {
    const person = people.find((entry) => entry.id === receiverId);
    if (person) return person.displayName;

    return (
      units.find((unit) => unit.id === receiverOrgUnitId)?.name ?? null
    );
  }, [people, units, receiverId, receiverOrgUnitId]);

  /**
   * Which field carries the money.
   *
   * Read from the schema rather than assumed: a type authored in A2 may call
   * it anything, and the approval ladder is selected from whichever numeric
   * field the type marks as its amount.
   */
  const amountField = amountFieldOf(type);

  /** REQ-03 — the type decides whether `อ้างอิงโอกาสการขาย` blocks a submit. */
  const refRequired = type?.refRequired ?? false;
  const severityTargets = type?.severityTargets ?? null;
  const sentSeverity = severityTargets ? severity : undefined;

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
      ...(sentSeverity ? { severity: sentSeverity } : {}),
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
    nextReceiverId: string | undefined = receiverId,
  ) {
    // Nothing to ask about, and nothing to clear: the type selector resets
    // both before it changes the code, and both start null.
    if (!code) return;

    const field = amountFieldOf(
      types.find((entry) => entry.code === code) ?? null,
    );
    const raw = field ? nextValues[field] : undefined;

    // Sent as a string: money must not be rounded through a JS number on the
    // way to a ceiling comparison.
    const amount =
      raw === undefined || raw === null || raw === ""
        ? {}
        : { amount: String(raw) };

    // Typing in the amount fires one call per keystroke, and the answers do
    // not have to come back in order. Only the newest one may write state —
    // one counter for both stages, so the panel can never show half of one
    // answer beside half of another.
    const attempt = ++previewAttempt.current;

    /*
      Two ladders, asked for together.

      This screen used to ask only for `request:<CODE>` — the ladder that
      reviews finished work — and read `APV_MATRIX_NOT_FOUND` as "this type
      needs no approval at all". A type checked *before* the work stores its
      ladder under `:pre`, so those types previewed as having no approver and
      then routed to one on submit.

      The chart owner differs too: the pre-work ladder climbs the requester's
      chart (the caller, so it is left unsaid) and the after-work one climbs
      the chart of whoever carries the request — the receiver chosen here.
    */
    const [pre, post] = await Promise.all([
      previewChain({ subject_type: `request:${code}:pre`, ...amount }),
      previewChain({
        subject_type: `request:${code}`,
        ...amount,
        ...(nextReceiverId ? { chart_owner_user_id: nextReceiverId } : {}),
      }),
    ]);

    if (attempt !== previewAttempt.current) return;

    setPreWork(toStage(pre));
    setAfterWork(toStage(post));
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

  /**
   * The after-work ladder climbs the receiver's chart, so changing who
   * receives the work changes who reviews it. Passed through rather than read
   * from state for the same reason the type is: this runs in the same tick as
   * the `setState` beside it.
   */
  function selectReceiver(next: string | undefined) {
    setReceiverId(next);
    void refreshPreview(typeCode, values, next);
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
        ...(sentSeverity ? { severity: sentSeverity } : {}),
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

    setUploadingCode(docCode ?? "");
    const added = await uploadAttachment(id, file, docCode);
    setUploadingCode(null);

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
    if (severityTargets && !severity) {
      setError(messages.severity.required);
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
        ...(sentSeverity ? { severity: sentSeverity } : {}),
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

  // Explicit, because `jsonb` returns the properties sorted by key length —
  // see `fieldOrder`. Sorting a copy keeps the schema object untouched.
  const fields = Object.entries(schema?.properties ?? {}).sort(
    ([, a], [, b]) => fieldOrder(a) - fieldOrder(b),
  );
  // CD-80 — computed fields worked out live from what is typed.
  const computedValues = applyComputedFields(schema?.properties, values);

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
                  setPreWork(EMPTY_STAGE);
                  setAfterWork(EMPTY_STAGE);
                  setDraftId(null);
                  setAttachments([]);
                  setSeverity(undefined);

                  // The new type brings its own default team, and the person
                  // picked from the old team may not be in it.
                  const chosen = types.find((entry) => entry.code === next);
                  setReceiverOrgUnitId(chosen?.receiverOrgUnitId ?? undefined);
                  setReceiverId(chosen?.receiverUserId ?? undefined);
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
                  // The person already chosen may not be in the new branch —
                  // and the review ladder climbs that person's chart.
                  if (!fixedReceiver) selectReceiver(undefined);
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
                fixedReceiver
                  ? messages.requestForm.receiverFixedHint
                  : receiverOrgUnitId && receiverCandidates.length === 0
                    ? messages.requestForm.receiverTeamEmpty
                    : undefined
              }
            >
              <SearchSelect
                className="w-full"
                value={receiverId}
                onChange={selectReceiver}
                disabled={Boolean(fixedReceiver)}
                placeholder={messages.requestForm.receiverPlaceholder}
                options={
                  fixedReceiver
                    ? [{ value: fixedReceiver.id, label: fixedReceiver.displayName }]
                    : receiverCandidates.map((person) => ({
                        value: person.id,
                        label: `${person.displayName} · ${person.username}`,
                      }))
                }
              />
            </Field>

            {severityTargets && (
              <Field
                label={messages.severity.label}
                required
                hint={messages.severity.hint}
              >
                <SearchSelect
                  className="w-full"
                  value={severity}
                  onChange={(next?: RequestSeverity) => setSeverity(next)}
                  placeholder={messages.severity.placeholder}
                  options={REQUEST_SEVERITIES.map((level) => ({
                    value: level,
                    label: messages.severity.option(
                      messages.severity.levels[level],
                      severityTargets[level].responseHours,
                      severityTargets[level].resolutionHours,
                    ),
                  }))}
                />
              </Field>
            )}

            {/*
              Required only when the type says so.

              §16 marks it with `*`, but that mockup is the DSC screen and most
              types have no opportunity to point at. The magnifying glass went with the
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
                  value={computedValues[name]}
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
                    <Tag color={isRequiredDoc(doc) ? "red" : "default"}>
                      {isRequiredDoc(doc)
                        ? messages.requestForm.docRequired
                        : messages.requestForm.docOptional}
                    </Tag>

                    {attached ? (
                      <>
                        <a
                          href={attachmentFileUrl(attached.requestId, attached.id)}
                          className="text-xs"
                        >
                          {attached.fileName} · {fileSize(attached.sizeBytes)}
                        </a>
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
                      <>
                        {isRequiredDoc(doc) && (
                          <Tag color="orange">
                            {messages.requestForm.missingDoc}
                          </Tag>
                        )}
                        <FilePickButton
                          className="ms-auto"
                          busy={uploadingCode === doc.code}
                          disabled={uploadingCode !== null}
                          onPick={(file) => void onAttach(file, doc.code)}
                        />
                      </>
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
                      <a href={attachmentFileUrl(entry.requestId, entry.id)}>
                        {entry.fileName}{" "}
                        <Text type="secondary">
                          · {fileSize(entry.sizeBytes)}
                        </Text>
                      </a>
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

            <label
              className={`block rounded-lg border border-dashed border-black/15 px-4 py-5 text-center text-sm transition-colors ${
                uploadingCode === null
                  ? "cursor-pointer hover:border-blue-400 hover:bg-blue-50/40"
                  : "cursor-wait opacity-60"
              }`}
            >
              <input
                type="file"
                className="hidden"
                disabled={uploadingCode !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onAttach(file);
                  event.target.value = "";
                }}
              />
              <Text type="secondary">
                {uploadingCode === ""
                  ? messages.requestForm.uploading
                  : messages.requestForm.dropzone}
              </Text>
            </label>
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
          preWork={preWork}
          afterWork={afterWork}
          typeChosen={Boolean(typeCode)}
          requesterName={requesterName}
          receiverName={fixedReceiverName ?? receiverName}
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
                    {kindInput(spec, row[column], (next) =>
                      setCell(index, column, next),
                    ) ??
                    (spec.type === "number" ? (
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
                    ))}
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

/**
 * The input for a choice, a yes/no, or a date — `null` for text and numbers, which callers draw themselves.
 * Values sent match what `submit-rules.ts` accepts: boolean, `YYYY-MM-DD`, ISO 8601 with offset.
 */
function kindInput(
  property: FormSchemaProperty,
  value: unknown,
  onChange: (value: unknown) => void,
): ReactNode | null {
  const kind = fieldKindOf(property);
  const text = typeof value === "string" && value ? value : undefined;

  switch (kind) {
    case "select":
      return (
        <SearchSelect
          className="w-full"
          value={text}
          onChange={onChange}
          options={(property.enum ?? []).map((option) => ({
            value: option,
            label: option,
          }))}
        />
      );
    case "boolean": {
      const labels = booleanLabelsOf(property);
      // No default: an unanswered required yes/no must still read as missing.
      return (
        <Radio.Group
          value={typeof value === "boolean" ? value : undefined}
          onChange={(event) => onChange(event.target.value)}
          options={[
            { value: true, label: labels.yes },
            { value: false, label: labels.no },
          ]}
        />
      );
    }
    case "date":
      return (
        <DatePicker
          className="w-full"
          format="DD/MM/YYYY"
          value={text ? dayjs(text) : null}
          onChange={(next) => onChange(next ? next.format("YYYY-MM-DD") : undefined)}
        />
      );
    case "datetime":
      return (
        <DatePicker
          className="w-full"
          showTime={{ format: "HH:mm" }}
          format="DD/MM/YYYY HH:mm"
          value={text ? dayjs(text) : null}
          // `format()` with no pattern is ISO 8601 with the local offset.
          onChange={(next) => onChange(next ? next.format() : undefined)}
        />
      );
    default:
      return null;
  }
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
  const computed = isComputedField(property);
  const special =
    isTable || computed ? null : kindInput(property, value, onChange);

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
      {computed ? (
        // CD-80 — the system's number, not an input: the server recomputes
        // it on save, so an editable box would only suggest otherwise.
        <div>
          <Input
            readOnly
            className="w-full"
            value={
              typeof value === "number"
                ? `${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })} %`
                : ""
            }
            placeholder={messages.requestForm.computedPending}
            status={typeof value === "number" && value < 0 ? "error" : undefined}
          />
          <Text type="secondary" className="text-xs">
            {messages.requestForm.computedHint}
          </Text>
        </div>
      ) : isTable ? (
        <TableField property={property} value={value} onChange={onChange} />
      ) : special ? (
        special
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
 * Shared so a schema-driven field and a hand-written one (type, opportunity ref) come
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

/** The rail: a disc, and a line down to whatever comes next. */
function Rail({
  mark,
  tone = "step",
  last = false,
}: {
  /**
   * An approval step's number, or the icon of a band's role.
   *
   * The numbers are the ladder's own ordering and stay numbers — turning them
   * into icons would lose the one thing they say. The bands around them are
   * not steps, so they carry what they *are* instead.
   */
  mark: React.ReactNode;
  /** `step` is an approver; `person` is the requester or the receiver. */
  tone?: "step" | "person";
  last?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          tone === "step"
            ? "bg-blue-600 text-white"
            : "bg-black/5 text-black/60"
        }`}
      >
        {mark}
      </span>
      {!last && <span className="my-1 w-px flex-1 bg-black/10" />}
    </div>
  );
}

/** One band of the flow — a person, or one approval step. */
function FlowRow({
  rail,
  title,
  children,
  last = false,
}: {
  rail: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="flex gap-3">
      {rail}
      <div className={`min-w-0 ${last ? "" : "pb-4"}`}>
        <div className="text-sm">{title}</div>
        {children}
      </div>
    </li>
  );
}

/**
 * What one stage has to say, when it has no steps to show.
 *
 * Four different silences used to print the same sentence, and only one of
 * them meant it:
 *   · no type picked yet     → nothing has been asked
 *   · in flight              → the answer is coming
 *   · APV_MATRIX_NOT_FOUND   → this stage is genuinely not configured
 *   · anything else          → the panel failed, and saying "ไม่ต้องอนุมัติ"
 *                              would be a lie the requester acts on
 */
function StageNote({
  stage,
  typeChosen,
  absent,
}: {
  stage: StageChain;
  typeChosen: boolean;
  /** What "this stage is not configured" reads as, in this stage's words. */
  absent: string;
}) {
  if (!typeChosen) {
    return (
      <Text type="secondary" className="text-xs">
        {messages.requestForm.chainPickType}
      </Text>
    );
  }

  // In flight, derived rather than stored: a type is chosen and the server has
  // neither answered nor refused. Choosing a type clears both stages, so this
  // can only be true while a call is outstanding.
  if (!stage.error) {
    return (
      <Text type="secondary" className="text-xs">
        {messages.requestForm.chainLoading}
      </Text>
    );
  }

  if (stage.error.code !== "APV_MATRIX_NOT_FOUND") {
    return (
      <Alert
        type="warning"
        showIcon
        title={messages.requestForm.chainLoadError}
        description={stage.error.message}
      />
    );
  }

  return (
    <Text type="secondary" className="text-xs">
      {absent}
    </Text>
  );
}

/**
 * What a level is called, when the person filling it has no name to show.
 *
 * `position` is storage — `supervisor:1`, `org` — written to
 * `ApprovalStep.approverRole`, and printing it raw is what put "supervisor:1"
 * on screen where the head of a department belonged. The server now resolves
 * names from the `user` table, so this is the last resort (a deleted account,
 * somebody moved out of the company); it must still read as Thai.
 */
function positionLabel(position: string): string {
  const up = Number(position.split(":")[1]);

  return (
    messages.matrix.supervisorLevel[up] ?? messages.matrix.levelOrg
  );
}

/** The approvers of one stage, as rows of the flow. */
function stageRows(
  stage: StageChain,
  keyPrefix: string,
  /** Whether the last of these rows ends the whole flow. */
  endsFlow = false,
): React.ReactNode[] {
  const steps = stage.preview?.steps ?? [];

  return steps.map((step, index) => {
    const last = endsFlow && index === steps.length - 1;

    return (
    <FlowRow
      key={`${keyPrefix}-${step.step_no}`}
      rail={<Rail mark={step.step_no} last={last} />}
      title={
        <Text strong>
          {step.display_name ?? positionLabel(step.position)}
        </Text>
      }
      last={last}
    >
      {/*
        A level can name several people and any one of them may decide. Said
        explicitly: showing only the first name would read as "this person must
        approve", which is not what the ladder says.
      */}
      {step.candidate_user_ids.length > 1 && (
        <Text type="secondary" className="text-xs">
          {messages.requestForm.chainAnyOf(step.candidate_user_ids.length)}
        </Text>
      )}

      {step.step_no === 1 && (
        <Text type="secondary" className="block text-xs">
          {messages.requestForm.stepReasonFirst}
        </Text>
      )}

      {/*
        A configured level with nobody in it. Shown rather than dropped: the
        submit will refuse over exactly this, and a ladder that silently came
        back one step shorter is what hid it.
      */}
      {!step.user_id && (
        <div className="mt-1">
          <Tag color="red">{messages.requestForm.chainUnresolved}</Tag>
        </div>
      )}
    </FlowRow>
    );
  });
}

/**
 * `เส้นทางอนุมัติที่จะใช้` — the panel §16 หน้าที่ 3 puts on the right.
 *
 * Draws the whole route, not one stage of it: ผู้ยื่น → อนุมัติก่อนส่ง →
 * ผู้รับงาน → ตรวจผลงาน. A request can be checked twice, and the panel used to
 * ask only about the second check — so a type configured for the first
 * announced that it needed no approval at all, and then routed to an approver
 * on submit.
 *
 * States an absent approver as a rule rather than leaving a gap: a stage that
 * is not configured says so in its own words, which is what stops a requester
 * wondering whether somebody was missed.
 */
function ChainPanel({
  preWork,
  afterWork,
  typeChosen,
  requesterName,
  receiverName,
}: {
  /** Before the work is handed over — climbs the requester's chart. */
  preWork: StageChain;
  /** When the work comes back — climbs the chart of whoever carried it. */
  afterWork: StageChain;
  typeChosen: boolean;
  requesterName: string;
  /** The person, or the team, or nothing yet — whatever has been chosen. */
  receiverName: string | null;
}) {
  const preSteps = stageRows(preWork, "pre");
  const postSteps = stageRows(afterWork, "post", true);

  return (
    <Card title={messages.requestForm.chainTitle} size="small">
      <Paragraph className="mb-1! text-xs">
        {messages.requestForm.chainComputed}
      </Paragraph>
      <Paragraph type="secondary" className="mb-4! text-xs">
        — {messages.requestForm.chainNoPick}
      </Paragraph>

      <ol className="m-0 list-none p-0">
        <FlowRow
          rail={<Rail mark={<UserOutlined />} tone="person" />}
          title={<Text strong>{requesterName}</Text>}
        >
          <Text type="secondary" className="text-xs">
            {messages.requestForm.flowRequester}
          </Text>
        </FlowRow>

        <FlowRow
          rail={<Rail mark={<SafetyCertificateOutlined />} tone="person" />}
          title={
            <Text type="secondary" className="text-xs">
              {messages.requestForm.flowBeforeWork}
            </Text>
          }
        >
          {preSteps.length ? null : (
            <StageNote
              stage={preWork}
              typeChosen={typeChosen}
              absent={messages.requestForm.flowNoBeforeWork}
            />
          )}
        </FlowRow>
        {preSteps}

        <FlowRow
          rail={<Rail mark={<SolutionOutlined />} tone="person" />}
          title={
            <Text strong>
              {receiverName ?? messages.requestForm.flowReceiverUnset}
            </Text>
          }
        >
          <Text type="secondary" className="text-xs">
            {messages.requestForm.flowReceiver}
          </Text>
        </FlowRow>

        <FlowRow
          rail={<Rail mark={<AuditOutlined />} tone="person" last={!postSteps.length} />}
          title={
            <Text type="secondary" className="text-xs">
              {messages.requestForm.flowAfterWork}
            </Text>
          }
          last={!postSteps.length}
        >
          {postSteps.length ? (
            /*
              The people are resolved from the receiver chosen here, but the
              request may be accepted or passed on by somebody else — the
              ladder climbs `assigneeUserId ?? receiverUserId` at the time the
              work is finished, not at the time it is raised.
            */
            <Text type="secondary" className="text-xs">
              {messages.requestForm.flowAfterWorkHint}
            </Text>
          ) : (
            <StageNote
              stage={afterWork}
              typeChosen={typeChosen}
              absent={messages.requestForm.flowNoAfterWork}
            />
          )}
        </FlowRow>
        {postSteps}
      </ol>
    </Card>
  );
}
