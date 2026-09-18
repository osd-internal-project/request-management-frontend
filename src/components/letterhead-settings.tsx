"use client";

import { useState } from "react";
import { Alert, Button, Card, Input, Space, Upload } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";
import type { CrmConfig } from "@/lib/api/types";

const ml = messages.customers.admin.letterhead;

/** ~375KB after base64 — the backend's `@MaxLength(500_000)`. */
const MAX_LOGO_BYTES = 360 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Field =
  | "letterhead_name_th"
  | "letterhead_name_en"
  | "letterhead_tax_id"
  | "letterhead_branch"
  | "letterhead_address"
  | "letterhead_phone"
  | "letterhead_email"
  | "letterhead_website"
  | "quotation_terms";

function initial(config: CrmConfig): Record<Field, string> {
  return {
    letterhead_name_th: config.letterheadNameTh ?? "",
    letterhead_name_en: config.letterheadNameEn ?? "",
    letterhead_tax_id: config.letterheadTaxId ?? "",
    letterhead_branch: config.letterheadBranch ?? "",
    letterhead_address: config.letterheadAddress ?? "",
    letterhead_phone: config.letterheadPhone ?? "",
    letterhead_email: config.letterheadEmail ?? "",
    letterhead_website: config.letterheadWebsite ?? "",
    quotation_terms: config.quotationTerms ?? "",
  };
}

/**
 * หัวกระดาษใบเสนอราคา — ข้อมูลตามทะเบียนของบริษัทผู้ขาย, โลโก้ และเงื่อนไข
 * ท้ายใบ. ส่งทุกช่องทุกครั้ง: ช่องว่าง = ล้างค่า (backend เก็บเป็น NULL).
 */
export function LetterheadSettings({
  config,
  onCall,
}: {
  config: CrmConfig;
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [values, setValues] = useState(() => initial(config));
  const [logo, setLogo] = useState(config.letterheadLogo ?? "");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (field: Field) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function pickLogo(file: File) {
    setLogoError(null);
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError(ml.logoType);
      return false;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(ml.logoTooLarge);
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
    // Never upload anywhere by itself — the data URL is saved with the form.
    return false;
  }

  async function save() {
    setBusy(true);
    await onCall("config", "PATCH", { ...values, letterhead_logo: logo });
    setBusy(false);
  }

  const text = (field: Field, label: string, maxLength: number) => (
    <div>
      <Text className="mb-1 block text-xs">{label}</Text>
      <Input
        value={values[field]}
        maxLength={maxLength}
        onChange={(e) => set(field)(e.target.value)}
      />
    </div>
  );

  return (
    <Card size="small" title={ml.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {ml.hint}
      </Text>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-40 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data URL; next/image adds nothing
            <img src={logo} alt={ml.logo} className="max-h-18 max-w-36 object-contain" />
          ) : (
            <Text type="secondary" className="text-xs">
              {ml.noLogo}
            </Text>
          )}
        </div>
        <Space orientation="vertical" size={4}>
          <Space>
            <Upload
              accept={LOGO_TYPES.join(",")}
              showUploadList={false}
              beforeUpload={pickLogo}
            >
              <Button size="small" icon={<UploadOutlined />}>
                {ml.chooseLogo}
              </Button>
            </Upload>
            {logo && (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => setLogo("")}
              >
                {ml.removeLogo}
              </Button>
            )}
          </Space>
          <Text type="secondary" className="text-xs">
            {ml.logoHint}
          </Text>
        </Space>
      </div>
      {logoError && <Alert type="error" showIcon title={logoError} className="mb-3" />}

      <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        {text("letterhead_name_th", ml.nameTh, 255)}
        {text("letterhead_name_en", ml.nameEn, 255)}
        {text("letterhead_tax_id", ml.taxId, 20)}
        {text("letterhead_branch", ml.branch, 100)}
        <div className="md:col-span-2">
          <Text className="mb-1 block text-xs">{ml.address}</Text>
          <Input.TextArea
            rows={2}
            maxLength={1000}
            value={values.letterhead_address}
            onChange={(e) => set("letterhead_address")(e.target.value)}
          />
        </div>
        {text("letterhead_phone", ml.phone, 100)}
        {text("letterhead_email", ml.email, 255)}
        {text("letterhead_website", ml.website, 255)}
        <div className="md:col-span-2">
          <Text className="mb-1 block text-xs">{ml.terms}</Text>
          <Input.TextArea
            rows={4}
            maxLength={4000}
            placeholder={ml.termsPlaceholder}
            value={values.quotation_terms}
            onChange={(e) => set("quotation_terms")(e.target.value)}
          />
        </div>
      </div>

      <Button type="primary" className="mt-3" loading={busy} onClick={() => void save()}>
        {ml.save}
      </Button>
    </Card>
  );
}
