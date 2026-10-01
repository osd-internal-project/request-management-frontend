"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { EsignAuthority } from "@/lib/api/esign";
import { messages } from "@/lib/messages";

const m = messages.esign.authorities;
const docTypes = messages.esign.layouts.docTypes;

interface Draft {
  id?: string;
  userId?: string;
  title: string;
  limitAmount: number | null;
  docTypes: string[];
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
  note: string;
}

const blank: Draft = {
  title: "",
  limitAmount: null,
  docTypes: [],
  validFrom: null,
  validTo: null,
  active: true,
  note: "",
};

const money = (value: number) => value.toLocaleString("th-TH");
const date = (value: string) => dayjs(value).format("D MMM YYYY");

/**
 * CD-172 ทะเบียนผู้มีอำนาจลงนาม — who may sign for the company, up to what
 * amount, on which documents, over what period. A field marked "ผู้มีอำนาจ
 * ลงนามของบริษัท" takes only someone covered here; switching an entry off
 * or lowering its limit stops a signature already waiting.
 */
export function EsignAuthoritiesAdmin({
  rows,
  people,
}: {
  readonly rows: EsignAuthority[];
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    if ((!draft.id && !draft.userId) || !draft.title.trim()) {
      setError(m.required);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi(
      draft.id ? `esign/authorities/${draft.id}` : "esign/authorities",
      {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(draft.id ? { active: draft.active } : { user_id: draft.userId }),
          title: draft.title,
          limit_amount: draft.limitAmount,
          doc_types: draft.docTypes,
          valid_from: draft.validFrom,
          valid_to: draft.validTo,
          note: draft.note,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setDraft(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={4} className="mb-1!">
            {m.title}
          </Title>
          <Text type="secondary" className="text-sm">
            {m.subtitle}
          </Text>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setError(null);
            setDraft({ ...blank });
          }}
        >
          {m.add}
        </Button>
      </div>

      {rows.length ? (
        rows.map((row) => (
          <Card key={row.id} size="small">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">
                  {row.name}{" "}
                  <Text type="secondary" className="text-sm">
                    · {row.title}
                  </Text>{" "}
                  {!row.active && <Tag>{m.inactive}</Tag>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Tag color="gold">
                    {row.limitAmount === null
                      ? m.unlimited
                      : m.limitText(money(row.limitAmount))}
                  </Tag>
                  <Tag>
                    {row.docTypes.length
                      ? row.docTypes.map((type) => docTypes[type] ?? type).join(", ")
                      : m.allDocTypes}
                  </Tag>
                  <Tag>
                    {row.validFrom || row.validTo
                      ? m.period(
                          row.validFrom ? date(row.validFrom) : "…",
                          row.validTo ? date(row.validTo) : "…",
                        )
                      : m.always}
                  </Tag>
                </div>
                {row.note && (
                  <Text type="secondary" className="block text-xs">
                    {row.note}
                  </Text>
                )}
              </div>
              <Button
                size="small"
                onClick={() => {
                  setError(null);
                  setDraft({
                    id: row.id,
                    userId: row.userId,
                    title: row.title,
                    limitAmount: row.limitAmount,
                    docTypes: row.docTypes,
                    validFrom: row.validFrom,
                    validTo: row.validTo,
                    active: row.active,
                    note: row.note ?? "",
                  });
                }}
              >
                {m.edit}
              </Button>
            </div>
          </Card>
        ))
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? m.edit : m.add}
        onCancel={() => setDraft(null)}
        onOk={() => void save()}
        okText={m.save}
        cancelText={m.cancel}
        confirmLoading={busy}
        destroyOnHidden
      >
        {draft && (
          <div className="flex flex-col gap-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="text-xs">
              {m.person}
              <Select
                className="w-full"
                showSearch
                optionFilterProp="label"
                disabled={Boolean(draft.id)}
                value={draft.userId}
                onChange={(userId: string) => setDraft({ ...draft, userId })}
                options={people.map((person) => ({
                  value: person.id,
                  label: person.name,
                }))}
              />
            </label>
            <label className="text-xs">
              {m.position}
              <Input
                value={draft.title}
                maxLength={255}
                placeholder={m.positionPlaceholder}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            <label className="text-xs">
              {m.limit}
              <InputNumber
                className="w-full!"
                min={0.01}
                placeholder={m.unlimited}
                value={draft.limitAmount}
                formatter={(value) =>
                  `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => Number((value ?? "").replace(/,/g, ""))}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    limitAmount: value === null ? null : Number(value),
                  })
                }
              />
            </label>
            <label className="text-xs">
              {m.docTypes}
              <Select
                className="w-full"
                mode="multiple"
                allowClear
                placeholder={m.allDocTypes}
                value={draft.docTypes}
                onChange={(value: string[]) =>
                  setDraft({ ...draft, docTypes: value })
                }
                options={Object.entries(docTypes).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                {m.validFrom}
                <DatePicker
                  className="w-full"
                  value={draft.validFrom ? dayjs(draft.validFrom) : null}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      validFrom: value ? value.format("YYYY-MM-DD") : null,
                    })
                  }
                />
              </label>
              <label className="text-xs">
                {m.validTo}
                <DatePicker
                  className="w-full"
                  value={draft.validTo ? dayjs(draft.validTo) : null}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      validTo: value ? value.format("YYYY-MM-DD") : null,
                    })
                  }
                />
              </label>
            </div>
            <label className="text-xs">
              {m.note}
              <Input
                value={draft.note}
                maxLength={1000}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </label>
            {draft.id && (
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  size="small"
                  checked={draft.active}
                  onChange={(active) => setDraft({ ...draft, active })}
                />
                {m.active}
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
