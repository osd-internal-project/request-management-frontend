"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
} from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import {
  issueApiKey,
  listApiKeys,
  listApiKeyScopes,
  revokeApiKey,
  type ApiKeyRow,
  type IssuedApiKey,
} from "@/lib/api/api-keys";
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

/**
 * ออกและเพิกถอนกุญแจ API ของช่องทางภายนอก (`admin.integration.manage`).
 *
 * ค่าเต็มของกุญแจปรากฏครั้งเดียวในหน้าต่างหลังออกใบใหม่ — ฐานข้อมูลเก็บแค่ค่าแฮช
 * จึงไม่มีทางอ่านกลับ และหน้านี้ไม่เก็บมันไว้ที่ไหนนอกจาก state ของหน้าต่างนั้น
 */
export function ApiKeyAdmin() {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const [rows, setRows] = useState<ApiKeyRow[] | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);

  const [name, setName] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [chosenScopes, setChosenScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);

  // .then style keeps every setState inside an async callback — the
  // react-hooks/set-state-in-effect rule rejects anything it cannot prove
  // asynchronous when the effect below calls this on mount.
  const refresh = useCallback(
    () =>
      listApiKeys().then((result) => {
        if (result.ok) setRows(result.data);
        else setError(result.message);
      }),
    [],
  );

  useEffect(() => {
    void refresh();
    void listApiKeyScopes().then((result) => {
      if (result.ok) setScopes(result.data.map((scope) => scope.code));
    });
  }, [refresh]);

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

  async function revoke(row: ApiKeyRow) {
    const result = await revokeApiKey(row.id);
    if (!result.ok) {
      message.error(result.message);
      return;
    }

    message.success(m.revoked);
    await refresh();
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
          columns={[
            { title: m.columnName, dataIndex: "name" },
            {
              title: m.columnPrefix,
              dataIndex: "prefix",
              render: (prefix: string) => <code className="text-xs">{prefix}</code>,
            },
            {
              title: m.columnSource,
              dataIndex: "source_code",
              render: (code: string | null) => code ?? m.never,
            },
            {
              title: m.columnScopes,
              dataIndex: "scopes",
              render: (codes: string[]) => (
                <Space size={[0, 4]} wrap>
                  {codes.map((code) => (
                    <Tag key={code}>{code}</Tag>
                  ))}
                </Space>
              ),
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
              width: 110,
              render: (_, row) =>
                row.status === "active" && (
                  <Popconfirm
                    title={m.revokeConfirm}
                    description={m.revokeConfirmBody}
                    onConfirm={() => revoke(row)}
                  >
                    <Button size="small" danger>
                      {m.revoke}
                    </Button>
                  </Popconfirm>
                ),
            },
          ]}
        />
      </Card>

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
            <Checkbox.Group
              className="mt-2 block"
              value={chosenScopes}
              onChange={(values) => setChosenScopes(values as string[])}
            >
              {scopeAreas(scopes).map((area) => (
                <div key={area.key} className="mb-3">
                  <Text strong className="text-xs tracking-wide">
                    {area.label}
                  </Text>
                  <div className="mt-1 grid gap-1">
                    {area.codes.map((code) => (
                      <Checkbox key={code} value={code}>
                        <code className="text-xs">{code}</code>
                        <Text type="secondary" className="ml-2 text-xs">
                          {thaiForPermission(code)}
                        </Text>
                      </Checkbox>
                    ))}
                  </div>
                </div>
              ))}
            </Checkbox.Group>
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
        open={issued !== null}
        title={m.issuedTitle}
        okText={m.issuedDone}
        onOk={() => setIssued(null)}
        onCancel={() => setIssued(null)}
        cancelButtonProps={{ style: { display: "none" } }}
        destroyOnHidden
      >
        <Paragraph type="warning">{m.issuedBody}</Paragraph>
        <Input.TextArea readOnly autoSize value={issued?.key} />
      </Modal>
    </div>
  );
}
