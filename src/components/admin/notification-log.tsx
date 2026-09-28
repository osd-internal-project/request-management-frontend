"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AutoComplete,
  Button,
  DatePicker,
  Input,
  Select,
  Table,
  Tag,
} from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
// Type-only: the API module reads `next/headers`, which a client component
// must not pull in.
import type { NotificationLogRow } from "@/lib/api/notification-log";
import { messages } from "@/lib/messages";

const m = messages.notificationLog;
const when = (iso: string) => dayjs(iso).format("DD/MM/YY HH:mm:ss");

const STATUS_COLOR: Record<string, string> = {
  sent: "green",
  queued: "gold",
  failed: "red",
};

/** อ่านแล้วหรือยัง — and whether "read" means opened or only cleared. */
function ReadCell({ row }: { row: NotificationLogRow }) {
  if (!row.read_at) return <Tag>{m.unread}</Tag>;
  const via =
    row.read_via === "opened"
      ? { color: "green", label: m.readOpened }
      : row.read_via === "mark_all"
        ? { color: "blue", label: m.readMarkAll }
        : { color: "default", label: m.readUnknown };
  return (
    <div>
      <Tag color={via.color}>{via.label}</Tag>
      <div className="text-xs text-gray-500">{when(row.read_at)}</div>
    </div>
  );
}

/**
 * CD-55 — filters in the URL (a filtered view is a link an auditor can send),
 * one row per notification, its per-channel deliveries in the expanded row.
 */
export function NotificationLog({
  rows,
  page,
  pageSize,
  total,
  eventTypes,
}: {
  readonly rows: NotificationLogRow[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  /** Suggestions only — anything can be typed. */
  readonly eventTypes: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in patch)) next.delete("page");
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input.Search
          allowClear
          style={{ width: 280 }}
          placeholder={m.searchPlaceholder}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onSearch={(value) => apply({ q: value.trim() || undefined })}
        />
        <AutoComplete
          allowClear
          style={{ width: 220 }}
          placeholder={m.anyEvent}
          value={params.get("event_type") ?? undefined}
          options={eventTypes.map((value) => ({ value }))}
          onSelect={(value: string) => apply({ event_type: value })}
          onClear={() => apply({ event_type: undefined })}
        />
        <Select
          allowClear
          style={{ width: 200 }}
          placeholder={m.anyRead}
          value={params.get("read") ?? undefined}
          onChange={(value?: string) => apply({ read: value })}
          options={[
            { value: "unread", label: m.unread },
            { value: "opened", label: m.readOpened },
            { value: "mark_all", label: m.readMarkAll },
          ]}
        />
        <DatePicker.RangePicker
          showTime
          value={[
            params.get("from") ? dayjs(params.get("from")) : null,
            params.get("to") ? dayjs(params.get("to")) : null,
          ]}
          onChange={(range) =>
            apply({
              from: range?.[0]?.toISOString(),
              to: range?.[1]?.toISOString(),
            })
          }
        />
        <Button
          onClick={() => {
            setQ("");
            router.push("?");
          }}
        >
          {m.clear}
        </Button>
      </div>

      {(params.get("resource_type") || params.get("resource_id")) && (
        <Text type="secondary" className="block text-xs">
          {m.resourceFilter(
            params.get("resource_type") ?? "",
            params.get("resource_id") ?? "",
          )}{" "}
          <a
            onClick={() =>
              apply({ resource_type: undefined, resource_id: undefined })
            }
          >
            {m.clear}
          </a>
        </Text>
      )}

      <Text type="secondary" className="block text-xs">
        {m.resultCount(total)}
      </Text>

      <Table<NotificationLogRow>
        rowKey="id"
        size="small"
        dataSource={rows}
        scroll={{ x: true }}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          hideOnSinglePage: true,
          onChange: (next) => apply({ page: String(next) }),
        }}
        expandable={{
          expandedRowRender: (row) => (
            <div className="space-y-2">
              <Text className="block whitespace-pre-wrap">{row.body}</Text>
              {row.resource_type && (
                <Text type="secondary" className="block text-xs">
                  {m.resource}: {row.resource_type} · {row.resource_id}{" "}
                  <a
                    onClick={() =>
                      apply({
                        resource_type: row.resource_type ?? undefined,
                        resource_id: row.resource_id ?? undefined,
                      })
                    }
                  >
                    {m.sameResource}
                  </a>
                </Text>
              )}
              <table className="text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pr-4 font-normal">{m.channel}</th>
                    <th className="pr-4 font-normal">{m.target}</th>
                    <th className="pr-4 font-normal">{m.deliveryStatus}</th>
                    <th className="font-normal">{m.sentAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {row.deliveries.map((delivery, index) => (
                    <tr key={index}>
                      <td className="pr-4">
                        {m.channels[delivery.channel] ?? delivery.channel}
                      </td>
                      <td className="pr-4">
                        {delivery.channel === "in_app"
                          ? row.recipient.display_name
                          : delivery.target}
                      </td>
                      <td className="pr-4">
                        <Tag color={STATUS_COLOR[delivery.status]}>
                          {m.statuses[delivery.status] ?? delivery.status}
                        </Tag>
                        {delivery.error && (
                          <Text type="danger">{delivery.error}</Text>
                        )}
                      </td>
                      <td>{when(delivery.sent_at ?? delivery.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        }}
        columns={[
          {
            title: m.columns.createdAt,
            dataIndex: "created_at",
            render: (value: string) => (
              <span className="whitespace-nowrap">{when(value)}</span>
            ),
          },
          {
            title: m.columns.recipient,
            key: "recipient",
            render: (_: unknown, row) => (
              <div>
                <div>{row.recipient.display_name}</div>
                <Text type="secondary" className="text-xs">
                  {row.recipient.username}
                </Text>
              </div>
            ),
          },
          {
            title: m.columns.message,
            key: "message",
            render: (_: unknown, row) => (
              <div>
                <div>{row.title}</div>
                <Text type="secondary" className="text-xs">
                  {row.event_type}
                </Text>
              </div>
            ),
          },
          {
            title: m.columns.channels,
            key: "channels",
            render: (_: unknown, row) =>
              row.deliveries.map((delivery, index) => (
                <Tag key={index} color={STATUS_COLOR[delivery.status]}>
                  {m.channels[delivery.channel] ?? delivery.channel}
                </Tag>
              )),
          },
          {
            title: m.columns.read,
            key: "read",
            render: (_: unknown, row) => <ReadCell row={row} />,
          },
        ]}
      />
    </div>
  );
}
