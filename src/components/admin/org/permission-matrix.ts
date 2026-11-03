/** The columns every module row shares (`docs/permission-taxonomy.md`). */
export const MATRIX_ACTIONS = ["read", "read.all", "manage"] as const;

export type MatrixAction = (typeof MATRIX_ACTIONS)[number];

export interface MatrixRow {
  /** `<module>.<sub>`, or the module alone for codes like `delivery.read` */
  readonly key: string;
  readonly cells: Partial<Record<MatrixAction, string>>;
  /** codes whose verb is not a column, e.g. `crm.customer.financial.read` */
  readonly chips: readonly string[];
}

const BY_LENGTH = [...MATRIX_ACTIONS].sort((a, b) => b.length - a.length);

function place(code: string): { key: string; action?: MatrixAction } {
  const action = BY_LENGTH.find((candidate) => code.endsWith(`.${candidate}`));
  const segments = code.split(".");

  if (action) {
    const prefix = code.slice(0, -(action.length + 1));
    if (prefix.split(".").length <= 2) return { key: prefix, action };
  }
  // `disbursement.read.any` — an action word in the middle names a verb, not a sub-module
  if (segments.length === 2 || MATRIX_ACTIONS.includes(segments[1] as MatrixAction)) {
    return { key: segments[0] };
  }
  return { key: segments.slice(0, 2).join(".") };
}

/** One row per sub-module, in the order the catalog first names it. */
export function matrixRows(codes: readonly string[]): MatrixRow[] {
  const rows = new Map<string, { cells: Partial<Record<MatrixAction, string>>; chips: string[] }>();

  for (const code of codes) {
    const { key, action } = place(code);
    const row = rows.get(key) ?? { cells: {}, chips: [] };
    if (action) row.cells[action] = code;
    else row.chips.push(code);
    rows.set(key, row);
  }

  return [...rows].map(([key, row]) => ({ key, ...row }));
}
