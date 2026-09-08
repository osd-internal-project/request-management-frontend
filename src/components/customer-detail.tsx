"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
} from "antd";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import { CUSTOMER_STATUS_COLOR } from "@/components/customer-list";
import { SearchSelect } from "@/components/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  CustomerDetail,
  CustomerFieldChange,
  CustomerTimelineEvent,
  SegmentOption,
} from "@/lib/api/types";

const m = messages.customers;

function formatWhen(iso: string): string {
  const at = new Date(iso);
  return `${at.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  })} ${at.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * หน้ารายละเอียดลูกค้า — the client half. Mutations call the backend and then
 * `router.refresh()`, so the server page re-reads and every tab shows the same
 * row the database holds; no client-side copy of the customer to drift.
 */
export function CustomerDetailView({
  customer,
  history,
  timeline,
  segmentOptions,
  canManage,
}: {
  customer: CustomerDetail;
  history: CustomerFieldChange[];
  timeline: CustomerTimelineEvent[];
  segmentOptions: SegmentOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);

  const isAlias = Boolean(customer.mergedIntoCustomerId);
  const editable = canManage && !isAlias;

  async function act(path: string, body?: unknown) {
    setError(null);
    const result = await appApi(`customers/${customer.id}/${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    message.success(m.detail.statusChanged);
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      {isAlias && customer.mergedInto && (
        <Alert
          type="warning"
          showIcon
          title={m.detail.mergedInto(customer.mergedInto.customerCode)}
          action={
            <Link href={ROUTES.customerDetail(customer.mergedInto.id)}>
              {m.dedup.useExisting}
            </Link>
          }
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <Title level={4} className="mb-1!">
            {customer.customerCode} · {customer.nameTh}
          </Title>
          <Space size={6} wrap>
            <Tag color={CUSTOMER_STATUS_COLOR[customer.status]}>
              {m.status[customer.status] ?? customer.status}
            </Tag>
            <Tag>{m.type[customer.type]}</Tag>
            {customer.branchCode === "00000" ? (
              <Tag color="purple">{m.detail.headOfficeTag}</Tag>
            ) : (
              <Tag color="purple">
                {`${m.detail.branch} ${customer.branchCode}`}
                {customer.branchName ? ` · ${customer.branchName}` : ""}
              </Tag>
            )}
            {customer.kycVerified ? (
              <Tag color="blue">{m.kycVerified}</Tag>
            ) : (
              <Tag>{m.kycNotVerified}</Tag>
            )}
          </Space>
        </div>
        {editable && (
          <Space>
            <Link href={ROUTES.customerEdit(customer.id)}>
              <Button>{m.detail.edit}</Button>
            </Link>
            <LifecycleButtons status={customer.status} onAct={act} />
          </Space>
        )}
      </div>

      {!customer.kycVerified && (
        <Text type="secondary" className="block text-xs">
          {m.kycHint}
        </Text>
      )}

      {customer.headOffice && (
        <Text type="secondary" className="block text-xs">
          {m.detail.headOfficeOf("")}
          <Link href={ROUTES.customerDetail(customer.headOffice.id)}>
            {customer.headOffice.customerCode} · {customer.headOffice.nameTh}
          </Link>
        </Text>
      )}

      <Card size="small">
        <Descriptions
          size="small"
          column={{ xs: 1, md: 3 }}
          items={[
            {
              key: "taxId",
              label: m.detail.taxId,
              // CM-08: absent means the interceptor withheld it — say so
              // instead of rendering a dash that reads as "no tax id".
              children:
                customer.taxId !== undefined && customer.taxId !== null ? (
                  customer.taxId
                ) : (
                  <Text type="secondary">{m.detail.taxIdMasked}</Text>
                ),
            },
            {
              key: "branch",
              label: m.detail.branch,
              children: `${customer.branchCode}${
                customer.branchName ? ` · ${customer.branchName}` : ""
              }`,
            },
            {
              key: "owner",
              label: m.detail.owner,
              children: customer.accountOwner?.displayName ?? "—",
            },
            {
              key: "created",
              label: m.detail.createdAt,
              children: formatWhen(customer.createdAt),
            },
            {
              key: "updated",
              label: m.detail.updatedAt,
              children: formatWhen(customer.updatedAt),
            },
            ...(customer.suspendReason && customer.status === "suspended"
              ? [
                  {
                    key: "suspendReason",
                    label: m.detail.reasonLabel,
                    children: customer.suspendReason,
                  },
                ]
              : []),
            ...(customer.deactivateReason && customer.status === "inactive"
              ? [
                  {
                    key: "deactivateReason",
                    label: m.detail.reasonLabel,
                    children: customer.deactivateReason,
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Tabs
        defaultActiveKey={searchParams.get("tab") ?? "contacts"}
        items={[
          {
            key: "contacts",
            label: `${m.detail.tabContacts} · ${customer.contacts.length}`,
            children: (
              <ContactsTab
                customer={customer}
                editable={editable}
                onError={setError}
              />
            ),
          },
          {
            key: "locations",
            label: `${m.detail.tabLocations} · ${customer.locations.length}`,
            children: (
              <LocationsTab
                customer={customer}
                editable={editable}
                onError={setError}
                openAdd={searchParams.get("add") === "1"}
              />
            ),
          },
          ...(customer.branchCustomers.length
            ? [
                {
                  key: "branchCustomers",
                  label: `${m.detail.tabBranchCustomers} · ${customer.branchCustomers.length}`,
                  children: (
                    <BranchCustomersTab rows={customer.branchCustomers} />
                  ),
                },
              ]
            : []),
          {
            key: "segments",
            label: m.form.sectionSegments,
            children: (
              <SegmentsTab
                customer={customer}
                segmentOptions={segmentOptions}
                editable={editable}
                onError={setError}
              />
            ),
          },
          {
            key: "history",
            label: m.detail.tabHistory,
            children: <HistoryTab history={history} />,
          },
          {
            key: "timeline",
            label: m.detail.tabTimeline,
            children: <TimelineTab timeline={timeline} />,
          },
        ]}
      />

      {/* C360-01: the future tabs are named now so the page's shape is
          settled — each arrives with its module, gated before fetch. */}
      <Text type="secondary" className="block text-xs">
        {m.detail.futureTabsHint}
      </Text>
    </div>
  );
}

/** CM-04 — only the transitions the table allows are offered. */
function LifecycleButtons({
  status,
  onAct,
}: {
  status: CustomerDetail["status"];
  onAct: (path: string, body?: unknown) => Promise<boolean>;
}) {
  const [dialog, setDialog] = useState<"suspend" | "deactivate" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canActivate = ["draft", "suspended", "inactive"].includes(status);
  const canSuspend = status === "active";
  const canDeactivate = ["draft", "active", "suspended"].includes(status);

  async function confirm() {
    setBusy(true);
    const done = await onAct(dialog!, { reason: reason.trim() });
    setBusy(false);
    if (done) {
      setDialog(null);
      setReason("");
    }
  }

  return (
    <>
      {canActivate && (
        <Button type="primary" onClick={() => void onAct("activate")}>
          {m.detail.activate}
        </Button>
      )}
      {canSuspend && (
        <Button onClick={() => setDialog("suspend")}>{m.detail.suspend}</Button>
      )}
      {canDeactivate && (
        <Button danger onClick={() => setDialog("deactivate")}>
          {m.detail.deactivate}
        </Button>
      )}

      <Modal
        open={dialog !== null}
        title={
          dialog === "suspend" ? m.detail.suspendTitle : m.detail.deactivateTitle
        }
        okText={dialog === "suspend" ? m.detail.suspend : m.detail.deactivate}
        okButtonProps={{ danger: dialog === "deactivate", disabled: !reason.trim() }}
        confirmLoading={busy}
        cancelText={m.form.cancel}
        onCancel={() => {
          setDialog(null);
          setReason("");
        }}
        onOk={() => void confirm()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          {dialog === "deactivate" && (
            <Text type="secondary" className="text-xs">
              {m.detail.deactivateHint}
            </Text>
          )}
          <Input.TextArea
            rows={3}
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={m.detail.reasonLabel}
          />
          {!reason.trim() && (
            <Text type="secondary" className="text-xs">
              {m.detail.reasonRequired}
            </Text>
          )}
        </Space>
      </Modal>
    </>
  );
}

interface ContactFormState {
  id?: string;
  name: string;
  role: string;
  position?: string;
  phone?: string;
  email?: string;
  line_id?: string;
  is_primary?: boolean;
}

function ContactsTab({
  customer,
  editable,
  onError,
}: {
  customer: CustomerDetail;
  editable: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ContactFormState | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing?.name.trim()) return;
    setBusy(true);
    onError(null);

    const path = editing.id
      ? `customers/${customer.id}/contacts/${editing.id}`
      : `customers/${customer.id}/contacts`;

    const result = await appApi(path, {
      method: editing.id ? "PATCH" : "POST",
      body: JSON.stringify({
        name: editing.name.trim(),
        role: editing.role,
        position: editing.position || undefined,
        phone: editing.phone || undefined,
        email: editing.email || undefined,
        line_id: editing.line_id || undefined,
        is_primary: editing.is_primary ?? false,
      }),
    });

    setBusy(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(contactId: string) {
    onError(null);
    const result = await appApi(
      `customers/${customer.id}/contacts/${contactId}`,
      { method: "DELETE" },
    );
    if (!result.ok) onError(result.message);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {editable && (
        <Button onClick={() => setEditing({ name: "", role: "other" })}>
          {m.form.addContact}
        </Button>
      )}

      <Table
        rowKey="id"
        size="small"
        dataSource={customer.contacts}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={m.detail.noContacts}
            />
          ),
        }}
        pagination={false}
        columns={[
          {
            title: m.form.contactName,
            dataIndex: "name",
            render: (name: string, row: CustomerDetail["contacts"][number]) => (
              <Space size={4}>
                {name}
                {row.isPrimary && <Tag color="blue">{m.form.contactPrimary}</Tag>}
              </Space>
            ),
          },
          {
            title: m.form.contactRole,
            dataIndex: "role",
            render: (role: string) => m.form.contactRoles[role] ?? role,
          },
          { title: m.form.contactPosition, dataIndex: "position" },
          { title: m.form.contactPhone, dataIndex: "phone" },
          { title: m.form.contactEmail, dataIndex: "email" },
          ...(editable
            ? [
                {
                  title: "",
                  key: "actions",
                  render: (
                    _: unknown,
                    row: CustomerDetail["contacts"][number],
                  ) => (
                    <Space>
                      <Button
                        size="small"
                        onClick={() =>
                          setEditing({
                            id: row.id,
                            name: row.name,
                            role: row.role,
                            position: row.position ?? undefined,
                            phone: row.phone ?? undefined,
                            email: row.email ?? undefined,
                            line_id: row.lineId ?? undefined,
                            is_primary: row.isPrimary,
                          })
                        }
                      >
                        {m.detail.edit}
                      </Button>
                      <Popconfirm
                        title={m.detail.deleteContactConfirm}
                        onConfirm={() => void remove(row.id)}
                      >
                        <Button size="small" danger>
                          {m.form.removeLocation}
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={editing !== null}
        title={editing?.id ? m.detail.edit : m.form.addContact}
        okText={m.form.submitSave}
        cancelText={m.form.cancel}
        confirmLoading={busy}
        okButtonProps={{ disabled: !editing?.name.trim() }}
        onCancel={() => setEditing(null)}
        onOk={() => void save()}
        destroyOnHidden
      >
        {editing && (
          <Space direction="vertical" className="w-full">
            <Input
              placeholder={m.form.contactName}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <SearchSelect
              className="w-full"
              value={editing.role}
              onChange={(value) =>
                setEditing({ ...editing, role: value as string })
              }
              options={Object.entries(m.form.contactRoles).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <Input
              placeholder={m.form.contactPosition}
              value={editing.position}
              onChange={(e) =>
                setEditing({ ...editing, position: e.target.value })
              }
            />
            <Input
              placeholder={m.form.contactPhone}
              value={editing.phone}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
            />
            <Input
              placeholder={m.form.contactEmail}
              value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            />
            <Input
              placeholder={m.form.contactLineId}
              value={editing.line_id}
              onChange={(e) =>
                setEditing({ ...editing, line_id: e.target.value })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_primary ?? false}
                onChange={(e) =>
                  setEditing({ ...editing, is_primary: e.target.checked })
                }
              />
              {m.form.contactPrimary}
            </label>
          </Space>
        )}
      </Modal>
    </div>
  );
}

interface LocationFormState {
  id?: string;
  name?: string;
  line1: string;
  line2?: string;
  sub_district?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  is_billing: boolean;
  is_site: boolean;
}

const NEW_LOCATION: LocationFormState = {
  line1: "",
  is_billing: true,
  is_site: true,
};

/** CM-01 (redesign #2) — ที่อยู่/ไซต์ของลูกค้ารายนี้. */
function LocationsTab({
  customer,
  editable,
  onError,
  openAdd,
}: {
  customer: CustomerDetail;
  editable: boolean;
  onError: (message: string | null) => void;
  openAdd?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<LocationFormState | null>(
    openAdd && editable ? NEW_LOCATION : null,
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing?.line1.trim()) return;
    setBusy(true);
    onError(null);

    const path = editing.id
      ? `customers/${customer.id}/locations/${editing.id}`
      : `customers/${customer.id}/locations`;

    const result = await appApi(path, {
      method: editing.id ? "PATCH" : "POST",
      body: JSON.stringify({
        name: editing.name?.trim() || undefined,
        line1: editing.line1.trim(),
        line2: editing.line2 || undefined,
        sub_district: editing.sub_district || undefined,
        district: editing.district || undefined,
        province: editing.province || undefined,
        postal_code: editing.postal_code || undefined,
        is_billing: editing.is_billing,
        is_site: editing.is_site,
      }),
    });

    setBusy(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(locationId: string) {
    onError(null);
    const result = await appApi(
      `customers/${customer.id}/locations/${locationId}`,
      { method: "DELETE" },
    );
    if (!result.ok) onError(result.message);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      {editable && (
        <Button onClick={() => setEditing(NEW_LOCATION)}>
          {m.form.addLocation}
        </Button>
      )}

      {!customer.locations.length && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={m.detail.noLocations}
        />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {customer.locations.map((location) => (
          <Card
            key={location.id}
            size="small"
            title={location.name ?? m.form.locationName}
            extra={
              editable && (
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      setEditing({
                        id: location.id,
                        name: location.name ?? undefined,
                        line1: location.line1,
                        line2: location.line2 ?? undefined,
                        sub_district: location.subDistrict ?? undefined,
                        district: location.district ?? undefined,
                        province: location.province ?? undefined,
                        postal_code: location.postalCode ?? undefined,
                        is_billing: location.isBilling,
                        is_site: location.isSite,
                      })
                    }
                  >
                    {m.detail.edit}
                  </Button>
                  <Popconfirm
                    title={m.detail.deleteLocationConfirm}
                    onConfirm={() => void remove(location.id)}
                  >
                    <Button size="small" danger>
                      {m.form.removeLocation}
                    </Button>
                  </Popconfirm>
                </Space>
              )
            }
          >
            <div className="space-y-1 text-sm">
              <Space size={4} wrap>
                {location.isBilling && (
                  <Tag color="geekblue">{m.detail.billingLoc}</Tag>
                )}
                {location.isSite && <Tag color="green">{m.detail.site}</Tag>}
                {location.isPrimary && <Tag>{m.detail.primaryLoc}</Tag>}
              </Space>
              <div>
                {location.line1}
                {location.line2 ? ` ${location.line2}` : ""}
                <br />
                {[location.subDistrict, location.district, location.province]
                  .filter(Boolean)
                  .join(" ")}{" "}
                {location.postalCode ?? ""}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={editing !== null}
        title={editing?.id ? m.detail.edit : m.form.addLocation}
        okText={m.form.submitSave}
        cancelText={m.form.cancel}
        confirmLoading={busy}
        okButtonProps={{ disabled: !editing?.line1.trim() }}
        onCancel={() => setEditing(null)}
        onOk={() => void save()}
        destroyOnHidden
      >
        {editing && (
          <Space direction="vertical" className="w-full">
            <Input
              placeholder={m.form.locationName}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <Space size={12} wrap>
              <Checkbox
                checked={editing.is_billing}
                onChange={(e) =>
                  setEditing({ ...editing, is_billing: e.target.checked })
                }
              >
                {m.form.roleBilling}
              </Checkbox>
              <Checkbox
                checked={editing.is_site}
                onChange={(e) =>
                  setEditing({ ...editing, is_site: e.target.checked })
                }
              >
                {m.form.roleSite}
              </Checkbox>
            </Space>

            <Input
              placeholder={m.form.addressLine1}
              value={editing.line1}
              onChange={(e) => setEditing({ ...editing, line1: e.target.value })}
            />
            <Input
              placeholder={m.form.addressLine2}
              value={editing.line2}
              onChange={(e) => setEditing({ ...editing, line2: e.target.value })}
            />
            <Space.Compact className="w-full">
              <Input
                placeholder={m.form.subDistrict}
                value={editing.sub_district}
                onChange={(e) =>
                  setEditing({ ...editing, sub_district: e.target.value })
                }
              />
              <Input
                placeholder={m.form.district}
                value={editing.district}
                onChange={(e) =>
                  setEditing({ ...editing, district: e.target.value })
                }
              />
            </Space.Compact>
            <Space.Compact className="w-full">
              <Input
                placeholder={m.form.province}
                value={editing.province}
                onChange={(e) =>
                  setEditing({ ...editing, province: e.target.value })
                }
              />
              <Input
                placeholder={m.form.postalCode}
                value={editing.postal_code}
                maxLength={5}
                onChange={(e) =>
                  setEditing({ ...editing, postal_code: e.target.value })
                }
              />
            </Space.Compact>
          </Space>
        )}
      </Modal>
    </div>
  );
}

/** สาขาในเครือ — the branch-customers linked to this head office. */
function BranchCustomersTab({
  rows,
}: {
  rows: CustomerDetail["branchCustomers"];
}) {
  if (!rows.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={m.detail.noBranchCustomers}
      />
    );
  }

  return (
    <Table
      size="small"
      rowKey="id"
      pagination={false}
      dataSource={rows}
      columns={[
        {
          title: m.detail.branchColumns.code,
          dataIndex: "customerCode",
          render: (code: string, row) => (
            <Link href={ROUTES.customerDetail(row.id)}>{code}</Link>
          ),
        },
        {
          title: m.detail.branchColumns.branch,
          dataIndex: "branchCode",
        },
        {
          title: m.detail.branchColumns.name,
          dataIndex: "branchName",
          render: (name: string | null) => name ?? "—",
        },
        {
          title: m.detail.branchColumns.status,
          dataIndex: "status",
          render: (status: string) => (
            <Tag color={CUSTOMER_STATUS_COLOR[status]}>
              {m.status[status] ?? status}
            </Tag>
          ),
        },
      ]}
    />
  );
}

function SegmentsTab({
  customer,
  segmentOptions,
  editable,
  onError,
}: {
  customer: CustomerDetail;
  segmentOptions: SegmentOption[];
  editable: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [selected, setSelected] = useState<string[]>(
    customer.segments.map((assignment) => assignment.value.id),
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    onError(null);

    const result = await appApi(`customers/${customer.id}/segments`, {
      method: "PUT",
      body: JSON.stringify({ segment_value_ids: selected }),
    });

    setBusy(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    message.success(m.detail.segmentsSaved);
    router.refresh();
  }

  return (
    <Space direction="vertical" className="w-full max-w-xl">
      <SearchSelect
        mode="multiple"
        allowClear
        className="w-full"
        disabled={!editable}
        value={selected}
        onChange={(value) => setSelected(value as string[])}
        options={segmentOptions.map((option) => ({
          value: option.id,
          label: `${option.dimension.nameTh}: ${option.nameTh}`,
        }))}
      />
      {editable && (
        <Button type="primary" loading={busy} onClick={() => void save()}>
          {m.detail.saveSegments}
        </Button>
      )}
    </Space>
  );
}

/** CM-01 — ใคร แก้อะไร เมื่อไร ค่าก่อน/หลัง. */
function HistoryTab({ history }: { history: CustomerFieldChange[] }) {
  return (
    <Table
      rowKey="id"
      size="small"
      dataSource={history}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={m.detail.noHistory}
          />
        ),
      }}
      pagination={{ pageSize: 20, showSizeChanger: false }}
      columns={[
        {
          title: m.detail.historyColumns.field,
          dataIndex: "field",
          render: (field: string) => m.detail.fieldNames[field] ?? field,
        },
        {
          title: m.detail.historyColumns.before,
          dataIndex: "before",
          render: (value: unknown) => renderValue(value),
        },
        {
          title: m.detail.historyColumns.after,
          dataIndex: "after",
          render: (value: unknown) => renderValue(value),
        },
        {
          title: m.detail.historyColumns.changedBy,
          dataIndex: "changedByName",
          render: (value: string | null) =>
            value ?? <Text type="secondary">—</Text>,
        },
        {
          title: m.detail.historyColumns.changedAt,
          dataIndex: "changedAt",
          render: (value: string) => formatWhen(value),
        },
      ]}
    />
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <Text type="secondary">—</Text>;
  }
  return String(value);
}

/** C360-03 — append-only feed; already permission-filtered at the backend. */
function TimelineTab({ timeline }: { timeline: CustomerTimelineEvent[] }) {
  if (!timeline.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={m.detail.noTimeline}
      />
    );
  }

  return (
    <Timeline
      items={timeline.map((event) => ({
        key: event.id,
        children: (
          <div>
            <div>{event.summary}</div>
            <Text type="secondary" className="text-xs">
              {event.actorName ? `${event.actorName} · ` : ""}
              {formatWhen(event.occurredAt)}
            </Text>
          </div>
        ),
      }))}
    />
  );
}
