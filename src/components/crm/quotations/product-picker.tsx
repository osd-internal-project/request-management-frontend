"use client";

import { useEffect, useState } from "react";
import { SearchSelect } from "@/components/ui/search-select";
import { searchProducts, type ProductRow } from "@/lib/api/products";
import { messages } from "@/lib/messages";

const m = messages.sales.quotations.detail;

/** Server search is debounced — one request per pause, not per keystroke. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * CD-27 — ช่องรหัสสินค้าบนบรรทัดใบเสนอราคา: เลือกจากรายการสินค้าจาก SAP
 * (สำเนาใน CTD) แทนการพิมพ์เอง — รหัสที่ SAP ไม่รู้จักทำให้ใบสั่งขายถูกปฏิเสธ
 * ตอนส่ง. เลือกแล้วเติมรายละเอียด/หน่วยให้ถ้ายังว่าง; ล้างได้สำหรับบรรทัดบริการ.
 */
export function ProductPicker({
  value,
  onPick,
  onClear,
}: {
  value: string;
  onPick: (product: ProductRow) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void searchProducts(search).then((result) => {
        setLoading(false);
        if (result.ok) setFound(result.data);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const options = found.map((product) => ({
    value: product.code,
    label: `${product.code} · ${product.name}`,
  }));
  // A saved code that is not in this page of results still has to show.
  if (value && !options.some((option) => option.value === value)) {
    options.unshift({ value, label: value });
  }

  return (
    <SearchSelect<string>
      className="w-full"
      value={value || undefined}
      placeholder={m.productPlaceholder}
      allowClear
      filterOption={false}
      onSearch={setSearch}
      loading={loading}
      options={options}
      popupMatchSelectWidth={380}
      notFoundContent={m.productNotFound}
      onChange={(code) => {
        if (!code) return onClear();
        const product = found.find((row) => row.code === code);
        if (product) onPick(product);
      }}
    />
  );
}

/**
 * CD-27 — หลายรหัสจากรายการสินค้าจาก SAP (เช่น product ที่เกี่ยวข้องของโอกาส
 * การขาย). แท็กของรหัสที่เลือกไว้แล้วแสดงอยู่เสมอ แม้ไม่อยู่ในผลค้นรอบนี้.
 */
export function ProductMultiPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void searchProducts(search).then((result) => {
        setLoading(false);
        if (result.ok) setFound(result.data);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const options = found.map((product) => ({
    value: product.code,
    label: `${product.code} · ${product.name}`,
  }));
  for (const code of value) {
    if (!options.some((option) => option.value === code)) {
      options.unshift({ value: code, label: code });
    }
  }

  return (
    <SearchSelect<string[]>
      mode="multiple"
      className="w-full"
      value={value}
      placeholder={placeholder ?? m.productPlaceholder}
      allowClear
      filterOption={false}
      onSearch={setSearch}
      loading={loading}
      options={options}
      notFoundContent={m.productNotFound}
      onChange={(codes) => onChange(codes ?? [])}
    />
  );
}
