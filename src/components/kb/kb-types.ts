/** CD-259 — the shapes the knowledge-base routes return. */

export interface KbCard {
  id: string;
  articleNo: string;
  title: string;
  summary: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  category: { id: string; name: string | null } | null;
  tags: string[];
  productCodes: string[];
  productGroups: string[];
  source: string;
  /** CD-261 — internal · customers · selected */
  audience: "internal" | "customers" | "selected";
  author: string;
  owner: string | null;
  nextReviewOn: string | null;
  reviewState: "none" | "ok" | "due_soon" | "overdue";
  publishedAt: string | null;
  updatedAt: string;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  helpfulPct: number | null;
  score?: number | null;
  /** CD-267 — how a search found it, and the passage that matched by meaning. */
  match?: "keyword" | "meaning" | "both";
  passage?: { heading: string | null; text: string; similarity: number } | null;
}

export interface KbArticle extends KbCard {
  body: string;
  sourceRef: string | null;
  publishedBy: string | null;
  updatedBy: string | null;
  files: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
  }[];
  myRating: { helpful: boolean; comment: string | null } | null;
  customers: { id: string; code: string; name: string }[];
  portalViews: number;
  portalHelpfulYes: number;
  portalHelpfulNo: number;
  version: number;
  ownerId: string | null;
  submittedAt: string | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  lastReviewedAt: string | null;
  mergedInto: { id: string; articleNo: string; title: string } | null;
  openRevision: { id: string | null; status: string; mine: boolean } | null;
  canEdit: boolean;
  canSubmit: boolean;
  canWithdraw: boolean;
  canApprove: boolean;
  canSendBack: boolean;
  canRevise: boolean;
  canConfirmReview: boolean;
  canSetOwner: boolean;
  canMerge: boolean;
  canArchive: boolean;
  canReopen: boolean;
}

/** CD-260 — a reworking of a published article. */
export interface KbRevision {
  id: string;
  articleId: string;
  status: "draft" | "in_review" | "returned" | "approved" | "discarded";
  title: string;
  summary: string | null;
  body: string;
  categoryId: string | null;
  tags: string[];
  productCodes: string[];
  productGroups: string[];
  audience: "internal" | "customers" | "selected";
  customerIds: string[];
  changeNote: string;
  createdBy: string;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  canEdit: boolean;
  canReview: boolean;
}

export interface KbCategory {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  reviewMonths: number | null;
  articles: number;
}

export const STATUS_COLOR: Record<string, string> = {
  draft: "default",
  in_review: "processing",
  published: "success",
  archived: "warning",
};

/** Bangkok short date. */
export const shortDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : "—";

export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/** Categories as "parent › child" options, parents first. */
export function categoryOptions(items: KbCategory[], activeOnly = true) {
  const byId = new Map(items.map((c) => [c.id, c]));
  return items
    .filter((c) => !activeOnly || c.active)
    .map((c) => ({
      value: c.id,
      label:
        c.parentId && byId.get(c.parentId)
          ? `${byId.get(c.parentId)!.name} › ${c.name}`
          : c.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "th"));
}

export const REVIEW_COLOR: Record<string, string> = {
  due_soon: "warning",
  overdue: "error",
};

/**
 * CD-260 — a line diff (longest common subsequence) between two texts, for
 * comparing versions. Articles are short; n×m is fine up to a few thousand.
 */
export function lineDiff(before: string, after: string) {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length * b.length > 4_000_000) {
    return [
      ...a.map((text) => ({ kind: "del" as const, text })),
      ...b.map((text) => ({ kind: "add" as const, text })),
    ];
  }
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: { kind: "same" | "add" | "del"; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: "del", text: a[i++] });
    } else {
      out.push({ kind: "add", text: b[j++] });
    }
  }
  while (i < a.length) out.push({ kind: "del", text: a[i++] });
  while (j < b.length) out.push({ kind: "add", text: b[j++] });
  return out;
}

export const AUDIENCE_COLOR: Record<string, string> = {
  internal: "default",
  customers: "green",
  selected: "purple",
};
