"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Segmented,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { LoseOpportunityModal } from "@/components/crm/opportunities/opportunity-actions";
import { OpportunityBoard } from "@/components/crm/opportunities/opportunity-board";
import { SearchSelect } from "@/components/ui/search-select";
import { ProductMultiPicker } from "@/components/crm/quotations/product-picker";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  CustomerRow,
  OpportunityLostReason,
  OpportunityRow,
} from "@/lib/api/types";

const m = messages.sales.opportunities;

/** Enough to catch a half-typed address before `@IsEmail()` answers 400. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ตาราง = ทะเบียนเต็ม, การ์ด = กระดานแยกตามขั้น. อยู่ใน URL จึง bookmark ได้. */
export type OpportunityLayout = "table" | "board";

export function formatAmount(amount: OpportunityRow["amount"]): string {
  if (amount === null || amount === undefined) return "—";
  return Number(amount).toLocaleString("th-TH");
}

/**
 * ลูกค้า หรือ ผู้มุ่งหวัง ของโอกาสการขาย — PO 10 ก.ย. 2569: การเปิดโอกาสการขาย
 * ยังไม่ถือเป็นลูกค้า จึงมีสองหน้าตา: ลิงก์ไปทะเบียนลูกค้า หรือชื่อผู้มุ่งหวัง
 * พร้อมป้าย "ยังไม่เป็นลูกค้า".
 */
export function OpportunityParty({
  row,
}: {
  row: Pick<OpportunityRow, "customer" | "prospectName">;
}) {
  if (row.customer) {
    return (
      <Link href={ROUTES.customerDetail(row.customer.id)}>
        {row.customer.nameTh}
      </Link>
    );
  }
  return (
    <Space size={6} wrap>
      <span>{row.prospectName ?? "—"}</span>
      <Tag color="orange">{m.prospectTag}</Tag>
    </Space>
  );
}

type PartyMode = "prospect" | "existing";

/** ทะเบียนโอกาสการขาย — ตาราง+ฟิลเตอร์ตามขั้น และเปิดโอกาสการขายใหม่. */
export function OpportunityList({
  rows,
  total,
  page,
  pageSize,
  filters,
  layout,
  customers,
  lostReasons,
  canManage,
}: {
  rows: OpportunityRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    search?: string;
    stage?: string;
    mineOnly: boolean;
    /** CD-65 */
    followUp?: "overdue" | "stale";
  };
  layout: OpportunityLayout;
  customers: CustomerRow[];
  /** ตัวเลือกเหตุผลปิดแพ้ — ใช้เมื่อลากการ์ดไปคอลัมน์ "แพ้". */
  lostReasons: OpportunityLostReason[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [losing, setLosing] = useState<OpportunityRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  // ค่าตั้งต้น = ผู้มุ่งหวัง: ทางปกติของ PO (ลูกค้าเกิดตอนเปิดใบสั่งขาย)
  const [partyMode, setPartyMode] = useState<PartyMode>("prospect");
  const [customerId, setCustomerId] = useState<string>();
  const [prospectName, setProspectName] = useState("");
  const [prospectTaxId, setProspectTaxId] = useState("");
  const [prospectContact, setProspectContact] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [expectedClose, setExpectedClose] = useState<string | null>(null);
  const [productCodes, setProductCodes] = useState<string[]>([]);

  const partyReady =
    partyMode === "existing" ? Boolean(customerId) : Boolean(prospectName.trim());

  const emailInvalid =
    partyMode === "prospect" &&
    prospectEmail.trim().length > 0 &&
    !EMAIL_PATTERN.test(prospectEmail.trim());

  /** รับเฉพาะรหัสที่ DTO รับ แล้วบอกทันทีว่าตัวไหนถูกตัดออก. */
  /** ทุกอย่างที่หน้านี้อ่านจาก URL — ตัวกรอง มุมมอง และหน้าที่เปิดอยู่. */
  function navigate(
    next: Partial<typeof filters> & { layout?: OpportunityLayout; page?: number },
  ) {
    const merged = { ...filters, layout, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.stage) params.set("stage", merged.stage);
    if (merged.mineOnly) params.set("view", "mine");
    if (merged.followUp) params.set("follow_up", merged.followUp);
    if (merged.layout === "board") params.set("layout", "board");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`${ROUTES.opportunities}?${params.toString()}`);
  }

  function applyFilters(next: Partial<typeof filters>) {
    navigate(next);
  }

  async function create() {
    if (!partyReady || !title.trim() || emailInvalid) return;
    setBusy(true);
    setError(null);

    const party =
      partyMode === "existing"
        ? { customer_id: customerId }
        : {
            prospect_name: prospectName.trim(),
            prospect_tax_id: prospectTaxId.trim() || undefined,
            prospect_contact_name: prospectContact.trim() || undefined,
            prospect_phone: prospectPhone.trim() || undefined,
            prospect_email: prospectEmail.trim() || undefined,
          };

    const result = await appApi<{ id: string; opportunityCode: string }>("opportunities", {
      method: "POST",
      body: JSON.stringify({
        ...party,
        title: title.trim(),
        amount: amount ?? undefined,
        expected_close_at: expectedClose ?? undefined,
        product_codes: productCodes.length ? productCodes : undefined,
      }),
    });

    setBusy(false);
    if (!result.ok) {
      setError(
        result.details?.length
          ? messages.common.withDetails(
              result.message,
              result.details
                .map((detail) => `${detail.field}=${detail.reason}`)
                .join("; "),
            )
          : result.message,
      );
      return;
    }
    message.success(m.form.created(result.data.opportunityCode));
    setCreating(false);
    router.push(ROUTES.opportunityDetail(result.data.id));
  }

  return (
    <div className="space-y-3">
      {error && <Alert type="error" showIcon title={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          className="max-w-xs"
          defaultValue={filters.search}
          placeholder={m.searchPlaceholder}
          allowClear
          onSearch={(value) => applyFilters({ search: value || undefined })}
        />
        <SearchSelect
          className="min-w-40"
          allowClear
          placeholder={m.filterStage}
          value={filters.stage}
          onChange={(value) =>
            applyFilters({ stage: (value as string) || undefined })
          }
          options={Object.entries(m.stage).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <SearchSelect
          className="min-w-44"
          allowClear
          placeholder={m.followUp.all}
          value={filters.followUp}
          onChange={(value) =>
            applyFilters({
              followUp: (value as "overdue" | "stale" | undefined) || undefined,
            })
          }
          options={[
            { value: "overdue", label: m.followUp.overdue },
            { value: "stale", label: m.followUp.stale },
          ]}
        />
        <Checkbox
          checked={filters.mineOnly}
          onChange={(event) => applyFilters({ mineOnly: event.target.checked })}
        >
          {m.mineOnly}
        </Checkbox>
        <div className="grow" />
        <Segmented<OpportunityLayout>
          value={layout}
          onChange={(value) => navigate({ layout: value, page: 1 })}
          options={[
            { value: "table", label: m.view.table },
            { value: "board", label: m.view.board },
          ]}
        />
        {canManage && (
          <Button type="primary" onClick={() => setCreating(true)}>
            {m.newOpportunity}
          </Button>
        )}
      </div>

      {layout === "board" ? (
        <>
          <OpportunityBoard
            rows={rows}
            total={total}
            canManage={canManage}
            // เปิดใบสั่งขายต้องสร้างทะเบียนลูกค้า — กล่องนั้นอยู่ที่หน้ารายละเอียด
            onWin={(row) =>
              router.push(`${ROUTES.opportunityDetail(row.id)}?action=sale-order`)
            }
            onLose={(row) => setLosing(row)}
            onMoved={() => router.refresh()}
          />
          {total > pageSize && (
            <Pagination
              className="text-right"
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger={false}
              onChange={(next) => navigate({ page: next })}
            />
          )}
        </>
      ) : (
      <Table<OpportunityRow>
        size="small"
        rowKey="id"
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: page,
          pageSize,
          total,
          hideOnSinglePage: true,
          onChange: (next) => navigate({ page: next }),
        }}
        columns={[
          {
            title: m.columns.code,
            dataIndex: "opportunityCode",
            width: 150,
            render: (code: string, row) => (
              <Link href={ROUTES.opportunityDetail(row.id)}>{code}</Link>
            ),
          },
          { title: m.columns.title, dataIndex: "title" },
          {
            title: m.columns.customer,
            key: "party",
            render: (_: unknown, row) => <OpportunityParty row={row} />,
          },
          {
            title: m.columns.stage,
            dataIndex: "stage",
            width: 110,
            render: (stage: string) => (
              <Tag color={m.stageColor[stage]}>{m.stage[stage] ?? stage}</Tag>
            ),
          },
          {
            title: m.columns.amount,
            dataIndex: "amount",
            width: 130,
            align: "right" as const,
            render: (amount: OpportunityRow["amount"]) => formatAmount(amount),
          },
          {
            title: m.columns.expectedClose,
            dataIndex: "expectedCloseAt",
            width: 120,
            render: (at: string | null) =>
              at ? dayjs(at).format("D MMM YY") : "—",
          },
          {
            title: m.columns.nextFollowUp,
            key: "followUp",
            width: 170,
            render: (_: unknown, row) => (
              <Space size={4} wrap>
                <span>
                  {row.nextFollowUpAt
                    ? dayjs(row.nextFollowUpAt).format("D MMM YY HH:mm")
                    : "—"}
                </span>
                <FollowUpTags row={row} />
              </Space>
            ),
          },
        ]}
      />
      )}

      <LoseOpportunityModal
        opportunity={losing}
        lostReasons={lostReasons}
        onClose={() => setLosing(null)}
        onDone={() => {
          setLosing(null);
          router.refresh();
        }}
      />

      <Modal
        open={creating}
        title={m.newOpportunity}
        okText={m.form.save}
        confirmLoading={busy}
        okButtonProps={{ disabled: !partyReady || !title.trim() || emailInvalid }}
        onCancel={() => setCreating(false)}
        onOk={() => void create()}
        destroyOnHidden
      >
        <Space direction="vertical" className="w-full">
          <Segmented<PartyMode>
            block
            value={partyMode}
            onChange={(value) => setPartyMode(value)}
            options={[
              { value: "prospect", label: m.form.partyMode.prospect },
              { value: "existing", label: m.form.partyMode.existing },
            ]}
          />

          {partyMode === "existing" ? (
            <SearchSelect
              className="w-full"
              placeholder={m.form.customer}
              value={customerId}
              onChange={(value) => setCustomerId(value as string)}
              options={customers.map((customer) => ({
                value: customer.id,
                label: `${customer.customerCode} · ${customer.nameTh}${
                  customer.branchName ? ` (${customer.branchName})` : ""
                }`,
              }))}
            />
          ) : (
            <>
              <Input
                placeholder={m.form.prospectName}
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
              />
              <Space.Compact className="w-full">
                <Input
                  placeholder={m.form.prospectTaxId}
                  value={prospectTaxId}
                  maxLength={20}
                  onChange={(e) => setProspectTaxId(e.target.value)}
                />
                <Input
                  placeholder={m.form.prospectContact}
                  value={prospectContact}
                  onChange={(e) => setProspectContact(e.target.value)}
                />
              </Space.Compact>
              <Space.Compact className="w-full">
                <Input
                  placeholder={m.form.prospectPhone}
                  value={prospectPhone}
                  onChange={(e) => setProspectPhone(e.target.value)}
                />
                <Input
                  placeholder={m.form.prospectEmail}
                  value={prospectEmail}
                  status={emailInvalid ? "error" : undefined}
                  onChange={(e) => setProspectEmail(e.target.value)}
                />
              </Space.Compact>
              {emailInvalid && (
                <Text type="danger" className="text-xs">
                  {m.form.prospectEmailInvalid}
                </Text>
              )}
              <Text type="secondary" className="text-xs">
                {m.form.prospectHint}
              </Text>
            </>
          )}

          <Input
            placeholder={m.form.title}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Space.Compact className="w-full">
            <InputNumber
              className="w-full"
              placeholder={m.form.amount}
              min={0}
              value={amount}
              onChange={(value) => setAmount(value)}
            />
            <DatePicker
              className="w-full"
              placeholder={m.form.expectedClose}
              onChange={(value) =>
                setExpectedClose(value ? value.toISOString() : null)
              }
            />
          </Space.Compact>
          <div>
            <ProductMultiPicker
              value={productCodes}
              onChange={setProductCodes}
              placeholder={m.form.products}
            />
            <Text type="secondary" className="text-xs">
              {m.form.productsHint}
            </Text>
          </div>
        </Space>
      </Modal>
    </div>
  );
}

/**
 * CD-65 — ป้ายการติดตามบนรายการและกระดาน: "เลยกำหนด" = นัดที่ค้างเลยเวลาแล้ว,
 * "เงียบ" = ระบบแจ้งหัวหน้าไปแล้วและยังไม่มีกิจกรรมใหม่. ปิดแล้วไม่แสดง.
 */
export function FollowUpTags({ row }: { row: OpportunityRow }) {
  if (row.stage === "won" || row.stage === "lost") return null;
  const overdue =
    row.nextFollowUpAt !== null && dayjs(row.nextFollowUpAt).isBefore(dayjs());

  return (
    <>
      {overdue && (
        <Tag color="red" className="mr-0!">
          {m.followUp.overdueTag}
        </Tag>
      )}
      {row.staleAlertedAt && (
        <Tag color="orange" className="mr-0!">
          {m.followUp.staleTag}
        </Tag>
      )}
    </>
  );
}
