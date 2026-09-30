"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ExpiryState,
  PartnerBrand,
  PartnerCertification,
  PartnerContact,
  PartnerDetail,
} from "@/lib/api/presales";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const mp = messages.presales.partners;
const CATEGORIES = ["certificate", "datasheet", "catalog", "other"] as const;
const CONTACT_FIELDS = ["name", "role", "phone", "email"] as const;

function ExpiryTag({ state }: { state: ExpiryState }) {
  if (state === "expired") return <Tag color="red">{mp.expiry.expired}</Tag>;
  if (state === "expiring")
    return <Tag color="orange">{mp.expiry.expiring}</Tag>;
  return null;
}

function DateCell({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <DatePicker
      className="w-full"
      disabled={disabled}
      value={value ? dayjs(value) : null}
      onChange={(date) => onChange(date ? date.format("YYYY-MM-DD") : "")}
    />
  );
}

/**
 * CD-142 — a partner: SAP's commercial facts read-only, the technical profile
 * (summary, brands with levels, certificates, contacts) editable by Pre-Sales,
 * and reference documents.
 */
export function PartnerDetailView({ partner }: { partner: PartnerDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const canManage = partner.can_manage;
  const stored = partner.profile;
  const [summary, setSummary] = useState(stored.summary);
  const [brands, setBrands] = useState<PartnerBrand[]>(
    stored.brands.map(({ brand, level, expiresOn }) => ({
      brand,
      level,
      expiresOn,
    })),
  );
  const [certs, setCerts] = useState<PartnerCertification[]>(
    stored.certifications.map(({ name, holders, expiresOn }) => ({
      name,
      holders,
      expiresOn,
    })),
  );
  const [contacts, setContacts] = useState<PartnerContact[]>(stored.contacts);
  const [category, setCategory] = useState<string>("certificate");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const base = `presales/partners/${encodeURIComponent(partner.code)}`;

  const expiryOf = useMemo(() => {
    const brandState = new Map(
      stored.brands.map((row) => [row.brand, row.expiry]),
    );
    const certState = new Map(
      stored.certifications.map((row) => [row.name, row.expiry]),
    );
    return { brand: brandState, cert: certState };
  }, [stored]);

  const dirty =
    summary !== stored.summary ||
    JSON.stringify(brands) !==
      JSON.stringify(
        stored.brands.map(({ brand, level, expiresOn }) => ({
          brand,
          level,
          expiresOn,
        })),
      ) ||
    JSON.stringify(certs) !==
      JSON.stringify(
        stored.certifications.map(({ name, holders, expiresOn }) => ({
          name,
          holders,
          expiresOn,
        })),
      ) ||
    JSON.stringify(contacts) !== JSON.stringify(stored.contacts);

  async function run(path: string, init: RequestInit, done: string) {
    setBusy(true);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return false;
    }
    void message.success(done);
    router.refresh();
    return true;
  }

  const save = () =>
    run(
      base,
      {
        method: "PUT",
        body: JSON.stringify({
          summary,
          brands: brands.map((row) => ({
            brand: row.brand,
            level: row.level,
            expires_on: row.expiresOn,
          })),
          certifications: certs.map((row) => ({
            name: row.name,
            holders: row.holders,
            expires_on: row.expiresOn,
          })),
          contacts,
        }),
      },
      mp.saved,
    );

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("category", category);
    await run(`${base}/files`, { method: "POST", body }, mp.uploaded);
    if (fileInput.current) fileInput.current.value = "";
  }

  const update = <T,>(list: T[], index: number, patch: Partial<T>) =>
    list.map((row, i) => (i === index ? { ...row, ...patch } : row));
  const removeAt = <T,>(list: T[], index: number) =>
    list.filter((_, i) => i !== index);
  const removeButton = (onClick: () => void) =>
    canManage ? (
      <Button
        size="small"
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={onClick}
      />
    ) : null;

  const vendor = partner.vendor;

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={ROUTES.partners}>
            <Button type="link" icon={<ArrowLeftOutlined />} className="!px-0">
              {mp.back}
            </Button>
          </Link>
          <Title level={3} className="!mb-0">
            {partner.name}
          </Title>
          <Space size="small" wrap>
            <Text type="secondary">{partner.code}</Text>
            {vendor && !vendor.active && <Tag color="red">{mp.blocked}</Tag>}
            {stored.updatedAt && (
              <Text type="secondary" className="text-xs">
                {mp.updated(dayjs(stored.updatedAt).format("D MMM YYYY HH:mm"))}
              </Text>
            )}
          </Space>
        </div>
        {canManage && (
          <Button
            type="primary"
            loading={busy}
            disabled={!dirty}
            onClick={() => void save()}
          >
            {mp.save}
          </Button>
        )}
      </div>

      <Card title={mp.sapFacts} size="small">
        {vendor ? (
          <Descriptions size="small" column={{ xs: 1, md: 3 }}>
            <Descriptions.Item label={mp.taxId}>
              {vendor.taxId ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label={mp.phone}>
              {vendor.phone ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label={mp.email}>
              {vendor.email ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label={mp.currency}>
              {vendor.currency ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label={mp.paymentTerms}>
              {vendor.paymentTerms ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label={mp.status}>
              {vendor.active ? mp.active : mp.blocked}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert type="warning" showIcon title={mp.notInSap} />
        )}
      </Card>

      <Card title={mp.technical} size="small">
        <Space orientation="vertical" className="w-full" size="middle">
          {dirty && canManage && (
            <Alert type="info" showIcon title={mp.unsaved} />
          )}
          <div>
            <Text strong>{mp.summary}</Text>
            <Input.TextArea
              className="mt-1"
              rows={3}
              maxLength={5000}
              value={summary}
              disabled={!canManage}
              placeholder={mp.summaryPlaceholder}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          <div>
            <Text strong>{mp.brands}</Text>
            <Table
              className="mt-1"
              rowKey={(_, index) => String(index)}
              size="small"
              pagination={false}
              dataSource={brands}
              scroll={{ x: 640 }}
              columns={[
                {
                  title: mp.brand,
                  render: (_: unknown, row, index) => (
                    <Input
                      value={row.brand}
                      maxLength={300}
                      disabled={!canManage}
                      onChange={(event) =>
                        setBrands(
                          update(brands, index, { brand: event.target.value }),
                        )
                      }
                    />
                  ),
                },
                {
                  title: mp.level,
                  render: (_: unknown, row, index) => (
                    <Input
                      value={row.level}
                      maxLength={300}
                      disabled={!canManage}
                      onChange={(event) =>
                        setBrands(
                          update(brands, index, { level: event.target.value }),
                        )
                      }
                    />
                  ),
                },
                {
                  title: mp.expiresOn,
                  width: 220,
                  render: (_: unknown, row, index) => (
                    <Space>
                      <DateCell
                        value={row.expiresOn}
                        disabled={!canManage}
                        onChange={(value) =>
                          setBrands(update(brands, index, { expiresOn: value }))
                        }
                      />
                      <ExpiryTag
                        state={expiryOf.brand.get(row.brand) ?? "none"}
                      />
                    </Space>
                  ),
                },
                {
                  key: "actions",
                  width: 48,
                  render: (_: unknown, __, index) =>
                    removeButton(() => setBrands(removeAt(brands, index))),
                },
              ]}
            />
            {canManage && (
              <Button
                className="mt-2"
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  setBrands([
                    ...brands,
                    { brand: "", level: "", expiresOn: "" },
                  ])
                }
              >
                {mp.add}
              </Button>
            )}
          </div>

          <div>
            <Text strong>{mp.certifications}</Text>
            <Table
              className="mt-1"
              rowKey={(_, index) => String(index)}
              size="small"
              pagination={false}
              dataSource={certs}
              scroll={{ x: 640 }}
              columns={[
                {
                  title: mp.certName,
                  render: (_: unknown, row, index) => (
                    <Input
                      value={row.name}
                      maxLength={300}
                      disabled={!canManage}
                      onChange={(event) =>
                        setCerts(
                          update(certs, index, { name: event.target.value }),
                        )
                      }
                    />
                  ),
                },
                {
                  title: mp.holders,
                  width: 130,
                  render: (_: unknown, row, index) => (
                    <InputNumber
                      min={1}
                      precision={0}
                      className="w-full"
                      value={row.holders}
                      disabled={!canManage}
                      onChange={(value) =>
                        setCerts(update(certs, index, { holders: value ?? 1 }))
                      }
                    />
                  ),
                },
                {
                  title: mp.expiresOn,
                  width: 220,
                  render: (_: unknown, row, index) => (
                    <Space>
                      <DateCell
                        value={row.expiresOn}
                        disabled={!canManage}
                        onChange={(value) =>
                          setCerts(update(certs, index, { expiresOn: value }))
                        }
                      />
                      <ExpiryTag
                        state={expiryOf.cert.get(row.name) ?? "none"}
                      />
                    </Space>
                  ),
                },
                {
                  key: "actions",
                  width: 48,
                  render: (_: unknown, __, index) =>
                    removeButton(() => setCerts(removeAt(certs, index))),
                },
              ]}
            />
            {canManage && (
              <Button
                className="mt-2"
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  setCerts([...certs, { name: "", holders: 1, expiresOn: "" }])
                }
              >
                {mp.add}
              </Button>
            )}
          </div>

          <div>
            <Text strong>{mp.contacts}</Text>
            <Table
              className="mt-1"
              rowKey={(_, index) => String(index)}
              size="small"
              pagination={false}
              dataSource={contacts}
              scroll={{ x: 720 }}
              columns={[
                ...CONTACT_FIELDS.map((field) => ({
                  title: mp.contactColumns[field],
                  key: field,
                  render: (_: unknown, row: PartnerContact, index: number) => (
                    <Input
                      value={row[field]}
                      maxLength={300}
                      disabled={!canManage}
                      onChange={(event) =>
                        setContacts(
                          update(contacts, index, {
                            [field]: event.target.value,
                          }),
                        )
                      }
                    />
                  ),
                })),
                {
                  key: "actions",
                  width: 48,
                  render: (_: unknown, __: PartnerContact, index: number) =>
                    removeButton(() => setContacts(removeAt(contacts, index))),
                },
              ]}
            />
            {canManage && (
              <Button
                className="mt-2"
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  setContacts([
                    ...contacts,
                    { name: "", role: "", phone: "", email: "" },
                  ])
                }
              >
                {mp.add}
              </Button>
            )}
          </div>
        </Space>
      </Card>

      <Card
        title={mp.files}
        size="small"
        extra={
          canManage && stored.exists ? (
            <Space.Compact>
              <Select
                value={category}
                style={{ width: 140 }}
                onChange={setCategory}
                options={CATEGORIES.map((value) => ({
                  value,
                  label: mp.categories[value],
                }))}
              />
              <Button
                icon={<UploadOutlined />}
                loading={busy}
                onClick={() => fileInput.current?.click()}
              >
                {mp.upload}
              </Button>
            </Space.Compact>
          ) : null
        }
      >
        <input
          ref={fileInput}
          type="file"
          hidden
          onChange={(event) => void upload(event.target.files)}
        />
        <Text type="secondary" className="text-xs">
          {mp.filesHint}
        </Text>
        <Table
          className="mt-2"
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={partner.files}
          columns={[
            {
              title: mp.category,
              dataIndex: "category",
              width: 130,
              render: (value: string) => mp.categories[value] ?? value,
            },
            {
              title: mp.files,
              dataIndex: "fileName",
              render: (name: string, row) => (
                <a
                  href={`/api/app/${base}/files/${row.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {name}
                </a>
              ),
            },
            {
              key: "uploadedAt",
              width: 150,
              render: (_: unknown, row) =>
                dayjs(row.uploadedAt).format("D MMM YYYY"),
            },
            ...(canManage
              ? [
                  {
                    key: "actions",
                    width: 48,
                    render: (
                      _: unknown,
                      row: PartnerDetail["files"][number],
                    ) => (
                      <Popconfirm
                        title={mp.removeFile}
                        onConfirm={() =>
                          void run(
                            `${base}/files/${row.id}`,
                            { method: "DELETE" },
                            mp.removed,
                          )
                        }
                      >
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
    </Space>
  );
}
