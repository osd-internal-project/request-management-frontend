"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  List,
  Popconfirm,
  Space,
  Spin,
  Tabs,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { IntegrationList } from "@/components/admin/integrations/integration-list";
import { SystemUsersAdmin } from "@/components/system/system-users-admin";
import { appApi } from "@/lib/api/client";
import type { SystemCompanyDetail } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.system.companies;

/**
 * หนึ่งบริษัทจากมุมระบบ — ภาพรวมระดับองค์กร ผู้ใช้ ระบบภายนอก และตั้งค่า โดยไม่ต้องสลับเข้าไป.
 * ไม่มีข้อมูลงาน (คำขอ ลูกค้า) — แท็บที่ผู้ดูไม่มีสิทธิ์จะไม่แสดง
 */
export function SystemCompanyDetailView({
  id,
  canUsers,
  canManageRoles,
  canIntegrations,
  canAudit,
}: {
  readonly id: string;
  readonly canUsers: boolean;
  readonly canManageRoles: boolean;
  readonly canIntegrations: boolean;
  readonly canAudit: boolean;
}) {
  const [company, setCompany] = useState<SystemCompanyDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    () =>
      appApi<SystemCompanyDetail>(`system/companies/${id}`).then((answer) => {
        if (answer.ok) return setCompany(answer.data);
        if (answer.code === "NOT_FOUND") return setCompany(null);
        setError(answer.message);
      }),
    [id],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (company === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }
  if (company === null) return <Alert type="warning" showIcon title={m.notFound} />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={ROUTES.systemCompanies} className="text-xs">
          {m.back}
        </Link>
        <Title level={4} className="mb-0!">
          {company.code} {company.name}{" "}
          {!company.active && <Tag className="align-middle">{m.statusClosed}</Tag>}
        </Title>
      </div>

      <Tabs
        items={[
          {
            key: "overview",
            label: m.tabs.overview,
            children: <Overview company={company} canAudit={canAudit} />,
          },
          ...(canUsers
            ? [
                {
                  key: "users",
                  label: m.tabs.users,
                  children: <SystemUsersAdmin canManageRoles={canManageRoles} companyId={id} />,
                },
              ]
            : []),
          ...(canIntegrations
            ? [
                {
                  key: "integrations",
                  label: m.tabs.integrations,
                  children: <IntegrationList scope="system" companyId={id} />,
                },
              ]
            : []),
          {
            key: "settings",
            label: m.tabs.settings,
            children: <Settings company={company} onSaved={refresh} />,
          },
        ]}
      />
    </div>
  );
}

function Overview({
  company,
  canAudit,
}: {
  readonly company: SystemCompanyDetail;
  readonly canAudit: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Descriptions column={{ xs: 1, md: 3 }} size="small" className="tabular-nums">
          <Descriptions.Item label={m.members}>
            {m.membersActive(
              company._count.users - company.suspendedMembers,
              company.suspendedMembers,
            )}
          </Descriptions.Item>
          <Descriptions.Item label={m.admins}>{company.adminCount}</Descriptions.Item>
          <Descriptions.Item label={m.orgUnits}>{company._count.orgUnits}</Descriptions.Item>
          <Descriptions.Item label={m.docPrefix}>{company.docPrefix}</Descriptions.Item>
          <Descriptions.Item label={m.currency}>{company.baseCurrency}</Descriptions.Item>
          <Descriptions.Item label={m.createdOn}>
            {new Date(company.createdAt).toLocaleDateString("th-TH")}
          </Descriptions.Item>
        </Descriptions>
        {canAudit && (
          <Link href={`${ROUTES.systemAudit}?company_id=${company.id}`} className="text-sm">
            {m.auditLink}
          </Link>
        )}
      </Card>
      <Card title={m.adminsList}>
        {company.admins.length ? (
          <List
            size="small"
            dataSource={company.admins}
            renderItem={(admin) => (
              <List.Item>
                <Space>
                  <Text>{admin.displayName}</Text>
                  {admin.email && <Text type="secondary">{admin.email}</Text>}
                  {admin.status === "SUSPENDED" && <Tag>{messages.system.users.suspended}</Tag>}
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Alert type="warning" showIcon title={m.noAdmin} />
        )}
      </Card>
    </div>
  );
}

function Settings({
  company,
  onSaved,
}: {
  readonly company: SystemCompanyDetail;
  readonly onSaved: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState(company.name);
  const [docPrefix, setDocPrefix] = useState(company.docPrefix);
  const [busy, setBusy] = useState(false);
  const prefixChanged = docPrefix.trim().toUpperCase() !== company.docPrefix;

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    const answer = await appApi(`system/companies/${company.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!answer.ok) return void message.error(answer.message);
    message.success(m.saved);
    await onSaved();
  }

  return (
    <Card>
      <Form layout="vertical" component="div" className="max-w-xl">
        <Form.Item label={m.name} required>
          <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        <Form.Item
          label={m.docPrefix}
          extra={prefixChanged ? <Text type="warning">{m.docPrefixWarning}</Text> : undefined}
        >
          <Input
            value={docPrefix}
            maxLength={10}
            onChange={(e) => setDocPrefix(e.target.value)}
          />
        </Form.Item>
        <Space>
          <Button
            type="primary"
            loading={busy}
            disabled={!name.trim() || !docPrefix.trim()}
            onClick={() =>
              void save({
                name: name.trim(),
                ...(prefixChanged ? { doc_prefix: docPrefix.trim().toUpperCase() } : {}),
              })
            }
          >
            {m.save}
          </Button>
          {company.active ? (
            <Popconfirm title={m.closeConfirm} onConfirm={() => save({ active: false })}>
              <Button danger>{m.close}</Button>
            </Popconfirm>
          ) : (
            <Button onClick={() => void save({ active: true })}>{m.reopen}</Button>
          )}
        </Space>
      </Form>
    </Card>
  );
}
