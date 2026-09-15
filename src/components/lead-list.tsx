"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Checkbox, Input, Pagination, Segmented, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  ConvertLeadModal,
  DisqualifyLeadModal,
  LeadFormModal,
  isLeadOpen,
} from "@/components/lead-actions";
import { LeadBoard } from "@/components/lead-board";
import { SearchSelect } from "@/components/search-select";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { CustomerRow, LeadRow } from "@/lib/api/types";

const m = messages.sales.leads;

/** ตาราง = ทะเบียนเต็ม, การ์ด = กระดานแยกตามสถานะ. อยู่ใน URL จึง bookmark ได้. */
export type LeadLayout = "table" | "board";

/**
 * Lead register — รับเข้า แก้ไข คัดออก (เหตุผลบังคับ ไม่มีการลบ) และแปลงเป็น
 * โอกาสการขายโดยข้อมูลไหลต่อ. The modals are shared with the detail page
 * (`lead-actions.tsx`) so both screens edit the same fields.
 */
export function LeadList({
  rows,
  total,
  page,
  pageSize,
  filters,
  layout,
  customers,
  canManage,
}: {
  rows: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { search?: string; status?: string; mineOnly: boolean };
  layout: LeadLayout;
  customers: CustomerRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [disqualifying, setDisqualifying] = useState<LeadRow | null>(null);
  const [converting, setConverting] = useState<LeadRow | null>(null);

  /** ทุกอย่างที่หน้านี้อ่านจาก URL — ตัวกรอง มุมมอง และหน้าที่เปิดอยู่. */
  function navigate(
    next: Partial<typeof filters> & { layout?: LeadLayout; page?: number },
  ) {
    const merged = { ...filters, layout, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
    if (merged.mineOnly) params.set("view", "mine");
    if (merged.layout === "board") params.set("layout", "board");
    if (next.page && next.page > 1) params.set("page", String(next.page));
    router.push(`${ROUTES.leads}?${params.toString()}`);
  }

  function applyFilters(next: Partial<typeof filters>) {
    navigate(next);
  }

  return (
    <div className="space-y-3">
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
          placeholder={m.filterStatus}
          value={filters.status}
          onChange={(value) =>
            applyFilters({ status: (value as string) || undefined })
          }
          options={Object.entries(m.status).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Checkbox
          checked={filters.mineOnly}
          onChange={(event) => applyFilters({ mineOnly: event.target.checked })}
        >
          {m.mineOnly}
        </Checkbox>
        <div className="grow" />
        <Segmented<LeadLayout>
          value={layout}
          onChange={(value) => navigate({ layout: value, page: 1 })}
          options={[
            { value: "table", label: m.view.table },
            { value: "board", label: m.view.board },
          ]}
        />
        {canManage && (
          <Space>
            <Link href={ROUTES.leadImport}>
              <Button>{m.importer.openButton}</Button>
            </Link>
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {m.newLead}
            </Button>
          </Space>
        )}
      </div>

      {layout === "board" ? (
        <>
          <LeadBoard
            rows={rows}
            total={total}
            canManage={canManage}
            onEdit={(lead) => {
              setEditing(lead);
              setFormOpen(true);
            }}
            onConvert={(lead) => setConverting(lead)}
            onDisqualify={(lead) => setDisqualifying(lead)}
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
        <Table<LeadRow>
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
              title: m.columns.name,
              dataIndex: "name",
              render: (name: string, row) => (
                <div>
                  <Link href={ROUTES.leadDetail(row.id)}>{name}</Link>
                  {row.customer && (
                    <Link href={ROUTES.customerDetail(row.customer.id)}>
                      <Text type="secondary" className="block text-xs">
                        {row.customer.customerCode} · {row.customer.nameTh}
                      </Text>
                    </Link>
                  )}
                </div>
              ),
            },
            {
              title: m.columns.contact,
              dataIndex: "contactName",
              render: (contactName: string | null, row) =>
                [contactName, row.phone, row.email].filter(Boolean).join(" · ") ||
                "—",
            },
            {
              title: m.columns.source,
              dataIndex: "sourceCode",
              width: 140,
              render: (source: string | null) => source ?? "—",
            },
            {
              title: m.columns.status,
              dataIndex: "status",
              width: 170,
              render: (status: LeadRow["status"], row) => (
                <Space size={4} orientation="vertical">
                  <Tag color={m.statusColor[status]}>
                    {m.status[status] ?? status}
                  </Tag>
                  {row.convertedOpportunity && (
                    <Link href={ROUTES.opportunityDetail(row.convertedOpportunity.id)}>
                      <Text type="secondary" className="text-xs">
                        {row.convertedOpportunity.opportunityCode}
                      </Text>
                    </Link>
                  )}
                </Space>
              ),
            },
            ...(canManage
              ? [
                  {
                    title: "",
                    key: "actions",
                    width: 240,
                    render: (_: unknown, row: LeadRow) =>
                      isLeadOpen(row.status) ? (
                        <Space>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditing(row);
                              setFormOpen(true);
                            }}
                          >
                            {m.actions.edit}
                          </Button>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => setConverting(row)}
                          >
                            {m.actions.convert}
                          </Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => setDisqualifying(row)}
                          >
                            {m.actions.disqualify}
                          </Button>
                        </Space>
                      ) : null,
                  },
                ]
              : []),
          ]}
        />
      )}

      <LeadFormModal
        open={formOpen}
        lead={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(id) => {
          setFormOpen(false);
          // Lead ใหม่ → เปิดหน้ารายละเอียดให้กรอกต่อ/ลงกิจกรรมได้เลย
          if (editing) router.refresh();
          else router.push(ROUTES.leadDetail(id));
        }}
      />
      <DisqualifyLeadModal
        lead={disqualifying}
        onClose={() => setDisqualifying(null)}
        onDone={() => {
          setDisqualifying(null);
          router.refresh();
        }}
      />
      <ConvertLeadModal
        key={converting?.id ?? "closed"}
        lead={converting}
        customers={customers}
        onClose={() => setConverting(null)}
        onDone={(opportunityId) => router.push(ROUTES.opportunityDetail(opportunityId))}
      />
    </div>
  );
}
