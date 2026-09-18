"use client";

import Link from "next/link";
import { Alert, Button } from "antd";
import { ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";
import { bahtText } from "@/lib/baht-text";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { Money, QuotationPrintView } from "@/lib/api/types";

const mp = messages.quotationPrint;

const money = (value: Money) =>
  Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const quantity = (value: Money) =>
  Number(value).toLocaleString("th-TH", { maximumFractionDigits: 3 });

/** วันที่แบบเอกสารไทย — 18 กันยายน 2569. */
const thaiDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * ใบเสนอราคา A4 — หน้าจอแสดงเป็นแผ่นกระดาษพร้อมแถบเครื่องมือ, ตอนพิมพ์เหลือ
 * แต่แผ่น. ใช้ HTML ธรรมดาแทน component ของ antd ในตัวเอกสาร: สิ่งที่พิมพ์ต้อง
 * หน้าตาเหมือนกันทุกเครื่อง ไม่ขึ้นกับ theme ของแอป.
 */
export function QuotationPrint({ view }: { view: QuotationPrintView }) {
  const { quotation: q, billTo, seller, letterhead: lh, isFinal } = view;
  const hasDiscount = q.lines.some((line) => Number(line.discountPct) > 0);
  const discountTotal = Number(q.discountTotal);

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .qt-sheet { box-shadow: none !important; width: auto !important; min-height: auto !important; padding: 0 !important; }
          .qt-row { break-inside: avoid; }
          .qt-keep { break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* แถบเครื่องมือ — ไม่ติดลงกระดาษ */}
      <div className="mx-auto mb-4 flex w-[210mm] max-w-full flex-wrap items-center gap-2 px-4 print:hidden">
        <Link href={ROUTES.quotationDetail(q.id)}>
          <Button icon={<ArrowLeftOutlined />}>{mp.back}</Button>
        </Link>
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
        >
          {mp.print}
        </Button>
        <span className="text-xs text-gray-500">{mp.printHint}</span>
        {!isFinal && (
          <Alert type="warning" showIcon className="w-full" title={mp.draftBanner} />
        )}
      </div>

      <div className="qt-sheet relative mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white p-[12mm] text-[12px] leading-snug text-gray-900 shadow-lg">
        {!isFinal && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="-rotate-30 text-[140px] font-bold tracking-widest text-gray-300/50 select-none">
              {mp.draftWatermark}
            </span>
          </div>
        )}

        {/* หัวกระดาษ */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-gray-800 pb-3">
          <div className="flex min-w-0 gap-3">
            {lh.logo && (
              // eslint-disable-next-line @next/next/no-img-element -- a data URL from settings
              <img src={lh.logo} alt="" className="h-16 w-auto max-w-32 object-contain" />
            )}
            <div className="min-w-0">
              <div className="text-[15px] font-bold">{lh.nameTh}</div>
              {lh.nameEn && <div className="font-semibold">{lh.nameEn}</div>}
              {lh.address && <div className="whitespace-pre-line">{lh.address}</div>}
              {(lh.taxId || lh.branch) && (
                <div>
                  {lh.taxId && `${mp.taxId} ${lh.taxId}`}
                  {lh.taxId && lh.branch && " · "}
                  {lh.branch}
                </div>
              )}
              {(lh.phone || lh.email || lh.website) && (
                <div>
                  {[
                    lh.phone && `${mp.tel} ${lh.phone}`,
                    lh.email && `${mp.email} ${lh.email}`,
                    lh.website,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[20px] font-bold">{mp.docTitle}</div>
            <div className="text-[13px] font-semibold tracking-wide text-gray-600">
              {mp.docTitleEn}
            </div>
          </div>
        </header>

        {/* ผู้ซื้อ / รายละเอียดเอกสาร */}
        <section className="qt-keep mt-3 grid grid-cols-[1fr_auto] gap-3">
          <div className="rounded border border-gray-400 p-2">
            <div className="text-[11px] text-gray-500">{mp.customer}</div>
            <div className="font-semibold">
              {billTo.name}
              {billTo.branch && ` (${billTo.branch})`}
            </div>
            {billTo.address && (
              <div>
                {mp.address} {billTo.address}
              </div>
            )}
            {billTo.taxId && (
              <div>
                {mp.taxId} {billTo.taxId}
              </div>
            )}
            {billTo.customerCode && (
              <div>
                {mp.customerCode} {billTo.customerCode}
              </div>
            )}
            {billTo.contactName && (
              <div>
                {mp.attention} {billTo.contactName}
              </div>
            )}
          </div>
          <table className="w-[78mm] self-start rounded border border-gray-400">
            <tbody>
              {[
                [mp.no, q.quotationNo],
                [mp.version, String(q.version)],
                [mp.date, thaiDate(q.sentAt ?? q.createdAt)],
                [mp.validUntil, q.validUntil ? thaiDate(q.validUntil) : "—"],
                [mp.salesperson, seller?.name ?? "—"],
                ...(q.paymentTerms ? [[mp.paymentTerms, q.paymentTerms]] : []),
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="px-2 py-0.5 align-top whitespace-nowrap text-gray-500">{label}</td>
                  <td className="px-2 py-0.5 text-right font-medium">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="mt-3">
          <span className="text-gray-500">{mp.subject}</span>{" "}
          <span className="font-semibold">{q.title}</span>
        </div>

        {/* รายการ */}
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-[11px]">
              <th className="border border-gray-400 px-1.5 py-1 w-10">{mp.col.no}</th>
              <th className="border border-gray-400 px-1.5 py-1 text-left">{mp.col.description}</th>
              <th className="border border-gray-400 px-1.5 py-1 w-16 text-right">{mp.col.qty}</th>
              <th className="border border-gray-400 px-1.5 py-1 w-14">{mp.col.unit}</th>
              <th className="border border-gray-400 px-1.5 py-1 w-24 text-right">{mp.col.unitPrice}</th>
              {hasDiscount && (
                <th className="border border-gray-400 px-1.5 py-1 w-14 text-right">
                  {mp.col.discount}
                </th>
              )}
              <th className="border border-gray-400 px-1.5 py-1 w-28 text-right">{mp.col.amount}</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((line) => (
              <tr key={line.lineNo} className="qt-row align-top">
                <td className="border border-gray-400 px-1.5 py-1 text-center">{line.lineNo}</td>
                <td className="border border-gray-400 px-1.5 py-1">
                  {line.productCode && (
                    <span className="mr-1 text-gray-500">[{line.productCode}]</span>
                  )}
                  <span className="whitespace-pre-line">{line.description}</span>
                </td>
                <td className="border border-gray-400 px-1.5 py-1 text-right">{quantity(line.quantity)}</td>
                <td className="border border-gray-400 px-1.5 py-1 text-center">{line.unit ?? ""}</td>
                <td className="border border-gray-400 px-1.5 py-1 text-right">{money(line.unitPrice)}</td>
                {hasDiscount && (
                  <td className="border border-gray-400 px-1.5 py-1 text-right">
                    {Number(line.discountPct) > 0 ? `${quantity(line.discountPct)}%` : ""}
                  </td>
                )}
                <td className="border border-gray-400 px-1.5 py-1 text-right">{money(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ยอดรวม */}
        <section className="qt-keep mt-2 grid grid-cols-[1fr_auto] gap-3">
          <div className="self-end rounded bg-gray-100 px-2 py-1.5 font-semibold">
            ({bahtText(Number(q.grandTotal))})
          </div>
          <table className="min-w-[70mm]">
            <tbody>
              <tr>
                <td className="px-2 py-0.5">{mp.subtotal}</td>
                <td className="px-2 py-0.5 text-right">{money(q.subtotal)}</td>
              </tr>
              {discountTotal > 0 && (
                <>
                  <tr>
                    <td className="px-2 py-0.5">{mp.discount}</td>
                    <td className="px-2 py-0.5 text-right">{money(q.discountTotal)}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-0.5">{mp.net}</td>
                    <td className="px-2 py-0.5 text-right">{money(q.netTotal)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td className="px-2 py-0.5">{mp.vat(quantity(q.vatPct))}</td>
                <td className="px-2 py-0.5 text-right">{money(q.vatAmount)}</td>
              </tr>
              <tr className="border-t-2 border-b-2 border-gray-800 font-bold">
                <td className="px-2 py-1">{mp.grandTotal}</td>
                <td className="px-2 py-1 text-right">
                  {money(q.grandTotal)} {q.currency}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {(q.note || lh.terms) && (
          <section className="qt-keep mt-4 space-y-2">
            {q.note && (
              <div>
                <div className="font-semibold">{mp.note}</div>
                <div className="whitespace-pre-line">{q.note}</div>
              </div>
            )}
            {lh.terms && (
              <div>
                <div className="font-semibold">{mp.terms}</div>
                <div className="whitespace-pre-line">{lh.terms}</div>
              </div>
            )}
          </section>
        )}

        {/* ลายเซ็น */}
        <section className="qt-keep mt-10 grid grid-cols-3 gap-6 text-center">
          {[
            { title: mp.signQuoter, name: seller?.name },
            { title: mp.signApprover, name: undefined },
            { title: mp.signCustomer, name: undefined },
          ].map((box) => (
            <div key={box.title}>
              <div className="mx-auto mt-8 w-full border-b border-dotted border-gray-600" />
              <div className="mt-1">{box.name ? `(${box.name})` : "(.......................................)"}</div>
              <div className="font-semibold">{box.title}</div>
              <div className="text-[11px] text-gray-500">{mp.signDate}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
