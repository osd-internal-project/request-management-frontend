import type {
  CodedLabel,
  RequestType,
  RequiredDoc,
  SlaCoverage,
  SubRequestTypeRule,
} from "@/lib/api/types";
import { rowsFromSchema, toSchema, type FieldRow } from "./schema-rows";

/** A type without a coverage counts the clock round the clock, as the backend does. */
export const DEFAULT_COVERAGE: SlaCoverage = "H24X7";

/** Everything the รายละเอียด tab edits, held as one value until บันทึก. */
export interface TypeDraft {
  readonly name: string;
  readonly slaHours: number | null;
  readonly coverage: SlaCoverage;
  readonly receiver: string | null;
  readonly fixedReceiver: string | null;
  readonly eligibleUnits: string[];
  readonly refRequired: boolean;
  readonly rows: FieldRow[];
  /** The receiver's form, kept beside the requester's. */
  readonly receiverRows: FieldRow[];
  readonly docs: RequiredDoc[];
  readonly reasons: CodedLabel[];
  readonly subRequests: SubRequestTypeRule[];
}

export function draftFrom(type: RequestType | undefined): TypeDraft {
  return {
    name: type?.name ?? "",
    slaHours: type?.slaHours ?? null,
    coverage: type?.slaCoverage ?? DEFAULT_COVERAGE,
    receiver: type?.receiverOrgUnitId ?? null,
    fixedReceiver: type?.receiverUserId ?? null,
    eligibleUnits: type?.eligibleUnits?.map((entry) => entry.orgUnitId) ?? [],
    refRequired: type?.refRequired ?? false,
    rows: rowsFromSchema(type?.formSchema),
    receiverRows: rowsFromSchema(type?.receiverFormSchema),
    docs: type?.requiredDocs ?? [],
    reasons: type?.returnReasonCodes ?? [],
    subRequests: type?.subRequestTypes ?? [],
  };
}

/** The PATCH body for บันทึก. */
export function draftToPatch(draft: TypeDraft): Record<string, unknown> {
  return {
    name: draft.name,
    form_schema: toSchema(draft.rows),
    ...(draft.slaHours === null ? {} : { sla_hours: draft.slaHours }),
    sla_coverage: draft.coverage,
    // `null` clears the receiver's form; an empty editor means the type has
    // no second step rather than a step with no fields.
    receiver_form_schema: draft.receiverRows.length
      ? toSchema(draft.receiverRows)
      : null,
    // Sent whole. An empty list is the meaningful value "every group may
    // raise this", so omitting it when nothing is selected would make the
    // selector unable to reopen a type to everybody.
    eligible_org_unit_ids: draft.eligibleUnits,
    ref_required: draft.refRequired,
    // Sent even when cleared. Omitting it made `allowClear` on the ทีมผู้รับ
    // selector a lie: the field emptied on screen, the save left the old
    // team in place, and reopening the type put it back.
    receiver_org_unit_id: draft.receiver,
    // Sent even when cleared, like the team: null hands the choice back to the requester.
    receiver_user_id: draft.fixedReceiver,
    required_docs: draft.docs,
    return_reason_codes: draft.reasons,
    sub_request_types: draft.subRequests,
    // `approval_policy` is deliberately not sent. The approval route moved
    // off this screen entirely (31 Aug 2026) — it is edited on A1, and a
    // half-copy here would be a second place for it to drift.
  };
}
