"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Alert, Button } from "antd";
import { ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { SolutionProposalView } from "@/lib/api/presales";

const mp = messages.solutionProposal;

const quantity = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 3 });

/** วันที่แบบเอกสารไทย — 30 กันยายน 2569. */
const thaiDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const cell = "border border-gray-400 px-1.5 py-1";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="pp-heading mb-1 border-b border-gray-400 pb-0.5 text-[13px] font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return <div className="text-gray-500">{mp.none}</div>;
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {items.map((item, index) => (
        <li key={index} className="pp-row whitespace-pre-line">
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * CD-137 — ข้อเสนอทางเทคนิค A4 บนหัวกระดาษบริษัท, แบบเดียวกับใบเสนอราคา: HTML
 * ธรรมดาในตัวเอกสารให้พิมพ์ออกมาเหมือนกันทุกเครื่อง. ไม่มีราคาหรือต้นทุนเลย —
 * backend ตัดออกตั้งแต่ข้อมูล ราคาไปอยู่ในใบเสนอราคาแยก.
 */
export function SolutionProposalPrint({ view }: { view: SolutionProposalView }) {
  const { letterhead: lh, solution, deal, version: v, boq } = view;
  const date = v.approvedAt ?? v.lockedAt;

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .pp-sheet { box-shadow: none !important; width: auto !important; min-height: auto !important; padding: 0 !important; }
          .pp-row { break-inside: avoid; }
          .pp-keep { break-inside: avoid; }
          .pp-heading { break-after: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* แถบเครื่องมือ — ไม่ติดลงกระดาษ */}
      <div className="mx-auto mb-4 flex w-[210mm] max-w-full flex-wrap items-center gap-2 px-4 print:hidden">
        <Link href={`${ROUTES.solutionDetail(solution.id)}?v=${v.versionNo}`}>
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
        {v.superseded && (
          <Alert type="warning" showIcon className="w-full" title={mp.supersededBanner} />
        )}
      </div>

      <div className="pp-sheet relative mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white p-[12mm] text-[12px] leading-snug text-gray-900 shadow-lg">
        {v.superseded && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="-rotate-30 text-[110px] font-bold tracking-widest text-gray-300/50 select-none">
              {mp.supersededWatermark}
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

        {/* ลูกค้า / รายละเอียดเอกสาร */}
        <section className="pp-keep mt-3 grid grid-cols-[1fr_auto] gap-3">
          <div className="rounded border border-gray-400 p-2">
            <div className="text-[11px] text-gray-500">{mp.customer}</div>
            <div className="font-semibold">{deal?.partyName ?? mp.none}</div>
            {deal?.customerCode && (
              <div>
                {mp.customerCode} {deal.customerCode}
              </div>
            )}
            {deal?.contactName && (
              <div>
                {mp.attention} {deal.contactName}
              </div>
            )}
          </div>
          <table className="w-[78mm] self-start rounded border border-gray-400">
            <tbody>
              {[
                [mp.dealNo, deal?.opportunityCode ?? mp.none],
                [mp.version, String(v.versionNo)],
                [mp.date, date ? thaiDate(date) : mp.none],
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
          <span className="text-gray-500">{mp.project}</span>{" "}
          <span className="font-semibold">{solution.title}</span>
        </div>

        <Section title={mp.sections.summary}>
          <div className="whitespace-pre-line">{v.summary || mp.none}</div>
        </Section>

        <Section title={mp.sections.design}>
          <div className="whitespace-pre-line">{v.design || mp.none}</div>
        </Section>

        <Section title={mp.sections.scope}>
          <div className="font-semibold">{mp.sections.inScope}</div>
          <Bullets items={v.inScope} />
          <div className="mt-2 font-semibold">{mp.sections.outOfScope}</div>
          <Bullets items={v.outOfScope} />
        </Section>

        <Section title={mp.sections.deliverables}>
          {v.deliverables.length === 0 ? (
            <div className="text-gray-500">{mp.none}</div>
          ) : (
            <ol className="list-decimal space-y-1.5 pl-5">
              {v.deliverables.map((item, index) => (
                <li key={index} className="pp-row">
                  <div className="font-semibold">{item.title}</div>
                  {item.description && (
                    <div className="whitespace-pre-line">{item.description}</div>
                  )}
                  {item.criteria.length > 0 && (
                    <div className="mt-0.5">
                      <span className="text-gray-500">{mp.criteria}:</span>
                      <ul className="list-[circle] pl-5">
                        {item.criteria.map((criterion, i) => (
                          <li key={i}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title={mp.sections.boq}>
          {boq.length === 0 ? (
            <div className="text-gray-500">{mp.none}</div>
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[11px]">
                    <th className={`${cell} w-10`}>{mp.col.no}</th>
                    <th className={`${cell} w-20`}>{mp.col.kind}</th>
                    <th className={`${cell} text-left`}>{mp.col.item}</th>
                    <th className={`${cell} w-24 text-left`}>{mp.col.model}</th>
                    <th className={`${cell} w-16 text-right`}>{mp.col.qty}</th>
                    <th className={`${cell} w-14`}>{mp.col.unit}</th>
                  </tr>
                </thead>
                <tbody>
                  {boq.map((line) => (
                    <tr key={line.lineNo} className="pp-row align-top">
                      <td className={`${cell} text-center`}>{line.lineNo}</td>
                      <td className={`${cell} text-center`}>{line.kindLabel}</td>
                      <td className={cell}>
                        {line.productCode && (
                          <span className="mr-1 text-gray-500">[{line.productCode}]</span>
                        )}
                        {line.name}
                        {line.description && (
                          <div className="whitespace-pre-line text-gray-600">
                            {line.description}
                          </div>
                        )}
                      </td>
                      <td className={cell}>{line.model}</td>
                      <td className={`${cell} text-right`}>{quantity(line.quantity)}</td>
                      <td className={`${cell} text-center`}>{line.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 text-[11px] text-gray-500">{mp.boqNote}</div>
            </>
          )}
        </Section>

        <Section title={mp.sections.assumptions}>
          {view.assumptions.length === 0 ? (
            <div className="text-gray-500">{mp.none}</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[11px]">
                  <th className={`${cell} w-10`}>{mp.col.no}</th>
                  <th className={`${cell} w-28`}>{mp.col.category}</th>
                  <th className={`${cell} text-left`}>{mp.col.text}</th>
                </tr>
              </thead>
              <tbody>
                {view.assumptions.map((item, index) => (
                  <tr key={index} className="pp-row align-top">
                    <td className={`${cell} text-center`}>{index + 1}</td>
                    <td className={cell}>{item.categoryLabel}</td>
                    <td className={`${cell} whitespace-pre-line`}>{item.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title={mp.sections.dependencies}>
          {view.dependencies.length === 0 ? (
            <div className="text-gray-500">{mp.none}</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[11px]">
                  <th className={`${cell} w-10`}>{mp.col.no}</th>
                  <th className={`${cell} text-left`}>{mp.col.text}</th>
                  <th className={`${cell} w-32 text-left`}>{mp.col.owner}</th>
                  <th className={`${cell} w-24`}>{mp.col.neededBy}</th>
                </tr>
              </thead>
              <tbody>
                {view.dependencies.map((item, index) => (
                  <tr key={index} className="pp-row align-top">
                    <td className={`${cell} text-center`}>{index + 1}</td>
                    <td className={`${cell} whitespace-pre-line`}>{item.text}</td>
                    <td className={cell}>{item.owner ?? mp.none}</td>
                    <td className={`${cell} text-center`}>
                      {item.neededBy ? thaiDate(item.neededBy) : mp.none}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* ลายเซ็น */}
        <section className="pp-keep mt-10 grid grid-cols-2 gap-16 px-10 text-center">
          {[mp.signPresales, mp.signCustomer].map((title) => (
            <div key={title}>
              <div className="mx-auto mt-8 w-full border-b border-dotted border-gray-600" />
              <div className="mt-1">(.......................................)</div>
              <div className="font-semibold">{title}</div>
              <div className="text-[11px] text-gray-500">{mp.signDate}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
