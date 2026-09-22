"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  CustomerDetail,
  CustomerDuplicateCheck,
  SegmentOption,
} from "@/lib/api/types";

const m = messages.customers;

/**
 * Client-side twin of the backend checksum (CM-01) — for instant feedback
 * only; the backend re-validates and its answer is the control.
 */
function taxIdChecksumOk(taxId: string): boolean {
  if (!/^\d{13}$/.test(taxId)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(taxId[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(taxId[12]);
}

interface FormValues {
  type: "corporate" | "individual" | "government";
  name_th: string;
  name_en?: string;
  tax_id?: string;
  branch_code?: string;
  branch_name?: string;
  as_draft?: boolean;
  segment_value_ids?: string[];
  locations?: {
    name?: string;
    line1: string;
    line2?: string;
    sub_district?: string;
    district?: string;
    province?: string;
    postal_code?: string;
    is_billing?: boolean;
    is_site?: boolean;
  }[];
  contacts?: {
    name: string;
    role?: string;
    phone?: string;
    email?: string;
    line_id?: string;
    position?: string;
    is_primary?: boolean;
  }[];
}

/**
 * ฟอร์มสร้าง/แก้ไขลูกค้า (CM-01/03) — spec: "ตรวจซ้ำแบบ inline ทันทีที่กรอก
 * เลขภาษี/ชื่อ (ก่อน submit)".
 *
 * The inline check and the submit guard are the same backend rule; this form
 * only surfaces it early. A hard duplicate disables submit outright — the
 * truthful UI for a request the backend will always refuse. A similar-name
 * warning opens the override lane, but only when the session actually holds
 * `crm.customer.dedup.override` (PO 8 ก.ย. 2569); everyone else is told who
 * to ask rather than handed a button that ends in 403.
 */
export function CustomerForm({
  mode,
  canOverride,
  segmentOptions,
  initial,
}: {
  mode: "create" | "edit";
  canOverride: boolean;
  segmentOptions: SegmentOption[];
  initial?: CustomerDetail;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<CustomerDuplicateCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCheck = useCallback(() => {
    const nameTh = (form.getFieldValue("name_th") as string | undefined)?.trim();
    if (!nameTh) {
      setCheck(null);
      return;
    }

    setChecking(true);

    const payload = {
      name_th: nameTh,
      name_en:
        (form.getFieldValue("name_en") as string | undefined) || undefined,
      tax_id: taxIdChecksumOk(
        (form.getFieldValue("tax_id") as string | undefined) ?? "",
      )
        ? (form.getFieldValue("tax_id") as string)
        : undefined,
      branch_code:
        (form.getFieldValue("branch_code") as string | undefined) || undefined,
      exclude_customer_id: initial?.id,
    };

    void appApi<CustomerDuplicateCheck>("customers/check-duplicate", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((result) => {
      setChecking(false);
      if (result.ok) {
        setCheck(result.data);
        // A fresh check invalidates a confirmation given against the old one.
        setConfirmOverride(false);
      }
    });
  }, [form, initial?.id]);

  /** Debounced — the check runs as the user types, not per keystroke. */
  const scheduleCheck = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runCheck, 600);
  }, [runCheck]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const blocked = Boolean(check?.duplicate);
  const similar = check?.similar ?? [];
  const needsOverride = similar.length > 0;

  async function submit(values: FormValues) {
    setError(null);
    setBusy(true);

    const payload: Record<string, unknown> = {
      type: values.type,
      name_th: values.name_th.trim(),
      name_en: values.name_en?.trim() || undefined,
      tax_id: values.tax_id || undefined,
      branch_code: values.branch_code || undefined,
      branch_name: values.branch_name?.trim() || undefined,
    };

    if (mode === "create") {
      payload.status = values.as_draft ? "draft" : "active";
      payload.segment_value_ids = values.segment_value_ids ?? [];
      payload.locations = (values.locations ?? []).filter((l) => l?.line1);
      payload.contacts = (values.contacts ?? []).filter((c) => c?.name);
    }

    if (needsOverride && confirmOverride) {
      payload.confirm_duplicate = true;
      payload.override_reason = overrideReason.trim();
    }

    const result =
      mode === "create"
        ? await appApi<CustomerDetail>("customers", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : await appApi<CustomerDetail>(`customers/${initial!.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });

    setBusy(false);

    if (!result.ok) {
      // The backend saw something the inline check had not yet — surface it
      // through the same panels rather than a generic red bar.
      if (
        result.code === "CRM_CUSTOMER_DUPLICATE" ||
        result.code === "CRM_CUSTOMER_SIMILAR"
      ) {
        runCheck();
      }
      setError(result.message);
      return;
    }

    message.success(
      mode === "create"
        ? m.form.created(result.data.customerCode)
        : m.form.saved,
    );
    router.push(ROUTES.customerDetail(result.data.id));
  }

  const overrideReady =
    !needsOverride || (confirmOverride && overrideReason.trim().length > 0);

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      initialValues={
        initial
          ? {
              type: initial.type,
              name_th: initial.nameTh,
              name_en: initial.nameEn ?? undefined,
              tax_id: initial.taxId ?? undefined,
              branch_code: initial.branchCode,
              branch_name: initial.branchName ?? undefined,
            }
          : {
              type: "corporate",
              branch_code: "00000",
              locations: [],
              contacts: [],
            }
      }
      onFinish={(values) => void submit(values)}
      onValuesChange={(changed) => {
        if (
          "name_th" in changed ||
          "name_en" in changed ||
          "tax_id" in changed ||
          "branch_code" in changed
        ) {
          scheduleCheck();
        }
      }}
    >
      {error && (
        <Alert type="error" showIcon title={error} className="mb-3!" />
      )}

      <Card size="small" title={m.form.sectionMain} className="mb-4">
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            name="type"
            label={m.form.type}
            rules={[{ required: true }]}
          >
            <SearchSelect
              options={Object.entries(m.type).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
          <div />
          <Form.Item
            name="name_th"
            label={m.form.nameTh}
            rules={[{ required: true, message: m.form.errors.nameRequired }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="name_en" label={m.form.nameEn}>
            <Input />
          </Form.Item>
          <Form.Item
            name="tax_id"
            label={m.form.taxId}
            rules={[
              { pattern: /^\d{13}$/, message: m.form.errors.taxIdFormat },
              {
                validator: (_rule, value: string) =>
                  !value || !/^\d{13}$/.test(value) || taxIdChecksumOk(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error(m.form.errors.taxIdChecksum)),
              },
            ]}
          >
            <Input maxLength={13} />
          </Form.Item>
          <Form.Item
            name="branch_code"
            label={m.form.branchCode}
            extra={m.form.branchCodeHint}
            rules={[{ pattern: /^\d{5}$/, message: m.form.errors.branchFormat }]}
          >
            <Input maxLength={5} />
          </Form.Item>
          <Form.Item name="branch_name" label={m.form.branchName}>
            <Input placeholder={m.form.branchNamePlaceholder} />
          </Form.Item>
        </div>

        <DedupPanel
          check={check}
          checking={checking}
          canOverride={canOverride}
          confirmOverride={confirmOverride}
          onConfirmChange={setConfirmOverride}
          overrideReason={overrideReason}
          onReasonChange={setOverrideReason}
        />
      </Card>

      {mode === "create" && (
        <>
          <Card
            size="small"
            title={m.form.sectionLocations}
            className="mb-4"
            extra={
              <Text type="secondary" className="text-xs">
                {m.form.locationsHint}
              </Text>
            }
          >
            <LocationList />
          </Card>

          <Card size="small" title={m.form.sectionContacts} className="mb-4">
            <ContactList />
          </Card>

          <Card size="small" title={m.form.sectionSegments} className="mb-4">
            <Form.Item name="segment_value_ids" className="mb-1!">
              <SearchSelect
                mode="multiple"
                allowClear
                placeholder={m.filterSegment}
                options={segmentOptions.map((option) => ({
                  value: option.id,
                  label: `${option.dimension.nameTh}: ${option.nameTh}`,
                }))}
              />
            </Form.Item>
          </Card>

          <Form.Item name="as_draft" valuePropName="checked" className="mb-3!">
            <Checkbox>{m.form.createAsDraft}</Checkbox>
          </Form.Item>
        </>
      )}

      <Space>
        <Button
          type="primary"
          htmlType="submit"
          loading={busy}
          disabled={blocked || !overrideReady}
        >
          {mode === "create" ? m.form.submitCreate : m.form.submitSave}
        </Button>
        <Button onClick={() => router.back()}>{m.form.cancel}</Button>
      </Space>
    </Form>
  );
}

/**
 * CM-03's three answers, rendered in place under the identity fields:
 * nothing found, a hard block pointing at the existing row, or a warning
 * listing the similar rows with the override lane beside it.
 */
function DedupPanel({
  check,
  checking,
  canOverride,
  confirmOverride,
  onConfirmChange,
  overrideReason,
  onReasonChange,
}: {
  check: CustomerDuplicateCheck | null;
  checking: boolean;
  canOverride: boolean;
  confirmOverride: boolean;
  onConfirmChange: (value: boolean) => void;
  overrideReason: string;
  onReasonChange: (value: string) => void;
}) {
  if (checking) {
    return (
      <Text type="secondary" className="text-xs">
        {m.dedup.checking}
      </Text>
    );
  }

  if (!check) return null;

  if (check.duplicate) {
    const existing = check.duplicate;
    return (
      <Alert
        type="error"
        showIcon
        title={m.dedup.duplicateTitle}
        description={
          <Space direction="vertical" size={6}>
            <span>{m.dedup.duplicateBody}</span>
            <Link href={ROUTES.customerDetail(existing.id)}>
              {existing.customerCode} · {existing.nameTh}
              {existing.branchName ? ` · ${existing.branchName}` : ""}
            </Link>
            <Link href={ROUTES.customerDetail(existing.id)}>
              <Button size="small">{m.dedup.useExisting}</Button>
            </Link>
          </Space>
        }
      />
    );
  }

  const headOfficeNote = check.headOffice ? (
    <Alert
      type="info"
      showIcon
      title={m.dedup.headOfficeTitle}
      description={
        <Space direction="vertical" size={4}>
          <span>{m.dedup.headOfficeBody(check.headOffice.customerCode)}</span>
          <Link href={ROUTES.customerDetail(check.headOffice.id)}>
            {check.headOffice.customerCode} · {check.headOffice.nameTh}
          </Link>
        </Space>
      }
    />
  ) : null;

  if (!check.similar.length) {
    return (
      headOfficeNote ?? (
        <Text type="success" className="text-xs">
          {m.dedup.clear}
        </Text>
      )
    );
  }

  return (
    <Alert
      type="warning"
      showIcon
      title={m.dedup.similarTitle}
      description={
        <Space direction="vertical" size={6} className="w-full">
          <span>{m.dedup.similarBody}</span>
          {check.similar.map((row) => (
            <div key={row.id}>
              <Link href={ROUTES.customerDetail(row.id)}>
                {row.customerCode} · {row.nameTh}
              </Link>{" "}
              <Tag>{m.dedup.similarity((row.similarity * 100).toFixed(0))}</Tag>
            </div>
          ))}
          <Divider className="my-1!" />
          {canOverride ? (
            <>
              <Checkbox
                checked={confirmOverride}
                onChange={(event) => onConfirmChange(event.target.checked)}
              >
                {m.dedup.confirmCreate}
              </Checkbox>
              {confirmOverride && (
                <>
                  <Input.TextArea
                    rows={2}
                    value={overrideReason}
                    onChange={(event) => onReasonChange(event.target.value)}
                    placeholder={m.dedup.overrideReason}
                  />
                  {!overrideReason.trim() && (
                    <Text type="secondary" className="text-xs">
                      {m.dedup.overrideReasonRequired}
                    </Text>
                  )}
                </>
              )}
            </>
          ) : (
            <Text type="secondary" className="text-xs">
              {m.dedup.confirmNoPermission}
            </Text>
          )}
        </Space>
      }
    />
  );
}

function LocationList() {
  return (
    <Form.List name="locations">
      {(fields, { add, remove }) => (
        <div className="space-y-3">
          {fields.map((field) => (
            <Card key={field.key} size="small" className="bg-neutral-50">
              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                <Form.Item
                  name={[field.name, "name"]}
                  label={m.form.locationName}
                  extra={m.form.locationNameHint}
                >
                  <Input />
                </Form.Item>
                <Form.Item label={m.form.locationRoles} className="mb-0!">
                  <Space direction="vertical" size={0}>
                    <Form.Item
                      name={[field.name, "is_billing"]}
                      valuePropName="checked"
                      className="mb-0!"
                    >
                      <Checkbox>{m.form.roleBilling}</Checkbox>
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "is_site"]}
                      valuePropName="checked"
                      className="mb-0!"
                    >
                      <Checkbox>{m.form.roleSite}</Checkbox>
                    </Form.Item>
                  </Space>
                </Form.Item>
              </div>
              <Form.Item
                name={[field.name, "line1"]}
                label={m.form.addressLine1}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-4">
                <Form.Item
                  name={[field.name, "sub_district"]}
                  label={m.form.subDistrict}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, "district"]}
                  label={m.form.district}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, "province"]}
                  label={m.form.province}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, "postal_code"]}
                  label={m.form.postalCode}
                  rules={[{ pattern: /^\d{5}$/, message: m.form.errors.branchFormat }]}
                >
                  <Input maxLength={5} />
                </Form.Item>
              </div>
              <Button danger size="small" onClick={() => remove(field.name)}>
                {m.form.removeLocation}
              </Button>
            </Card>
          ))}
          <Button onClick={() => add({ is_billing: true, is_site: true })}>
            {m.form.addLocation}
          </Button>
        </div>
      )}
    </Form.List>
  );
}

function ContactList() {
  return (
    <Form.List name="contacts">
      {(fields, { add, remove }) => (
        <div className="space-y-3">
          {fields.map((field) => (
            <Card key={field.key} size="small" className="bg-neutral-50">
              <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
                <Form.Item
                  name={[field.name, "name"]}
                  label={m.form.contactName}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, "role"]}
                  label={m.form.contactRole}
                  initialValue="other"
                >
                  <SearchSelect
                    options={Object.entries(m.form.contactRoles).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </Form.Item>
                <Form.Item
                  name={[field.name, "position"]}
                  label={m.form.contactPosition}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, "phone"]}
                  label={m.form.contactPhone}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, "email"]}
                  label={m.form.contactEmail}
                  rules={[{ type: "email" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name={[field.name, "line_id"]}
                  label={m.form.contactLineId}
                >
                  <Input />
                </Form.Item>
              </div>
              <Space>
                <Form.Item
                  name={[field.name, "is_primary"]}
                  valuePropName="checked"
                  className="mb-0!"
                >
                  <Checkbox>{m.form.contactPrimary}</Checkbox>
                </Form.Item>
                <Button danger size="small" onClick={() => remove(field.name)}>
                  {m.form.removeLocation}
                </Button>
              </Space>
            </Card>
          ))}
          <Button onClick={() => add({ role: "other" })}>
            {m.form.addContact}
          </Button>
        </div>
      )}
    </Form.List>
  );
}
