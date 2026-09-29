"use client";

import { ExportOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Spin, Table, Tag } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createBiDashboard,
  deleteBiDashboard,
  getBiMenu,
  listBiDashboards,
  listBiOrgUnits,
  updateBiDashboard,
  type BiDashboardConfig,
  type BiDashboardPayload,
  type BiOrgUnitOption,
} from "@/lib/api/bi";
import { messages } from "@/lib/messages";
import { SearchTreeSelect } from "@/components/ui/search-select";
import { buildUnitTree } from "@/lib/org/org-tree";
import { DataMartCard } from "@/components/admin/data-mart-card";

/**
 * CD-92 v2 — the "ตั้งค่า Dashboard" admin screen.
 *
 * The dashboard list and its per-team visibility are configuration rows, so
 * this screen is a plain CRUD over `/admin/bi/dashboards`: which dashboards
 * exist, which org units see each one (none = the whole company), and their
 * menu order. Metabase itself — connections, questions, the dashboards'
 * contents — is still administered in Metabase's own UI, linked below.
 */


interface FormValues {
  title: string;
  metabase_dashboard_id: number;
  sort_order?: number;
  org_unit_ids?: string[];
}

export default function AdminBiPage() {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const [dashboards, setDashboards] = useState<BiDashboardConfig[] | null>(
    null,
  );
  const [units, setUnits] = useState<BiOrgUnitOption[]>([]);
  const [settingsUrl, setSettingsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BiDashboardConfig | "new" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  // .then style keeps every setState inside an async callback — the
  // react-hooks/set-state-in-effect rule rejects anything it cannot prove
  // asynchronous when the effect below calls this on mount.
  const refresh = useCallback(
    () =>
      listBiDashboards().then((result) => {
        if (result.ok) setDashboards(result.data);
        else setError(result.message);
      }),
    [],
  );

  useEffect(() => {
    void refresh();
    void listBiOrgUnits().then((result) => {
      if (result.ok) setUnits(result.data);
    });
    // Only for the "open Metabase" link — the menu itself is per-caller.
    void getBiMenu().then((result) => {
      if (result.ok) setSettingsUrl(result.data.settings_url);
    });
  }, [refresh]);

  const unitTree = useMemo(() => buildUnitTree(units), [units]);

  const openEditor = (target: BiDashboardConfig | "new") => {
    setEditing(target);
    if (target === "new") {
      form.setFieldsValue({
        title: "",
        metabase_dashboard_id: undefined as unknown as number,
        sort_order: 0,
        org_unit_ids: [],
      });
    } else {
      form.setFieldsValue({
        title: target.title,
        metabase_dashboard_id: target.metabase_dashboard_id,
        sort_order: target.sort_order,
        org_unit_ids: target.org_units.map((unit) => unit.id),
      });
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);

    const payload: BiDashboardPayload = {
      title: values.title,
      metabase_dashboard_id: values.metabase_dashboard_id,
      sort_order: values.sort_order ?? 0,
      org_unit_ids: values.org_unit_ids ?? [],
    };
    const result =
      editing === "new" || editing === null
        ? await createBiDashboard(payload)
        : await updateBiDashboard(editing.id, payload);

    setSaving(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }

    void message.success(messages.bi.saved);
    setEditing(null);
    await refresh();
  };

  const setActive = async (row: BiDashboardConfig, active: boolean) => {
    const result = active
      ? await updateBiDashboard(row.id, { active: true })
      : await deleteBiDashboard(row.id);

    if (!result.ok) {
      void message.error(result.message);
      return;
    }

    void message.success(
      active ? messages.bi.saved : messages.bi.deactivated,
    );
    await refresh();
  };

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.bi.loadFailed}
        description={error}
      />
    );
  }

  if (!dashboards) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.bi.manageTitle}
        </Title>
        <Text type="secondary">{messages.bi.manageSubtitle}</Text>
      </div>

      {dashboards.length === 0 && (
        <Alert type="info" showIcon title={messages.bi.envFallbackNotice} />
      )}

      <Card
        title={messages.bi.manageTitle}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEditor("new")}
          >
            {messages.bi.addDashboard}
          </Button>
        }
      >
        <Table<BiDashboardConfig>
          rowKey="id"
          dataSource={dashboards}
          pagination={false}
          columns={[
            {
              title: messages.bi.columnTitle,
              dataIndex: "title",
              render: (title: string, row) =>
                row.active ? title : <Text type="secondary">{title}</Text>,
            },
            {
              title: messages.bi.columnMetabaseId,
              dataIndex: "metabase_dashboard_id",
              width: 120,
            },
            {
              title: messages.bi.columnAudience,
              dataIndex: "org_units",
              render: (orgUnits: BiDashboardConfig["org_units"]) =>
                orgUnits.length === 0 ? (
                  <Tag>{messages.bi.audienceEveryone}</Tag>
                ) : (
                  <Space size={[0, 4]} wrap>
                    {orgUnits.map((unit) => (
                      <Tag key={unit.id} color="blue">
                        {unit.name}
                      </Tag>
                    ))}
                  </Space>
                ),
            },
            {
              title: messages.bi.columnStatus,
              dataIndex: "active",
              width: 110,
              render: (active: boolean) =>
                active ? (
                  <Tag color="green">{messages.bi.statusActive}</Tag>
                ) : (
                  <Tag>{messages.bi.statusInactive}</Tag>
                ),
            },
            {
              title: messages.bi.columnActions,
              key: "actions",
              width: 200,
              render: (_, row) => (
                <Space>
                  <Button size="small" onClick={() => openEditor(row)}>
                    {messages.bi.actionEdit}
                  </Button>
                  {row.active ? (
                    <Popconfirm
                      title={messages.bi.confirmDeactivate}
                      description={messages.bi.confirmDeactivateBody}
                      onConfirm={() => setActive(row, false)}
                    >
                      <Button size="small" danger>
                        {messages.bi.actionDeactivate}
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button size="small" onClick={() => setActive(row, true)}>
                      {messages.bi.actionReactivate}
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* CD-91 */}
      <DataMartCard />

      {settingsUrl && (
        <Card title={messages.bi.settingsTitle}>
          <Paragraph type="secondary">{messages.bi.settingsBody}</Paragraph>
          <Button
            icon={<ExportOutlined />}
            href={settingsUrl}
            target="_blank"
          >
            {messages.bi.settingsOpen}
          </Button>
        </Card>
      )}

      <Modal
        open={editing !== null}
        title={
          editing === "new"
            ? messages.bi.addDashboard
            : messages.bi.editDashboard
        }
        onOk={() => void submit()}
        confirmLoading={saving}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="title"
            label={messages.bi.formTitle}
            rules={[{ required: true, max: 120 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="metabase_dashboard_id"
            label={messages.bi.formMetabaseId}
            extra={messages.bi.formMetabaseIdHelp}
            rules={[{ required: true, type: "number", min: 1 }]}
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item
            name="org_unit_ids"
            label={messages.bi.formAudience}
            extra={messages.bi.formAudienceHelp}
          >
            <SearchTreeSelect
              multiple
              treeDefaultExpandAll
              allowClear
              treeData={unitTree}
              placeholder={messages.bi.audienceEveryone}
            />
          </Form.Item>
          <Form.Item name="sort_order" label={messages.bi.formSortOrder}>
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
