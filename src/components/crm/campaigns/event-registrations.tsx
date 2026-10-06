"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
} from "antd";
import { ArrowLeftOutlined, UserAddOutlined } from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { EventRegistrations } from "@/lib/api/campaigns";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.campaigns.events;

type Row = EventRegistrations["registrations"][number];
type View = "all" | "attended" | "waitlisted" | "follow";

interface WalkIn {
  contact_name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  need: string;
}

const EMPTY_WALK_IN: WalkIn = {
  contact_name: "",
  company: "",
  position: "",
  phone: "",
  email: "",
  need: "",
};

/**
 * CD-270 — an event's registrants. On the day: search a name, tick who came,
 * add walk-ins. After: what each said, then turn the interested ones into
 * Leads (through the CD-269 screening). Works on a phone at the door.
 */
export function EventRegistrationsView({ campaignId }: { campaignId: string }) {
  const { message } = App.useApp();
  const [data, setData] = useState<EventRegistrations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const [walkIn, setWalkIn] = useState<WalkIn | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const result = await appApi<EventRegistrations>(
      `macom/events/${campaignId}/registrations`,
    );
    if (result.ok) {
      setError(null);
      setData(result.data);
    } else setError(result.message);
  }, [campaignId]);

  useEffect(() => {
    let live = true;
    void appApi<EventRegistrations>(
      `macom/events/${campaignId}/registrations`,
    ).then((result) => {
      if (!live) return;
      if (result.ok) setData(result.data);
      else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, [campaignId]);

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    const result = await appApi<EventRegistrations>(path, init);
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return false;
    }
    setData(result.data);
    return true;
  }

  async function convert() {
    setBusy(true);
    const result = await appApi<{
      converted: number;
      created: number;
      customer: number;
      repeat: number;
      failed: { id: string; reason: string }[];
      view: EventRegistrations;
    }>(`macom/events/${campaignId}/convert`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setData(result.data.view);
    message.success(
      m.converted(
        result.data.created,
        result.data.customer,
        result.data.repeat,
      ),
    );
    if (result.data.failed.length) {
      message.warning(m.convertFailed(result.data.failed.length));
    }
  }

  async function addWalkIn() {
    if (!walkIn?.contact_name.trim()) {
      message.error(m.walkInNameRequired);
      return;
    }
    const body = Object.fromEntries(
      Object.entries(walkIn).filter(([, value]) => value.trim()),
    );
    if (
      await call(`macom/events/${campaignId}/walk-ins`, {
        method: "POST",
        body: JSON.stringify(body),
      })
    ) {
      setWalkIn(null);
      message.success(m.walkInAdded);
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.registrations ?? []).filter((row) => {
      if (view === "attended" && !row.attended_at) return false;
      if (view === "waitlisted" && row.status !== "waitlisted") return false;
      if (view === "follow" && (!row.attended_at || row.lead_id)) return false;
      if (!q) return true;
      return [row.contact_name, row.company, row.phone, row.email]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(q));
    });
  }, [data, search, view]);

  if (error && !data) {
    return <Alert type="error" showIcon title={error} />;
  }
  if (!data) {
    return (
      <div className="py-16 text-center">
        <Spin />
      </div>
    );
  }

  const { event, counts } = data;
  const convertible = data.registrations.filter(
    (row) => row.convertible,
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <Link href={ROUTES.campaigns} className="text-sm">
          <ArrowLeftOutlined /> {m.back}
        </Link>
        <Title level={4} className="mt-1! mb-0!">
          {event.name}
        </Title>
        <Text type="secondary">
          {[
            event.starts_at &&
              `${dayjs(event.starts_at).format("DD/MM/YYYY HH:mm")}${
                event.ends_at ? `–${dayjs(event.ends_at).format("HH:mm")}` : ""
              }`,
            event.venue,
            event.capacity ? m.capacity(event.capacity) : m.noLimit,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {(
          [
            ["registered", counts.registered],
            ["waitlisted", counts.waitlisted],
            ["attended", counts.attended],
            ["walkIns", counts.walkIns],
            ["interested", counts.interested],
            ["converted", counts.converted],
            ["cancelled", counts.cancelled],
          ] as const
        ).map(([key, value]) => (
          <Card size="small" key={key}>
            <Statistic title={m.counts[key]} value={value} />
          </Card>
        ))}
      </div>

      <Card size="small">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input.Search
            allowClear
            className="max-w-xs"
            placeholder={m.search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: m.views.all },
              { value: "attended", label: m.views.attended },
              { value: "waitlisted", label: m.views.waitlisted },
              { value: "follow", label: m.views.follow },
            ]}
          />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              icon={<UserAddOutlined />}
              onClick={() => setWalkIn({ ...EMPTY_WALK_IN })}
            >
              {m.walkIn}
            </Button>
            <Popconfirm
              title={m.convertConfirm(convertible)}
              onConfirm={() => void convert()}
              disabled={!convertible}
            >
              <Button type="primary" disabled={!convertible} loading={busy}>
                {m.convert(convertible)}
              </Button>
            </Popconfirm>
          </div>
        </div>

        <Table<Row>
          rowKey="id"
          size="small"
          dataSource={rows}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          scroll={{ x: true }}
          locale={{ emptyText: m.empty }}
          columns={[
            {
              title: m.columns.attended,
              key: "attended",
              width: 70,
              render: (_: unknown, row) => (
                <Checkbox
                  aria-label={m.columns.attended}
                  checked={Boolean(row.attended_at)}
                  disabled={row.status === "cancelled" || Boolean(row.lead_id)}
                  onChange={(event) =>
                    void call(`macom/event-registrations/${row.id}/check-in`, {
                      method: "POST",
                      body: JSON.stringify({ attended: event.target.checked }),
                    })
                  }
                />
              ),
            },
            {
              title: m.columns.person,
              key: "person",
              render: (_: unknown, row) => (
                <div>
                  <Text strong>{row.contact_name}</Text>{" "}
                  {row.walk_in && <Tag>{m.walkInTag}</Tag>}
                  {row.status !== "registered" && (
                    <Tag
                      color={row.status === "waitlisted" ? "orange" : "default"}
                    >
                      {m.statuses[row.status]}
                    </Tag>
                  )}
                  <div className="text-xs text-black/60">
                    {[row.position, row.company].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-xs text-black/60">
                    {[row.phone, row.email].filter(Boolean).join(" · ")}
                  </div>
                  {row.need && (
                    <div className="text-xs text-black/60">{row.need}</div>
                  )}
                </div>
              ),
            },
            {
              title: m.columns.interest,
              key: "interest",
              width: 260,
              render: (_: unknown, row) =>
                row.lead_id ? (
                  <span className="text-xs">
                    <Link href={ROUTES.leadDetail(row.lead_id)}>
                      {m.leadLink}
                    </Link>{" "}
                    <Text type="secondary">
                      {m.outcomes[row.lead_outcome ?? "created"]}
                    </Text>
                  </span>
                ) : (
                  <div className="space-y-1">
                    <Select
                      size="small"
                      allowClear
                      className="w-full"
                      placeholder={m.interestPlaceholder}
                      disabled={!row.attended_at}
                      value={row.interest ?? undefined}
                      options={(
                        ["interested", "later", "not_interested"] as const
                      ).map((value) => ({
                        value,
                        label: m.interests[value],
                      }))}
                      onChange={(value?: string) =>
                        void call(
                          `macom/event-registrations/${row.id}/follow`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({ interest: value ?? "" }),
                          },
                        )
                      }
                    />
                    {row.attended_at && (
                      <Input
                        size="small"
                        maxLength={1500}
                        placeholder={m.notePlaceholder}
                        value={notes[row.id] ?? row.follow_note ?? ""}
                        onChange={(event) =>
                          setNotes({ ...notes, [row.id]: event.target.value })
                        }
                        onBlur={() => {
                          const next = notes[row.id];
                          if (
                            next === undefined ||
                            next === (row.follow_note ?? "")
                          )
                            return;
                          void call(
                            `macom/event-registrations/${row.id}/follow`,
                            {
                              method: "PATCH",
                              body: JSON.stringify({ follow_note: next }),
                            },
                          );
                        }}
                      />
                    )}
                  </div>
                ),
            },
            {
              key: "actions",
              width: 120,
              render: (_: unknown, row) =>
                row.lead_id ? null : (
                  <span className="flex flex-col gap-1 text-xs">
                    {row.status === "waitlisted" && (
                      <a
                        onClick={() =>
                          void call(
                            `macom/event-registrations/${row.id}/status`,
                            {
                              method: "POST",
                              body: JSON.stringify({ status: "registered" }),
                            },
                          )
                        }
                      >
                        {m.seat}
                      </a>
                    )}
                    {row.status !== "cancelled" && (
                      <Popconfirm
                        title={m.cancelConfirm}
                        onConfirm={() =>
                          void call(
                            `macom/event-registrations/${row.id}/status`,
                            {
                              method: "POST",
                              body: JSON.stringify({ status: "cancelled" }),
                            },
                          )
                        }
                      >
                        <a>{m.cancel}</a>
                      </Popconfirm>
                    )}
                  </span>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        open={walkIn !== null}
        title={m.walkInTitle}
        okText={m.walkInAdd}
        confirmLoading={busy}
        onOk={() => void addWalkIn()}
        onCancel={() => setWalkIn(null)}
        destroyOnHidden
      >
        {walkIn && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                ["contact_name", m.fields.contactName],
                ["company", m.fields.company],
                ["position", m.fields.position],
                ["phone", m.fields.phone],
                ["email", m.fields.email],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <Text className="text-xs">{label}</Text>
                <Input
                  value={walkIn[key]}
                  maxLength={255}
                  onChange={(event) =>
                    setWalkIn({ ...walkIn, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <label className="block sm:col-span-2">
              <Text className="text-xs">{m.fields.need}</Text>
              <Input.TextArea
                rows={2}
                maxLength={1500}
                value={walkIn.need}
                onChange={(event) =>
                  setWalkIn({ ...walkIn, need: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>

      {error && <Alert type="warning" showIcon title={error} />}
      <Button type="link" className="px-0!" onClick={() => void load()}>
        {m.refresh}
      </Button>
    </div>
  );
}
