"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { adminApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { CrmConfig, SegmentDimension, SegmentValue } from "@/lib/api/types";

const m = messages.customers.admin;

/**
 * ตั้งค่า CRM — the client half. Writes go to `/admin/crm/*`; every save is
 * followed by `router.refresh()` so the tables show what the database holds.
 */
export function CrmAdmin({
  dimensions,
  config,
  docPrefix,
}: {
  dimensions: SegmentDimension[];
  config: CrmConfig;
  docPrefix: string;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    setError(null);
    const result = await adminApi(`crm/${path}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!result.ok) {
      setError(result.message);
      return false;
    }

    message.success(m.saved);
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      <SegmentSection dimensions={dimensions} onCall={call} />
      <ConfigSection config={config} docPrefix={docPrefix} onCall={call} />
    </div>
  );
}

function SegmentSection({
  dimensions,
  onCall,
}: {
  dimensions: SegmentDimension[];
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [newDimension, setNewDimension] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [newValue, setNewValue] = useState<{
    dimensionId: string;
    code: string;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveDimension() {
    if (!newDimension) return;
    setBusy(true);
    const done = await onCall("segment-dimensions", "POST", {
      code: newDimension.code.trim(),
      name_th: newDimension.name.trim(),
    });
    setBusy(false);
    if (done) setNewDimension(null);
  }

  async function saveValue() {
    if (!newValue) return;
    setBusy(true);
    const done = await onCall(
      `segment-dimensions/${newValue.dimensionId}/values`,
      "POST",
      { code: newValue.code.trim(), name_th: newValue.name.trim() },
    );
    setBusy(false);
    if (done) setNewValue(null);
  }

  return (
    <Card
      size="small"
      title={m.sectionSegments}
      extra={
        <Button
          size="small"
          onClick={() => setNewDimension({ code: "", name: "" })}
        >
          {m.addDimension}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {dimensions.map((dimension) => (
          <Card
            key={dimension.id}
            size="small"
            title={
              <Space size={6}>
                {dimension.nameTh}
                <Tag>{dimension.code}</Tag>
                {!dimension.active && <Tag color="red">{m.inactiveTag}</Tag>}
              </Space>
            }
            extra={
              <Space>
                <Switch
                  size="small"
                  checked={dimension.active}
                  onChange={(checked) =>
                    void onCall(`segment-dimensions/${dimension.id}`, "PATCH", {
                      active: checked,
                    })
                  }
                />
                <Button
                  size="small"
                  onClick={() =>
                    setNewValue({
                      dimensionId: dimension.id,
                      code: "",
                      name: "",
                    })
                  }
                >
                  {m.addValue}
                </Button>
              </Space>
            }
          >
            <Table<SegmentValue>
              rowKey="id"
              size="small"
              dataSource={dimension.values}
              pagination={false}
              showHeader={false}
              columns={[
                {
                  dataIndex: "nameTh",
                  render: (nameTh: string, value) => (
                    <Space size={4}>
                      {nameTh}
                      <Tag>{value.code}</Tag>
                      {!value.active && <Tag color="red">{m.inactiveTag}</Tag>}
                    </Space>
                  ),
                },
                {
                  key: "actions",
                  align: "right" as const,
                  render: (_: unknown, value) => (
                    <Space>
                      <Switch
                        size="small"
                        checked={value.active}
                        onChange={(checked) =>
                          void onCall(`segment-values/${value.id}`, "PATCH", {
                            active: checked,
                          })
                        }
                      />
                      <Popconfirm
                        title={m.deleteValueConfirm}
                        onConfirm={() =>
                          void onCall(`segment-values/${value.id}`, "DELETE")
                        }
                      >
                        <Button size="small" danger>
                          {messages.customers.form.removeLocation}
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        ))}
      </div>

      <Modal
        open={newDimension !== null}
        title={m.addDimension}
        okText={m.save}
        cancelText={messages.customers.form.cancel}
        confirmLoading={busy}
        okButtonProps={{
          disabled: !newDimension?.code.trim() || !newDimension?.name.trim(),
        }}
        onCancel={() => setNewDimension(null)}
        onOk={() => void saveDimension()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Input
            placeholder={m.dimensionCode}
            value={newDimension?.code}
            onChange={(e) =>
              setNewDimension((prev) => prev && { ...prev, code: e.target.value })
            }
          />
          <Input
            placeholder={m.dimensionName}
            value={newDimension?.name}
            onChange={(e) =>
              setNewDimension((prev) => prev && { ...prev, name: e.target.value })
            }
          />
        </Space>
      </Modal>

      <Modal
        open={newValue !== null}
        title={m.addValue}
        okText={m.save}
        cancelText={messages.customers.form.cancel}
        confirmLoading={busy}
        okButtonProps={{
          disabled: !newValue?.code.trim() || !newValue?.name.trim(),
        }}
        onCancel={() => setNewValue(null)}
        onOk={() => void saveValue()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Input
            placeholder={m.valueCode}
            value={newValue?.code}
            onChange={(e) =>
              setNewValue((prev) => prev && { ...prev, code: e.target.value })
            }
          />
          <Input
            placeholder={m.valueName}
            value={newValue?.name}
            onChange={(e) =>
              setNewValue((prev) => prev && { ...prev, name: e.target.value })
            }
          />
        </Space>
      </Modal>
    </Card>
  );
}

function ConfigSection({
  config,
  docPrefix,
  onCall,
}: {
  config: CrmConfig;
  docPrefix: string;
  onCall: (path: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [prefix, setPrefix] = useState(config.codePrefix);
  const [padding, setPadding] = useState(config.codePadding);
  const [threshold, setThreshold] = useState(config.dedupThreshold);
  const [busy, setBusy] = useState(false);

  const example = `${prefix || "CUS"}-${docPrefix}-${"1".padStart(
    padding || 6,
    "0",
  )}`;

  async function save() {
    setBusy(true);
    await onCall("config", "PATCH", {
      code_prefix: prefix || undefined,
      code_padding: padding,
      dedup_threshold: threshold,
    });
    setBusy(false);
  }

  return (
    <Card size="small" title={m.sectionConfig}>
      <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Text className="mb-1 block text-xs">{m.codePrefix}</Text>
          <Input
            value={prefix}
            maxLength={10}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Text className="mb-1 block text-xs">{m.codePadding}</Text>
          <InputNumber
            min={3}
            max={10}
            value={padding}
            onChange={(value) => setPadding(value ?? 6)}
            className="w-full"
          />
        </div>
        <div>
          <Text className="mb-1 block text-xs">{m.dedupThreshold}</Text>
          <InputNumber
            min={0.5}
            max={1}
            step={0.05}
            value={threshold}
            onChange={(value) => setThreshold(value ?? 0.85)}
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <Text type="secondary" className="block text-xs">
          {m.codePreview(example)}
        </Text>
        <Text type="secondary" className="block text-xs">
          {m.dedupThresholdHint}
        </Text>
      </div>

      <Button
        type="primary"
        className="mt-3"
        loading={busy}
        onClick={() => void save()}
      >
        {m.save}
      </Button>
    </Card>
  );
}
