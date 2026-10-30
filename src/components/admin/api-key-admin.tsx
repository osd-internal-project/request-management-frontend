"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Drawer,
  Dropdown,
  Input,
  InputNumber,
  Modal,
  Popover,
  Select,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import { MoreOutlined } from "@ant-design/icons";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import {
  getApiKeyExamples,
  issueApiKey,
  listApiKeys,
  listApiKeyScopes,
  revealApiKey,
  revokeApiKey,
  rotateApiKey,
  updateApiKeyScopes,
  type ApiExample,
  type ApiKeyRow,
  type IssuedApiKey,
} from "@/lib/api/api-keys";
import { curlFor } from "@/components/admin/integrations/api-example";
import { CodeBlock } from "@/components/admin/integrations/code-block";
import { GroupedPicker } from "@/components/admin/integrations/grouped-picker";
import { SecretField, unwrap } from "@/components/admin/integrations/secret-field";
import {
  listIntegrationPresets,
  type IntegrationPreset,
} from "@/lib/api/integrations";
import { messages, thaiForPermission } from "@/lib/messages";

const m = messages.apiKeys;

/**
 * `integration.<area>.…` — โมดูลที่กุญแจไปแตะ ใช้เป็นหัวข้อย่อยของรายการติ๊ก.
 *
 * รายการดิบ 10 บรรทัดที่ไม่มีหัวข้อทำให้คนติ๊กเกินเพราะอ่านไม่ออกว่าตัวไหนคู่กับตัวไหน
 * ซึ่งขัดกับกฎหนึ่งกุญแจต่อหนึ่งช่องทางที่ทั้งหน้านี้ตั้งอยู่บนมัน
 */
const SCOPE_AREAS = [
  { key: "request", label: m.scopeAreas.request },
  { key: "approval", label: m.scopeAreas.approval },
  { key: "crm", label: m.scopeAreas.crm },
  // สายงานหลังดีล (6 ต.ค. 2569) — เรียงตามลำดับที่งานเดิน
  { key: "flow", label: m.scopeAreas.flow },
  { key: "presales", label: m.scopeAreas.presales },
  { key: "legal", label: m.scopeAreas.legal },
  { key: "pm", label: m.scopeAreas.pm },
  { key: "delivery", label: m.scopeAreas.delivery },
  { key: "support", label: m.scopeAreas.support },
] as const;

interface ScopeArea {
  readonly key: string;
  readonly label: string;
  readonly codes: readonly string[];
}

/** จัดสิทธิ์ตาม area ตามลำดับ {@link SCOPE_AREAS} ที่เหลือไปกองท้ายไม่ใช่หายไป. */
function scopeAreas(codes: readonly string[]): readonly ScopeArea[] {
  const areaOf = (code: string) => code.split(".")[1] ?? "";
  const placed = new Set<string>(SCOPE_AREAS.map((area) => area.key));

  const known = SCOPE_AREAS.map((area) => ({
    key: area.key,
    label: area.label,
    codes: codes.filter((code) => areaOf(code) === area.key),
  }));

  const rest = codes.filter((code) => !placed.has(areaOf(code)));

  return [...known, { key: "other", label: m.scopeAreas.other, codes: rest }].filter(
    (area) => area.codes.length > 0,
  );
}

/** Mirror of `IssueApiKeyDto.source_code` — the backend answers 400 otherwise. */
const SOURCE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

function shortDate(iso: string | null): string {
  if (!iso) return m.never;
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}


/** ตัวเลือกสิทธิ์ — ใช้ทั้งตอนออกใบใหม่และตอนแก้ใบเดิม ให้เห็นรายการชุดเดียวกัน. */
function ScopePicker({
  all,
  value,
  onChange,
}: {
  readonly all: readonly string[];
  readonly value: string[];
  readonly onChange: (next: string[]) => void;
}) {
  return (
    <GroupedPicker
      groups={scopeAreas(all)}
      describe={thaiForPermission}
      value={value}
      onChange={onChange}
      searchPlaceholder={m.scopeSearch}
    />
  );
}

/** "12 สิทธิ์" — รายการเต็มอยู่ใน popover ไม่ให้แถวสูงตามจำนวนสิทธิ์. */
function ScopeCount({ codes }: { readonly codes: readonly string[] }) {
  return (
    <Popover
      title={m.columnScopes}
      content={
        <ul className="m-0 max-h-72 max-w-sm list-none overflow-y-auto p-0 text-xs">
          {codes.map((code) => (
            <li key={code} className="py-0.5">
              {thaiForPermission(code) || code}{" "}
              <code className="text-[var(--app-text-muted)]">{code}</code>
            </li>
          ))}
        </ul>
      }
    >
      <Tag className="cursor-pointer">{m.scopeCount(codes.length)}</Tag>
    </Popover>
  );
}

/**
 * ออกและเพิกถอนกุญแจ API ของช่องทางภายนอก (`admin.integration.manage`).
 *
 * ค่าเต็มของกุญแจแสดงหลังออกใบใหม่ และกดดูย้อนหลังได้ทีละใบ (ลง audit ทุกครั้ง)
 * — หน้านี้ไม่เก็บมันไว้ที่ไหนนอกจาก state ของช่องที่แสดงมัน
 *
 * `integrationId` = แสดงเฉพาะกุญแจของระบบนั้น และออกใบใหม่ให้ระบบนั้น.
 * `externalApiBase` = ที่อยู่ในตัวอย่างการเรียก; null = ยังไม่ได้ตั้ง env.
 */
export function ApiKeyAdmin({
  integrationId,
  externalApiBase = null,
}: {
  readonly integrationId?: string;
  readonly externalApiBase?: string | null;
} = {}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<ApiKeyRow[] | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);
  const [editing, setEditing] = useState<ApiKeyRow | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [examplesFor, setExamplesFor] = useState<ApiKeyRow | null>(null);

  const [name, setName] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [chosenScopes, setChosenScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [presets, setPresets] = useState<IntegrationPreset[]>([]);

  // .then style keeps every setState inside an async callback — the
  // react-hooks/set-state-in-effect rule rejects anything it cannot prove
  // asynchronous when the effect below calls this on mount.
  const refresh = useCallback(
    () =>
      listApiKeys().then((result) => {
        if (!result.ok) return setError(result.message);
        setRows(
          integrationId
            ? result.data.filter((row) => row.integration_id === integrationId)
            : result.data,
        );
      }),
    [integrationId],
  );

  useEffect(() => {
    void refresh();
    void listApiKeyScopes().then((result) => {
      if (result.ok) setScopes(result.data.map((scope) => scope.code));
    });
    if (integrationId) {
      void listIntegrationPresets().then((result) => {
        if (result.ok) setPresets(result.data);
      });
    }
  }, [refresh, integrationId]);

  const sourceInvalid =
    sourceCode.trim().length > 0 && !SOURCE_CODE_PATTERN.test(sourceCode.trim());
  const ready =
    name.trim().length > 0 && !sourceInvalid && sourceCode.trim().length > 0 &&
    chosenScopes.length > 0;

  function openIssuer() {
    setName("");
    setSourceCode("");
    setChosenScopes([]);
    setExpiresInDays(null);
    setIssuing(true);
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);

    const result = await issueApiKey({
      name: name.trim(),
      source_code: sourceCode.trim(),
      scopes: chosenScopes,
      ...(expiresInDays ? { expires_in_days: expiresInDays } : {}),
      ...(integrationId ? { integration_id: integrationId } : {}),
    });

    setBusy(false);
    if (!result.ok) {
      message.error(
        result.details?.length
          ? messages.common.withDetails(
              result.message,
              result.details
                .map((detail) => `${detail.field}=${detail.reason}`)
                .join("; "),
            )
          : result.message,
      );
      return;
    }

    setIssuing(false);
    setIssued(result.data);
    await refresh();
  }

  function startEdit(row: ApiKeyRow) {
    setEditing(row);
    setEditScopes([...row.scopes]);
  }

  async function saveScopes() {
    if (!editing) return;

    setBusy(true);
    const result = await updateApiKeyScopes(editing.id, editScopes);
    setBusy(false);

    if (!result.ok) {
      message.error(result.message);
      return;
    }

    setEditing(null);
    message.success(m.scopesUpdated);
    await refresh();
  }

  async function revoke(row: ApiKeyRow) {
    const result = await revokeApiKey(row.id);
    if (!result.ok) {
      message.error(result.message);
      return;
    }

    message.success(m.revoked);
    await refresh();
  }

  function confirmRevoke(row: ApiKeyRow) {
    modal.confirm({
      title: m.revokeConfirm,
      content: m.revokeConfirmBody,
      okText: m.revoke,
      okButtonProps: { danger: true },
      onOk: () => revoke(row),
    });
  }

  function confirmRotate(row: ApiKeyRow) {
    modal.confirm({
      title: m.rotateConfirm,
      content: m.rotateConfirmBody,
      okText: m.rotate,
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await rotateApiKey(row.id);
        if (!result.ok) return void message.error(result.message);
        setIssued(result.data);
        await refresh();
      },
    });
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
    <div className="space-y-4">
      <Card
        title={m.title}
        extra={
          <Button type="primary" onClick={openIssuer}>
            {m.issue}
          </Button>
        }
      >
        <Table<ApiKeyRow>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: m.empty }}
          scroll={{ x: true }}
          columns={[
            {
              title: m.columnName,
              dataIndex: "name",
              render: (name: string, row) => (
                <div className="min-w-32">
                  <div>{name}</div>
                  {row.source_code && (
                    <Text type="secondary" className="text-xs">
                      {m.columnSource}: {row.source_code}
                    </Text>
                  )}
                </div>
              ),
            },
            {
              title: m.columnKey,
              key: "key",
              width: 280,
              render: (_, row) =>
                row.status === "active" ? (
                  <SecretField
                    hint={`${row.prefix}…`}
                    load={() =>
                      revealApiKey(row.id).then((result) =>
                        unwrap(result, (data) => data.key),
                      )
                    }
                  />
                ) : (
                  <code className="text-xs">{row.prefix}…</code>
                ),
            },
            {
              title: m.columnScopes,
              dataIndex: "scopes",
              width: 110,
              render: (codes: string[]) => <ScopeCount codes={codes} />,
            },
            {
              title: m.columnStatus,
              dataIndex: "status",
              width: 120,
              render: (status: ApiKeyRow["status"]) => (
                <Tag color={m.statusColor[status]}>{m.status[status]}</Tag>
              ),
            },
            {
              title: m.columnExpires,
              dataIndex: "expires_at",
              width: 110,
              render: (iso: string | null) => shortDate(iso),
            },
            {
              title: m.columnLastUsed,
              dataIndex: "last_used_at",
              width: 110,
              render: (iso: string | null) => shortDate(iso),
            },
            {
              title: m.columnActions,
              key: "actions",
              width: 260,
              render: (_, row) =>
                row.status === "active" && (
                  <span className="flex items-center gap-1">
                    <Button type="link" size="small" onClick={() => setExamplesFor(row)}>
                      {m.examples}
                    </Button>
                    <Button size="small" onClick={() => startEdit(row)}>
                      {m.editScopes}
                    </Button>
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          { key: "rotate", label: m.rotate },
                          { key: "revoke", label: m.revoke, danger: true },
                        ],
                        onClick: ({ key }) =>
                          key === "rotate" ? confirmRotate(row) : confirmRevoke(row),
                      }}
                    >
                      <Button size="small" icon={<MoreOutlined />} aria-label={m.more} />
                    </Dropdown>
                  </span>
                ),
            },
          ]}
        />
      </Card>

      <ApiExamplesDrawer
        key={examplesFor?.id ?? "closed"}
        row={examplesFor}
        externalApiBase={externalApiBase}
        onClose={() => setExamplesFor(null)}
      />

      <Modal
        open={issuing}
        title={m.issue}
        okText={m.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !ready }}
        onCancel={() => setIssuing(false)}
        onOk={() => void submit()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <div>
            <Input
              placeholder={m.formName}
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
            <Text type="secondary" className="text-xs">
              {m.formNameHint}
            </Text>
          </div>

          <div>
            <Input
              placeholder={m.formSource}
              value={sourceCode}
              status={sourceInvalid ? "error" : undefined}
              onChange={(e) => setSourceCode(e.target.value)}
            />
            <Text type={sourceInvalid ? "danger" : "secondary"} className="text-xs">
              {sourceInvalid ? m.formSourceInvalid : m.formSourceHint}
            </Text>
          </div>

          <div>
            <Text strong className="text-xs">
              {m.formScopes}
            </Text>
            {presets.length > 0 && (
              <Select<string>
                className="mt-2 w-full"
                allowClear
                placeholder={m.formPreset}
                options={presets.map((preset) => ({
                  value: preset.code,
                  label: preset.name,
                }))}
                onChange={(code) =>
                  setChosenScopes(
                    presets
                      .find((preset) => preset.code === code)
                      ?.scopes.filter((scope) => scopes.includes(scope)) ?? [],
                  )
                }
              />
            )}
            <ScopePicker
              all={scopes}
              value={chosenScopes}
              onChange={setChosenScopes}
            />
            <Text type="secondary" className="text-xs">
              {m.formScopesHint}
            </Text>
          </div>

          <div>
            <InputNumber
              className="w-full"
              placeholder={m.formExpires}
              min={1}
              max={3650}
              value={expiresInDays}
              onChange={(value) => setExpiresInDays(value)}
            />
            <Text type="secondary" className="text-xs">
              {m.formExpiresHint}
            </Text>
          </div>
        </Space>
      </Modal>

      <Modal
        open={editing !== null}
        title={m.editScopesTitle}
        okText={m.scopesSave}
        confirmLoading={busy}
        okButtonProps={{ disabled: editScopes.length === 0 }}
        onOk={saveScopes}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        <Paragraph type="secondary" className="text-xs">
          <code>{editing?.prefix}</code> · {editing?.name}
        </Paragraph>
        <Paragraph type="secondary" className="text-xs">
          {m.editScopesHint}
        </Paragraph>
        <ScopePicker all={scopes} value={editScopes} onChange={setEditScopes} />
      </Modal>

      <Modal
        open={issued !== null}
        title={m.issuedTitle}
        okText={m.issuedDone}
        onOk={() => setIssued(null)}
        onCancel={() => setIssued(null)}
        cancelButtonProps={{ style: { display: "none" } }}
        destroyOnHidden
      >
        <Paragraph type="secondary">
          <code>{issued?.prefix}…</code> · {issued?.name}
        </Paragraph>
        <Paragraph>{m.issuedBody}</Paragraph>
        {issued && <SecretField hint={`${issued.prefix}…`} value={issued.key} />}
      </Modal>
    </div>
  );
}

/** route ที่กุญแจเรียกได้ จัดตาม tag ซ้าย · curl ของตัวที่เลือกขวา. */
function ApiExamplesDrawer({
  row,
  externalApiBase,
  onClose,
}: {
  readonly row: ApiKeyRow | null;
  readonly externalApiBase: string | null;
  readonly onClose: () => void;
}) {
  const [examples, setExamples] = useState<ApiExample[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    void getApiKeyExamples(row.id).then((result) => {
      if (!result.ok) return setError(result.message);
      setExamples(result.data);
      setSelected(result.data[0]?.operationId ?? null);
    });
  }, [row]);

  const byTag = new Map<string, ApiExample[]>();
  for (const example of examples ?? []) {
    byTag.set(example.tag, [...(byTag.get(example.tag) ?? []), example]);
  }
  const current = examples?.find((example) => example.operationId === selected);

  function body() {
    if (error) {
      return (
        <Alert type="error" showIcon title={m.examplesLoadFailed} description={error} />
      );
    }
    if (!examples) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Spin />
        </div>
      );
    }
    if (examples.length === 0) return <Text type="secondary">{m.examplesEmpty}</Text>;
    return (
      <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <nav className="space-y-3 md:max-h-[calc(100vh-12rem)] md:overflow-y-auto">
          {[...byTag].map(([tag, items]) => (
            <div key={tag}>
              <Text type="secondary" className="text-xs">
                {tag}
              </Text>
              <ul className="m-0 list-none p-0">
                {items.map((example) => (
                  <li key={example.operationId}>
                    <button
                      type="button"
                      onClick={() => setSelected(example.operationId)}
                      className={`w-full cursor-pointer rounded-md border-0 px-2 py-1.5 text-left ${
                        example.operationId === selected
                          ? "bg-[var(--app-primary-soft)]"
                          : "bg-transparent hover:bg-[var(--app-bg)]"
                      }`}
                    >
                      <span className="block text-sm">{example.summary}</span>
                      <code className="text-xs text-[var(--app-text-secondary)]">
                        {example.method} {example.path}
                      </code>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {current && row && (
          <div className="min-w-0 space-y-2">
            <CodeBlock
              code={curlFor(current, { externalApiBase, keyPrefix: row.prefix })}
            />
            <Text type="secondary" className="text-xs">
              {m.examplesScopes(current.scopes.join(", "))}
            </Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <Drawer
      open={row !== null}
      title={m.examplesTitle(row?.name ?? "")}
      size="min(900px, 100vw)"
      onClose={onClose}
    >
      <div className="space-y-3">
        {!externalApiBase && (
          <Alert type="warning" showIcon title={messages.integrations.exampleBaseUnset} />
        )}
        {body()}
      </div>
    </Drawer>
  );
}
