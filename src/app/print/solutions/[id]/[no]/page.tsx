import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SolutionProposalPrint } from "@/components/presales/solution-proposal-print";
import { getSolutionProposal } from "@/lib/api/presales";
import { SESSION_EXPIRED_PATH } from "@/lib/routes";
import { getSession } from "@/lib/session";

/**
 * CD-137 ข้อเสนอทางเทคนิคฉบับพิมพ์ — นอก `/pages` จึงไม่มี app shell ติดลง
 * กระดาษ. ใครอ่าน Solution ได้ก็พิมพ์ได้ (Pre-Sales หรือเซลส์ของดีล) — backend
 * ตัดสินเอง, ปฏิเสธเวอร์ชันที่ยังไม่อนุมัติ และตัดต้นทุนออกจากข้อมูลชุดนี้.
 */
type Params = { params: Promise<{ id: string; no: string }> };

const versionOf = (no: string) => {
  const value = Number(no);
  return Number.isInteger(value) && value > 0 ? value : null;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, no } = await params;
  const versionNo = versionOf(no);
  const result = versionNo ? await getSolutionProposal(id, versionNo) : null;
  // ชื่อแท็บ = ชื่อไฟล์ตั้งต้นตอน "บันทึกเป็น PDF"
  return {
    title: result?.ok
      ? `${result.data.deal?.opportunityCode ?? "Solution"}-TP-v${result.data.version.versionNo}`
      : "ข้อเสนอทางเทคนิค",
  };
}

export default async function SolutionProposalPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect(SESSION_EXPIRED_PATH);

  const { id, no } = await params;
  const versionNo = versionOf(no);
  if (!versionNo) notFound();
  const result = await getSolutionProposal(id, versionNo);
  // SCOPE-03 404, or a version not approved (409) — nothing to print either way.
  if (!result.ok) notFound();

  return <SolutionProposalPrint view={result.data} />;
}
