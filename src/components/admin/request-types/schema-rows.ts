import {
  fieldKindOf,
  fieldOrder,
  isMultilineField,
  isSensitiveField,
  type FieldKind,
  type FormSchema,
  type FormSchemaProperty,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** One editable row of the form schema, flattened for display. */
export interface FieldRow {
  key: string;
  title: string;
  type: FieldKind;
  required: boolean;
  sensitive: boolean;
  multiline: boolean;
  /**
   * Everything this screen does not edit — `description`, `enum`, `minimum`,
   * `maximum`, `maxLength` — carried through a round trip so saving a type does
   * not quietly strip the parts of its schema the editor has no control for.
   */
  extra: FormSchemaProperty;
  /** `type === "table"` only: the table's columns, edited as rows themselves. */
  columns?: FieldRow[];
  /** `type === "table"` only: how many rows a requester may add. */
  maxItems?: number | null;
  /** `select` only: the choices, stored as `enum`. */
  options?: string[];
  /** `boolean` only: `x-true-label` / `x-false-label`; empty means ใช่ / ไม่ใช่. */
  trueLabel?: string;
  falseLabel?: string;
  /** `number` only: keeps an imported `type: "integer"` from becoming `number` on save. */
  integer?: boolean;
}

export const FIELD_TYPES: readonly FieldKind[] = [
  "text",
  "number",
  "boolean",
  "date",
  "datetime",
  "select",
  "table",
];

/**
 * Types a *column* may be.
 *
 * `array` is missing on purpose: the backend refuses a table inside a table,
 * the grid on หน้าที่ 3 has nowhere to draw one, and the masking interceptor
 * walks exactly one level into rows. Offering it here would let an admin save
 * a type nobody can fill in.
 */
export const COLUMN_TYPES = FIELD_TYPES.filter((kind) => kind !== "table");

/** The schema keys this editor owns; everything else survives a round trip. */
const OWNED_PROPERTY_KEYS = [
  "type",
  "title",
  "sensitive",
  "multiline",
  "x-sensitive",
  "x-multiline",
  "x-order",
  // Written from `type` by `kindSchema`; left in `extra` they would survive a kind change.
  "enum",
  "format",
  "x-true-label",
  "x-false-label",
  // The table's own two keys. Without them here they fall into `extra` and
  // get written twice — once from `extra`, once from the editor — and the two
  // copies drift the moment somebody edits the columns.
  "items",
  "maxItems",
] as const;

/** A new field, and a new column: a column differs only in its allowed types. */
export const EMPTY_FIELD: FieldRow = {
  key: "",
  title: "",
  type: "text",
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
 * showing the same form. `asColumns` reads a table's `items`: no textarea and
 * no nested table.
 */
export function rowsFromSchema(
  schema: FormSchema | null | undefined,
  asColumns = false,
): FieldRow[] {
  const properties = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);

  return Object.entries(properties)
    .sort(([, a], [, b]) => fieldOrder(a) - fieldOrder(b))
    .map(([key, property]) => {
      const extra: FormSchemaProperty = { ...property };
      for (const owned of OWNED_PROPERTY_KEYS) delete extra[owned];

      return {
        key,
        title: property.title ?? key,
        ...kindFields(property),
        required: required.has(key),
        sensitive: isSensitiveField(property),
        multiline: !asColumns && isMultilineField(property),
        extra,
        ...(!asColumns && property.type === "array"
          ? {
              columns: rowsFromSchema(property.items, true),
              maxItems: property.maxItems ?? null,
            }
          : {}),
      };
    });
}

/** The kind-specific part of a row, read from a stored property. */
function kindFields(property: FormSchemaProperty) {
  const type = fieldKindOf(property);

  return {
    type,
    ...(type === "select" ? { options: property.enum ?? [] } : {}),
    ...(type === "boolean"
      ? {
          trueLabel: property["x-true-label"] ?? "",
          falseLabel: property["x-false-label"] ?? "",
        }
      : {}),
    ...(property.type === "integer" ? { integer: true } : {}),
  };
}

/** The inverse of `kindFields`: only the keys this kind uses, so a kind change leaves nothing stale. */
function kindSchema(row: FieldRow): FormSchemaProperty {
  switch (row.type) {
    case "number":
      return { type: row.integer ? "integer" : "number" };
    case "boolean":
      return {
        type: "boolean",
        ...(row.trueLabel?.trim() ? { "x-true-label": row.trueLabel.trim() } : {}),
        ...(row.falseLabel?.trim() ? { "x-false-label": row.falseLabel.trim() } : {}),
      };
    case "date":
      return { type: "string", format: "date" };
    case "datetime":
      return { type: "string", format: "date-time" };
    case "select":
      return { type: "string", enum: row.options ?? [] };
    case "table":
      return { type: "array" };
    case "text":
      return { type: "string", ...(row.multiline ? { "x-multiline": true } : {}) };
  }
}

/** The inverse — what the API stores. */
export function toSchema(rows: readonly FieldRow[]) {
  const properties: Record<string, FormSchemaProperty> = {};

  rows.forEach((row, index) => {
    properties[row.key] = {
      ...row.extra,
      ...kindSchema(row),
      title: row.title,
      // Position is data, not key order — see `rowsFromSchema`.
      "x-order": index + 1,
      ...(row.sensitive ? { "x-sensitive": true } : {}),
      ...(row.type === "table"
        ? {
            // `toSchema` calls itself for the columns: a table's `items` is a
            // schema, and writing a second builder for it is how the two would
            // stop agreeing about `x-order`.
            items: toSchema(row.columns ?? []),
            // Absent rather than null when uncapped — the backend reads
            // "no `maxItems`" as "as many rows as they like".
            ...(row.maxItems ? { maxItems: row.maxItems } : {}),
          }
        : {}),
    };
  });

  return {
    type: "object",
    required: rows.filter((row) => row.required).map((row) => row.key),
    properties,
  };
}

/** §16 describes a field by its shape: `ตัวเลข 0–100`, `ตัวเลข · ฟิลด์อ่อนไหว`. */
export function describeField(row: FieldRow): string {
  const parts: string[] = [];

  if (row.multiline) parts.push(messages.requestTypes.fieldMultiline);
  else {
    const base =
      row.type === "select"
        ? messages.requestTypes.fieldSelectCount(row.options?.length ?? 0)
        : messages.requestTypes.fieldTypeLabels[row.type];
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
