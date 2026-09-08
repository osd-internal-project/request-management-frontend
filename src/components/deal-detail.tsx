"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import dayjs from "dayjs";
import { SearchSelect } from "@/components/search-select";
import { formatAmount } from "@/components/deal-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { DealDetail, DealLostReason, RequestRow } from "@/lib/api/types";

const m = messages.sales.deals;
const md = m.detail;

/**
 * รายละเอียดดีล — และจุดที่ชุดงาน B จบ: ดีลที่มี product เข้าเงื่อนไข KYC +
 * ลูกค้ายังไม่ verified แสดง banner เตือนพร้อมทางไปยื่น KYC (ไม่ block).
 */
export function DealDetailView({
  deal,
  lostReasons,
  relatedRequests,
  canManage,
}: {
  deal: DealDetail;
  lostReasons: DealLostReason[];
  /** null = viewer has no request.read (C360-04: hidden, not empty). */
  relatedRequests: RequestRow[] | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [losing, setLosing] = useState(false);
  const [loseReason, setLoseReason] = useState<string>();
  const [loseText, setLoseText] = useState("");

  const closed = deal.stage === "won" || deal.stage === "lost";
  const editable = canManage && !closed;

  async function act(path: string, body?: unknown) {
    setError(null);
    setBusy(true);
    const result = await appApi(`deals/${deal.id}${path}`, {
      method: path ? "POST" : "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    router.refresh();
    return true;
  }

  async function setStage(stage: string) {
    setError(null);
    const result = await appApi(`deals/${deal.id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
    if (!result.ok) setError(result.message);
    else router.refresh();
  }

  async function win() {
    if (await act("/win")) message.success(md.won);
  }

  async function lose() {
    if (!loseReason) return;
    const done = await act("/lose", {
      reason_code: loseReason,
      reason_text: loseText.trim() || undefined,
    });
    if (done) {
      message.success(md.lostDone);
      setLosing(false);
    }
  }

  const reasonName =
    lostReasons.find((reason) => reason.code === deal.lostReasonCode)?.name ??
    deal.lostReasonCode ??
    "";

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      {deal.stage === "won" && (
        <Alert type="success" showIcon title={md.closedWonBanner} />
      )}
      {deal.stage === "lost" && (
        <Alert
          type="warning"
          showIcon
          title={md.closedLostBanner(reasonName)}
          description={deal.lostReasonText ?? undefined}
        />
      )}

      {/* CM-04 ชุดงาน B — เตือน ไม่ block: ธุรกรรมเดินต่อได้ */}
      {deal.kycWarning.required && !closed && (
        <Alert
          type="warning"
          showIcon
          title={md.kycWarningTitle}
          description={md.kycWarningBody(
            deal.kycWarning.products.join(", "),
            deal.customer.nameTh,
          )}
          action={
            <Link
              href={`${ROUTES.newRequest}?type=KYC&ref_type=customer&ref_id=${deal.customer.id}`}
            >
              <Button size="small" type="primary">
                {md.raiseKyc}
              </Button>
            </Link>
          }
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <Title level={4} className="mb-1!">
            {deal.dealCode} · {deal.title}
          </Title>
          <Space size={6} wrap>
            <Tag color={m.stageColor[deal.stage]}>
              {m.stage[deal.stage] ?? deal.stage}
            </Tag>
            {deal.fromLead && (
              <Text type="secondary" className="text-xs">
                {md.fromLead(deal.fromLead.name)}
              </Text>
            )}
          </Space>
        </div>
        {editable && (
          <Space wrap>
            <SearchSelect
              className="min-w-36"
              value={deal.stage}
              onChange={(value) => void setStage(value as string)}
              options={["qualifying", "proposing", "negotiating"].map(
                (stage) => ({ value: stage, label: m.stage[stage] }),
              )}
            />
            <Button type="primary" loading={busy} onClick={() => void win()}>
              {md.win}
            </Button>
            <Button danger onClick={() => setLosing(true)}>
              {md.lose}
            </Button>
          </Space>
        )}
      </div>

      <Card size="small">
        <Descriptions
          size="small"
          column={{ xs: 1, md: 3 }}
          items={[
            {
              key: "customer",
              label: md.customerLabel,
              children: (
                <Link href={ROUTES.customerDetail(deal.customer.id)}>
                  {deal.customer.customerCode} · {deal.customer.nameTh}
                  {deal.customer.branchName
                    ? ` · ${deal.customer.branchName}`
                    : ""}
                </Link>
              ),
            },
            {
              key: "amount",
              label: m.columns.amount,
              children: `${formatAmount(deal.amount)} ${deal.currency}`,
            },
            {
              key: "expectedClose",
              label: m.columns.expectedClose,
              children: deal.expectedCloseAt
                ? dayjs(deal.expectedCloseAt).format("D MMM YYYY")
                : "—",
            },
            {
              key: "products",
              label: m.form.products,
              children: deal.products.length ? (
                <Space size={4} wrap>
                  {deal.products.map((product) => (
                    <Tag key={product.productCode}>{product.productCode}</Tag>
                  ))}
                </Space>
              ) : (
                "—"
              ),
            },
          ]}
        />
      </Card>

      {relatedRequests !== null && (
        <Card
          size="small"
          title={`${md.tabRequests} · ${relatedRequests.length}`}
          extra={
            <Link
              href={`${ROUTES.newRequest}?ref_type=deal&ref_id=${deal.dealCode}`}
            >
              <Button size="small" type="primary">
                {md.raiseRequest}
              </Button>
            </Link>
          }
        >
          {relatedRequests.length ? (
            <Table<RequestRow>
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={relatedRequests}
              columns={[
                {
                  title: messages.customers.detail.requestColumns.no,
                  dataIndex: "requestNo",
                  render: (no: string | null, row) => (
                    <Link href={ROUTES.requestDetail(row.id)}>
                      {no ?? messages.myWork.noNumber}
                    </Link>
                  ),
                },
                {
                  title: messages.customers.detail.requestColumns.type,
                  dataIndex: "requestType",
                  render: (requestType: RequestRow["requestType"], row) =>
                    requestType?.name ?? row.typeCode,
                },
                {
                  title: messages.customers.detail.requestColumns.status,
                  dataIndex: "status",
                  width: 140,
                  render: (status: string) => (
                    <Tag>{messages.myWork.status[status] ?? status}</Tag>
                  ),
                },
              ]}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={md.noRequests}
            />
          )}
        </Card>
      )}

      {/* ปิดแพ้ — เหตุผลมาตรฐานบังคับ (spec CRM) */}
      <Modal
        open={losing}
        title={md.lostTitle}
        okText={md.lose}
        okButtonProps={{ danger: true, disabled: !loseReason }}
        confirmLoading={busy}
        onCancel={() => setLosing(false)}
        onOk={() => void lose()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Select
            className="w-full"
            placeholder={md.lostReason}
            value={loseReason}
            onChange={(value) => setLoseReason(value)}
            options={lostReasons.map((reason) => ({
              value: reason.code,
              label: reason.name,
            }))}
          />
          <Input.TextArea
            rows={2}
            placeholder={md.lostReasonText}
            value={loseText}
            onChange={(e) => setLoseText(e.target.value)}
          />
        </Space>
      </Modal>
    </div>
  );
}
