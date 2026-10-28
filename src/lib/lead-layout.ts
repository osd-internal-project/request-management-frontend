/** ตาราง = ทะเบียนเต็ม, การ์ด = กระดานแยกตามสถานะ. อยู่ใน URL จึง bookmark ได้. */
export type LeadLayout = "table" | "board";

/**
 * มุมมองที่ผู้ใช้เลือกล่าสุดในหน้า Lead — เก็บเป็น cookie ไม่ใช่ localStorage
 * เพราะหน้า server (`app/pages/leads/page.tsx`) ต้องรู้ก่อน render ว่าจะดึงกี่แถว
 * และวาดอะไร; URL ที่ระบุ `layout` มาเองยังชนะเสมอ.
 *
 * อยู่ไฟล์นี้ ไม่ใช่ `lead-list.tsx`, เพราะไฟล์นั้นเป็น "use client" — หน้า server
 * เรียกฟังก์ชันที่ export จากไฟล์ client ไม่ได้.
 */
export const LEAD_LAYOUT_COOKIE = "leads-layout";

export function parseLeadLayout(value: string | undefined): LeadLayout | null {
  return value === "board" || value === "table" ? value : null;
}

/** เรียกจากฝั่ง browser เท่านั้น. หนึ่งปี; path=/ เพราะลิงก์เข้าหน้า Lead มาจากหลายที่. */
export function rememberLeadLayout(layout: LeadLayout) {
  document.cookie = `${LEAD_LAYOUT_COOKIE}=${layout}; path=/; max-age=31536000; samesite=lax`;
}
