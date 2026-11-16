"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import {
  createIntegration,
  listIntegrationPresets,
  listIntegrations,
  type IntegrationMode,
  type IntegrationPreset,
  type IntegrationRow,
} from "@/lib/api/integrations";
import type { KeyScope } from "@/lib/api/api-keys";
import { appApi } from "@/lib/api/client";
import type { SystemCompany } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ModeTags, ModesPicker } from "./integration-modes";

const m = messages.integrations;
const hub = m.hub;
/** ค่าตัวกรอง "เฉพาะระบบกลาง" — ตรงกับ `company_id=system` ของ backend */
const SHARED = "system";

/**
 * รายการระบบภายนอก + เพิ่มระบบใหม่.
 * `company` = ของบริษัทที่ทำงานอยู่ (`admin.integration.manage`);
 * `system` = hub ทุกบริษัท กรองตามบริษัทได้ และเพิ่มได้เฉพาะระบบกลาง.
 * `companyId` ล็อกตัวกรองไว้ที่บริษัทเดียว (หน้ารายบริษัท)
 */
export function IntegrationList({
  scope = "company",
  companyId,
}: {
  readonly scope?: KeyScope;
  readonly companyId?: string;
} = {}) {
  const system = scope === "system";
  const [filter, setFilter] = useState<string | undefined>(companyId);
  const [companies, setCompanies] = useState<SystemCompany[]>([]);
  const { message } = App.useApp();
  const router = useRouter();
  const [rows, setRows] = useState<IntegrationRow[] | null>(null);
  const [presets, setPresets] = useState<IntegrationPreset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modes, setModes] = useState<IntegrationMode[]>(["app"]);

  const refresh = useCallback(
    () =>
      listIntegrations(scope, filter).then((result) => {
        if (result.ok) setRows(result.data);
        else setError(result.message);
      }),
    [scope, filter],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void listIntegrationPresets(scope).then((result) => {
      if (result.ok) setPresets(result.data);
    });
    if (!system) return;
    void appApi<SystemCompany[]>("system/companies").then((result) => {
      if (result.ok) setCompanies(result.data);
    });
  }, [scope, system]);

  const companyName = useMemo(
    () => new Map(companies.map((company) => [company.id, company.code])),
    [companies],
  );
  const detailHref = (id: string) =>
    system ? ROUTES.systemIntegrationDetail(id) : ROUTES.adminIntegrationDetail(id);

  const ready = name.trim().length > 0 && modes.length > 0;

  function openAdd() {
    setName("");
    setDescription("");
    setModes(["app"]);
    setAdding(true);
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);
    const result = await createIntegration(
      {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        modes,
      },
      scope,
    );
    setBusy(false);
    if (!result.ok) return void message.error(result.message);
    message.success(m.created);
    router.push(detailHref(result.data.id));
  }

  if (error) {
    return <Alert type="error" showIcon title={m.loadFailed} description={error} />;
  }

  if (!rows) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <Card
      title={
        system && !companyId ? (
          <Select<string>
            className="min-w-56"
            allowClear
            placeholder={hub.filterAll}
            value={filter}
            onChange={setFilter}
            options={[
              { value: SHARED, label: hub.filterShared },
              ...companies.map((company) => ({
                value: company.id,
                label: `${company.code} ${company.name}`,
              })),
            ]}
          />
        ) : undefined
      }
      extra={
        !system || !companyId ? (
          <Button type="primary" onClick={openAdd}>
            {system ? hub.add : m.add}
          </Button>
        ) : undefined
      }
    >
      <Table<IntegrationRow>
        rowKey="id"
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: system ? hub.empty : m.empty }}
        columns={[
          {
            title: m.columnName,
            dataIndex: "name",
            render: (value: string, row) => (
              <div>
                <Link href={detailHref(row.id)}>{value}</Link>
                {row.description && (
                  <Text type="secondary" className="block text-xs">
                    {row.description}
                  </Text>
                )}
              </div>
            ),
          },
          ...(system
            ? [
                {
                  title: hub.columnCompany,
                  key: "company",
                  width: 120,
                  render: (_: unknown, row: IntegrationRow) =>
                    row.company_id ? (
                      (companyName.get(row.company_id) ?? row.company_id)
                    ) : (
                      <Tag color="blue">{hub.shared}</Tag>
                    ),
                },
                {
                  title: hub.columnAllowed,
                  key: "allowed",
                  width: 120,
                  render: (_: unknown, row: IntegrationRow) =>
                    row.company_id
                      ? "—"
                      : row.allowed_company_ids.length
                        ? hub.someCompanies(row.allowed_company_ids.length)
                        : hub.allCompanies,
                },
              ]
            : []),
          {
            title: m.columnModes,
            key: "modes",
            render: (_, row) => <ModeTags integration={row} />,
          },
          { title: m.columnKeys, dataIndex: "api_key_count", width: 90 },
          { title: m.columnWebhooks, dataIndex: "webhook_count", width: 100 },
          {
            title: m.columnStatus,
            dataIndex: "active",
            width: 100,
            render: (active: boolean) => (
              <Tag color={active ? "success" : "default"}>
                {active ? m.active : m.inactive}
              </Tag>
            ),
          },
        ]}
      />

      <Modal
        open={adding}
        title={m.add}
        okText={m.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !ready }}
        onCancel={() => setAdding(false)}
        onOk={() => void submit()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Input
            placeholder={m.formName}
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
          <Input.TextArea
            placeholder={m.formDescription}
            value={description}
            maxLength={500}
            autoSize={{ minRows: 2 }}
            onChange={(e) => setDescription(e.target.value)}
          />
          {presets.length > 0 && (
            <Select<string>
              className="w-full"
              allowClear
              placeholder={m.formPreset}
              options={presets.map((preset) => ({
                value: preset.code,
                label: preset.name,
              }))}
              onChange={(code) => {
                const preset = presets.find((item) => item.code === code);
                if (preset) setModes([...preset.modes]);
              }}
            />
          )}
          <ModesPicker value={modes} onChange={setModes} />
        </Space>
      </Modal>
    </Card>
  );
}
