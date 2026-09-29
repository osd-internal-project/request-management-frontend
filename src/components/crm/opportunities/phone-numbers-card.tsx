"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import type {
  AvailablePhoneNumber,
  PhoneReservation,
  PhoneReservationsView,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

const m = messages.sales.opportunities.detail.phoneNumbers;

/** `021008888` → `02-100-8888`, `0861234567` → `086-123-4567`. */
export function formatPhoneNumber(number: string): string {
  if (/^02\d{7}$/.test(number)) {
    return `${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`;
  }
  if (/^0\d{9}$/.test(number)) {
    return `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`;
  }
  return number;
}

const STATUS_COLOR: Record<PhoneReservation["status"], string> = {
  reserved: "blue",
  released: "default",
  expired: "orange",
};

const digits = (value: string) => value.replace(/\D/g, "");

/**
 * CD-78 — เลขหมายที่จอง: numbers held for this deal in Reserve-phone. Search
 * free numbers (asked live — nothing here keeps an inventory), tick some,
 * hold them for N days; extend or give back each one. A closed deal can still
 * give numbers back but not take or extend any.
 */
export function PhoneNumbersCard({
  opportunityId,
  view,
  editable,
  canManage,
}: {
  readonly opportunityId: string;
  readonly view: PhoneReservationsView;
  /** Open deal + crm.sales.manage — may search, reserve and extend. */
  readonly editable: boolean;
  /** crm.sales.manage — may give numbers back, deal open or not. */
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [contains, setContains] = useState("");
  const [prefix, setPrefix] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [found, setFound] = useState<AvailablePhoneNumber[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [holdDays, setHoldDays] = useState(view.holdDays);
  const [failed, setFailed] = useState<{ number: string; reason: string }[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extending, setExtending] = useState<PhoneReservation | null>(null);
  const [extendDays, setExtendDays] = useState(view.holdDays);

  const base = `opportunities/${opportunityId}/phone-numbers`;
  const live = view.reservations.filter((row) => row.status === "reserved");
  const today = dayjs().startOf("day");

  function openSearch() {
    setOpen(true);
    setFound(null);
    setPicked([]);
    setFailed([]);
    setError(null);
    setHoldDays(view.holdDays);
  }

  async function search() {
    setBusy(true);
    setError(null);
    const params = new URLSearchParams();
    if (contains) params.set("contains", contains);
    if (prefix) params.set("prefix", prefix);
    if (category) params.set("category", category);
    const result = await appApi<{ numbers: AvailablePhoneNumber[] }>(
      `${base}/available?${params.toString()}`,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setFound(result.data.numbers);
    setPicked((list) =>
      list.filter((number) =>
        result.data.numbers.some((row) => row.number === number),
      ),
    );
  }

  async function reserve() {
    setBusy(true);
    setError(null);
    const result = await appApi<{
      reserved: { number: string }[];
      failed: { number: string; reason: string }[];
    }>(base, {
      method: "POST",
      body: JSON.stringify({ numbers: picked, hold_days: holdDays }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.data.reserved.length) {
      message.success(m.reservedCount(result.data.reserved.length));
      router.refresh();
    }
    if (result.data.failed.length) {
      // Stay open: say which ones, and let the search be run again.
      setFailed(result.data.failed);
      setPicked([]);
      void search();
      return;
    }
    setOpen(false);
  }

  async function extend() {
    if (!extending) return;
    setBusy(true);
    const result = await appApi(`${base}/${extending.id}/extend`, {
      method: "POST",
      body: JSON.stringify({ hold_days: extendDays }),
    });
    setBusy(false);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.extended);
    setExtending(null);
    router.refresh();
  }

  async function release(row: PhoneReservation) {
    const result = await appApi(`${base}/${row.id}/release`, {
      method: "POST",
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(m.released);
    router.refresh();
  }

  const categoryTag = (value: string) => (
    <Tag color={value === "golden" ? "gold" : undefined}>
      {m.categoryLabel[value] ?? value}
    </Tag>
  );

  return (
    <Card
      size="small"
      title={`${m.title} · ${live.length}`}
      extra={
        editable ? (
          <Button size="small" type="primary" onClick={openSearch}>
            {m.reserve}
          </Button>
        ) : null
      }
    >
      {view.mode === "mock" && (
        <Alert type="info" showIcon className="mb-2!" title={m.mockNotice} />
      )}
      {view.reservations.length ? (
        <Table<PhoneReservation>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={view.reservations}
          scroll={{ x: 640 }}
          columns={[
            {
              title: m.number,
              key: "number",
              render: (_: unknown, row) => (
                <span
                  className={
                    row.status === "reserved"
                      ? "font-medium"
                      : "text-gray-400 line-through"
                  }
                >
                  {formatPhoneNumber(row.number)}
                </span>
              ),
            },
            {
              title: m.category,
              key: "category",
              render: (_: unknown, row) => categoryTag(row.category),
            },
            {
              title: m.expiresAt,
              key: "expiresAt",
              render: (_: unknown, row) => {
                if (row.status === "released") {
                  return (
                    <Tag color={STATUS_COLOR.released}>
                      {row.releaseReason === "deal_lost"
                        ? m.releasedByLost
                        : m.status.released}
                    </Tag>
                  );
                }
                if (row.status === "expired") {
                  return (
                    <Tag color={STATUS_COLOR.expired}>{m.status.expired}</Tag>
                  );
                }
                const days = dayjs(row.expiresAt)
                  .startOf("day")
                  .diff(today, "day");
                return (
                  <span className={days <= 3 ? "text-orange-500" : undefined}>
                    {dayjs(row.expiresAt).format("D MMM YYYY")}
                    <Text type="secondary" className="ml-1 text-xs">
                      {m.daysLeft(days)}
                    </Text>
                  </span>
                );
              },
            },
            {
              title: m.by,
              key: "by",
              render: (_: unknown, row) => (
                <Text type="secondary" className="text-xs">
                  {row.createdByName} ·{" "}
                  {dayjs(row.createdAt).format("D MMM YY")}
                </Text>
              ),
            },
            {
              key: "actions",
              align: "right",
              fixed: "right",
              render: (_: unknown, row) =>
                row.status === "reserved" && canManage ? (
                  <Space size={4}>
                    {editable && (
                      <Button
                        size="small"
                        onClick={() => {
                          setExtending(row);
                          setExtendDays(view.holdDays);
                        }}
                      >
                        {m.extend}
                      </Button>
                    )}
                    <Popconfirm
                      title={m.releaseConfirm}
                      onConfirm={() => release(row)}
                    >
                      <Button size="small" danger>
                        {m.release}
                      </Button>
                    </Popconfirm>
                  </Space>
                ) : null,
            },
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={open}
        title={m.searchTitle}
        onCancel={() => setOpen(false)}
        width={640}
        okText={m.reserveSelected(picked.length)}
        okButtonProps={{ disabled: !picked.length, loading: busy }}
        onOk={() => void reserve()}
      >
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              value={contains}
              placeholder={m.containsPlaceholder}
              prefix={
                <Text type="secondary" className="text-xs">
                  {m.contains}
                </Text>
              }
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => setContains(digits(event.target.value))}
              onPressEnter={() => void search()}
            />
            <Input
              value={prefix}
              placeholder={m.prefixPlaceholder}
              prefix={
                <Text type="secondary" className="text-xs">
                  {m.prefix}
                </Text>
              }
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => setPrefix(digits(event.target.value))}
              onPressEnter={() => void search()}
            />
            <Select
              allowClear
              value={category}
              placeholder={m.anyCategory}
              onChange={setCategory}
              options={Object.entries(m.categoryLabel).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <Button loading={busy} onClick={() => void search()}>
              {m.search}
            </Button>
          </div>

          {failed.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title={m.failedTitle}
              description={failed
                .map(
                  (row) => `${formatPhoneNumber(row.number)} — ${row.reason}`,
                )
                .join(" · ")}
            />
          )}
          {error && <Alert type="error" showIcon title={error} />}

          {found &&
            (found.length ? (
              <Checkbox.Group
                className="grid! grid-cols-2 gap-2 sm:grid-cols-3"
                value={picked}
                onChange={(values) => setPicked(values as string[])}
              >
                {found.map((row) => (
                  <Checkbox key={row.number} value={row.number}>
                    <span className="font-medium">
                      {formatPhoneNumber(row.number)}
                    </span>{" "}
                    {row.category === "golden" && categoryTag(row.category)}
                    {row.fee ? (
                      <Text type="secondary" className="block text-xs">
                        {m.fee} {formatAmount(row.fee)}
                      </Text>
                    ) : null}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={m.noResult}
              />
            ))}

          <div className="flex items-center gap-2">
            <Text>{m.holdDays(view.maxHoldDays)}</Text>
            <InputNumber
              min={1}
              max={view.maxHoldDays}
              value={holdDays}
              onChange={(value) => setHoldDays(value ?? view.holdDays)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(extending)}
        title={
          extending ? m.extendTitle(formatPhoneNumber(extending.number)) : ""
        }
        onCancel={() => setExtending(null)}
        okText={m.extend}
        okButtonProps={{ loading: busy }}
        onOk={() => void extend()}
      >
        <div className="flex items-center gap-2">
          <Text>{m.extendDays}</Text>
          <InputNumber
            min={1}
            max={view.maxHoldDays}
            value={extendDays}
            onChange={(value) => setExtendDays(value ?? view.holdDays)}
          />
        </div>
      </Modal>
    </Card>
  );
}
