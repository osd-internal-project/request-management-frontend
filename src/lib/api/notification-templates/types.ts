/** CD-54 — one event's wording: standard (in code) and the company's own. */
export interface NotificationTemplateRow {
  event_type: string;
  label: string;
  variables: { name: string; label: string; sample: string }[];
  standard: { title: string; body: string };
  /** null = the standard wording is in use. */
  custom: { title: string; body: string; updated_at: string } | null;
}

/** Same rule as the backend: `{{name}}` filled, anything missing empty. */
export function renderPreview(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(
    /\{\{\s*([a-z_]+)\s*\}\}/g,
    (_, name: string) => values[name] ?? "",
  );
}
