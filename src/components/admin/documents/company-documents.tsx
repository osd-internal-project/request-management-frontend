"use client";

import { useEffect, useState } from "react";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Table,
  Tabs,
  Tag,
  Upload,
} from "antd";
import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.companyDocuments;
const PAGE_SIZE = 20;

type Kind = "dated" | "general";

interface DocumentView {
  id: string;
  kind: Kind;
  title: string;
  description: string | null;
  issue_date: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: { id: string; name: string | null };
  uploaded_at: string;
  archived_at: string | null;
}

interface Draft {
  kind: Kind;
  title: string;
  description: string;
  issueDate: Dayjs | null;
  file: File | null;
}

interface EditDraft {
  id: string;
  kind: Kind;
  title: string;
  description: string;
  issueDate: Dayjs | null;
}

function fileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

const fileUrl = (id: string) => `/api/app/admin/documents/${id}/file`;

/**
 * เอกสารบริษัท — two kinds: dated documents, which always carry the day they
 * were issued, and general ones. Other systems list and download them
 * through the External API (`GET /documents`).
 */
export function CompanyDocuments() {
  const { message } = App.useApp();
  const [kind, setKind] = useState<Kind>("dated");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<DocumentView> | null>(null);
  /** The query whose answer is on screen — loading until it matches. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const params = new URLSearchParams({
    kind,
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  if (query.trim()) params.set("q", query.trim());
  if (showArchived) params.set("include_archived", "true");
  const search = params.toString();
  const currentKey = `${search}#${reload}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let live = true;
    void appApi<Paginated<DocumentView>>(`admin/documents?${search}`).then(
      (result) => {
        if (!live) return;
        setLoadedKey(`${search}#${reload}`);
        if (result.ok) setData(result.data);
        else message.error(result.message);
      },
    );
    return () => {
      live = false;
    };
  }, [search, reload, message]);

  async function call(path: string, init: RequestInit, done: string) {
    setSaving(true);
    const result = await appApi<DocumentView>(path, init);
    setSaving(false);
    if (!result.ok) {
      message.error(result.message);
      return false;
    }
    message.success(done);
    setReload((n) => n + 1);
    return true;
  }

  async function upload() {
    if (!adding) return;
    if (!adding.title.trim()) return void message.error(m.requiredTitle);
    if (adding.kind === "dated" && !adding.issueDate) {
      return void message.error(m.requiredIssueDate);
    }
    if (!adding.file) return void message.error(m.requiredFile);
    const form = new FormData();
    form.append("kind", adding.kind);
    form.append("title", adding.title.trim());
    if (adding.description.trim()) {
      form.append("description", adding.description.trim());
    }
    if (adding.kind === "dated" && adding.issueDate) {
      form.append("issue_date", adding.issueDate.format("YYYY-MM-DD"));
    }
    form.append("file", adding.file);
    if (
      await call("admin/documents", { method: "POST", body: form }, m.uploaded)
    ) {
      if (adding.kind !== kind) setKind(adding.kind);
      setAdding(null);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editing.title.trim()) return void message.error(m.requiredTitle);
    if (editing.kind === "dated" && !editing.issueDate) {
      return void message.error(m.requiredIssueDate);
    }
    const body = {
      title: editing.title.trim(),
      description: editing.description.trim() || null,
      ...(editing.kind === "dated" && editing.issueDate
        ? { issue_date: editing.issueDate.format("YYYY-MM-DD") }
        : {}),
    };
    if (
      await call(
        `admin/documents/${editing.id}`,
        { method: "PATCH", body: JSON.stringify(body) },
        m.saved,
      )
    ) {
      setEditing(null);
    }
  }

  const columns = [
    {
      title: m.columns.title,
      key: "title",
      render: (_: unknown, row: DocumentView) => (
        <div>
          <Space size={4}>
            <Text strong>{row.title}</Text>
            {row.archived_at && <Tag>{m.archivedTag}</Tag>}
          </Space>
          {row.description && (
            <Text type="secondary" className="block text-xs">
              {row.description}
            </Text>
          )}
        </div>
      ),
    },
    ...(kind === "dated"
      ? [
          {
            title: m.columns.issueDate,
            key: "issue_date",
            width: 150,
            render: (_: unknown, row: DocumentView) =>
              row.issue_date ? dayjs(row.issue_date).format("DD/MM/YYYY") : "—",
          },
        ]
      : []),
    {
      title: m.columns.file,
      key: "file",
      render: (_: unknown, row: DocumentView) => (
        <a href={fileUrl(row.id)} target="_blank" rel="noreferrer">
          <DownloadOutlined /> {row.file_name}
          <Text type="secondary" className="ml-1 text-xs">
            ({fileSize(row.size_bytes)})
          </Text>
        </a>
      ),
    },
    {
      title: m.columns.uploaded,
      key: "uploaded",
      width: 170,
      render: (_: unknown, row: DocumentView) => (
        <div className="text-xs">
          {dayjs(row.uploaded_at).format("DD/MM/YYYY HH:mm")}
          {row.uploaded_by.name && (
            <Text type="secondary" className="block text-xs">
              {m.by(row.uploaded_by.name)}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      width: 170,
      render: (_: unknown, row: DocumentView) =>
        row.archived_at ? (
          <Button
            size="small"
            disabled={saving}
            onClick={() =>
              void call(
                `admin/documents/${row.id}/restore`,
                { method: "POST" },
                m.restored,
              )
            }
          >
            {m.restore}
          </Button>
        ) : (
          <Space size={4}>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() =>
                setEditing({
                  id: row.id,
                  kind: row.kind,
                  title: row.title,
                  description: row.description ?? "",
                  issueDate: row.issue_date ? dayjs(row.issue_date) : null,
                })
              }
            >
              {m.edit}
            </Button>
            <Popconfirm
              title={m.archiveConfirm}
              onConfirm={() =>
                void call(
                  `admin/documents/${row.id}/archive`,
                  { method: "POST" },
                  m.archived,
                )
              }
            >
              <Button size="small" danger disabled={saving}>
                {m.archive}
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <Tabs
        activeKey={kind}
        onChange={(key) => {
          setKind(key as Kind);
          setPage(1);
        }}
        items={(["dated", "general"] as const).map((key) => ({
          key,
          label: m.kinds[key],
        }))}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          allowClear
          className="max-w-xs"
          placeholder={m.search}
          onSearch={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <Checkbox
          checked={showArchived}
          onChange={(event) => {
            setShowArchived(event.target.checked);
            setPage(1);
          }}
        >
          {m.showArchived}
        </Checkbox>
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() =>
            setAdding({
              kind,
              title: "",
              description: "",
              issueDate: null,
              file: null,
            })
          }
        >
          {m.upload}
        </Button>
      </div>
      <Table<DocumentView>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={data?.data ?? []}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        scroll={{ x: 760 }}
      />

      <Modal
        open={adding !== null}
        title={m.upload}
        okText={m.upload}
        confirmLoading={saving}
        onOk={() => void upload()}
        onCancel={() => setAdding(null)}
        destroyOnHidden
      >
        {adding && (
          <div className="space-y-3">
            <div>
              <Text className="text-xs">{m.fields.kind}</Text>
              <Radio.Group
                className="block"
                value={adding.kind}
                onChange={(event) =>
                  setAdding({
                    ...adding,
                    kind: event.target.value as Kind,
                    issueDate:
                      event.target.value === "dated" ? adding.issueDate : null,
                  })
                }
                options={(["dated", "general"] as const).map((value) => ({
                  value,
                  label: m.kinds[value],
                }))}
              />
              <Text type="secondary" className="block text-xs">
                {m.kindHints[adding.kind]}
              </Text>
            </div>
            <label className="block">
              <Text className="text-xs">
                {m.fields.title} <Text type="danger">*</Text>
              </Text>
              <Input
                value={adding.title}
                maxLength={255}
                onChange={(event) =>
                  setAdding({ ...adding, title: event.target.value })
                }
              />
            </label>
            {adding.kind === "dated" && (
              <label className="block">
                <Text className="text-xs">
                  {m.fields.issueDate} <Text type="danger">*</Text>
                </Text>
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={adding.issueDate}
                  onChange={(value) =>
                    setAdding({ ...adding, issueDate: value })
                  }
                />
              </label>
            )}
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
            <div>
              <Text className="block text-xs">
                {m.fields.file} <Text type="danger">*</Text>
              </Text>
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
          </div>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={m.editTitle}
        confirmLoading={saving}
        onOk={() => void saveEdit()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        {editing && (
          <div className="space-y-3">
            <Text type="secondary" className="block text-xs">
              {m.fields.kind}: {m.kinds[editing.kind]}
            </Text>
            <label className="block">
              <Text className="text-xs">
                {m.fields.title} <Text type="danger">*</Text>
              </Text>
              <Input
                value={editing.title}
                maxLength={255}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </label>
            {editing.kind === "dated" && (
              <label className="block">
                <Text className="text-xs">
                  {m.fields.issueDate} <Text type="danger">*</Text>
                </Text>
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  allowClear={false}
                  value={editing.issueDate}
                  onChange={(value) =>
                    setEditing({ ...editing, issueDate: value })
                  }
                />
              </label>
            )}
            <label className="block">
              <Text className="text-xs">{m.fields.description}</Text>
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={editing.description}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
