"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Switch,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { adminApi } from "@/lib/api/client";
import type {
  IntakeChannelCode,
  IntakeChannelRow,
} from "@/lib/api/intake-channels";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.intakeChannels;

interface Draft {
  enabled: boolean;
  requesterUserId?: string;
  typeCodes: string[];
  title: string;
  intro: string;
  newLink: boolean;
}

const noSubscribe = () => () => undefined;

const draftOf = (row: IntakeChannelRow): Draft => ({
  enabled: row.enabled,
  requesterUserId: row.requester?.id,
  typeCodes: row.type_codes,
  title: row.title ?? "",
  intro: row.intro ?? "",
  newLink: false,
});

/**
 * CD-66 — one card per channel. The web form also shows its public link;
 * "new link" retires the old one on save, for a link that has leaked.
 */
export function IntakeChannelsAdmin({
  initial,
  types,
  people,
}: {
  readonly initial: IntakeChannelRow[];
  readonly types: { code: string; name: string }[];
  readonly people: { id: string; name: string; detail: string }[];
}) {
  const [rows, setRows] = useState(initial);
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {rows.map((row) => (
        <ChannelCard
          key={row.channel}
          row={row}
          types={types}
          people={people}
          onSaved={(saved) =>
            setRows((list) =>
              list.map((entry) =>
                entry.channel === saved.channel ? saved : entry,
              ),
            )
          }
        />
      ))}
    </div>
  );
}

function ChannelCard({
  row,
  types,
  people,
  onSaved,
}: {
  row: IntakeChannelRow;
  types: { code: string; name: string }[];
  people: { id: string; name: string; detail: string }[];
  onSaved: (row: IntakeChannelRow) => void;
}) {
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft>(() => draftOf(row));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isForm = row.channel === "web_form";
  // The origin is the browser's; the server render has none (no mismatch).
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  const link = row.slug ? `${origin}${ROUTES.publicForm(row.slug)}` : null;

  const set = (next: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...next }));

  async function save() {
    if (!draft.requesterUserId) {
      setError(m.requesterRequired);
      return;
    }
    if (!draft.typeCodes.length) {
      setError(m.typesRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await adminApi<IntakeChannelRow>(
      `intake-channels/${row.channel satisfies IntakeChannelCode}`,
      {
        method: "PUT",
        body: JSON.stringify({
          enabled: draft.enabled,
          requester_user_id: draft.requesterUserId,
          type_codes: draft.typeCodes,
          title: draft.title,
          intro: draft.intro,
          new_link: draft.newLink,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(result.data);
    setDraft(draftOf(result.data));
    message.success(m.saved);
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => undefined);
    message.success(m.copied);
  }

  return (
    <Card
      size="small"
      title={m.channel[row.channel]}
      extra={
        <Space size={6}>
          {!row.configured ? (
            <Tag>{m.notConfigured}</Tag>
          ) : row.enabled ? (
            <Tag color="green">{m.enabled}</Tag>
          ) : (
            <Tag>{m.disabled}</Tag>
          )}
        </Space>
      }
    >
      <div className="space-y-3">
        <Text type="secondary" className="block text-xs">
          {m.channelHint[row.channel]}
        </Text>

        <label className="flex items-center gap-2 text-sm">
          <Switch
            size="small"
            checked={draft.enabled}
            onChange={(enabled) => set({ enabled })}
          />
          {m.enabled}
        </label>

        <div>
          <span className="mb-1 block text-sm">{m.requester}</span>
          <SearchSelect
            className="w-full"
            value={draft.requesterUserId}
            onChange={(value) =>
              set({ requesterUserId: (value as string) || undefined })
            }
            options={people.map((person) => ({
              value: person.id,
              label: person.detail
                ? `${person.name} · ${person.detail}`
                : person.name,
            }))}
          />
          <Text type="secondary" className="mt-1 block text-xs">
            {m.requesterHint}
          </Text>
        </div>

        <div>
          <span className="mb-1 block text-sm">{m.types}</span>
          <SearchSelect
            className="w-full"
            mode="multiple"
            value={draft.typeCodes}
            onChange={(value) => set({ typeCodes: (value as string[]) ?? [] })}
            options={types.map((type) => ({
              value: type.code,
              label: `${type.name} (${type.code})`,
            }))}
          />
        </div>

        {isForm && (
          <>
            <div>
              <span className="mb-1 block text-sm">{m.formTitle}</span>
              <Input
                value={draft.title}
                maxLength={200}
                placeholder={m.formTitlePlaceholder}
                onChange={(event) => set({ title: event.target.value })}
              />
            </div>
            <div>
              <span className="mb-1 block text-sm">{m.intro}</span>
              <Input.TextArea
                rows={3}
                value={draft.intro}
                maxLength={2000}
                onChange={(event) => set({ intro: event.target.value })}
              />
            </div>
            <div>
              <span className="mb-1 block text-sm">{m.link}</span>
              {link ? (
                <>
                  <Space.Compact className="w-full">
                    <Input readOnly value={link} />
                    <Button onClick={copy}>{m.copy}</Button>
                    <Button href={link} target="_blank">
                      {m.open}
                    </Button>
                  </Space.Compact>
                  <div className="mt-1">
                    {draft.newLink ? (
                      <Text type="warning" className="text-xs">
                        {m.newLinkPending}
                      </Text>
                    ) : (
                      <Popconfirm
                        title={m.newLinkConfirm}
                        onConfirm={() => set({ newLink: true })}
                      >
                        <Button size="small" type="link" className="px-0!">
                          {m.newLink}
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                </>
              ) : (
                <Text type="secondary" className="text-xs">
                  {m.linkAfterSave}
                </Text>
              )}
            </div>
          </>
        )}

        {error && <Alert type="error" showIcon title={error} />}

        <div className="flex items-center justify-between gap-2">
          <Text type="secondary" className="text-xs">
            {row.updated_at ? m.updatedAt(row.updated_at) : ""}
          </Text>
          <Button type="primary" loading={busy} onClick={save}>
            {m.save}
          </Button>
        </div>
      </div>
    </Card>
  );
}
