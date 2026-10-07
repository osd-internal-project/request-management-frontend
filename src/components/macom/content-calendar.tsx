"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Calendar,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Table,
  Tag,
  Upload,
} from "antd";
import {
  CopyOutlined,
  LinkOutlined,
  PaperClipOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { appApi } from "@/lib/api/client";
import { ROUTES } from "@/lib/routes";
import {
  CONTENT_CHANNELS,
  type ContentDetail,
  type ContentItem,
  type ContentStatus,
} from "@/lib/api/content";
import { messages } from "@/lib/messages";

const m = messages.content;

const CHANNEL_COLOR: Record<string, string> = {
  line_oa: "green",
  facebook: "blue",
  tiktok: "magenta",
  instagram: "purple",
  website: "cyan",
  email: "gold",
};
const STATUS_COLOR: Record<ContentStatus, string> = {
  draft: "default",
  pending_approval: "warning",
  ready: "processing",
  published: "success",
  cancelled: "error",
};

interface Draft {
  title: string;
  channel: string;
  plannedAt: Dayjs | null;
  caption: string;
  ownerId: string;
  campaignId: string | null;
  mentions: { customer: boolean; price: boolean; partner: boolean };
}

type Option = { id: string; name: string };

/**
 * CD-271 — what goes out where and when: a month calendar (by planned time,
 * coloured by channel) or a list, and a drawer to plan one post — words,
 * media, then Ready → Published with the live link. Posting to the
 * platforms is done by the team; this keeps the plan and the record.
 */
export function ContentCalendar({
  canManage,
  me,
  campaigns,
  people,
}: {
  canManage: boolean;
  me: string;
  campaigns: Option[];
  people: Option[];
}) {
  const { message } = App.useApp();
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf("month"));
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [channel, setChannel] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [campaignId, setCampaignId] = useState<string | undefined>();
  const [rows, setRows] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ContentDetail | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishUrl, setPublishUrl] = useState("");
  const [reason, setReason] = useState("");
  const [reload, setReload] = useState(0);

  const query = useCallback(() => {
    const params = new URLSearchParams({
      from: month.startOf("month").format("YYYY-MM-DD"),
      to: month.endOf("month").format("YYYY-MM-DD"),
    });
    if (channel) params.set("channel", channel);
    if (status) params.set("status", status);
    if (campaignId) params.set("campaign_id", campaignId);
    return `macom/content?${params.toString()}`;
  }, [month, channel, status, campaignId]);

  useEffect(() => {
    let live = true;
    void appApi<ContentItem[]>(query()).then((result) => {
      if (!live) return;
      if (result.ok) {
        setError(null);
        setRows(result.data);
      } else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [query, reload]);

  function startNew(day?: Dayjs) {
    setOpen("new");
    setDraft({
      title: "",
      channel: "facebook",
      plannedAt: (day ?? dayjs()).hour(10).minute(0).second(0),
      caption: "",
      ownerId: me,
      campaignId: campaignId ?? null,
      mentions: { customer: false, price: false, partner: false },
    });
  }

  async function openItem(id: string) {
    const result = await appApi<ContentDetail>(`macom/content/${id}`);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    show(result.data);
  }

  function show(item: ContentDetail) {
    setOpen(item);
    setPublishUrl("");
    setReason("");
    setDraft({
      title: item.title,
      channel: item.channel,
      plannedAt: dayjs(item.planned_at),
      caption: item.caption,
      ownerId: item.owner.id,
      campaignId: item.campaign?.id ?? null,
      mentions: item.mentions,
    });
  }

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    const result = await appApi<ContentDetail>(path, init);
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return null;
    }
    show(result.data);
    setReload((n) => n + 1);
    message.success(m.saved);
    return result.data;
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim() || !draft.plannedAt) {
      message.error(m.required);
      return;
    }
    const body = JSON.stringify({
      title: draft.title.trim(),
      channel: draft.channel,
      planned_at: draft.plannedAt.toISOString(),
      caption: draft.caption,
      ...(draft.ownerId ? { owner_user_id: draft.ownerId } : {}),
      campaign_id: draft.campaignId ?? "",
      mentions_customer: draft.mentions.customer,
      mentions_price: draft.mentions.price,
      mentions_partner: draft.mentions.partner,
    });
    if (open === "new") {
      await call("macom/content", { method: "POST", body });
    } else if (open) {
      await call(`macom/content/${open.id}`, { method: "PUT", body });
    }
  }

  function move(next: ContentStatus, extra: Record<string, string> = {}) {
    if (!open || open === "new") return;
    void call(`macom/content/${open.id}/move`, {
      method: "POST",
      body: JSON.stringify({ status: next, ...extra }),
    });
  }

  const item = open && open !== "new" ? open : null;
  const editable =
    canManage && (!item || item.status === "draft" || item.status === "ready");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={(value) => setView(value as "calendar" | "list")}
          options={[
            { value: "calendar", label: m.views.calendar },
            { value: "list", label: m.views.list },
          ]}
        />
        <DatePicker
          picker="month"
          allowClear={false}
          value={month}
          format="MM/YYYY"
          onChange={(value) => value && setMonth(value.startOf("month"))}
        />
        <Select
          allowClear
          className="w-40"
          placeholder={m.allChannels}
          value={channel}
          onChange={setChannel}
          options={CONTENT_CHANNELS.map((value) => ({
            value,
            label: m.channels[value],
          }))}
        />
        <Select
          allowClear
          className="w-36"
          placeholder={m.allStatuses}
          value={status}
          onChange={setStatus}
          options={(["draft", "ready", "published", "cancelled"] as const).map(
            (value) => ({ value, label: m.statuses[value] }),
          )}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          className="w-56"
          placeholder={m.allCampaigns}
          value={campaignId}
          onChange={setCampaignId}
          options={campaigns.map((row) => ({ value: row.id, label: row.name }))}
        />
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="ml-auto"
            onClick={() => startNew()}
          >
            {m.create}
          </Button>
        )}
      </div>

      {error && <Alert type="error" showIcon title={error} />}

      <Card size="small">
        {rows === null ? (
          <div className="py-10 text-center">
            <Spin />
          </div>
        ) : view === "calendar" ? (
          <Calendar
            value={month}
            headerRender={() => null}
            onSelect={(day, info) => {
              if (
                info.source === "date" &&
                canManage &&
                day.isSame(month, "month")
              ) {
                startNew(day);
              }
            }}
            cellRender={(day, info) => {
              if (info.type !== "date") return info.originNode;
              const today = rows.filter((row) =>
                dayjs(row.planned_at).isSame(day, "day"),
              );
              return (
                <ul className="m-0 list-none p-0">
                  {today.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="w-full cursor-pointer truncate text-left text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openItem(row.id);
                        }}
                      >
                        <Tag
                          color={CHANNEL_COLOR[row.channel]}
                          className="mr-1! px-1! text-[10px]!"
                        >
                          {m.channelShort[row.channel]}
                        </Tag>
                        <span
                          className={
                            row.status === "cancelled"
                              ? "line-through opacity-60"
                              : row.status === "published"
                                ? "opacity-70"
                                : ""
                          }
                        >
                          {dayjs(row.planned_at).format("HH:mm")} {row.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              );
            }}
          />
        ) : (
          <Table<ContentItem>
            rowKey="id"
            size="small"
            dataSource={rows}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            scroll={{ x: true }}
            locale={{ emptyText: m.empty }}
            onRow={(row) => ({ onClick: () => void openItem(row.id) })}
            rowClassName="cursor-pointer"
            columns={[
              {
                title: m.columns.when,
                dataIndex: "planned_at",
                render: (value: string) => dayjs(value).format("DD/MM HH:mm"),
              },
              {
                title: m.columns.title,
                dataIndex: "title",
                render: (value: string, row) => (
                  <div>
                    <div>{value}</div>
                    {row.campaign && (
                      <Text type="secondary" className="text-xs">
                        {row.campaign.name}
                      </Text>
                    )}
                  </div>
                ),
              },
              {
                title: m.columns.channel,
                dataIndex: "channel",
                render: (value: string) => (
                  <Tag color={CHANNEL_COLOR[value]}>{m.channels[value]}</Tag>
                ),
              },
              {
                title: m.columns.status,
                dataIndex: "status",
                render: (value: ContentStatus) => (
                  <Tag color={STATUS_COLOR[value]}>{m.statuses[value]}</Tag>
                ),
              },
              {
                title: m.columns.owner,
                key: "owner",
                render: (_: unknown, row) => row.owner.name,
              },
              {
                key: "link",
                render: (_: unknown, row) =>
                  row.published_url && (
                    <a
                      href={row.published_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <LinkOutlined />
                    </a>
                  ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer
        open={open !== null}
        size={560}
        title={open === "new" ? m.create : item?.title}
        onClose={() => {
          setOpen(null);
          setDraft(null);
        }}
        destroyOnHidden
        extra={
          item && (
            <Tag color={STATUS_COLOR[item.status]}>
              {m.statuses[item.status]}
              {item.version > 1 && ` · v${item.version}`}
            </Tag>
          )
        }
      >
        {draft && (
          <div className="space-y-3">
            <label className="block">
              <Text className="text-xs">{m.fields.title}</Text>
              <Input
                value={draft.title}
                maxLength={255}
                disabled={!editable}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <Text className="text-xs">{m.fields.channel}</Text>
                <Select
                  className="w-full"
                  value={draft.channel}
                  disabled={!editable}
                  onChange={(value: string) =>
                    setDraft({ ...draft, channel: value })
                  }
                  options={CONTENT_CHANNELS.map((value) => ({
                    value,
                    label: m.channels[value],
                  }))}
                />
              </label>
              <label className="block">
                <Text className="text-xs">{m.fields.plannedAt}</Text>
                <DatePicker
                  className="w-full"
                  showTime={{ format: "HH:mm" }}
                  format="DD/MM/YYYY HH:mm"
                  value={draft.plannedAt}
                  disabled={!editable}
                  onChange={(value) => setDraft({ ...draft, plannedAt: value })}
                />
              </label>
              <label className="block">
                <Text className="text-xs">{m.fields.owner}</Text>
                <Select
                  className="w-full"
                  showSearch
                  optionFilterProp="label"
                  value={draft.ownerId || undefined}
                  disabled={!editable}
                  onChange={(value: string) =>
                    setDraft({ ...draft, ownerId: value })
                  }
                  options={people.map((row) => ({
                    value: row.id,
                    label: row.name,
                  }))}
                />
              </label>
              <label className="block">
                <Text className="text-xs">{m.fields.campaign}</Text>
                <Select
                  className="w-full"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={m.noCampaign}
                  value={draft.campaignId ?? undefined}
                  disabled={!editable}
                  onChange={(value?: string) =>
                    setDraft({ ...draft, campaignId: value ?? null })
                  }
                  options={campaigns.map((row) => ({
                    value: row.id,
                    label: row.name,
                  }))}
                />
              </label>
            </div>
            <div>
              <Text className="block text-xs">{m.fields.mentions}</Text>
              {(["customer", "price", "partner"] as const).map((key) => (
                <Checkbox
                  key={key}
                  checked={draft.mentions[key]}
                  disabled={!editable}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      mentions: {
                        ...draft.mentions,
                        [key]: event.target.checked,
                      },
                    })
                  }
                >
                  {m.mentions[key]}
                </Checkbox>
              ))}
              <Text type="secondary" className="block text-xs">
                {m.mentionsHint}
              </Text>
            </div>
            <label className="block">
              <Text className="text-xs">{m.fields.caption}</Text>
              <Input.TextArea
                rows={6}
                maxLength={10000}
                showCount
                value={draft.caption}
                disabled={!editable}
                onChange={(event) =>
                  setDraft({ ...draft, caption: event.target.value })
                }
              />
            </label>
            {editable && (
              <Button type="primary" loading={busy} onClick={() => void save()}>
                {m.save}
              </Button>
            )}

            {item && (
              <>
                <div>
                  <Text strong className="block">
                    {m.files}
                  </Text>
                  {item.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <a
                        href={`/api/app/macom/content/${item.id}/files/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <PaperClipOutlined /> {file.file_name}
                      </a>
                      {editable && (
                        <Popconfirm
                          title={m.removeFile}
                          onConfirm={() =>
                            void call(
                              `macom/content/${item.id}/files/${file.id}`,
                              { method: "DELETE" },
                            )
                          }
                        >
                          <a className="text-xs">✕</a>
                        </Popconfirm>
                      )}
                    </div>
                  ))}
                  {editable && (
                    <Upload
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,application/pdf"
                      showUploadList={false}
                      beforeUpload={(file) => {
                        const form = new FormData();
                        form.append("file", file);
                        void call(`macom/content/${item.id}/files`, {
                          method: "POST",
                          body: form,
                        });
                        return false;
                      }}
                    >
                      <Button size="small" className="mt-1">
                        {m.attach}
                      </Button>
                    </Upload>
                  )}
                </div>

                {item.published_url && (
                  <div className="text-sm">
                    <Text type="secondary">{m.publishedAt}: </Text>
                    <a
                      href={item.published_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.published_url}
                    </a>
                  </div>
                )}
                {item.needs_approval && (
                  <div className="text-sm">
                    <Text type="secondary">{m.approvalLabel}: </Text>
                    {
                      m.approvalStatuses[
                        item.approval.status === "approved" &&
                        !item.approval.current
                          ? "outdated"
                          : item.approval.status
                      ]
                    }
                    {item.approval.request_id && (
                      <>
                        {" · "}
                        <Link
                          href={ROUTES.requestDetail(item.approval.request_id)}
                        >
                          {m.viewRequest}
                        </Link>
                      </>
                    )}
                    {item.approval.note && (
                      <div className="text-xs text-black/60">
                        {item.approval.note}
                      </div>
                    )}
                  </div>
                )}
                {item.cancel_reason && (
                  <Alert
                    type="warning"
                    showIcon
                    title={m.cancelled(item.cancel_reason)}
                  />
                )}

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
                    {item.status === "draft" &&
                      (item.needs_approval && !item.approval.current ? (
                        <Button
                          type="primary"
                          loading={busy}
                          onClick={() =>
                            void call(`macom/content/${item.id}/approval`, {
                              method: "POST",
                              body: JSON.stringify({}),
                            })
                          }
                        >
                          {m.sendForApproval}
                        </Button>
                      ) : (
                        <Button onClick={() => move("ready")}>
                          {m.markReady}
                        </Button>
                      ))}
                    {item.status === "pending_approval" && (
                      <Popconfirm
                        title={m.withdrawConfirm}
                        onConfirm={() =>
                          void call(
                            `macom/content/${item.id}/approval/withdraw`,
                            { method: "POST", body: JSON.stringify({}) },
                          )
                        }
                      >
                        <Button>{m.withdraw}</Button>
                      </Popconfirm>
                    )}
                    {item.status === "ready" && (
                      <>
                        <Input
                          className="max-w-xs"
                          placeholder={m.publishedUrl}
                          value={publishUrl}
                          onChange={(event) =>
                            setPublishUrl(event.target.value)
                          }
                        />
                        <Button
                          type="primary"
                          disabled={!publishUrl.trim()}
                          onClick={() =>
                            move("published", {
                              published_url: publishUrl.trim(),
                            })
                          }
                        >
                          {m.markPublished}
                        </Button>
                        <Button onClick={() => move("draft")}>
                          {m.backToDraft}
                        </Button>
                      </>
                    )}
                    {item.status === "cancelled" && (
                      <Button onClick={() => move("draft")}>
                        {m.backToDraft}
                      </Button>
                    )}
                    {(item.status === "draft" || item.status === "ready") && (
                      <Popconfirm
                        title={
                          <Input
                            placeholder={m.cancelReason}
                            value={reason}
                            maxLength={500}
                            onChange={(event) => setReason(event.target.value)}
                          />
                        }
                        okButtonProps={{ disabled: !reason.trim() }}
                        onOpenChange={(next) => next && setReason("")}
                        onConfirm={() =>
                          move("cancelled", { reason: reason.trim() })
                        }
                      >
                        <Button danger>{m.cancel}</Button>
                      </Popconfirm>
                    )}
                    <Select
                      className="w-48"
                      placeholder={
                        <span>
                          <CopyOutlined /> {m.copyTo}
                        </span>
                      }
                      value={null}
                      options={CONTENT_CHANNELS.filter(
                        (value) => value !== item.channel,
                      ).map((value) => ({ value, label: m.channels[value] }))}
                      onChange={(value: string) =>
                        void call(`macom/content/${item.id}/copy`, {
                          method: "POST",
                          body: JSON.stringify({ channel: value }),
                        })
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
