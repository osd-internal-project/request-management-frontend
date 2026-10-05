/** CD-259 — the shapes the knowledge-base routes return. */

export interface KbCard {
  id: string;
  articleNo: string;
  title: string;
  summary: string | null;
  status: "draft" | "published" | "archived";
  category: { id: string; name: string | null } | null;
  tags: string[];
  productCodes: string[];
  productGroups: string[];
  source: string;
  author: string;
  publishedAt: string | null;
  updatedAt: string;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  helpfulPct: number | null;
  score?: number | null;
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
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
}

export interface KbCategory {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  articles: number;
}

export const STATUS_COLOR: Record<string, string> = {
  draft: "default",
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
