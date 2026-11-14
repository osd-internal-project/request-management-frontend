"use client";

import { useRef } from "react";
import Link from "next/link";
import { Alert, Button } from "antd";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const mp = messages.quotationPrint;

/**
 * ใบเสนอราคาตามแบบฟอร์มบริษัท — หน้านี้แสดงไฟล์ PDF ที่ backend วาด
 * (`GET /quotations/:id/pdf`) ซึ่งเป็นไฟล์เดียวกับที่แนบอีเมลถึงลูกค้า.
 *
 * ไม่วาดซ้ำด้วย HTML: แบบฟอร์มต้องมีหัวกระดาษ + กล่องข้อมูลซ้ำทุกหน้าและ
 * "Page n / N" ท้ายกระดาษ ซึ่งการพิมพ์ของเบราว์เซอร์ทำไม่ได้ (Chrome ไม่ซ้ำ
 * หัวตารางที่สูงเกินหนึ่งในสี่ของหน้า) และสองตัววาดจะค่อย ๆ ไม่ตรงกัน.
 */
export function QuotationPrint({
  id,
  fileName,
  isFinal,
}: {
  id: string;
  fileName: string;
  isFinal: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const src = `/api/app/quotations/${id}/pdf`;

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Link href={ROUTES.quotationDetail(id)}>
          <Button icon={<ArrowLeftOutlined />}>{mp.back}</Button>
        </Link>
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => frame.current?.contentWindow?.print()}
        >
          {mp.print}
        </Button>
        <a href={src} download={fileName}>
          <Button icon={<DownloadOutlined />}>{mp.download}</Button>
        </a>
        <span className="text-xs text-gray-500">{mp.printHint}</span>
        {!isFinal && (
          <Alert
            type="warning"
            showIcon
            className="w-full"
            title={mp.draftBanner}
          />
        )}
      </div>
      <iframe
        ref={frame}
        src={src}
        title={fileName}
        className="min-h-0 w-full flex-1 border-0"
      />
    </div>
  );
}
