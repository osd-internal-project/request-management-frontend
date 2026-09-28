"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Collapse,
  Descriptions,
  Space,
  Steps,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import {
  BankOutlined,
  EditOutlined,
  FileTextOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  ConvertLeadModal,
  DisqualifyLeadModal,
  LeadFormModal,
  isLeadOpen,
} from "@/components/crm/leads/lead-actions";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import {
  ACTIVITY_ICON,
  ActivityList,
  ActivityModal,
  formatWhen,
  splitActivities,
} from "@/components/crm/activity-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  CustomerRow,
  LeadActivityType,
  LeadDetail,
  LeadStatus,
  SalesActivity,
} from "@/lib/api/types";

const m = messages.sales.leads;
const md = m.detail;
const ma = md.activities;

/**
 * The pipeline as the page draws it. `converted` is the goal at the end;
 * `disqualified` is not a step — it is the exit, shown as a banner.
 */
const PIPELINE: LeadStatus[] = [
  "new",
  "cannot_contact",
  "contacted",
  "qualified",
  "converted",
];

/** ปุ่มลัดด้านขวา — สี่อย่างที่คนขายทำบ่อย; "บันทึก" อยู่ที่การ์ดผู้ติดต่อ. */
const QUICK_TYPES = ["call", "email", "meeting", "task"] as const;

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

/**
 * หน้ารายละเอียด Lead — pipeline ด้านบน, ผู้ติดต่อซ้าย, ข้อมูล/กิจกรรมกลาง,
 * ปุ่มลัด + กิจกรรมค้างขวา. Every mutation calls the backend and then
 * `router.refresh()`; the server page re-reads, nothing is cached client-side.
 */
export function LeadDetailView({
  lead,
  customers,
  canManage,
}: {
  lead: LeadDetail;
  customers: CustomerRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [disqualifying, setDisqualifying] = useState(false);
  const [converting, setConverting] = useState(false);
  const [logging, setLogging] = useState<LeadActivityType | null>(null);

  const open = isLeadOpen(lead.status);
  const editable = canManage && open;

  const { pending, done } = splitActivities(lead.activities);

  async function setStatus(status: LeadStatus) {
    if (status === lead.status) return;
    setError(null);
    setBusy(true);
    const result = await appApi(`leads/${lead.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.statusChanged);
    router.refresh();
  }

  async function toggleActivity(activity: SalesActivity, completed: boolean) {
    setError(null);
    const result = await appApi(`leads/${lead.id}/activities/${activity.id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(ma.updated);
    router.refresh();
  }

  function onStep(index: number) {
    const target = PIPELINE[index];
    if (target === "converted") setConverting(true);
    else void setStatus(target);
  }

  const currentStep = PIPELINE.indexOf(lead.status);
  const disqualified = lead.status === "disqualified";

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      {lead.status === "converted" && lead.convertedOpportunity && (
        <Alert
          type="success"
          showIcon
          title={md.convertedBanner(lead.convertedOpportunity.opportunityCode)}
          action={
            <Link href={ROUTES.opportunityDetail(lead.convertedOpportunity.id)}>
              <Button size="small" type="primary">
                {md.openOpportunity}
              </Button>
            </Link>
          }
        />
      )}
      {lead.status === "disqualified" && (
        <Alert
          type="warning"
          showIcon
          title={md.disqualifiedBanner(lead.disqualifyReason ?? "")}
        />
      )}

      {/* หัว */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={ROUTES.leads}>
            <Text type="secondary" className="text-xs">
              ← {md.backToList}
            </Text>
          </Link>
          <Title level={4} className="mb-1! mt-1!">
            {lead.name}
          </Title>
          <Space size={6} wrap>
            <Tag color={m.statusColor[lead.status]}>
              {m.status[lead.status] ?? lead.status}
            </Tag>
            {lead.sourceCode && <Tag>{lead.sourceCode}</Tag>}
            {lead.campaign && (
              <Link href={`${ROUTES.leads}?campaign_id=${lead.campaign.id}`}>
                <Tag color="purple">
                  {messages.campaigns.leadField}: {lead.campaign.name}
                </Tag>
              </Link>
            )}
            <Text type="secondary" className="text-xs">
              {md.createdAt(formatWhen(lead.createdAt))}
            </Text>
          </Space>
        </div>
        {editable && (
          <Space wrap>
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              {md.edit}
            </Button>
            <Button type="primary" onClick={() => setConverting(true)}>
              {m.actions.convert}
            </Button>
            <Button danger onClick={() => setDisqualifying(true)}>
              {m.actions.disqualify}
            </Button>
          </Space>
        )}
      </div>

      {/* Pipeline */}
      <Card size="small">
        <Steps
          size="small"
          current={disqualified ? PIPELINE.length : currentStep}
          status={lead.status === "converted" ? "finish" : "process"}
          onChange={editable && !busy ? onStep : undefined}
          items={[
            ...PIPELINE.map((status) => ({
              title: status === "converted" ? md.convertStep : m.status[status],
              disabled: !editable,
              // คัดออก = ออกจาก pipeline ไม่ใช่ผ่านทุกขั้น — ทุกขั้นค้างเป็น wait
              ...(disqualified ? { status: "wait" as const } : {}),
            })),
            ...(disqualified
              ? [{ title: m.status.disqualified, status: "error" as const }]
              : []),
          ]}
        />
        <div className="mt-2 flex items-center justify-between">
          <Text className="text-xs">
            {md.statusLabel}: <b>{m.status[lead.status] ?? lead.status}</b>
          </Text>
          <Text type="secondary" className="text-xs">
            {editable ? md.pipelineHint : open ? "" : md.pipelineClosed}
          </Text>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        {/* ซ้าย — ผู้ติดต่อ */}
        <div className="space-y-4">
          <Card size="small">
            <div className="flex items-start gap-3">
              <Avatar size={40} className="shrink-0 bg-blue-600!">
                {initials(lead.contactName ?? lead.name)}
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium">
                  {lead.contactName ?? lead.name}
                </div>
                {lead.contactPosition && (
                  <Text type="secondary" className="block text-xs">
                    {lead.contactPosition}
                  </Text>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex items-start gap-2">
                <BankOutlined className="mt-0.5 text-gray-400" />
                <span>{lead.name}</span>
              </div>
              {lead.email && (
                <div className="flex items-start gap-2">
                  <MailOutlined className="mt-0.5 text-gray-400" />
                  <a href={`mailto:${lead.email}`} className="break-all">
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-start gap-2">
                  <PhoneOutlined className="mt-0.5 text-gray-400" />
                  <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                </div>
              )}
            </div>
            {editable && (
              <Space className="mt-3" wrap>
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => setLogging("note")}
                >
                  {md.contactCard.logActivity}
                </Button>
                <Button
                  size="small"
                  icon={<MailOutlined />}
                  disabled={!lead.email}
                  href={lead.email ? `mailto:${lead.email}` : undefined}
                  onClick={() => setLogging("email")}
                >
                  {md.contactCard.sendEmail}
                </Button>
              </Space>
            )}
          </Card>

          <Card
            size="small"
            title={md.contactCard.all(lead.contactName ? "1" : "0")}
            extra={
              editable ? (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setEditing(true)}
                />
              ) : null
            }
          >
            {lead.contactName ? (
              <div className="flex items-start gap-2">
                <Avatar size="small">{initials(lead.contactName)}</Avatar>
                <div className="min-w-0 text-xs">
                  <div className="font-medium">
                    {lead.contactName}{" "}
                    <Tooltip title={md.contactCard.primary}>
                      <span className="text-amber-500">★</span>
                    </Tooltip>
                  </div>
                  {lead.contactPosition && (
                    <Text type="secondary" className="block">
                      {lead.contactPosition}
                    </Text>
                  )}
                  {lead.email && <div className="truncate">{lead.email}</div>}
                  {lead.phone && <div>{lead.phone}</div>}
                </div>
              </div>
            ) : (
              <Text type="secondary" className="text-xs">
                {md.contactCard.noContact}
              </Text>
            )}
          </Card>
        </div>

        {/* กลาง — รายละเอียด / กิจกรรม */}
        <Tabs
          items={[
            {
              key: "details",
              label: md.tabs.details,
              children: (
                <div className="space-y-4">
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: "lead",
                        label: md.sections.lead,
                        children: (
                          <Descriptions size="small" column={{ xs: 1, md: 2 }}>
                            <Descriptions.Item label={md.fields.source}>
                              {dash(lead.sourceCode)}
                            </Descriptions.Item>
                            <Descriptions.Item label={md.fields.owner}>
                              {lead.owner.displayName}
                            </Descriptions.Item>
                            <Descriptions.Item label={md.fields.customer}>
                              {lead.customer ? (
                                <Link
                                  href={ROUTES.customerDetail(lead.customer.id)}
                                >
                                  {lead.customer.customerCode} ·{" "}
                                  {lead.customer.nameTh}
                                  {lead.customer.branchName
                                    ? ` · ${lead.customer.branchName}`
                                    : ""}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label={md.fields.convertedTo}>
                              {lead.convertedOpportunity ? (
                                <Link
                                  href={ROUTES.opportunityDetail(
                                    lead.convertedOpportunity.id,
                                  )}
                                >
                                  {lead.convertedOpportunity.opportunityCode} ·{" "}
                                  {lead.convertedOpportunity.title}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </Descriptions.Item>
                            <Descriptions.Item label={md.fields.createdAt}>
                              {formatWhen(lead.createdAt)}
                            </Descriptions.Item>
                            <Descriptions.Item label={md.fields.updatedAt}>
                              {formatWhen(lead.updatedAt)}
                            </Descriptions.Item>
                            {lead.disqualifyReason && (
                              <Descriptions.Item
                                label={md.fields.disqualifyReason}
                                span={2}
                              >
                                {lead.disqualifyReason}
                              </Descriptions.Item>
                            )}
                            <Descriptions.Item label={md.fields.note} span={2}>
                              <span className="whitespace-pre-wrap">
                                {dash(lead.note)}
                              </span>
                            </Descriptions.Item>
                          </Descriptions>
                        ),
                      },
                    ]}
                  />

                  <Card
                    size="small"
                    title={md.sections.company}
                    extra={
                      editable ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setEditing(true)}
                        />
                      ) : null
                    }
                  >
                    <Descriptions size="small" column={1} bordered>
                      <Descriptions.Item label={md.fields.name}>
                        {lead.name}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.nameEn}>
                        {dash(lead.nameEn)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.taxId}>
                        {dash(lead.taxId)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.industry}>
                        {dash(lead.industry)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.companySize}>
                        {dash(lead.companySize)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.employeeCount}>
                        {lead.employeeCount === null
                          ? "—"
                          : lead.employeeCount.toLocaleString("th-TH")}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.source}>
                        {dash(lead.sourceCode)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.productGroup}>
                        {dash(lead.productGroup)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.subProduct}>
                        {dash(lead.subProduct)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.projectRevenue}>
                        {lead.projectRevenue === null
                          ? "—"
                          : `${formatAmount(lead.projectRevenue)} THB`}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.owner}>
                        <Space size={6}>
                          <Avatar size="small">
                            {initials(lead.owner.displayName)}
                          </Avatar>
                          {lead.owner.displayName}
                        </Space>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card
                    size="small"
                    title={md.sections.address}
                    extra={
                      editable ? (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setEditing(true)}
                        />
                      ) : null
                    }
                  >
                    <Descriptions size="small" column={1} bordered>
                      <Descriptions.Item label={md.fields.addressLine}>
                        {dash(lead.addressLine)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.district}>
                        {dash(lead.district)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.province}>
                        {dash(lead.province)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.postalCode}>
                        {dash(lead.postalCode)}
                      </Descriptions.Item>
                      <Descriptions.Item label={md.fields.country}>
                        {lead.country}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </div>
              ),
            },
            {
              key: "activities",
              label: `${md.tabs.activities} · ${lead.activities.length}`,
              children: (
                <Card
                  size="small"
                  extra={
                    editable ? (
                      <Button
                        size="small"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setLogging("note")}
                      >
                        {ma.add}
                      </Button>
                    ) : null
                  }
                >
                  <ActivityList
                    activities={lead.activities}
                    editable={editable}
                    onToggle={toggleActivity}
                    emptyText={ma.empty}
                  />
                </Card>
              ),
            },
          ]}
        />

        {/* ขวา — ปุ่มลัด + กิจกรรมค้าง */}
        <div className="space-y-4">
          {editable && (
            <Card size="small">
              <div className="grid grid-cols-4 gap-2">
                {QUICK_TYPES.map((type) => (
                  <Button
                    key={type}
                    className="h-14! flex-col!"
                    icon={ACTIVITY_ICON[type]}
                    onClick={() => setLogging(type)}
                  >
                    <span className="text-xs">{md.quick[type]}</span>
                  </Button>
                ))}
              </div>
            </Card>
          )}

          <Card
            size="small"
            title={ma.upcoming}
            extra={
              editable ? (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setLogging("task")}
                >
                  {ma.add}
                </Button>
              ) : null
            }
          >
            <ActivityList
              activities={pending}
              editable={editable}
              onToggle={toggleActivity}
              emptyText={ma.noUpcoming}
              compact
            />
            {done.length > 0 && (
              <Collapse
                ghost
                size="small"
                className="mt-2"
                items={[
                  {
                    key: "done",
                    label: `${ma.done} · ${done.length}`,
                    children: (
                      <ActivityList
                        activities={done.slice(0, 10)}
                        editable={editable}
                        onToggle={toggleActivity}
                        emptyText={ma.empty}
                        compact
                      />
                    ),
                  },
                ]}
              />
            )}
            {!open && (
              <Text type="secondary" className="mt-2 block text-xs">
                {ma.closedHint}
              </Text>
            )}
          </Card>
        </div>
      </div>

      <LeadFormModal
        open={editing}
        lead={lead}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
      <DisqualifyLeadModal
        lead={disqualifying ? lead : null}
        onClose={() => setDisqualifying(false)}
        onDone={() => {
          setDisqualifying(false);
          router.refresh();
        }}
      />
      <ConvertLeadModal
        key={converting ? `convert-${lead.id}` : "convert-closed"}
        lead={converting ? lead : null}
        customers={customers}
        onClose={() => setConverting(false)}
        onDone={(opportunityId) =>
          router.push(ROUTES.opportunityDetail(opportunityId))
        }
      />
      <ActivityModal
        key={logging ? `log-${logging}` : "log-closed"}
        endpoint={`leads/${lead.id}/activities`}
        type={logging}
        onClose={() => setLogging(null)}
        onSaved={() => {
          setLogging(null);
          router.refresh();
        }}
      />
    </div>
  );
}
