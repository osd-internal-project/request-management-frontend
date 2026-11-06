"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Space,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { CustomerRow, LeadRow, LeadStatus } from "@/lib/api/types";
import type { CampaignRow } from "@/lib/api/campaigns";

const m = messages.sales.leads;

/** ปลายทางที่ปิดแบบไม่ได้ไปต่อ (backend: kind `lost`) — เลือกได้ตอนคัดออก. */
export const LOST_STATUSES = ["lost", "disqualified"] as const;
export type LostStatus = (typeof LOST_STATUSES)[number];

export function isLeadLost(status: string): status is LostStatus {
  return (LOST_STATUSES as readonly string[]).includes(status);
}

/**
 * Still workable — anything but the closed states (Won / Lost / Disqualified).
 * The list, the detail page and the pipeline all ask this one question; the
 * backend's `requireOpen` is the same rule.
 */
export function isLeadOpen(status: LeadStatus): boolean {
  return status !== "converted" && !isLeadLost(status);
}

/** snake_case exactly as `CreateLeadDto` — one shape for create and edit. */
export interface LeadFormValues {
  name: string;
  contact_name?: string | null;
  contact_position?: string | null;
  phone?: string | null;
  email?: string | null;
  source_code?: string | null;
  /** CD-71 — รหัสแคมเปญ; ว่าง = ไม่ผูก. */
  campaign_code?: string | null;
  note?: string | null;
  name_en?: string | null;
  tax_id?: string | null;
  industry?: string | null;
  company_size?: string | null;
  employee_count?: number | null;
  product_group?: string | null;
  sub_product?: string | null;
  project_revenue?: number | null;
  address_line?: string | null;
  district?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export function leadToFormValues(lead: LeadRow): LeadFormValues {
  return {
    name: lead.name,
    contact_name: lead.contactName,
    contact_position: lead.contactPosition,
    phone: lead.phone,
    email: lead.email,
    source_code: lead.sourceCode,
    campaign_code: lead.campaign?.code ?? null,
    note: lead.note,
    name_en: lead.nameEn,
    tax_id: lead.taxId,
    industry: lead.industry,
    company_size: lead.companySize,
    employee_count: lead.employeeCount,
    product_group: lead.productGroup,
    sub_product: lead.subProduct,
    project_revenue:
      lead.projectRevenue === null ? null : Number(lead.projectRevenue),
    address_line: lead.addressLine,
    district: lead.district,
    province: lead.province,
    postal_code: lead.postalCode,
    country: lead.country,
  };
}

/**
 * Blank text → `null`, so an edit can clear a column and `@IsEmail()` never
 * sees an empty string (which it rejects; `null` it skips).
 */
function toBody(values: LeadFormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      body[key] = trimmed ? trimmed : null;
    } else {
      body[key] = value ?? null;
    }
  }
  return body;
}

/**
 * เพิ่ม/แก้ไข Lead — the full form (ผู้ติดต่อ · บริษัท · ที่อยู่), shared by the
 * register and the detail page so both edit the same fields.
 */
export function LeadFormModal({
  open,
  lead,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = create. */
  lead: LeadRow | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<LeadFormValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // CD-71 — แคมเปญที่เปิดอยู่ (+ แคมเปญเดิมของใบนี้ถ้าปิดไปแล้ว ให้ยังเห็นชื่อ).
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  useEffect(() => {
    if (!open) return;
    void appApi<CampaignRow[]>("campaigns?active=true").then((result) => {
      if (result.ok) setCampaigns(result.data);
    });
  }, [open]);

  async function submit() {
    let values: LeadFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setBusy(true);
    setError(null);
    const result = await appApi<{ id: string }>(
      lead ? `leads/${lead.id}` : "leads",
      {
        method: lead ? "PATCH" : "POST",
        body: JSON.stringify(toBody(values)),
      },
    );
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(lead ? m.form.saved : m.form.created);
    onSaved(result.data.id);
  }

  return (
    <Modal
      open={open}
      title={lead ? m.actions.edit : m.newLead}
      okText={m.form.save}
      confirmLoading={busy}
      width={760}
      onCancel={onClose}
      onOk={() => void submit()}
      mask={{ closable: false }}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Form<LeadFormValues>
        form={form}
        layout="vertical"
        size="small"
        initialValues={lead ? leadToFormValues(lead) : { country: "TH" }}
      >
        <Divider titlePlacement="start" plain className="mt-0!">
          {m.form.sections.contact}
        </Divider>
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label={m.form.name}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: m.form.nameRequired,
                },
              ]}
            >
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="source_code" label={m.columns.source}>
              <Input maxLength={64} placeholder={m.form.source} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="campaign_code"
              label={messages.campaigns.leadField}
            >
              <SearchSelect
                allowClear
                placeholder={messages.campaigns.leadFieldPlaceholder}
                options={[
                  ...campaigns.map((campaign) => ({
                    value: campaign.code,
                    label: `${campaign.code} · ${campaign.name}`,
                  })),
                  ...(lead?.campaign &&
                  !campaigns.some((c) => c.code === lead.campaign?.code)
                    ? [
                        {
                          value: lead.campaign.code,
                          label: `${lead.campaign.code} · ${lead.campaign.name}`,
                        },
                      ]
                    : []),
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="contact_name" label={m.form.contactName}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="contact_position" label={m.form.contactPosition}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label={m.form.phone}>
              <Input maxLength={50} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label={m.form.email}
              rules={[{ type: "email", message: m.form.emailInvalid }]}
            >
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="note" label={m.form.note}>
              <Input.TextArea rows={2} maxLength={2000} />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start" plain>
          {m.form.sections.company}
        </Divider>
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="name_en" label={m.form.nameEn}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="tax_id" label={m.form.taxId}>
              <Input maxLength={20} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="industry" label={m.form.industry}>
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="company_size" label={m.form.companySize}>
              <Input maxLength={60} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="employee_count" label={m.form.employeeCount}>
              <InputNumber className="w-full" min={0} precision={0} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="product_group" label={m.form.productGroup}>
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="sub_product" label={m.form.subProduct}>
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="project_revenue" label={m.form.projectRevenue}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="start" plain>
          {m.form.sections.address}
        </Divider>
        <Row gutter={12}>
          <Col span={24}>
            <Form.Item name="address_line" label={m.form.addressLine}>
              <Input maxLength={500} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="district" label={m.form.district}>
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="province" label={m.form.province}>
              <Input maxLength={120} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="postal_code" label={m.form.postalCode}>
              <Input maxLength={10} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="country" label={m.form.country}>
              <Input maxLength={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

/**
 * คัดออก — ปิดเป็น Lost หรือ Disqualified, เหตุผลบังคับ ไม่มีการลบ.
 * `initialStatus` อ่านครั้งเดียวตอน mount — ผู้เรียกที่เปลี่ยนค่านี้ได้ (ลากการ์ด
 * ไปคอลัมน์ Lost) ต้องใส่ `key` ให้ modal เกิดใหม่.
 */
export function DisqualifyLeadModal({
  lead,
  initialStatus = "disqualified",
  onClose,
  onDone,
}: {
  lead: LeadRow | null;
  initialStatus?: LostStatus;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [status, setStatus] = useState<LostStatus>(initialStatus);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disqualify() {
    if (!lead || !reason.trim()) return;
    setBusy(true);
    setError(null);
    const result = await appApi(`leads/${lead.id}/disqualify`, {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim(), status }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.disqualified);
    setReason("");
    onDone();
  }

  return (
    <Modal
      open={lead !== null}
      title={m.disqualifyTitle}
      okText={m.actions.disqualify}
      okButtonProps={{ danger: true, disabled: !reason.trim() }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void disqualify()}
      destroyOnHidden
    >
      <Space direction="vertical" className="w-full">
        {error && <Alert type="error" showIcon title={error} />}
        <Space>
          <Text>{m.closeAs}</Text>
          <Radio.Group
            optionType="button"
            value={status}
            onChange={(e) => setStatus(e.target.value as LostStatus)}
            options={LOST_STATUSES.map((value) => ({
              value,
              label: m.status[value],
            }))}
          />
        </Space>
        <Input.TextArea
          rows={2}
          placeholder={m.disqualifyReason}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Space>
    </Modal>
  );
}

/** สั่ง agent หา Lead ตามหัวข้อ — สร้างงาน `lead.find` แล้วส่ง id กลับให้เปิดหน้างาน. */
export function FindLeadModal({
  open,
  onClose,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  onStarted: (recordId: string) => void;
}) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!topic.trim()) return;
    setBusy(true);
    setError(null);
    const result = await appApi<{ id: string }>("leads/find", {
      method: "POST",
      body: JSON.stringify({ topic: topic.trim() }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setTopic("");
    onStarted(result.data.id);
  }

  return (
    <Modal
      open={open}
      title={m.findLead.title}
      okText={m.findLead.search}
      okButtonProps={{ disabled: !topic.trim() }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void start()}
      destroyOnHidden
    >
      <Space direction="vertical" className="w-full">
        {error && <Alert type="error" showIcon title={error} />}
        <Text>{m.findLead.topicLabel}</Text>
        <Input
          name="topic"
          autoFocus
          maxLength={500}
          placeholder={m.findLead.topicPlaceholder}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onPressEnter={() => void start()}
        />
      </Space>
    </Modal>
  );
}

/** แปลงเป็นโอกาสการขาย — ข้อมูลไหลต่อ; ต้องชี้ลูกค้าในทะเบียน. */
export function ConvertLeadModal({
  lead,
  customers,
  onClose,
  onDone,
}: {
  lead: LeadRow | null;
  customers: CustomerRow[];
  onClose: () => void;
  onDone: (opportunityId: string) => void;
}) {
  const { message } = App.useApp();
  const [customerId, setCustomerId] = useState<string | undefined>(
    lead?.customerId ?? undefined,
  );
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convert() {
    if (!lead) return;
    setBusy(true);
    setError(null);
    const result = await appApi<{ id: string; opportunityCode: string }>(
      `leads/${lead.id}/convert`,
      {
        method: "POST",
        body: JSON.stringify({
          // PO 10 ก.ย. 2569: ว่าง = ผู้มุ่งหวัง — ทะเบียนลูกค้าเกิดตอนเปิดใบสั่งขาย
          customer_id: customerId || undefined,
          title: title.trim() || undefined,
          amount: amount ?? undefined,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.converted(result.data.opportunityCode));
    onDone(result.data.id);
  }

  return (
    <Modal
      open={lead !== null}
      title={m.convertTitle}
      okText={m.actions.convert}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void convert()}
      destroyOnHidden
    >
      <Space direction="vertical" className="w-full">
        {error && <Alert type="error" showIcon title={error} />}
        {lead && lead.discovery_missing?.length > 0 && (
          <Alert
            type="warning"
            showIcon
            title={m.discovery.convertWarning(
              lead.discovery_missing
                .map((item) => m.discovery.item[item])
                .join(", "),
            )}
          />
        )}
        <Text type="secondary" className="text-xs">
          {m.convertHint}
        </Text>
        <SearchSelect
          className="w-full"
          allowClear
          placeholder={m.convertCustomer}
          value={customerId}
          onChange={(value) =>
            setCustomerId((value as string | undefined) || undefined)
          }
          options={customers.map((customer) => ({
            value: customer.id,
            label: `${customer.customerCode} · ${customer.nameTh}${
              customer.branchName ? ` (${customer.branchName})` : ""
            }`,
          }))}
        />
        <Input
          placeholder={m.convertTitleField}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <InputNumber
          className="w-full"
          placeholder={m.convertAmount}
          min={0}
          value={amount}
          onChange={(value) => setAmount(value)}
        />
      </Space>
    </Modal>
  );
}

/** A person the owner picker can offer — `DirectoryUser` trimmed to what it shows. */
export interface LeadOwnerOption {
  id: string;
  displayName: string;
}

/**
 * แก้การ์ด "ข้อมูล Lead" — ผู้รับผิดชอบ, แหล่งที่มา, ลูกค้าในทะเบียน, บันทึก.
 *
 * Two routes, both `crm.lead.manage`: the fields go through `PATCH leads/{id}`
 * and the owner through `PATCH leads/{id}/owner` (audit + race guard live there).
 * Fields first: once the lead is handed to someone else a seller who sees only
 * their own leads can no longer reach it, and the second write would 404.
 * Mount it only while open, so every opening starts from the lead as it is now.
 */
export function LeadInfoModal({
  open,
  lead,
  customers,
  canReadCustomers,
  people,
  me,
  onClose,
  onSaved,
}: {
  open: boolean;
  lead: LeadRow & { owner: LeadOwnerOption | null };
  customers: CustomerRow[];
  canReadCustomers: boolean;
  /** Empty when the viewer lacks `user.read` — then only "take it myself" is offered. */
  people: LeadOwnerOption[];
  me: LeadOwnerOption;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mi = m.detail.infoEdit;
  const { message } = App.useApp();
  const [ownerId, setOwnerId] = useState<string | undefined>(
    lead.owner?.id ?? undefined,
  );
  const [customerId, setCustomerId] = useState<string | undefined>(
    lead.customerId ?? undefined,
  );
  const [note, setNote] = useState(lead.note ?? "");
  const [source, setSource] = useState(lead.sourceCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the current owner and the viewer stay pickable even outside the directory page
  const ownerOptions = [me, ...(lead.owner ? [lead.owner] : []), ...people]
    .filter(
      (person, index, all) =>
        all.findIndex((other) => other.id === person.id) === index,
    )
    .map((person) => ({
      value: person.id,
      label:
        person.id === me.id
          ? mi.ownerSelf(person.displayName)
          : person.displayName,
    }));

  const customerOptions = [
    ...(lead.customer &&
    !customers.some((customer) => customer.id === lead.customer?.id)
      ? [
          {
            value: lead.customer.id,
            label: `${lead.customer.customerCode} · ${lead.customer.nameTh}`,
          },
        ]
      : []),
    ...customers.map((customer) => ({
      value: customer.id,
      label: `${customer.customerCode} · ${customer.nameTh}${
        customer.branchName ? ` (${customer.branchName})` : ""
      }`,
    })),
  ];

  const ownerChanged = ownerId !== undefined && ownerId !== lead.owner?.id;
  const trimmedNote = note.trim();
  const fields: Record<string, unknown> = {};
  if (trimmedNote !== (lead.note ?? "").trim()) {
    fields.note = trimmedNote || null;
  }
  if (source.trim() !== (lead.sourceCode ?? "").trim()) {
    fields.source_code = source.trim() || null;
  }
  if (canReadCustomers && (customerId ?? null) !== (lead.customerId ?? null)) {
    fields.customer_id = customerId ?? null;
  }

  async function save() {
    setBusy(true);
    setError(null);

    if (Object.keys(fields).length > 0) {
      const result = await appApi(`leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      if (!result.ok) {
        setBusy(false);
        setError(result.message);
        return;
      }
    }

    if (ownerChanged) {
      // claiming from the pool keeps the backend's race guard: no owner_user_id
      const claim = !lead.owner && ownerId === me.id;
      const result = await appApi(`leads/${lead.id}/owner`, {
        method: "PATCH",
        body: JSON.stringify(claim ? {} : { owner_user_id: ownerId }),
      });
      if (!result.ok) {
        setBusy(false);
        setError(result.message);
        return;
      }
    }

    setBusy(false);
    message.success(mi.saved);
    onSaved();
  }

  return (
    <Modal
      open={open}
      title={mi.title}
      okText={mi.save}
      okButtonProps={{
        disabled: !ownerChanged && Object.keys(fields).length === 0,
      }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void save()}
      mask={{ closable: false }}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Form layout="vertical" size="small">
        <Form.Item
          label={m.detail.fields.owner}
          extra={
            people.length === 0
              ? mi.ownerOnlySelf
              : ownerChanged && ownerId !== me.id
                ? mi.ownerHint
                : undefined
          }
        >
          <SearchSelect
            className="w-full"
            placeholder={mi.ownerPlaceholder}
            value={ownerId}
            onChange={(value) =>
              setOwnerId((value as string | undefined) || undefined)
            }
            options={ownerOptions}
          />
        </Form.Item>
        <Form.Item label={m.columns.source}>
          <Input
            maxLength={64}
            placeholder={m.form.source}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </Form.Item>
        <Form.Item
          label={m.detail.fields.customer}
          extra={canReadCustomers ? undefined : mi.customerNoAccess}
        >
          <SearchSelect
            className="w-full"
            allowClear
            disabled={!canReadCustomers}
            placeholder={mi.customerPlaceholder}
            value={customerId}
            onChange={(value) =>
              setCustomerId((value as string | undefined) || undefined)
            }
            options={customerOptions}
          />
        </Form.Item>
        <Form.Item label={m.detail.fields.note}>
          <Input.TextArea
            rows={4}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
