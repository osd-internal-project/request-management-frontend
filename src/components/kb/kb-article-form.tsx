"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Radio,
  Select,
  Skeleton,
  Space,
  Tabs,
  Upload,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { useRouter } from "next/navigation";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { KbMarkdown } from "./kb-markdown";
import { useProductOptions } from "./kb-products";
import {
  categoryOptions,
  fill,
  type KbArticle,
  type KbCategory,
  type KbRevision,
} from "./kb-types";

const m = messages.kb;
const f = m.form;
const r = m.review;
const au = m.audience;

interface Draft {
  title: string;
  summary: string;
  body: string;
  categoryId?: string;
  tags: string[];
  productCodes: string[];
  productGroups: string[];
  /** CD-260 — a revision's "what changed". */
  changeNote: string;
  /** CD-261 — who it is for. */
  audience: "internal" | "customers" | "selected";
  customerIds: string[];
}

const EMPTY: Draft = {
  title: "",
  summary: "",
  body: "",
  tags: [],
  productCodes: [],
  productGroups: [],
  changeNote: "",
  audience: "internal",
  customerIds: [],
};

/**
 * CD-259 — write or edit an article (Markdown, with a preview and files);
 * CD-260 — or a revision of a published one (`revisionId`), sent for review
 * from here while the published text stays up.
 */
export function KbArticleForm({
  id,
  revisionId,
}: {
  id?: string;
  revisionId?: string;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(id ? null : EMPTY);
  const [articleNo, setArticleNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState<KbRevision | null>(null);
  const [customerOptions, setCustomerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const body = useRef<HTMLTextAreaElement | null>(null);
  const products = useProductOptions();

  useEffect(() => {
    void appApi<{ items: KbCategory[] }>("kb/categories").then(
      (r) => r.ok && setCategories(r.data.items),
    );
    void appApi<{ tag: string }[]>("kb/tags").then(
      (r) => r.ok && setTags(r.data.map((t) => t.tag)),
    );
    if (!id) return;
    if (revisionId) {
      void appApi<KbArticle>(`kb/articles/${id}`).then((res) => {
        if (!res.ok) return;
        setArticleNo(res.data.articleNo);
        setCustomerOptions(
          res.data.customers.map((c) => ({
            value: c.id,
            label: `${c.code} · ${c.name}`,
          })),
        );
      });
      void appApi<KbRevision>(`kb/articles/${id}/revisions/${revisionId}`).then(
        (res) => {
          if (!res.ok) return setError(res.message);
          setRevision(res.data);
          setDraft({
            title: res.data.title,
            summary: res.data.summary ?? "",
            body: res.data.body,
            categoryId: res.data.categoryId ?? undefined,
            tags: res.data.tags,
            productCodes: res.data.productCodes,
            productGroups: res.data.productGroups,
            changeNote: res.data.changeNote,
            audience: res.data.audience,
            customerIds: res.data.customerIds,
          });
        },
      );
      return;
    }
    void appApi<KbArticle>(`kb/articles/${id}`).then((r) => {
      if (!r.ok) return setError(r.message);
      if (!r.data.canEdit) return setError(f.cannotEdit);
      setArticleNo(r.data.articleNo);
      setDraft({
        title: r.data.title,
        summary: r.data.summary ?? "",
        body: r.data.body,
        categoryId: r.data.category?.id,
        tags: r.data.tags,
        productCodes: r.data.productCodes,
        productGroups: r.data.productGroups,
        changeNote: "",
        audience: r.data.audience,
        customerIds: r.data.customers.map((c) => c.id),
      });
      setCustomerOptions(
        r.data.customers.map((c) => ({
          value: c.id,
          label: `${c.code} · ${c.name}`,
        })),
      );
    });
  }, [id, revisionId]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!draft) return <Skeleton active />;
  const d = draft;
  const set = (change: Partial<Draft>) => setDraft({ ...d, ...change });

  const payload = () => ({
    title: d.title,
    summary: d.summary || null,
    body: d.body,
    category_id: d.categoryId ?? null,
    tags: d.tags,
    product_codes: d.productCodes,
    product_groups: d.productGroups,
    audience: d.audience,
    customer_ids: d.audience === "selected" ? d.customerIds : [],
    ...(revisionId ? { change_note: d.changeNote } : {}),
  });

  async function searchCustomers(text: string) {
    if (text.trim().length < 2) return;
    const res = await appApi<{
      data: { id: string; customerCode: string; nameTh: string }[];
    }>(`customers?search=${encodeURIComponent(text.trim())}&page_size=20`);
    if (!res.ok) return;
    const picked = customerOptions.filter((o) =>
      d.customerIds.includes(o.value),
    );
    const found = res.data.data.map((c) => ({
      value: c.id,
      label: `${c.customerCode} · ${c.nameTh}`,
    }));
    setCustomerOptions([
      ...picked,
      ...found.filter((o) => !picked.some((p) => p.value === o.value)),
    ]);
  }

  async function save(then?: "submit") {
    if (!d.title.trim()) {
      void message.error(f.required);
      return;
    }
    setBusy(true);
    if (revisionId && id) {
      const base = `kb/articles/${id}/revisions/${revisionId}`;
      const saved = await appApi<KbRevision>(base, {
        method: "PUT",
        body: JSON.stringify(payload()),
      });
      if (saved.ok && then === "submit") {
        const sent = await appApi<KbRevision>(`${base}/submit`, {
          method: "POST",
          body: "{}",
        });
        setBusy(false);
        if (!sent.ok) {
          void message.error(sent.message);
          return;
        }
        void message.success(r.submitted);
        router.push(ROUTES.kbArticle(id));
        return;
      }
      setBusy(false);
      if (!saved.ok) {
        void message.error(saved.message);
        return;
      }
      setRevision(saved.data);
      void message.success(f.saved);
      return;
    }
    const res = await appApi<KbArticle>(
      id ? `kb/articles/${id}` : "kb/articles",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload()),
      },
    );
    setBusy(false);
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    void message.success(id ? f.saved : f.created);
    router.push(
      id ? ROUTES.kbArticle(res.data.id) : ROUTES.kbEdit(res.data.id),
    );
  }

  async function discard() {
    if (!id || !revisionId) return;
    const res = await appApi(`kb/articles/${id}/revisions/${revisionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      void message.error(res.message);
      return;
    }
    void message.success(r.discarded);
    router.push(ROUTES.kbArticle(id));
  }

  /** Puts the uploaded file's Markdown where the cursor is (or at the end). */
  function insert(text: string) {
    const el = body.current;
    const at = el?.selectionStart ?? d.body.length;
    set({ body: `${d.body.slice(0, at)}${text}${d.body.slice(at)}` });
  }

  async function upload(file: File) {
    if (!id) {
      void message.info(f.saveFirst);
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    const r = await appApi<{ fileName: string; mimeType: string; url: string }>(
      `kb/articles/${id}/files`,
      { method: "POST", body: form },
    );
    setBusy(false);
    if (!r.ok) {
      void message.error(r.message);
      return;
    }
    const link = r.data.mimeType.startsWith("image/")
      ? `\n![${r.data.fileName}](${r.data.url})\n`
      : `[${r.data.fileName}](${r.data.url})`;
    insert(link);
  }

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Title level={3} className="!mb-0">
        {revisionId
          ? fill(r.revisionTitle, { n: articleNo ?? "" })
          : id
            ? fill(f.editTitle, { n: articleNo ?? "" })
            : f.newTitle}
      </Title>
      {revisionId ? (
        revision?.status === "returned" && revision.reviewNote ? (
          <Alert
            type="warning"
            showIcon
            title={fill(r.returnedNote, {
              n: revision.reviewedBy ?? "",
              t: revision.reviewNote,
            })}
          />
        ) : (
          <Alert type="info" showIcon title={r.revisionHint} />
        )
      ) : null}
      {revision && !revision.canEdit ? (
        <Alert
          type="info"
          showIcon
          title={r.revisionStatuses[revision.status] ?? revision.status}
        />
      ) : null}
      <Card>
        <Form layout="vertical">
          <Form.Item label={f.title} required>
            <Input
              size="large"
              maxLength={200}
              value={d.title}
              placeholder={f.titlePlaceholder}
              onChange={(e) => set({ title: e.target.value })}
            />
          </Form.Item>
          <Form.Item label={f.summary}>
            <Input.TextArea
              rows={2}
              maxLength={500}
              value={d.summary}
              onChange={(e) => set({ summary: e.target.value })}
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item label={m.category}>
              <Select
                allowClear
                value={d.categoryId}
                onChange={(v) => set({ categoryId: v })}
                options={categoryOptions(categories)}
              />
            </Form.Item>
            <Form.Item label={m.tags} extra={m.tagsHint}>
              <Select
                mode="tags"
                value={d.tags}
                onChange={(v) => set({ tags: v })}
                options={tags.map((t) => ({ value: t, label: t }))}
                tokenSeparators={[","]}
              />
            </Form.Item>
            <Form.Item label={`${m.product} — SAP item`}>
              <Select
                mode="multiple"
                showSearch
                filterOption={false}
                onSearch={products.search}
                value={d.productCodes}
                onChange={(v) => set({ productCodes: v })}
                options={products.itemOptions}
                notFoundContent={m.productHint}
              />
            </Form.Item>
            <Form.Item label={`${m.product} — item group`}>
              <Select
                mode="multiple"
                showSearch
                filterOption={false}
                onSearch={products.search}
                value={d.productGroups}
                onChange={(v) => set({ productGroups: v })}
                options={products.groupOptions}
                notFoundContent={m.productHint}
              />
            </Form.Item>
          </div>
          <Form.Item
            label={au.label}
            extra={d.audience === "internal" ? undefined : au.customersHintNote}
          >
            <Radio.Group
              value={d.audience}
              onChange={(e) =>
                set({ audience: e.target.value as Draft["audience"] })
              }
              options={(["internal", "customers", "selected"] as const).map(
                (v) => ({ value: v, label: au.options[v] }),
              )}
            />
          </Form.Item>
          {d.audience === "selected" ? (
            <Form.Item label={au.customers} extra={au.customersHint} required>
              <Select
                mode="multiple"
                showSearch
                filterOption={false}
                onSearch={(t) => void searchCustomers(t)}
                value={d.customerIds}
                onChange={(v) => set({ customerIds: v })}
                options={customerOptions}
              />
            </Form.Item>
          ) : null}
          {revisionId ? (
            <Form.Item label={r.changeNote} required>
              <Input.TextArea
                rows={2}
                maxLength={1000}
                value={d.changeNote}
                onChange={(e) => set({ changeNote: e.target.value })}
              />
            </Form.Item>
          ) : null}
          <Form.Item label={f.body} extra={f.bodyHint}>
            <Tabs
              items={[
                {
                  key: "write",
                  label: f.write,
                  children: (
                    <Input.TextArea
                      ref={(node) => {
                        body.current =
                          node?.resizableTextArea?.textArea ?? null;
                      }}
                      rows={18}
                      className="font-mono"
                      value={d.body}
                      onChange={(e) => set({ body: e.target.value })}
                    />
                  ),
                },
                {
                  key: "preview",
                  label: f.preview,
                  children: (
                    <div className="min-h-40 rounded border p-4">
                      <KbMarkdown body={d.body} />
                    </div>
                  ),
                },
              ]}
            />
          </Form.Item>
          <Space wrap>
            <Upload
              showUploadList={false}
              beforeUpload={(file) => {
                void upload(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} disabled={!id} loading={busy}>
                {f.attach}
              </Button>
            </Upload>
            <Text type="secondary" className="text-xs">
              {id ? f.attachHint : f.saveFirst}
            </Text>
          </Space>
        </Form>
      </Card>
      <Space wrap>
        <Button
          type={revisionId ? "default" : "primary"}
          loading={busy}
          disabled={!!revision && !revision.canEdit}
          onClick={() => void save()}
        >
          {f.save}
        </Button>
        {revisionId ? (
          <Button
            type="primary"
            loading={busy}
            disabled={!revision?.canEdit || !d.changeNote.trim()}
            onClick={() => void save("submit")}
          >
            {r.submit}
          </Button>
        ) : null}
        <Button
          onClick={() => router.push(id ? ROUTES.kbArticle(id) : ROUTES.kb)}
        >
          {f.cancel}
        </Button>
        {revisionId && revision?.canEdit ? (
          <Popconfirm title={r.discardConfirm} onConfirm={() => void discard()}>
            <Button danger type="text">
              {r.discard}
            </Button>
          </Popconfirm>
        ) : null}
      </Space>
    </Space>
  );
}
