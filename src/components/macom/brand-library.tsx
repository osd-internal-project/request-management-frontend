"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Table,
  Tag,
  Upload,
} from "antd";
import {
  DownloadOutlined,
  FileOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.brand;

const CATEGORIES = [
  "logo",
  "proposal_template",
  "presentation",
  "guideline",
  "graphic",
  "other",
] as const;

interface VersionView {
  id: string;
  version_no: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  approved_at: string | null;
}

interface AssetView {
  id: string;
  category: string;
  name: string;
  description: string | null;
  tags: string[];
  retired: boolean;
  retire_reason: string | null;
  updated_at: string;
  current: VersionView | null;
  pending_versions?: number;
}

interface AssetDetail extends AssetView {
  versions: (VersionView & {
    status: string;
    note: string | null;
    decision_note: string | null;
    approval_request_id: string | null;
    uploaded_by: string | null;
    uploaded_at: string;
  })[];
}

const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const STATUS_COLOR: Record<string, string> = {
  current: "success",
  approved: "default",
  pending: "processing",
  rejected: "error",
  cancelled: "default",
};

/**
 * CD-273 — the brand library: everyone browses and downloads the current
 * version; MACOM adds assets and versions (each goes for approval), sees the
 * history, and retires what is no longer to be used.
 */
export function BrandLibrary({ canManage }: { canManage: boolean }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AssetView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [reload, setReload] = useState(0);
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [adding, setAdding] = useState<{
    category: string;
    name: string;
    description: string;
    tags: string;
    note: string;
    file: File | null;
  } | null>(null);
  const [versionNote, setVersionNote] = useState("");
  const [retireReason, setRetireReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query.trim()) params.set("q", query.trim());
    if (showRetired) params.set("include_retired", "true");
    void appApi<AssetView[]>(`macom/brand?${params.toString()}`).then(
      (result) => {
        if (!live) return;
        if (result.ok) {
          setError(null);
          setRows(result.data);
        } else setError(result.message);
      },
    );
    return () => {
      live = false;
    };
  }, [category, query, showRetired, reload]);

  async function open(id: string) {
    const result = await appApi<AssetDetail>(`macom/brand/${id}`);
    if (result.ok) setDetail(result.data);
    else message.error(result.message);
  }

  async function call(path: string, init: RequestInit, done: string = m.saved) {
    setBusy(true);
    const result = await appApi<AssetDetail>(path, init);
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return false;
    }
    setDetail(result.data);
    setReload((n) => n + 1);
    message.success(done);
    return true;
  }

  async function add() {
    if (!adding?.file || !adding.name.trim() || !adding.category) {
      message.error(m.required);
      return;
    }
    const form = new FormData();
    form.append("category", adding.category);
    form.append("name", adding.name.trim());
    if (adding.description.trim())
      form.append("description", adding.description.trim());
    if (adding.tags.trim()) form.append("tags", adding.tags.trim());
    if (adding.note.trim()) form.append("note", adding.note.trim());
    form.append("file", adding.file);
    if (await call("macom/brand", { method: "POST", body: form }, m.sent)) {
      setAdding(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          allowClear
          className="max-w-xs"
          placeholder={m.search}
          onSearch={setQuery}
        />
        <Select
          allowClear
          className="w-48"
          placeholder={m.allCategories}
          value={category}
          onChange={setCategory}
          options={CATEGORIES.map((value) => ({
            value,
            label: m.categories[value],
          }))}
        />
        {canManage && (
          <>
            <Checkbox
              checked={showRetired}
              onChange={(event) => setShowRetired(event.target.checked)}
            >
              {m.showRetired}
            </Checkbox>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="ml-auto"
              onClick={() =>
                setAdding({
                  category: category ?? "logo",
                  name: "",
                  description: "",
                  tags: "",
                  note: "",
                  file: null,
                })
              }
            >
              {m.add}
            </Button>
          </>
        )}
      </div>

      {error && <Alert type="error" showIcon title={error} />}

      {rows === null ? (
        <div className="py-10 text-center">
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <Empty description={m.empty} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Badge.Ribbon
              key={row.id}
              text={m.pending(row.pending_versions ?? 0)}
              color="blue"
              className={row.pending_versions ? "" : "hidden"}
            >
              <Card
                size="small"
                className={row.retired ? "opacity-60" : ""}
                actions={[
                  row.current ? (
                    <a
                      key="download"
                      href={`/api/app/macom/brand/${row.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <DownloadOutlined /> {m.download}
                    </a>
                  ) : (
                    <Text key="none" type="secondary" className="text-xs">
                      {m.noCurrent}
                    </Text>
                  ),
                  ...(canManage
                    ? [
                        <a key="manage" onClick={() => void open(row.id)}>
                          {m.manage}
                        </a>,
                      ]
                    : []),
                ]}
              >
                <div className="flex items-start gap-2">
                  <FileOutlined className="mt-1 text-lg text-black/40" />
                  <div className="min-w-0">
                    <Text strong className="block truncate">
                      {row.name}
                    </Text>
                    <div className="text-xs">
                      <Tag>{m.categories[row.category] ?? row.category}</Tag>
                      {row.retired && <Tag color="default">{m.retiredTag}</Tag>}
                      {row.current && (
                        <Text type="secondary">
                          {m.version(row.current.version_no)} ·{" "}
                          {size(row.current.size_bytes)}
                        </Text>
                      )}
                    </div>
                    {row.description && (
                      <Text type="secondary" className="block text-xs">
                        {row.description}
                      </Text>
                    )}
                    {row.tags.length > 0 && (
                      <div className="mt-1">
                        {row.tags.map((tag) => (
                          <Tag key={tag} className="text-[11px]!">
                            #{tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Badge.Ribbon>
          ))}
        </div>
      )}

      <Modal
        open={adding !== null}
        title={m.add}
        okText={m.submit}
        confirmLoading={busy}
        onOk={() => void add()}
        onCancel={() => setAdding(null)}
        destroyOnHidden
      >
        {adding && (
          <div className="space-y-2">
            <label className="block">
              <Text className="text-xs">{m.fields.category}</Text>
              <Select
                className="w-full"
                value={adding.category}
                onChange={(value: string) =>
                  setAdding({ ...adding, category: value })
                }
                options={CATEGORIES.map((value) => ({
                  value,
                  label: m.categories[value],
                }))}
              />
            </label>
            <label className="block">
              <Text className="text-xs">{m.fields.name}</Text>
              <Input
                value={adding.name}
                maxLength={255}
                onChange={(event) =>
                  setAdding({ ...adding, name: event.target.value })
                }
              />
            </label>
            <label className="block">
              <Text className="text-xs">{m.fields.description}</Text>
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={adding.description}
                onChange={(event) =>
                  setAdding({ ...adding, description: event.target.value })
                }
              />
            </label>
            <label className="block">
              <Text className="text-xs">{m.fields.tags}</Text>
              <Input
                value={adding.tags}
                maxLength={500}
                placeholder="logo, สีน้ำเงิน"
                onChange={(event) =>
                  setAdding({ ...adding, tags: event.target.value })
                }
              />
            </label>
            <label className="block">
              <Text className="text-xs">{m.fields.note}</Text>
              <Input
                value={adding.note}
                maxLength={1000}
                onChange={(event) =>
                  setAdding({ ...adding, note: event.target.value })
                }
              />
            </label>
            <Upload
              maxCount={1}
              beforeUpload={(file) => {
                setAdding({ ...adding, file });
                return false;
              }}
              onRemove={() => setAdding({ ...adding, file: null })}
            >
              <Button icon={<UploadOutlined />}>{m.chooseFile}</Button>
            </Upload>
            <Text type="secondary" className="block text-xs">
              {m.fileHint}
            </Text>
          </div>
        )}
      </Modal>

      <Drawer
        open={detail !== null}
        size={640}
        title={detail?.name}
        onClose={() => setDetail(null)}
        destroyOnHidden
      >
        {detail && (
          <div className="space-y-4">
            {detail.retired && (
              <Alert
                type="warning"
                showIcon
                title={m.retired(detail.retire_reason ?? "")}
              />
            )}
            <div className="space-y-2">
              <Text strong>{m.newVersion}</Text>
              <Input
                placeholder={m.fields.note}
                value={versionNote}
                maxLength={1000}
                onChange={(event) => setVersionNote(event.target.value)}
              />
              <Upload
                showUploadList={false}
                disabled={detail.retired}
                beforeUpload={(file) => {
                  const form = new FormData();
                  if (versionNote.trim())
                    form.append("note", versionNote.trim());
                  form.append("file", file);
                  void call(
                    `macom/brand/${detail.id}/versions`,
                    { method: "POST", body: form },
                    m.sent,
                  ).then((ok) => ok && setVersionNote(""));
                  return false;
                }}
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={busy}
                  disabled={detail.retired}
                >
                  {m.chooseFile}
                </Button>
              </Upload>
            </div>

            <div>
              <Text strong className="mb-2 block">
                {m.versions}
              </Text>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={detail.versions}
                scroll={{ x: true }}
                columns={[
                  {
                    title: "#",
                    dataIndex: "version_no",
                    width: 48,
                  },
                  {
                    key: "file",
                    render: (_: unknown, row) => (
                      <div className="text-xs">
                        <a
                          href={`/api/app/macom/brand/${detail.id}/versions/${row.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.file_name}
                        </a>{" "}
                        <Text type="secondary">{size(row.size_bytes)}</Text>
                        {row.note && <div>{row.note}</div>}
                        <div className="text-black/50">
                          {[
                            row.uploaded_by,
                            dayjs(row.uploaded_at).format("DD/MM/YY"),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        {row.decision_note && (
                          <div className="text-black/60">
                            {row.decision_note}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    render: (_: unknown, row) => (
                      <div className="flex flex-col items-start gap-1 text-xs">
                        <Tag color={STATUS_COLOR[row.status]}>
                          {m.statuses[row.status] ?? row.status}
                        </Tag>
                        {row.approval_request_id && (
                          <Link
                            href={ROUTES.requestDetail(row.approval_request_id)}
                          >
                            {m.viewRequest}
                          </Link>
                        )}
                        {row.status === "pending" && (
                          <Popconfirm
                            title={m.withdrawConfirm}
                            onConfirm={() =>
                              void call(
                                `macom/brand-versions/${row.id}/withdraw`,
                                { method: "POST", body: JSON.stringify({}) },
                              )
                            }
                          >
                            <a>{m.withdraw}</a>
                          </Popconfirm>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            <div className="border-t border-black/10 pt-3">
              {detail.retired ? (
                <Button
                  onClick={() =>
                    void call(`macom/brand/${detail.id}/restore`, {
                      method: "POST",
                      body: JSON.stringify({}),
                    })
                  }
                >
                  {m.restore}
                </Button>
              ) : (
                <Popconfirm
                  title={
                    <Input
                      placeholder={m.retireReason}
                      value={retireReason}
                      maxLength={500}
                      onChange={(event) => setRetireReason(event.target.value)}
                    />
                  }
                  okButtonProps={{ disabled: !retireReason.trim() }}
                  onOpenChange={(next) => next && setRetireReason("")}
                  onConfirm={() =>
                    void call(`macom/brand/${detail.id}/retire`, {
                      method: "POST",
                      body: JSON.stringify({ reason: retireReason.trim() }),
                    })
                  }
                >
                  <Button danger>{m.retire}</Button>
                </Popconfirm>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
