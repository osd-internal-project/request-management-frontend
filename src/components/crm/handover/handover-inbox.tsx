"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Drawer,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
} from "antd";
import Text from "antd/es/typography/Text";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import type { SalesHandover } from "@/lib/api/types";
import { TechnicalPackage } from "./technical-package";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import {
  formatWhen,
  HandoverChecklistView,
  HandoverHistory,
  HandoverStatusTag,
} from "./handover-parts";

const m = messages.handover;

/**
 * CD-84 — the handover inbox. `incoming` is what salespeople sent to a team
 * the viewer is in or leads — accepted or returned from here; `sent` is what
 * the viewer sent. The URL carries the box, the status and the open handover,
 * so a notification link lands on the right one.
 */
export function HandoverInbox({
  rows,
  box,
  status,
  opened,
}: {
  rows: SalesHandover[];
  box: "incoming" | "sent";
  status: string | undefined;
  /** `?id=` — the handover to show, fetched on its own (it may be in the other box). */
  opened: SalesHandover | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");

  function go(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  async function decide(action: "accept" | "return") {
    if (!opened) return;
    if (action === "return" && !reason.trim()) {
      setError(m.returnReasonRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi<SalesHandover>(
      `handovers/${opened.id}/${action}`,
      {
        method: "POST",
        body: action === "return" ? JSON.stringify({ reason }) : undefined,
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(action === "accept" ? m.accepted : m.returned);
    setReturning(false);
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Space wrap>
        <Segmented
          value={box}
          options={[
            { value: "incoming", label: m.boxIncoming },
            { value: "sent", label: m.boxSent },
          ]}
          onChange={(value) => go({ box: String(value), id: undefined })}
        />
        <Select
          style={{ width: 160 }}
          value={status ?? ""}
          onChange={(value) => go({ status: value || undefined })}
          options={[
            { value: "", label: m.allStatuses },
            ...["submitted", "accepted", "returned"].map((value) => ({
              value,
              label: m.status[value],
            })),
          ]}
        />
      </Space>

      <Table<SalesHandover>
        size="small"
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 50, hideOnSinglePage: true }}
        locale={{ emptyText: m.empty }}
        onRow={(row) => ({
          onClick: () => go({ id: row.id }),
          className: "cursor-pointer",
        })}
        columns={[
          {
            title: m.columns.deal,
            key: "deal",
            render: (_, row) =>
              row.opportunity ? (
                <div>
                  <div>{row.opportunity.opportunityCode}</div>
                  <Text type="secondary" className="text-xs">
                    {row.opportunity.title}
                  </Text>
                </div>
              ) : (
                "—"
              ),
          },
          {
            title: m.columns.customer,
            key: "customer",
            render: (_, row) => row.opportunity?.customerName ?? "—",
          },
          {
            title: m.columns.team,
            dataIndex: "toOrgUnitName",
            render: (name: string | null) => name ?? "—",
          },
          {
            title: m.columns.owner,
            key: "owner",
            render: (_, row) => row.opportunity?.ownerName ?? "—",
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 120,
            render: (_, row) => <HandoverStatusTag status={row.status} />,
          },
          {
            title: m.columns.updated,
            dataIndex: "updatedAt",
            width: 150,
            render: (at: string) => formatWhen(at),
          },
        ]}
      />

      <Drawer
        open={Boolean(opened)}
        size={560}
        destroyOnHidden
        title={
          opened?.opportunity ? (
            <Space>
              {opened.opportunity.opportunityCode}
              <HandoverStatusTag status={opened.status} />
            </Space>
          ) : null
        }
        onClose={() => {
          setError(null);
          go({ id: undefined });
        }}
        extra={
          opened?.canDecide ? (
            <Space>
              <Button danger disabled={busy} onClick={() => setReturning(true)}>
                {m.returnWork}
              </Button>
              <Button
                type="primary"
                loading={busy}
                onClick={() => void decide("accept")}
              >
                {m.accept}
              </Button>
            </Space>
          ) : null
        }
      >
        {opened && (
          <div className="space-y-4">
            {error && <Alert type="error" showIcon title={error} />}
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label={m.columns.deal}>
                {opened.opportunity?.title ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.customer}>
                {opened.opportunity?.customerName ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={m.amount}>
                {opened.opportunity
                  ? formatAmount(opened.opportunity.amount)
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.owner}>
                {opened.opportunity?.ownerName ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={m.columns.team}>
                {opened.toOrgUnitName ?? "—"}
              </Descriptions.Item>
            </Descriptions>
            {opened.status === "returned" && opened.returnReason && (
              <Alert
                type="warning"
                showIcon
                title={m.returnedBecause(
                  opened.decidedByName ?? "",
                  opened.returnReason,
                )}
              />
            )}
            <HandoverChecklistView items={opened.items} />
            {/* CD-144 — the approved Solution the team receives with it */}
            {opened.technical && (
              <TechnicalPackage pkg={opened.technical} handoverId={opened.id} />
            )}
            {opened.note && (
              <Text className="block whitespace-pre-wrap">{opened.note}</Text>
            )}
            <HandoverHistory entries={opened.history} />
            {opened.opportunity && box === "sent" && (
              <Link href={ROUTES.opportunityDetail(opened.opportunity.id)}>
                {m.openDeal}
              </Link>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={returning}
        title={m.returnWork}
        okText={m.returnWork}
        cancelText={m.cancel}
        okButtonProps={{ danger: true, loading: busy }}
        onOk={() => void decide("return")}
        onCancel={() => setReturning(false)}
        destroyOnHidden
      >
        <Input.TextArea
          autoSize={{ minRows: 3, maxRows: 6 }}
          maxLength={2000}
          placeholder={m.returnReason}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && (
          <Text type="danger" className="mt-2 block text-xs">
            {error}
          </Text>
        )}
      </Modal>
    </div>
  );
}
