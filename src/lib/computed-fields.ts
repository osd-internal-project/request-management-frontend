import type { FormSchemaProperty } from "@/lib/api/types";

/**
 * CD-80 — the screen's copy of the server's computed-field rule
 * (`services/core-service/src/requests/computed-fields.ts`). The server
 * recomputes on save and is the authority; this exists so the requester sees
 * the margin before submitting, not after.
 */
export function marginPct(
  value: number | null,
  discountPct: number | null,
  cost: number | null,
): number | null {
  if (value === null || cost === null) return null;
  const net = value * (1 - (discountPct ?? 0) / 100);
  if (!(net > 0)) return null;
  return Math.round(((net - cost) / net) * 10_000) / 100;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isComputedField(property: FormSchemaProperty): boolean {
  return property["x-computed"]?.kind === "margin_pct";
}

/** The form values with every computed field worked out (or removed). */
export function applyComputedFields(
  properties: Record<string, FormSchemaProperty> | undefined,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...values };
  for (const [name, property] of Object.entries(properties ?? {})) {
    const formula = property["x-computed"];
    if (formula?.kind !== "margin_pct") continue;
    const value = marginPct(
      asNumber(result[formula.value]),
      formula.discount_pct ? asNumber(result[formula.discount_pct]) : 0,
      asNumber(result[formula.cost]),
    );
    if (value === null) delete result[name];
    else result[name] = value;
  }
  return result;
}
