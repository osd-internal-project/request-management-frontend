/**
 * CD-271 ปฏิทินคอนเทนต์
 *
 * Service: core-service — `/macom/content`
 */

export const CONTENT_CHANNELS = [
  "line_oa",
  "facebook",
  "tiktok",
  "instagram",
  "website",
  "email",
] as const;
export type ContentChannel = (typeof CONTENT_CHANNELS)[number];

export type ContentStatus = "draft" | "ready" | "published" | "cancelled";

export interface ContentItem {
  id: string;
  title: string;
  channel: ContentChannel;
  caption: string;
  planned_at: string;
  status: ContentStatus;
  owner: { id: string; name: string };
  campaign: { id: string; name: string } | null;
  published_at: string | null;
  published_url: string | null;
  cancel_reason: string | null;
  version: number;
  copied_from_id: string | null;
}

export interface ContentDetail extends ContentItem {
  files: {
    id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  }[];
}
