"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
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
} from "./kb-types";

const m = messages.kb;
const f = m.form;

interface Draft {
  title: string;
  summary: string;
  body: string;
  categoryId?: string;
  tags: string[];
  productCodes: string[];
  productGroups: string[];
}

const EMPTY: Draft = {
  title: "",
  summary: "",
  body: "",
  tags: [],
  productCodes: [],
  productGroups: [],
};

/** CD-259 — write or edit an article (Markdown, with a preview and files). */
export function KbArticleForm({ id }: { id?: string }) {
  const { message } = App.useApp();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(id ? null : EMPTY);
  const [articleNo, setArticleNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
      });
    });
  }, [id]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!draft) return <Skeleton active />;
  const d = draft;
  const set = (change: Partial<Draft>) => setDraft({ ...d, ...change });

  async function save() {
    if (!d.title.trim()) {
      void message.error(f.required);
      return;
    }
    setBusy(true);
    const r = await appApi<KbArticle>(
      id ? `kb/articles/${id}` : "kb/articles",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({
          title: d.title,
          summary: d.summary || null,
          body: d.body,
          category_id: d.categoryId ?? null,
          tags: d.tags,
          product_codes: d.productCodes,
          product_groups: d.productGroups,
        }),
      },
    );
    setBusy(false);
    if (!r.ok) {
      void message.error(r.message);
      return;
    }
    void message.success(id ? f.saved : f.created);
    router.push(id ? ROUTES.kbArticle(r.data.id) : ROUTES.kbEdit(r.data.id));
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
        {id ? fill(f.editTitle, { n: articleNo ?? "" }) : f.newTitle}
      </Title>
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
      <Space>
        <Button type="primary" loading={busy} onClick={() => void save()}>
          {f.save}
        </Button>
        <Button
          onClick={() => router.push(id ? ROUTES.kbArticle(id) : ROUTES.kb)}
        >
          {f.cancel}
        </Button>
      </Space>
    </Space>
  );
}
