import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuotationPrint } from "@/components/crm/quotations/quotation-print";
import { getQuotationPrint } from "@/lib/api/sales";
import { HOME_PATH, SESSION_EXPIRED_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * ใบเสนอราคาฉบับพิมพ์ — นอก `/pages` จึงไม่มี app shell (เมนู/หัวหน้าจอ) ติดลง
 * กระดาษ. การป้องกันยังครบ: proxy บังคับ login ทุก path, หน้านี้ gate สิทธิ์เอง
 * และ backend ตัดต้นทุน/margin ออกจากข้อมูลชุดนี้ทั้งหมด.
 */
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const result = await getQuotationPrint(id);
  // ชื่อแท็บ = ชื่อไฟล์ตั้งต้นตอน "บันทึกเป็น PDF"
  return {
    title: result.ok
      ? `${result.data.quotation.quotationNo}-v${result.data.quotation.version}`
      : "ใบเสนอราคา",
  };
}

export default async function QuotationPrintPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect(SESSION_EXPIRED_PATH);
  if (!can(session, "crm.sales.read")) redirect(HOME_PATH);

  const { id } = await params;
  const result = await getQuotationPrint(id);
  // SCOPE-03: unseen answers 404 — render the same.
  if (!result.ok) notFound();

  return <QuotationPrint view={result.data} />;
}
