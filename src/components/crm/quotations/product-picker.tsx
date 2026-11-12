"use client";

import { useEffect, useState } from "react";
import { App, Button, Divider, Input, Modal, Space } from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import {
  createProduct,
  searchProducts,
  type ProductRow,
} from "@/lib/api/products";
import { messages } from "@/lib/messages";

const m = messages.sales.quotations.detail;

/** Server search is debounced — one request per pause, not per keystroke. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * CD-27 — ช่องรหัสสินค้าบนบรรทัดใบเสนอราคา: เลือกจากรายการสินค้าจาก SAP
 * (สำเนาใน CTD) แทนการพิมพ์เอง — รหัสที่ SAP ไม่รู้จักทำให้ใบสั่งขายถูกปฏิเสธ
 * ตอนส่ง. เลือกแล้วเติมรายละเอียด/หน่วยให้ถ้ายังว่าง; ล้างได้สำหรับบรรทัดบริการ.
 *
 * `canAdd` (หน้าราคา/ต้นทุน ผู้มีสิทธิ์ตั้งราคา) — ยังไม่มี ERP จึงเพิ่มสินค้าที่
 * ค้นไม่เจอได้จากช่องนี้เลย; เซิร์ฟเวอร์ตรวจสิทธิ์อีกชั้น.
 */
export function ProductPicker({
  value,
  onPick,
  onClear,
  canAdd = false,
}: {
  value: string;
  onPick: (product: ProductRow) => void;
  onClear: () => void;
  canAdd?: boolean;
}) {
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<{
    code: string;
    name: string;
    unit: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!adding) return;
    setSaving(true);
    const result = await createProduct({
      code: adding.code.trim(),
      name: adding.name.trim(),
      ...(adding.unit.trim() ? { unit: adding.unit.trim() } : {}),
    });
    setSaving(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.productAdded(result.data.code));
    setFound([result.data, ...found]);
    setAdding(null);
    onPick(result.data);
  }

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
    <>
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
        open={open}
        onOpenChange={setOpen}
        popupRender={
          canAdd
            ? (menu) => (
                <>
                  {menu}
                  <Divider className="!my-1" />
                  <Button
                    type="link"
                    size="small"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      const code = search.trim().replace(/\s+/g, "");
                      setOpen(false);
                      setAdding({ code, name: "", unit: "" });
                    }}
                  >
                    {m.productAdd(search.trim())}
                  </Button>
                </>
              )
            : undefined
        }
        onChange={(code) => {
          if (!code) return onClear();
          const product = found.find((row) => row.code === code);
          if (product) onPick(product);
        }}
      />
      <Modal
        open={!!adding}
        title={m.productAddTitle}
        okText={m.productSave}
        okButtonProps={{
          loading: saving,
          disabled:
            !adding?.code.trim() ||
            /\s/.test(adding.code.trim()) ||
            !adding.name.trim(),
        }}
        onOk={() => void add()}
        onCancel={() => setAdding(null)}
        destroyOnHidden
      >
        {adding && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">{m.productAddHint}</Text>
            <div>
              <Text type="secondary">{m.productCode}</Text>
              <Input
                maxLength={50}
                value={adding.code}
                onChange={(event) =>
                  setAdding({ ...adding, code: event.target.value })
                }
              />
            </div>
            <div>
              <Text type="secondary">{m.productName}</Text>
              <Input
                maxLength={200}
                value={adding.name}
                onChange={(event) =>
                  setAdding({ ...adding, name: event.target.value })
                }
              />
            </div>
            <div>
              <Text type="secondary">{m.productUnit}</Text>
              <Input
                maxLength={30}
                value={adding.unit}
                onChange={(event) =>
                  setAdding({ ...adding, unit: event.target.value })
                }
              />
            </div>
          </Space>
        )}
      </Modal>
    </>
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
