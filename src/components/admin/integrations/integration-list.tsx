"use client";

import { useCallback, useEffect, useState } from "react";
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
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ModeTags, ModesPicker } from "./integration-modes";

const m = messages.integrations;

/** รายการระบบภายนอกของบริษัท + เพิ่มระบบใหม่ (`admin.integration.manage`). */
export function IntegrationList() {
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
      listIntegrations().then((result) => {
        if (result.ok) setRows(result.data);
        else setError(result.message);
      }),
    [],
  );

  useEffect(() => {
    void refresh();
    void listIntegrationPresets().then((result) => {
      if (result.ok) setPresets(result.data);
    });
  }, [refresh]);

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
    const result = await createIntegration({
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      modes,
    });
    setBusy(false);
    if (!result.ok) return void message.error(result.message);
    message.success(m.created);
    router.push(ROUTES.adminIntegrationDetail(result.data.id));
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
      extra={
        <Button type="primary" onClick={openAdd}>
          {m.add}
        </Button>
      }
    >
      <Table<IntegrationRow>
        rowKey="id"
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: m.empty }}
        columns={[
          {
            title: m.columnName,
            dataIndex: "name",
            render: (value: string, row) => (
              <div>
                <Link href={ROUTES.adminIntegrationDetail(row.id)}>{value}</Link>
                {row.description && (
                  <Text type="secondary" className="block text-xs">
                    {row.description}
                  </Text>
                )}
              </div>
            ),
          },
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
