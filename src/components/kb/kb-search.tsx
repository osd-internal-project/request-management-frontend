"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Input,
  List,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import {
  categoryOptions,
  fill,
  REVIEW_COLOR,
  shortDate,
  STATUS_COLOR,
  type KbCard,
  type KbCategory,
} from "./kb-types";
import { useProductOptions } from "./kb-products";

const m = messages.kb;

interface SearchResult {
  canManage: boolean;
  terms: string[];
  items: KbCard[];
}

/** CD-259 — search the knowledge base by words, category, product and tag. */
export function KbSearch() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("published");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [product, setProduct] = useState<string | undefined>();
  const [tag, setTag] = useState<string | undefined>();
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [tags, setTags] = useState<{ tag: string; n: number }[]>([]);
  const [loaded, setLoaded] = useState<{
    key: string;
    data: SearchResult | null;
    error: string | null;
  } | null>(null);
  const products = useProductOptions();

  useEffect(() => {
    void appApi<{ items: KbCategory[] }>("kb/categories").then(
      (r) => r.ok && setCategories(r.data.items),
    );
    void appApi<{ tag: string; n: number }[]>("kb/tags").then(
      (r) => r.ok && setTags(r.data),
    );
  }, []);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "published") params.set("status", status);
  if (categoryId) params.set("category_id", categoryId);
  if (product) params.set("product_code", product);
  if (tag) params.set("tag", tag);
  const key = params.toString();

  useEffect(() => {
    let live = true;
    void appApi<SearchResult>(`kb/articles${key ? `?${key}` : ""}`).then(
      (r) => {
        if (!live) return;
        setLoaded(
          r.ok
            ? { key, data: r.data, error: null }
            : { key, data: null, error: r.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [key]);

  const result = loaded?.data ?? null;
  const highlight = (text: string) => {
    const terms = result?.terms ?? [];
    if (!terms.length) return text;
    const pattern = new RegExp(
      `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "gi",
    );
    return text.split(pattern).map((part, i) =>
      i % 2 ? (
        <mark key={i} className="rounded bg-yellow-200/70 px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Space.Compact className="w-full">
        <Input.Search
          size="large"
          allowClear
          value={q}
          placeholder={m.searchPlaceholder}
          onChange={(e) => setQ(e.target.value)}
          onSearch={(value) => setQuery(value.trim())}
        />
        <Link href={ROUTES.kbNew}>
          <Button size="large" type="primary" icon={<PlusOutlined />}>
            {m.newArticle}
          </Button>
        </Link>
      </Space.Compact>
      <Space wrap>
        <Segmented
          value={status}
          onChange={(v) => setStatus(String(v))}
          options={(result?.canManage
            ? ["published", "in_review", "draft", "archived", "mine"]
            : ["published", "mine"]
          ).map((s) => ({ value: s, label: m.statuses[s] }))}
        />
        <Select
          allowClear
          className="min-w-52"
          placeholder={m.allCategories}
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions(categories)}
        />
        <Select
          allowClear
          showSearch
          className="min-w-60"
          placeholder={m.product}
          value={product}
          onChange={setProduct}
          filterOption={false}
          onSearch={products.search}
          options={products.itemOptions}
          notFoundContent={m.productHint}
        />
        <Select
          allowClear
          showSearch
          className="min-w-44"
          placeholder={m.tag}
          value={tag}
          onChange={setTag}
          options={tags.map((t) => ({
            value: t.tag,
            label: `${t.tag} (${t.n})`,
          }))}
        />
      </Space>
      {loaded?.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !result || loaded?.key !== key ? (
        <Skeleton active />
      ) : !result.items.length ? (
        <Empty description={m.none} />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={result.items}
          renderItem={(a) => (
            <List.Item key={a.id} className="!px-0">
              <Space orientation="vertical" size={2} className="w-full">
                <Space wrap size={6}>
                  <Link
                    href={ROUTES.kbArticle(a.id)}
                    className="text-base font-medium"
                  >
                    {highlight(a.title)}
                  </Link>
                  {a.status !== "published" ? (
                    <Tag color={STATUS_COLOR[a.status]}>
                      {m.statuses[a.status]}
                    </Tag>
                  ) : null}
                  {REVIEW_COLOR[a.reviewState] ? (
                    <Tag color={REVIEW_COLOR[a.reviewState]}>
                      {m.review.reviewStates[a.reviewState]}
                    </Tag>
                  ) : null}
                </Space>
                {a.summary ? (
                  <Text type="secondary">{highlight(a.summary)}</Text>
                ) : null}
                <Space wrap size={4}>
                  <Text type="secondary" className="text-xs">
                    {a.articleNo}
                  </Text>
                  {a.category?.name ? <Tag>{a.category.name}</Tag> : null}
                  {a.productCodes.concat(a.productGroups).map((p) => (
                    <Tag key={p} color="blue">
                      {p}
                    </Tag>
                  ))}
                  {a.tags.map((t) => (
                    <Tag
                      key={t}
                      className="cursor-pointer"
                      onClick={() => setTag(t)}
                    >
                      #{t}
                    </Tag>
                  ))}
                </Space>
                <Text type="secondary" className="text-xs">
                  {fill(m.by, { n: a.author })} ·{" "}
                  {a.publishedAt
                    ? fill(m.published, { d: shortDate(a.publishedAt) })
                    : fill(m.updated, { d: shortDate(a.updatedAt) })}{" "}
                  · {fill(m.views, { n: a.views })} ·{" "}
                  {a.helpfulPct === null
                    ? m.noRating
                    : fill(m.helpful, {
                        p: a.helpfulPct,
                        n: a.helpfulYes + a.helpfulNo,
                      })}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </Space>
  );
}
