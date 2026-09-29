"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Divider,
  Input,
  InputNumber,
  Radio,
  Result,
  Select,
} from "antd";
import Title from "antd/es/typography/Title";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { IntakeField, IntakeFormView } from "@/lib/public/intake-types";

const m = messages.publicForm;

type Values = Record<string, unknown>;

interface Contact {
  name: string;
  email: string;
  phone: string;
  company: string;
  tax_id: string;
}

const EMPTY_CONTACT: Contact = {
  name: "",
  email: "",
  phone: "",
  company: "",
  tax_id: "",
};

const blank = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && !value.trim()) ||
  (Array.isArray(value) && !value.length);

/** The input for one field; values match what the backend's submit rules take. */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: IntakeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const text = typeof value === "string" ? value : "";
  switch (field.type) {
    case "multiline":
      return (
        <Input.TextArea
          rows={4}
          value={text}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <InputNumber
          className="w-full!"
          value={typeof value === "number" ? value : null}
          min={field.minimum}
          max={field.maximum}
          onChange={(next) => onChange(next ?? undefined)}
        />
      );
    case "boolean":
      return (
        <Radio.Group
          value={typeof value === "boolean" ? value : undefined}
          onChange={(event) => onChange(event.target.value)}
          options={[
            { value: true, label: field.trueLabel ?? m.yes },
            { value: false, label: field.falseLabel ?? m.no },
          ]}
        />
      );
    case "select":
      return (
        <Select
          className="w-full"
          value={text || undefined}
          onChange={onChange}
          options={field.options ?? []}
        />
      );
    case "date":
      return (
        <DatePicker
          className="w-full"
          format="DD/MM/YYYY"
          value={text ? dayjs(text) : null}
          onChange={(next) =>
            onChange(next ? next.format("YYYY-MM-DD") : undefined)
          }
        />
      );
    case "datetime":
      return (
        <DatePicker
          className="w-full"
          showTime={{ format: "HH:mm" }}
          format="DD/MM/YYYY HH:mm"
          value={text ? dayjs(text) : null}
          onChange={(next) => onChange(next ? next.format() : undefined)}
        />
      );
    case "table":
      return <TableInput field={field} value={value} onChange={onChange} />;
    default:
      return (
        <Input
          value={text}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

/** A table field: one card per row, its columns as fields. */
function TableInput({
  field,
  value,
  onChange,
}: {
  field: IntakeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const rows = Array.isArray(value) ? (value as Values[]) : [];
  const columns = [...(field.columns ?? [])].sort((a, b) => a.order - b.order);
  const full = field.maxItems !== undefined && rows.length >= field.maxItems;
  const update = (index: number, key: string, next: unknown) =>
    onChange(
      rows.map((row, i) => (i === index ? { ...row, [key]: next } : row)),
    );
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <Card
          key={index}
          size="small"
          extra={
            <Button
              size="small"
              type="text"
              danger
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              {m.removeRow}
            </Button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {columns.map((column) => (
              <label key={column.key} className="block text-sm">
                <span className="mb-1 block">
                  {column.label}
                  {column.required && <span className="text-red-500"> *</span>}
                </span>
                <FieldInput
                  field={column}
                  value={row[column.key]}
                  onChange={(next) => update(index, column.key, next)}
                />
              </label>
            ))}
          </div>
        </Card>
      ))}
      <Button
        size="small"
        disabled={full}
        onClick={() => onChange([...rows, {}])}
      >
        {messages.requestForm.tableAddRow}
      </Button>
    </div>
  );
}

/**
 * CD-66 — the form a customer fills from a company's public link: pick what
 * the request is about, fill that type's fields, say how to reach you. On
 * success it shows the request number and the private status link.
 */
export function PublicRequestForm({
  slug,
  form,
}: {
  slug: string;
  form: IntakeFormView;
}) {
  const [typeCode, setTypeCode] = useState<string | undefined>(
    form.types.length === 1 ? form.types[0].code : undefined,
  );
  const [values, setValues] = useState<Values>({});
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{
    request_no: string | null;
    status_token: string;
  } | null>(null);

  const type = form.types.find((entry) => entry.code === typeCode);
  const fields = [...(type?.fields ?? [])].sort((a, b) => a.order - b.order);

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (!type) found.type = m.typePlaceholder;
    for (const field of fields) {
      if (field.required && blank(values[field.key])) {
        found[field.key] = m.required;
      }
    }
    if (!contact.name.trim()) found.name = m.required;
    if (!contact.email.trim() && !contact.phone.trim()) {
      found.email = m.contactRequired;
    }
    if (
      contact.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())
    ) {
      found.email = m.emailInvalid;
    }
    const taxDigits = contact.tax_id.replace(/\D/g, "");
    if (contact.tax_id.trim() && taxDigits.length !== 13) {
      found.tax_id = m.taxIdInvalid;
    }
    return found;
  }

  async function submit() {
    const found = validate();
    setErrors(found);
    setError(null);
    if (Object.keys(found).length || !type) return;
    setBusy(true);
    const response = await fetch(
      `/api/public/forms/${encodeURIComponent(slug)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type_code: type.code,
          form_data: Object.fromEntries(
            Object.entries(values).filter(([, value]) => !blank(value)),
          ),
          contact,
          website,
        }),
      },
    ).catch(() => null);
    setBusy(false);
    const payload = (await response?.json().catch(() => null)) as {
      request_no?: string | null;
      status_token?: string;
      message?: string;
    } | null;
    if (!response?.ok || !payload) {
      setError(payload?.message ?? messages.common.loadError);
      return;
    }
    if (payload.status_token) {
      setReceipt({
        request_no: payload.request_no ?? null,
        status_token: payload.status_token,
      });
    } else {
      // the honeypot's quiet answer — nothing was created
      setReceipt({ request_no: null, status_token: "" });
    }
  }

  function reset() {
    setReceipt(null);
    setValues({});
    setErrors({});
    setTypeCode(form.types.length === 1 ? form.types[0].code : undefined);
  }

  if (receipt) {
    return (
      <Card>
        <Result
          status="success"
          title={m.sentTitle}
          subTitle={
            <>
              <span className="block text-base">
                {receipt.request_no
                  ? m.sentNo(receipt.request_no)
                  : m.sentNoPending}
              </span>
              {receipt.status_token && (
                <span className="mt-2 block">{m.sentHint}</span>
              )}
            </>
          }
          extra={[
            receipt.status_token ? (
              <Button
                key="status"
                type="primary"
                href={ROUTES.publicStatus(receipt.status_token)}
              >
                {m.statusLink}
              </Button>
            ) : null,
            <Button key="again" onClick={reset}>
              {m.another}
            </Button>,
          ]}
        />
      </Card>
    );
  }

  const label = (text: string, required: boolean) => (
    <span className="mb-1 block text-sm">
      {text}
      {required && <span className="text-red-500"> *</span>}
    </span>
  );
  const hint = (key: string) =>
    errors[key] ? (
      <Text type="danger" className="mt-1 block text-xs">
        {errors[key]}
      </Text>
    ) : null;
  const setContactField =
    (key: keyof Contact) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setContact((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Card>
      <Text type="secondary">{form.company_name}</Text>
      <Title level={3} className="mt-1!">
        {form.title ?? m.defaultTitle}
      </Title>
      {form.intro && (
        <Paragraph className="whitespace-pre-line">{form.intro}</Paragraph>
      )}

      <div className="space-y-4">
        <div>
          {label(m.type, true)}
          <Select
            className="w-full"
            placeholder={m.typePlaceholder}
            value={typeCode}
            onChange={(next) => {
              setTypeCode(next);
              setValues({});
              setErrors({});
            }}
            options={form.types.map((entry) => ({
              value: entry.code,
              label: entry.name,
            }))}
          />
          {hint("type")}
        </div>

        {type?.needs_staff && (
          <Alert type="warning" showIcon title={m.needsStaff} />
        )}

        {type && !type.needs_staff && fields.length > 0 && (
          <>
            <Divider titlePlacement="start" className="my-2!">
              {m.details}
            </Divider>
            {fields.map((field) => (
              <div key={field.key}>
                {label(field.label, field.required)}
                <FieldInput
                  field={field}
                  value={values[field.key]}
                  onChange={(next) =>
                    setValues((current) => ({ ...current, [field.key]: next }))
                  }
                />
                {hint(field.key)}
              </div>
            ))}
          </>
        )}

        {type && !type.needs_staff && (
          <>
            <Divider titlePlacement="start" className="my-2!">
              {m.contact}
            </Divider>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                {label(m.contactName, true)}
                <Input
                  value={contact.name}
                  maxLength={200}
                  autoComplete="name"
                  onChange={setContactField("name")}
                />
                {hint("name")}
              </div>
              <div>
                {label(m.contactEmail, false)}
                <Input
                  type="email"
                  value={contact.email}
                  maxLength={200}
                  autoComplete="email"
                  onChange={setContactField("email")}
                />
                {hint("email")}
              </div>
              <div>
                {label(m.contactPhone, false)}
                <Input
                  type="tel"
                  value={contact.phone}
                  maxLength={30}
                  autoComplete="tel"
                  onChange={setContactField("phone")}
                />
              </div>
              <div>
                {label(m.contactCompany, false)}
                <Input
                  value={contact.company}
                  maxLength={200}
                  autoComplete="organization"
                  onChange={setContactField("company")}
                />
              </div>
              <div>
                {label(m.contactTaxId, false)}
                <Input
                  value={contact.tax_id}
                  maxLength={17}
                  inputMode="numeric"
                  onChange={setContactField("tax_id")}
                />
                {hint("tax_id")}
              </div>
            </div>

            {/* The honeypot: out of sight and out of the tab order; people leave it empty. */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 overflow-hidden"
            >
              <label>
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </label>
            </div>

            {error && <Alert type="error" showIcon title={error} />}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text type="secondary" className="text-xs">
                {m.privacy}
              </Text>
              <Button
                type="primary"
                size="large"
                loading={busy}
                onClick={submit}
              >
                {m.submit}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
