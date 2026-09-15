"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  InputNumber,
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
import { LoseOpportunityModal } from "@/components/opportunity-actions";
import { formatAmount, OpportunityParty } from "@/components/opportunity-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  CustomerRow,
  OpportunityDetail,
  OpportunityLostReason,
  RequestRow,
  SaleOrderRow,
} from "@/lib/api/types";

const m = messages.sales.opportunities;
const md = m.detail;

type CustomerType = "corporate" | "individual" | "government";

/**
 * รายละเอียดโอกาสการขาย — จุดที่ชุดงาน B จบ (KYC เตือน ไม่ block) และจุดที่
 * PO 10 ก.ย. 2569 กำหนด: โอกาสการขายยังไม่เป็นลูกค้า, "เปิดใบสั่งขาย" คือทาง
 * เดียวที่ปิดชนะและสร้างทะเบียนลูกค้าจากผู้มุ่งหวัง.
 */
export function OpportunityDetailView({
  opportunity,
  lostReasons,
  relatedRequests,
  customers,
  canManage,
  openSaleOrderOnLoad = false,
}: {
  opportunity: OpportunityDetail;
  lostReasons: OpportunityLostReason[];
  /** null = viewer has no request.read (C360-04: hidden, not empty). */
  relatedRequests: RequestRow[] | null;
  /** ตัวเลือก "ใช้ลูกค้าเดิมแทน" ในกล่องเปิดใบสั่งขาย — ว่างเมื่อไม่มีสิทธิ์อ่านทะเบียน. */
  customers: CustomerRow[];
  canManage: boolean;
  /** มาจากกระดานการ์ด (ลากไป "ชนะ") — เปิดกล่องเปิดใบสั่งขายให้ทันที. */
  openSaleOrderOnLoad?: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [losing, setLosing] = useState(false);

  const customer = opportunity.customer;
  const closed = opportunity.stage === "won" || opportunity.stage === "lost";
  const editable = canManage && !closed;
  const autoOpen = openSaleOrderOnLoad && editable;

  // --- เปิดใบสั่งขาย -------------------------------------------------------
  const [opening, setOpening] = useState(autoOpen);
  const [soAmount, setSoAmount] = useState<number | null>(
    autoOpen && opportunity.amount !== null ? Number(opportunity.amount) : null,
  );
  const [soNote, setSoNote] = useState("");
  const [useExisting, setUseExisting] = useState(false);
  const [existingCustomerId, setExistingCustomerId] = useState<string>();
  const [custType, setCustType] = useState<CustomerType>("corporate");
  const [custNameTh, setCustNameTh] = useState(opportunity.prospectName ?? "");
  const [custNameEn, setCustNameEn] = useState("");
  const [custTaxId, setCustTaxId] = useState(opportunity.prospectTaxId ?? "");
  const [custBranchCode, setCustBranchCode] = useState("00000");
  const [similarBlocked, setSimilarBlocked] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [cancelling, setCancelling] = useState<SaleOrderRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // เปิดกล่องไปแล้วจาก state ตั้งต้น — ลบ `?action` ออกจาก URL กันรีเฟรชแล้วเด้งซ้ำ
  useEffect(() => {
    if (openSaleOrderOnLoad) {
      router.replace(ROUTES.opportunityDetail(opportunity.id), { scroll: false });
    }
  }, [openSaleOrderOnLoad, opportunity.id, router]);

  async function setStage(stage: string) {
    setError(null);
    const result = await appApi(`opportunities/${opportunity.id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
    if (!result.ok) setError(result.message);
    else router.refresh();
  }

  async function openSaleOrder() {
    setError(null);
    setBusy(true);

    const customerPart = customer
      ? {}
      : useExisting
        ? { customer_id: existingCustomerId }
        : {
            customer: {
              type: custType,
              name_th: custNameTh.trim() || undefined,
              name_en: custNameEn.trim() || undefined,
              tax_id: custTaxId.replace(/[^0-9]/g, "") || undefined,
              branch_code: custBranchCode.trim() || undefined,
              confirm_duplicate: confirmDuplicate || undefined,
              override_reason: overrideReason.trim() || undefined,
            },
          };

    const result = await appApi<{ saleOrderCode: string; customerCreated: boolean }>(
      `opportunities/${opportunity.id}/sale-orders`,
      {
        method: "POST",
        body: JSON.stringify({
          ...customerPart,
          amount: soAmount ?? undefined,
          note: soNote.trim() || undefined,
        }),
      },
    );

    setBusy(false);
    if (!result.ok) {
      // CM-03: ชื่อคล้าย — เปิดทางเลือก "ใช้รายเดิม" / "ยืนยัน+เหตุผล" ในกล่องเดียวกัน
      if (result.code === "CRM_CUSTOMER_SIMILAR") setSimilarBlocked(true);
      setError(result.message);
      return;
    }
    message.success(
      md.saleOrderOpened(result.data.saleOrderCode, result.data.customerCreated),
    );
    setOpening(false);
    router.refresh();
  }

  async function cancelSaleOrder() {
    if (!cancelling || !cancelReason.trim()) return;
    setError(null);
    setBusy(true);
    const result = await appApi(`sale-orders/${cancelling.id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: cancelReason.trim() }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.cancelled);
    setCancelling(null);
    setCancelReason("");
    router.refresh();
  }

  const reasonName =
    lostReasons.find((reason) => reason.code === opportunity.lostReasonCode)?.name ??
    opportunity.lostReasonCode ??
    "";

  const openReady = customer
    ? true
    : useExisting
      ? Boolean(existingCustomerId)
      : Boolean(custNameTh.trim()) && (!confirmDuplicate || overrideReason.trim());

  return (
    <div className="space-y-4">
      {error && <Alert type="error" showIcon title={error} />}

      {opportunity.stage === "won" && (
        <Alert type="success" showIcon title={md.closedWonBanner} />
      )}
      {opportunity.stage === "lost" && (
        <Alert
          type="warning"
          showIcon
          title={md.closedLostBanner(reasonName)}
          description={opportunity.lostReasonText ?? undefined}
        />
      )}

      {/* PO 10 ก.ย. 2569 — ผู้มุ่งหวัง: ยังไม่มีทะเบียนลูกค้า */}
      {!customer && !closed && (
        <Alert type="info" showIcon title={md.prospectBanner} />
      )}

      {/* CM-04 ชุดงาน B — เตือน ไม่ block: ธุรกรรมเดินต่อได้ */}
      {opportunity.kycWarning.required && !closed && (
        <Alert
          type="warning"
          showIcon
          title={md.kycWarningTitle}
          description={
            customer
              ? md.kycWarningBody(
                  opportunity.kycWarning.products.join(", "),
                  customer.nameTh,
                )
              : md.kycProspectBody(opportunity.kycWarning.products.join(", "))
          }
          action={
            customer ? (
              <Link
                href={`${ROUTES.newRequest}?type=KYC&ref_type=customer&ref_id=${customer.id}`}
              >
                <Button size="small" type="primary">
                  {md.raiseKyc}
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <Title level={4} className="mb-1!">
            {opportunity.opportunityCode} · {opportunity.title}
          </Title>
          <Space size={6} wrap>
            <Tag color={m.stageColor[opportunity.stage]}>
              {m.stage[opportunity.stage] ?? opportunity.stage}
            </Tag>
            {opportunity.fromLead && (
              <Text type="secondary" className="text-xs">
                {md.fromLead(opportunity.fromLead.name)}
              </Text>
            )}
          </Space>
        </div>
        {editable && (
          <Space wrap>
            <SearchSelect
              className="min-w-36"
              value={opportunity.stage}
              onChange={(value) => void setStage(value as string)}
              options={["qualifying", "proposing", "negotiating"].map(
                (stage) => ({ value: stage, label: m.stage[stage] }),
              )}
            />
            <Button
              type="primary"
              loading={busy}
              onClick={() => {
                setSoAmount(
                  opportunity.amount === null ? null : Number(opportunity.amount),
                );
                setSimilarBlocked(false);
                setConfirmDuplicate(false);
                setOverrideReason("");
                setOpening(true);
              }}
            >
              {md.openSaleOrder}
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
              label: customer ? md.customerLabel : md.prospectLabel,
              children: customer ? (
                <Link href={ROUTES.customerDetail(customer.id)}>
                  {customer.customerCode} · {customer.nameTh}
                  {customer.branchName ? ` · ${customer.branchName}` : ""}
                </Link>
              ) : (
                <Space direction="vertical" size={0}>
                  <OpportunityParty row={opportunity} />
                  {opportunity.prospectTaxId && (
                    <Text type="secondary" className="text-xs">
                      {md.customerTaxId}: {opportunity.prospectTaxId}
                    </Text>
                  )}
                </Space>
              ),
            },
            ...(!customer && opportunity.prospectContactName
              ? [
                  {
                    key: "contact",
                    label: md.prospectContactLabel,
                    children: [
                      opportunity.prospectContactName,
                      opportunity.prospectPhone,
                      opportunity.prospectEmail,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  },
                ]
              : []),
            {
              key: "amount",
              label: m.columns.amount,
              children: `${formatAmount(opportunity.amount)} ${opportunity.currency}`,
            },
            {
              key: "expectedClose",
              label: m.columns.expectedClose,
              children: opportunity.expectedCloseAt
                ? dayjs(opportunity.expectedCloseAt).format("D MMM YYYY")
                : "—",
            },
            {
              key: "products",
              label: m.form.products,
              children: opportunity.products.length ? (
                <Space size={4} wrap>
                  {opportunity.products.map((product) => (
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

      {/* ใบสั่งขาย — จุดที่ผู้มุ่งหวังกลายเป็นลูกค้า */}
      <Card size="small" title={`${md.saleOrdersTitle} · ${opportunity.saleOrders.length}`}>
        {opportunity.saleOrders.length ? (
          <Table<SaleOrderRow>
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={opportunity.saleOrders}
            columns={[
              { title: md.saleOrderColumns.code, dataIndex: "saleOrderCode", width: 160 },
              {
                title: md.saleOrderColumns.status,
                dataIndex: "status",
                width: 110,
                render: (status: string) => (
                  <Tag color={status === "open" ? "green" : "red"}>
                    {md.saleOrderStatus[status] ?? status}
                  </Tag>
                ),
              },
              {
                title: md.saleOrderColumns.amount,
                dataIndex: "amount",
                width: 130,
                align: "right" as const,
                render: (amount: SaleOrderRow["amount"], row) =>
                  `${formatAmount(amount)} ${row.currency}`,
              },
              {
                title: md.saleOrderColumns.orderedAt,
                dataIndex: "orderedAt",
                width: 120,
                render: (at: string) => dayjs(at).format("D MMM YYYY"),
              },
              {
                title: md.saleOrderColumns.note,
                dataIndex: "note",
                render: (note: string | null, row) =>
                  row.status === "cancelled" ? row.cancelReason ?? note ?? "—" : note ?? "—",
              },
              ...(canManage
                ? [
                    {
                      title: "",
                      key: "actions",
                      width: 120,
                      render: (_: unknown, row: SaleOrderRow) =>
                        row.status === "open" ? (
                          <Button size="small" danger onClick={() => setCancelling(row)}>
                            {md.cancelSaleOrder}
                          </Button>
                        ) : null,
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={md.noSaleOrders} />
        )}
      </Card>

      {relatedRequests !== null && (
        <Card
          size="small"
          title={`${md.tabRequests} · ${relatedRequests.length}`}
          extra={
            <Link
              href={`${ROUTES.newRequest}?ref_type=opportunity&ref_id=${opportunity.opportunityCode}`}
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

      {/* เปิดใบสั่งขาย = ปิดชนะ + สร้างทะเบียนลูกค้าจากผู้มุ่งหวัง (PO 10 ก.ย. 2569) */}
      <Modal
        open={opening}
        title={md.openSaleOrderTitle}
        okText={md.openSaleOrder}
        okButtonProps={{ disabled: !openReady }}
        confirmLoading={busy}
        onCancel={() => setOpening(false)}
        onOk={() => void openSaleOrder()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Text type="secondary" className="text-xs">
            {md.openSaleOrderHint}
          </Text>

          {customer ? (
            <Alert
              type="info"
              showIcon
              title={`${md.customerExisting}: ${customer.customerCode} · ${customer.nameTh}`}
            />
          ) : (
            <Card size="small" title={md.customerToCreate}>
              <Space direction="vertical" className="w-full">
                <Text type="secondary" className="text-xs">
                  {md.customerToCreateHint}
                </Text>
                {similarBlocked && (
                  <Alert type="warning" showIcon title={md.similarFound} />
                )}
                {customers.length > 0 && (
                  <Checkbox
                    checked={useExisting}
                    onChange={(e) => setUseExisting(e.target.checked)}
                  >
                    {md.useExistingCustomer}
                  </Checkbox>
                )}
                {useExisting ? (
                  <SearchSelect
                    className="w-full"
                    placeholder={m.form.customer}
                    value={existingCustomerId}
                    onChange={(value) => setExistingCustomerId(value as string)}
                    options={customers.map((row) => ({
                      value: row.id,
                      label: `${row.customerCode} · ${row.nameTh}${
                        row.branchName ? ` (${row.branchName})` : ""
                      }`,
                    }))}
                  />
                ) : (
                  <>
                    <Select<CustomerType>
                      className="w-full"
                      value={custType}
                      onChange={(value) => setCustType(value)}
                      options={Object.entries(messages.customers.type).map(
                        ([value, label]) => ({ value, label }),
                      )}
                    />
                    <Input
                      placeholder={md.customerNameTh}
                      value={custNameTh}
                      onChange={(e) => setCustNameTh(e.target.value)}
                    />
                    <Input
                      placeholder={md.customerNameEn}
                      value={custNameEn}
                      onChange={(e) => setCustNameEn(e.target.value)}
                    />
                    <Space.Compact className="w-full">
                      <Input
                        placeholder={md.customerTaxId}
                        value={custTaxId}
                        maxLength={17}
                        onChange={(e) => setCustTaxId(e.target.value)}
                      />
                      <Input
                        placeholder={md.customerBranchCode}
                        value={custBranchCode}
                        maxLength={5}
                        onChange={(e) => setCustBranchCode(e.target.value)}
                      />
                    </Space.Compact>
                    {similarBlocked && (
                      <>
                        <Checkbox
                          checked={confirmDuplicate}
                          onChange={(e) => setConfirmDuplicate(e.target.checked)}
                        >
                          {md.confirmDuplicate}
                        </Checkbox>
                        {confirmDuplicate && (
                          <Input
                            placeholder={md.overrideReason}
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </Space>
            </Card>
          )}

          <InputNumber
            className="w-full"
            placeholder={md.saleOrderAmount}
            min={0}
            value={soAmount}
            onChange={(value) => setSoAmount(value)}
          />
          <Input.TextArea
            rows={2}
            placeholder={md.saleOrderNote}
            value={soNote}
            onChange={(e) => setSoNote(e.target.value)}
          />
        </Space>
      </Modal>

      {/* ยกเลิกใบสั่งขาย — เหตุผลบังคับ ไม่มีการลบ */}
      <Modal
        open={cancelling !== null}
        title={`${md.cancelSaleOrder} ${cancelling?.saleOrderCode ?? ""}`}
        okText={md.cancelSaleOrder}
        okButtonProps={{ danger: true, disabled: !cancelReason.trim() }}
        confirmLoading={busy}
        onCancel={() => setCancelling(null)}
        onOk={() => void cancelSaleOrder()}
        destroyOnHidden
      >
        <Input.TextArea
          rows={2}
          placeholder={md.cancelReason}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>

      {/* ปิดแพ้ — เหตุผลมาตรฐานบังคับ (spec CRM) */}
      <LoseOpportunityModal
        opportunity={losing ? opportunity : null}
        lostReasons={lostReasons}
        onClose={() => setLosing(false)}
        onDone={() => {
          setLosing(false);
          router.refresh();
        }}
      />
    </div>
  );
}
